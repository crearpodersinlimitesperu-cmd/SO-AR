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

export const ACTIVE_MG_COHORT_TEAMS = new Set([
  'Equipo 33',
  'Equipo 32',
  'Equipo 31',
  'Equipo 30',
  'Equipo 29'
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

export function normalizePhoneLast9(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : '';
}

function getUniqueTokens(str) {
  return Array.from(
    new Set(
      normalizeLimaPersonName(str || '')
        .split(/\s+/)
        .filter((t) => t.length > 2)
    )
  );
}

/**
 * Cruza un registro firmado contra Nodus en vivo (por DNI exacto, ficha de etapas `/participante`
 * y respaldo teléfono+nombre ante error de 1 dígito en DNI) + Capitanes Lima + Padrón Lima 111.
 *
 * Reglas forenses de prioridad (Cero invención / Cero falsos homónimos):
 * 1. El DNI exacto en Nodus (`nodusIndex.byDoc` / `nodusIndex.profileByDoc`) SIEMPRE prevalece sobre
 *    cualquier coincidencia aproximada de nombres en `padron_fuego_lima_111.json` (evita colisiones
 *    de apellidos como "Ruth Mery Quispe Quispe" E29 vs "Ruth Sandra Quispe Quispe" E31 o
 *    "Guisella Zoraida Medina López" E32 vs "Fernando López López" E30).
 * 2. Si alguien dejó "Participante" por defecto en el formulario pero en Nodus `etapas` de `EQUIPO 29–33`
 *    figura exclusivamente como `manager` o `capitan`, se corrige automáticamente `autoCategoria = 'MG'`.
 *    Si en Nodus figura como `GRADUADOS` o graduado `< Equipo 28` sin etapa `px` activa, se reclasifica
 *    como `MG` sin equipo asignado para no inflar `Px`.
 * 3. Si el DNI digitado tiene 1 dígito errado y no existe en Nodus, se recupera únicamente cuando
 *    coinciden simultáneamente los 9 dígitos exactos del celular + >= 2 tokens del nombre/firma.
 * 4. Para Managers (`MG`), el Padrón estático nunca asigna una fila cuyo rol sea `"Participante"`.
 */
export function resolveAutoTeamMatch(record, { padronList = [], capitanesList = [], nodusIndex = null } = {}) {
  const defaultCat = deriveDefaultCategoriaFromRol(record.rol || record.rolActividad);
  if (defaultCat === 'Aliados') {
    return { autoEquipo: 'Aliados', autoCategoria: 'Aliados', source: 'AUTO_ROL', graduadoRef: '', forensicNote: '' };
  }
  if (defaultCat === 'Staff') {
    return { autoEquipo: 'Staff', autoCategoria: 'Staff', source: 'AUTO_ROL', graduadoRef: '', forensicNote: '' };
  }

  const normDoc = normalizeLimaDocNumber(
    record.numeroDocumentoNorm || record.numeroDocumento || record.doc || ''
  );
  const normName = normalizeLimaPersonName(record.nombre || record.nombreCompleto || '');
  const normFirma = normalizeLimaPersonName(
    record.firma && record.firma !== 'undefined' ? record.firma : ''
  );
  const combinedTokens = new Set([...getUniqueTokens(normName), ...getUniqueTokens(normFirma)]);
  const cleanPhone = normalizePhoneLast9(record.telefono || record.tel || '');

  // 1. Autoridad Primaria: Índice vivo de Nodus (DNI exacto -> Ficha Etapas -> Recuperación Teléfono+Nombre)
  if (nodusIndex) {
    let nodusHit = (normDoc && nodusIndex.byDoc?.get(normDoc)) || null;
    let profile = (normDoc && nodusIndex.profileByDoc?.get(normDoc)) || null;
    let typoRecoveredDoc = '';

    // Si el DNI digitado no existe en Nodus (ej. error de tipeo de 1 dígito), validar Celular Exacto (9 dígitos) + >=2 tokens de nombre/firma
    if (!nodusHit && !profile && cleanPhone && Array.isArray(nodusIndex.rosterList)) {
      const phoneNameMatch = nodusIndex.rosterList.find((cand) => {
        if (!cand.telefonoNorm || cand.telefonoNorm !== cleanPhone) return false;
        const overlap = (cand.tokens || []).filter((t) => combinedTokens.has(t));
        return overlap.length >= 2;
      });
      if (phoneNameMatch) {
        nodusHit = phoneNameMatch;
        typoRecoveredDoc = phoneNameMatch.docNorm || '';
        if (typoRecoveredDoc && nodusIndex.profileByDoc?.has(typoRecoveredDoc)) {
          profile = nodusIndex.profileByDoc.get(typoRecoveredDoc);
        }
      }
    }

    // Evaluar etapas reales en Nodus cuando existe ficha individual (`profile`)
    if (profile) {
      const etapas = Array.isArray(profile.etapas) ? profile.etapas : [];
      const activeMgEtapa = etapas.find((e) => {
        const eqCanon = canonicalizeEquipoName(e.equipo);
        return ACTIVE_MG_COHORT_TEAMS.has(eqCanon) && (e.tipo === 'manager' || e.tipo === 'capitan');
      });
      const activePxEtapa = etapas.find((e) => {
        const eqCanon = canonicalizeEquipoName(e.equipo);
        return ACTIVE_STUDENT_TEAMS.has(eqCanon) && e.tipo === 'px';
      });
      const rawEqActual = String(profile.equipoActual || nodusHit?.equipo || '').trim();
      const canonEqActual = canonicalizeEquipoName(rawEqActual);
      const eqNumMatch = canonEqActual.match(/Equipo\s+(\d+)/i);
      const eqNum = eqNumMatch ? Number(eqNumMatch[1]) : 0;

      // Caso A: Firmó "Participante" por defecto pero Nodus confirma que es Manager/Capitán activo en E29–E33
      if (defaultCat === 'Px' && activeMgEtapa && !activePxEtapa) {
        const mgTeam = canonicalizeEquipoName(activeMgEtapa.equipo);
        return {
          autoEquipo: mgTeam,
          autoCategoria: 'MG',
          source: 'AUTO_NODUS_MG',
          graduadoRef: '',
          forensicNote: `Nodus confirma rol ${activeMgEtapa.tipo.toUpperCase()} en ${mgTeam}`
        };
      }

      // Caso B: Firmó "Participante" pero en Nodus es GRADUADOS o graduado antiguo (< E28) sin etapa Px activa
      if (
        defaultCat === 'Px' &&
        !activePxEtapa &&
        (rawEqActual.toUpperCase() === 'GRADUADOS' || (eqNum > 0 && eqNum < 28))
      ) {
        return {
          autoEquipo: '',
          autoCategoria: 'MG',
          source: 'UNASSIGNED',
          graduadoRef: rawEqActual.toUpperCase() === 'GRADUADOS' ? 'GRADUADOS' : canonEqActual,
          forensicNote: `Graduado histórico en Nodus (${rawEqActual || canonEqActual})`
        };
      }

      // Caso C: Firmó Manager / Capitán y Nodus confirma cohorte activa E29–E33
      if (defaultCat === 'MG') {
        if (activeMgEtapa) {
          return {
            autoEquipo: canonicalizeEquipoName(activeMgEtapa.equipo),
            autoCategoria: 'MG',
            source: 'AUTO_NODUS',
            graduadoRef: '',
            forensicNote: ''
          };
        }
        if (ACTIVE_MG_COHORT_TEAMS.has(canonEqActual)) {
          return {
            autoEquipo: canonEqActual,
            autoCategoria: 'MG',
            source: 'AUTO_NODUS',
            graduadoRef: '',
            forensicNote: ''
          };
        }
      }

      // Caso D: Participante Px confirmado en equipo activo E28–E33
      if (defaultCat === 'Px' && ACTIVE_STUDENT_TEAMS.has(canonEqActual)) {
        return {
          autoEquipo: canonEqActual,
          autoCategoria: 'Px',
          source: typoRecoveredDoc ? 'AUTO_NODUS_TEL' : 'AUTO_NODUS',
          graduadoRef: '',
          forensicNote: typoRecoveredDoc ? `DNI Nodus validado por celular: ${typoRecoveredDoc}` : ''
        };
      }
    }

    // Si aún no cargó `profile` individual pero sí existe `nodusHit` en el padrón vivo de equipos Nodus
    if (nodusHit && nodusHit.equipo) {
      const canonicalEq = canonicalizeEquipoName(nodusHit.equipo);
      // Revisar si el Padrón Oficial Lima ya reporta a esta persona exacta como Manager/Capitán (ej. Pilco Laura / Zuley Urteaga antes de terminar fetch individual)
      if (defaultCat === 'Px' && Array.isArray(padronList)) {
        const exactLeadershipHit = padronList.find((p) => {
          const pCat = deriveDefaultCategoriaFromRol(p.rol);
          if (pCat !== 'MG') return false;
          const pName = normalizeLimaPersonName(p.nombre || '');
          return pName && (pName === normName || (normFirma && pName === normFirma));
        });
        if (exactLeadershipHit) {
          return {
            autoEquipo: canonicalizeEquipoName(exactLeadershipHit.equipo || canonicalEq),
            autoCategoria: 'MG',
            source: 'AUTO_NODUS_MG',
            graduadoRef: '',
            forensicNote: 'Liderazgo confirmado en Padrón/Nodus'
          };
        }
      }

      if (
        (defaultCat === 'Px' && ACTIVE_STUDENT_TEAMS.has(canonicalEq)) ||
        (defaultCat === 'MG' && ACTIVE_MG_COHORT_TEAMS.has(canonicalEq))
      ) {
        return {
          autoEquipo: canonicalEq,
          autoCategoria: defaultCat,
          source: typoRecoveredDoc ? 'AUTO_NODUS_TEL' : 'AUTO_NODUS',
          graduadoRef: '',
          forensicNote: typoRecoveredDoc ? `DNI Nodus validado por celular: ${typoRecoveredDoc}` : ''
        };
      }
    }
  }

  // 2. Directorio oficial de Capitanes Lima activos (E29+) — solo para liderazgo (`MG`) y con tokens únicos deduplicados
  if (defaultCat === 'MG' && combinedTokens.size >= 2 && Array.isArray(capitanesList) && capitanesList.length > 0) {
    const capHit = capitanesList.find((c) => {
      if (String(c.sede || '').toLowerCase() !== 'lima' || Number(c.numEquipo) < 29) return false;
      const cName = normalizeLimaPersonName(c.nombre || '');
      if (!cName) return false;
      if (cName === normName || (normFirma && cName === normFirma)) return true;
      const cTokens = getUniqueTokens(cName);
      if (cTokens.length < 2) return false;
      const nameTokArr = getUniqueTokens(normName);
      return (
        cTokens.every((t) => combinedTokens.has(t)) ||
        (nameTokArr.length >= 2 && nameTokArr.every((t) => cTokens.includes(t)))
      );
    });
    if (capHit && capHit.numEquipo) {
      return {
        autoEquipo: `Equipo ${capHit.numEquipo}`,
        autoCategoria: 'MG',
        source: 'AUTO_PADRON',
        graduadoRef: '',
        forensicNote: `Capitanía oficial Lima E${capHit.numEquipo}`
      };
    }
  }

  // 3. Fallback estricto en Padrón Lima 111 (sin colisiones por apellidos repetidos ni cruce MG <-> Participante)
  if (combinedTokens.size >= 2 && Array.isArray(padronList)) {
    const padronHit = padronList.find((p) => {
      const pName = normalizeLimaPersonName(p.nombre || '');
      if (!pName || /^participante\s+(confirmado|pendiente)/i.test(pName) || /^manager\s+de\s+soporte/i.test(pName) || /^partner\s+de\s+soporte/i.test(pName)) {
        return false;
      }
      const pCat = deriveDefaultCategoriaFromRol(p.rol);
      // Nunca asignar un Manager graduado usando una fila marcada como "Participante" en el padrón estático
      if (defaultCat === 'MG' && pCat !== 'MG') return false;

      if (pName === normName || (normFirma && pName === normFirma)) return true;
      const pTokens = getUniqueTokens(pName);
      if (pTokens.length < 2) return false;
      const nameTokArr = getUniqueTokens(normName);
      return (
        pTokens.every((t) => combinedTokens.has(t)) ||
        (nameTokArr.length >= 2 && nameTokArr.every((t) => pTokens.includes(t)))
      );
    });
    if (padronHit && padronHit.equipo) {
      const pCat = deriveDefaultCategoriaFromRol(padronHit.rol);
      return {
        autoEquipo: canonicalizeEquipoName(padronHit.equipo),
        autoCategoria: defaultCat === 'Px' && pCat === 'MG' ? 'MG' : defaultCat,
        source: 'AUTO_PADRON',
        graduadoRef: padronHit.cohorte || '',
        forensicNote: ''
      };
    }
  }

  // 4. Si es MG/Graduado con referencia histórica en Nodus pero sin cohorte activa asignada, exponer referencia sin inventar equipo
  const fallbackProfile = normDoc && nodusIndex?.profileByDoc?.get(normDoc);
  const fallbackHit = normDoc && nodusIndex?.byDoc?.get(normDoc);
  const rawGradEq = fallbackProfile?.equipoActual || fallbackHit?.equipo || '';
  const gradRef = rawGradEq ? canonicalizeEquipoName(rawGradEq) : '';

  return {
    autoEquipo: '',
    autoCategoria: defaultCat,
    source: 'UNASSIGNED',
    graduadoRef: gradRef,
    forensicNote: ''
  };
}

/**
 * Enriquecer todos los contratos firmados + registros manuales de contingencia
 * con su asignación operativa (`control_asistencia_fuego_lima`).
 */
export function buildEnrichedFirewalkRoster({
  signedContracts = [],
  attendanceMap = {},
  padronList = [],
  capitanesList = [],
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
    const autoMatch = resolveAutoTeamMatch(contract, { padronList, capitanesList, nodusIndex });

    const defaultCat = deriveDefaultCategoriaFromRol(contract.rol || contract.rolActividad);
    const categoriaReporte = saved?.categoriaReporte || autoMatch.autoCategoria || defaultCat;

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
      forensicNote: autoMatch.forensicNote || '',
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

    const blk = resolveBloqueReporte(r.equipoAsignado, cat, mergedMap);
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
