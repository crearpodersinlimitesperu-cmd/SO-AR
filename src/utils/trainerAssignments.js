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
