import { test, before, beforeEach, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, query, where, setDoc } from 'firebase/firestore';

if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) throw new Error('Local emulator required; refusing production.');
let env;
before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-nodus-reports', firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') } }); });
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const [id, role, sede] of [['c1', 'coord_c1', 'Lima'], ['c2', 'coord_c2', 'Lima'], ['other', 'coord_c1', 'Quito'], ['manager', 'gerente', 'LIM']]) {
      await setDoc(doc(db, 'users', id), { uid: id, email: `${id}@example.test`, role, roles: [role], sede });
    }
    for (const sede of ['Lima', 'Quito']) for (const stage of ['C1', 'C2']) {
      await setDoc(doc(db, 'nodus_report_sources', `${sede}_${stage}`), { sede, stage, teams: [] });
      await setDoc(doc(db, 'reports', `${sede}_${stage}`), { type: 'Llamadas', sede, stage });
    }
  });
});
const client = id => env.authenticatedContext(id, { email: `${id}@example.test` }).firestore();
test('coordinators can read only their sede and stage, including filtered queries', async () => {
  const db = client('c1');
  await assertSucceeds(getDoc(doc(db, 'nodus_report_sources', 'Lima_C1')));
  await assertFails(getDoc(doc(db, 'nodus_report_sources', 'Lima_C2')));
  await assertFails(getDoc(doc(db, 'nodus_report_sources', 'Quito_C1')));
  await assertFails(getDocs(collection(db, 'nodus_report_sources')));
  await assertSucceeds(getDocs(query(collection(db, 'nodus_report_sources'), where('sede', '==', 'Lima'), where('stage', '==', 'C1'))));
  await assertSucceeds(getDocs(query(collection(db, 'reports'), where('type', '==', 'Llamadas'), where('sede', '==', 'Lima'), where('stage', '==', 'C1'))));
  await assertFails(getDocs(collection(db, 'reports')));
  await assertFails(getDoc(doc(db, 'reports', 'Lima_C2')));
  await assertFails(getDoc(doc(db, 'reports', 'Quito_C1')));
});
test('writes cannot spoof sede, stage, sender or source; clients cannot overwrite Nodus', async () => {
  const db = client('c1');
  const report = { type: 'Llamadas', sede: 'Lima', stage: 'C1', submitted_by_email: 'c1@example.test', team_number: '32', source: 'nodus-reviewed' };
  await assertSucceeds(setDoc(doc(db, 'reports', 'new'), report));
  for (const change of [{ sede: 'Quito' }, { stage: 'C2' }, { submitted_by_email: 'other@example.test' }, { team_number: '' }, { source: 'fake' }]) await assertFails(setDoc(doc(db, 'reports', 'spoof'), { ...report, ...change }));
  await assertFails(setDoc(doc(db, 'nodus_report_sources', 'Lima_C1'), { sede: 'Lima', stage: 'C1', teams: [] }));
});
test('C2 is not blocked, admin reads all, anonymous and unassigned users are denied', async () => {
  await assertSucceeds(getDoc(doc(client('c2'), 'nodus_report_sources', 'Lima_C2')));
  const admin = env.authenticatedContext('admin', { email: 'jose.sanchez@crearpsl.net' }).firestore();
  await assertSucceeds(getDocs(collection(admin, 'nodus_report_sources')));
  await assertSucceeds(getDocs(collection(admin, 'reports')));
  await assertFails(getDoc(doc(client('unknown'), 'nodus_report_sources', 'Lima_C1')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'nodus_report_sources', 'Lima_C1')));
});
test('manager views remain scoped to their own sede and source writes stay forbidden', async () => {
  const db = client('manager');
  await assertSucceeds(getDocs(query(collection(db, 'reports'), where('sede', '==', 'Lima'))));
  await assertFails(getDoc(doc(db, 'reports', 'Quito_C1')));
  await assertFails(setDoc(doc(db, 'nodus_report_sources', 'Lima_C2'), { sede: 'Lima', stage: 'C2' }));
});
