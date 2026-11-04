import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import puppeteer from 'puppeteer';
import { join } from 'node:path';

test('manager history corrects a duplicate on desktop and mobile, retains audit and displays paid errors', async () => {
  const mocks = {
    '../context/AuthContext': `
      const currentUser = { uid: 'trainer', email: 'trainer@example.test', name: 'Entrenador Prueba',
        appRole: 'entrenador_llamadas', roles: ['entrenador_llamadas'], sede: 'Quito' };
      export const useAuth = () => ({ currentUser });
    `,
    '../context/UIContext': `export const useUI = () => ({ showToast: (text, type) => { window.lastToast = { text, type }; } });`,
    '../context/ThemeContext': `export const useTheme = () => ({ activeTheme: 'light' });`,
    '../context/CyclesContext': `const events = []; export const useCycles = () => ({ events });`,
    '../services/firebase': `export const db = { app: {} };`,
    '../services/auditService': `export const recordAuditEvent = () => {};`,
    '../services/dataIntegrityAgent': `export const auditAndDeduplicateManagers = () => { throw new Error('Production repair forbidden'); };`,
    '../components/CMJDashboard': `export default function Stub() { return null; }`,
    '../components/KPIsEntrenadoresLlamadas': `export default function Stub() { return null; }`,
    '../components/TrainerCoherencePanel': `export default function Stub() { return null; }`,
    'firebase/firestore': `
      const call = { tipo: 'individual', fecha: '2026-10-28', asistio: true,
        llamadaEfectiva: true, registradoPorEmail: 'trainer@example.test', registradoPorNombre: 'Entrenador Prueba' };
      const initial = { manager: { nombre: 'Persona Sintética', sede: 'Quito', equipo: 'SYNTHETIC',
        numEquipo: 901, rol: 'Capitán', estado: 'Activo', entrenador: 'Entrenador Prueba',
        entrenadorId: 'trainer', entrenadorEmail: 'trainer@example.test', llamadaFecha: '2026-11-04', llamadaAsistio: 'SI',
        llamadasHistorial: [{ ...call, id: 'november', fecha: '2026-11-04' }, { ...call, id: 'original' }, { ...call, id: 'duplicate' }] } };
      window.fixtureStore = JSON.parse(localStorage.getItem('correction-store') || JSON.stringify(initial));
      window.fixtureCorrections = JSON.parse(localStorage.getItem('correction-ledger') || '[]');
      window.fixtureInputs = [];
      const listeners = new Set();
      const snapshot = ref => {
        const values = ref.path === 'managers_directory' ? Object.entries(window.fixtureStore) :
          ref.path === 'call_corrections' ? window.fixtureCorrections.map(row => [row.id, row]) : [];
        const docs = values.map(([id, value]) => ({ id, data: () => value }));
        return { docs, metadata: { fromCache: false, hasPendingWrites: false }, forEach: fn => docs.forEach(fn) };
      };
      window.publishFixture = () => {
        localStorage.setItem('correction-store', JSON.stringify(window.fixtureStore));
        localStorage.setItem('correction-ledger', JSON.stringify(window.fixtureCorrections));
        listeners.forEach(fn => fn());
      };
      export const collection = (_db, path) => ({ path });
      let generated = 0;
      export const doc = (_db, path, id) => typeof path === 'string'
        ? ({ path, id }) : ({ id: 'operation-' + (++generated) });
      export const query = ref => ref;
      export const where = () => ({});
      export const serverTimestamp = () => 'synthetic-server-time';
      export const arrayUnion = (...values) => values;
      export const deleteField = () => null;
      export const onSnapshot = (ref, options, callback) => {
        if (typeof options === 'function') callback = options;
        const notify = () => callback(snapshot(ref));
        listeners.add(notify); queueMicrotask(notify);
        return () => listeners.delete(notify);
      };
      export const getDocs = async ref => snapshot(ref);
      const forbidden = async () => { throw new Error('Direct source mutation forbidden'); };
      export const updateDoc = forbidden;
      export const setDoc = forbidden;
      export const deleteDoc = forbidden;
      export const addDoc = forbidden;
      export const runTransaction = forbidden;
      export const writeBatch = forbidden;
    `,
    'firebase/functions': `
      export const getFunctions = () => ({});
      export const httpsCallable = (_functions, name) => async input => {
        if (name !== 'correctManagerCall') throw new Error('Unexpected function');
        window.fixtureInputs.push(input);
        if (window.fixturePaid) {
          const error = new Error('La llamada pertenece a una liquidación pagada. Solicita revisión a Finanzas o Dirección.');
          error.code = 'functions/failed-precondition'; throw error;
        }
        const manager = window.fixtureStore[input.managerDocId];
        const call = manager.llamadasHistorial.find(row => row.id === input.callId);
        const before = { ...call };
        Object.assign(call, input.action === 'anular' ? { estadoRegistro: 'anulada' } : input.changes);
        call.revision = (call.revision || 0) + 1;
        call.ultimaCorreccion = { motivo: input.motivo, actorEmail: 'trainer@example.test',
          occurredAtIso: '2026-11-04T19:00:00Z' };
        window.fixtureCorrections.push({ id: input.operationId, ...input, before, after: { ...call },
          actorEmail: 'trainer@example.test', occurredAtIso: '2026-11-04T19:00:00Z' });
        window.publishFixture();
        return { data: { ok: true, operationId: input.operationId } };
      };
    `,
  };
  const server = await createServer({
    configFile: false, server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [react(), {
      name: 'call-corrections-fixture', enforce: 'pre',
      resolveId(id) {
        if (Object.hasOwn(mocks, id)) return `\0correction-mock:${id}`;
        if (id === '/correction-fixture.jsx') return `${process.cwd()}${id}`;
      },
      load(id) {
        if (id.startsWith('\0correction-mock:')) return mocks[id.slice('\0correction-mock:'.length)];
        if (id === `${process.cwd()}/correction-fixture.jsx`) return `
          import React from 'react'; import { createRoot } from 'react-dom/client';
          import { MemoryRouter } from 'react-router-dom'; import CentroManagers from '/src/pages/CentroManagers.jsx';
          createRoot(document.getElementById('root')).render(<MemoryRouter><CentroManagers /></MemoryRouter>);
        `;
      },
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (!req.url.startsWith('/correction-test')) return next();
          res.setHeader('Content-Type', 'text/html');
          res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><div id="root"></div><script type="module" src="/correction-fixture.jsx"></script>');
        });
      },
    }],
  });
  let browser;
  try {
    await server.listen();
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.setViewport({ width, height: 1000 });
      await page.goto(`${server.resolvedUrls.local[0]}correction-test`);
      await page.waitForSelector('[data-manager-help="tarjetaIntegrante"]');
      await page.click('[data-manager-help="tarjetaIntegrante"]');
      await page.waitForFunction(() => document.body.textContent.includes('3 sesiones vigentes · 3 conservadas'));
      const openDuplicate = async () => {
        await page.$$eval('[data-manager-help="corregirLlamada"]', buttons => buttons[buttons.length - 1].click());
        await page.waitForSelector('[role="dialog"]');
      };
      await openDuplicate();
      await page.select('[data-manager-help="accionCorreccion"]', 'anular');
      assert.equal(await page.$eval('[data-manager-help="confirmarCorreccion"]', button => button.disabled), true);
      await page.type('[data-manager-help="motivoCorreccion"]', 'Registré dos veces esta llamada');
      if (process.env.CALL_CORRECTION_SCREENSHOTS_DIR) {
        await page.screenshot({ path: join(process.env.CALL_CORRECTION_SCREENSHOTS_DIR, `call-correction-${width}.png`) });
      }
      await page.click('[data-manager-help="confirmarCorreccion"]');
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 5000 }).catch(async error => {
        throw new Error(`${error.message}\n${errors.join('\n')}\n${JSON.stringify(await page.evaluate(() => ({
          text: document.querySelector('[role="dialog"]')?.textContent,
          inputs: window.fixtureInputs,
          fields: Array.from(document.querySelectorAll('form input, form select, form textarea')).map(el =>
            ({ value: el.value, valid: el.checkValidity(), message: el.validationMessage })),
          button: (() => { const button = document.querySelector('[data-manager-help="confirmarCorreccion"]');
            const rect = button.getBoundingClientRect();
            return { disabled: button.disabled, hit: document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.outerHTML }; })(),
        })))}`);
      });
      await page.waitForFunction(() => document.body.textContent.includes('2 sesiones vigentes · 3 conservadas'));
      assert.equal(await page.evaluate(() => window.fixtureStore.manager.llamadasHistorial.length), 3);
      assert.equal(await page.evaluate(() => window.fixtureInputs[0].callId), 'duplicate');
      assert.equal(await page.evaluate(() => window.fixtureInputs.length), 1);
      await page.reload();
      await page.waitForSelector('[data-manager-help="tarjetaIntegrante"]');
      await page.click('[data-manager-help="tarjetaIntegrante"]');
      await page.waitForFunction(() => document.body.textContent.includes('2 sesiones vigentes · 3 conservadas'));
      await openDuplicate();
      assert.equal(await page.$eval('[data-manager-help="confirmarCorreccion"]', button => button.disabled), true);
      assert.match(await page.$eval('[role="dialog"]', el => el.textContent), /Registré dos veces esta llamada/);
      assert.equal(await page.evaluate(() => {
        const panel = document.querySelector('[role="dialog"]');
        const rect = panel.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth && panel.scrollWidth <= panel.clientWidth;
      }), true);
      await page.keyboard.press('Escape');
      await page.evaluate(() => { window.fixturePaid = true; });
      await page.$$eval('[data-manager-help="corregirLlamada"]', buttons => buttons[0].click());
      await page.waitForSelector('[role="dialog"]');
      await page.type('[data-manager-help="motivoCorreccion"]', 'Corregir la fecha real del encuentro');
      await page.click('[data-manager-help="confirmarCorreccion"]');
      await page.waitForSelector('[role="dialog"] [role="alert"]');
      assert.match(await page.$eval('[role="alert"]', el => el.textContent), /Finanzas o Dirección/);
      assert.equal(await page.$eval('[data-manager-help="motivoCorreccion"]', el => el.value), 'Corregir la fecha real del encuentro');
      assert.equal(await page.evaluate(() => window.fixtureStore.manager.llamadasHistorial[0].revision || 0), 0);
      assert.deepEqual(errors.filter(message => !message.startsWith('Error corrigiendo llamada: Error: La llamada pertenece a una liquidación pagada.')), []);
      await context.close();
    }
  } finally {
    await browser?.close();
    await server.close();
  }
});
