import { createHash } from 'node:crypto';
import puppeteer from 'puppeteer';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const NODUS_ORIGIN = 'https://imo.crearpslglobal.com';
const MAX_ROUTES = 200;
export const MAX_CHUNK_BYTES = 350 * 1024;
const MAX_FALLBACK_TEXT_BYTES = 250 * 1024;
const PAGE_DELAY_MS = 900;

const BLOCKED_ROUTE_SEGMENTS = new Set([
  'logout', 'salir', 'delete', 'eliminar', 'borrar', 'destroy', 'update',
  'actualizar', 'edit', 'editar', 'create', 'crear', 'store', 'save',
  'guardar', 'remove', 'add', 'agregar', 'insert', 'new', 'nuevo', 'activar',
  'activate', 'desactivar', 'deactivate', 'anular', 'registrar', 'register',
  'submit', 'confirm', 'confirmar', 'send', 'enviar', 'publish', 'publicar',
  'pay', 'pagar'
]);
const SENSITIVE_QUERY_KEYS = /^(token|access_token|refresh_token|password|secret|credential|authorization|session|code|_?method|action|operation|intent)$/i;

export function isSafeNodusUrl(rawUrl, baseUrl = NODUS_ORIGIN) {
  let url;
  try {
    url = new URL(rawUrl, baseUrl);
  } catch {
    return false;
  }
  if (url.origin !== NODUS_ORIGIN || url.protocol !== 'https:' || url.username || url.password) return false;
  if (/\/auth\/login\/?$/i.test(url.pathname)) return false;
  if (url.pathname.split('/').some((segment) => {
    try {
      return BLOCKED_ROUTE_SEGMENTS.has(decodeURIComponent(segment).toLowerCase());
    } catch {
      return true;
    }
  })) return false;
  if ([...url.searchParams.keys()].some((key) => SENSITIVE_QUERY_KEYS.test(key))) return false;
  return true;
}

export function chunkRows(rows, maxBytes = MAX_CHUNK_BYTES) {
  const chunks = [];
  let current = [];
  for (const row of rows) {
    const candidate = [...current, row];
    if (Buffer.byteLength(JSON.stringify(candidate), 'utf8') > maxBytes) {
      if (current.length === 0) throw new Error('Una fila supera el límite seguro de tamaño para Firestore.');
      chunks.push(current);
      current = [row];
      if (Buffer.byteLength(JSON.stringify(current), 'utf8') > maxBytes) {
        throw new Error('Una fila supera el límite seguro de tamaño para Firestore.');
      }
    } else {
      current = candidate;
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function archiveRunId() {
  const run = process.env.GITHUB_RUN_ID || `local-${process.pid}`;
  return `${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${run}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export function getNodusAdminDb() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_JSON/FIREBASE_SERVICE_ACCOUNT_KEY.');
  const serviceAccount = JSON.parse(raw);
  const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
  return getFirestore(app);
}

function stableId(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

export async function loginNodusReadOnly(page) {
  const user = process.env.NODUS_USER;
  const password = process.env.NODUS_PASSWORD;
  if (!user || !password) throw new Error('Faltan los secretos NODUS_USER/NODUS_PASSWORD.');

  await page.goto(`${NODUS_ORIGIN}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (/sgcaptcha|captcha/i.test(page.url())) {
    throw new Error('NODUS solicitó una verificación anti-bot; el agente se detuvo sin intentar resolverla.');
  }
  if (/\/auth\/login\/?$/i.test(new URL(page.url()).pathname)) {
    await page.waitForSelector('input[name="usuario"]', { visible: true, timeout: 15000 });
    await page.locator('input[name="usuario"]').fill(user);
    await page.locator('input[name="password"]').fill(password);
    await Promise.all([
      page.locator('button[type="submit"]').click(),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    ]);
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => {});
  }

  const dashboardResponse = await page.goto(`${NODUS_ORIGIN}/dashboard`, {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => {});
  if (/sgcaptcha|captcha/i.test(page.url())) {
    throw new Error('NODUS solicitó una verificación anti-bot; el agente se detuvo sin intentar resolverla.');
  }
  if (
    new URL(page.url()).origin !== NODUS_ORIGIN
    || /\/auth\/login\/?$/i.test(new URL(page.url()).pathname)
    || (dashboardResponse && dashboardResponse.status() >= 400)
  ) {
    throw new Error('NODUS no confirmó el inicio de sesión; no se reintentó para evitar bloqueo de cuenta.');
  }
}

async function inspectVisiblePage(page) {
  return page.evaluate(() => {
    const visible = (element) => Boolean(element.getClientRects().length);
    const tables = Array.from(document.querySelectorAll('table')).filter(visible).map((table, tableIndex) => {
      const allRows = Array.from(table.querySelectorAll('tr'));
      const headerRow = table.querySelector('thead tr') || allRows.find((row) => row.querySelector('th'));
      const headers = headerRow
        ? Array.from(headerRow.querySelectorAll('th,td')).map((cell, index) => cell.innerText.trim() || `columna_${index + 1}`)
        : [];
      const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
      const sourceRows = bodyRows.length ? bodyRows : allRows.filter((row) => row !== headerRow);
      const rows = sourceRows.map((row) => {
        const cells = Array.from(row.querySelectorAll('th,td')).map((cell) => cell.innerText.trim());
        return cells.reduce((record, value, index) => {
          record[headers[index] || `columna_${index + 1}`] = value;
          return record;
        }, {});
      }).filter((row) => Object.values(row).some(Boolean));
      return {
        tableIndex,
        caption: table.querySelector('caption')?.innerText.trim() || '',
        headers,
        rows
      };
    });

    const cards = Array.from(document.querySelectorAll('.card, .info-box, [class*="kpi"]'))
      .filter((element) => visible(element) && !element.parentElement?.closest('.card, .info-box, [class*="kpi"]'))
      .map((element, index) => ({ cardIndex: index, text: element.innerText.trim() }))
      .filter((card) => card.text);

    const anchors = Array.from(document.querySelectorAll('a[href]'))
      .map((anchor) => ({
        href: anchor.href,
        text: anchor.innerText.trim(),
        pagination: Boolean(anchor.closest('.pagination, [class*="paginate"], [aria-label*="siguiente" i], [aria-label*="next" i]'))
          || anchor.rel.toLowerCase() === 'next'
          || /siguiente|next/i.test(anchor.getAttribute('aria-label') || '')
      }))
      .filter((anchor) => anchor.href);

    const paginationControls = Array.from(document.querySelectorAll(
      '.pagination, [class*="paginate"], [aria-label*="siguiente" i], [aria-label*="next" i]'
    )).filter(visible);
    const bodyText = document.body?.innerText?.trim() || '';

    return {
      title: document.title,
      tables,
      cards,
      anchors,
      paginationDetected: paginationControls.length > 0 || anchors.some((anchor) => anchor.pagination),
      bodyTextBytes: new TextEncoder().encode(bodyText).length,
      fallbackText: tables.some((table) => table.rows.length) || cards.length ? '' : bodyText
    };
  });
}

async function savePage(runRef, pageUrl, resolvedUrl, routeIndex, inspected, responseStatus, networkIdle) {
  const pageId = stableId(pageUrl);
  const pageRef = runRef.collection('pages').doc(pageId);
  const records = [];
  for (const table of inspected.tables) {
    if (table.rows.length) {
      records.push({
        kind: 'table',
        tableIndex: table.tableIndex,
        caption: table.caption,
        headers: table.headers,
        rows: table.rows
      });
    }
  }
  if (inspected.cards.length) records.push({ kind: 'cards', rows: inspected.cards });

  let fallbackTextStatus = 'not_needed';
  if (inspected.fallbackText) {
    if (Buffer.byteLength(inspected.fallbackText, 'utf8') <= MAX_FALLBACK_TEXT_BYTES) {
      records.push({ kind: 'page_text', rows: [{ text: inspected.fallbackText }] });
      fallbackTextStatus = 'captured';
    } else {
      fallbackTextStatus = 'omitted_over_size_limit';
    }
  }

  const chunkRefs = [];
  let rowCount = 0;
  for (let recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
    const record = records[recordIndex];
    const chunks = chunkRows(record.rows);
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
      const chunkId = `r${recordIndex}-c${chunkIndex}`;
      const chunkRef = pageRef.collection('chunks').doc(chunkId);
      await chunkRef.set({
        kind: record.kind,
        tableIndex: record.tableIndex ?? null,
        caption: record.caption || '',
        headers: record.headers || [],
        chunkIndex,
        rows: chunks[chunkIndex],
        capturedAt: FieldValue.serverTimestamp()
      });
      chunkRefs.push(chunkId);
      rowCount += chunks[chunkIndex].length;
    }
  }

  const hasNextPageLink = inspected.anchors.some((anchor) =>
    anchor.pagination && isSafeNodusUrl(anchor.href, pageUrl));
  await pageRef.set({
    routeIndex,
    sourceUrl: pageUrl,
    resolvedUrl,
    route: new URL(pageUrl).pathname,
    status: 'captured',
    title: inspected.title,
    responseStatus,
    networkIdle,
    tables: inspected.tables.map(({ tableIndex, caption, headers, rows }) => ({
      tableIndex, caption, headers, visibleRowCount: rows.length
    })),
    cardCount: inspected.cards.length,
    chunkIds: chunkRefs,
    rowCount,
    paginationDetected: inspected.paginationDetected,
    nextPageLinkObserved: hasNextPageLink,
    bodyTextBytes: inspected.bodyTextBytes,
    fallbackTextStatus,
    capturedAt: FieldValue.serverTimestamp()
  });
  return { rowCount, paginationDetected: inspected.paginationDetected, fallbackTextStatus };
}

export async function runNodusArchive() {
  const db = getNodusAdminDb();
  const runId = archiveRunId();
  const runRef = db.collection('nodus_archive_runs').doc(runId);
  const startedAt = new Date().toISOString();
  const manifest = {
    runId,
    source: 'NODUS',
    sourceScope: 'visible_authenticated_pages',
    status: 'running',
    coverage: 'in_progress',
    startedAt,
    maxRoutes: MAX_ROUTES,
    routesVisited: 0,
    routesFailed: 0,
    recordsCaptured: 0,
    pagesWithPagination: 0,
    pagesWithOmittedText: 0,
    pagesNotIdle: 0,
    routeBudgetReached: false,
    note: 'Respaldo inmutable sin borrado automático, de contenido visible en rutas con enlaces internos. No activa botones/tabs ni descarga archivos; paginación o límites requieren validar cobertura.'
  };
  await runRef.set({ ...manifest, createdAt: FieldValue.serverTimestamp() });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      let isExternalNavigation = false;
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        try {
          isExternalNavigation = new URL(request.url()).origin !== NODUS_ORIGIN;
        } catch {
          isExternalNavigation = true;
        }
      }
      const result = isExternalNavigation ? request.abort() : request.continue();
      result.catch(() => {
        if (browser?.connected()) {
          console.warn('No se pudo completar una solicitud del navegador; se revisará el estado de la ruta.');
        }
      });
    });
    await page.setViewport({ width: 1440, height: 1000 });
    page.setDefaultNavigationTimeout(45000);
    await loginNodusReadOnly(page);

    const dashboard = new URL('/dashboard', NODUS_ORIGIN);
    const queue = [dashboard.href];
    const queued = new Set(queue);
    const visited = new Set();
    let routesFailed = 0;
    let recordsCaptured = 0;
    let pagesWithPagination = 0;
    let pagesWithOmittedText = 0;
    let pagesNotIdle = 0;

    for (let cursor = 0; cursor < queue.length && visited.size < MAX_ROUTES; cursor += 1) {
      const pageUrl = queue[cursor];
      if (visited.has(pageUrl)) continue;
      if (visited.size) await new Promise((resolve) => setTimeout(resolve, PAGE_DELAY_MS));
      visited.add(pageUrl);
      let response;
      let networkIdle = false;
      try {
        response = await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        networkIdle = await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 })
          .then(() => true)
          .catch(() => false);
      } catch {
        routesFailed += 1;
        await runRef.collection('pages').doc(stableId(pageUrl)).set({
          routeIndex: visited.size,
          sourceUrl: pageUrl,
          route: new URL(pageUrl).pathname,
          status: 'navigation_failed',
          capturedAt: FieldValue.serverTimestamp()
        });
        continue;
      }

      if (/sgcaptcha|captcha/i.test(page.url())) {
        routesFailed += 1;
        await runRef.collection('pages').doc(stableId(pageUrl)).set({
          routeIndex: visited.size,
          sourceUrl: pageUrl,
          route: new URL(pageUrl).pathname,
          status: 'blocked_by_challenge',
          capturedAt: FieldValue.serverTimestamp()
        });
        break;
      }
      if (new URL(page.url()).origin !== NODUS_ORIGIN) {
        routesFailed += 1;
        await runRef.collection('pages').doc(stableId(pageUrl)).set({
          routeIndex: visited.size,
          sourceUrl: pageUrl,
          route: new URL(pageUrl).pathname,
          status: 'redirected_outside_nodus',
          capturedAt: FieldValue.serverTimestamp()
        });
        break;
      }
      if (/\/auth\/login\/?$/i.test(new URL(page.url()).pathname)) {
        routesFailed += 1;
        await runRef.collection('pages').doc(stableId(pageUrl)).set({
          routeIndex: visited.size,
          sourceUrl: pageUrl,
          route: new URL(pageUrl).pathname,
          status: 'session_expired',
          capturedAt: FieldValue.serverTimestamp()
        });
        break;
      }
      if (response && response.status() >= 400) {
        routesFailed += 1;
        await runRef.collection('pages').doc(stableId(pageUrl)).set({
          routeIndex: visited.size,
          sourceUrl: pageUrl,
          route: new URL(pageUrl).pathname,
          status: 'http_error',
          responseStatus: response.status(),
          capturedAt: FieldValue.serverTimestamp()
        });
        continue;
      }

      const inspected = await inspectVisiblePage(page);
      const saved = await savePage(
        runRef, pageUrl, page.url(), visited.size, inspected, response?.status() ?? null, networkIdle
      );
      recordsCaptured += saved.rowCount;
      if (saved.paginationDetected) pagesWithPagination += 1;
      if (saved.fallbackTextStatus === 'omitted_over_size_limit') pagesWithOmittedText += 1;
      if (!networkIdle) pagesNotIdle += 1;

      for (const anchor of inspected.anchors) {
        if (!isSafeNodusUrl(anchor.href, pageUrl)) continue;
        const target = new URL(anchor.href);
        target.hash = '';
        if (!queued.has(target.href)) {
          queued.add(target.href);
          queue.push(target.href);
        }
      }

      await runRef.update({
        routesVisited: visited.size,
        routesDiscovered: queue.length,
        routesFailed,
        recordsCaptured,
        pagesWithPagination,
        pagesWithOmittedText,
        pagesNotIdle
      });
      console.log(`Respaldo NODUS: ${visited.size} rutas recorridas; ${recordsCaptured} filas/registros visibles guardados.`);
    }

    const routeBudgetReached = visited.size >= MAX_ROUTES && queue.length > visited.size;
    const coverage = routesFailed || pagesWithPagination || pagesWithOmittedText || pagesNotIdle || routeBudgetReached
      ? 'needs_review'
      : 'visible_routes_without_observed_pagination';
    await runRef.update({
      status: routesFailed || routeBudgetReached ? 'partial' : 'completed',
      coverage,
      completedAt: FieldValue.serverTimestamp(),
      routesVisited: visited.size,
      routesDiscovered: queue.length,
      routesFailed,
      recordsCaptured,
      pagesWithPagination,
      pagesWithOmittedText,
      pagesNotIdle,
      routeBudgetReached
    });
    if (routesFailed || routeBudgetReached) {
      throw new Error('El recorrido terminó con rutas fallidas o fuera del límite; consulta el manifiesto para evaluar la cobertura.');
    }
    return { runId, routesVisited: visited.size, recordsCaptured, coverage };
  } catch (error) {
    const current = (await runRef.get()).data() || {};
    await runRef.update({
      status: ['completed', 'partial'].includes(current.status) ? current.status : 'failed',
      coverage: current.coverage === 'in_progress' ? 'needs_review' : current.coverage,
      completedAt: FieldValue.serverTimestamp(),
      failureCode: /anti-bot|captcha/i.test(error.message)
        ? 'verification_challenge'
        : /inicio de sesión|login|secretos/i.test(error.message)
          ? 'authentication_failed'
          : 'archive_failed'
    });
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

if (process.argv[1]?.endsWith('nodusArchiveAgent.mjs')) {
  runNodusArchive()
    .then(({ runId, routesVisited, recordsCaptured, coverage }) => {
      console.log(`Respaldo NODUS ${runId}: ${routesVisited} rutas, ${recordsCaptured} filas/registros, cobertura ${coverage}.`);
    })
    .catch((error) => {
      console.error(`Agente de respaldo NODUS detenido: ${error.message}`);
      process.exitCode = 1;
    });
}
