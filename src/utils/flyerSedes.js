export const FLYER_MODE_ALL = 'todas';
export const FLYER_MODE_SINGLE = 'una';

const slug = (value) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

export function selectFlyerSedes(sedes, mode, selectedId) {
  const active = (Array.isArray(sedes) ? sedes : []).filter(s => s && s.activo && s.source !== 'sin-fechas');
  const selected = mode === FLYER_MODE_SINGLE ? active.filter(s => s.id === selectedId) : active;
  if (selected.some(s => !String(s.fechas || '').trim())) {
    return { sedes: [], error: 'Completa las fechas manuales antes de exportar el flyer.' };
  }
  if (mode !== FLYER_MODE_SINGLE) {
    if (active.length > 6) return { sedes: [], error: 'El flyer 9:16 admite hasta seis sedes. Oculta sedes o usa el modo individual.' };
    return { sedes: active, error: active.length ? null : 'Activa al menos una sede para exportar el flyer.' };
  }
  if (!active.length) return { sedes: [], error: 'No hay sedes activas. Activa una sede para generar su flyer individual.' };
  const sede = active.find(s => s.id === selectedId);
  if (!sede) return { sedes: [], error: 'Selecciona una sede activa para generar el flyer individual.' };
  return { sedes: [sede], error: null };
}

export function flyerFileName(programa, mode, sede) {
  const safeProgram = String(programa || '').trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');
  const base = `Flyer_Oficial_CPSL_${safeProgram}`;
  const sedePart = mode === FLYER_MODE_SINGLE && sede ? `_${slug(sede.ciudad) || slug(sede.id)}` : '';
  const teamPart = mode === FLYER_MODE_SINGLE && sede?.equipo ? `_${slug(sede.equipo)}` : '';
  return `${base}${sedePart}${teamPart}_1080x1920.png`;
}
