import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import { doc, setDoc, updateDoc, getDocFromServer } from 'firebase/firestore';
import { manualManagerPatch, persistManagerSheetRow } from '../src/services/managerSyncPolicy.js';
import { managerDocumentRef } from '../src/services/managerPersistence.js';

const projectId = 'demo-manager-persistence';
let env;
let adminApp;
let adminDb;
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Only run against an explicit emulator, never production');
  env = await initializeTestEnvironment({
    projectId, firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
  adminApp = initializeApp({ projectId }, 'manager-persistence-emulator');
  adminDb = adminFirestore(adminApp);
});
after(async () => {
  await env?.cleanup();
  if (adminApp) await deleteApp(adminApp);
});

test('actual Firestore commit, stale sync and fresh client read preserve the manual Mexico edit', async () => {
  const source = { id: 'old-catalogue-id', nombre: 'Persona Prueba', sede: 'MEX', equipo: 'TEST', numEquipo: 901, telefono: 'Anterior' };
  await adminDb.doc('managers_directory/actual-doc-id').set(source);
  const db = env.authenticatedContext('gerente-mexico', { email: 'manager@example.test' }).firestore();
  const ref = managerDocumentRef(db, { ...source, docId: 'actual-doc-id' });
  await assertSucceeds(updateDoc(ref, manualManagerPatch(source, { nombre: 'Corregido', telefono: '', equipo: 'ACTUAL' })));
  await persistManagerSheetRow(adminDb, adminDb.doc(ref.path), { ...source, rol: 'Capitan' });
  const saved = (await assertSucceeds(getDocFromServer(ref))).data();
  assert.equal(saved.nombre, 'Corregido');
  assert.equal(saved.telefono, '');
  assert.equal(saved.equipo, 'ACTUAL');
  assert.equal(saved.rol, 'Capitan');
  assert.equal(saved._sheetIdentity.nombre, source.nombre);
  assert.equal((await getDocFromServer(doc(db, 'managers_directory', source.id))).exists(), false);
  const anotherSession = env.authenticatedContext('gerente-mexico-reload', { email: 'manager@example.test' }).firestore();
  assert.equal((await getDocFromServer(doc(anotherSession, ref.path))).data().nombre, 'Corregido');
});

test('anonymous write is denied and updating a missing row never creates a catalogue ghost', async () => {
  const unauthenticated = env.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(unauthenticated, 'managers_directory', 'denied'), { nombre: 'No permitido' }));
  const db = env.authenticatedContext('operator', { email: 'operator@example.test' }).firestore();
  await assertFails(updateDoc(doc(db, 'managers_directory', 'missing'), { telefono: 'No upsert' }));
  assert.equal((await getDocFromServer(doc(db, 'managers_directory', 'missing'))).exists(), false);
});
