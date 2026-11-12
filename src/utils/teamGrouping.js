// Dos equipos distintos pueden compartir nombre en la misma sede (ej. #122 y #124
// "KAIZEN MAINICHI"). Las vistas deben separarlos por número de equipo.

const cleanTeamName = (equipo = '') => String(equipo).replace(/\s*\(#\d+\)\s*/g, '').trim().toUpperCase();

export const isPlaceholderTeamName = (equipo = '') => {
  const clean = cleanTeamName(equipo);
  if (!clean || clean === '-' || clean === '—' || clean === 'SIN EQUIPO' || clean === 'N/A') return true;
  return /^EQUIPO\s*#?\s*\d+$/i.test(clean);
};

const explicitTeamNumber = (m) => {
  if (m?.numEquipo !== undefined && m?.numEquipo !== null && String(m.numEquipo).trim() !== '') {
    const parsed = parseInt(String(m.numEquipo).replace(/\D/g, ''), 10);
    if (!isNaN(parsed)) return String(parsed);
  }
  const match = String(m?.equipo || '').match(/#\s*(\d+)/);
  return match ? String(parseInt(match[1], 10)) : '';
};

// Devuelve una función que calcula la clave de agrupación (sede + nombre + número).
// Un integrante sin número se une al equipo homónimo solo si existe uno único;
// un integrante con nombre placeholder ('-', 'Equipo 30') y número explícito se une
// al único equipo con nombre real en la misma sede y cohorte (ej. Lima #30 TINKUY RURAY).
export const buildTeamKeyResolver = (managers = [], normalizeSede = (s) => s || '') => {
  const numbersByName = new Map();
  const namesBySedeAndNum = new Map();

  managers.forEach(m => {
    if (!m?.equipo && (m?.numEquipo === undefined || m?.numEquipo === null)) return;
    const sedeNorm = normalizeSede(m?.sede);
    const clean = cleanTeamName(m?.equipo || '');
    const num = explicitTeamNumber(m);
    if (clean) {
      const base = `${sedeNorm}_${clean}`;
      if (num) {
        if (!numbersByName.has(base)) numbersByName.set(base, new Set());
        numbersByName.get(base).add(num);
      }
    }
    if (num && !isPlaceholderTeamName(m?.equipo || '')) {
      const sedeNumKey = `${sedeNorm}#${num}`;
      if (!namesBySedeAndNum.has(sedeNumKey)) namesBySedeAndNum.set(sedeNumKey, new Set());
      namesBySedeAndNum.get(sedeNumKey).add(clean);
    }
  });

  return (m) => {
    const sedeNorm = normalizeSede(m?.sede);
    let clean = cleanTeamName(m?.equipo || '');
    let num = explicitTeamNumber(m);
    if (!num && clean) {
      const known = numbersByName.get(`${sedeNorm}_${clean}`);
      if (known && known.size === 1) num = [...known][0];
    }
    if (num && isPlaceholderTeamName(m?.equipo || '')) {
      const knownNames = namesBySedeAndNum.get(`${sedeNorm}#${num}`);
      if (knownNames && knownNames.size === 1) {
        clean = [...knownNames][0];
      }
    }
    const base = `${sedeNorm}_${clean}`;
    return num ? `${base}#${num}` : base;
  };
};
