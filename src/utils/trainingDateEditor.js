/**
 * trainingDateEditor.js
 * Reglas de coherencia de fechas para entrenamientos de 1 día o varios días
 * en AsignadorEntrenadores.
 */

const SINGLE_DAY_KEYWORDS = [
  'CAMINATA SOBRE FUEGO',
  'FIREWALK',
  'GROUNDING',
  'GRADUACION',
  'GRADUACIÓN',
  'CENA DE GALA',
  'INDUCCION',
  'INDUCCIÓN'
];

export function isSingleDayTrainingName(nombre) {
  const upper = String(nombre || '').trim().toUpperCase();
  if (!upper) return false;
  return SINGLE_DAY_KEYWORDS.some(k => upper.includes(k));
}

function addDaysIso(dateStr, days) {
  const match = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateStr;
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function diffDaysIso(startStr, endStr) {
  const sMatch = String(startStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const eMatch = String(endStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!sMatch || !eMatch) return 0;
  const s = Date.UTC(Number(sMatch[1]), Number(sMatch[2]) - 1, Number(sMatch[3]));
  const e = Date.UTC(Number(eMatch[1]), Number(eMatch[2]) - 1, Number(eMatch[3]));
  return Math.round((e - s) / 86400000);
}

/**
 * Actualiza el borrador del modal cuando cambia la fecha de inicio:
 * - Si `soloUnDia` está activo, `fechaFin` se sincroniza automáticamente a `nextStart`.
 * - Si es multi-día y `fechaFin` queda anterior a `nextStart`, preserva la duración previa (o usa `nextStart`).
 */
export function updateDraftStartDate(prev, nextStart) {
  const cleanStart = String(nextStart || '').slice(0, 10);
  if (prev?.soloUnDia) {
    return { ...prev, fechaInicio: cleanStart, fechaFin: cleanStart };
  }
  if (!cleanStart) {
    return { ...prev, fechaInicio: '' };
  }
  const prevSpan = (prev?.fechaInicio && prev?.fechaFin) ? diffDaysIso(prev.fechaInicio, prev.fechaFin) : 0;
  if (!prev?.fechaFin || prev.fechaFin < cleanStart) {
    const autoEnd = prevSpan > 0 ? addDaysIso(cleanStart, prevSpan) : cleanStart;
    return { ...prev, fechaInicio: cleanStart, fechaFin: autoEnd };
  }
  return { ...prev, fechaInicio: cleanStart };
}

/**
 * Cambia el modo de 1 solo día y sincroniza `fechaFin` automáticamente cuando se activa.
 */
export function toggleSingleDayMode(prev, soloUnDia) {
  const enabled = Boolean(soloUnDia);
  if (enabled) {
    return {
      ...prev,
      soloUnDia: true,
      fechaFin: prev?.fechaInicio || prev?.fechaFin || ''
    };
  }
  return {
    ...prev,
    soloUnDia: false,
    fechaFin: prev?.fechaFin || prev?.fechaInicio || ''
  };
}
