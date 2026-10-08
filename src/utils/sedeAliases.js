import { canonicalSede } from './sede.js';

// Valores de `sede` conocidos por sede canónica (C-02). Deben coincidir con
// SEDE_ALIASES de functions/directoryScope.js y con sedeAliasList() de
// firestore.rules (los tests lo verifican). Cada lista cabe en un `in` (<= 30).
export const SEDE_ALIASES = {
  'Quito': ['Quito', 'QUITO', 'quito', 'UIO', 'uio', 'Quito C1', 'Quito C2', 'Quito Ciclo 1', 'Quito Ciclo 2', 'QUITO C1', 'QUITO C2', 'Quito ciclo 1', 'Quito ciclo 2'],
  'Medellín': ['Medellín', 'Medellin', 'MEDELLIN', 'MEDELLÍN', 'medellin', 'medellín', 'MED', 'Med'],
  'Lima': ['Lima', 'LIMA', 'lima', 'LIM'],
  'Cuenca': ['Cuenca', 'CUENCA', 'cuenca', 'CUE'],
  'Guayaquil': ['Guayaquil', 'GUAYAQUIL', 'guayaquil', 'GYE'],
  'México': ['México', 'Mexico', 'MEXICO', 'MÉXICO', 'mexico', 'CDMX', 'MEX'],
  'Internacional': ['Internacional', 'INTERNACIONAL', 'INT']
};

// Sin sede utilizable: vacía, Global/Sede Global o "Sin Sede".
export const hasUsableSede = (sede) => {
  const c = String(canonicalSede(sede) || '').trim().toLowerCase();
  return c !== '' && c !== 'global' && c !== 'sin sede';
};

export const sameCanonicalSede = (a, b) =>
  hasUsableSede(a) && hasUsableSede(b) && canonicalSede(a) === canonicalSede(b);

// Valores válidos para `where('sede','in', ...)`. Solo aliases canónicos
// conocidos (más el valor propio si la sede no tiene alias, igual que las reglas).
export const sedeAliasList = (sede) => {
  if (!hasUsableSede(sede)) return [];
  const canon = canonicalSede(sede);
  return SEDE_ALIASES[canon] ? [...SEDE_ALIASES[canon]] : [String(sede)];
};
