import { createHash } from 'node:crypto';
import puppeteer from 'puppeteer';
import { FieldValue } from 'firebase-admin/firestore';
import {
  chunkRows,
  getNodusAdminDb,
  isSafeNodusUrl,
  isNodusVerificationUrl,
  loginNodusReadOnly,
  MAX_CHUNK_BYTES
} from './nodusArchiveAgent.mjs';

const NODUS_USERS_URL = 'https://imo.crearpslglobal.com/usuarios';
const MAX_PAGES = 100;
const PAGE_DELAY_MS = 700;
const SECRET_OR_ACTION_HEADER = /(password|contrasena|clave|token|secret|credential|action|accion|editar|eliminar|borrar|delete|edit|reset|restablecer)/i;
const LAST_CONNECTION_HEADER = /(ultima?\s*(conexion|conexi[oó]n|entrada|sesion|sesi[oó]n|actividad)|ult\.?\s*(conexion|conexi[oó]n)|last\s*(login|connection|access|seen)|[uú]ltimo\s*acceso)/i;
const STATUS_HEADER = /(estado|status|activo|habilitado|situacion)/i;

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

export function summarizeNodusUsers(users) {
  const columns = [...new Set(users.flatMap((user) => Object.keys(user)))];
  const lastConnectionColumn = columns.find((column) => LAST_CONNECTION_HEADER.test(normalize(column))) || null;
  const statusColumn = columns.find((column) => STATUS_HEADER.test(normalize(column))) || null;
  const statusCounts = {};
  if (statusColumn) {
    for (const user of users) {
      const value = String(user[statusColumn] ?? '').trim();
      if (value) statusCounts[value] = (statusCounts[value] || 0) + 1;
    }
  }
  const withLastConnection = lastConnectionColumn
    ? users.filter((user) => String(user[lastConnectionColumn] ?? '').trim()).length
    : null;

  return {
    accountCount: users.length,
    columns,
    lastConnectionColumn,
    accountsWithLastConnection: withLastConnection,
    accountsWithoutLastConnection: lastConnectionColumn ? users.length - withLastConnection : null,
    statusColumn,
    statusCounts
  };
}

export function nextUsersPageUrl(pageInfo, currentUrl) {
  if (!pageInfo.paginationDetected) return { nextUrl: null, complete: true };
  if (pageInfo.nextDisabled) return { nextUrl: null, complete: true };
  if (pageInfo.nextHref && isSafeNodusUrl(pageInfo.nextHref, currentUrl)) {
    const next = new URL(pageInfo.nextHref, currentUrl);
    if (next.pathname === new URL(NODUS_USERS_URL).pathname) {
      next.hash = '';
      return { nextUrl: next.href, complete: false };
    }
  }
  return { nextUrl: null, complete: false };
}

async function inspectUsersPage(page) {
  return page.evaluate(() => {
    const visible = (element) => Boolean(element.getClientRects().length);
    const normalizeHeader = (value) => String(value ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    const tables = Array.from(document.querySelectorAll('table')).filter(visible).map((table) => {
      const rows = Array.from(table.querySelectorAll('tr'));
      const headerRow = table.querySelector('thead tr') || rows.find((row) => row.querySelector('th'));
      const headers = headerRow
        ? Array.from(headerRow.querySelectorAll('th,td')).map((cell, index) => cell.innerText.trim() || `columna_${index + 1}`)
        : [];
      const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
      const dataRows = (bodyRows.length ? bodyRows : rows.filter((row) => row !== headerRow))
        .map((row) => Array.from(row.querySelectorAll('th,td')).map((cell) => cell.innerText.trim()))
        .filter((cells) => cells.some(Boolean));
      const accountLike = headers.some((header) => /(usuario|user|nombre|correo|email|rol|perfil)/.test(normalizeHeader(header)));
      return { headers, dataRows, accountLike };
    });
    const table = tables.find((candidate) => candidate.accountLike);
    const paginationRoots = Array.from(document.querySelectorAll(
      '.pagination, [class*="paginate"], [aria-label*="pagin" i], [aria-label*="page" i]'
    )).filter(visible);
    const nextAnchors = Array.from(document.querySelectorAll(
      'a[rel~="next"], .pagination a, [class*="paginate"] a, [aria-label*="siguiente" i], [aria-label*="next" i]'
    )).filter(visible);
    const next = nextAnchors.find((anchor) =>
      anchor.rel.toLowerCase().split(/\s+/).includes('next')
      || /siguiente|next/i.test(anchor.innerText || anchor.getAttribute('aria-label') || '')
      || /\bnext\b/i.test(anchor.className || '')
    );
    const nextDisabled = Boolean(next && (
      next.getAttribute('aria-disabled') === 'true'
      || next.classList.contains('disabled')
      || next.parentElement?.classList.contains('disabled')
    ));
    return {
      title: document.title,
      headers: table?.headers || [],
      rows: table?.dataRows || [],
      accountTableFound: Boolean(table),
      paginationDetected: paginationRoots.length > 0 || nextAnchors.length > 0,
      nextHref: nextDisabled ? null : next?.href || null,
      nextDisabled
    };
  });
}

function stableId(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

export function rowsToUsers(headers, rows) {
  const allowedHeaders = headers.filter((header) => !SECRET_OR_ACTION_HEADER.test(normalize(header)));
  return rows.map((cells) => allowedHeaders.reduce((user, header) => {
    const index = headers.indexOf(header);
    user[header] = String(cells[index] ?? '').trim();
    return user;
  }, {})).filter((user) => Object.values(user).some(Boolean));
}

async function savePage(runRef, pageUrl, pageIndex, headers, users) {
  const pageRef = runRef.collection('pages').doc(stableId(pageUrl));
  const chunks = chunkRows(users, MAX_CHUNK_BYTES);
  const chunkIds = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const chunkId = `users-${String(index).padStart(4, '0')}`;
    await pageRef.collection('chunks').doc(chunkId).set({
      kind: 'nodus_user_accounts',
      pageIndex,
      chunkIndex: index,
      rows: chunks[index],
      capturedAt: FieldValue.serverTimestamp()
    });
    chunkIds.push(chunkId);
  }
  await pageRef.set({
    sourceUrl: pageUrl,
    route: '/usuarios',
    pageIndex,
    headers,
    accountCount: users.length,
    chunkIds,
    status: 'captured',
    capturedAt: FieldValue.serverTimestamp()
  });
}

export async function runNodusUserAccessReport() {
  const db = getNodusAdminDb();
  const runId = `${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${process.env.GITHUB_RUN_ID || process.pid}`;
  const runRef = db.collection('nodus_user_access_runs').doc(runId);
  await runRef.set({
    runId,
    source: 'NODUS /usuarios',
    status: 'running',
    coverage: 'in_progress',
    startedAt: FieldValue.serverTimestamp(),
    maxPages: MAX_PAGES,
    accountCount: 0,
    pagesCaptured: 0,
    paginationDetected: false,
    lastConnectionColumn: null,
    note: 'Se respaldan únicamente columnas visibles de la lista de cuentas; secretos y columnas de acciones se excluyen.'
  });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      let externalNavigation = false;
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        try {
          const url = new URL(request.url());
          externalNavigation = url.origin !== 'https://imo.crearpslglobal.com'
            && !isNodusVerificationUrl(url.href);
        } catch {
          externalNavigation = true;
        }
      }
      const action = externalNavigation ? request.abort() : request.continue();
      action.catch(() => {
        if (browser?.connected()) {
          console.warn('No se pudo completar una solicitud del navegador; se validará la respuesta de Nodus.');
        }
      });
    });
    page.setDefaultNavigationTimeout(45000);
    await loginNodusReadOnly(page);

    let nextUrl = NODUS_USERS_URL;
    const visited = new Set();
    const users = [];
    let paginationDetected = false;
    let coverageComplete = true;
    let pageIndex = 0;

    while (nextUrl && pageIndex < MAX_PAGES && !visited.has(nextUrl)) {
      if (pageIndex) await new Promise((resolve) => setTimeout(resolve, PAGE_DELAY_MS));
      visited.add(nextUrl);
      const response = await page.goto(nextUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => {});
      if (new URL(page.url()).origin !== 'https://imo.crearpslglobal.com'
        || new URL(page.url()).pathname !== '/usuarios'
        || /\/auth\/login\/?$/i.test(new URL(page.url()).pathname)
        || (response && response.status() >= 400)) {
        throw new Error('NODUS no permitió leer la lista de cuentas; el snapshot anterior se conserva.');
      }

      const inspected = await inspectUsersPage(page);
      if (!inspected.accountTableFound || !inspected.headers.length) {
        throw new Error('No se encontró una tabla de cuentas verificable en /usuarios; no se publicará una lista vacía.');
      }
      const pageUsers = rowsToUsers(inspected.headers, inspected.rows);
      users.push(...pageUsers);
      await savePage(runRef, nextUrl, pageIndex, inspected.headers, pageUsers);
      paginationDetected ||= inspected.paginationDetected;
      const pageTransition = nextUsersPageUrl(inspected, page.url());
      nextUrl = pageTransition.nextUrl;
      if (!pageTransition.complete && !pageTransition.nextUrl) {
        coverageComplete = false;
        break;
      }
      pageIndex += 1;
    }

    const pageLimitReached = Boolean(nextUrl) && pageIndex >= MAX_PAGES;
    if (visited.has(nextUrl)) coverageComplete = false;
    if (pageLimitReached) coverageComplete = false;
    const summary = summarizeNodusUsers(users);
    if (summary.accountCount === 0) {
      throw new Error('La tabla de cuentas no devolvió filas visibles; el snapshot anterior se conserva.');
    }

    const coverage = coverageComplete
      ? (summary.lastConnectionColumn ? 'complete' : 'complete_accounts_connection_metric_unavailable')
      : 'partial_requires_review';
    await runRef.update({
      status: coverageComplete ? 'completed' : 'partial',
      coverage,
      completedAt: FieldValue.serverTimestamp(),
      accountCount: summary.accountCount,
      pagesCaptured: visited.size,
      pagesDiscovered: visited.size + (nextUrl && !visited.has(nextUrl) ? 1 : 0),
      paginationDetected,
      pageLimitReached,
      columns: summary.columns,
      lastConnectionColumn: summary.lastConnectionColumn,
      accountsWithLastConnection: summary.accountsWithLastConnection,
      accountsWithoutLastConnection: summary.accountsWithoutLastConnection,
      statusColumn: summary.statusColumn,
      statusCounts: summary.statusCounts
    });

    if (coverageComplete) {
      await db.collection('nodus_user_access_latest').doc('latest').set({
        runId,
        source: 'NODUS /usuarios',
        publishedAt: FieldValue.serverTimestamp(),
        accountCount: summary.accountCount,
        pagesCaptured: visited.size,
        columns: summary.columns,
        lastConnectionColumn: summary.lastConnectionColumn,
        accountsWithLastConnection: summary.accountsWithLastConnection,
        accountsWithoutLastConnection: summary.accountsWithoutLastConnection,
        statusColumn: summary.statusColumn,
        statusCounts: summary.statusCounts,
        coverage
      });
    } else {
      throw new Error('El listado está paginado y no se pudo verificar su cobertura total; se conservó el snapshot publicado anterior.');
    }

    console.log(`Reporte NODUS publicado: ${summary.accountCount} cuentas en ${visited.size} página(s); campo de última conexión ${summary.lastConnectionColumn ? 'presente' : 'no disponible en la lista'}.`);
    return { runId, ...summary, coverage };
  } catch (error) {
    await runRef.update({
      status: 'failed',
      coverage: 'incomplete',
      completedAt: FieldValue.serverTimestamp(),
      failureCode: /captcha|anti-bot|turnstile|verificaci[oó]n/i.test(error.message)
        ? 'verification_challenge'
        : /NODUS no confirmó el inicio de sesión/i.test(error.message)
          ? 'login_not_confirmed'
          : /login|inicio de sesión|secretos|autentic/i.test(error.message)
            ? 'authentication_failed'
            : 'account_list_unavailable'
    });
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

if (process.argv[1]?.endsWith('nodusUserAccessAgent.mjs')) {
  runNodusUserAccessReport().catch((error) => {
    console.error(`Reporte de usuarios NODUS detenido: ${error.message}`);
    process.exitCode = 1;
  });
}
