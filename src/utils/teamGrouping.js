// Dos equipos distintos pueden compartir nombre en la misma sede (ej. #122 y #124
// "KAIZEN MAINICHI"). Las vistas deben separarlos por número de equipo.

const cleanTeamName = (equipo = '') => String(equipo).replace(/\s*\(#\d+\)\s*/g, '').trim().toUpperCase();

const explicitTeamNumber = (m) => {
  if (m?.numEquipo !== undefined && m?.numEquipo !== null && String(m.numEquipo).trim() !== '') {
    const parsed = parseInt(String(m.numEquipo).replace(/\D/g, ''), 10);
    if (!isNaN(parsed)) return String(parsed);
  }
  const match = String(m?.equipo || '').match(/#\s*(\d+)/);
  return match ? String(parseInt(match[1], 10)) : '';
};

// Devuelve una función que calcula la clave de agrupación (sede + nombre + número).
// Un integrante sin número se une al equipo homónimo solo si existe uno único.
export const buildTeamKeyResolver = (managers = [], normalizeSede = (s) => s || '') => {
  const numbersByName = new Map();
  managers.forEach(m => {
    if (!m?.equipo) return;
    const base = `${normalizeSede(m.sede)}_${cleanTeamName(m.equipo)}`;
    const num = explicitTeamNumber(m);
    if (!num) return;
    if (!numbersByName.has(base)) numbersByName.set(base, new Set());
    numbersByName.get(base).add(num);
  });

  return (m) => {
    const base = `${normalizeSede(m?.sede)}_${cleanTeamName(m?.equipo || '')}`;
    let num = explicitTeamNumber(m);
    if (!num) {
      const known = numbersByName.get(base);
      if (known && known.size === 1) num = [...known][0];
    }
    return num ? `${base}#${num}` : base;
  };
};
