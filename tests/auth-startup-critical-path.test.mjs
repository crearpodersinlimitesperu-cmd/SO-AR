import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createAuthStartupTrace } from '../src/utils/authStartupTiming.js';
import { mergeAuthenticatedRoleProfile } from '../src/utils/userNormalizer.js';

const RTT = 60;
const baselineRef = 'd1c07eaa128038df90d6a5db0a1c6b2a39b824f9';
const current = readFileSync(new URL('../src/context/AuthContext.jsx', import.meta.url), 'utf8');
const baseline = execFileSync('git', ['show', `${baselineRef}:src/context/AuthContext.jsx`], { encoding: 'utf8' });
const agentSource = readFileSync(new URL('../src/services/roleAgentDaemon.js', import.meta.url), 'utf8');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const email = 'access-fixture@example.invalid';
const uid = 'A'.repeat(28);
const row = (id, data) => ({ id, data: () => data });

// Execute the actual lookup helpers and persisted-auth callback, not a second
// implementation of startup. Only Firebase, React setters and local storage are fake.
function harness(source, { rows = [], staff = [], exists = true, fail = '', inactive = false, slowWrite = false } = {}) {
  const events = [];
  const writes = [];
  let callback;
  let currentUser = null;
  const event = name => events.push({ name, at: performance.now() });
  const collection = (_, name) => ({ name });
  const doc = (_, name, id) => ({ name, id });
  const where = (field, op, value) => ({ field, op, value });
  const or = (...filters) => ({ filters });
  const query = (ref, filter) => ({ ...ref, filters: filter.filters || [filter] });
  const getDocs = async ({ name, filters }) => {
    event(`read:${name}`);
    await pause(RTT);
    if (name === fail) throw new Error(`simulated ${fail} failure`);
    const documents = name === 'users' ? rows : name === 'staff_directory' ? staff : [];
    const docs = documents.filter(d => filters?.some(({ field, op, value }) =>
      op === 'array-contains' ? d.data()[field]?.includes(value) : d.data()[field] === value
    )).sort((a, b) => a.id.localeCompare(b.id));
    return { docs, size: docs.length, empty: !docs.length, forEach: cb => docs.forEach(cb) };
  };
  const getDoc = async () => {
    event('read:self-profile');
    await pause(RTT);
    if (fail === 'self-profile') throw new Error('simulated profile failure');
    return { exists: () => exists, data: () => ({}) };
  };
  const setDoc = async (ref, payload, options) => {
    event('write:profile');
    const write = { ref, payload, options, settled: false };
    writes.push(write);
    await pause(slowWrite ? RTT * 4 : RTT);
    if (fail === 'profile-write') throw new Error('simulated creation failure');
    write.settled = true;
    event('write:complete');
  };
  const logger = { log() {}, warn: () => event('warning'), error: () => event('error') };
  const saveBody = source.slice(source.indexOf('async function saveSelfProfile'), source.indexOf('export function AuthProvider'));
  const saveSelfProfile = new Function('db', 'doc', 'getDoc', 'setDoc', 'serverTimestamp', 'console',
    `${saveBody}; return saveSelfProfile;`)({}, doc, getDoc, setDoc, () => 'ts', logger);
  const helpersBody = source.slice(source.indexOf('const pareceUidFirebase'), source.indexOf('const switchRole'));
  const helpers = new Function('db', 'collection', 'query', 'where', 'or', 'getDocs', 'console',
    `${helpersBody}; return { findUserInFirestore, ${source.includes('const findStaffInFirestore') ? 'findStaffInFirestore,' : ''} };`)(
    {}, collection, query, where, or, getDocs, logger);
  const agentBody = agentSource.replace(/^import .*$/gm, '').replace('export async function', 'async function');
  const agent = new Function('db', 'getDocs', 'collection', 'findUserByAnyEmail', 'normalizeRole', 'DUAL_ROLE_TRAINER_EMAILS', 'console',
    `${agentBody}; return enforceUserRolesAgent;`)({}, getDocs, collection, () => null, r => r, [], logger);
  const declarations = source.indexOf('let sessionVersion = 0;');
  const start = declarations === -1 ? source.indexOf('const unsubscribe = onAuthStateChanged') : declarations;
  const effectBody = source.slice(start, source.indexOf('  }, []);', start));
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  new Function('onAuthStateChanged', 'auth', 'findUserInFirestore', 'findStaffInFirestore', 'db', 'collection',
    'query', 'where', 'getDocs', 'getDoc', 'doc', 'findUserByAnyEmail', 'isSuperAdminEmail', 'isInactiveTrainer',
    'signOut', 'setCurrentUser', 'setOriginalAdminUser', 'setLoading', 'normalizeUserRecord', 'enforceUserRolesAgent', 'saveSelfProfile',
    'buildUserObject', 'recordAuditEvent', 'sessionStorage', 'localStorage', 'PARTICIPANT_FLAG',
    'buildParticipantUser', 'mergeAuthenticatedRoleProfile', 'console', 'showToast', 'startupTrace', effectBody)(
    (_, cb) => { callback = cb; return () => {}; }, { signOut: async () => event('signout') },
    helpers.findUserInFirestore, helpers.findStaffInFirestore, {}, collection, query, where, getDocs, getDoc, doc,
    () => null, () => false, () => inactive, async () => event('signout'),
    user => { currentUser = user; event(user ? 'access' : 'no-access'); }, () => {},
    value => event(value ? 'gate-started' : 'gate-finished'), user => ({ ...user, roles: ['colaborador'] }),
    agent, saveSelfProfile, (_, user) => user, async () => event('audit'),
    storage, storage, 'participant', () => ({ participant: true }), mergeAuthenticatedRoleProfile, logger,
    () => event('toast'), createAuthStartupTrace());
  return {
    helpers, events, writes, user: () => currentUser,
    async run() {
      const startAt = performance.now();
      await pause(RTT); // simulated Firebase auth-state restoration, not a real auth measurement
      event('auth-ready');
      await callback({ uid, email, displayName: 'Synthetic Fixture', providerData: [] });
      return performance.now() - startAt;
    }
  };
}

test('OR lookup preserves field priority before UID preference, aliases and duplicate semantics', async () => {
  const preferred = row('slug', { emails: [email], role: 'coord_c1' });
  const other = row(uid, { email, role: 'manager' });
  const h = harness(current, { rows: [other, preferred] });
  assert.equal((await h.helpers.findUserInFirestore(email))._docId, 'slug');
  const sameFieldUid = row(uid, { emails: [email], role: 'coord_maestria' });
  const sameField = harness(current, { rows: [preferred, sameFieldUid] });
  assert.equal((await sameField.helpers.findUserInFirestore(email))._docId, uid);
  for (const field of ['email', 'corporateEmail', 'personalEmail']) {
    const h = harness(current, { rows: [row('legacy', { [field]: email })] });
    assert.equal((await h.helpers.findUserInFirestore(email))._docId, 'legacy');
    assert.equal(await h.helpers.findUserInFirestore('missing@example.invalid'), null);
  }
  const hStaff = harness(current, { staff: [
    row('a', { email, name: 'Secondary' }), row('z', { emails: [email], name: 'Preferred' })
  ] });
  assert.equal((await hStaff.helpers.findStaffInFirestore(email)).name, 'Preferred');
});

test('actual callback: comparable PR145 vs current at 60ms RTT, including auth-state wait', async t => {
  for (const [label, field, beforeRounds, afterRounds] of [
    ['emails', 'emails', 3, 2], ['email', 'email', 4, 2],
    ['corporateEmail', 'corporateEmail', 5, 2], ['personalEmail', 'personalEmail', 6, 2],
    ['staff-email', 'staff', 8, 3]
  ]) {
    const data = { name: 'Synthetic Fixture', [field]: field === 'emails' ? [email] : email };
    const opts = field === 'staff' ? { staff: [row('staff', { email, name: 'Synthetic Fixture' })] } : { rows: [row(uid, data)] };
    const old = harness(baseline, opts);
    const updated = harness(current, opts);
    const oldMs = await old.run();
    const newMs = await updated.run();
    assert.ok(old.user() && updated.user(), label);
    assert.deepEqual(updated.user(), old.user(), `profile/roles changed for ${label}`);
    assert.ok(newMs < oldMs - RTT * 0.65, `${label}: ${oldMs} -> ${newMs}`);
    assert.ok(Math.abs(oldMs - (beforeRounds + 1) * RTT) < RTT * 0.9, `${label}: baseline ${oldMs}`);
    assert.ok(Math.abs(newMs - (afterRounds + 1) * RTT) < RTT * 0.9, `${label}: current ${newMs}`);
    const readsBefore = old.events.filter(e => e.name.startsWith('read:')).length;
    const readsAfter = updated.events.filter(e => e.name.startsWith('read:')).length;
    t.diagnostic(`${label}: Firestore ${beforeRounds} -> ${afterRounds} RTT; auth wait 1 RTT unchanged; total ${oldMs.toFixed(1)} -> ${newMs.toFixed(1)} ms; read requests ${readsBefore} -> ${readsAfter}`);
    const access = updated.events.find(e => e.name === 'access').at;
    assert.ok(updated.events.find(e => e.name === 'read:self-profile').at < access);
    await pause(RTT); // drain non-blocking metadata writes before next sample
  }
});

test('self-profile read overlaps roles, but first creation and roles finish before access', async () => {
  const h = harness(current, { rows: [row(uid, { emails: [email], name: 'Synthetic Fixture' })], exists: false });
  await h.run();
  assert.ok(h.user());
  const read = name => h.events.find(e => e.name === name).at;
  assert.ok(Math.abs(read('read:self-profile') - read('read:managers_directory')) < RTT / 2);
  assert.ok(read('write:complete') <= read('access'));
  assert.equal(h.writes[0].settled, true);
  assert.equal(h.writes[0].payload.uid, uid);
  assert.equal('roles' in h.writes[0].payload, false);
});

test('slow existing metadata stays non-blocking and is completed without a second self read', async () => {
  const h = harness(current, { rows: [row(uid, { emails: [email] })], slowWrite: true });
  await h.run();
  assert.ok(h.user());
  assert.equal(h.events.filter(e => e.name === 'read:self-profile').length, 1);
  assert.equal(h.writes[0].settled, false);
  await pause(RTT * 5);
  assert.equal(h.writes[0].settled, true);
});

test('inactive, unknown, lookup/role/read/creation failures never grant access; failures are reported', async () => {
  for (const opts of [
    { inactive: true }, { rows: [] }, { fail: 'users' }, { fail: 'staff_directory', rows: [] },
    { fail: 'managers_directory' }, { fail: 'qt_directory' },
    { fail: 'self-profile' }, { fail: 'profile-write', exists: false }
  ]) {
    const h = harness(current, { rows: [row(uid, { emails: [email] })], ...opts });
    await h.run();
    assert.equal(h.user(), null, JSON.stringify(opts));
    assert.equal(h.events.some(e => e.name === 'access'), false);
    if (opts.fail) {
      assert.ok(h.events.some(e => e.name === 'error'));
      assert.ok(h.events.some(e => e.name === 'toast'));
    }
    if (opts.inactive) assert.equal(h.writes.length, 0);
  }
});

test('local timing separates auth, lookup, roles, overlapping self read, metadata and total without identity', async () => {
  performance.clearMeasures();
  const h = harness(current, { rows: [row(uid, { personalEmail: email })] });
  await h.run();
  const measures = performance.getEntriesByType('measure');
  for (const phase of ['auth-state-wait', 'users-lookup', 'roles', 'self-profile-read', 'profile-metadata', 'total-to-gate']) {
    assert.ok(measures.some(e => e.name === `causa-auth:${phase}`), phase);
  }
  assert.ok(measures.every(e => !e.name.includes(email) && !e.name.includes(uid)));
  const metadata = measures.find(e => e.name === 'causa-auth:profile-metadata');
  assert.ok(metadata.duration < RTT / 2, 'existing metadata must not await network');
  await pause(RTT);
});
