import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import puppeteer from 'puppeteer';

test('real Managers screen uses server data, saves to real doc ID and reloads after stale sync; failures stay explicit', async () => {
  const mocks = {
    '../context/AuthContext': `
      const currentUser = { uid: 'test-owner', email: 'test@example.test', name: 'Prueba',
        appRole: 'gerente', roles: ['gerente'], sede: 'México' };
      export const useAuth = () => ({ currentUser });
    `,
    '../context/UIContext': `const ui = { showToast: (text, type) => { window.lastToast = { text, type }; } }; export const useUI = () => ui;`,
    '../context/ThemeContext': `export const useTheme = () => ({ activeTheme: 'light' });`,
    '../context/CyclesContext': `const data = { events: [] }; export const useCycles = () => data;`,
    '../services/firebase': `export const db = {};`,
    '../services/auditService': `export const recordAuditEvent = () => {};`,
    '../services/dataIntegrityAgent': `export const auditAndDeduplicateManagers = () => { throw new Error('No production repair in fixture'); };`,
    '../components/CMJDashboard': `export default function Stub() { return null; }`,
    '../components/KPIsEntrenadoresLlamadas': `export default function Stub() { return null; }`,
    '../components/TrainerCoherencePanel': `export default function Stub() { return null; }`,
    'firebase/firestore': `
      const initial = { 'real-firestore-id': { id: 'wrong-legacy-id', nombre: 'Persona Fixture México',
        sede: 'MEX', equipo: 'PRUEBA 901', numEquipo: 901, rol: 'Manager', estado: 'Activo',
        telefono: 'Anterior', entrenador: '', coordinador: '' },
        'lima-only': { nombre: 'Persona Solo Lima', sede: 'Lima', equipo: 'LIMA 902', numEquipo: 902, estado: 'Activo' } };
      const store = JSON.parse(localStorage.getItem('manager-fixture-store') || JSON.stringify(initial));
      window.fixtureStore = store;
      window.fixtureWrites = [];
      const listeners = new Set();
      const persist = () => localStorage.setItem('manager-fixture-store', JSON.stringify(store));
      const snapshot = ref => {
        const docs = ref.path === 'managers_directory'
          ? Object.entries(store).map(([id, data]) => ({ id, data: () => data })) : [];
        return { docs, size: docs.length, empty: docs.length === 0,
          metadata: { fromCache: window.fixtureCacheOnly === true, hasPendingWrites: false },
          forEach: fn => docs.forEach(fn) };
      };
      export const collection = (_db, path) => ({ path });
      export const doc = (_db, path, id) => ({ path, id });
      export const query = ref => ref;
      export const where = () => ({});
      export const serverTimestamp = () => 'fixture-server-time';
      export const deleteField = () => null;
      export const arrayUnion = (...values) => values;
      export const onSnapshot = (ref, options, callback, onError) => {
        if (typeof options === 'function') { onError = callback; callback = options; }
        const notify = () => {
          if (window.fixtureReadError && ref.path === 'managers_directory') {
            onError?.(new Error('Synthetic denied read')); return;
          }
          callback(snapshot(ref));
        };
        listeners.add(notify); queueMicrotask(notify);
        return () => listeners.delete(notify);
      };
      window.publishFixture = () => { persist(); listeners.forEach(fn => fn()); };
      export const getDocs = async ref => snapshot(ref);
      export const updateDoc = async (ref, changes) => {
        if (window.fixtureWriteError) throw new Error('Synthetic denied write');
        if (!store[ref.id]) throw new Error('Manager document does not exist');
        store[ref.id] = { ...store[ref.id], ...changes };
        window.fixtureWrites.push({ ref, changes });
        window.publishFixture();
      };
      export const setDoc = async () => { throw new Error('Unexpected upsert'); };
      export const deleteDoc = setDoc;
      export const addDoc = setDoc;
      export const runTransaction = setDoc;
      export const writeBatch = () => { throw new Error('Unexpected batch'); };
    `,
  };
  const server = await createServer({
    configFile: false, server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [react(), {
      name: 'managers-persistence-fixture', enforce: 'pre',
      resolveId(id) {
        if (Object.hasOwn(mocks, id)) return `\0manager-mock:${id}`;
        if (id === '/managers-fixture.jsx') return `${process.cwd()}${id}`;
      },
      load(id) {
        if (id.startsWith('\0manager-mock:')) return mocks[id.slice('\0manager-mock:'.length)];
        if (id === `${process.cwd()}/managers-fixture.jsx`) return `
          import React from 'react';
          import { createRoot } from 'react-dom/client';
          import { MemoryRouter } from 'react-router-dom';
          import CentroManagers from '/src/pages/CentroManagers.jsx';
          import { managerSheetPatch } from '/src/services/managerSyncPolicy.js';
          const params = new URLSearchParams(location.search);
          window.fixtureReadError = params.has('readError');
          window.fixtureCacheOnly = params.has('cacheOnly');
          window.staleSheetSync = () => {
            const manager = window.fixtureStore['real-firestore-id'];
            Object.assign(manager, managerSheetPatch(manager, {
              nombre: 'Persona Fixture México', telefono: 'Anterior', equipo: 'PRUEBA 901',
              estado: 'Activo', sede: 'CDMX', rol: 'Manager'
            }));
            window.publishFixture();
          };
          createRoot(document.getElementById('root')).render(
            <MemoryRouter initialEntries={['/centro-managers?sede=México']}><CentroManagers /></MemoryRouter>
          );
        `;
      },
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (!req.url.startsWith('/managers-test')) return next();
          res.setHeader('Content-Type', 'text/html');
          res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><div id="root"></div><script type="module" src="/managers-fixture.jsx"></script>');
        });
      },
    }],
  });
  let browser;
  try {
    await server.listen();
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1440, height: 1100 });
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('cpsl_managers_data_v3', JSON.stringify([{ id: 'stale', nombre: 'Persona Vieja Local', sede: 'MEX' }]));
    });
    const url = `${server.resolvedUrls.local[0]}managers-test`;
    await page.goto(url);
    await page.waitForSelector('[data-manager-help="editarIntegrante"]', { timeout: 10000 }).catch(async error => {
      throw new Error(`${error.message}\n${errors.join('\n')}\n${await page.$eval('body', el => el.textContent.slice(0, 2500))}`);
    });
    assert.equal(await page.$$eval('tbody tr', rows => rows.length), 1, 'no static catalogue appended');
    assert.doesNotMatch(await page.$eval('tbody', el => el.textContent), /Persona Solo Lima|Persona Vieja Local/);
    await page.click('[data-manager-help="editarIntegrante"]');
    await page.waitForSelector('form [data-manager-help="nombre"]');
    const replace = async (key, text) => {
      const selector = `form [data-manager-help="${key}"]`;
      await page.$eval(selector, el => el.select());
      await page.type(selector, text);
    };
    await replace('nombre', 'Persona Corregida México');
    await replace('telefono', 'Nuevo teléfono fixture');
    await page.click('form [data-manager-help="guardarCambios"]');
    await page.waitForFunction(() => window.lastToast?.type === 'success');
    const saved = await page.evaluate(() => ({ row: window.fixtureStore['real-firestore-id'], writes: window.fixtureWrites }));
    assert.equal(saved.row.nombre, 'Persona Corregida México');
    assert.equal(saved.row.telefono, 'Nuevo teléfono fixture');
    assert.equal(saved.writes[0].ref.id, 'real-firestore-id');
    assert.equal(saved.row._sheetIdentity.nombre, 'Persona Fixture México');
    await page.evaluate(() => window.staleSheetSync());
    await page.reload();
    await page.waitForSelector('[data-manager-help="editarIntegrante"]');
    assert.match(await page.$eval('tbody', el => el.textContent), /Persona Corregida México/);
    assert.match(await page.$eval('tbody', el => el.textContent), /Nuevo teléfono fixture/);
    assert.equal(await page.$$eval('tbody tr', rows => rows.length), 1);
    await page.click('[data-manager-help="editarIntegrante"]');
    await replace('nombre', 'No debe guardarse');
    await page.evaluate(() => { window.fixtureWriteError = true; });
    await page.click('form [data-manager-help="guardarCambios"]');
    await page.waitForFunction(() => window.lastToast?.type === 'error');
    assert.equal(await page.evaluate(() => window.fixtureStore['real-firestore-id'].nombre), 'Persona Corregida México');
    assert.ok(await page.$('form [data-manager-help="nombre"]'), 'form stays open on rejected save');
    await page.goto(`${url}?readError`);
    await page.waitForSelector('[role="alert"]');
    assert.match(await page.$eval('[role="alert"]', el => el.textContent), /No mostraremos datos antiguos/);
    assert.equal(await page.$('[data-manager-help="editarIntegrante"]'), null);
    assert.doesNotMatch(await page.$eval('body', el => el.textContent), /Persona Vieja Local/);
    await page.evaluate(() => { window.fixtureReadError = false; });
    await page.click('[data-manager-help="recargarDirectorio"]');
    await page.waitForSelector('[data-manager-help="editarIntegrante"]');
    await page.goto(`${url}?cacheOnly`);
    await page.waitForSelector('[role="status"]');
    assert.equal(await page.$('[data-manager-help="editarIntegrante"]'), null, 'cache does not enable edits');
    await page.evaluate(() => { window.fixtureCacheOnly = false; window.publishFixture(); });
    await page.waitForSelector('[data-manager-help="editarIntegrante"]');
    await page.evaluate(() => {
      for (const key of Object.keys(window.fixtureStore)) delete window.fixtureStore[key];
      window.publishFixture();
    });
    await page.waitForFunction(() => document.querySelector('tbody')?.textContent.includes('No hay managers'));
    assert.equal(await page.$('[data-manager-help="editarIntegrante"]'), null, 'confirmed empty collection stays empty');
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
