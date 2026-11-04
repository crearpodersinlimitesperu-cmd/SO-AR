import { test, before, beforeEach, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { NON_PULSE_REPORT_TYPES } from '../../src/services/pulsePrivacy.js';

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
    await setDoc(doc(db, 'users', 'admin'), { role: 'direccion', email: 'jose.sanchez@crearpsl.net' });
    for (const sede of ['Lima', 'Quito']) for (const stage of ['C1', 'C2']) {
      await setDoc(doc(db, 'nodus_report_sources', `${sede}_${stage}`), { sede, stage, teams: [] });
      await setDoc(doc(db, 'reports', `${sede}_${stage}`), { type: 'Llamadas', sede, stage });
    }
  });
});
const client = id => env.authenticatedContext(id, { email: `${id}@example.test` }).firestore();
test('raw Nodus sources are server-only even with a matching sede/stage query', async () => {
  const db = client('c1');
  await assertFails(getDoc(doc(db, 'nodus_report_sources', 'Lima_C1')));
  await assertFails(getDoc(doc(db, 'nodus_report_sources', 'Lima_C2')));
  await assertFails(getDoc(doc(db, 'nodus_report_sources', 'Quito_C1')));
  await assertFails(getDocs(collection(db, 'nodus_report_sources')));
  await assertFails(getDocs(query(collection(db, 'nodus_report_sources'), where('sede', '==', 'Lima'), where('stage', '==', 'C1'))));
});
test('submitted call reports retain authorized sede/stage queries without cross-sede reads', async () => {
  const db = client('c1');
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
test('C2 and admin retain submitted reports, but no browser or anonymous account reads raw sources', async () => {
  await assertSucceeds(getDoc(doc(client('c2'), 'reports', 'Lima_C2')));
  await assertFails(getDoc(doc(client('c2'), 'nodus_report_sources', 'Lima_C2')));
  const admin = env.authenticatedContext('admin', { email: 'jose.sanchez@crearpsl.net' }).firestore();
  await assertFails(getDocs(collection(admin, 'nodus_report_sources')));
  await assertSucceeds(getDocs(collection(admin, 'reports')));
  await assertFails(getDoc(doc(client('unknown'), 'nodus_report_sources', 'Lima_C1')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'nodus_report_sources', 'Lima_C1')));
});
test('manager views remain scoped to their own sede and source writes stay forbidden', async () => {
  const db = client('manager');
  await assertSucceeds(getDocs(query(collection(db, 'reports'), where('type', 'in', NON_PULSE_REPORT_TYPES), where('sede', '==', 'Lima'))));
  await assertFails(getDoc(doc(db, 'reports', 'Quito_C1')));
  await assertFails(getDoc(doc(db, 'nodus_report_sources', 'Lima_C1')));
  await assertFails(setDoc(doc(db, 'nodus_report_sources', 'Lima_C2'), { sede: 'Lima', stage: 'C2' }));
});

test('Micro-Pulso answers belong to the author and Direction, never local or foreign managers', async () => {
  const own = client('c1');
  const report = { type: 'MicroPulsoStaff', sede: 'Lima', submitted_by_uid: 'c1', submitted_by_email: 'c1@example.test',
    created_at: '2026-11-04', data: { staff_id: 'c1@example.test', sede_id: 'Lima', respuestas: [{ respuesta: 'PRIVATE_ANSWER' }] } };
  await assertSucceeds(setDoc(doc(own, 'reports', 'pulse'), report));
  await assertSucceeds(getDoc(doc(own, 'reports', 'pulse')));
  await assertSucceeds(getDocs(query(collection(own, 'reports'), where('type', '==', 'MicroPulsoStaff'), where('submitted_by_uid', '==', 'c1'))));
  for (const id of ['manager', 'c2', 'other', 'unknown']) {
    await assertFails(getDoc(doc(client(id), 'reports', 'pulse')));
    await assertFails(getDocs(query(collection(client(id), 'reports'), where('type', '==', 'MicroPulsoStaff'), where('sede', '==', 'Lima'))));
  }
  const admin = env.authenticatedContext('admin', { email: 'jose.sanchez@crearpsl.net' }).firestore();
  await assertSucceeds(getDoc(doc(admin, 'reports', 'pulse')));
  await assertSucceeds(getDocs(collection(admin, 'reports')));
  await assertSucceeds(getDocs(query(collection(client('manager'), 'reports'), where('type', 'in', NON_PULSE_REPORT_TYPES),
    where('sede', '==', 'Lima'), orderBy('created_at', 'desc'), limit(50))));
  for (const change of [{ submitted_by_uid: 'other' }, { submitted_by_email: 'other@example.test' }, { sede: 'Quito' }, { sede: 'Global' },
    { data: { ...report.data, staff_id: 'other@example.test' } }, { data: { ...report.data, sede_id: 'Quito' } }]) {
    await assertFails(setDoc(doc(own, 'reports', 'spoofed'), { ...report, ...change }));
  }
  const manager = client('manager');
  for (const change of [{ type: 'FDS' }, { submitted_by_uid: 'manager' }, { data: {} }, { reviewedBy: 'Manager' }]) {
    await assertFails(updateDoc(doc(manager, 'reports', 'pulse'), change));
  }
  await assertFails(deleteDoc(doc(manager, 'reports', 'pulse')));
  await assertSucceeds(updateDoc(doc(admin, 'reports', 'pulse'), { reviewedBy: 'Direction' }));
  await assertFails(updateDoc(doc(admin, 'reports', 'pulse'), { type: 'FDS' }));
});

test('legacy pulse identity does not override a conflicting UID; revocation blocks authors and Direction', async () => {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'reports', 'legacy'), { type: 'MicroPulsoStaff', sede: 'Lima', submitted_by_email: 'c1@example.test' });
    await setDoc(doc(db, 'reports', 'contradictory'), { type: 'MicroPulsoStaff', sede: 'Lima', submitted_by_uid: 'other', submitted_by_email: 'c1@example.test' });
  });
  await assertSucceeds(getDoc(doc(client('c1'), 'reports', 'legacy')));
  await assertFails(getDoc(doc(client('c1'), 'reports', 'contradictory')));
  await env.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), 'users', 'c1'), { active: false });
    await updateDoc(doc(context.firestore(), 'users', 'admin'), { active: false });
  });
  await assertFails(getDoc(doc(client('c1'), 'reports', 'legacy')));
  const admin = env.authenticatedContext('admin', { email: 'jose.sanchez@crearpsl.net' }).firestore();
  await assertFails(getDoc(doc(admin, 'reports', 'legacy')));
});

test('pulse authority denies every administrative inactive marker and contradictory profile UID', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'reports', 'own'), {
      type: 'MicroPulsoStaff', sede: 'Lima', submitted_by_uid: 'c1', submitted_by_email: 'c1@example.test'
    });
  });
  for (const marker of [{ active: false }, { isActive: false }, { esActivo: false },
    { status: 'INACTIVE' }, { estado: 'Baja' }, { roles: ['coord_c1', 'inactivo'] }, { uid: 'foreign' }]) {
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users', 'c1'), {
        uid: 'c1', email: 'c1@example.test', role: 'coord_c1', sede: 'Lima', ...marker
      });
    });
    await assertFails(getDoc(doc(client('c1'), 'reports', 'own')));
  }
});
