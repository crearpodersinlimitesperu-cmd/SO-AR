import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import puppeteer from 'puppeteer';

test('GoalsBoard renders synthetic roles, overachievement, source absence and scoped controls at mobile width', async () => {
  const roleSource = readFileSync(new URL('../src/data/usersData.js', import.meta.url), 'utf8');
  const roleFunctions = roleSource.slice(roleSource.indexOf('export const normalizeRole'), roleSource.indexOf('export const normalizeSede')) +
    roleSource.slice(roleSource.indexOf('export const ROLE_DISPLAY_NAMES'), roleSource.indexOf('export const ROLE_COLORS'));
  const quotas = [
    { email: 'one@example.invalid', name: 'Fixture One', role: 'coord_c1', sede: 'Lima', currentQuota: 11, targetQuota: 6 },
    { email: 'two@example.invalid', name: 'Fixture Two', role: 'gerente', sede: 'Lima', currentQuota: 1, targetQuota: 2 },
    { email: 'three@example.invalid', name: 'Fixture Three', sede: 'Lima', currentQuota: 1, targetQuota: 2 }
  ];
  const goals = [
    { id: 'lima', title: 'Aliados C1E31', sede: 'Lima', scope: 'ENTRENAMIENTO', targetValue: 25, currentValue: 13, progress: 52, assignedCoordinators: quotas },
    { id: 'quito', title: 'Synthetic Quito Equipo 119', sede: 'Quito', scope: 'ENTRENAMIENTO', targetValue: 10, currentValue: 0, progress: 0 }
  ];
  const mocks = {
    '../services/firebase': 'export const db = {};',
    '../context/AuthContext': `
      const user = { uid: 'synthetic-user', appRole: new URLSearchParams(location.search).get('role') || 'coord_c1', sede: 'Lima' };
      export const useAuth = () => ({ currentUser: user });
    `,
    '../context/CyclesContext': 'const events = []; export const useCycles = () => ({ currentCycle: null, events });',
    '../context/UIContext': 'const ui = { showToast: () => {}, showPrompt: async () => null }; export const useUI = () => ui;',
    '../data/usersData': `${roleFunctions}
      export const usersData = [];
      export const normalizeSede = value => value || '';
    `,
    'firebase/firestore': `
      const goals = ${JSON.stringify(goals)};
      export const collection = (_db, path) => ({ path });
      export const doc = (_db, path, id) => ({ path, id });
      export const query = ref => ref;
      export const where = () => ({});
      export const orderBy = () => ({});
      export const limit = () => ({});
      export const onSnapshot = (ref, optionsOrCallback, callbackOrError, maybeError) => {
        const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : callbackOrError;
        const onError = typeof optionsOrCallback === 'function' ? callbackOrError : maybeError;
        let active = true;
        queueMicrotask(() => {
          if (!active) return;
          if (new URLSearchParams(location.search).has('error') && ref.path === 'goals') {
            onError(new Error('Synthetic offline')); return;
          }
          const docs = (ref.path === 'goals' ? goals : []).map(g => ({ id: g.id, data: () => g }));
          const hasSource = ref.id === 'goal_sources' && new URLSearchParams(location.search).has('nodus');
          const stale = new URLSearchParams(location.search).has('stale');
          callback({ docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false }, exists: () => hasSource,
            data: () => ({ schemaVersion: 1, source: 'https://imo.crearpslglobal.com',
              queriedAt: new Date(Date.now() - (stale ? 2 * 86400000 : 0)).toISOString(), sourceUpdatedAt: null,
              teams: [{ sede: 'Lima', team: '31', stage: 'C1', teamId: '141', path: '/equipos/detalle/141', start: '2026-09-01', end: '2026-09-20' }],
              allies: [{ sede: 'Lima', team: '31', stage: 'C1', teamId: '141', path: '/aliados?id_equipo=141', metric: 'assignedAllies', value: 17, complete: true }]
            })
          });
        });
        return () => { active = false; };
      };
      export const addDoc = async () => { throw new Error('Fixture must not write'); };
      export const updateDoc = addDoc;
      export const setDoc = addDoc;
      export const runTransaction = addDoc;
      export const writeBatch = addDoc;
    `
  };
  const server = await createServer({
    configFile: false,
    server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [react(), {
      name: 'synthetic-goals-fixture',
      enforce: 'pre',
      resolveId(id) {
        if (Object.hasOwn(mocks, id)) return `\0goals-mock:${id}`;
        if (id === '/goals-fixture.jsx') return `${process.cwd()}/goals-fixture.jsx`;
      },
      load(id) {
        if (id.startsWith('\0goals-mock:')) return mocks[id.slice('\0goals-mock:'.length)];
        if (id === `${process.cwd()}/goals-fixture.jsx`) return `
          import React from 'react';
          import { createRoot } from 'react-dom/client';
          import { BrowserRouter } from 'react-router-dom';
          import GoalsBoard from '/src/pages/GoalsBoard.jsx';
          import '/src/index.css';
          createRoot(document.getElementById('root')).render(<BrowserRouter><GoalsBoard /></BrowserRouter>);
        `;
      },
      configureServer(s) {
        s.middlewares.use('/goals-test', (_req, res) => {
          res.setHeader('Content-Type', 'text/html');
          res.end('<html><body style="margin:0"><div id="root"></div><script type="module" src="/goals-fixture.jsx"></script></body></html>');
        });
      }
    }]
  });
  let browser;
  try {
    await server.listen();
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 390, height: 844 });
    const origin = server.resolvedUrls.local[0];
    await page.goto(`${origin}goals-test`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Meta superada'));
    let text = await page.evaluate(() => document.body.innerText);
    assert.match(text, /11\s*\/\s*6\s*\(183%\)/);
    assert.match(text, /Gerente de Sede/);
    assert.match(text, /Rol no registrado/);
    assert.match(text, /Sin evidencia comparable/);
    assert.match(text, /Sin verificar/);
    assert.doesNotMatch(text, /Synthetic Quito|100% Confiable|Al día|Ajuste Manual|Asignar \/ Dividir/);
    assert.match(text, /No encontramos fechas/);
    await page.goto(`${origin}goals-test?role=gerente`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Ajuste Manual'));
    text = await page.evaluate(() => document.body.innerText);
    assert.match(text, /Ajuste Manual/);
    assert.doesNotMatch(text, /Synthetic Quito/);
    await page.goto(`${origin}goals-test?nodus=1`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Aliados asignados: 17'));
    text = await page.evaluate(() => document.body.innerText);
    assert.match(text, /período registrado del equipo: 2026-09-01 al 2026-09-20/);
    assert.match(text, /No equivale a las fechas de cada etapa/);
    assert.match(text, /no acredita asistencia ni reemplaza el avance 13 \/ 25/);
    assert.match(text, /fecha de modificación no disponible/);
    const links = await page.$$eval('a[href]', elements => elements.map(e => e.href));
    assert.ok(links.includes('https://imo.crearpslglobal.com/aliados?id_equipo=141'));
    await page.goto(`${origin}goals-test?nodus=1&stale=1`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('desactualizada'));
    text = await page.evaluate(() => document.body.innerText);
    assert.doesNotMatch(text, /Aliados asignados: 17|período registrado del equipo/);
    await page.goto(`${origin}goals-test?error=1`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('No pudimos actualizar las metas'));
    text = await page.evaluate(() => document.body.innerText);
    assert.doesNotMatch(text, /Todavía no hay metas|No hay metas configuradas/);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
