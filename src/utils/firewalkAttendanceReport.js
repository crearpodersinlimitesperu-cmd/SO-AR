import { normalizeLimaDocNumber, normalizeLimaPersonName } from './limaContractUniqueness.js';

export const EQUIPO_OPTIONS = [
  { value: '', label: '— Sin equipo asignado —' },
  { value: 'Equipo 33', label: 'Equipo 33' },
  { value: 'Equipo 32', label: 'Equipo 32' },
  { value: 'Equipo 31', label: 'Equipo 31' },
  { value: 'Equipo 30', label: 'Equipo 30' },
  { value: 'Equipo 29', label: 'Equipo 29' },
  { value: 'Equipo 28', label: 'Equipo 28' },
  { value: 'C2', label: 'C2 (Directo)' },
  { value: '1er FDS', label: '1er FDS (Directo)' },
  { value: '2do FDS', label: '2do FDS (Directo)' },
  { value: '3er. FDS', label: '3er. FDS (Directo)' },
  { value: '4to FDS', label: '4to FDS (Directo)' },
  { value: 'Aliados', label: 'Aliados' },
  { value: 'Staff', label: 'Staff / Oficina / Entrenador' }
];

export const CATEGORIA_REPORTE_OPTIONS = [
  { value: 'Px', label: 'Px · Participante' },
  { value: 'MG', label: 'MG · Manager / Capitán' },
  { value: 'Aliados', label: 'Aliados' },
  { value: 'Staff', label: 'Staff / Oficina / Entrenador' }
];

export const BLOQUE_REPORTE_OPTIONS = [
  { value: 'C2', label: 'C2' },
  { value: '1er FDS', label: '1er FDS' },
  { value: '2do FDS', label: '2do FDS' },
  { value: '3er. FDS', label: '3er. FDS' },
  { value: '4to FDS', label: '4to FDS' },
  { value: 'Equipo Propio', label: 'Mostrar nombre del Equipo' },
  { value: 'Aliados', label: 'Aliados (Pie)' },
  { value: 'Staff', label: 'Staff / Apoyo' },
  { value: 'Ocultar', label: 'No incluir en bloques FDS' }
];

export const DEFAULT_TEAM_BLOCK_MAP = {
  'Equipo 33': 'C2',
  'Equipo 32': 'C2',
  'Equipo 31': '1er FDS',
  'Equipo 30': '2do FDS',
  'Equipo 29': '3er. FDS',
  'Equipo 28': 'Ocultar'
};

export const TEAM_MAPPING_PRESETS = [
  {
    id: 'C2_MAS_3FDS',
    label: 'C2 + 3 FDS (E32=C2 · E31=1er · E30=2do · E29=3er)',
    map: {
      'Equipo 33': 'C2',
      'Equipo 32': 'C2',
      'Equipo 31': '1er FDS',
      'Equipo 30': '2do FDS',
      'Equipo 29': '3er. FDS',
      'Equipo 28': 'Ocultar'
    }
  },
  {
    id: 'SOLO_3FDS_E32_1ER',
    label: 'Ciclo FDS (E32=1er · E31=2do · E30=3er · E29=4to)',
    map: {
      'Equipo 33': 'C2',
      'Equipo 32': '1er FDS',
      'Equipo 31': '2do FDS',
      'Equipo 30': '3er. FDS',
      'Equipo 29': '4to FDS',
      'Equipo 28': 'Ocultar'
    }
  },
  {
    id: 'POR_NOMBRE_EQUIPO',
    label: 'Por Número de Equipo (Equipo 32, 31, 30, 29)',
    map: {
      'Equipo 33': 'Equipo Propio',
      'Equipo 32': 'Equipo Propio',
      'Equipo 31': 'Equipo Propio',
      'Equipo 30': 'Equipo Propio',
      'Equipo 29': 'Equipo Propio',
      'Equipo 28': 'Equipo Propio'
    }
  }
];

export const ACTIVE_STUDENT_TEAMS = new Set([
  'Equipo 33',
  'Equipo 32',
  'Equipo 31',
  'Equipo 30',
  'Equipo 29',
  'Equipo 28'
]);

export function canonicalizeEquipoName(rawEquipo) {
  const s = String(rawEquipo || '').trim();
  if (!s) return '';
  const m = s.match(/equipo\s*(\d+)/i);
  if (m) return `Equipo ${m[1]}`;
  if (/^c2$/i.test(s)) return 'C2';
  if (/^1(er|ro)?\s*fds$/i.test(s)) return '1er FDS';
  if (/^2(do)?\s*fds$/i.test(s)) return '2do FDS';
  if (/^3(er|ro)?\.?\s*fds$/i.test(s)) return '3er. FDS';
  if (/^4(to)?\s*fds$/i.test(s)) return '4to FDS';
  if (/^aliad/i.test(s)) return 'Aliados';
  if (/^staff/i.test(s)) return 'Staff';
  return s;
}

export function deriveDefaultCategoriaFromRol(rolRaw) {
  const r = String(rolRaw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (!r || r.includes('participante')) return 'Px';
  if (r.includes('manager') || r.includes('capitan') || r.includes('partner')) return 'MG';
  if (r.includes('aliad')) return 'Aliados';
  return 'Staff';
}

export function getFirewalkPersonKey(record = {}) {
  const normDoc = normalizeLimaDocNumber(
    record.numeroDocumentoNorm || record.numeroDocumento || record.doc || ''
  );
  if (normDoc && normDoc.length >= 4) {
    return `doc_${normDoc}`;
  }
  const cleanId = String(record.id || record.code || record.verificationCode || '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 48);
  return cleanId ? `id_${cleanId}` : '';
}

/**
 * Cruza un registro firmado contra Nodus en vivo y el Padrón Lima 111.
 * Reglas de seguridad operativa:
 * - Para Participantes (`Px`), si coincide en Nodus o Padrón dentro de los equipos activos (`Equipo 28–33`),
 *   auto-asigna ese equipo (`AUTO_NODUS` / `AUTO_PADRON`).
 * - Para Managers / Capitanes (`MG`), solo auto-asigna si está explícitamente asignado a una cohorte activa
 *   en el Padrón Lima (`Equipo 29–32`). Si en Nodus aparece en un equipo antiguo de graduación (`Equipo 18`, `22`, etc.),
 *   NO lo asigna falsamente a ese equipo antiguo; deja `equipo: ''` y expone `graduadoRef` para que coordinación
 *   lo asigne con 1 clic al FDS/Equipo donde está sirviendo como MG.
 */
export function resolveAutoTeamMatch(record, { padronList = [], nodusIndex = null } = {}) {
  const defaultCat = deriveDefaultCategoriaFromRol(record.rol || record.rolActividad);
  if (defaultCat === 'Aliados') {
    return { autoEquipo: 'Aliados', source: 'AUTO_ROL', graduadoRef: '' };
  }
  if (defaultCat === 'Staff') {
    return { autoEquipo: 'Staff', source: 'AUTO_ROL', graduadoRef: '' };
  }

  const normDoc = normalizeLimaDocNumber(
    record.numeroDocumentoNorm || record.numeroDocumento || record.doc || ''
  );
  const normName = normalizeLimaPersonName(record.nombre || record.nombreCompleto || '');
  const nameTokens = normName.split(/\s+/).filter((t) => t.length > 2);

  // 1. Buscar en Padrón Oficial Lima 111 (cubre tanto Participantes como Managers/Capitanes asignados a E29-E32)
  if (normName && Array.isArray(padronList)) {
    const padronHit = padronList.find((p) => {
      const pName = normalizeLimaPersonName(p.nombre || '');
      if (!pName) return false;
      if (pName === normName) return true;
      const pTokens = pName.split(/\s+/).filter((t) => t.length > 2);
      if (pTokens.length < 2 || nameTokens.length < 2) return false;
      const matches = pTokens.filter((t) => nameTokens.includes(t));
      return matches.length >= Math.min(3, pTokens.length);
    });
    if (padronHit && padronHit.equipo) {
      return {
        autoEquipo: canonicalizeEquipoName(padronHit.equipo),
        source: 'AUTO_PADRON',
        graduadoRef: padronHit.cohorte || ''
      };
    }
  }

  // 2. Buscar en índice vivo de Nodus (por DNI exacto o nombre completo exacto)
  if (nodusIndex) {
    const nodusHit =
      (normDoc && nodusIndex.byDoc?.get(normDoc)) ||
      (normName && nodusIndex.byName?.get(normName)) ||
      null;

    if (nodusHit && nodusHit.equipo) {
      const canonicalEq = canonicalizeEquipoName(nodusHit.equipo);
      if (defaultCat === 'Px' && ACTIVE_STUDENT_TEAMS.has(canonicalEq)) {
        return {
          autoEquipo: canonicalEq,
          source: 'AUTO_NODUS',
          graduadoRef: ''
        };
      }
      // Si es MG (o Px de un equipo antiguo graduado), mostrar referencia pero pedir asignación al FDS actual
      return {
        autoEquipo: '',
        source: 'UNASSIGNED',
        graduadoRef: canonicalEq
      };
    }
  }

  return { autoEquipo: '', source: 'UNASSIGNED', graduadoRef: '' };
}

/**
 * Enriquecer todos los contratos firmados + registros manuales de contingencia
 * con su asignación operativa (`control_asistencia_fuego_lima`).
 */
export function buildEnrichedFirewalkRoster({
  signedContracts = [],
  attendanceMap = {},
  padronList = [],
  nodusIndex = null,
  teamBlockMap = DEFAULT_TEAM_BLOCK_MAP
} = {}) {
  const mergedMap = { ...DEFAULT_TEAM_BLOCK_MAP, ...(teamBlockMap || {}) };
  const seenKeys = new Set();
  const rows = [];

  for (const contract of signedContracts) {
    const personKey = getFirewalkPersonKey(contract);
    if (!personKey || seenKeys.has(personKey)) continue;
    seenKeys.add(personKey);

    const saved = attendanceMap[personKey] || null;
    const autoMatch = resolveAutoTeamMatch(contract, { padronList, nodusIndex });

    const defaultCat = deriveDefaultCategoriaFromRol(contract.rol || contract.rolActividad);
    const categoriaReporte = saved?.categoriaReporte || defaultCat;

    let equipoAsignado = '';
    let equipoSource = 'UNASSIGNED';
    if (saved && typeof saved.equipoAsignado === 'string' && saved.equipoAsignado !== '') {
      equipoAsignado = canonicalizeEquipoName(saved.equipoAsignado);
      equipoSource = 'MANUAL';
    } else if (saved && saved.equipoAsignado === '') {
      // Si limpiaron explícitamente o solo marcaron asistencia sin elegir equipo aún, usar auto si existe
      if (autoMatch.autoEquipo) {
        equipoAsignado = autoMatch.autoEquipo;
        equipoSource = autoMatch.source;
      }
    } else if (autoMatch.autoEquipo) {
      equipoAsignado = autoMatch.autoEquipo;
      equipoSource = autoMatch.source;
    }

    // Si alguien fue reclasificado manualmente a Aliados o Staff y no tenía equipo, alinear grupo
    if (!equipoAsignado && categoriaReporte === 'Aliados') {
      equipoAsignado = 'Aliados';
      equipoSource = 'AUTO_ROL';
    } else if (!equipoAsignado && categoriaReporte === 'Staff') {
      equipoAsignado = 'Staff';
      equipoSource = 'AUTO_ROL';
    }

    const bloqueReporte = resolveBloqueReporte(equipoAsignado, categoriaReporte, mergedMap);

    rows.push({
      ...contract,
      personKey,
      isManualContingency: false,
      nombreDisplay: contract.nombre || contract.nombreCompleto || 'Sin nombre',
      documentoDisplay: contract.numeroDocumento || contract.doc || '—',
      tipoDocDisplay: contract.tipoDocumento || 'DNI',
      rolOriginal: contract.rol || contract.rolActividad || 'Participante',
      categoriaReporte,
      equipoAsignado,
      equipoSource,
      graduadoRef: autoMatch.graduadoRef || '',
      bloqueReporte,
      asistio: Boolean(saved?.asistio),
      horaAsistencia: saved?.horaAsistencia || '',
      updatedBy: saved?.updatedBy || '',
      notasAsistencia: saved?.notas || ''
    });
  }

  // Agregar registros manuales de contingencia (personas sin celular registradas en puerta)
  for (const [key, entry] of Object.entries(attendanceMap || {})) {
    if (key === '_config_evento' || seenKeys.has(key)) continue;
    if (!entry || !entry.isManualContingency) continue;
    seenKeys.add(key);

    const categoriaReporte = entry.categoriaReporte || deriveDefaultCategoriaFromRol(entry.rolOriginal);
    const equipoAsignado = canonicalizeEquipoName(entry.equipoAsignado || '');
    const bloqueReporte = resolveBloqueReporte(equipoAsignado, categoriaReporte, mergedMap);

    rows.push({
      id: key,
      personKey: key,
      isManualContingency: true,
      nombre: entry.nombre || 'Registro Manual',
      nombreCompleto: entry.nombre || 'Registro Manual',
      nombreDisplay: entry.nombre || 'Registro Manual',
      tipoDocumento: entry.tipoDocumento || 'DNI',
      tipoDocDisplay: entry.tipoDocumento || 'DNI',
      numeroDocumento: entry.numeroDocumento || '',
      documentoDisplay: entry.numeroDocumento || 'Contingencia',
      rol: entry.rolOriginal || categoriaReporte,
      rolOriginal: entry.rolOriginal || categoriaReporte,
      categoriaReporte,
      equipoAsignado,
      equipoSource: 'MANUAL',
      graduadoRef: '',
      bloqueReporte,
      asistio: entry.asistio !== undefined ? Boolean(entry.asistio) : true,
      horaAsistencia: entry.horaAsistencia || entry.createdAtLocal || 'En sala',
      fecha: entry.createdAtLocal || 'Registro manual en sala',
      lugar: 'Lima - Casona Blanca (Contingencia en Sala)',
      code: entry.code || 'MANUAL-SALA',
      updatedBy: entry.updatedBy || '',
      notasAsistencia: entry.notas || ''
    });
  }

  return rows;
}

export function resolveBloqueReporte(equipoAsignado, categoriaReporte, mergedMap = DEFAULT_TEAM_BLOCK_MAP) {
  if (categoriaReporte === 'Aliados' || equipoAsignado === 'Aliados') return 'Aliados';
  if (categoriaReporte === 'Staff' || equipoAsignado === 'Staff') return 'Staff';
  if (!equipoAsignado) return 'Sin Asignar';

  if (['C2', '1er FDS', '2do FDS', '3er. FDS', '4to FDS'].includes(equipoAsignado)) {
    return equipoAsignado;
  }

  const mapped = mergedMap[equipoAsignado];
  if (mapped === 'Equipo Propio') return equipoAsignado;
  if (mapped) return mapped;
  return equipoAsignado;
}

/**
 * Calcula los cuadros de asistencia por Bloque FDS, por Equipo Nominal y Totales Generales.
 */
export function computeFirewalkAttendanceSummary(
  roster = [],
  {
    countMode = 'REGISTRADOS', // 'REGISTRADOS' | 'ASISTIERON'
    teamBlockMap = DEFAULT_TEAM_BLOCK_MAP
  } = {}
) {
  const mergedMap = { ...DEFAULT_TEAM_BLOCK_MAP, ...(teamBlockMap || {}) };
  const isIncludedByMode = (r) => (countMode === 'ASISTIERON' ? Boolean(r.asistio) : true);

  const canonicalBlocksOrder = [
    'C2',
    '1er FDS',
    '2do FDS',
    '3er. FDS',
    '4to FDS',
    'Equipo 33',
    'Equipo 32',
    'Equipo 31',
    'Equipo 30',
    'Equipo 29',
    'Equipo 28'
  ];

  // Mapa inverso para saber qué equipo alimenta cada bloque FDS
  const teamsPerBlock = {};
  for (const [eq, blk] of Object.entries(mergedMap)) {
    const resolvedBlk = blk === 'Equipo Propio' ? eq : blk;
    if (!teamsPerBlock[resolvedBlk]) teamsPerBlock[resolvedBlk] = [];
    teamsPerBlock[resolvedBlk].push(eq);
  }

  const blockStatsMap = new Map();
  for (const b of canonicalBlocksOrder) {
    blockStatsMap.set(b, {
      bloque: b,
      equiposAsociados: teamsPerBlock[b] || [],
      pxReg: 0,
      pxAsist: 0,
      mgReg: 0,
      mgAsist: 0,
      pxActive: 0,
      mgActive: 0,
      members: []
    });
  }

  const teamOrder = [
    'Equipo 33',
    'Equipo 32',
    'Equipo 31',
    'Equipo 30',
    'Equipo 29',
    'Equipo 28',
    'C2',
    '1er FDS',
    '2do FDS',
    '3er. FDS',
    '4to FDS',
    'Aliados',
    'Staff',
    'Sin Equipo Asignado'
  ];
  const teamStatsMap = new Map();
  const ensureTeamBucket = (teamName) => {
    const key = teamName || 'Sin Equipo Asignado';
    if (!teamStatsMap.has(key)) {
      teamStatsMap.set(key, {
        equipo: key,
        bloque: key === 'Sin Equipo Asignado' ? 'Sin Asignar' : resolveBloqueReporte(key, 'Px', mergedMap),
        pxReg: 0,
        pxAsist: 0,
        mgReg: 0,
        mgAsist: 0,
        aliadosReg: 0,
        aliadosAsist: 0,
        staffReg: 0,
        staffAsist: 0,
        totalReg: 0,
        totalAsist: 0,
        members: []
      });
    }
    return teamStatsMap.get(key);
  };
  for (const t of teamOrder) ensureTeamBucket(t);

  let aliadosReg = 0;
  let aliadosAsist = 0;
  let staffReg = 0;
  let staffAsist = 0;
  let sinAsignarPxMgReg = 0;
  let sinAsignarPxMgAsist = 0;
  const staffBySubRole = {};

  for (const r of roster) {
    const active = isIncludedByMode(r);
    const cat = r.categoriaReporte || 'Px';
    const teamBucket = ensureTeamBucket(r.equipoAsignado || 'Sin Equipo Asignado');

    teamBucket.totalReg += 1;
    if (r.asistio) teamBucket.totalAsist += 1;
    teamBucket.members.push(r);

    if (cat === 'Aliados') {
      aliadosReg += 1;
      if (r.asistio) aliadosAsist += 1;
      teamBucket.aliadosReg += 1;
      if (r.asistio) teamBucket.aliadosAsist += 1;
      continue;
    }

    if (cat === 'Staff') {
      staffReg += 1;
      if (r.asistio) staffAsist += 1;
      teamBucket.staffReg += 1;
      if (r.asistio) teamBucket.staffAsist += 1;
      const subRol = r.rolOriginal || 'Staff';
      if (!staffBySubRole[subRol]) staffBySubRole[subRol] = { reg: 0, asist: 0 };
      staffBySubRole[subRol].reg += 1;
      if (r.asistio) staffBySubRole[subRol].asist += 1;
      continue;
    }

    if (cat === 'Px') {
      teamBucket.pxReg += 1;
      if (r.asistio) teamBucket.pxAsist += 1;
    } else if (cat === 'MG') {
      teamBucket.mgReg += 1;
      if (r.asistio) teamBucket.mgAsist += 1;
    }

    const blk = r.bloqueReporte;
    if (!r.equipoAsignado || blk === 'Sin Asignar') {
      sinAsignarPxMgReg += 1;
      if (r.asistio) sinAsignarPxMgAsist += 1;
      continue;
    }
    if (blk === 'Ocultar') {
      continue;
    }

    if (!blockStatsMap.has(blk)) {
      blockStatsMap.set(blk, {
        bloque: blk,
        equiposAsociados: teamsPerBlock[blk] || [],
        pxReg: 0,
        pxAsist: 0,
        mgReg: 0,
        mgAsist: 0,
        pxActive: 0,
        mgActive: 0,
        members: []
      });
    }
    const bStat = blockStatsMap.get(blk);
    bStat.members.push(r);
    if (cat === 'Px') {
      bStat.pxReg += 1;
      if (r.asistio) bStat.pxAsist += 1;
      if (active) bStat.pxActive += 1;
    } else if (cat === 'MG') {
      bStat.mgReg += 1;
      if (r.asistio) bStat.mgAsist += 1;
      if (active) bStat.mgActive += 1;
    }
  }

  const allBlocks = Array.from(blockStatsMap.values());
  const nonEmptyTeams = Array.from(teamStatsMap.values()).filter((t) => t.totalReg > 0);

  const totalRegistrados = roster.length;
  const totalAsistieron = roster.filter((r) => r.asistio).length;
  const aliadosActive = countMode === 'ASISTIERON' ? aliadosAsist : aliadosReg;
  const staffActive = countMode === 'ASISTIERON' ? staffAsist : staffReg;
  const sinAsignarActive = countMode === 'ASISTIERON' ? sinAsignarPxMgAsist : sinAsignarPxMgReg;

  return {
    countMode,
    totalRegistrados,
    totalAsistieron,
    blocks: allBlocks,
    teams: nonEmptyTeams,
    aliadosReg,
    aliadosAsist,
    aliadosActive,
    staffReg,
    staffAsist,
    staffActive,
    staffBySubRole,
    sinAsignarPxMgReg,
    sinAsignarPxMgAsist,
    sinAsignarActive
  };
}

/**
 * Genera el texto exacto de la plantilla oficial de WhatsApp:
 *
 * *Asistencia Caminata sobre fuego* C2
 *
 * 1er FDS
 * Px 67
 * MG 10
 * ...
 * *Total*
 * Px 177
 * MG 26
 * *Total 203*
 *
 * Aliados: 46
 */
export function formatWhatsAppFirewalkReport(
  summary,
  {
    tituloSufijo = 'C2',
    includeC2Block = 'AUTO', // 'AUTO' | true | false
    include4toFdsBlock = 'AUTO', // 'AUTO' | true | false
    showTeamNameInHeader = false,
    includeStaffFooter = false,
    includeSinAsignarWarning = false
  } = {}
) {
  const cleanSuffix = String(tituloSufijo || '').trim();
  const headerLine = cleanSuffix
    ? `*Asistencia Caminata sobre fuego* ${cleanSuffix}`
    : `*Asistencia Caminata sobre fuego*`;

  const blocksByName = new Map((summary?.blocks || []).map((b) => [b.bloque, b]));
  const coreFds = ['1er FDS', '2do FDS', '3er. FDS'];

  // Detectar si estamos en modo "Por Número de Equipo"
  const customTeamBlocks = (summary?.blocks || []).filter(
    (b) => /^Equipo\s+\d+$/i.test(b.bloque) && (b.pxActive > 0 || b.mgActive > 0)
  );

  const selectedBlocks = [];
  if (customTeamBlocks.length > 0) {
    selectedBlocks.push(...customTeamBlocks);
  } else {
    const c2B = blocksByName.get('C2');
    const showC2 =
      includeC2Block === true ||
      (includeC2Block === 'AUTO' && c2B && (c2B.pxActive > 0 || c2B.mgActive > 0));
    if (showC2 && c2B) selectedBlocks.push(c2B);

    for (const fdsName of coreFds) {
      selectedBlocks.push(
        blocksByName.get(fdsName) || {
          bloque: fdsName,
          equiposAsociados: [],
          pxActive: 0,
          mgActive: 0
        }
      );
    }

    const f4B = blocksByName.get('4to FDS');
    const showF4 =
      include4toFdsBlock === true ||
      (include4toFdsBlock === 'AUTO' && f4B && (f4B.pxActive > 0 || f4B.mgActive > 0));
    if (showF4 && f4B) selectedBlocks.push(f4B);
  }

  let totalPx = 0;
  let totalMg = 0;
  const sections = [headerLine];

  for (const blk of selectedBlocks) {
    const px = Number(blk.pxActive || 0);
    const mg = Number(blk.mgActive || 0);
    totalPx += px;
    totalMg += mg;

    const eqTag =
      showTeamNameInHeader && Array.isArray(blk.equiposAsociados) && blk.equiposAsociados.length > 0
        ? ` (${blk.equiposAsociados.join(', ')})`
        : '';

    sections.push(`${blk.bloque}${eqTag}\nPx ${px}\nMG ${mg}`);
  }

  const grandTeamTotal = totalPx + totalMg;
  sections.push(`*Total*\nPx ${totalPx}\nMG ${totalMg}\n*Total ${grandTeamTotal}*`);
  sections.push(`Aliados: ${Number(summary?.aliadosActive || 0)}`);

  if (includeStaffFooter) {
    const staffCount = Number(summary?.staffActive || 0);
    const totalGeneralSala = grandTeamTotal + Number(summary?.aliadosActive || 0) + staffCount;
    sections.push(`Staff / Apoyo: ${staffCount}\n*Total General: ${totalGeneralSala}*`);
  }

  if (includeSinAsignarWarning && Number(summary?.sinAsignarActive || 0) > 0) {
    sections.push(`_(Pendientes de asignar equipo: ${summary.sinAsignarActive})_`);
  }

  return sections.join('\n\n');
}

export function buildFirewalkAttendanceCsv(roster = []) {
  const headers = [
    'Nombre Completo',
    'Tipo Documento',
    'Nro Documento',
    'Rol Registrado',
    'Categoría Reporte (Px/MG/Aliados/Staff)',
    'Equipo Asignado',
    'Bloque Reporte FDS',
    'Origen Asignación',
    'Asistió en Sala',
    'Hora Check-in',
    'Fecha y Hora Firma',
    'Correo',
    'Teléfono',
    'Código Verificación',
    'Lugar'
  ];

  const escapeCsv = (val) => {
    const s = String(val ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const lines = [headers.map(escapeCsv).join(',')];
  for (const r of roster) {
    lines.push(
      [
        r.nombreDisplay,
        r.tipoDocDisplay,
        r.documentoDisplay,
        r.rolOriginal,
        r.categoriaReporte,
        r.equipoAsignado || 'Sin Asignar',
        r.bloqueReporte,
        r.equipoSource,
        r.asistio ? 'SÍ' : 'PENDIENTE',
        r.horaAsistencia || '',
        r.fecha || r.timestamp || '',
        r.email || '',
        r.telefono || r.tel || '',
        r.code || r.verificationCode || '',
        r.lugar || ''
      ]
        .map(escapeCsv)
        .join(',')
    );
  }
  return '\uFEFF' + lines.join('\r\n');
}
