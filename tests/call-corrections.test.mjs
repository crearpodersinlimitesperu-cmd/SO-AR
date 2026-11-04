import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { canCorrectManagerCall } from '../src/config/permissions.js';
import { callHistorySignature, isActiveCall, operationalCallMetrics, callSettlement } from '../src/utils/callHistory.js';
import { assertPaymentCallsUnchanged } from '../src/services/callPaymentGuard.js';
import { managerSheetPatch } from '../src/services/managerSyncPolicy.js';
import { managersActionHelp, managersFieldHelp } from '../src/data/managersHelpContent.js';

const require = createRequire(import.meta.url);
const { createCorrectCall, isAssigned, summarize } = require('../functions/callCorrections.js');
class HttpsError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const local = /^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '');
const email = 'trainer@example.test';
const trainer = { uid: 'trainer', email, name: 'Entrenador Prueba', role: 'entrenador_llamadas' };
const original = {
  id: 'individual-duplicate', tipo: 'individual', fecha: '2026-10-28', asistio: true,
  llamadaEfectiva: true, registradoPorEmail: email, meetUrl: 'https://meet.google.com/synthetic',
  duracionMinutos: '20-30 min', notaVozEnviada: true, createdAtIso: '2026-10-28T12:00:00Z',
};
const input = overrides => ({
  tipo: 'individual', managerDocId: 'manager', callId: original.id,
  action: 'anular', motivo: 'Registrado dos veces por error', operationId: 'synthetic-correction',
  expectedRevision: 0, changes: {}, ...overrides,
});
const request = (data, uid = 'trainer', actorEmail = email) => ({ data, auth: { uid, token: { email: actorEmail } } });

test('new correction controls use centralized help without raw HTML controls', () => {
  const source = readFileSync(new URL('../src/components/CallCorrectionDialog.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /<(?:input|select|textarea|button|a)\b/);
  for (const [, tag, helpKey] of source.matchAll(/<(HelpButton|HelpInput|HelpSelect|HelpTextarea)\s+helpKey="([^"]+)"/g)) {
    assert.ok((tag === 'HelpButton' ? managersActionHelp : managersFieldHelp)[helpKey]?.text, helpKey);
  }
});

test('permission scope uses explicit identity before names and excludes inactive/simulated users', () => {
  const otherCall = { ...original, registradoPorEmail: 'other@example.test' };
  assert.equal(canCorrectManagerCall(trainer, { entrenadorId: 'other', entrenador: trainer.name }, otherCall), false);
  assert.equal(canCorrectManagerCall(trainer, { entrenadorId: 'trainer' }, otherCall), true);
  assert.equal(canCorrectManagerCall(trainer, { entrenadorEmail: email, sede: 'otra sede' }, otherCall), true);
  assert.equal(canCorrectManagerCall(trainer, { entrenador: 'Entrenador' }, otherCall), false);
  assert.equal(canCorrectManagerCall({ ...trainer, active: false }, {}, original), false);
  assert.equal(canCorrectManagerCall({ ...trainer, isSimulated: true }, {}, original), false);
  assert.equal(isAssigned({ entrenadorId: 'other', entrenadorEmail: email }, trainer), false);
  assert.equal(isAssigned({ entrenador: trainer.name }, trainer), true);
  assert.equal(isAssigned({ entrenadorEmail: 'synthetic@crearpsl.net' }, { ...trainer, email: 'synthetic@crearpsl.com' }), true);
});

test('cancelled calls stay in history but never become the latest summary or effective call', () => {
  const cancelled = { ...original, estadoRegistro: 'anulada', fecha: '2026-11-04' };
  assert.equal(isActiveCall(cancelled), false);
  assert.deepEqual(summarize([original, cancelled]), { llamadaFecha: original.fecha, llamadaAsistio: 'SI' });
  assert.deepEqual(summarize([cancelled]), { llamadaFecha: '', llamadaAsistio: '' });
  assert.notEqual(callHistorySignature([original]), callHistorySignature([cancelled]));
  assert.deepEqual(operationalCallMetrics([
    { llamadasHistorial: [original, cancelled, { ...original, tipo: 'grupal', id: 'group-copy' }] },
  ], [{ id: 'group', asistieron: 2 }, { id: 'cancelled-group', asistieron: 2, estadoRegistro: 'anulada' }]), {
    individual: 1, grupal: 1, efectivas: 2, anuladas: 2,
  });
});

test('sheet synchronization cannot resurrect cancelled calls or overwrite their history', () => {
  const existing = { llamadasHistorial: [{ ...original, estadoRegistro: 'anulada' }], llamadaFecha: '', llamadaAsistio: '' };
  assert.deepEqual(managerSheetPatch(existing, {
    llamadasHistorial: [original], llamadaFecha: original.fecha, llamadaAsistio: 'SI', telefono: 'Synthetic fixture',
  }), { telefono: 'Synthetic fixture' });
});

test('annulment removes ghost debts while preserving unaffected closures, custom amounts and paid history', () => {
  assert.deepEqual(callSettlement({ effectiveCount: 0, closed: true }), { eligible: true, amount: 25 });
  assert.deepEqual(callSettlement({ effectiveCount: 2, payment: { montoUSD: 400 } }), { eligible: true, amount: 400 });
  assert.deepEqual(callSettlement({ effectiveCount: 0, closed: true, payment: { estado: 'pendiente', montoUSD: 25 }, hasCorrections: true }), { eligible: false, amount: 0 });
  assert.deepEqual(callSettlement({ effectiveCount: 2, payment: { montoUSD: 75 }, hasCorrections: true }), { eligible: true, amount: 50 });
  assert.deepEqual(callSettlement({ effectiveCount: 0, payment: { estado: 'pagado', montoUSD: 400 }, hasCorrections: true }), { eligible: true, amount: 400 });
});

test('authenticated transactional corrections and negative Firestore rules', { skip: !local }, async t => {
  const projectId = 'demo-call-corrections';
  const env = await initializeTestEnvironment({
    projectId, firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
  const app = initializeApp({ projectId }, 'call-corrections-admin');
  const db = getFirestore(app);
  const correct = createCorrectCall({ db, FieldValue, HttpsError });
  const sourceRef = db.doc('managers_directory/manager');
  const readHistory = async () => (await sourceRef.get()).data().llamadasHistorial;
  const seed = async () => {
    await env.clearFirestore();
    await db.doc('users/trainer').set({ ...trainer, roles: ['entrenador_llamadas'], active: true });
    await db.doc('users/other').set({ name: 'Otro Entrenador', role: 'entrenador_llamadas', email: 'other@example.test' });
    await db.doc('users/director').set({ name: 'Dirección', role: 'direccion', email: 'director@example.test' });
    await sourceRef.set({
      nombre: 'Persona Sintética', entrenadorId: trainer.uid, entrenadorEmail: email,
      sede: 'Quito', equipo: 'SYNTHETIC', numEquipo: 901,
      llamadaFecha: '2026-11-04', llamadaAsistio: 'SI',
      llamadasHistorial: [
        { ...original, id: 'first-call' }, original,
        { ...original, id: 'november-call', fecha: '2026-11-04' },
      ],
    });
  };
  try {
    await t.test('annulment preserves original, updates pending amount and commits audit atomically; retries are idempotent', async () => {
      await seed();
      await db.doc('liquidaciones_pagos/indiv__manager').set({ estado: 'pendiente', montoUSD: 75, managerId: 'manager' });
      await correct(request(input()));
      const history = await readHistory();
      assert.equal(history.length, 3);
      assert.equal(history.filter(isActiveCall).length, 2);
      assert.equal(history[1].estadoRegistro, 'anulada');
      assert.equal(history[1].meetUrl, original.meetUrl);
      const ledger = (await db.doc('call_corrections/synthetic-correction').get()).data();
      assert.deepEqual(ledger.before, original);
      assert.equal(ledger.actorUid, 'trainer');
      assert.equal(ledger.motivo, input().motivo);
      assert.equal((await db.doc('audit_logs/synthetic-correction').get()).data().action, 'CORREGIR_LLAMADA');
      assert.equal((await db.doc('liquidaciones_pagos/indiv__manager').get()).data().montoUSD, 50);
      const financialAudit = (await db.doc('finanzas_audit_trail/synthetic-correction').get()).data();
      assert.equal(financialAudit.paymentChanges[0].before.montoUSD, 75);
      assert.equal(financialAudit.paymentChanges[0].patch.montoUSD, 50);
      assert.equal((await correct(request(input()))).alreadyApplied, true);
      assert.equal((await db.collection('call_corrections').get()).size, 1);
      await assert.rejects(correct(request(input({ motivo: 'Un motivo diferente' }))), { code: 'already-exists' });
    });
    await t.test('editing targets the selected call, not the last array entry; previous snapshots form a chain', async () => {
      await seed();
      await correct(request(input({ action: 'editar', changes: { fecha: '2026-10-27', asistio: false } })));
      const history = await readHistory();
      assert.equal(history[1].fecha, '2026-10-27');
      assert.equal(history[1].llamadaEfectiva, false);
      assert.equal(history[2].fecha, '2026-11-04');
      assert.equal((await sourceRef.get()).data().llamadaFecha, '2026-11-04');
      await correct(request(input({ operationId: 'second-edit', expectedRevision: 1 })));
      const ledger = (await db.doc('call_corrections/second-edit').get()).data();
      assert.equal(ledger.before.fecha, '2026-10-27');
      assert.equal(ledger.after.estadoRegistro, 'anulada');
    });
    await t.test('date-only edits preserve historical pending amounts; financial corrections require reconciliation of custom tariffs', async () => {
      await seed();
      const paymentRef = db.doc('liquidaciones_pagos/indiv__manager');
      await paymentRef.set({ estado: 'pendiente', montoUSD: 400, tarifaPorLlamada: 400 });
      await correct(request(input({ action: 'editar', changes: { fecha: '2026-10-27' } })));
      assert.equal((await paymentRef.get()).data().montoUSD, 400);
      assert.equal((await readHistory())[1].afectaLiquidacion, undefined);
      await assert.rejects(correct(request(input({ expectedRevision: 1, operationId: 'custom-tariff' }))), { code: 'failed-precondition' });
      assert.equal((await readHistory())[1].estadoRegistro, undefined);
      assert.equal((await paymentRef.get()).data().montoUSD, 400);
    });
    await t.test('other trainers, other teams, inactive profiles and forged caller roles are denied', async () => {
      await seed();
      await assert.rejects(correct(request(input(), 'other', 'other@example.test')), { code: 'permission-denied' });
      await sourceRef.update({ entrenadorId: 'other', entrenadorEmail: 'other@example.test',
        llamadasHistorial: [{ ...original, registradoPorEmail: 'other@example.test' }] });
      await assert.rejects(correct(request(input())), { code: 'permission-denied' });
      await db.doc('users/trainer').update({ active: false });
      await assert.rejects(correct({ ...request(input()), data: { ...input(), role: 'direccion' } }), { code: 'permission-denied' });
      assert.equal((await db.collection('call_corrections').get()).empty, true);
    });
    await t.test('inactive profile variants are denied independently of the client role', async () => {
      for (const disabled of [{ isActive: false }, { esActivo: false }, { status: 'BAJA confirmada' }, { roles: ['entrenador_llamadas', 'inactivo'] }]) {
        await seed();
        await db.doc('users/trainer').update(disabled);
        await assert.rejects(correct(request(input())), { code: 'permission-denied' });
        assert.deepEqual((await readHistory())[1], original);
      }
    });
    await t.test('paid and liquidated aliases are blocked; trainers cannot alter previously reversed payments', async () => {
      for (const payment of [
        { id: 'indiv__manager', estado: 'pagado' },
        { id: 'manager', estado: 'liquidado' },
        { id: 'legacy-random-id', estado: 'pagado', liquidacionKey: 'indiv__manager' },
        { id: 'imported-payment', estado: 'pendiente', managerId: 'manager', fechaPago: '2026-11-01' },
      ]) {
        await seed();
        await db.doc(`liquidaciones_pagos/${payment.id}`).set(payment);
        await assert.rejects(correct(request(input())), { code: 'failed-precondition' });
        assert.deepEqual((await readHistory())[1], original);
        assert.equal((await db.collection('call_corrections').get()).empty, true);
      }
    });
    await t.test('restoration requires superior role and preserves the annulment in the ledger', async () => {
      await seed();
      await correct(request(input()));
      const restore = input({ action: 'restaurar', expectedRevision: 1, operationId: 'restore-call', motivo: 'Duplicidad descartada tras revisión' });
      await assert.rejects(correct(request(restore)), { code: 'permission-denied' });
      await correct(request(restore, 'director', 'director@example.test'));
      assert.equal((await readHistory())[1].estadoRegistro, 'activa');
      assert.equal((await db.doc('call_corrections/restore-call').get()).data().before.estadoRegistro, 'anulada');
    });
    await t.test('cancelling the final call clears summary and zeroes pending amounts instead of resurrecting a legacy debt', async () => {
      await seed();
      await sourceRef.update({ llamadasHistorial: [original] });
      await db.doc('liquidaciones_pagos/indiv__manager').set({ estado: 'pendiente', montoUSD: 25 });
      await correct(request(input()));
      const data = (await sourceRef.get()).data();
      assert.equal(data.llamadaFecha, '');
      assert.equal(data.llamadaAsistio, '');
      assert.equal(data.llamadasHistorial.length, 1);
      assert.equal((await db.doc('liquidaciones_pagos/indiv__manager').get()).data().montoUSD, 0);
    });
    await t.test('group copies include moved members and remain coherent; incomplete copies fail closed', async () => {
      await seed();
      const group = { ...original, id: 'group-call', tipo: 'grupal', equipoKey: 'Quito_SYNTHETIC',
        equipo: 'SYNTHETIC', sede: 'Quito', asistieron: 1, totalIntegrantes: 2 };
      await db.doc('llamadas_grupales_historial/group-call').set(group);
      await sourceRef.update({ llamadasHistorial: [group] });
      await db.doc('managers_directory/moved').set({ equipo: 'OTHER', sede: 'Lima',
        llamadasHistorial: [{ ...group, asistio: false, llamadaEfectiva: false }] });
      const groupInput = input({ tipo: 'grupal', managerDocId: '', callId: 'group-call' });
      await correct(request(groupInput));
      assert.equal((await readHistory())[0].estadoRegistro, 'anulada');
      const moved = (await db.doc('managers_directory/moved').get()).data();
      assert.equal(moved.llamadasHistorial[0].estadoRegistro, 'anulada');
      assert.equal(moved.llamadasHistorial[0].asistio, false);
      assert.equal((await db.doc('llamadas_grupales_historial/group-call').get()).data().estadoRegistro, 'anulada');
      await db.doc('managers_directory/moved').delete();
      await assert.rejects(correct(request({ ...groupInput, action: 'restaurar', expectedRevision: 1,
        operationId: 'restore-group' }, 'director', 'director@example.test')), { code: 'failed-precondition' });
    });
    await t.test('group date correction retains each member attendance; paid team aliases are blocked', async () => {
      await seed();
      const group = { ...original, id: 'group-call', tipo: 'grupal', equipoKey: 'Quito_SYNTHETIC',
        equipo: 'SYNTHETIC', sede: 'Quito', asistieron: 1, totalIntegrantes: 1 };
      await db.doc('llamadas_grupales_historial/group-call').set(group);
      await sourceRef.update({ llamadasHistorial: [group] });
      const groupInput = input({ tipo: 'grupal', managerDocId: '', callId: 'group-call', action: 'editar', changes: { fecha: '2026-10-27' } });
      await correct(request(groupInput));
      assert.equal((await readHistory())[0].fecha, '2026-10-27');
      assert.equal((await readHistory())[0].asistio, true);
      await db.doc('liquidaciones_pagos/grupal__Quito_SYNTHETIC').set({ estado: 'pagado', montoUSD: 25 });
      await assert.rejects(correct(request({ ...groupInput, expectedRevision: 1, operationId: 'paid-group' })), { code: 'failed-precondition' });
    });
    await t.test('audit failure rolls back every staged source write', async () => {
      await seed();
      const broken = createCorrectCall({ db, HttpsError, FieldValue: { serverTimestamp() { throw new Error('Synthetic audit failure'); } } });
      await assert.rejects(broken(request(input())), /Synthetic audit failure/);
      assert.deepEqual((await readHistory())[1], original);
      assert.equal((await db.collection('call_corrections').get()).empty, true);
    });
    await t.test('concurrent corrections have one winner and stale revisions cannot overwrite it', async () => {
      await seed();
      const results = await Promise.allSettled([
        correct(request(input())),
        correct(request(input({ operationId: 'concurrent', action: 'editar', changes: { fecha: '2026-10-26' } }))),
      ]);
      assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
      assert.equal((await db.collection('call_corrections').get()).size, 1);
    });
    await t.test('real payment guard rejects stale individual and group snapshots', async () => {
      await seed();
      const clientDb = env.authenticatedContext('director', { email: 'director@example.test' }).firestore();
      const { runTransaction } = await import('firebase/firestore');
      const history = await readHistory();
      const item = { tipo: 'individual', managerId: 'manager', callSignature: callHistorySignature(history) };
      await runTransaction(clientDb, tx => assertPaymentCallsUnchanged(clientDb, tx, item));
      await correct(request(input()));
      await assert.rejects(runTransaction(clientDb, tx => assertPaymentCallsUnchanged(clientDb, tx, item)), /Las llamadas cambiaron/);
      const call = { ...original, id: 'guard-group', estadoRegistro: 'anulada' };
      await db.doc('llamadas_grupales_historial/guard-group').set(call);
      const groupItem = { tipo: 'grupal', callSnapshot: [{ id: call.id, signature: callHistorySignature([call]) }] };
      await db.doc('llamadas_grupales_historial/guard-group').update({ estadoRegistro: 'activa' });
      await assert.rejects(runTransaction(clientDb, tx => assertPaymentCallsUnchanged(clientDb, tx, groupItem)), /Las llamadas cambiaron/);
    });
    await t.test('rules deny bypasses, physical deletion, forged audit and trainer reassignment; legitimate registration survives', async () => {
      await seed();
      const clientDb = env.authenticatedContext('trainer', { email }).firestore();
      const otherDb = env.authenticatedContext('other', { email: 'other@example.test' }).firestore();
      const ref = doc(clientDb, 'managers_directory', 'manager');
      await assertFails(updateDoc(ref, { llamadasHistorial: [original] }));
      await assertFails(deleteDoc(ref));
      await assertFails(updateDoc(ref, { llamadaFecha: '2026-01-01' }));
      await assertFails(updateDoc(ref, { entrenadorId: 'other', entrenadorEmail: 'other@example.test' }));
      await assertFails(updateDoc(doc(otherDb, 'managers_directory', 'manager'), { llamadasHistorial: [] }));
      await assertFails(setDoc(doc(clientDb, 'call_corrections', 'forged'), { before: original, action: 'anular' }));
      const data = (await sourceRef.get()).data();
      await assertSucceeds(updateDoc(ref, { llamadasHistorial: [...data.llamadasHistorial, { ...original, id: 'new-event' }], llamadaFecha: original.fecha }));
      await assertSucceeds(updateDoc(ref, { telefono: 'Synthetic non-sensitive fixture' }));
      await db.doc('llamadas_grupales_historial/locked-group').set({ registradoPorEmail: email });
      await assertFails(updateDoc(doc(clientDb, 'llamadas_grupales_historial', 'locked-group'), { fecha: '2026-01-01' }));
      await assertFails(deleteDoc(doc(clientDb, 'llamadas_grupales_historial', 'locked-group')));
      await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'call_corrections', 'anonymous'), { action: 'anular' }));
    });
    await t.test('invalid dates, empty reasons and copy-level group edits fail without writes', async () => {
      await seed();
      await assert.rejects(correct(request(input({ motivo: '' }))), { code: 'invalid-argument' });
      await assert.rejects(correct(request(input({ action: 'editar', changes: { fecha: '2026-02-31' } }))), { code: 'invalid-argument' });
      await sourceRef.update({ llamadasHistorial: [{ ...original, tipo: 'grupal' }] });
      await assert.rejects(correct(request(input())), { code: 'failed-precondition' });
      assert.equal((await db.collection('call_corrections').get()).empty, true);
    });
  } finally {
    await env.cleanup();
    await deleteApp(app);
  }
});
