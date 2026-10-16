import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import puppeteer from 'puppeteer';

test('actual task context persists location, updates reminders and reads links; review shows missing evidence', async () => {
  const mocks = {
    '../context/AuthContext': `
      const currentUser = { uid: 'fixture-owner', email: 'owner@example.test', name: 'Fixture Owner', appRole: 'direccion', sede: 'Lima' };
      export const useAuth = () => ({ currentUser });
    `,
    '../context/UIContext': `
      const ui = { viewMode: 'compact', showToast: (message, type) => { window.fixtureToast = { message, type }; }, showPrompt: async () => null };
      export const useUI = () => ui;
    `,
    '../context/CyclesContext': `
      const cycle = { currentCycle: null, quitoCycles: [], events: [], loadingEvents: false };
      export const useCycles = () => cycle;
    `,
    '../services/firebase': `export const db = {}; export const auth = { currentUser: { email: 'owner@example.test' } };`,
    '../services/userService': `export const getAllCompanyUsers = async () => [
      { email: 'recipient@example.test', name: 'Fixture Recipient', role: 'coord_c1', sede: 'Lima' }
    ];`,
    '../services/auditService': 'export const recordAuditEvent = async () => null;',
    '../services/googleDriveService': 'export const uploadEvidenceDocument = async () => { throw new Error("No external uploads"); };',
    'firebase/firestore': `
      const store = new Map();
      const listeners = new Set();
      let nextId = 0;
      window.fixtureStore = store;
      export const collection = (_db, path) => ({ path });
      export const doc = (_db, path, id) => {
        if (_db?.path) return { path: _db.path, id: path || 'fixture_' + ++nextId };
        return { path, id: id || 'fixture_' + ++nextId };
      };
      export const query = ref => ref;
      export const where = () => ({});
      export const orderBy = () => ({});
      export const limit = () => ({});
      const snapshot = ref => {
        const docs = [...store].filter(([key]) => key.startsWith(ref.path + '/'))
          .map(([key, data]) => ({ id: key.split('/').at(-1), data: () => data }));
        return { docs, empty: !docs.length, forEach: fn => docs.forEach(fn) };
      };
      export const onSnapshot = (ref, callback) => {
        const listener = () => callback(snapshot(ref));
        listeners.add(listener); queueMicrotask(listener);
        return () => listeners.delete(listener);
      };
      export const getDoc = async ref => ({
        id: ref.id, exists: () => store.has(ref.path + '/' + ref.id),
        data: () => store.get(ref.path + '/' + ref.id)
      });
      export const getDocs = async ref => snapshot(ref);
      export const writeBatch = () => {
        const writes = [];
        return {
          set: (ref, data) => writes.push([ref, data]),
          update: (ref, data) => writes.push([ref, data]),
          commit: async () => {
            if (window.fixtureRejectWrite) throw new Error('Synthetic denied write');
            for (const [ref, data] of writes) {
              const key = ref.path + '/' + ref.id;
              store.set(key, { ...store.get(key), ...data });
            }
            listeners.forEach(listener => listener());
          }
        };
      };
      export const setDoc = async () => { throw new Error('Unexpected direct write'); };
      export const updateDoc = setDoc;
      export const addDoc = setDoc;
      export const runTransaction = setDoc;
    `
  };
  const server = await createServer({
    configFile: false, server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [react(), {
      name: 'operational-fixture', enforce: 'pre',
      resolveId(id) {
        if (['./AuthContext', './UIContext', './CyclesContext'].includes(id)) {
          return `\0operational:../context/${id.slice(2)}`;
        }
        if (Object.hasOwn(mocks, id)) return `\0operational:${id}`;
        if (id === '/operational-fixture.jsx') return `${process.cwd()}/operational-fixture.jsx`;
      },
      load(id) {
        if (id.startsWith('\0operational:')) return mocks[id.slice('\0operational:'.length)];
        if (id === `${process.cwd()}/operational-fixture.jsx`) return `
          import React, { useState } from 'react';
          import { createRoot } from 'react-dom/client';
          import { ChecklistProvider, useChecklist } from '/src/context/ChecklistContext.jsx';
          import TaskAssignmentModal from '/src/components/TaskAssignmentModal.jsx';
          import TaskDetailModal from '/src/components/TaskDetailModal.jsx';
          import { OperationalReviewView } from '/src/components/OperationalReview.jsx';
          import { resolveTaskLink } from '/src/services/taskNavigation.js';
          const recipient = { email: 'recipient@example.test', role: 'coord_c1', name: 'Fixture Recipient', sede: 'Lima' };
          function Fixture() {
            const api = useChecklist();
            window.fixtureApi = api;
            const [open, setOpen] = useState(true);
            const [editing, setEditing] = useState(null);
            const [detail, setDetail] = useState(null);
            const task = api.tasks.find(task => task.isCustom);
            window.fixtureResolveLink = async user => resolveTaskLink(task.id, [], user, async id => window.fixtureStore.get('tasks/' + id));
            return <>
              <button id="edit" onClick={() => { setEditing(task); setOpen(true); }}>Edit</button>
              <button id="detail" onClick={() => setDetail(task)}>Detail</button>
              <TaskAssignmentModal isOpen={open} onClose={() => setOpen(false)} taskToEdit={editing}
                prefilledUser={recipient} simple teamMembers={[recipient]} />
              <TaskDetailModal isOpen={Boolean(detail)} task={detail} onClose={() => setDetail(null)} />
              <OperationalReviewView events={[{ sede: 'Lima', equipo: 1, nombre: 'C1', fecha_inicio: '2026-01-01' }]}
                snapshot={null} now={Date.parse('2026-10-17T00:00:00Z')} onReload={() => {}} />
            </>;
          }
          createRoot(document.getElementById('root')).render(<ChecklistProvider><Fixture /></ChecklistProvider>);
        `;
      },
      configureServer(vite) {
        vite.middlewares.use('/operational-test', (_req, res) => {
          res.setHeader('Content-Type', 'text/html');
          res.end('<div id="root"></div><script type="module" src="/operational-fixture.jsx"></script>');
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
    await page.goto(`${server.resolvedUrls.local[0]}operational-test`);
    await page.waitForSelector('.elizabeth-create-form', { timeout: 15000 }).catch(async error => {
      throw new Error(`${error.message}; page errors: ${errors.join('; ')}; body: ${await page.evaluate(() => document.body.innerText)}`);
    });
    await page.type('.elizabeth-create-form input:not([type])', 'Synthetic task');
    const locationInput = '.elizabeth-create-form input[placeholder*="Sede, sala"]';
    await page.type(locationInput, 'Sala A <img src=x onerror=alert(1)>');
    await page.click('.elizabeth-create-form button[type=submit]');
    await page.waitForFunction(() => window.fixtureApi.tasks.some(task => task.isCustom));
    await page.waitForSelector('.elizabeth-create-form', { hidden: true });
    let result = await page.evaluate(() => {
      const task = window.fixtureApi.tasks.find(task => task.isCustom);
      return { task, records: [...window.fixtureStore] };
    });
    assert.equal(result.task.location, 'Sala A <img src=x onerror=alert(1)>');
    let mail = result.records.find(([key]) => key.startsWith('mail/'))[1];
    assert.equal(mail.calendarEvent.location, result.task.location);
    assert.match(mail.message.html, /Sala A &lt;img/);
    assert.ok(mail.message.html.includes(`?taskId=${result.task.id}`));
    const firstNotifications = result.records.filter(([key]) => key.startsWith('notifications/'));
    assert.ok(firstNotifications[0][1].message.includes(result.task.location));

    await page.click('#edit');
    await page.waitForSelector(locationInput);
    await page.waitForFunction((selector, value) => document.querySelector(selector)?.value === value, {}, locationInput, result.task.location);
    assert.equal(await page.$eval(locationInput, input => input.value), result.task.location);
    await page.$eval(locationInput, input => { input.focus(); input.select(); });
    await page.keyboard.type('Sala B, dirección corregida');
    await page.click('.elizabeth-create-form button[type=submit]');
    await page.waitForFunction(() => window.fixtureApi.tasks.find(task => task.isCustom)?.location === 'Sala B, dirección corregida');
    await page.waitForSelector('.elizabeth-create-form', { hidden: true });
    result = await page.evaluate(() => ({ task: window.fixtureApi.tasks.find(task => task.isCustom), records: [...window.fixtureStore] }));
    assert.equal(result.records.filter(([key]) => key.startsWith('notifications/')).length, firstNotifications.length + 1);
    mail = result.records.filter(([key]) => key.startsWith('mail/')).at(-1)[1];
    assert.equal(mail.calendarEvent.location, 'Sala B, dirección corregida');

    const navigation = await page.evaluate(async () => {
      const allowed = await window.fixtureResolveLink({ email: 'recipient@example.test' });
      try { await window.fixtureResolveLink({ email: 'unrelated@example.test', appRole: 'superadmin' }); }
      catch (error) { return { allowed: allowed.location, denied: error.message }; }
      return {};
    });
    assert.equal(navigation.allowed, 'Sala B, dirección corregida');
    assert.match(navigation.denied, /acceso/);

    await page.click('#detail');
    await page.waitForFunction(() => document.body.innerText.includes('Ubicación declarada:'));
    assert.match(await page.evaluate(() => document.body.innerText), /Ubicación declarada: Sala B, dirección corregida/);
    const reminder = await page.evaluate(async () => {
      const task = window.fixtureApi.tasks.find(task => task.isCustom);
      await window.fixtureApi.sendTaskMessage(task, ['recipient@example.test'], 'Revisa esta tarea');
      return [...window.fixtureStore].filter(([key]) => key.startsWith('notifications/')).at(-1)[1];
    });
    assert.match(reminder.message, /Sala B, dirección corregida/);
    assert.ok(reminder.message.includes(`/home?taskId=${result.task.id}`));

    const cleared = await page.evaluate(async () => {
      const task = window.fixtureApi.tasks.find(task => task.isCustom);
      const saved = await window.fixtureApi.editCustomTask(task.id, { location: '' });
      return { saved, task: window.fixtureStore.get('tasks/' + task.id),
        mail: [...window.fixtureStore].filter(([key]) => key.startsWith('mail/')).at(-1)[1],
        notification: [...window.fixtureStore].filter(([key]) => key.startsWith('notifications/')).at(-1)[1] };
    });
    assert.equal(cleared.saved, true);
    assert.equal(cleared.task.location, '');
    assert.equal(cleared.mail.calendarEvent.location, '');
    assert.match(cleared.mail.message.html, /Ubicación no declarada/);
    assert.doesNotMatch(cleared.mail.message.html, /Sala B/);
    assert.match(cleared.notification.message, /Ubicación no declarada/);

    const failed = await page.evaluate(async () => {
      window.fixtureRejectWrite = true;
      const task = window.fixtureApi.tasks.find(task => task.isCustom);
      const saved = await window.fixtureApi.editCustomTask(task.id, { location: 'Must not persist' });
      return { saved, location: window.fixtureStore.get('tasks/' + task.id).location, toast: window.fixtureToast };
    });
    assert.equal(failed.saved, false);
    assert.equal(failed.location, '');
    assert.equal(failed.toast.type, 'error');

    assert.equal(await page.$$eval('[data-review-sede]', nodes => nodes.length), 6);
    const review = await page.$eval('[aria-label="Revisión de seis equipos por sede"]', node => node.innerText);
    assert.match(review, /Lima: 1\/6 equipos fechados/);
    assert.match(review, /0\/6 con reporte C1 y C2 legible/);
    assert.match(review, /Sin dato/);
    assert.match(review, /no verificables/);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
