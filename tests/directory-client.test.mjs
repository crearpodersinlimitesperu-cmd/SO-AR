import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import { isInDirectoryScope, projectDirectoryUser } from '../src/utils/directoryScope.js';
import { sedeAliasList } from '../src/utils/sedeAliases.js';
import { validateRecipientRoles } from '../src/utils/recipientRoles.js';

const backend = createRequire(import.meta.url)('../functions/directoryScope.js');

// Execute the actual service bodies with Firebase I/O replaced; no network or credentials.
function loadService(file, bindings, exports) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8')
    .replace(/^import[\s\S]*?;\s*/gm, '')
    .replace(/\bexport /g, '');
  return runInNewContext(`${source}\n;({${exports.join(',')}})`, { console, ...bindings });
}

const own = { email: 'trainer@example.com', role: 'entrenador', sede: 'Quito' };
const residual = { id: 'residual', data: { email: 'res@example.com', role: 'entrenador', sede: 'quito ciclo 1' } };
const foreign = { email: 'foreign@example.com', role: 'qt', sede: 'Lima', phone: 'private', cumpleanos: 'private' };
const snapshot = records => {
  const docs = records.map(({ id, data }) => ({ id, data: () => data }));
  return { docs, size: docs.length, forEach: fn => docs.forEach(fn) };
};

test('minimal projection preserves the caller own profile even without a usable sede', () => {
  const user = { email: own.email, sede: 'Global', phone: 'own-contact' };
  assert.equal(projectDirectoryUser(user, { global: false, sede: null }, new Set([own.email])), user);
  const projected = projectDirectoryUser(foreign, { global: false, crossSede: true, sede: 'Quito' });
  assert.equal(projected.email, foreign.email);
  assert.equal('phone' in projected, false);
});

test('actual directory merge: same-sede residuals never authorize foreign static or QT users', async () => {
  for (const role of ['entrenador', 'coord_c1']) {
    const profile = { ...own, role };
    const scope = backend.resolveScope(profile, own.email);
    const service = loadService('../src/services/userService.js', {
      db: {}, auth: { currentUser: { uid: 'own' } },
      doc: (_db, collection, id) => ({ collection, id }),
      getDoc: async () => ({ exists: () => true, id: 'own', data: () => profile }),
      collection: (_db, name) => name, where: () => ({}), query: collection => collection,
      getDocs: async collection => snapshot(collection === 'qt_directory'
        ? [{ id: 'foreign-qt', data: foreign }] : []),
      usersData: [foreign], normalizeRole: role => role, findUserByAnyEmail: () => null,
      DUAL_ROLE_TRAINER_EMAILS: [], NODUS_REPORT_ADMIN_EMAILS: [],
      isSuperAdminEmail: () => false, canManageUserStatus: () => false,
      sedeAliasList, isInDirectoryScope, projectDirectoryUser,
      fetchCrossSedeDirectory: async () => ({
        users: backend.buildDirectory(scope, [residual]),
        canSeeCrossSede: scope.level === 'global' || scope.crossSedeRoster
      })
    }, ['getAllCompanyUsers']);
    const result = await service.getAllCompanyUsers(profile);
    assert.ok(result.some(user => user.id === 'residual'));
    assert.equal(result.some(user => user.email === foreign.email), role === 'coord_c1');
    if (role === 'coord_c1') {
      const user = result.find(user => user.email === foreign.email);
      assert.equal('phone' in user, false);
      assert.equal('cumpleanos' in user, false);
    }
  }
});

test('directory cache is identity-bound and does not reuse elevated results after account switch', async () => {
  const auth = { currentUser: { uid: 'coord' } };
  let calls = 0;
  const service = loadService('../src/services/directoryService.js', {
    app: {}, auth, getFunctions: () => ({}),
    httpsCallable: () => async () => {
      calls++;
      return { data: { users: [], canSeeCrossSede: auth.currentUser.uid === 'coord' } };
    }
  }, ['fetchCrossSedeDirectory']);
  assert.equal((await service.fetchCrossSedeDirectory()).canSeeCrossSede, true);
  await service.fetchCrossSedeDirectory();
  assert.equal(calls, 1);
  auth.currentUser = { uid: 'trainer' };
  assert.equal((await service.fetchCrossSedeDirectory()).canSeeCrossSede, false);
  assert.equal(calls, 2);
  auth.currentUser = null;
  await assert.rejects(service.fetchCrossSedeDirectory(), /iniciar sesión/);
});

test('legacy or malformed callable responses fail closed rather than granting cross-sede scope', async () => {
  const service = loadService('../src/services/directoryService.js', {
    app: {}, auth: { currentUser: { uid: 'trainer' } }, getFunctions: () => ({}),
    httpsCallable: () => async () => ({ data: { users: [foreign] } })
  }, ['fetchCrossSedeDirectory']);
  await assert.rejects(service.fetchCrossSedeDirectory(), /inválida/);
});

test('recipient loader queries all role fields, deduplicates and keeps minimal recipient output', async () => {
  const source = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('async function loadRecipientDocs('),
    source.indexOf('const DIRECTORY_CALL_OPTIONS'));
  const fields = [];
  const db = { collection: () => ({
    where: (field, operator, roles) => {
      fields.push([field, operator]);
      assert.deepEqual(roles, ['gerente']);
      return {
        select: (...selected) => {
          assert.equal(selected.includes('phone'), false);
          return { limit: () => ({ get: async () => snapshot([
            { id: 'duplicate', data: { email: 'dup@example.com', role: 'gerente' } },
            ...(field === 'appRole' ? [{ id: 'app-only', data: { email: 'app@example.com', appRole: 'gerente' } }] : [])
          ]) }) };
        }
      };
    }
  }) };
  const load = runInNewContext(`${body}; loadRecipientDocs`, { db, directoryScope: backend });
  const docs = await load(['gerente']);
  assert.deepEqual(fields, [['role', 'in'], ['roles', 'array-contains-any'], ['appRole', 'in']]);
  assert.equal(docs.length, 2);
  assert.deepEqual(backend.buildRecipients(['gerente'], docs), [
    { email: 'dup@example.com', role: 'gerente' },
    { email: 'app@example.com', role: 'gerente' }
  ]);
});

test('actual callables authenticate and derive scope only from verified identity and stored profile', async () => {
  const source = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8');
  let profile = own;
  let exists = true;
  const collection = {
    doc: () => ({ get: async () => ({ exists, data: () => profile }) }),
    select: () => ({ limit: () => ({ get: async () => snapshot([
      residual, { id: 'foreign', data: foreign }
    ]) }) })
  };
  class HttpsError extends Error {
    constructor(code, message) { super(message); this.code = code; }
  }
  const handlers = runInNewContext(
    `${source.slice(source.indexOf('async function loadCallerScope('))}; exports`,
    { console, db: { collection: () => collection }, directoryScope: backend,
      HttpsError, onCall: (_options, handler) => handler, exports: {} }
  );
  for (const name of ['getCompanyDirectory', 'getRoleRecipients']) {
    await assert.rejects(handlers[name]({}), { code: 'unauthenticated' });
    for (const email_verified of [false, undefined]) {
      await assert.rejects(handlers[name]({
        auth: { uid: 'own', token: { email: 'jose.sanchez@crearpsl.net', email_verified } }
      }), { code: 'permission-denied' });
    }
  }
  const request = {
    auth: { uid: 'own', token: { email: own.email, email_verified: true } },
    data: { role: 'direccion', sede: 'Global', canSeeCrossSede: true, roles: ['gerente'] }
  };
  const ordinary = await handlers.getCompanyDirectory(request);
  assert.equal(ordinary.canSeeCrossSede, false);
  assert.deepEqual(Array.from(ordinary.users, user => user.id), ['residual']);
  await assert.rejects(handlers.getRoleRecipients({
    ...request, data: { roles: ['entrenador'] }
  }), { code: 'permission-denied' });
  profile = { ...own, role: 'coord_c1' };
  const coord = await handlers.getCompanyDirectory(request);
  assert.equal(coord.canSeeCrossSede, true);
  assert.deepEqual(Array.from(coord.users, user => user.id), ['residual', 'foreign']);
  assert.equal('phone' in coord.users[1], false);
  await assert.rejects(handlers.getRoleRecipients({
    ...request, data: { roles: ['arbitrary'] }
  }), { code: 'invalid-argument' });
  exists = false;
  await assert.rejects(handlers.getCompanyDirectory(request), { code: 'permission-denied' });
});

test('notifyManada preserves legitimate roles and surfaces unsupported roles before querying', async () => {
  const requested = [];
  let commits = 0;
  const { ExcellenceService } = loadService('../src/services/ExcellenceService.js', {
    db: {}, validateRecipientRoles,
    fetchRoleRecipients: async roles => { requested.push(roles); return [{ email: 'recipient@example.com' }]; },
    writeBatch: () => ({ set: () => {}, commit: async () => { commits++; } }),
    doc: ref => ref, collection: (_db, name) => name
  }, ['ExcellenceService']);
  const standard = {
    id: 'standard', expansion: { roles: ['entrenador_llamadas', 'legal', 'student'] },
    newStandard: { title: 'Title', corePrinciple: 'Principle' }
  };
  await ExcellenceService.notifyManada(standard);
  assert.deepEqual(requested, [standard.expansion.roles]);
  assert.equal(commits, 1);
  await assert.rejects(ExcellenceService.notifyManada({
    ...standard, expansion: { roles: ['arbitrary'] }
  }), /no soportados/);
  assert.equal(requested.length, 1);
});
