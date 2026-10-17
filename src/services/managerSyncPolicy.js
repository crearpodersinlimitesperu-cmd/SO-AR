import { preserveExplicitTrainerAssignment } from '../utils/trainerCoherence.js';

const editableFields = [
  'nombre', 'rol', 'telefono', 'sede', 'equipo', 'numEquipo',
  'entrenador', 'tieneEntrenador', 'coordinador', 'estado',
];

export function managerSourceIdentities(manager) {
  return manager._sheetIdentity ? [manager, manager._sheetIdentity] : [manager];
}

export function manualManagerPatch(manager, changes) {
  const patch = Object.fromEntries(Object.entries(changes).filter(([field, value]) =>
    !manager || !editableFields.includes(field) || value !== manager[field]
  ));
  const identity = manager?._sheetIdentity || Object.fromEntries(
    ['nombre', 'sede', 'equipo', 'numEquipo'].map(field => [field, manager?.[field] ?? changes[field] ?? ''])
  );
  return {
    ...patch,
    _sheetIdentity: identity,
    ...Object.fromEntries(editableFields.filter(field => Object.hasOwn(patch, field))
      .map(field => [`_manual_${field}`, true])),
    _manualUpdatedAt: new Date().toISOString(),
  };
}

export function managerSheetPatch(existing, incoming) {
  const trainerSafe = preserveExplicitTrainerAssignment(existing, incoming);
  return Object.fromEntries(Object.entries(trainerSafe).filter(([field]) =>
    existing?.[`_manual_${field}`] !== true && !field.startsWith('_manual') &&
    field !== '_sheetIdentity'
  ));
}

// Read the latest protection markers inside the write transaction, not at the
// beginning of a long sheet scan: an operator may save while the sync is running.
export async function persistManagerSheetRow(db, ref, incoming) {
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const patch = managerSheetPatch(snapshot.exists ? snapshot.data() : null, incoming);
    if (patch) transaction.set(ref, patch, { merge: true });
  });
}
