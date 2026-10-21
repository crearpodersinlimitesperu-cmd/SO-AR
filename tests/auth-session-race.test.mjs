import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/context/AuthContext.jsx', import.meta.url), 'utf8');
const start = source.indexOf('const startupTrace = createAuthStartupTrace();');
const effect = source.slice(start, source.indexOf('  }, []);', start));
const fixture = id => ({
  uid: `synthetic-${id}`,
  email: `${id}@example.invalid`,
  displayName: 'Synthetic Fixture',
  roles: ['colaborador']
});
const snapshot = { exists: () => true, data: () => ({}) };

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function harness({ stage = 'lookup', holdNew = false } = {}) {
  const pending = deferred();
  const entered = deferred();
  const newPending = deferred();
  const newEntered = deferred();
  const states = [];
  const writes = [];
  const reports = [];
  const notifications = [];
  let callback, currentUser = null, loading = true, unsubscribed = false;
  const wait = async (phase, user, value) => {
    if (holdNew && phase === 'lookup' && user.email === fixture('new').email) {
      newEntered.resolve();
      return newPending.promise;
    }
    if (phase === stage && user.email === fixture('old').email) {
      entered.resolve();
      return pending.promise;
    }
    return value;
  };
  const storage = { getItem: () => null, removeItem() {}, setItem() {} };
  const dependencies = {
    createAuthStartupTrace: () => ({ authReady() {}, finish() {}, measure: (_, task) => task() }),
    onAuthStateChanged: (_, next) => {
      callback = next;
      return () => { unsubscribed = true; };
    },
    auth: { signOut: async () => {} },
    findUserInFirestore: email => wait('lookup', { email },
      stage === 'staff' && email === fixture('old').email ? null : fixture(email.split('@')[0])),
    findStaffInFirestore: email => wait('staff', { email }, fixture(email.split('@')[0])),
    findUserByAnyEmail: () => null,
    isSuperAdminEmail: () => false,
    isInactiveTrainer: () => false,
    normalizeUserRecord: user => user,
    enforceUserRolesAgent: user => wait('roles', user, user.roles),
    getDoc: ref => wait('self-profile', fixture(ref.uid.replace('synthetic-', '')), snapshot),
    doc: (_, collection, uid) => ({ uid }),
    db: {},
    mergeAuthenticatedRoleProfile: user => user,
    saveSelfProfile: async user => {
      writes.push(user.uid);
      await wait('profile', user);
    },
    buildUserObject: (_, user) => user,
    canSimulate: () => false,
    setOriginalAdminUser: value => states.push(['originalAdmin', value]),
    setCurrentUser: value => { currentUser = value; states.push(['user', value]); },
    setLoading: value => { loading = value; states.push(['loading', value]); },
    signOut: async () => {},
    sessionStorage: storage,
    localStorage: storage,
    PARTICIPANT_FLAG: 'synthetic-participant',
    buildParticipantUser: user => user,
    recordAuditEvent: async () => { reports.push('audit'); },
    showToast: message => { reports.push('toast'); notifications.push(message); },
    console: { error: () => reports.push('error'), warn: () => reports.push('warning') }
  };
  const cleanup = new Function(...Object.keys(dependencies), effect)(...Object.values(dependencies));
  return {
    pending, entered, newPending, newEntered, states, writes, reports, notifications, cleanup,
    emit: user => callback(user),
    user: () => currentUser,
    loading: () => loading,
    unsubscribed: () => unsubscribed
  };
}

test('late startup cannot restore a signed-out session at any awaited stage', async t => {
  for (const stage of ['lookup', 'staff', 'roles', 'self-profile', 'profile']) {
    await t.test(stage, async () => {
      const h = harness({ stage });
      const oldRun = h.emit(fixture('old'));
      await h.entered.promise;
      await h.emit(null);
      const settledStates = h.states.length;
      h.pending.resolve(stage === 'self-profile' ? snapshot
        : ['lookup', 'staff'].includes(stage) ? fixture('old') : ['colaborador']);
      await oldRun;
      assert.equal(h.user(), null);
      assert.equal(h.loading(), false);
      assert.equal(h.states.length, settledStates, 'obsolete callback must not publish state');
      assert.equal(h.reports.includes('audit'), false);
      assert.equal(h.writes.length, stage === 'profile' ? 1 : 0);
    });
  }
});

test('late success or failure cannot replace or clear a newer verified session', async t => {
  for (const outcome of ['success', 'failure']) {
    await t.test(outcome, async () => {
      const h = harness();
      const oldRun = h.emit(fixture('old'));
      await h.entered.promise;
      await h.emit(fixture('new'));
      const settledStates = h.states.length;
      if (outcome === 'failure') h.pending.reject(new Error('synthetic lookup failure'));
      else h.pending.resolve(fixture('old'));
      await oldRun;
      assert.equal(h.user().uid, fixture('new').uid);
      assert.equal(h.states.length, settledStates);
      assert.deepEqual(h.writes, [fixture('new').uid]);
      assert.deepEqual(h.reports, ['audit']);
    });
  }
});

test('a new session closes the gate while its verification is pending', async () => {
  const h = harness();
  await h.emit(fixture('new'));
  assert.equal(h.loading(), false);
  const run = h.emit(fixture('old'));
  await h.entered.promise;
  assert.equal(h.loading(), true);
  assert.equal(h.user(), null);
  h.pending.resolve(fixture('old'));
  await run;
  assert.equal(h.loading(), false);
  assert.equal(h.user().uid, fixture('old').uid);
});

test('an obsolete failure cannot release the gate for a pending newer session', async () => {
  const h = harness({ holdNew: true });
  const oldRun = h.emit(fixture('old'));
  await h.entered.promise;
  const newRun = h.emit(fixture('new'));
  await h.newEntered.promise;
  const pendingStates = h.states.length;
  h.pending.reject(new Error('synthetic obsolete failure'));
  await oldRun;
  assert.equal(h.loading(), true);
  assert.equal(h.states.length, pendingStates);
  assert.deepEqual(h.reports, []);
  h.newPending.resolve(fixture('new'));
  await newRun;
  assert.equal(h.user().uid, fixture('new').uid);
  assert.equal(h.loading(), false);
});

test('unmount unsubscribes and invalidates pending verification', async () => {
  const h = harness();
  const run = h.emit(fixture('old'));
  await h.entered.promise;
  h.cleanup();
  const settledStates = h.states.length;
  h.pending.resolve(fixture('old'));
  await run;
  assert.equal(h.unsubscribed(), true);
  assert.equal(h.states.length, settledStates);
  assert.deepEqual(h.writes, []);
  assert.deepEqual(h.reports, []);
});

test('an active verification failure stays fail-closed with a generic notification', async () => {
  const h = harness({ stage: 'roles' });
  const run = h.emit(fixture('old'));
  await h.entered.promise;
  h.pending.reject(new Error('synthetic role read failure'));
  await run;
  assert.equal(h.user(), null);
  assert.equal(h.loading(), false);
  assert.deepEqual(h.writes, []);
  assert.deepEqual(h.reports, ['error', 'toast']);
  assert.deepEqual(h.notifications, ['No se pudo verificar tu acceso. Vuelve a iniciar sesión.']);
});
