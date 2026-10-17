import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { managerDocumentRef, managerNoteMatches } from './managerPersistence.js';
import { manualManagerPatch, managerSheetPatch, managerSourceIdentities, persistManagerSheetRow } from './managerSyncPolicy.js';
import { coherenceSede, coherenceTeam } from '../utils/trainerCoherence.js';

const original = { nombre: 'Persona de prueba', sede: 'MEX', equipo: 'PRUEBA', numEquipo: 901, telefono: 'Anterior', estado: 'Activo' };

test('MEX, México and CDMX reconcile identically, without crossing other sedes', () => {
  for (const sede of ['MEX', 'México', ' CDMX ', 'Ciudad de México']) {
    assert.equal(coherenceSede(sede), 'cdmx');
  }
  assert.notEqual(coherenceSede('Lima'), coherenceSede('MEX'));
});

test('saved values, intentional blanks and manual state survive repeated stale sheet syncs', () => {
  let saved = { ...original, ...manualManagerPatch(original, { telefono: '', nombre: 'Nombre corregido', estado: 'Graduado' }) };
  for (let i = 0; i < 3; i++) saved = { ...saved, ...managerSheetPatch(saved, { ...original, rol: 'Capitan' }) };
  assert.equal(saved.nombre, 'Nombre corregido');
  assert.equal(saved.telefono, '');
  assert.equal(saved.estado, 'Graduado');
  assert.equal(saved.rol, 'Capitan', 'unmodified source fields still synchronize');
});

test('independent partial edits keep all protection markers', () => {
  const first = { ...original, ...manualManagerPatch(original, { telefono: 'Nuevo' }) };
  const second = { ...first, ...manualManagerPatch(first, { coordinador: '' }) };
  const synced = { ...second, ...managerSheetPatch(second, { telefono: 'Viejo', coordinador: 'Viejo' }) };
  assert.equal(synced.telefono, 'Nuevo');
  assert.equal(synced.coordinador, '');
});

test('saving a form does not freeze unchanged source fields or overwrite unrelated concurrent changes', () => {
  const patch = manualManagerPatch(original, { ...original, telefono: 'Nuevo' });
  assert.equal(patch._manual_telefono, true);
  assert.equal(Object.hasOwn(patch, 'estado'), false);
  assert.equal(Object.hasOwn(patch, '_manual_estado'), false);
});

test('renaming or moving a manager retains the original sheet identity, not another sede', () => {
  const first = { ...original, ...manualManagerPatch(original, { nombre: 'Corregido', equipo: 'NUEVO', numEquipo: 902, sede: 'Lima' }) };
  const second = { ...first, ...manualManagerPatch(first, { nombre: 'Corregido otra vez' }) };
  const identities = managerSourceIdentities(second);
  assert.equal(identities.length, 2);
  assert.deepEqual(identities[1], { nombre: original.nombre, sede: 'MEX', equipo: 'PRUEBA', numEquipo: 901 });
  assert.equal(coherenceSede(identities[1].sede), coherenceSede('México'));
  assert.equal(coherenceTeam(identities[1]), '901');
});

test('explicit trainer assignments remain protected alongside manual fields', () => {
  assert.deepEqual(managerSheetPatch({ entrenadorId: 'coach-id', _manual_telefono: true }, {
    entrenador: 'Hoja', tieneEntrenador: false, telefono: 'Viejo', coordinador: 'Nuevo',
  }), { coordinador: 'Nuevo' });
});

test('a manual save occurring after scan is honored inside the sync transaction', async () => {
  const current = { ...original, ...manualManagerPatch(original, { telefono: 'Guardado durante el barrido' }) };
  let written;
  const db = { runTransaction: async execute => execute({
    get: async () => ({ exists: true, data: () => current }),
    set: (ref, patch, options) => { written = { ref, patch, options }; },
  }) };
  await persistManagerSheetRow(db, 'documento-real', { telefono: 'Hoja antigua', rol: 'Manager' });
  assert.equal(written.ref, 'documento-real');
  assert.deepEqual(written.patch, { rol: 'Manager' });
  assert.deepEqual(written.options, { merge: true });
});

test('document reference requires a verified Firestore docId, never a legacy catalogue ID', async () => {
  const app = initializeApp({ projectId: 'demo-manager-persistence' }, 'manager-reference-test');
  try {
    const db = getFirestore(app);
    assert.throws(() => managerDocumentRef(db, { id: 'catalogue-only' }), /document id/);
    assert.throws(() => managerDocumentRef(db, null), /document id/);
    assert.equal(managerDocumentRef(db, { id: 'old', docId: 'real' }).path, 'managers_directory/real');
  } finally {
    await deleteApp(app);
  }
});

test('historical numeric note IDs remain linked only when unambiguous; new notes use docId', () => {
  const mexico = { docId: 'real-mexico', _legacyDirectoryId: 17 };
  const lima = { docId: 'real-lima', _legacyDirectoryId: 18 };
  assert.equal(managerNoteMatches({ tipo: 'individual', managerId: 17 }, mexico, [mexico, lima]), true);
  assert.equal(managerNoteMatches({ tipo: 'individual', managerId: '17' }, mexico, [mexico, lima]), true);
  assert.equal(managerNoteMatches({ tipo: 'individual', managerId: 17 }, lima, [mexico, lima]), false);
  assert.equal(managerNoteMatches({ tipo: 'individual', managerId: 17 }, mexico, [mexico, { ...lima, _legacyDirectoryId: 17 }]), false);
  assert.equal(managerNoteMatches({ tipo: 'individual', managerDocId: 'real-mexico' }, mexico, [mexico, lima]), true);
});
