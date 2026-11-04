const COORDINATOR_ROLES = new Set([
  'gerente',
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
  'direccion',
  'cfo',
  'cco',
  'ceo',
  'director_maestria',
  'socio'
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
  const city = aliases[normalized] || normalized.replace(/\s+(?:CICLO|CAPITULO|C)\s*[12]$/, '').trim();
  return ['LIMA', 'QUITO', 'CUENCA', 'GUAYAQUIL', 'MEDELLIN', 'MEXICO'].includes(city)
    ? city : city === 'CIUDAD DE MEXICO' ? 'MEXICO' : '';
}

function userRoles(userData) {
  const roles = Array.isArray(userData?.roles) ? userData.roles : [];
  return [...roles, userData?.role, userData?.appRole, userData?.rol]
    .filter((role) => typeof role === 'string')
    .map((role) => role.trim().toLowerCase());
}

export function nodusAccessScope(userData, globalEmailAllowed) {
  const roles = userRoles(userData);
  if (userData?.active === false || userData?.isActive === false || userData?.esActivo === false ||
      roles.includes('inactivo') || /inactiv|baja|renuncia|desvinculado/i.test(`${userData?.status || ''} ${userData?.estado || ''}`)) {
    return { type: 'denied' };
  }
  if (globalEmailAllowed || roles.some((role) => MANAGEMENT_ROLES.has(role))) return { type: 'global' };
  if (roles.some((role) => COORDINATOR_ROLES.has(role))) {
    const assigned = [userData?.sede, ...Object.entries(userData?.roleSedes || {})
      .filter(([role]) => roles.includes(role.toLowerCase()) && COORDINATOR_ROLES.has(role.toLowerCase()))
      .map(([, sede]) => sede)].filter(value => typeof value === 'string' && canonicalSede(value));
    const sedes = [...new Map(assigned.map(value => [canonicalSede(value), value.trim()])).values()];
    return sedes.length ? { type: 'sede', sede: sedes[0], ...(sedes.length > 1 ? { sedes } : {}) } : { type: 'denied' };
  }
  return { type: 'general' };
}

export function filterNodusSedes(sedes, scope) {
  if (scope.type === 'global') return sedes;
  if (scope.type !== 'sede') return [];
  const requested = (scope.sedes || [scope.sede]).map(canonicalSede).filter(Boolean);
  if (!requested.length) return [];
  return sedes.filter((sede) => {
    const names = [sede.ciudad, sede.nombre].map(canonicalSede).filter(Boolean);
    return names.length > 0 && new Set(names).size === 1 && requested.includes(names[0]);
  });
}

const COUNT_FIELDS = [
  'asignados', 'confirmados', 'porConfirmar', 'noContesta', 'noInteresa', 'llamadas', 'asistieron',
  'asignadosTotal', 'confirmadosTotal', 'gestionesTotal', 'sentadosTotal', 'sentadosC1',
  'coberturaPct', 'tasaEfectividad', 'totalParticipantes', 'totalCoordinadores', 'totalEquipos',
  'totalAsignados', 'totalConfirmados', 'totalGestiones', 'totalSentados', 'confirmado',
  'gestiones', 'c1', 'c2', 'mj', 'sentadosC2', 'gestionesC1', 'gestionesC2', 'confirmadosC1',
  'confirmadosC2', 'siguiente', 'yaAsistio', 'devolucion', 'productividadPct',
  'coordinadoresCount', 'noContestaTotal', 'porConfirmarTotal', 'asistieronTotal',
  'c1Total', 'c2Total', 'mjTotal', 'totalNoContesta', 'totalPorConfirmar', 'totalSiguiente',
  'totalNoInteresa', 'totalAsistieron', 'coberturaPromedio', 'productividadPromedio',
  'desertores', 'sinMarcar', 'rezagados', 'confirmadosLlamada'
];
const pickCounts = data => Object.fromEntries(COUNT_FIELDS.filter(field =>
  data?.[field] !== undefined && data[field] !== null && data[field] !== '' &&
  ['number', 'string'].includes(typeof data[field]) && Number.isFinite(Number(data[field])) &&
  Number(data[field]) >= 0
).map(field => [field, data[field]]));

export function scopedNodusContext(snapshot, scope) {
  if (scope.type === 'denied') throw new Error('Nodus scope denied');
  if (scope.type === 'global') return snapshot;
  const timestamp = snapshot?.timestamp || null;
  if (!['sede', 'personal'].includes(scope.type)) return { timestamp, totales: pickCounts(snapshot?.totales) };
  const visible = rows => (Array.isArray(rows) ? rows : []).filter(row =>
    filterNodusSedes([{ nombre: row?.sede }], scope).length > 0);
  const coordinadores = scope.type === 'personal'
    ? (Array.isArray(snapshot?.coordinadores) ? snapshot.coordinadores : []).filter(row =>
      typeof row?.email === 'string' && scope.emails.includes(row.email.trim().toLowerCase()))
    : visible(snapshot?.coordinadores);
  return {
    timestamp,
    sedes: visible(snapshot?.sedes).map(row => ({ sede: row.sede, ...pickCounts(row) })),
    coordinadores: coordinadores.map(row => ({
      sede: row.sede,
      ...Object.fromEntries(['id', 'nombre', 'nombreCompleto', 'name', 'email', 'rol', 'role', 'ciclo'].filter(field =>
        typeof row[field] === 'string').map(field => [field, row[field]])),
      ...pickCounts(row),
      ...(row.estados ? { estados: pickCounts(row.estados) } : {}),
      ...(Array.isArray(row.equipos) ? { equipos: row.equipos
        .filter(team => !team.incoherenciaSedes && (!canonicalSede(team.sedeInferida) ||
          canonicalSede(team.sedeInferida) === canonicalSede(row.sede)))
        .map(team => ({
          ...Object.fromEntries(['equipo', 'equipoNombre', 'fase', 'capitulo', 'ciclo'].filter(field =>
            typeof team[field] === 'string').map(field => [field, team[field]])),
          ...pickCounts(team)
        })) } : {})
    })),
    equiposSummary: visible(snapshot?.equiposSummary).map(row => ({
      sede: row.sede,
      ...Object.fromEntries(['equipo', 'equipoNombre', 'numEquipo'].filter(field =>
        ['number', 'string'].includes(typeof row[field])).map(field => [field, row[field]])),
      ...pickCounts(row)
    }))
  };
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
