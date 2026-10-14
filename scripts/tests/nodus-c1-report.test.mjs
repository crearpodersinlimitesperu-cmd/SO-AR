import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { createServer } from 'node:http';
import puppeteer from 'puppeteer';
import { extractNodusC1Report, inspectNodusC1Report, readNodusC1Report, waitForC1Report } from '../nodusC1Report.mjs';

const headers = ['', 'Acciones', 'Pago', 'Asistencia', 'Desertor', 'Apellidos', 'Nombres',
  'Nombre Preferido', 'Teléfono', 'Coordinador', 'IMO', 'Fin de Semana IMO', 'Teléfono IMO', '1ra Llamada', '2da Llamada'];
function fixture({ selected = '149', serverSide = false, total = 121, count = 121, reordered = false, missingState = false, invalidSchema = false, invalidId = false, initComplete = true } = {}) {
  const names = reordered ? [...headers].reverse() : headers;
  const labels = invalidSchema ? names.map(h => h === 'IMO' ? 'Invitador nuevo' : h) : names;
  const values = { Pago: 'Sin pago', Apellidos: 'Synthetic Surname', Nombres: 'Synthetic Person',
    IMO: 'Synthetic Inviter', Coordinador: 'Synthetic Coordinator', Teléfono: '0000000',
    Asistencia: '—', Desertor: '—', '1ra Llamada': '', '2da Llamada': '' };
  const rows = Array.from({ length: count }, (_, i) => ({
    querySelector: () => ({ value: String(i + 1),
      getAttribute: () => JSON.stringify({ id: invalidId ? 'wrong' : i + 1 }) }),
    cells: names.map(h => ({
    textContent: values[h] || '',
    querySelector: () => !missingState && ['Asistencia', 'Desertor'].includes(h) ? { checked: false } : null,
  })) }));
  const table = { querySelectorAll: () => labels.map(textContent => ({ textContent })) };
  const dt = { settings: () => [{ _bInitComplete: initComplete, oFeatures: { bServerSide: serverSide } }],
    rows: () => ({ nodes: () => ({ toArray: () => rows }) }), page: { info: () => ({ recordsTotal: total }) } };
  const jQuery = () => ({ DataTable: () => dt });
  jQuery.fn = { dataTable: { isDataTable: () => true } };
  return { document: { querySelector: selector => selector.startsWith('select') ? { value: selected } : table }, window: { jQuery } };
}
const run = options => runInNewContext(`(${readNodusC1Report.toString()})('149')`, fixture(options));

test('C1 extraction uses labeled columns, not changed positions, and all client rows', () => {
  for (const reordered of [false, true]) {
    const rows = run({ reordered });
    assert.equal(rows.length, 121);
    assert.equal(rows[0].nombres, 'Synthetic Person');
    assert.equal(rows[0].imo, 'Synthetic Inviter');
    assert.equal(rows[0].pago, 'Sin pago');
    assert.equal(rows[0].reportAttendanceC1, false);
    assert.equal(rows[0].nodusParticipantId, '1');
    assert.equal('asistio_c1' in rows[0], false);
  }
});
test('wrong team, incomplete/server-side source and absent checkbox fail closed', () => {
  for (const options of [{ selected: '141' }, { serverSide: true }, { count: 25 }, { missingState: true },
    { invalidSchema: true }, { total: 0, count: 0 }, { invalidId: true }, { initComplete: false }]) {
    assert.throws(() => run(options));
  }
});

function browserContext(options = {}) {
  return { ...fixture(options), location: {
    origin: 'https://imo.crearpslglobal.com', pathname: '/reporte', search: '?id_equipo=150',
  }, URLSearchParams };
}
function evaluate(fn, arg, context) {
  return runInNewContext(`(${fn.toString()})(${JSON.stringify(arg)})`, context);
}
function fakePage(context) {
  const page = new EventEmitter();
  page.evaluate = async (fn, arg) => evaluate(fn, arg, context);
  page.waitForFunction = async (fn, options, arg) => {
    assert.equal(options.timeout, 30000);
    if (!evaluate(fn, arg, context)) {
      const error = new Error('PRIVATE timeout detail');
      error.name = 'TimeoutError';
      throw error;
    }
  };
  return page;
}
const response = (status = 200) => ({ status: () => status, ok: () => status >= 200 && status < 300 });
const failure = async promise => {
  await assert.rejects(promise, error => {
    assert.ok(error.message.startsWith('C1_REPORT_FAILED '));
    assert.ok(!error.message.includes('PRIVATE'));
    failure.last = JSON.parse(error.message.slice('C1_REPORT_FAILED '.length));
    return true;
  });
  return failure.last;
};

test('readiness does not accept a registered table before asynchronous initialization or wrong filter', async () => {
  const context = browserContext({ selected: '150', initComplete: false });
  const page = fakePage(context);
  await assert.rejects(waitForC1Report(page, '150'), { name: 'TimeoutError' });
  context.window = fixture({ selected: '150' }).window;
  await waitForC1Report(page, '150');
  await assert.rejects(waitForC1Report(page, '149'), { name: 'TimeoutError' });
});

test('team 150 extraction navigates once and returns all validated rows', async () => {
  const page = fakePage(browserContext({ selected: '150' }));
  let navigations = 0;
  const rows = await extractNodusC1Report(page, '150', async () => {
    navigations++;
    return response();
  });
  assert.equal(navigations, 1);
  assert.equal(rows.length, 121);
  assert.equal(rows[0].nodusParticipantId, '1');
  assert.equal(page.eventNames().length, 0);
});

test('readiness diagnostics distinguish missing assets, table, filter, login and challenge without private content', async () => {
  for (const kind of ['jquery', 'dataTables', 'table', 'filter', 'login', 'challenge', 'initialization']) {
    const context = browserContext({ selected: '150', initComplete: false });
    if (kind === 'jquery') context.window = {};
    if (kind === 'dataTables') context.window.jQuery.fn = {};
    if (kind === 'table') {
      const query = context.document.querySelector;
      context.document.querySelector = selector => selector.startsWith('select') ? query(selector) : null;
    }
    if (kind === 'filter') context.document = fixture({ selected: 'PRIVATE' }).document;
    if (kind === 'login') context.location.pathname = '/auth/login';
    if (kind === 'challenge') context.location.pathname = '/.well-known/sgcaptcha/PRIVATE';
    const page = fakePage(context);
    const diagnostic = await failure(extractNodusC1Report(page, '150', async () => {
      page.emit('pageerror', new Error('PRIVATE script error'));
      page.emit('requestfailed', { resourceType: () => 'script', url: () => 'PRIVATE' });
      page.emit('response', { status: () => 503, request: () => ({ resourceType: () => 'xhr' }) });
      return response();
    }));
    assert.equal(diagnostic.teamId, '150');
    assert.equal(diagnostic.stage, 'readiness');
    assert.equal(diagnostic.reason, 'C1 report readiness timed out');
    assert.equal(diagnostic.pageErrors, 1);
    assert.equal(diagnostic.scriptFailures, 1);
    assert.equal(diagnostic.dataRequestFailures, 1);
    assert.equal(page.eventNames().length, 0);
    if (kind === 'jquery') assert.equal(diagnostic.jquery, false);
    if (kind === 'dataTables') assert.equal(diagnostic.dataTables, false);
    if (kind === 'table') assert.equal(diagnostic.tablePresent, false);
    if (kind === 'filter') assert.equal(diagnostic.teamFilter, 'mismatch');
    if (kind === 'login' || kind === 'challenge') assert.equal(diagnostic.route, kind);
    if (kind === 'initialization') {
      assert.equal(diagnostic.registered, true);
      assert.equal(diagnostic.initComplete, false);
    }
  }
});

test('HTTP/navigation failures, wrong routes and invalid complete tables never return a snapshot', async () => {
  for (const options of [{ serverSide: true }, { count: 25 }, { missingState: true },
    { invalidSchema: true }, { total: 0, count: 0 }, { invalidId: true }]) {
    const page = fakePage(browserContext({ selected: '150', ...options }));
    const diagnostic = await failure(extractNodusC1Report(page, '150', async () => response()));
    assert.equal(diagnostic.stage, 'extraction');
    assert.equal(page.eventNames().length, 0);
  }
  const page = fakePage(browserContext({ selected: '150' }));
  const http = await failure(extractNodusC1Report(page, '150', async () => response(403)));
  assert.equal(http.stage, 'navigation');
  assert.equal(http.httpStatus, 403);
  const navigation = await failure(extractNodusC1Report(page, '150', async () => {
    throw new Error('PRIVATE navigation URL');
  }));
  assert.equal(navigation.reason, 'C1 source unavailable');
  const context = browserContext({ selected: '150' });
  context.location.pathname = '/PRIVATE';
  const route = await failure(extractNodusC1Report(fakePage(context), '150', async () => response()));
  assert.equal(route.reason, 'C1 report route mismatch');
});

test('diagnostic inspection failure is explicit and listeners are scoped to each team', async () => {
  const page = fakePage(browserContext());
  const existingListener = () => {};
  page.on('pageerror', existingListener);
  page.evaluate = async () => { throw new Error('PRIVATE destroyed context'); };
  const diagnostic = await failure(extractNodusC1Report(page, '150', async () => response(500)));
  assert.equal(diagnostic.inspectionUnavailable, true);
  assert.deepEqual(page.listeners('pageerror'), [existingListener]);
  assert.equal(page.listenerCount('response'), 0);
  assert.equal(page.listenerCount('requestfailed'), 0);
});

test('diagnostic route scope must match the exact origin and team, not merely an initialized table', () => {
  for (const location of [
    { origin: 'https://PRIVATE.example' }, { search: '?id_equipo=149' },
    { pathname: '/dashboard' },
  ]) {
    const context = browserContext({ selected: '150' });
    Object.assign(context.location, location);
    assert.equal(evaluate(inspectNodusC1Report, '150', context).route, 'unexpected');
  }
});

test('hourly browser headers preserve native script and Ajax fetch metadata', async () => {
  const source = readFileSync(new URL('../nodusMultiAgentSync.mjs', import.meta.url), 'utf8');
  const match = source.match(/setExtraHTTPHeaders\((\{[\s\S]*?\})\);/);
  assert.ok(match, 'Hourly browser header configuration must be explicit');
  const headers = runInNewContext(`(${match[1]})`);
  assert.deepEqual(Object.keys(headers), ['Accept-Language']);
  assert.equal(headers['Accept-Language'], 'es-ES,es;q=0.9,en;q=0.8');
  assert.doesNotMatch(source, /setRequestInterception|\.abort\(/);

  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ path: request.url, dest: request.headers['sec-fetch-dest'],
      mode: request.headers['sec-fetch-mode'], site: request.headers['sec-fetch-site'],
      user: request.headers['sec-fetch-user'] });
    if (request.url === '/dependency.js') {
      response.setHeader('Content-Type', 'text/javascript');
      // Model a server rejecting navigation metadata on subresource requests.
      if (request.headers['sec-fetch-dest'] !== 'script') {
        response.writeHead(403);
        response.end();
      } else response.end('window.dependencyReady = true; fetch("/data");');
    } else if (request.url === '/data') {
      response.setHeader('Content-Type', 'application/json');
      response.end('{}');
    } else {
      response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><script src="/dependency.js"></script>');
    }
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_BIN || undefined,
      headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const page = await browser.newPage();
    const scriptFailures = [];
    page.on('requestfailed', request => {
      if (request.resourceType() === 'script') scriptFailures.push(request.failure()?.errorText);
    });
    await page.setExtraHTTPHeaders({ 'Sec-Fetch-Dest': 'document', 'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none', 'Sec-Fetch-User': '?1' });
    await page.goto(origin, { waitUntil: 'networkidle0' });
    assert.equal(await page.evaluate(() => window.dependencyReady === true), false);
    const legacyScript = requests.find(r => r.path === '/dependency.js');
    if (legacyScript) assert.equal(legacyScript.dest, 'document');
    else assert.deepEqual(scriptFailures, ['net::ERR_INVALID_ARGUMENT']);

    requests.length = 0;
    scriptFailures.length = 0;
    await page.setExtraHTTPHeaders(headers);
    await page.goto(origin, { waitUntil: 'networkidle0' });
    assert.equal(await page.evaluate(() => window.dependencyReady === true), true);
    assert.deepEqual(scriptFailures, []);
    const script = requests.find(r => r.path === '/dependency.js');
    assert.equal(script.dest, 'script');
    assert.equal(script.mode, 'no-cors');
    assert.equal(script.site, 'same-origin');
    assert.equal(script.user, undefined);
    const data = requests.find(r => r.path === '/data');
    assert.equal(data.dest, 'empty');
    assert.equal(data.mode, 'cors');
    assert.equal(data.site, 'same-origin');
    assert.equal(data.user, undefined);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
test('empty candidate notice describes Causa projection rather than claiming Nodus is empty', () => {
  const source = readFileSync(new URL('../../src/features/imo/CampaignGenerator.jsx', import.meta.url), 'utf8');
  assert.match(source, /registros sincronizados de Causa OS/);
  assert.doesNotMatch(source, /Nodus todavía no registra enrolados/);
});
