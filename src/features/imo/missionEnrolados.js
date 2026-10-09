// Shared projection for the Monitor and background synchronization.
const dedupeEnrolados = (list) => {
  const seen = new Map();
  list.forEach((e) => {
    const idNorm = String(e.id || '').trim();
    const nombreNorm = (e.nombre || '').trim().toUpperCase().replace(/\s+/g, ' ');
    const key = idNorm ? `id:${idNorm}` : (nombreNorm ? `nom:${nombreNorm}` : '');
    if (!key) {
      // Sin nombre ni teléfono para agrupar — se conserva tal cual, por su propio id.
      seen.set(`id:${e.id}`, e);
      return;
    }
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, e);
    } else {
      seen.set(key, {
        ...prev,
        contacto: prev.contacto || e.contacto,
        asistencia: prev.asistencia || e.asistencia,
      });
    }
  });
  return Array.from(seen.values());
};

// Extrae de forma robusta la lista de enrolados combinando el array con los checks
export const getEnroladosList = (m) => {
  if (Array.isArray(m.enrolados) && m.enrolados.length > 0) {
    // Fusionar los datos estáticos del enrolado con el progreso en 'checks'
    const mapped = m.enrolados.map((enr) => {
      const chk = (m.checks && m.checks[enr.id]) || {};
      return {
        ...enr,
        contacto: chk.contacto === true,
        asistencia: chk.asistencia === true,
      };
    });
    return m.schemaVersion === 2 ? mapped : dedupeEnrolados(mapped);
  }
  const keys = Object.keys(m.checks || {});
  return keys.map((k, index) => {
    const chk = m.checks?.[k] || {};
    const cleanName = k.replace(/_/g, ' ');
    return {
      id: `${m.id}_enr_${index}_${k}`,
      nombre: cleanName,
      contacto: chk.contacto === true,
      asistencia: chk.asistencia === true,
      email: chk.email || '',
      telefono: chk.telefono || '',
      coordinadora_nombre: chk.coordinadora_nombre || m.equipo || 'Coordinación'
    };
  });
};
