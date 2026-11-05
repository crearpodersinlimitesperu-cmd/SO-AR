export const STORAGE_KEY = 'crear.guia-c2.preparacion.v1';

export function decodeProgress(raw, allowedIds) {
  if (raw === null) return [];
  const value = JSON.parse(raw);
  if (!Array.isArray(value) || value.some(id => typeof id !== 'string' || !allowedIds.includes(id))) {
    throw new Error('El progreso guardado no tiene el formato esperado.');
  }
  return [...new Set(value)];
}
