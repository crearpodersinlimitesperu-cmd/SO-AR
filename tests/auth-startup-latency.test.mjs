import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const RTT = 60;
const delay = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
const authSource = readFileSync(new URL('../src/context/AuthContext.jsx', import.meta.url), 'utf8');
const agentSource = readFileSync(new URL('../src/services/roleAgentDaemon.js', import.meta.url), 'utf8');

function loadSaveSelfProfile({ exists, writeMs = RTT }) {
  const start = authSource.indexOf('async function saveSelfProfile');
  const end = authSource.indexOf('export function AuthProvider');
  const writes = [];
  const fn = new Function('db', 'doc', 'getDoc', 'setDoc', 'serverTimestamp', 'console',
    `${authSource.slice(start, end)}; return saveSelfProfile;`)(
    {},
    (_, collection, id) => ({ collection, id }),
    async () => delay(RTT, { exists: () => exists }),
    (ref, payload) => {
      const write = { ref, payload, settled: false };
      writes.push(write);
      return delay(writeMs).then(() => { write.settled = true; });
    },
    () => 'ts',
    { warn() {} }
  );
  return { saveSelfProfile: fn, writes };
}

function loadAgent() {
  const body = agentSource
    .replace(/^import .*$/gm, '')
    .replace('export async function enforceUserRolesAgent', 'async function enforceUserRolesAgent');
  let inFlight = 0;
  let maxInFlight = 0;
  const getDocs = async ({ name }) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await delay(RTT);
    inFlight -= 1;
    const rows = name === 'managers_directory'
      ? [{ nombre: 'Ana Perez', email: 'ana@crearpsl.net', sede: 'Lima', rol: 'manager' }]
      : [{ nombre: 'Ana Perez', email: 'ana@crearpsl.net', sede: 'Lima' }];
    return { forEach: (cb) => rows.forEach((data) => cb({ data: () => data })) };
  };
  const agent = new Function('db', 'getDocs', 'collection', 'findUserByAnyEmail', 'normalizeRole', 'DUAL_ROLE_TRAINER_EMAILS', 'console',
    `${body}; return enforceUserRolesAgent;`)(
    {}, getDocs, (_, name) => ({ name }), () => null, (r) => r, [], { log() {}, error() {} }
  );
  return { agent, stats: () => ({ maxInFlight }) };
}

test('role directories are fetched in parallel and still produce the same roles', async () => {
  const { agent, stats } = loadAgent();
  const t0 = performance.now();
  const roles = await agent({ email: 'ana@crearpsl.net', displayName: 'Ana Perez' }, ['colaborador']);
  const elapsed = performance.now() - t0;
  assert.equal(stats().maxInFlight, 2);
  assert.ok(elapsed < RTT * 1.8, `agent took ${elapsed.toFixed(0)}ms, expected ~1 RTT`);
  assert.deepEqual(roles.sort(), ['colaborador', 'manager', 'qt']);
});

test('existing profile: metadata write does not block startup but is still sent', async () => {
  const { saveSelfProfile, writes } = loadSaveSelfProfile({ exists: true, writeMs: RTT * 5 });
  const t0 = performance.now();
  await saveSelfProfile({ uid: 'u1', displayName: 'Ana' }, { name: 'Ana' }, 'ana@crearpsl.net');
  const elapsed = performance.now() - t0;
  assert.ok(elapsed < RTT * 2, `blocked ${elapsed.toFixed(0)}ms`);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].settled, false, 'write must still be in flight when startup continues');
  assert.equal('roles' in writes[0].payload || 'role' in writes[0].payload || 'sede' in writes[0].payload, false);
  await delay(RTT * 6);
  assert.equal(writes[0].settled, true);
});

test('first login: users/{uid} creation is still awaited before continuing', async () => {
  const { saveSelfProfile, writes } = loadSaveSelfProfile({ exists: false });
  await saveSelfProfile({ uid: 'u1', displayName: 'Ana', providerData: [] }, { name: 'Ana' }, 'ana@crearpsl.net');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].settled, true);
  assert.equal(writes[0].payload.uid, 'u1');
});

test('persisted session keeps verification order and does not await the daily audit', () => {
  const start = authSource.indexOf('onAuthStateChanged(auth, async');
  const effect = authSource.slice(start, authSource.indexOf('return unsubscribe', start));
  const order = [
    'await findUserInFirestore(normalizedEmail)',
    'foundUser.isActive === false',
    'await enforceUserRolesAgent(user, canonicalUser.roles)',
    'await saveSelfProfile(user, canonicalUser, normalizedEmail)',
    'setCurrentUser(userObj)',
    'recordAuditEvent({',
    'setLoading(false);\n      }'
  ].map((needle) => {
    const index = effect.indexOf(needle);
    assert.notEqual(index, -1, needle);
    return index;
  });
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.doesNotMatch(effect, /await recordAuditEvent/);
  assert.match(effect, /recordAuditEvent\(\{[\s\S]*?\}\)\.catch\(/);
  assert.match(authSource, /\{loading \? \([\s\S]*Cargando Causa OS[\s\S]*\) : children\}/);
});
