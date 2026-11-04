import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import puppeteer from 'puppeteer';

test('real AuthProvider clears private state on account, role and simulation changes in one browser', async () => {
  const mocks = {
    '../services/firebase': `
      export const db = {};
      export const auth = { currentUser: null, signOut: async () => window.emitAccount(null) };
      window.fixtureAuth = auth;
    `,
    '../services/roleAgentDaemon': `export const enforceUserRolesAgent = async (_user, roles) => roles;`,
    '../services/auditService': `export const recordAuditEvent = async () => {};`,
    './UIContext': `export const useUI = () => ({ showToast: (message, type) => { window.fixtureToast = {message, type}; } });`,
    'firebase/auth': `
      export const onAuthStateChanged = (auth, cb) => {
        window.emitAccount = async user => { auth.currentUser = user; window.fixtureProfile = user; await cb(user); };
        queueMicrotask(() => cb(auth.currentUser));
        return () => {};
      };
      export const signOut = async auth => auth.signOut();
      export const signInWithPopup = async () => { throw new Error('No external login in fixture'); };
      export const reauthenticateWithPopup = signInWithPopup;
      export class GoogleAuthProvider { addScope() {} static credentialFromResult() { return null; } }
    `,
    'firebase/firestore': `
      export const collection = (_db, path) => ({path});
      export const doc = (_db, path, id) => ({path, id});
      export const where = (...args) => ({args});
      export const or = (...constraints) => ({constraints});
      export const query = ref => ref;
      export const serverTimestamp = () => 'fixture-time';
      export const getDocs = async ref => {
        const user = window.fixtureProfile;
        const docs = user && ref.path === 'users' ? [{ id: user.uid, data: () => user }] : [];
        return { docs, empty: !docs.length, forEach: fn => docs.forEach(fn) };
      };
      export const getDoc = async ref => ({
        exists: () => Boolean(window.fixtureProfile && ref.id === window.fixtureProfile.uid),
        data: () => window.fixtureProfile
      });
      export const setDoc = async (_ref, patch) => {
        if (window.holdRoleWrite && patch.activeRoleOverride) {
          await new Promise(resolve => { window.releaseRoleWrite = resolve; });
        }
      };
      export const addDoc = async () => {};
    `
  };
  const fixtureId = `${process.cwd()}/privacy-session-fixture.jsx`;
  const server = await createServer({
    configFile: false, server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [react(), {
      name: 'privacy-session-fixture', enforce: 'pre',
      resolveId(id) {
        if (Object.hasOwn(mocks, id)) return `\0privacy-mock:${id}`;
        if (id === '/privacy-session-fixture.jsx') return fixtureId;
      },
      load(id) {
        if (id.startsWith('\0privacy-mock:')) return mocks[id.slice('\0privacy-mock:'.length)];
        if (id === fixtureId) return `
          import React, { useState } from 'react';
          import { createRoot } from 'react-dom/client';
          import { AuthProvider, useAuth } from '/src/context/AuthContext.jsx';
          function PrivateView() {
            const session = useAuth();
            const [privateDraft, setPrivateDraft] = useState('');
            window.fixtureSession = session;
            window.setPrivateDraft = setPrivateDraft;
            return <div id="private-view" data-email={session.currentUser?.email || ''}
              data-role={session.currentUser?.appRole || ''}>{privateDraft}</div>;
          }
          createRoot(document.getElementById('root')).render(<AuthProvider><PrivateView /></AuthProvider>);
        `;
      },
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (req.url !== '/privacy-session-test') return next();
          res.setHeader('Content-Type', 'text/html');
          res.end('<link rel="icon" href="data:,"><div id="root"></div><script type="module" src="/privacy-session-fixture.jsx"></script>');
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
    await page.goto(`${server.resolvedUrls.local[0]}privacy-session-test`);
    await page.waitForSelector('#private-view');
    const first = { uid: 'alpha', email: 'alpha@example.invalid', name: 'Synthetic Alpha',
      role: 'coord_c1', roles: ['coord_c1', 'qt'], sede: 'Lima', roleSedes: { qt: 'Quito' } };
    const second = { uid: 'beta', email: 'beta@example.invalid', name: 'Synthetic Beta',
      role: 'coord_c1', roles: ['coord_c1'], sede: 'Quito' };
    await page.evaluate(user => window.emitAccount(user), first);
    await page.waitForFunction(email => window.fixtureSession?.currentUser?.email === email, {}, first.email);
    await page.evaluate(() => {
      window.setPrivateDraft('ALPHA_PRIVATE');
      localStorage.setItem('cpsl_qt_members_cache_v4', 'ALPHA_DIRECTORY');
      sessionStorage.setItem('googleAccessToken', 'ALPHA_TOKEN');
    });
    await page.waitForFunction(() => document.querySelector('#private-view')?.textContent === 'ALPHA_PRIVATE');
    await page.evaluate(() => window.fixtureSession.switchRole('qt'));
    await page.waitForFunction(() => document.querySelector('#private-view')?.dataset.role === 'qt');
    assert.equal(await page.$eval('#private-view', el => el.textContent), '');
    await page.evaluate(() => {
      window.setPrivateDraft('QT_PRIVATE');
      sessionStorage.setItem('cpsl_simulated_target_email', 'old-target@example.invalid');
      window.holdRoleWrite = true;
      window.pendingRoleSwitch = window.fixtureSession.switchRole('coord_c1');
    });
    await page.waitForFunction(() => Boolean(window.releaseRoleWrite));
    await page.evaluate(user => window.emitAccount(user), second);
    await page.waitForFunction(email => document.querySelector('#private-view')?.dataset.email === email, {}, second.email);
    assert.equal(await page.evaluate(async () => {
      window.releaseRoleWrite();
      return window.pendingRoleSwitch;
    }), false, 'a late role write must not apply the previous account role to the new account');
    assert.equal(await page.$eval('#private-view', el => el.textContent), '');
    assert.deepEqual(await page.evaluate(() => [
      localStorage.getItem('cpsl_qt_members_cache_v4'), sessionStorage.getItem('googleAccessToken'),
      sessionStorage.getItem('cpsl_simulated_target_email')
    ]), [null, null, null]);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('cpsl_active_role')), null);
    await page.evaluate(() => window.emitAccount({
      uid: 'fixture-admin', email: 'jose.sanchez@crearpsl.net', name: 'Synthetic Admin',
      role: 'direccion', roles: ['direccion'], sede: 'Global'
    }));
    await page.waitForFunction(() => window.fixtureSession?.currentUser?.isSuperAdmin);
    await page.evaluate(target => {
      window.setPrivateDraft('ADMIN_PRIVATE');
      window.fixtureSession.simulateUser(target);
    }, second);
    await page.waitForFunction(() => window.fixtureSession?.currentUser?.isSimulated);
    assert.equal(await page.$eval('#private-view', el => el.textContent), '');
    await page.evaluate(() => {
      window.setPrivateDraft('SIMULATION_PRIVATE');
      window.fixtureSession.stopSimulation();
    });
    await page.waitForFunction(() => window.fixtureSession?.currentUser?.isSuperAdmin);
    assert.equal(await page.$eval('#private-view', el => el.textContent), '');
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
