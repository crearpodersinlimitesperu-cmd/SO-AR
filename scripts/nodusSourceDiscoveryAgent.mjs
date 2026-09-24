/**
 * Agente de descubrimiento de fuentes NODUS.
 *
 * Explora la estructura técnica de las pantallas autorizadas y publica un
 * catálogo de rutas/campos para Causa OS. No exporta filas, nombres, DNI,
 * teléfonos ni contraseñas; tampoco modifica NODUS ni snapshots operativos.
 *
 * Requiere exclusivamente secretos de CI:
 *   NODUS_USER, NODUS_PASSWORD y GOOGLE_SERVICE_ACCOUNT_JSON.
 */
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

puppeteer.use(StealthPlugin());

const normalize = (value = '') => value.toString().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

function adminDb() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('Falta la cuenta de servicio de Firebase para publicar el catálogo NODUS.');
  const serviceAccount = JSON.parse(raw);
  const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
  return getFirestore(app);
}

async function inspectRoute(page, route) {
  const url = `https://imo.crearpslglobal.com${route}`;
  let lastError;
  // NODUS puede hacer una redirección de sesión justo después de DOMContentLoaded.
  // Reintentamos la lectura de metadatos sin enviar formularios ni tocar datos.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let captureResponse;
    try {
      const networkPaths = new Set();
      captureResponse = (response) => {
        try {
          const parsed = new URL(response.url());
          if (parsed.origin === 'https://imo.crearpslglobal.com') networkPaths.add(parsed.pathname);
        } catch (_) {}
      };
      page.on('response', captureResponse);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
      await new Promise((resolve) => setTimeout(resolve, 600));
      const inspected = await page.evaluate((expectedRoute) => {
    const normalizeKey = (value = '') => value.toString().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const tables = Array.from(document.querySelectorAll('table')).map((table) => ({
      headers: Array.from(table.querySelectorAll('thead th')).map((header) => normalizeKey(header.innerText)),
      columnCount: table.querySelectorAll('thead th').length,
      rowCount: table.querySelectorAll('tbody tr').length
    })).filter((table) => table.headers.length > 0);
    const controls = Array.from(document.querySelectorAll('select,input,textarea,button')).map((element) => ({
      tag: element.tagName.toLowerCase(),
      name: normalizeKey(element.name || element.id || element.getAttribute('aria-label') || element.innerText),
      type: element.getAttribute('type') || ''
    })).filter((control) => control.name || control.type);
    const labels = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"],th,[aria-label]'))
      .map((element) => normalizeKey(element.innerText || element.getAttribute('aria-label') || ''))
      .filter(Boolean).slice(0, 100);
    return {
      route: expectedRoute,
      resolvedPath: window.location.pathname,
      title: document.title,
      tables,
      controls,
      labels,
      inspectedAt: new Date().toISOString()
    };
      }, route);
      page.off('response', captureResponse);
      return { ...inspected, networkPaths: [...networkPaths].sort() };
    } catch (error) {
      page.off('response', captureResponse);
      lastError = error;
      if (!/Execution context was destroyed|navigation|detached/i.test(error.message) || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastError;
}

async function safeGoto(page, url, timeout = 45000) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
      await new Promise((resolve) => setTimeout(resolve, 1800));
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1800));
    }
  }
  throw lastError;
}

async function login(page, user, password) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await safeGoto(page, 'https://imo.crearpslglobal.com/auth/login');
      let currentUrl = page.url();
      const challenge = () => currentUrl.includes('sgcaptcha') || currentUrl.includes('.well-known/sgcaptcha');
      const deadline = Date.now() + 18000;
      while (challenge() && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        currentUrl = page.url();
      }
      if (challenge()) throw new Error('El desafío anti-bot de NODUS no se resolvió en este intento.');
      if (!currentUrl.includes('/auth/login')) return;

      await page.waitForSelector('input[name="usuario"]', { visible: true, timeout: 15000 });
      await page.locator('input[name="usuario"]').fill(user);
      await page.locator('input[name="password"]').fill(password);
      await Promise.all([
        page.locator('button[type="submit"]').click(),
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {})
      ]);
      await new Promise((resolve) => setTimeout(resolve, 2500));
      if (!page.url().includes('/auth/login')) return;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
  }
  throw new Error('NODUS no confirmó la sesión del agente de descubrimiento.');
}

function locateFIContract(page) {
  const fields = [...page.tables.flatMap((table) => table.headers), ...(page.labels || []), ...(page.controls || []).map((control) => control.name)];
  const has = (...terms) => terms.some((term) => fields.some((field) => field.includes(term)));
  return {
    participantIdentity: has('nombre', 'participante', 'asistente'),
    pfdAttendance: has('asistencia pfd', 'asistio pfd', 'pfd'),
    sede: has('sede', 'ciudad'),
    equipo: has('equipo', 'team'),
    fiSummary: has('total fi', 'futuros cargados', 'fis cargados'),
    fiDetail: has('salud', 'finanzas', 'relaciones', 'carrera', 'desarrollo personal')
  };
}

export async function discoverNodusSources() {
  const user = process.env.NODUS_USER;
  const password = process.env.NODUS_PASSWORD;
  if (!user || !password) throw new Error('Faltan NODUS_USER/NODUS_PASSWORD en los secretos del job.');

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'] });
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'webdriver', { get: () => undefined }));
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8' });
    await page.setViewport({ width: 1440, height: 960 });
    await login(page, user, password);

    const futuros = await inspectRoute(page, '/futurosimposibles');
    const contract = locateFIContract(futuros);
    const catalog = {
      source: 'NODUS',
      route: futuros.route,
      resolvedPath: futuros.resolvedPath,
      title: futuros.title,
      contract,
      extractionReadiness: contract.participantIdentity && contract.pfdAttendance && contract.sede && contract.equipo
        ? (contract.fiDetail ? 'detail_ready' : 'summary_ready')
        : 'not_ready',
      tables: futuros.tables,
      controls: futuros.controls,
      labels: futuros.labels,
      networkPaths: futuros.networkPaths,
      discoveredAt: futuros.inspectedAt,
      privacy: 'Metadatos de estructura únicamente; sin filas ni PII.'
    };
    await adminDb().collection('nodus_source_catalog').doc('futuros_imposibles').set({
      ...catalog,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`Catálogo FI publicado: ${catalog.extractionReadiness}. rutas detectadas: ${(catalog.networkPaths || []).join(', ') || 'ninguna'}.`);
    return catalog;
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.endsWith('nodusSourceDiscoveryAgent.mjs')) {
  discoverNodusSources().catch((error) => {
    console.error(`Descubrimiento NODUS falló: ${error.message}`);
    process.exitCode = 1;
  });
}
