import puppeteer from 'puppeteer';
import { isSafeNodusUrl, isNodusVerificationUrl, loginNodusReadOnly } from './nodusArchiveAgent.mjs';

const ORIGIN = 'https://imo.crearpslglobal.com';
const INITIAL_PATHS = ['/dashboard', '/sedes', '/capitulo1', '/capitulo2', '/maestria'];

export function goalSourcePath(href) {
  if (!isSafeNodusUrl(href)) return null;
  const url = new URL(href, ORIGIN);
  if (url.search || !/calend|cronograma|aliad|asisten|graduad|equipo|capitulo[12]|maestria|sedes/i.test(url.pathname)) return null;
  return url.pathname;
}

export async function discoverNodusGoalSources(page) {
  const paths = [...INITIAL_PATHS];
  const evidence = [];
  let accessBlocked = false;
  for (let i = 0; i < paths.length && i < 20; i++) {
    const path = paths[i];
    const response = await page.goto(`${ORIGIN}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (isNodusVerificationUrl(page.url()) || /captcha|\/auth\/login/i.test(page.url())) {
      throw new Error('Nodus requiere verificación o una nueva sesión. No se intentó eludir el control.');
    }
    if (new URL(page.url()).origin !== ORIGIN) throw new Error('Nodus redirigió fuera del origen autorizado.');
    if (!response || response.status() >= 400) {
      evidence.push({ path, status: response?.status() || null, tables: [] });
      if ([401, 403].includes(response?.status())) {
        accessBlocked = true;
        break;
      }
      continue;
    }
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 });
    const inspected = await page.evaluate(() => {
      const visible = element => Boolean(element.getClientRects().length);
      return {
        tables: Array.from(document.querySelectorAll('table')).filter(visible).map(table => ({
          headers: Array.from(table.querySelectorAll('thead tr:first-child th')).map(th => th.textContent.trim()),
          visibleRows: table.querySelectorAll('tbody tr').length,
          paginated: Boolean(table.closest('.dataTables_wrapper, .dt-container')?.querySelector('.paginate_button, .dt-paging')),
          // Only schema and completeness indicators leave the page; never people or raw rows.
          hasDataTable: Boolean(window.jQuery?.fn?.dataTable?.isDataTable(table))
        })),
        links: Array.from(document.querySelectorAll('a[href]')).map(a => a.href)
      };
    });
    evidence.push({ path, status: response.status(), tables: inspected.tables });
    for (const href of inspected.links) {
      const next = goalSourcePath(href);
      if (next && !paths.includes(next)) paths.push(next);
    }
  }
  return { source: 'Nodus', searchedAt: new Date().toISOString(), accessBlocked, pathsSearched: evidence.length, evidence };
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await loginNodusReadOnly(page);
    const result = await discoverNodusGoalSources(page);
    console.log(JSON.stringify(result, null, 2));
    if (result.accessBlocked) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.endsWith('discoverNodusGoalSources.mjs')) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
