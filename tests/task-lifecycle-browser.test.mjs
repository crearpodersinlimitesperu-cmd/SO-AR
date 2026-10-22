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
      const params = new URLSearchParams(location.search);
      const otherUser = params.has('otherUser');
      const currentUser = {
        uid: otherUser ? 'fixture-other' : 'fixture-owner',
        email: otherUser ? 'other@example.test' : 'owner@example.test',
        appRole: 'gerente', roles: ['gerente'], sede: params.has('teams') ? 'Quito' : 'Lima'
      };
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
    '../services/firebase': `
      const otherUser = new URLSearchParams(location.search).has('otherUser');
      export const db = {};
      export const auth = { currentUser: { email: otherUser ? 'other@example.test' : 'owner@example.test' } };
    `,
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
          completed: false, status: 'En progreso', completedAt: null, progressPercentage: 25,
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
          cyclePhase: 'PRE-C1', isCustom: true, createdBy: 'owner@example.test', completed: false },
        'closed-multi': { id: 'closed-multi', task: 'Fixture closed multi-assignee', isCustom: true,
          assignedToEmails: ['owner@example.test', 'other@example.test'], completed: true,
          status: 'Completada', completedAt: 'root-close', progressPercentage: 100,
          assigneeProgress: {
            'owner@example.test': { completed: true, completedAt: 'owner-close', progress: 100 },
            'other@example.test': { completed: false, progress: 10 }
          } },
        'multi-assignee-open': { id: 'multi-assignee-open', task: 'Fixture open multi-assignee', isCustom: true,
          assignedToEmails: ['owner@example.test', 'other@example.test'], completed: false,
          status: 'En Progreso', progressPercentage: 55,
          assigneeProgress: {
            'owner@example.test': { completed: true, completedAt: 'owner-close', progress: 100 },
            'other@example.test': { completed: false, progress: 10 }
          } }
      };
      const store = JSON.parse(localStorage.getItem('task-lifecycle-fixture') || JSON.stringify(initial));
      const participants = JSON.parse(localStorage.getItem('task-lifecycle-participants') || '{}');
      window.fixtureStore = store;
      window.fixtureParticipants = participants;
      window.fixtureTask = id => ({ ...store[id], assigneeProgress: {
        ...(store[id]?.assigneeProgress || {}),
        ...Object.fromEntries(Object.entries(participants[id] || {}).map(([key, record]) => [key, record.state]))
      } });
      window.fixtureWrites = [];
      window.fixtureTransactions = [];
      window.fixtureEvents = JSON.parse(localStorage.getItem('task-lifecycle-events') || '{}');
      const listeners = new Set();
      export const collection = (_db, path) => ({ path });
      export const serverTimestamp = () => new Date().toISOString();
      let eventId = Object.keys(window.fixtureEvents).length;
      export const doc = (_db, path, id) => typeof path === 'string'
        ? { path, id } : { path: _db.path, id: 'event-' + ++eventId };
      export const query = ref => ref;
      export const where = () => ({});
      export const orderBy = where;
      export const limit = where;
      export const onSnapshot = (ref, callback, onError) => {
        const notify = () => {
          if (ref.path.endsWith('/participant_states') && window.fixtureParticipantError === ref.path.split('/')[1]) {
            onError({ code: 'permission-denied' });
            return;
          }
          callback({ docs: Object.entries(ref.path.endsWith('/participant_states')
          ? participants[ref.path.split('/')[1]] || {} : store).map(([id, value]) => {
          const data = structuredClone(value);
          return { id, data: () => data };
        }) });
        };
        listeners.add(notify);
        queueMicrotask(notify);
        return () => listeners.delete(notify);
      };
      window.publishFixture = () => {
        localStorage.setItem('task-lifecycle-fixture', JSON.stringify(store));
        localStorage.setItem('task-lifecycle-participants', JSON.stringify(participants));
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
        const result = await callback({
          get: async ref => {
            const value = ref.path.endsWith('/participant_states')
              ? participants[ref.path.split('/')[1]]?.[ref.id] : store[ref.id];
            return { exists: () => value !== undefined, data: () => structuredClone(value) };
          },
          update: (ref, updates) => writes.push({ ref, updates }),
          set: (ref, updates) => writes.push({ ref, updates })
        });
        if (window.fixtureHoldWrites) await new Promise((resolve, reject) => {
          window.fixtureRelease = resolve;
          window.fixtureReject = () => reject(new Error('Synthetic denied write'));
        });
        if (window.fixtureWriteError) throw new Error('Synthetic denied write');
        window.fixtureTransactions.push(writes);
        for (const { ref, updates } of writes) {
          window.fixtureWrites.push({ ref, updates });
          if (ref.path === 'tasks') patch(store[ref.id] ??= {}, updates);
          if (ref.path.endsWith('/participant_states')) {
            (participants[ref.path.split('/')[1]] ??= {})[ref.id] = structuredClone(updates);
          }
          if (ref.path === 'task_completion_events') window.fixtureEvents[ref.id] = structuredClone(updates);
        }
        localStorage.setItem('task-lifecycle-events', JSON.stringify(window.fixtureEvents));
        window.publishFixture();
        return result;
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
    const consoleErrors = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
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
    assert.ok(await page.evaluate(() => window.fixtureWrites.some(write =>
      write.ref.path === 'task_completion_events' && write.updates.action === 'completed')),
    'the successful completion transaction writes its audit event before reload');
    await page.reload();
    await page.waitForFunction(() => window.fixtureApi?.loading === false);
    const completed = (await state()).find(t => t.id === 'catalog');
    const completionEvent = await page.evaluate(() => Object.values(window.fixtureEvents).find(event =>
      event.taskId === 'catalog' && event.action === 'completed'));
    assert.equal(completionEvent.actorEmail, 'owner@example.test');
    assert.equal(completionEvent.source, 'manual');
    assert.deepEqual(completionEvent.scope, { sede: 'Lima', cycleId: 'cycle-1' });
    assert.ok(completionEvent.closureContext && Array.isArray(completionEvent.closureContext.evidences),
      'the completion event carries the closure snapshot written by the real writeTaskDoc');
    assert.ok(Number.isFinite(Date.parse(completionEvent.occurredAt)),
      'the committed transition event survives the reload alongside the task');
    assert.equal(completed.completed, true);
    assert.equal(completed.progressPercentage, 100);
    assert.ok(completed.completedAt);
    assert.equal(await page.evaluate(() => window.fixtureStore.catalog.completed), false);
    assert.equal(await page.evaluate(() => window.fixtureStore.catalog.status), 'En progreso');
    assert.equal(await page.evaluate(() => window.fixtureStore.catalog.completedAt), null,
      'cycle completion does not set global closure fields');
    assert.equal(await page.evaluate(() => window.fixtureStore.catalog.progressPercentage), 25);
    assert.equal(await page.evaluate(() =>
      window.fixtureStore.catalog.completions['Lima__cycle-1'].completed
    ), true);
    assert.equal(completed.completions.Lima__old.completedAt, 'original-close');
    assert.equal(completed.responsible, 'Fixture manager');
    assert.deepEqual(completed.history, [{ action: 'created', at: 'original-time' }]);
    assert.deepEqual(await call('updateTaskDetails', 'catalog', {
      completed: false,
      status: 'Pendiente',
      progressPercentage: 25,
      progress: 25,
      completedAt: null,
      comments: 'Saved evidence while closed'
    }), { ok: true });
    const preserved = (await state()).find(t => t.id === 'catalog');
    assert.equal(preserved.completed, true, 'ordinary saves cannot reopen a closed cycle');
    assert.equal(preserved.progressPercentage, 100);
    assert.equal(preserved.completedAt, completed.completedAt);
    assert.equal(preserved.comments, 'Saved evidence while closed');
    assert.equal(await page.evaluate(() => window.fixtureStore.catalog.completed), false);
    assert.deepEqual(await call('updateTaskDetails', 'catalog', {
      status: 'Pendiente de validación',
      completedAt: null,
      comments: 'Saved an auxiliary status while closed'
    }), { ok: true });
    const preservedAuxiliaryStatus = (await state()).find(t => t.id === 'catalog');
    assert.equal(preservedAuxiliaryStatus.completed, true);
    assert.equal(preservedAuxiliaryStatus.status, 'Completada');
    assert.equal(preservedAuxiliaryStatus.completedAt, preserved.completedAt);
    assert.equal(await page.evaluate(() =>
      window.fixtureStore.catalog.completions['Lima__cycle-1'].status
    ), 'Completada');

    await start('catalog', true);
    await page.waitForFunction(() => window.fixtureApi.tasks.find(t => t.id === 'catalog')?.completed === false);
    await reject();
    assert.deepEqual((await state()).find(t => t.id === 'catalog'), preservedAuxiliaryStatus, 'failed reopen preserves closure time and history');
    assert.deepEqual(await call('updateTaskDetails', 'catalog', {
      completed: false, status: 'Pendiente', progressPercentage: 75, progress: 75, completedAt: null
    }, null, true), { ok: true });
    const reopened = (await state()).find(t => t.id === 'catalog');
    assert.equal(reopened.completed, false);
    assert.equal(reopened.completedAt, null);
    assert.equal(await page.evaluate(() => window.fixtureStore.catalog.completed), false,
      'reopening a cycle does not rewrite root/global completion');
    assert.equal(await page.evaluate(() => window.fixtureStore.catalog.completedAt), null);
    assert.ok(await page.evaluate(() => window.fixtureWrites.some(write =>
      write.ref.path === 'task_completion_events' && write.updates.action === 'reopened')));

    assert.deepEqual(await call('updateTaskDetails', 'closed-multi', {
      completed: false,
      status: 'Pendiente',
      completedAt: null,
      progressPercentage: 45,
      assigneeProgress: {
        'owner@example.test': { completed: false, completedAt: null, progress: 25 },
        'other@example.test': { completed: false, progress: 45 }
      },
      comments: 'Stale multi-assignee form save'
    }), { ok: true });
    const closedMulti = await page.evaluate(() => window.fixtureStore['closed-multi']);
    assert.equal(closedMulti.completed, true);
    assert.equal(closedMulti.status, 'Completada');
    assert.equal(closedMulti.completedAt, 'root-close');
    assert.deepEqual(closedMulti.assigneeProgress['owner@example.test'], {
      completed: true, completedAt: 'owner-close', progress: 100
    });
    assert.deepEqual(closedMulti.assigneeProgress['other@example.test'], {
      completed: false, progress: 10
    }, 'ordinary saves of a globally closed task preserve the entire assignee map');
    assert.deepEqual(await call('updateTaskDetails', 'multi-assignee-open', {
      assigneeProgress: {
        'owner@example.test': { completed: false, completedAt: null, progress: 25 },
        'other@example.test': { completed: false, progress: 45 }
      }
    }), { ok: true });
    const openMulti = await page.evaluate(() => window.fixtureTask('multi-assignee-open'));
    assert.equal(openMulti.assigneeProgress['owner@example.test'].completed, true);
    assert.equal(openMulti.assigneeProgress['owner@example.test'].completedAt, 'owner-close');
    assert.equal(openMulti.assigneeProgress['other@example.test'].progress, 45,
      'an open assignee can advance while another assignee remains closed');
    await page.evaluate(() => { window.fixtureWrites = []; });
    assert.deepEqual(await call('editCustomTask', 'closed-multi', {
      task: 'Updated closed task',
      assignedToEmails: ['owner@example.test', 'other@example.test'],
      assigneeProgress: {
        'owner@example.test': { completed: false, progress: 0 },
        'other@example.test': { completed: false, progress: 0 }
      }
    }), { ok: true });
    const editedClosedMulti = await page.evaluate(() => window.fixtureStore['closed-multi']);
    assert.equal(editedClosedMulti.completed, true);
    assert.equal(editedClosedMulti.completedAt, 'root-close');
    assert.equal(editedClosedMulti.assigneeProgress['owner@example.test'].completed, true);
    assert.equal(editedClosedMulti.assigneeProgress['other@example.test'].progress, 10);
    assert.equal(await page.evaluate(() => window.fixtureWrites.some(write =>
      write.ref.path === 'mail' || write.ref.path === 'notifications'
    )), false, 'assignment edits of a closed task do not create email or in-app notifications');

    await page.evaluate(() => {
      window.fixtureStore['individual-roundtrip'] = {
        id: 'individual-roundtrip', isCustom: true, createdBy: 'owner@example.test',
        assignedToEmails: ['owner@example.test', 'other@example.test'],
        completed: false, progress: 50, progressPercentage: 50,
        comments: 'Closure note', evidence_url: 'https://example.test/evidence',
        evidences: [{ id: 'evidence-1', url: 'https://example.test/evidence' }],
        assigneeProgress: {
          'owner@example.test': { completed: false, progress: 0 },
          'other@example.test': { completed: true, progress: 100, completedAt: 'other-close' }
        },
        closedAssigneeKeys: ['other@example.test']
      };
      window.publishFixture();
    });
    const individualResult = await page.evaluate(() =>
      window.fixtureApi.updateIndividualProgress('individual-roundtrip', 'owner@example.test', true));
    assert.equal(individualResult, true, consoleErrors.join('\n'));
    const individualClosure = await page.evaluate(() => ({
      task: window.fixtureTask('individual-roundtrip'),
      events: Object.entries(window.fixtureEvents).filter(([, event]) =>
        event.taskId === 'individual-roundtrip' && event.action === 'completed')
    }));
    assert.equal(individualClosure.task.completed, true);
    assert.equal(individualClosure.events.length, 2, 'root and participant each have their own completion event');
    for (const [, event] of individualClosure.events) {
      assert.deepEqual(event.closureContext, {
        comments: 'Closure note', evidenceUrl: 'https://example.test/evidence',
        evidences: [{ id: 'evidence-1', url: 'https://example.test/evidence' }]
      });
    }
    const rootClosure = individualClosure.events.find(([, event]) => Object.keys(event.scope).length === 0);
    const participantClosure = individualClosure.events.find(([, event]) => event.scope.assigneeEmail === 'owner@example.test');
    assert.equal(individualClosure.task.lifecycleMutation.eventId, rootClosure[0]);
    assert.equal(individualClosure.task.lifecycleMutation.assigneeEventIds['owner@example.test'], participantClosure[0]);

    assert.equal(await page.evaluate(() =>
      window.fixtureApi.updateIndividualProgress('individual-roundtrip', 'owner@example.test', false)), true);
    const individualReopen = await page.evaluate(() => ({
      task: window.fixtureTask('individual-roundtrip'),
      events: Object.entries(window.fixtureEvents).filter(([, event]) =>
        event.taskId === 'individual-roundtrip' && event.action === 'reopened')
    }));
    assert.equal(individualReopen.task.completed, false);
    assert.deepEqual(individualReopen.task.closedAssigneeKeys, ['other@example.test']);
    assert.equal(individualReopen.task.assigneeProgress['other@example.test'].completedAt, 'other-close');
    assert.equal(individualReopen.events.length, 2);
    assert.deepEqual(individualReopen.task.lifecycleMutation.scope, {});
    assert.deepEqual(individualReopen.task.lifecycleMutation.mapScope, { assigneeEmail: 'owner@example.test' });
    for (const [, event] of individualReopen.events) assert.equal('closureContext' in event, false);
    assert.deepEqual(await call('updateTaskDetails', 'individual-roundtrip', {
      comments: 'Edited later', evidence_url: '', evidences: []
    }), { ok: true });
    await page.reload();
    await page.waitForFunction(() => window.fixtureApi?.loading === false);
    for (const [id, event] of individualClosure.events) {
      assert.deepEqual(await page.evaluate(id => window.fixtureEvents[id], id), event,
        'original closure evidence and comments survive editing, reopening and reload');
    }

    await page.evaluate(() => {
      const keys = Array.from({ length: 40 }, (_, index) => 'participant-' + index + '@example.test');
      window.fixtureStore['bulk-open'] = {
        id: 'bulk-open', isCustom: true, createdBy: 'owner@example.test', completed: false,
        assignedToEmails: keys, assigneeProgress: Object.fromEntries(keys.map(key => [key, { progress: 0 }]))
      };
      window.publishFixture();
    });
    const transactionsBeforeBulk = await page.evaluate(() => window.fixtureTransactions.length);
    const bulkChanges = await page.evaluate(() => Object.fromEntries(
      window.fixtureStore['bulk-open'].assignedToEmails.map(key => [key, { progress: 35 }])));
    assert.deepEqual(await call('updateTaskDetails', 'bulk-open', {
      assigneeProgress: bulkChanges, progressPercentage: 35
    }), { ok: true });
    assert.equal(await page.evaluate(() => window.fixtureTransactions.length), transactionsBeforeBulk + 1,
      'all forty advances and migration commit in one transaction, never partial chunks');
    assert.equal(await page.evaluate(() => Object.keys(window.fixtureParticipants['bulk-open']).length), 40);
    assert.equal(await page.evaluate(() => Object.values(window.fixtureTask('bulk-open').assigneeProgress)
      .every(state => state.progress === 35)), true);
    assert.equal(await page.evaluate(() => Object.values(window.fixtureStore['bulk-open'].assigneeProgress)
      .every(state => state.progress === 0)), true, 'the legacy baseline remains read-only');
    await page.reload();
    await page.waitForFunction(() => window.fixtureApi?.loading === false);
    assert.equal((await state()).find(task => task.id === 'bulk-open').assigneeProgress['participant-39@example.test'].progress, 35);
    await page.evaluate(() => {
      window.fixtureParticipantError = 'bulk-open';
      window.publishFixture();
    });
    await page.waitForFunction(() => !window.fixtureApi.tasks.some(task => task.id === 'bulk-open'));
    assert.match(await page.evaluate(() => window.fixtureApi.taskLoadError), /No se pudo verificar/);
    await page.evaluate(() => {
      window.fixtureParticipantError = null;
      window.publishFixture();
    });
    await page.waitForFunction(() => window.fixtureApi.tasks.some(task => task.id === 'bulk-open'));

    await page.evaluate(() => {
      window.fixtureStore['closed-without-date'] = {
        id: 'closed-without-date', isCustom: true, createdBy: 'owner@example.test',
        assignedToEmails: ['owner@example.test'], progress: 100,
        assigneeProgress: { 'owner@example.test': {
          completed: true, progress: 100, progressPercentage: 100, status: 'Completada'
        } }
      };
      window.publishFixture();
    });
    assert.equal(await page.evaluate(() => window.fixtureApi.updateIndividualProgress(
      'closed-without-date', 'owner@example.test', true)), true);
    const undated = await page.evaluate(() => window.fixtureTask('closed-without-date'));
    assert.equal('completedAt' in undated, false, 'reasserting a closed root never invents a historical date');
    assert.equal('completedAt' in undated.assigneeProgress['owner@example.test'], false);
    assert.equal(await page.evaluate(() => Object.values(window.fixtureEvents)
      .some(event => event.taskId === 'closed-without-date')), false, 'no synthetic historical closure event');
    assert.equal(await page.evaluate(() => window.fixtureApi.updateIndividualProgress(
      'closed-without-date', 'owner@example.test', false)), true);
    const reopenedLegacy = await page.evaluate(() => window.fixtureTask('closed-without-date'));
    assert.equal(reopenedLegacy.assigneeProgress['owner@example.test'].progressPercentage, 0);
    assert.equal(reopenedLegacy.assigneeProgress['owner@example.test'].status, 'Pendiente');
    assert.equal(await page.evaluate(() => Object.values(window.fixtureEvents)
      .filter(event => event.taskId === 'closed-without-date' && event.action === 'reopened').length), 2);

    await page.evaluate(() => { window.fixtureWriteError = true; });
    assert.equal((await call('updateTaskDetails', 'catalog', { progressPercentage: 50 })).ok, false);
    assert.deepEqual((await state()).find(t => t.id === 'catalog'), reopened);
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
    assert.equal(await page.evaluate(() =>
      window.fixtureStore.catalog.completions['Lima__cycle-1'].completed
    ), false, 'reopening only changes the explicitly targeted cycle');

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
      assert.equal(saved.status, 'Completada');
      assert.equal(Object.keys(saved.completions || {}).some(key => key.includes('__')), false);
    }
    assert.equal(await page.evaluate(() => window.fixtureStore.personal.assignedByEmail), 'assigner@example.test');
    assert.equal(await page.evaluate(() => window.fixtureWrites.some(write => write.ref.path === 'mail')), false);
    const rootEvent = await page.evaluate(() => Object.values(window.fixtureEvents).find(event =>
      event.taskId === 'personal' && event.action === 'completed'));
    assert.deepEqual(rootEvent.scope, {});
    assert.equal(rootEvent.closureContext.comments, 'Other confirmed comment');
    assert.deepEqual(await call('toggleTask', 'personal', true), { ok: true });
    assert.equal(await page.evaluate(() => window.fixtureStore.personal.completed), false);
    const rootReopen = await page.evaluate(() => Object.values(window.fixtureEvents).find(event =>
      event.taskId === 'personal' && event.action === 'reopened'));
    assert.deepEqual(rootReopen.scope, {});
    assert.equal('closureContext' in rootReopen, false);

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
    await load('?otherUser');
    const otherUserTasks = await state();
    assert.equal(otherUserTasks.some(task => task.id === 'personal'), false,
      "switching session identity does not expose another user's personal task");
    assert.equal(otherUserTasks.some(task => task.id === 'closed-multi'), true,
      'the separately assigned collaborator retains access to their shared task');
    await page.reload();
    await page.waitForFunction(() => window.fixtureApi?.loading === false);
    assert.equal((await state()).some(task => task.id === 'personal'), false,
      'reload keeps the other identity isolated');
    await load();
    assert.equal((await state()).some(task => task.id === 'personal'), true,
      'the original owner retains their task after switching back');
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
