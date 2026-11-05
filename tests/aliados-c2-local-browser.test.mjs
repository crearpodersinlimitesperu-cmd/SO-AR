import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, inMemoryPersistence, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, serverTimestamp, terminate } from 'firebase/firestore';
import { fixtureRuntime, seedFixtures, fixturePassword } from '../prototypes/aliados-c2/private/fixtures.mjs';
import { demoProject, assertEmulatorEnvironment } from '../prototypes/aliados-c2/private/local/environment.js';

test('local private frontend: real emulator Auth, UID isolation, revocation and stale callback cleanup', {
  skip: (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST)
    && 'Both local demo emulators required; no production fallback.',
  timeout: 120000,
}, async t => {
  assertEmulatorEnvironment(process.env);
  const runtime = fixtureRuntime();
  const server = await createServer({
    configFile: 'prototypes/aliados-c2/private/local/vite.config.js',
    server: { host: '127.0.0.1', port: 4313, strictPort: true, hmr: false },
  });
  let browser;
  let client;
  let clientDb;
  try {
    await seedFixtures(runtime);
    client = initializeApp({ projectId: demoProject, apiKey: 'demo-only-no-real-key' }, 'c2-browser-rule-client');
    const clientAuth = initializeAuth(client, { persistence: inMemoryPersistence });
    connectAuthEmulator(clientAuth, 'http://127.0.0.1:9198', { disableWarnings: true });
    clientDb = initializeFirestore(client, {});
    connectFirestoreEmulator(clientDb, '127.0.0.1', 8198);
    await server.listen();
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    const external = [];
    const firestoreRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      const url = request.url();
      if (url.startsWith('http') && !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) external.push(url);
      if (url.includes(':8198/')) firestoreRequests.push(url);
    });
    const url = 'http://127.0.0.1:4313/';
    const status = async expected => page.waitForSelector(`[data-status="${expected}"]`, { timeout: 15000 });
    const noPrivate = async () => {
      assert.equal(await page.$('[data-private]'), null);
      assert.doesNotMatch(await page.$eval('body', node => node.textContent), /Acuerdo sintético|Texto de prueba|Respuesta ficticia/);
    };
    const login = async (email, expected = 'ready') => {
      await page.waitForSelector('#email:not(:disabled)');
      await page.$eval('#email', (node, value) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(node, value);
        node.dispatchEvent(new Event('input', { bubbles: true }));
      }, email);
      await page.type('#password', fixturePassword);
      await page.click('button[type="submit"]');
      await status(expected);
    };
    const logout = async () => {
      await page.click('.session-bar button');
      await status('signed-out');
      await noPrivate();
    };
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(url);
    await status('signed-out');

    await t.test('anonymous and unverified do not even request Firestore; unapproved/mismatch never receive private data', async () => {
      await noPrivate();
      assert.equal(firestoreRequests.length, 0);
      await login('unverified@example.test', 'unverified');
      assert.equal(firestoreRequests.length, 0);
      await noPrivate();
      await logout();
      for (const email of ['unapproved@example.test', 'mismatch@example.test']) {
        await login(email, 'denied');
        await noPrivate();
        await logout();
      }
    });

    await t.test('X has server guide, atomic checked state/history, reload persistence, phases, references and reset', async () => {
      await login('x@example.test');
      assert.equal(await page.$eval('[data-uid]', node => node.textContent), 'fixture-x');
      await page.click('[data-item="tecnica"]');
      await page.waitForFunction(() => document.querySelector('[data-revision]')?.textContent === '1'
        && document.querySelector('[data-status]')?.textContent.includes('Guardado confirmado'));
      assert.equal(await page.$eval('[data-item="tecnica"]', node => node.checked), true);
      const record = (await runtime.db.doc('records/fixture-x').get()).data();
      const event = (await runtime.db.doc(`records/fixture-x/events/${record.lastEventId}`).get()).data();
      assert.deepEqual(record.completed, ['tecnica']);
      assert.deepEqual(event.completed, record.completed);
      assert.equal(event.revision, record.revision);
      assert.equal(event.previousRevision, 0);
      assert.equal(event.createdAt.toMillis(), record.updatedAt.toMillis());
      await page.reload();
      await status('signed-out');
      await noPrivate();
      await login('x@example.test');
      assert.equal(await page.$eval('[data-item="tecnica"]', node => node.checked), true);
      await page.click('nav[aria-label="Fases"] button:nth-child(2)');
      await page.waitForFunction(() => document.querySelectorAll('.phase').length === 1);
      await page.click('nav[aria-label="Consulta"] button:first-child');
      await page.waitForFunction(() => document.body.textContent.includes('Respuesta ficticia 1'));
      await page.screenshot({ path: 'tests/artifacts.local/c2-private-desktop.png', fullPage: true });
      await page.setViewport({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await page.screenshot({ path: 'tests/artifacts.local/c2-private-mobile.png', fullPage: true });
      await page.click('aside > button');
      await page.click('.reset-confirmation button:first-of-type');
      await page.waitForFunction(() => document.querySelector('[data-revision]')?.textContent === '4');
      assert.equal(await page.$eval('[data-item="tecnica"]', node => node.checked), false);
      assert.equal((await runtime.db.collection('records/fixture-x/events').get()).size, 4);
      await page.setViewport({ width: 1440, height: 1000 });
    });

    await t.test('account-switch cleans X view and callbacks; Y cannot read X; stale X updates never enter Y', async () => {
      await page.click('.account-switch summary');
      await login('y@example.test');
      assert.equal(await page.$eval('[data-uid]', node => node.textContent), 'fixture-y');
      assert.equal(await page.$eval('[data-revision]', node => node.textContent), '0');
      assert.equal(await page.$$eval('.history li', nodes => nodes.length), 0);
      assert.equal(await page.$eval('nav[aria-label="Fases"] button:first-child', node => node.getAttribute('aria-pressed')), 'true');
      assert.doesNotMatch(await page.$eval('[data-private]', node => node.textContent), /Respuesta ficticia 1/);
      await signInWithEmailAndPassword(clientAuth, 'y@example.test', fixturePassword);
      await assert.rejects(getDoc(doc(clientDb, 'records', 'fixture-x')), error => error.code === 'permission-denied');
      await assert.rejects(getDoc(doc(clientDb, 'records', 'fixture-x', 'events',
        (await runtime.db.doc('records/fixture-x').get()).data().lastEventId)), error => error.code === 'permission-denied');
      await runtime.db.doc('records/fixture-x').update({ completed: ['feedback'], revision: -1 });
      await new Promise(resolve => setTimeout(resolve, 400));
      assert.equal(await page.$eval('[data-revision]', node => node.textContent), '0');
      await page.click('[data-item="espacio"]');
      await page.waitForFunction(() => document.querySelector('[data-revision]')?.textContent === '1');
      assert.deepEqual((await runtime.db.doc('records/fixture-y').get()).data().completed, ['espacio']);
    });

    await t.test('exact verified synthetic admin revokes Y; private DOM removed and future reads/writes fail', async () => {
      await signInWithEmailAndPassword(clientAuth, 'sistemas@crearpsl.net', fixturePassword);
      await setDoc(doc(clientDb, 'members', 'fixture-y'), {
        email: 'y@example.test', enabled: false, updatedAt: serverTimestamp(),
      });
      await status('denied');
      await noPrivate();
      await runtime.db.doc('content/c2-v1').update({ title: 'Synthetic update after revocation' });
      await new Promise(resolve => setTimeout(resolve, 400));
      await noPrivate();
      await signInWithEmailAndPassword(clientAuth, 'y@example.test', fixturePassword);
      await assert.rejects(getDoc(doc(clientDb, 'content', 'c2-v1')), error => error.code === 'permission-denied');
      await assert.rejects(setDoc(doc(clientDb, 'records', 'fixture-y'), { uid: 'fixture-y' }), error => error.code === 'permission-denied');
      await logout();
    });

    await t.test('invalid server content and injected network write failure are explicit errors, never synthetic success', async () => {
      await login('x@example.test', 'error'); // Fixture corruption from the stale callback test.
      await noPrivate();
      assert.match(await page.$eval('[data-status]', node => node.textContent), /formato válido/);
      await logout();
      await runtime.db.doc('records/fixture-x').delete();
      await runtime.db.recursiveDelete(runtime.db.collection('records/fixture-x/events'));
      await runtime.db.doc('content/c2-v1').set({ version: 'broken' });
      await login('x@example.test', 'error');
      await noPrivate();
      assert.match(await page.$eval('[data-status]', node => node.textContent), /formato inválido/);
      await logout();
      await seedFixtures(runtime);
      await login('x@example.test');
      // Explicit network fault injection: abort commits, including bounded SDK retries.
      await page.setRequestInterception(true);
      let rejectedCommits = 0;
      const rejectCommit = request => {
        if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith(':commit')) {
          rejectedCommits++;
          request.abort('failed');
        } else request.continue();
      };
      page.on('request', rejectCommit);
      await page.click('[data-item="tecnica"]');
      await status('error');
      await noPrivate();
      assert.ok(rejectedCommits > 0 && rejectedCommits <= 5);
      assert.match(await page.$eval('[data-status]', node => node.textContent), /No se confirmó el guardado/);
      assert.equal((await runtime.db.collection('records/fixture-x/events').get()).size, 0);
      assert.equal((await runtime.db.doc('records/fixture-x').get()).exists, false);
      page.off('request', rejectCommit);
      await page.setRequestInterception(false);
      await logout();
      await page.type('#email', 'x@example.test');
      await page.type('#password', 'wrong-password');
      await page.click('button[type="submit"]');
      await status('error');
      assert.match(await page.$eval('[data-status]', node => node.textContent), /auth\//);
    });

    await t.test('logout/account-switch ignores completion of an already dispatched X transaction', async () => {
      await login('x@example.test');
      await page.setRequestInterception(true);
      let release;
      const captured = new Promise(resolve => { release = resolve; });
      const holdCommit = request => {
        if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith(':commit')) {
          release(request);
        } else request.continue();
      };
      page.on('request', holdCommit);
      await page.click('[data-item="tecnica"]');
      const request = await captured;
      await logout();
      await login('y@example.test', 'checking');
      await noPrivate();
      page.off('request', holdCommit);
      await request.continue();
      await page.setRequestInterception(false);
      await status('ready');
      for (let attempt = 0; attempt < 30; attempt++) {
        if ((await runtime.db.doc('records/fixture-x').get()).exists) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.equal((await runtime.db.doc('records/fixture-x').get()).exists, true);
      assert.equal(await page.$eval('[data-uid]', node => node.textContent), 'fixture-y');
      assert.equal(await page.$eval('[data-revision]', node => node.textContent), '0');
      assert.equal(await page.$eval('[data-item="tecnica"]', node => node.checked), false);
      assert.doesNotMatch(await page.$eval('[data-status]', node => node.textContent), /Guardado confirmado/);
      await logout();
    });

    await t.test('loss of verified Auth email cleans the private view on token refresh', async () => {
      await login('x@example.test');
      await runtime.auth.updateUser('fixture-x', { emailVerified: false });
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await status('unverified');
      await noPrivate();
      await logout();
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log('Evidence: desktop/mobile screenshots in tests/artifacts.local; zero external browser requests/page errors.');
  } finally {
    await browser?.close();
    await server.close();
    if (clientDb) await terminate(clientDb);
    if (client) await deleteApp(client);
    await runtime.close();
  }
});

mkdirSync('tests/artifacts.local', { recursive: true });
