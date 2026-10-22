import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

// Synthetic data shaped like the public sources on 2026-10-22: seven trainings in
// progress today, upcoming C1s and one upcoming row whose name is empty in both sources.
const SEDES = ['LIM', 'CDMX', 'UIO C1', 'UIO C2', 'GYE', 'MED', 'CUE'];
const apiEvent = (sede, day, nombre, equipo) => ({
  id: `${sede}_${equipo}_${day}`, sede, fecha_inicio: `${day}T00:00:00`, fecha_fin: `${day}T00:00:00`,
  nombre, equipo, trainer: '', lugar: 'Sala sintética', direccion: '', ticket: 'pending',
  hotel: 'pending', notified: false, arrival: '', ticket_url: '',
});
const current = SEDES.map((sede, index) => apiEvent(sede, '2026-10-22', 'TANQUE', String(100 + index)));
const history = [apiEvent('LIM', '2026-09-04', 'CAPITULO UNO', '30')];
const upcomingC1 = [apiEvent('LIM', '2026-10-23', 'CAPITULO UNO', '32'), apiEvent('CDMX', '2026-10-23', 'CAPITULO UNO', '9')];
const nameless = apiEvent('LIM', '2027-01-01', '', '');
const csvOf = events => ['fecha,sede,equipo,entrenamiento,trainer,lugar,direccion',
  ...events.map(event => [event.fecha_inicio.slice(0, 10), event.sede, event.equipo, event.nombre, '', 'Sala sintética', ''].join(','))].join('\n');

async function openCalendar({ api, csv, blockSourceModule = false, mutateHtml } = {}) {
  const server = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 0, hmr: false } });
  await server.listen();
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  const origin = server.resolvedUrls.local[0];
  const sources = { api, csv };
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = request.url();
    if (request.method() !== 'GET') throw new Error(`Unexpected mutation: ${url}`);
    if (url.startsWith(origin)) {
      if (blockSourceModule && url.includes('officialCalendarSource.js')) return request.respond({ status: 404, body: '' });
      if (mutateHtml && url.includes('calendario_global.html')) {
        return fetch(url).then(response => response.text()).then(html =>
          request.respond({ status: 200, contentType: 'text/html', body: mutateHtml(html) }));
      }
      return request.continue();
    }
    const cors = { 'Access-Control-Allow-Origin': '*' };
    if (url.includes('script.google.com') && url.includes('getEventos')) {
      return sources.api ? request.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(sources.api) })
        : request.abort();
    }
    if (url.includes('docs.google.com/spreadsheets/d/1u0tc4')) {
      return sources.csv ? request.respond({ status: 200, contentType: 'text/csv', headers: cors, body: sources.csv })
        : request.abort();
    }
    if (url.includes('firebase-app.js')) return request.respond({ contentType: 'application/javascript', headers: cors,
      body: 'export const initializeApp = () => ({});' });
    if (url.includes('firebase-firestore.js')) return request.respond({ contentType: 'application/javascript', headers: cors,
      body: `export const getFirestore = () => ({});
        export const collection = (_db, name) => name;
        export const onSnapshot = (_ref, next) => { queueMicrotask(() => next({ docs: [] })); return () => {}; };` });
    if (request.resourceType() === 'script') return request.respond({ contentType: 'application/javascript',
      body: 'window.pdfjsLib ||= { GlobalWorkerOptions: {} }; window.tailwind ||= {};' });
    return request.abort();
  });
  await page.emulateTimezone('America/Guayaquil');
  await page.evaluateOnNewDocument(() => {
    sessionStorage.auth = 'true';
    const RealDate = Date;
    const fixed = new RealDate(2026, 9, 22, 20, 9, 36).getTime();
    window.Date = class extends RealDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    };
  });
  await page.goto(`${origin}calendario_global.html`, { waitUntil: 'domcontentloaded' });
  const close = async () => { await browser.close(); await server.close(); };
  return { page, errors, sources, close };
}

// Focus, visibility and snapshot listeners may start background refreshes; wait until none is in flight.
const settled = page => page.waitForFunction(() => {
  const text = document.getElementById('calendarFreshness')?.textContent || '';
  return calendarRefreshPromise === null && text && !text.startsWith('Consultando');
}, { timeout: 20_000 });
const refresh = async page => {
  await settled(page);
  return page.evaluate(() => syncFromServer());
};

const view = (page, sede) => page.evaluate(sede => {
  if (sede) { activeSede = sede; renderSedeTabs(); renderEvents(document.getElementById('searchInput').value); }
  const sidebar = [...document.querySelectorAll('#sidebarSedes button')]
    .find(item => item.textContent.includes(sede === 'CURRENT' ? 'ACTUALES' : 'PRÓXIMOS C1'));
  return {
    cards: document.querySelectorAll('#eventsContainer > .glass-card').length,
    text: document.getElementById('eventsContainer').textContent,
    count: document.getElementById('countVisible').textContent,
    sidebarCount: sidebar?.querySelector('span.rounded-full')?.textContent,
    empty: !document.getElementById('noResults').classList.contains('hidden'),
    emptyTitle: document.getElementById('noResultsTitle').textContent,
    issue: document.getElementById('renderIssues').classList.contains('hidden') ? '' : document.getElementById('renderIssues').textContent,
    status: document.getElementById('calendarFreshness').textContent,
  };
}, sede);

test('C1 view survives a nameless source row and keeps counters, cards and refresh status coherent', { timeout: 120_000 }, async () => {
  const api = [...history, ...current, ...upcomingC1, nameless];
  const { page, errors, close } = await openCalendar({ api, csv: csvOf(api) });
  try {
    await settled(page);
    const c1 = await view(page, 'ALL_C1');
    assert.equal(c1.cards, 2, 'one next C1 per sede with upcoming C1');
    assert.equal(c1.count, '2');
    assert.equal(c1.sidebarCount, '2', 'sidebar C1 counter uses the same rule as the cards');
    assert.equal(c1.empty, false);
    assert.equal(c1.issue, '');
    assert.match(c1.status, /Hoja oficial y Apps Script consultados/);

    const actuales = await view(page, 'CURRENT');
    assert.equal(actuales.cards, 7);
    assert.equal(actuales.count, '7');
    assert.equal(actuales.sidebarCount, '7');

    const lima = await view(page, 'LIM');
    assert.match(lima.text, /Sin nombre en la fuente oficial/, 'nameless row is flagged, not dropped or invented');
    assert.match(lima.text, /Equipo 32/);

    // Manual refresh keeps the selection and finishes with a real success state.
    await page.evaluate(() => { activeSede = 'ALL_C1'; renderSedeTabs(); renderEvents(''); });
    const complete = await refresh(page);
    assert.equal(complete, true);
    const after = await view(page);
    assert.equal(await page.evaluate(() => activeSede), 'ALL_C1');
    assert.equal(after.cards, 2);
    assert.equal(after.count, '2');
    assert.equal(errors.length, 0, errors.join('\n'));
  } finally {
    await close();
  }
});

test('zero upcoming C1 shows an explicit empty state while current events stay visible', { timeout: 120_000 }, async () => {
  const api = [...history, ...current];
  const { page, errors, close } = await openCalendar({ api, csv: csvOf(api) });
  try {
    await settled(page);
    const c1 = await view(page, 'ALL_C1');
    assert.equal(c1.cards, 0);
    assert.equal(c1.count, '0');
    assert.equal(c1.sidebarCount, '0');
    assert.equal(c1.empty, true);
    assert.equal(c1.emptyTitle, 'Sin Capítulo Uno próximos');
    const actuales = await view(page, 'CURRENT');
    assert.equal(actuales.cards, 7);
    assert.equal(actuales.empty, false);
    assert.equal(errors.length, 0, errors.join('\n'));
  } finally {
    await close();
  }
});

test('partial source, hung operational projection, render failure and missing module all end in a visible state', { timeout: 120_000 }, async () => {
  const api = [...history, ...current, ...upcomingC1, nameless];
  const { page, errors, sources, close } = await openCalendar({ api: null, csv: csvOf(api) });
  try {
    await settled(page);
    let state = await view(page, 'ALL_C1');
    assert.match(state.status, /historial de Apps Script no disponible/);
    assert.ok(state.cards >= 2);
    assert.equal(state.count, String(state.cards));
    assert.equal(state.sidebarCount, String(state.cards));

    sources.api = api;
    await page.evaluate(() => { window.causaCalendarLoadOperational = () => new Promise(() => {}); });
    const complete = await refresh(page);
    assert.equal(complete, false, 'a hung operational projection is never reported as complete');
    state = await view(page);
    assert.doesNotMatch(state.status, /^Consultando/);
    assert.equal(state.cards, 2, 'API history replaces the bundled fallback once available');
    assert.equal(state.count, '2');
    assert.equal(state.sidebarCount, '2');

    // One record that cannot be drawn is reported; the rest of the view stays.
    await page.evaluate(() => {
      window.causaCalendarLoadOperational = async () => [];
      const original = getEventStatus;
      getEventStatus = (start, end) => {
        if (String(start).startsWith('2026-10-23') && new Error().stack.includes('renderEventCard')) throw new Error('registro sintético');
        return original(start, end);
      };
      activeSede = 'ALL_C1';
    });
    assert.equal(await refresh(page), false, 'skipped records are never a complete refresh');
    state = await view(page);
    assert.equal(state.cards, 0);
    assert.equal(state.count, '0');
    assert.equal(state.empty, false, 'skipped records are not presented as a legitimate absence of C1');
    assert.match(state.issue, /^2 registro\(s\) de la fuente no se pudieron mostrar/);
    assert.match(state.status, /Hoja oficial y Apps Script consultados/);
    state = await view(page, 'CURRENT');
    assert.equal(state.cards, 7);
    assert.equal(state.count, '7');
    assert.equal(state.issue, '');
    assert.equal(errors.length, 0, errors.join('\n'));
  } finally {
    await close();
  }

  const missing = await openCalendar({ api, csv: csvOf(api), blockSourceModule: true });
  try {
    await settled(missing.page);
    const state = await view(missing.page);
    assert.match(state.status, /No se pudo actualizar el calendario/);
  } finally {
    await missing.close();
  }

  const noGrid = await openCalendar({ api, csv: csvOf(api),
    mutateHtml: html => html.replace('id="eventsContainer"', 'id="eventsContainerMissing"') });
  try {
    await settled(noGrid.page);
    const state = await noGrid.page.evaluate(() => ({
      status: document.getElementById('calendarFreshness').textContent,
      issue: document.getElementById('renderIssues').textContent,
    }));
    assert.match(state.status, /Datos leídos, pero no se pudieron mostrar/);
    assert.match(state.issue, /No se pudieron mostrar los eventos/);
    assert.equal(noGrid.errors.length, 0, noGrid.errors.join('\n'));
  } finally {
    await noGrid.close();
  }
});
