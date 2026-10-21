import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import { doc, getDocFromServer, setDoc } from 'firebase/firestore';
import { recordGroupCall, recordIndividualCall, updateIndividualCallDate } from '../src/services/callHistoryService.js';

const projectId = 'demo-call-history';
const isLocalEmulator = /^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '');

test('group calls are atomic, retain each member event and are idempotent', { skip: !isLocalEmulator }, async () => {
  const env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
  const adminApp = initializeApp({ projectId }, 'call-history-test-admin');
  const adminDb = adminFirestore(adminApp);
  try {
    const managers = [
      { id: 'manager-one', docId: 'manager-one' },
      { id: 'manager-two', docId: 'manager-two' },
    ];
    for (const manager of managers) {
      await adminDb.doc(`managers_directory/${manager.docId}`).set({ nombre: manager.id });
    }

    const db = env.authenticatedContext('trainer-one', { email: 'trainer@example.test' }).firestore();
    const call = {
      callId: 'synthetic-call-001',
      managers,
      attendance: { 'manager-one': true, 'manager-two': false },
      fecha: '2026-10-21',
      equipo: 'SYNTHETIC-TEAM',
      sede: 'SYNTHETIC-SEDE',
      registradoPorEmail: 'trainer@example.test',
      registradoPorNombre: 'Entrenador sintético',
    };
    await assertSucceeds(recordGroupCall(db, call));
    await assertSucceeds(recordGroupCall(db, call));

    const history = (await assertSucceeds(getDocFromServer(doc(db, 'llamadas_grupales_historial', call.callId)))).data();
    const firstManager = (await assertSucceeds(getDocFromServer(doc(db, 'managers_directory', 'manager-one')))).data();
    const secondManager = (await assertSucceeds(getDocFromServer(doc(db, 'managers_directory', 'manager-two')))).data();
    assert.equal(history.asistieron, 1);
    assert.equal(history.totalIntegrantes, 2);
    assert.equal(firstManager.llamadaAsistio, 'SI');
    assert.equal(secondManager.llamadaAsistio, 'NO');
    assert.equal(firstManager.llamadasHistorial.length, 1);
    assert.equal(secondManager.llamadasHistorial.length, 1);
    const individualCall = {
      manager: managers[0],
      callId: 'synthetic-individual-call-001',
      fecha: '2026-10-22',
      asistio: false,
      registradoPorEmail: 'trainer@example.test',
    };
    await assertSucceeds(recordIndividualCall(db, individualCall));
    await assertSucceeds(recordIndividualCall(db, {
      ...individualCall,
      fecha: '2026-10-24',
      asistio: true,
    }));
    const afterIndividualCall = (await assertSucceeds(getDocFromServer(doc(db, 'managers_directory', 'manager-one')))).data();
    assert.equal(afterIndividualCall.llamadasHistorial.length, 2);
    assert.equal(afterIndividualCall.llamadasHistorial[0].id, call.callId);
    assert.equal(afterIndividualCall.llamadasHistorial[1].id, 'synthetic-individual-call-001');
    assert.equal(afterIndividualCall.llamadaAsistio, 'NO');
    assert.equal(afterIndividualCall.llamadaFecha, '2026-10-22');

    await assertSucceeds(updateIndividualCallDate(db, {
      manager: managers[0],
      fecha: '2026-10-23',
    }));
    const afterDateEdit = (await assertSucceeds(getDocFromServer(doc(db, 'managers_directory', 'manager-one')))).data();
    assert.equal(afterDateEdit.llamadasHistorial.length, 2, 'date edits do not append call events');
    assert.equal(afterDateEdit.llamadasHistorial[1].fecha, '2026-10-23');
    assert.equal(afterDateEdit.llamadaFecha, '2026-10-23');
    assert.equal(afterDateEdit.llamadaAsistio, 'NO');

    await assertSucceeds(recordIndividualCall(db, {
      ...individualCall,
      callId: 'synthetic-individual-call-002',
      fecha: '2026-10-25',
      asistio: true,
    }));
    const afterNextCall = (await assertSucceeds(getDocFromServer(doc(db, 'managers_directory', 'manager-one')))).data();
    assert.equal(afterNextCall.llamadasHistorial.length, 3, 'a later deliberate call creates a new event');
    assert.equal(afterNextCall.llamadasHistorial[2].id, 'synthetic-individual-call-002');
    assert.equal(afterNextCall.llamadaAsistio, 'SI');

    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'llamadas_grupales_historial', 'anonymous'), {
      equipo: 'SYNTHETIC-TEAM',
    }));
  } finally {
    await env.cleanup();
    await deleteApp(adminApp);
  }
});

test('a failed member update leaves no group event or partial attendance write', { skip: !isLocalEmulator }, async () => {
  const env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
  const adminApp = initializeApp({ projectId }, 'call-history-failure-test-admin');
  const adminDb = adminFirestore(adminApp);
  try {
    await adminDb.doc('managers_directory/existing-manager').set({ nombre: 'Original' });
    const db = env.authenticatedContext('trainer-two', { email: 'other-trainer@example.test' }).firestore();
    await assert.rejects(recordGroupCall(db, {
      callId: 'synthetic-failed-call',
      managers: [
        { id: 'existing-manager', docId: 'existing-manager' },
        { id: 'missing-manager', docId: 'missing-manager' },
      ],
      attendance: { 'existing-manager': true, 'missing-manager': false },
      fecha: '2026-10-21',
      equipo: 'SYNTHETIC-TEAM',
      sede: 'SYNTHETIC-SEDE',
    }));
    const manager = (await assertSucceeds(getDocFromServer(doc(db, 'managers_directory', 'existing-manager')))).data();
    assert.equal(manager.llamadaFecha, undefined);
    assert.equal((await assertSucceeds(getDocFromServer(doc(db, 'llamadas_grupales_historial', 'synthetic-failed-call')))).exists(), false);
  } finally {
    await env.cleanup();
    await deleteApp(adminApp);
  }
});

test('attendance validation fails before any Firestore write', async () => {
  await assert.rejects(recordGroupCall({}, {
    callId: 'synthetic-invalid-call',
    managers: [{ id: 'manager-one', docId: 'manager-one' }],
    attendance: {},
    fecha: '2026-10-21',
    equipo: 'SYNTHETIC-TEAM',
    sede: 'SYNTHETIC-SEDE',
  }), /Attendance is missing/);
});
