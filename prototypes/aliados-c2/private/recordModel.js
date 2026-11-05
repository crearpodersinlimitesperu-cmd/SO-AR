export const preparationIds = [
  'tecnica', 'espacio', 'partner', 'resultados', 'coreografia',
  'angeles', 'identificacion', 'acapela', 'feedback',
];
const phases = ['todo', 'puente', 'sede', 'entrenamiento', 'despues'];

export function nextRecord(previous, action) {
  const current = previous ?? { completed: [], revision: 0 };
  if (!Array.isArray(current.completed)
    || current.completed.some(id => !preparationIds.includes(id))
    || new Set(current.completed).size !== current.completed.length
    || !Number.isSafeInteger(current.revision) || current.revision < 0) {
    throw new Error('El registro recibido no tiene un formato válido. No se sobrescribió.');
  }
  if (!action || !['check', 'uncheck', 'reset', 'phase', 'reference'].includes(action.kind)) {
    throw new Error('La interacción no es válida.');
  }
  let completed = [...current.completed];
  if (action.kind === 'check' || action.kind === 'uncheck') {
    if (!preparationIds.includes(action.target)) throw new Error('El acuerdo de preparación no existe.');
    completed = action.kind === 'check'
      ? [...new Set([...completed, action.target])]
      : completed.filter(id => id !== action.target);
  } else if (action.kind === 'reset') {
    if (action.target !== 'preparation') throw new Error('El destino del borrado no es válido.');
    completed = [];
  } else if (action.kind === 'phase') {
    if (!phases.includes(action.target)) throw new Error('La fase no existe.');
  } else if (!['0', '1', '2', '3'].includes(action.target)) {
    throw new Error('La consulta no existe.');
  }
  return { completed, revision: current.revision + 1, previousRevision: current.revision };
}
