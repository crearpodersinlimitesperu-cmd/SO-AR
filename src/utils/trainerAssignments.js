export const normalizarIdentidadEntrenador = (value = '') => String(value)
  .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  .map(token => ({ fernando: 'fer', fer: 'fer' }[token] || token))
  .join(' ');

export const extraerPreasignaciones = (value = '') => {
  const seen = new Set();
  return String(value)
    .split(/[\/;,\n]+/)
    .map(name => name.trim())
    .filter(Boolean)
    .filter(name => {
      const key = normalizarIdentidadEntrenador(name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const resolverSugerenciaEntrenador = (preasignaciones, slotIndex, tieneSlotsIndependientes) => {
  if (!preasignaciones?.length) return { candidato: '', referencia: '', referenciaGeneral: false };
  if (tieneSlotsIndependientes && preasignaciones.length === 1) {
    return {
      candidato: slotIndex === 0 ? preasignaciones[0] : '',
      referencia: preasignaciones[0],
      referenciaGeneral: true,
    };
  }
  if (tieneSlotsIndependientes) {
    const candidate = preasignaciones[slotIndex] || '';
    return { candidato: candidate, referencia: candidate, referenciaGeneral: false };
  }
  if (preasignaciones.length === 1) {
    return { candidato: preasignaciones[0], referencia: preasignaciones[0], referenciaGeneral: false };
  }
  return { candidato: '', referencia: '', referenciaGeneral: false };
};

export const campoAsignacionSlot = (slot, asignacion) => ({ [slot]: asignacion });

// Resumen legible de la sugerencia del cronograma oficial para un evento, con
// la MISMA regla que usa el Asignador (por slot en Maestría; con un solo nombre
// solo se sugiere el FDS 1; varios nombres en un programa de slot único no se
// sugieren). Nunca representa un entrenador confirmado.
const FDS_MAESTRIA_SUGERENCIA = ['Creación', 'Relación', 'Gratitud'];
export const resumenSugerenciaCronograma = (nombre = '', sheetTrainer = '') => {
  const pre = extraerPreasignaciones(sheetTrainer);
  if (!pre.length) return '';
  const n = String(nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const conSlots = !n.includes('el viaje') && (n.includes('maestria') || n.includes('mj'));
  if (!conSlots) return resolverSugerenciaEntrenador(pre, 0, false).candidato;
  return FDS_MAESTRIA_SUGERENCIA
    .map((slot, i) => {
      const { candidato } = resolverSugerenciaEntrenador(pre, i, true);
      return candidato ? `${slot}: ${candidato}` : '';
    })
    .filter(Boolean)
    .join(' · ');
};
