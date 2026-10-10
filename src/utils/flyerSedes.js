export const FLYER_MODE_ALL = 'todas';
export const FLYER_MODE_SINGLE = 'una';

const slug = (value) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

export function selectFlyerSedes(sedes, mode, selectedId) {
  const active = (Array.isArray(sedes) ? sedes : []).filter(s => s && s.activo);
  if (mode !== FLYER_MODE_SINGLE) {
    return { sedes: active, error: active.length ? null : 'Activa al menos una sede para exportar el flyer.' };
  }
  if (!active.length) return { sedes: [], error: 'No hay sedes activas. Activa una sede para generar su flyer individual.' };
  const sede = active.find(s => s.id === selectedId);
  if (!sede) return { sedes: [], error: 'Selecciona una sede activa para generar el flyer individual.' };
  return { sedes: [sede], error: null };
}

export function flyerFileName(programa, mode, sede) {
  const base = `Flyer_Oficial_CPSL_${String(programa || '').replace(/\s+/g, '_')}`;
  const sedePart = mode === FLYER_MODE_SINGLE && sede ? `_${slug(sede.ciudad) || slug(sede.id)}` : '';
  return `${base}${sedePart}_1080x1920.png`;
}
