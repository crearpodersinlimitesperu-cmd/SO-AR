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
  await page.goto(`https://imo.crearpslglobal.com${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return page.evaluate((expectedRoute) => {
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
    return {
      route: expectedRoute,
      resolvedPath: window.location.pathname,
      title: document.title,
      tables,
      controls,
      inspectedAt: new Date().toISOString()
    };
  }, route);
}

function locateFIContract(page) {
  const flattenedHeaders = page.tables.flatMap((table) => table.headers);
  const has = (...terms) => terms.some((term) => flattenedHeaders.some((header) => header.includes(term)));
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

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    await page.goto('https://imo.crearpslglobal.com/auth/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.type('input[name="usuario"]', user);
    await page.type('input[name="password"]', password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
    ]);
    if (page.url().includes('/auth/login')) throw new Error('NODUS no confirmó la sesión del agente de descubrimiento.');

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
      discoveredAt: futuros.inspectedAt,
      privacy: 'Metadatos de estructura únicamente; sin filas ni PII.'
    };
    await adminDb().collection('nodus_source_catalog').doc('futuros_imposibles').set({
      ...catalog,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`Catálogo FI publicado: ${catalog.extractionReadiness}.`);
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
