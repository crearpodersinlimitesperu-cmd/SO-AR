/**
 * trainingTypeFilter.js
 * Filtro individual y múltiple de tipos de entrenamiento para Home.jsx
 */

export const TRAINING_FILTER_TYPES = [
  { id: 'C1', label: 'Capítulo 1' },
  { id: 'C2', label: 'Capítulo 2' },
  { id: 'MJ', label: 'Maestría del Juego' },
  { id: 'CAMINATA', label: 'Caminata sobre Fuego' },
  { id: 'TANQUE', label: 'Tanque' },
  { id: 'CONFIANZA', label: 'Noche de Confianza' },
  { id: 'VIAJE', label: 'Viajes / Retiros' },
  { id: 'OTROS', label: 'Otros Especiales' }
];

const normalizeUpper = (str) => String(str || '')
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

export function matchesTrainingType(eventName, typeId) {
  const name = normalizeUpper(eventName);
  switch (typeId) {
    case 'C1':
      return name.includes('CAPITULO UNO') || /\bCAPITULO\s*1\b/.test(name) || /\bC1\b/.test(name);
    case 'C2':
      return name.includes('CAPITULO DOS') || /\bCAPITULO\s*2\b/.test(name) || /\bC2\b/.test(name);
    case 'MJ':
      return name.includes('MAESTRIA') || /\bMJ\b/.test(name);
    case 'CAMINATA':
      return name.includes('CAMINATA') || name.includes('FIREWALK') || name.includes('FUEGO');
    case 'TANQUE':
      return name.includes('TANQUE');
    case 'CONFIANZA':
      return name.includes('CONFIANZA');
    case 'VIAJE':
      return name.includes('VIAJE') || name.includes('RETIRO');
    case 'OTROS':
      return !name.includes('CAPITULO') &&
        !/\bC[12]\b/.test(name) &&
        !name.includes('MAESTRIA') &&
        !/\bMJ\b/.test(name) &&
        !name.includes('VIAJE') &&
        !name.includes('RETIRO') &&
        !name.includes('CAMINATA') &&
        !name.includes('FIREWALK') &&
        !name.includes('FUEGO') &&
        !name.includes('TANQUE') &&
        !name.includes('CONFIANZA');
    default:
      return true;
  }
}

/**
 * Filtra un evento por una lista de tipos seleccionados ([] = todos).
 * Soporta uno o varios tipos al mismo tiempo (ej. ['TANQUE', 'CAMINATA']).
 */
export function matchesSelectedTrainingTypes(eventName, selectedTypes) {
  if (!Array.isArray(selectedTypes) || selectedTypes.length === 0) return true;
  return selectedTypes.some(typeId => matchesTrainingType(eventName, typeId));
}

export function formatSelectedTrainingLabel(selectedTypes) {
  if (!Array.isArray(selectedTypes) || selectedTypes.length === 0) {
    return 'Todos los tipos';
  }
  const labels = selectedTypes
    .map(id => TRAINING_FILTER_TYPES.find(t => t.id === id)?.label || id);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} + ${labels[1]}`;
  return `${labels[0]} +${labels.length - 1} más`;
}
