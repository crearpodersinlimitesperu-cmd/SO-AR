import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where
} from 'firebase/firestore';

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-users-privacy',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
    }
  });
});

after(async () => {
  await testEnv?.cleanup();
});

const PROFILES = {
  'lima-1': { email: 'lima1@example.com', emails: ['lima1@example.com'], corporateEmail: 'lima1@corp.example.com', personalEmail: 'lima1.personal@example.com', role: 'entrenador', roles: ['entrenador'], sede: 'Lima' },
  'lima-2': { email: 'lima2@example.com', role: 'colaborador', roles: ['colaborador'], sede: 'Lima' },
  'lima-gerente': { email: 'gerente.lima@example.com', role: 'gerente', roles: ['gerente'], sede: 'Lima' },
  'quito-1': { email: 'quito1@example.com', role: 'entrenador', roles: ['entrenador'], sede: 'Quito' },
  'dir-1': { email: 'direccion@example.com', role: 'direccion', roles: ['direccion'], sede: 'Sede Global' },
  'th-1': { email: 'th@example.com', role: 'talento_humano', roles: ['talento_humano'], sede: 'Lima' },
  'maestria-1': { email: 'maestria@example.com', role: 'director_maestria', roles: ['director_maestria'], sede: 'Quito' },
  'global-sin-rol': { email: 'global@example.com', role: 'colaborador', roles: ['colaborador'], sede: 'Sede Global' },
  'sin-sede': { email: 'sinsede@example.com', role: 'colaborador', roles: ['colaborador'] },
  'alias-1': { email: 'ana.perez@crearpsl.net', role: 'entrenador', roles: ['entrenador'], sede: 'Quito' },
  'quito-c1': { email: 'quito.c1@example.com', role: 'entrenador', roles: ['entrenador'], sede: 'Quito Ciclo 1' },
  'quito-c2': { email: 'quito.c2@example.com', role: 'colaborador', roles: ['colaborador'], sede: 'Quito C2' },
  'quito-uio': { email: 'quito.uio@example.com', role: 'colaborador', roles: ['colaborador'], sede: 'UIO' },
  'med-acento': { email: 'med.acento@example.com', role: 'entrenador', roles: ['entrenador'], sede: 'Medellín' },
  'med-plain': { email: 'med.plain@example.com', role: 'colaborador', roles: ['colaborador'], sede: 'Medellin' },
  'otra-sin-sede': { email: 'otra.sinsede@example.com', role: 'colaborador', roles: ['colaborador'], sede: 'Sin Sede' },
  'sa-1': { email: 'jose.sanchez@crearpsl.net', role: 'superadmin', roles: ['superadmin'], sede: 'Sede Global' }
};

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all(Object.entries(PROFILES).map(([uid, data]) =>
      setDoc(doc(db, 'users', uid), { uid, ...data })
    ));
    await setDoc(doc(db, 'tasks', 'custom_lima'), {
      id: 'custom_lima', assignedToEmail: 'lima1@example.com', role: 'gerente', isCustom: true
    });
  });
});

const dbFor = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const asLima = () => dbFor('lima-1', 'lima1@example.com');
const users = db => collection(db, 'users');

test('unauthenticated clients cannot read or list users', async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDocs(users(db)));
  await assertFails(getDoc(doc(db, 'users', 'lima-1')));
});

test('an ordinary user cannot list the global users collection', async () => {
  await assertFails(getDocs(users(asLima())));
});

test('a user keeps access to their own profile by UID', async () => {
  await assertSucceeds(getDoc(doc(asLima(), 'users', 'lima-1')));
});

test('AuthContext/getVerifiedUser email lookups still work for the caller', async () => {
  const db = asLima();
  await assertSucceeds(getDocs(query(users(db), where('emails', 'array-contains', 'lima1@example.com'))));
  await assertSucceeds(getDocs(query(users(db), where('email', '==', 'lima1@example.com'))));
  await assertSucceeds(getDocs(query(users(db), where('corporateEmail', '==', 'lima1@corp.example.com'))));
  await assertSucceeds(getDocs(query(users(db), where('personalEmail', '==', 'lima1.personal@example.com'))));
});

test('a first-time user with no profile can still run the login lookups', async () => {
  const db = dbFor('nuevo-1', 'nuevo@example.com');
  const email = query(users(db), where('email', '==', 'nuevo@example.com'));
  const emails = query(users(db), where('emails', 'array-contains', 'nuevo@example.com'));
  const snap = await assertSucceeds(getDocs(email));
  assert.equal(snap.size, 0);
  await assertSucceeds(getDocs(emails));
  await assertFails(getDocs(users(db)));
});

test('the crearpsl.com login alias can look up the crearpsl.net profile as AuthContext does', async () => {
  const db = dbFor('alias-uid-com', 'ana.perez@crearpsl.com');
  const snap = await assertSucceeds(getDocs(query(users(db), where('email', '==', 'ana.perez@crearpsl.net'))));
  assert.equal(snap.size, 1);
});

test('looking up another person by email is denied', async () => {
  const db = asLima();
  await assertFails(getDocs(query(users(db), where('email', '==', 'quito1@example.com'))));
  await assertFails(getDocs(query(users(db), where('emails', 'array-contains', 'quito1@example.com'))));
});

test('same-sede users are readable, by query and by document', async () => {
  const db = asLima();
  const snap = await assertSucceeds(getDocs(query(users(db), where('sede', '==', 'Lima'))));
  assert.equal(snap.size, 4);
  await assertSucceeds(getDoc(doc(db, 'users', 'lima-2')));
});

test('cross-sede users are not readable, by query or by document', async () => {
  const db = asLima();
  await assertFails(getDocs(query(users(db), where('sede', '==', 'Quito'))));
  await assertFails(getDoc(doc(db, 'users', 'quito-1')));
});

test('a caller on the Global sede or without a sede gets no sede-wide access', async () => {
  const global = dbFor('global-sin-rol', 'global@example.com');
  await assertFails(getDocs(query(users(global), where('sede', '==', 'Sede Global'))));
  await assertFails(getDocs(users(global)));
  await assertSucceeds(getDoc(doc(global, 'users', 'global-sin-rol')));

  const sinSede = dbFor('sin-sede', 'sinsede@example.com');
  await assertFails(getDocs(users(sinSede)));
  await assertFails(getDocs(query(users(sinSede), where('sede', '==', 'Lima'))));
});

const QUITO_ALIASES = ['Quito', 'QUITO', 'quito', 'UIO', 'uio', 'Quito C1', 'Quito C2', 'Quito Ciclo 1', 'Quito Ciclo 2', 'QUITO C1', 'QUITO C2', 'Quito ciclo 1', 'Quito ciclo 2'];
const MEDELLIN_ALIASES = ['Medellín', 'Medellin', 'MEDELLIN', 'MEDELLÍN', 'medellin', 'medellín', 'MED', 'Med'];

test('sede aliases: Quito Ciclo 1 / C2 / UIO / Quito are the same sede (document reads)', async () => {
  const fromC1 = dbFor('quito-c1', 'quito.c1@example.com');
  for (const id of ['quito-1', 'quito-c2', 'quito-uio', 'alias-1', 'maestria-1']) {
    await assertSucceeds(getDoc(doc(fromC1, 'users', id)));
  }
  const fromQuito = dbFor('quito-1', 'quito1@example.com');
  await assertSucceeds(getDoc(doc(fromQuito, 'users', 'quito-c1')));
  await assertFails(getDoc(doc(fromQuito, 'users', 'lima-1')));
  await assertFails(getDoc(doc(fromC1, 'users', 'med-acento')));
});

test('sede aliases: the client query where sede in aliasSet returns every Quito variant', async () => {
  for (const [uid, email] of [['quito-1', 'quito1@example.com'], ['quito-c1', 'quito.c1@example.com']]) {
    const snap = await assertSucceeds(getDocs(query(users(dbFor(uid, email)), where('sede', 'in', QUITO_ALIASES))));
    assert.deepEqual(snap.docs.map(d => d.id).sort(),
      ['alias-1', 'maestria-1', 'quito-1', 'quito-c1', 'quito-c2', 'quito-uio']);
  }
});

test('sede aliases: Medellin and Medellín are the same sede, in either direction', async () => {
  for (const [uid, email] of [['med-acento', 'med.acento@example.com'], ['med-plain', 'med.plain@example.com']]) {
    const db = dbFor(uid, email);
    const snap = await assertSucceeds(getDocs(query(users(db), where('sede', 'in', MEDELLIN_ALIASES))));
    assert.deepEqual(snap.docs.map(d => d.id).sort(), ['med-acento', 'med-plain']);
    await assertSucceeds(getDoc(doc(db, 'users', uid === 'med-plain' ? 'med-acento' : 'med-plain')));
  }
});

test('sede aliases: querying another sede\'s aliases, or a mixed set, is denied', async () => {
  const db = dbFor('quito-c1', 'quito.c1@example.com');
  await assertFails(getDocs(query(users(db), where('sede', 'in', MEDELLIN_ALIASES))));
  await assertFails(getDocs(query(users(db), where('sede', 'in', [...QUITO_ALIASES.slice(0, 3), 'Lima']))));
  await assertFails(getDocs(query(users(db), where('sede', '==', 'Lima'))));
});

test('"Sin Sede" is not a shared sede', async () => {
  const db = dbFor('otra-sin-sede', 'otra.sinsede@example.com');
  await assertFails(getDocs(query(users(db), where('sede', '==', 'Sin Sede'))));
  await assertFails(getDoc(doc(db, 'users', 'sin-sede')));
  await assertSucceeds(getDoc(doc(db, 'users', 'otra-sin-sede')));
});

test('a sede gerente reads only their own sede', async () => {
  const db = dbFor('lima-gerente', 'gerente.lima@example.com');
  await assertFails(getDocs(users(db)));
  await assertSucceeds(getDocs(query(users(db), where('sede', '==', 'Lima'))));
  await assertFails(getDoc(doc(db, 'users', 'quito-1')));
});

test('direccion, director_maestria and talento_humano can read the full directory', async () => {
  await assertSucceeds(getDocs(users(dbFor('dir-1', 'direccion@example.com'))));
  await assertSucceeds(getDocs(users(dbFor('maestria-1', 'maestria@example.com'))));
  await assertSucceeds(getDocs(users(dbFor('th-1', 'th@example.com'))));
});

test('a fixed-list gerencia/direccion email reads the full directory', async () => {
  await assertSucceeds(getDocs(users(dbFor('fer-1', 'fer.aragon@crearpsl.net'))));
});

test('gomeznueve and the crearpsl.com alias of a whitelisted email keep the global directory', async () => {
  await assertSucceeds(getDocs(users(dbFor('gn-1', 'gomeznueve@gmail.com'))));
  await assertSucceeds(getDocs(users(dbFor('fer-com', 'fer.aragon@crearpsl.com'))));
});

test('a non-whitelisted crearpsl.com alias does not become global', async () => {
  await assertFails(getDocs(users(dbFor('x-com', 'nadie.mas@crearpsl.com'))));
});

test('SuperAdmin reads the full directory', async () => {
  const db = dbFor('sa-1', 'jose.sanchez@crearpsl.net');
  const snap = await assertSucceeds(getDocs(users(db)));
  assert.equal(snap.size, Object.keys(PROFILES).length);
});

test('SuperAdmin keeps the by-email and by-role lookups used by UserProfileModal and sentinels', async () => {
  const db = dbFor('sa-1', 'jose.sanchez@crearpsl.net');
  await assertSucceeds(getDocs(query(users(db), where('email', '==', 'quito1@example.com'))));
  await assertSucceeds(getDocs(query(users(db), where('role', 'in', ['gerente', 'direccion']))));
});

test('role-based recipient queries from the client are denied to ordinary users (served by backend)', async () => {
  await assertFails(getDocs(query(users(asLima()), where('role', 'in', ['gerente', 'direccion']))));
});

test('a user cannot widen their own access by editing role or sede', async () => {
  const db = asLima();
  await assertFails(setDoc(doc(db, 'users', 'lima-1'), { ...PROFILES['lima-1'], uid: 'lima-1', role: 'direccion' }));
  await assertFails(setDoc(doc(db, 'users', 'lima-1'), { ...PROFILES['lima-1'], uid: 'lima-1', sede: 'Quito' }));
});

test('assigned-task reads that rely on server-side profile lookups still work', async () => {
  const db = asLima();
  await assertSucceeds(getDoc(doc(db, 'tasks', 'custom_lima')));
  await assertSucceeds(getDocs(query(collection(db, 'tasks'), where('assignedToEmail', '==', 'lima1@example.com'))));
});

test('rules sede alias lists match backend and client alias lists and canonicalSede', async () => {
  const { createRequire } = await import('node:module');
  const backend = createRequire(import.meta.url)('../functions/directoryScope.js');
  const { SEDE_ALIASES } = await import('../src/utils/sedeAliases.js');
  const { canonicalSede } = await import('../src/utils/sede.js');
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const block = rules.slice(rules.indexOf('function sedeAliasList('), rules.indexOf('function canReadUserSameSede('));
  const ruleLists = [...block.matchAll(/\[('[^\]]+)\]/g)].map(m => [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]));
  assert.deepEqual(backend.SEDE_ALIASES, SEDE_ALIASES);
  assert.deepEqual(ruleLists.sort(), Object.values(SEDE_ALIASES).sort());
  for (const [canon, list] of Object.entries(SEDE_ALIASES)) {
    assert.ok(list.length <= 30, canon);
    for (const alias of list) assert.equal(canonicalSede(alias), canon, alias);
  }
});

test('rules and client scope stay in sync on the global directory roles', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const service = readFileSync(new URL('../src/services/userService.js', import.meta.url), 'utf8');
  const roles = ['direccion', 'cfo', 'cco', 'ceo', 'director_maestria', 'talento_humano'];
  for (const role of roles) {
    assert.ok(rules.includes(`'${role}'`), `rules missing ${role}`);
    assert.ok(service.includes(`'${role}'`), `userService missing ${role}`);
  }
  assert.doesNotMatch(rules, /match \/users\/\{userId\} \{\s*allow read: if isAuthenticated\(\);/);
});
