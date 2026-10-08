import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';

let testEnv;

const USERS = {
  'coord-1': { email: 'coord@example.com', role: 'coord_c1', roles: ['coord_c1'] },
  'ger-1': { email: 'ger@example.com', role: 'gerente', roles: ['gerente'] },
  'ger-multi': { email: 'gm@example.com', role: 'coord_c1', roles: ['coord_c1', 'gerente'] },
  'ent-1': { email: 'ent@example.com', role: 'entrenador', roles: ['entrenador'] },
  'qt-1': { email: 'qt@crearpsl.com', role: 'qt', roles: ['qt'] },
  'dir-1': { email: 'dir@example.com', appRole: 'direccion' }
};

const SUPERADMIN = { uid: 'sa-1', email: 'jose.sanchez@crearpsl.net' };

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-a01-hardening',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
    }
  });
});

after(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all(Object.entries(USERS).map(([uid, data]) =>
      setDoc(doc(db, 'users', uid), { uid, ...data })
    ));
  });
});

const seed = async (path, data) => {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), ...path), data);
  });
};

const dbOf = uid => testEnv.authenticatedContext(uid, { email: USERS[uid].email }).firestore();
const superAdminDb = () =>
  testEnv.authenticatedContext(SUPERADMIN.uid, { email: SUPERADMIN.email }).firestore();
const anonDb = () => testEnv.unauthenticatedContext().firestore();

test('user_stats: el dueño por uid o por correo escribe lo suyo y no lo ajeno', async () => {
  const ent = dbOf('ent-1');
  await assertSucceeds(setDoc(doc(ent, 'user_stats', 'ent-1'), { totalTasks: 1 }));
  await assertSucceeds(getDoc(doc(ent, 'user_stats', 'ent-1')));
  await assertSucceeds(setDoc(doc(ent, 'user_stats', 'ent@example.com'), { totalTasks: 1 }));
  await assertFails(setDoc(doc(ent, 'user_stats', 'coord-1'), { totalTasks: 1 }));
  await assertFails(getDoc(doc(ent, 'user_stats', 'coord-1')));
  await assertSucceeds(setDoc(doc(dbOf('qt-1'), 'user_stats', 'qt@crearpsl.net'), { totalTasks: 1 }));
});

test('user_stats: top de contribuidores solo para gerencia y coordinadores aprobados', async () => {
  await seed(['user_stats', 'ent-1'], { learningContributions: 3, name: 'Ent' });
  const top = db => getDocs(query(
    collection(db, 'user_stats'),
    orderBy('learningContributions', 'desc'),
    limit(10)
  ));

  for (const uid of ['coord-1', 'ger-1', 'ger-multi', 'dir-1']) {
    await assertSucceeds(top(dbOf(uid)));
  }
  await assertSucceeds(top(superAdminDb()));
  await assertFails(top(dbOf('ent-1')));
  await assertFails(top(dbOf('qt-1')));
  await assertFails(top(anonDb()));
});

test('user_stats: la gerencia escribe a terceros y el coordinador no', async () => {
  for (const db of [dbOf('ger-1'), dbOf('dir-1'), superAdminDb()]) {
    await assertSucceeds(setDoc(doc(db, 'user_stats', 'otro-uid'), { totalTasks: 1 }));
  }
  await assertFails(setDoc(doc(dbOf('coord-1'), 'user_stats', 'otro-uid'), { totalTasks: 1 }));
  await assertFails(setDoc(doc(anonDb(), 'user_stats', 'otro-uid'), { totalTasks: 1 }));
});

test('sync_history: create y consulta solo con el correo propio (alias incluido)', async () => {
  const ent = dbOf('ent-1');
  const entry = userEmail => ({ userEmail, timestamp: '2026-10-07T00:00:00.000Z', status: 'Éxito' });

  await assertSucceeds(addDoc(collection(ent, 'sync_history'), entry('ent@example.com')));
  await assertFails(addDoc(collection(ent, 'sync_history'), entry('coord@example.com')));
  await assertFails(addDoc(collection(ent, 'sync_history'), entry('Desconocido')));
  await assertSucceeds(addDoc(collection(dbOf('qt-1'), 'sync_history'), entry('qt@crearpsl.net')));

  const mine = (db, email) => getDocs(query(
    collection(db, 'sync_history'),
    where('userEmail', '==', email),
    orderBy('timestamp', 'desc'),
    limit(20)
  ));
  await assertSucceeds(mine(ent, 'ent@example.com'));
  await assertFails(mine(ent, 'coord@example.com'));
  await assertFails(getDocs(collection(ent, 'sync_history')));
  await assertSucceeds(getDocs(collection(dbOf('ger-1'), 'sync_history')));
  await assertSucceeds(getDocs(collection(dbOf('dir-1'), 'sync_history')));
});

test('sync_history: update y delete por el dueño o la gerencia', async () => {
  await seed(['sync_history', 'h1'], { userEmail: 'ent@example.com', status: 'Éxito' });
  await assertFails(updateDoc(doc(dbOf('coord-1'), 'sync_history', 'h1'), { status: 'x' }));
  await assertFails(deleteDoc(doc(dbOf('coord-1'), 'sync_history', 'h1')));
  await assertSucceeds(updateDoc(doc(dbOf('ent-1'), 'sync_history', 'h1'), { status: 'x' }));
  await assertSucceeds(updateDoc(doc(dbOf('ger-1'), 'sync_history', 'h1'), { status: 'y' }));
  await assertSucceeds(deleteDoc(doc(dbOf('ent-1'), 'sync_history', 'h1')));
});

test('staff_directory: lookup propio por email y emails (incluye alias .com/.net), no el ajeno', async () => {
  await seed(['staff_directory', 's1'], { email: 'ent@example.com', name: 'Ent' });
  await seed(['staff_directory', 's2'], { emails: ['qt@crearpsl.net'], name: 'QT' });
  await seed(['staff_directory', 's3'], { email: 'otro@example.com', emails: ['otro@example.com'] });

  const ent = dbOf('ent-1');
  const qt = dbOf('qt-1');
  const byEmail = (db, e) => getDocs(query(collection(db, 'staff_directory'), where('email', '==', e)));
  const byEmails = (db, e) => getDocs(query(collection(db, 'staff_directory'), where('emails', 'array-contains', e)));

  await assertSucceeds(byEmail(ent, 'ent@example.com'));
  await assertSucceeds(byEmails(ent, 'ent@example.com'));
  await assertFails(byEmail(ent, 'otro@example.com'));
  await assertFails(byEmails(ent, 'otro@example.com'));
  await assertFails(getDocs(collection(ent, 'staff_directory')));
  await assertSucceeds(getDoc(doc(ent, 'staff_directory', 's1')));
  await assertFails(getDoc(doc(ent, 'staff_directory', 's3')));

  // Caso alias: sesión @crearpsl.com consultando el documento guardado como @crearpsl.net,
  // tanto con el correo normalizado (.net) como con el correo crudo de la sesión (.com).
  await assertSucceeds(byEmails(qt, 'qt@crearpsl.net'));
  await assertSucceeds(getDoc(doc(qt, 'staff_directory', 's2')));
  await assertSucceeds(byEmails(qt, 'qt@crearpsl.com'));

  const snap = await byEmails(qt, 'qt@crearpsl.net');
  assert.equal(snap.size, 1);
});

test('staff_directory: lectura global y escritura solo para gerencia', async () => {
  await seed(['staff_directory', 's1'], { email: 'ent@example.com' });
  for (const db of [dbOf('ger-1'), dbOf('dir-1'), dbOf('ger-multi'), superAdminDb()]) {
    await assertSucceeds(getDocs(collection(db, 'staff_directory')));
    await assertSucceeds(setDoc(doc(db, 'staff_directory', 'nuevo'), { email: 'n@example.com' }));
    await assertSucceeds(updateDoc(doc(db, 'staff_directory', 's1'), { name: 'x' }));
  }
  for (const uid of ['coord-1', 'ent-1', 'qt-1']) {
    const db = dbOf(uid);
    await assertFails(setDoc(doc(db, 'staff_directory', 'x'), { email: 'x@example.com' }));
    await assertFails(updateDoc(doc(db, 'staff_directory', 's1'), { name: 'x' }));
    await assertFails(deleteDoc(doc(db, 'staff_directory', 's1')));
  }
  await assertFails(deleteDoc(doc(anonDb(), 'staff_directory', 's1')));
  await assertSucceeds(deleteDoc(doc(dbOf('ger-1'), 'staff_directory', 's1')));
});

test('qt_directory: la lectura sigue abierta a autenticados y la escritura es gerencial', async () => {
  await seed(['qt_directory', 'q1'], { email: 'qt@crearpsl.net', sede: 'Quito' });

  for (const uid of ['ent-1', 'coord-1', 'qt-1']) {
    const db = dbOf(uid);
    await assertSucceeds(getDocs(collection(db, 'qt_directory')));
    await assertSucceeds(getDoc(doc(db, 'qt_directory', 'q1')));
    await assertSucceeds(getDocs(query(collection(db, 'qt_directory'), where('email', '==', USERS[uid].email))));
    await assertSucceeds(getDocs(query(collection(db, 'qt_directory'), orderBy('index', 'asc'))));
    await assertFails(setDoc(doc(db, 'qt_directory', 'q2'), { email: 'n@example.com' }));
    await assertFails(updateDoc(doc(db, 'qt_directory', 'q1'), { sede: 'Lima' }));
    await assertFails(deleteDoc(doc(db, 'qt_directory', 'q1')));
  }
  await assertFails(getDocs(collection(anonDb(), 'qt_directory')));
  await assertFails(setDoc(doc(anonDb(), 'qt_directory', 'q2'), { email: 'n@example.com' }));

  for (const db of [dbOf('ger-1'), dbOf('ger-multi'), dbOf('dir-1'), superAdminDb()]) {
    await assertSucceeds(setDoc(doc(db, 'qt_directory', 'q2'), { email: 'n@example.com' }));
    await assertSucceeds(updateDoc(doc(db, 'qt_directory', 'q1'), { sede: 'Lima' }));
  }
  await assertSucceeds(deleteDoc(doc(dbOf('ger-1'), 'qt_directory', 'q1')));
});

test('regresión: kpi_reports y managers_directory no cambian (sigue abierto a autenticados)', async () => {
  await seed(['kpi_reports', 'k1'], { submittedByEmail: 'coord@example.com' });
  await seed(['managers_directory', 'm1'], { nombre: 'M', sede: 'Quito' });
  const ent = dbOf('ent-1');

  await assertSucceeds(getDocs(collection(ent, 'kpi_reports')));
  await assertSucceeds(addDoc(collection(ent, 'kpi_reports'), { submittedByEmail: 'ent@example.com' }));
  await assertSucceeds(updateDoc(doc(ent, 'kpi_reports', 'k1'), { status: 'reviewed' }));
  await assertSucceeds(getDocs(collection(ent, 'managers_directory')));
  await assertSucceeds(setDoc(doc(ent, 'managers_directory', 'm2'), { nombre: 'N' }));
  await assertSucceeds(updateDoc(doc(ent, 'managers_directory', 'm1'), { estado: 'Activo' }));
  await assertSucceeds(deleteDoc(doc(ent, 'managers_directory', 'm1')));
});
