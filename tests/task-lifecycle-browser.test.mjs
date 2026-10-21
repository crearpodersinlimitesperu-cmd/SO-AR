import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import puppeteer from 'puppeteer';

test('task transactions roll back rejected optimism, gate celebrations and preserve cycle/person metadata', async () => {
  const catalog = `
    export const checklistData = ['catalog', 'catalog-new', 'catalog-missing', 'catalog-direct', 'catalog-custom'].map(id => ({
      id, role: 'gerente', task: 'Fixture ' + id, cyclePhase: 'PRE-C1'
    }));
    export const roles = [{ id: 'gerente', name: 'Fixture Manager' }];
  `;
  const mocks = {
    '../context/AuthContext': `
      const currentUser = { uid: 'fixture-owner', email: 'owner@example.test', appRole: 'gerente',
        roles: ['gerente'], sede: new URLSearchParams(location.search).has('teams') ? 'Quito' : 'Lima' };
      export const useAuth = () => ({ currentUser });
    `,
    '../context/UIContext': `
      const ui = { showToast: (text, type) => { window.fixtureToasts.push({ text, type }); },
        showPrompt: async () => null };
      export const useUI = () => ui;
    `,
    './UIContext': `export { useUI } from '../context/UIContext';`,
    './AuthContext': `export { useAuth } from '../context/AuthContext';`,
    '../context/CyclesContext': `
      const params = new URLSearchParams(location.search);
      const cycles = {
        currentCycle: params.has('noCycle') ? { name: 'Sin Equipo Activo' }
          : { id: params.get('cycle') || 'cycle-1', name: 'Fixture cycle' },
        currentStage: 'PRE-C1',
        quitoCycles: params.has('teams') ? [
          { equipo: '101', cycle: { id: 'cycle-1' }, stage: 'PRE-C1' },
          { equipo: '202', cycle: params.has('missingTeamCycle') ? null : { id: 'cycle-2' }, stage: 'PRE-C1' }
        ] : []
      };
      export const useCycles = () => cycles;
    `,
    './CyclesContext': `export { useCycles } from '../context/CyclesContext';`,
    '../data/checklistData': catalog,
    '../data/checklistData.js': catalog,
    '../services/firebase': `export const db = {}; export const auth = { currentUser: { email: 'owner@example.test' } };`,
    '../services/googleSync': `export const createGoogleTask = () => { throw new Error('No external sync allowed'); };`,
    '../utils/neuroFeedback': `export const celebrateVictory = () => { window.fixtureCelebrations++; };`,
    '../components/TaskCompletionChoiceModal': `
      import { createElement } from 'react';
      export default function Choice({ isOpen, onCompleteOnly }) {
        return isOpen ? createElement('button', { id: 'fixture-complete', onClick: onCompleteOnly }, 'Complete fixture') : null;
      }
    `,
    'firebase/firestore': `
      const params = new URLSearchParams(location.search);
      const sede = params.has('teams') ? 'Quito' : 'Lima';
      const initial = {
        catalog: { id: 'catalog', role: 'gerente', task: 'Fixture catalog', cyclePhase: 'PRE-C1',
          completed: false, status: 'En progreso', progressPercentage: 25,
          comments: 'Original comment', responsible: 'Fixture manager',
          history: [{ action: 'created', at: 'original-time' }], created_at: 'original-time',
          completions: {
            [sede + '__cycle-1']: { completed: false, progressPercentage: 25, updatedAt: 'confirmed-time' },
            [sede + '__old']: { completed: true, completedAt: 'original-close', completionId: 'old-event' }
          }
        },
        personal: { id: 'personal', role: 'gerente', task: 'Fixture personal', cyclePhase: 'PRE-C1',
          isCustom: true, assignedToEmail: 'owner@example.test', completed: false,
          comments: 'Personal comment', assignedByEmail: 'assigner@example.test' },
        'catalog-direct': { id: 'catalog-direct', role: 'gerente', task: 'Fixture direct',
          cyclePhase: 'PRE-C1', assignedToEmails: ['owner@example.test'], completed: false },
        'catalog-custom': { id: 'catalog-custom', role: 'gerente', task: 'Fixture custom',
          cyclePhase: 'PRE-C1', isCustom: true, createdBy: 'owner@example.test', completed: false }
      };
      const store = JSON.parse(localStorage.getItem('task-lifecycle-fixture') || JSON.stringify(initial));
      window.fixtureStore = store;
      window.fixtureWrites = [];
      const listeners = new Set();
      export const collection = (_db, path) => ({ path });
      let eventId = 0;
      export const doc = (_db, path, id) => typeof path === 'string'
        ? { path, id } : { path: _db.path, id: 'event-' + ++eventId };
      export const query = ref => ref;
      export const where = () => ({});
      export const orderBy = where;
      export const limit = where;
      export const onSnapshot = (ref, callback) => {
        const notify = () => callback({ docs: Object.entries(store).map(([id, value]) => {
          const data = structuredClone(value);
          return { id, data: () => data };
        }) });
        listeners.add(notify);
        queueMicrotask(notify);
        return () => listeners.delete(notify);
      };
      window.publishFixture = () => {
        localStorage.setItem('task-lifecycle-fixture', JSON.stringify(store));
        listeners.forEach(notify => notify());
      };
      const patch = (target, updates) => {
        for (const [path, value] of Object.entries(updates)) {
          const parts = path.split('.');
          let cursor = target;
          for (const part of parts.slice(0, -1)) cursor = cursor[part] ??= {};
          cursor[parts.at(-1)] = structuredClone(value);
        }
      };
      export const runTransaction = async (_db, callback) => {
        const writes = [];
        await callback({
          get: async ref => ({ exists: () => Boolean(store[ref.id]), data: () => structuredClone(store[ref.id]) }),
          update: (ref, updates) => writes.push({ ref, updates }),
          set: (ref, updates) => writes.push({ ref, updates })
        });
        if (window.fixtureHoldWrites) await new Promise((resolve, reject) => {
          window.fixtureRelease = resolve;
          window.fixtureReject = () => reject(new Error('Synthetic denied write'));
        });
        if (window.fixtureWriteError) throw new Error('Synthetic denied write');
        for (const { ref, updates } of writes) {
          window.fixtureWrites.push({ ref, updates });
          if (ref.path === 'tasks') patch(store[ref.id] ??= {}, updates);
        }
        window.publishFixture();
      };
      const unexpected = () => { throw new Error('Unexpected non-transaction write'); };
      export const updateDoc = unexpected;
      export const setDoc = unexpected;
      export const writeBatch = unexpected;
      export const addDoc = unexpected;
      export const getDocs = unexpected;
      export const getDoc = unexpected;
    `,
  };
  for (const name of ['TaskAssignmentModal', 'TaskCollaborationModal', 'LearningReflectionModal',
    'ForeignTaskWarningModal', 'NewExcellenceModal', 'SyncHistoryModal', 'TaskDetailModal']) {
    mocks[`../components/${name}`] = 'export default function Stub() { return null; }';
  }
  const server = await createServer({
    configFile: false, server: { host: '127.0.0.1', port: 0, hmr: false, forwardConsole: false },
    plugins: [react(), {
      name: 'task-lifecycle-fixture', enforce: 'pre',
      resolveId(id) {
        if (Object.hasOwn(mocks, id)) return `\0task-mock:${id}`;
        if (id === '/task-fixture.jsx') return `${process.cwd()}${id}`;
      },
      load(id) {
        if (id.startsWith('\0task-mock:')) return mocks[id.slice('\0task-mock:'.length)];
        if (id === `${process.cwd()}/task-fixture.jsx`) return `
          import React from 'react';
          import { createRoot } from 'react-dom/client';
          import { MemoryRouter, Routes, Route } from 'react-router-dom';
          import { ChecklistProvider, useChecklist } from '/src/context/ChecklistContext.jsx';
          import ChecklistBoard from '/src/pages/ChecklistBoard.jsx';
          window.fixtureToasts = [];
          window.fixtureCelebrations = 0;
          function Fixture() {
            const api = useChecklist();
            window.fixtureApi = api;
            return <><pre id="fixture-state">{JSON.stringify(api.tasks)}</pre><ChecklistBoard /></>;
          }
          createRoot(document.getElementById('root')).render(
            <React.StrictMode><MemoryRouter initialEntries={['/checklist/gerente']}>
              <ChecklistProvider><Routes><Route path="/checklist/:roleId" element={<Fixture />} /></Routes></ChecklistProvider>
            </MemoryRouter></React.StrictMode>
          );
        `;
      },
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (!req.url.startsWith('/task-test')) return next();
          res.setHeader('Content-Type', 'text/html');
          res.end('<link rel="icon" href="data:,"><div id="root"></div><script type="module" src="/task-fixture.jsx"></script>');
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
    await page.setRequestInterception(true);
    const url = `${server.resolvedUrls.local[0]}task-test`;
    page.on('request', request => {
      if (request.url().startsWith(server.resolvedUrls.local[0]) || request.url().startsWith('data:')) request.continue();
      else if (request.resourceType() === 'image') request.respond({ status: 204 });
      else { errors.push(`External request blocked: ${request.url()}`); request.abort(); }
    });
    const load = async (params = '') => {
      await page.goto(`${url}${params}`);
      await page.waitForFunction(() => window.fixtureApi?.loading === false && window.fixtureApi.tasks.some(t => t.id === 'catalog'))
        .catch(error => { throw new Error(`${error.message}\n${errors.join('\n')}`); });
    };
    const state = () => page.evaluate(() => window.fixtureApi.tasks);
    const call = (method, ...args) => page.evaluate(async (method, args) => {
      try { await window.fixtureApi[method](...args); return { ok: true }; }
      catch (error) { return { ok: false, message: error.message }; }
    }, method, args);
    const start = (id = 'catalog', completed = false, team = null) => page.evaluate((id, completed, team) => {
      window.fixtureHoldWrites = true;
      window.fixtureResult = null;
      window.fixtureApi.toggleTask(id, completed, team).then(
        () => { window.fixtureResult = 'resolved'; },
        error => { window.fixtureResult = error.message; }
      );
    }, id, completed, team);
    const reject = async () => {
      await page.waitForFunction(() => typeof window.fixtureReject === 'function');
      await page.evaluate(() => { window.fixtureReject(); window.fixtureHoldWrites = false; });
      await page.waitForFunction(() => window.fixtureResult === 'Synthetic denied write');
    };
    await load();
    const original = await state();
    await start();
    await page.waitForFunction(() => window.fixtureApi.tasks.find(t => t.id === 'catalog')?.completed === true);
    const duplicate = await call('toggleTask', 'catalog', true);
    assert.equal(duplicate.ok, false);
    assert.match(duplicate.message, /cambio anterior/);
    await reject();
    assert.deepEqual(await state(), original, 'rejected toggle restores all confirmed fields and other tasks');
    assert.equal(await page.evaluate(() => window.fixtureWrites.length), 0);
    assert.equal(await page.evaluate(() => window.fixtureToasts.at(-1).type), 'error');

    // Real board handlers must not celebrate while the transaction is pending or after rejection.
    await page.evaluate(() => { window.fixtureHoldWrites = true; window.fixtureReject = null; });
    await page.$eval('.task-card', card => card.querySelector('input[type="checkbox"]').click());
    await page.waitForSelector('#fixture-complete');
    await page.click('#fixture-complete');
    await page.waitForFunction(() => window.fixtureReject !== null);
    assert.equal(await page.evaluate(() => window.fixtureCelebrations), 0);
    await page.evaluate(() => { window.fixtureReject(); window.fixtureHoldWrites = false; });
    await page.waitForFunction(() => window.fixtureApi.tasks.find(t => t.id === 'catalog')?.completed === false);
    assert.equal(await page.evaluate(() => window.fixtureCelebrations), 0);
    assert.deepEqual(await state(), original);

    // Authoritative snapshots arriving during a failed write must not be replaced with stale state.
    await start();
    await page.waitForFunction(() => window.fixtureApi.tasks.find(t => t.id === 'catalog')?.completed === true);
    await page.evaluate(() => {
      window.fixtureStore.catalog.comments = 'New confirmed comment';
      window.fixtureStore.personal.comments = 'Other confirmed comment';
      window.publishFixture();
    });
    await page.waitForFunction(() => window.fixtureApi.tasks.find(t => t.id === 'catalog')?.comments === 'New confirmed comment');
    const newerSnapshot = await state();
    await reject();
    assert.deepEqual(await state(), newerSnapshot);

    // A committed completion survives reload, retaining the old cycle and audit fields.
    await page.evaluate(() => { window.fixtureHoldWrites = true; window.fixtureRelease = null; });
    await page.$eval('.task-card', card => card.querySelector('input[type="checkbox"]').click());
    await page.waitForSelector('#fixture-complete');
    await page.click('#fixture-complete');
    await page.waitForFunction(() => window.fixtureRelease !== null);
    assert.equal(await page.evaluate(() => window.fixtureCelebrations), 0);
    await page.evaluate(() => { window.fixtureRelease(); window.fixtureHoldWrites = false; });
    await page.waitForFunction(() => window.fixtureCelebrations === 1);
    await page.reload();
    await page.waitForFunction(() => window.fixtureApi?.loading === false);
    const completed = (await state()).find(t => t.id === 'catalog');
    assert.equal(completed.completed, true);
    assert.equal(completed.progressPercentage, 100);
    assert.ok(completed.completedAt);
    assert.equal(completed.completions.Lima__old.completedAt, 'original-close');
    assert.equal(completed.responsible, 'Fixture manager');
    assert.deepEqual(completed.history, [{ action: 'created', at: 'original-time' }]);
    await start('catalog', true);
    await page.waitForFunction(() => window.fixtureApi.tasks.find(t => t.id === 'catalog')?.completed === false);
    await reject();
    assert.deepEqual((await state()).find(t => t.id === 'catalog'), completed, 'failed reopen preserves closure time and history');

    await page.evaluate(() => { window.fixtureWriteError = true; });
    assert.equal((await call('updateTaskDetails', 'catalog', { progressPercentage: 50 })).ok, false);
    assert.deepEqual((await state()).find(t => t.id === 'catalog'), completed);
    await page.evaluate(() => { window.fixtureWriteError = false; });
    assert.deepEqual(await call('updateTaskDetails', 'catalog-new', {
      progressPercentage: 50, comments: 'First catalog write', responsible: 'Fixture manager'
    }), { ok: true });
    await page.reload();
    await page.waitForFunction(() => window.fixtureApi?.loading === false);
    const created = (await state()).find(t => t.id === 'catalog-new');
    assert.equal(created.progressPercentage, 50, 'omitted scope resolves the active cycle on first write');
    assert.equal(created.completed, false);
    assert.equal(created.completions['Lima__cycle-1'].progressPercentage, 50);
    assert.equal(created.comments, 'First catalog write');
    assert.equal(created.responsible, 'Fixture manager');
    await load('?cycle=cycle-2');
    assert.equal((await state()).find(t => t.id === 'catalog').completed, false, 'a new cycle does not inherit completion');

    await load('?noCycle');
    for (const [method, args] of [
      ['toggleTask', ['catalog', false]],
      ['toggleTask', ['catalog-missing', false]],
      ['updateTaskDetails', ['catalog', { progressPercentage: 100 }]],
      ['updateTaskDetails', ['catalog-missing', { comments: 'Must not be created without a cycle' }]],
      ['updateTaskDetails', ['catalog', { progress: 100 }, { sede: 'Lima', cycle: { id: ' ' } }]],
    ]) {
      const before = await state();
      const result = await call(method, ...args);
      assert.equal(result.ok, false);
      assert.match(result.message, /Espera a que cargue el ciclo/);
      assert.deepEqual(await state(), before);
      assert.equal(await page.evaluate(() => window.fixtureWrites.length), 0);
    }
    for (const id of ['personal', 'catalog-direct', 'catalog-custom']) {
      assert.deepEqual(await call('toggleTask', id, false), { ok: true });
      assert.deepEqual(await call('updateTaskDetails', id, { comments: 'Kept without a cycle' }), { ok: true });
      const saved = await page.evaluate(id => window.fixtureStore[id], id);
      assert.equal(saved.completed, true);
      assert.equal(saved.comments, 'Kept without a cycle');
      assert.ok(saved.completions.Lima.completed);
      assert.equal(Object.keys(saved.completions).some(key => key.includes('__')), false);
    }
    assert.equal(await page.evaluate(() => window.fixtureStore.personal.assignedByEmail), 'assigner@example.test');
    assert.ok(await page.evaluate(() => window.fixtureWrites.some(write => write.ref.path === 'mail')));

    await load('?teams');
    const beforeTeams = await state();
    await start('catalog__EQ202', false, '202');
    await page.waitForFunction(() => window.fixtureApi.tasks.find(t => t.uiKey === 'catalog__EQ202')?.completed === true);
    assert.equal((await state()).find(t => t.uiKey === 'catalog__EQ101').completed, false);
    await reject();
    assert.deepEqual(await state(), beforeTeams);
    assert.deepEqual(await call('toggleTask', 'catalog__EQ202', false, '202'), { ok: true });
    await load('?teams');
    assert.equal((await state()).find(t => t.uiKey === 'catalog__EQ202').completed, true);
    assert.equal((await state()).find(t => t.uiKey === 'catalog__EQ101').completed, false);
    await load('?teams&missingTeamCycle');
    const noTeamCycle = await state();
    assert.equal((await call('toggleTask', 'catalog__EQ202', false, '202')).ok, false);
    assert.deepEqual(await state(), noTeamCycle);
    assert.equal(await page.evaluate(() => window.fixtureWrites.length), 0, 'never fall back to the other Quito team cycle');
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
