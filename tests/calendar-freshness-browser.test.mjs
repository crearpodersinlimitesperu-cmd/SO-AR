import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import puppeteer from 'puppeteer';
import { buildAsignadorEventKey } from '../public/trainerCalendarProjection.js';

const base = {
  nombre: 'TANQUE', sede: 'GYE', equipo: '77*78',
  fecha_inicio: '2030-11-02T00:00:00', fecha_fin: '2030-11-02T00:00:00',
};
const csv = (day = '2030-11-02') =>
  `fecha,sede,equipo,entrenamiento,trainer,lugar,direccion\n${day},GYE,77*78,TANQUE,Sugerencia NO confirmada,Sala sintética,\n2030-11-03,UIO,122,TANQUE,,,`;

async function serverFixture(provider) {
  const mocks = {
    './AuthContext': `const currentUser = { uid: 'fixture', appRole: 'direccion', sede: 'Global' };
      export const useAuth = () => ({ currentUser });`,
    '../services/firebase': 'export const db = {};',
    'firebase/firestore': `
      export const collection = (_db, name) => name;
      export const onSnapshot = (name, next) => {
        window.fixtureSnapshots ||= {};
        window.fixtureSnapshots[name] = data => next({ docs: data.map(item => ({ id: item.id, data: () => item })) });
        queueMicrotask(() => window.fixtureSnapshots[name]([]));
        return () => delete window.fixtureSnapshots[name];
      };
    `,
  };
  return createServer({
    configFile: false, server: { host: '127.0.0.1', port: 0, hmr: false, forwardConsole: false },
    plugins: [react(), ...(provider ? [{
      name: 'calendar-freshness-fixture', enforce: 'pre',
      resolveId(id) {
        if (Object.hasOwn(mocks, id)) return `\0calendar-mock:${id}`;
        if (id === '/calendar-fixture.jsx') return `${process.cwd()}${id}`;
      },
      load(id) {
        if (id.startsWith('\0calendar-mock:')) return mocks[id.slice('\0calendar-mock:'.length)];
        if (id === `${process.cwd()}/calendar-fixture.jsx`) return `
          import React from 'react';
          import { createRoot } from 'react-dom/client';
          import { CyclesProvider, useCycles } from '/src/context/CyclesContext.jsx';
          import CalendarFreshness from '/src/components/CalendarFreshness.jsx';
          function Fixture() {
            const api = useCycles();
            window.fixture = api;
            return <><CalendarFreshness status={api.calendarStatus} onRefresh={api.refreshCalendar} />
              <pre id="events">{JSON.stringify(api.events)}</pre></>;
          }
          createRoot(document.getElementById('root')).render(
            <React.StrictMode><CyclesProvider><Fixture /></CyclesProvider></React.StrictMode>
          );
        `;
      },
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (!req.url.startsWith('/calendar-test')) return next();
          res.setHeader('Content-Type', 'text/html');
          res.end('<div id="root"></div><script type="module" src="/calendar-fixture.jsx"></script>');
        });
      },
    }] : [])],
  });
}

test('real CyclesProvider exposes stale cache, failures, refresh, reconnect, operational updates and reload', { timeout: 120_000 }, async () => {
  const server = await serverFixture(true);
  let browser;
  try {
    await server.listen();
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const origin = server.resolvedUrls.local[0];
    let mode = 'offline';
    let calls = 0;
    let releaseSheet;
    let sheetRequested;
    const heldSheet = new Promise(resolve => { sheetRequested = resolve; });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      if (request.url().startsWith(origin)) return request.continue();
      calls++;
      if (mode === 'offline') return request.abort();
      if (request.url().includes('script.google.com')) {
        if (mode === 'sheet-only') return request.abort();
        return request.respond({ status: 200, contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify([
            base, { ...base, equipo: 'history', fecha_inicio: '2020-01-01T00:00:00' },
          ]) });
      }
      if (request.url().includes('docs.google.com')) {
        if (mode === 'held') await new Promise(resolve => { releaseSheet = resolve; sheetRequested(); });
        return request.respond({ status: 200, contentType: 'text/csv',
          headers: { 'Access-Control-Allow-Origin': '*' }, body: csv() });
      }
      return request.abort();
    });
    const cached = { ...base, equipo: 'old-cache', fecha_inicio: '2020-01-01T00:00:00' };
    await page.evaluateOnNewDocument(event => {
      if (!localStorage.getItem('fixture-seeded')) {
        localStorage.setItem('causa_official_calendar_cache', JSON.stringify([event]));
        localStorage.setItem('fixture-seeded', 'true');
      }
    }, cached);
    await page.goto(`${origin}calendar-test`);
    await page.waitForFunction(() => window.fixture?.calendarStatus.error && window.fixture.events.length === 1);
    assert.match(await page.$eval('[role=status]', el => el.textContent), /actualidad no verificada.*desconocida/);
    assert.equal(await page.evaluate(() => window.fixture.loadingEvents), false);

    mode = 'held';
    await page.click('button');
    await page.waitForFunction(() => document.querySelector('button').disabled);
    assert.equal(await page.evaluate(() => window.fixture.events[0].equipo), 'old-cache');
    const before = calls;
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); window.fixture.refreshCalendar(); });
    assert.equal(calls, before, 'concurrent refresh requests are coalesced');
    await heldSheet;
    releaseSheet();
    await page.waitForFunction(() => !window.fixture.calendarStatus.refreshing);
    assert.match(await page.$eval('[role=status]', el => el.textContent), /Hoja oficial y Apps Script consultados/);
    assert.ok(await page.evaluate(() => window.fixture.events.some(event => event.equipo === '77*78')));
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('causa_official_calendar_cache')));
    assert.ok(saved.checkedAt);

    const key = buildAsignadorEventKey(base);
    await page.evaluate(key => {
      window.fixtureSnapshots.calendario_asignaciones_publicas([{ id: key, unico: { entrenador: 'Entrenador sintético' } }]);
      window.fixtureSnapshots.calendario_operativo_publico([{
        id: key, sourceEventKey: key, kind: 'override', sede: 'GYE', nombre: 'TANQUE', equipo: '77*78',
        fechaInicio: '2030-12-01T00:00:00', fechaFin: '2030-12-01T00:00:00',
      }]);
    }, key);
    await page.waitForFunction(() => window.fixture.events.some(event => event.trainer === 'Entrenador sintético' && event.fecha_inicio.startsWith('2030-12-01')));
    mode = 'sheet-only';
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForFunction(() => window.fixture.calendarStatus.sources?.api === false && !window.fixture.calendarStatus.refreshing);
    assert.ok(await page.evaluate(() => window.fixture.events.some(event => event.trainer === 'Entrenador sintético')));
    assert.ok(await page.evaluate(() => window.fixture.events.some(event => event.equipo === 'history')));

    mode = 'offline';
    const checkedAt = await page.evaluate(() => window.fixture.calendarStatus.checkedAt);
    await page.reload();
    await page.waitForFunction(() => window.fixture?.calendarStatus.error);
    assert.equal(await page.evaluate(() => window.fixture.calendarStatus.checkedAt), checkedAt);
    assert.match(await page.$eval('[role=status]', el => el.textContent), /Copia local; actualidad no verificada/);
    await page.evaluate(() => localStorage.setItem('causa_official_calendar_cache', '{invalid'));
    mode = 'sheet-only';
    await page.reload();
    await page.waitForFunction(() => window.fixture?.calendarStatus.sources?.sheet && !window.fixture.calendarStatus.refreshing);
    assert.ok(await page.evaluate(() => window.fixture.events.some(event => event.equipo === '77*78')));
    assert.equal(errors.length, 0, errors.join('\n'));
  } finally {
    await browser?.close();
    await server.close();
  }
});

test('actual global calendar reads CSV without API, preserves filters and never toasts false refresh success', { timeout: 120_000 }, async () => {
  const server = await serverFixture(false);
  let browser;
  try {
    await server.listen();
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const origin = server.resolvedUrls.local[0];
    let offline = false;
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      if (url.startsWith(origin)) return request.continue();
      if (request.method() !== 'GET') throw new Error(`Unexpected mutation: ${url}`);
      if (url.includes('docs.google.com/spreadsheets/d/1u0tc4')) {
        return offline ? request.abort() : request.respond({ status: 200, contentType: 'text/csv',
          headers: { 'Access-Control-Allow-Origin': '*' }, body: csv() });
      }
      if (url.includes('firebase-app.js')) return request.respond({
        contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' },
        body: 'export const initializeApp = () => ({});',
      });
      if (url.includes('firebase-firestore.js')) return request.respond({
        contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' },
        body: `export const getFirestore = () => ({});
          export const collection = (_db, name) => name;
          export const onSnapshot = (_ref, next) => { queueMicrotask(() => next({ docs: [] })); return () => {}; };`,
      });
      if (request.resourceType() === 'script' && !url.includes('script.google.com')) {
        return request.respond({ contentType: 'application/javascript',
          body: 'window.pdfjsLib ||= { GlobalWorkerOptions: {} }; window.tailwind ||= {};' });
      }
      return request.abort();
    });
    await page.evaluateOnNewDocument(() => { sessionStorage.auth = 'true'; });
    await page.goto(`${origin}calendario_global.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('calendarFreshness').textContent.includes('historial de Apps Script no disponible'));
    const actual = await page.evaluate(() => {
      activeSede = 'GYE';
      activeTab = 'upcoming';
      document.getElementById('searchInput').value = '77';
      renderEvents('77');
      return {
        teams: Object.values(allEventsData).flat().map(event => event.equipo),
        cards: document.getElementById('eventsContainer').textContent,
      };
    });
    assert.ok(actual.teams.includes('77*78'));
    assert.match(actual.cards, /77/);
    assert.doesNotMatch(actual.cards, /Equipo 122/);

    offline = true;
    await page.evaluate(async () => {
      window.fixtureToasts = [];
      window.showToast = (message, type) => window.fixtureToasts.push({ message, type });
      await manualSync();
    });
    const result = await page.evaluate(() => ({
      sede: activeSede, tab: activeTab, search: document.getElementById('searchInput').value,
      status: document.getElementById('calendarFreshness').textContent, toasts: window.fixtureToasts,
      hasTeam: Object.values(allEventsData).flat().some(event => event.equipo === '77*78'),
    }));
    assert.equal(result.sede, 'GYE');
    assert.equal(result.tab, 'upcoming');
    assert.equal(result.search, '77');
    assert.equal(result.hasTeam, true);
    assert.match(result.status, /No se pudo actualizar/);
    assert.equal(result.toasts.at(-1).type, 'warning');
    assert.ok(!result.toasts.some(toast => toast.type === 'success'));
    offline = false;
    await page.evaluate(() => syncFromServer());
    await page.waitForFunction(() => document.getElementById('calendarFreshness').textContent.includes('historial de Apps Script no disponible'));
    assert.equal(await page.evaluate(() => activeSede), 'GYE');
    await page.evaluate(() => { activeTab = 'past'; renderEvents('77'); });
    assert.doesNotMatch(await page.$eval('#eventsContainer', el => el.textContent), /Equipo 77/);
  } finally {
    await browser?.close();
    await server.close();
  }
});
