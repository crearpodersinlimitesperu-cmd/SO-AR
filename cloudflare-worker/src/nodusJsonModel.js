const COORDINATOR_ROLES = new Set([
  'coordinador',
  'coordinador_c1',
  'coordinador_c1c2',
  'coordinador_c2',
  'coordinador_mj',
  'coord_c1',
  'coord_c1c2',
  'coord_c2',
  'coord_maestria'
]);
const MANAGEMENT_ROLES = new Set([
  'gerente',
  'direccion',
  'cfo',
  'cco',
  'ceo',
  'director_maestria',
  'socio',
  'consolidado'
]);

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function canonicalSede(value) {
  const normalized = normalize(value);
  const aliases = {
    LIM: 'LIMA',
    'SEDE-LIMA-01': 'LIMA',
    UIO: 'QUITO',
    'UIO C1': 'QUITO',
    'UIO C2': 'QUITO',
    'QUITO C1': 'QUITO',
    'QUITO C2': 'QUITO',
    CUE: 'CUENCA',
    GYE: 'GUAYAQUIL',
    MED: 'MEDELLIN',
    MEX: 'MEXICO',
    CDMX: 'MEXICO'
  };
  return aliases[normalized] || normalized;
}

function userRoles(userData) {
  const roles = Array.isArray(userData?.roles) ? userData.roles : [];
  return [...roles, userData?.role, userData?.appRole]
    .filter((role) => typeof role === 'string')
    .map((role) => role.trim().toLowerCase());
}

export function nodusAccessScope(userData, managerEmailAllowed) {
  const roles = userRoles(userData);
  if (managerEmailAllowed || roles.some((role) => MANAGEMENT_ROLES.has(role))) return { type: 'global' };
  if (roles.some((role) => COORDINATOR_ROLES.has(role))) {
    const sede = typeof userData?.sede === 'string' ? userData.sede.trim() : '';
    return sede ? { type: 'sede', sede } : { type: 'denied' };
  }
  return { type: 'general' };
}

export function filterNodusSedes(sedes, scope) {
  if (scope.type === 'global') return sedes;
  if (scope.type !== 'sede') return [];
  const requested = canonicalSede(scope.sede);
  if (!requested) return [];
  return sedes.filter((sede) => {
    const names = [sede.ciudad, sede.nombre].map(canonicalSede).filter(Boolean);
    return names.some((name) => name === requested || name.startsWith(`${requested} `));
  });
}

export function hasNodusTeamAccess(sedes, teamId) {
  return sedes.some((sede) =>
    Array.isArray(sede.equipos) && sede.equipos.some((equipo) => Number(equipo.id) === teamId)
  );
}

function countBoolean(rows, path) {
  let yes = 0;
  let no = 0;
  for (const row of rows) {
    let value = row;
    for (const part of path) value = value && typeof value === 'object' ? value[part] : undefined;
    if (value === true) yes += 1;
    else if (value === false) no += 1;
  }
  return { yes, no, unknown: rows.length - yes - no };
}

export function summarizeNodusTeam(data) {
  if (!data || !data.equipo || typeof data.equipo.nombre !== 'string' ||
      typeof data.equipo.sede !== 'string' || !Array.isArray(data.participantes)) {
    throw new TypeError('invalid_participantes_schema');
  }
  const participants = data.participantes;
  return {
    equipo: {
      id: Number(data.equipo.id),
      nombre: String(data.equipo.nombre || ''),
      sede: String(data.equipo.sede || '')
    },
    totalParticipantes: participants.length,
    capitulo1Pagado: countBoolean(participants, ['capitulo1', 'pagado']),
    capitulo1Asistio: countBoolean(participants, ['capitulo1', 'asistio']),
    capitulo1Desertor: countBoolean(participants, ['capitulo1', 'desertor']),
    capitulo2Pagado: countBoolean(participants, ['capitulo2', 'pagado']),
    maestria: countBoolean(participants, ['capitulo2', 'maestria'])
  };
}

export function summarizeNodusCatalog(sedes) {
  return sedes.reduce((total, sede) => {
    const equipos = Array.isArray(sede.equipos) ? sede.equipos : [];
    total.sedes += 1;
    total.equipos += equipos.length;
    for (const equipo of equipos) {
      const participantes = Number(equipo.participantes);
      if (!Number.isSafeInteger(participantes) || participantes < 0) {
        throw new TypeError('invalid_equipos_schema');
      }
      total.participantes += participantes;
    }
    return total;
  }, { sedes: 0, equipos: 0, participantes: 0 });
}
