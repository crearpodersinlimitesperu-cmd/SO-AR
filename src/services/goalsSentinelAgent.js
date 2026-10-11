// Comparación conservadora: una fuente ausente no acredita avance ni vigencia.

import { explicitGoalTeam, explicitTeamFromText } from './goalsTimeline.js';
import { goalProgress } from './goalProgress.js';

/**
 * Normalizador tolerante de Sedes
 */
export function normalizeSede(raw) {
  if (!raw) return '';
  const s = String(raw).trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (s.includes('quito')) return 'Quito';
  if (s.includes('guayaquil') || s.includes('gye')) return 'Guayaquil';
  if (s.includes('cuenca')) return 'Cuenca';
  if (s.includes('medellin')) return 'Medellin';
  if (s.includes('mexico') || s.includes('cdmx')) return 'CDMX';
  if (s.includes('lima')) return 'Lima';
  return String(raw).trim();
}

/**
 * Generador de Hash Determinista Anti-Redundancia (SHA-like 32-bit hex)
 */
export function generateEntityHash(components) {
  const str = components.map(c => String(c || '').trim().toLowerCase()).join('::');
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return ('0000000' + (hash >>> 0).toString(16)).substr(-8);
}

/**
 * Extrae el número de equipo de una meta o texto
 */
export function extractTeamNumber(goal, parentGoal = null) {
  return explicitGoalTeam(goal) || explicitGoalTeam(parentGoal);
}

/**
 * Diagnóstico de una meta individual por el Agente Centinela
 */
export function auditSingleGoal(goal, parentGoal, options = {}) {
  const {
    nodusData = null,
    liveManagers = null,
    coordinatorReports = []
  } = options;

  const rawSede = goal?.sede || parentGoal?.sede || '';
  const sede = normalizeSede(rawSede);
  const teamNum = extractTeamNumber(goal, parentGoal);
  const targetTeamLabel = teamNum ? `EQUIPO ${teamNum}` : 'Equipo no registrado';
  const titleLower = (goal?.title || '').toLowerCase();
  const kpiLower = (goal?.kpi || '').toLowerCase();

  const allCoords = nodusData?.coordinadores || [];
  const sedeCoords = allCoords.filter(c => normalizeSede(c.sede || '') === sede);

  const managers = Array.isArray(liveManagers) ? liveManagers : [];
  const sedeManagers = managers.filter(m => normalizeSede(m.sede || '') === sede);

  // Clasificación del Tipo de Meta con precedencia estricta:
  // 1. Aliados (tiene prioridad absoluta sobre 'c1' o 'px' para evitar falsos positivos)
  const isAliados = titleLower.includes('aliado') || kpiLower.includes('aliado');

  // 2. Managers
  const isManagersCreation = !isAliados && (titleLower.includes('creaci') || (titleLower.includes('manager') && titleLower.includes('creaci')));
  const isManagersRelacion = !isAliados && (titleLower.includes('relaci') || (titleLower.includes('manager') && titleLower.includes('relaci')));
  const isManagersGeneral = !isAliados && (titleLower.includes('manager') || kpiLower.includes('manager'));

  // 3. Sentados / Px en Sala
  const isSentadosPx = !isAliados && !isManagersGeneral && (
    titleLower.includes('sentados') || 
    titleLower.includes('participantes') || 
    kpiLower.includes('participantes') || 
    kpiLower.includes('sentados') ||
    (titleLower.includes('px') && !titleLower.includes('aliado'))
  );

  let detectedRealValue = null;
  let detectedTarget = Number(goal?.targetValue) || 0;
  let callsDetails = {
    totalLlamadas: 0,
    totalConfirmados: 0,
    totalPorConfirmar: 0,
    totalNoContesta: 0,
    efectividad: 0,
    coordinadoras: []
  };
  let managersDetails = [];
  let sources = [];
  let category = 'GENERAL';

  // 1. ANÁLISIS DE LLAMADAS DE COORDINADORAS (Nodus)
  sedeCoords.forEach(c => {
    const eq = (c.equipos || []).find(e => {
      const eName = (e.equipo || '').toUpperCase().replace(/\s+/g, '');
      return teamNum && eName === targetTeamLabel.replace(/\s+/g, '');
    });

    if (eq) {
      const ll = Number(eq.llamadas) || 0;
      const conf = Number(eq.confirmado) || 0;
      const porConf = Number(eq.porConfirmar) || 0;
      const noCont = Number(eq.noContesta) || 0;

      callsDetails.totalLlamadas += ll;
      callsDetails.totalConfirmados += conf;
      callsDetails.totalPorConfirmar += porConf;
      callsDetails.totalNoContesta += noCont;

      callsDetails.coordinadoras.push({
        nombre: c.nombre,
        rol: c.rol || 'Coordinadora',
        llamadas: ll,
        confirmados: conf,
        porConfirmar: porConf,
        noContesta: noCont,
        efectividad: ll > 0 ? Math.round((conf / ll) * 100) : 0
      });
    }
  });

  if (callsDetails.totalLlamadas > 0) {
    callsDetails.efectividad = Math.round((callsDetails.totalConfirmados / callsDetails.totalLlamadas) * 100);
  }

  // 2. AUDITORÍA ESPECÍFICA SEGÚN TIPO DE META
  if (isManagersCreation || isManagersRelacion || isManagersGeneral) {
    category = isManagersCreation ? 'MANAGERS_CREACION' : isManagersRelacion ? 'MANAGERS_RELACION' : 'MANAGERS_GENERAL';
    sources.push('Directorio de managers disponible');

    // Filtrar managers de esta sede
    const activeSedeManagers = sedeManagers.filter(m => {
      const mEq = String(m.numEquipo || m.equipo || '');
      const eqMatches = mEq === teamNum || explicitTeamFromText(mEq) === teamNum;
      const isAct = m.estado === 'Activo' || m.estado === 'EN_JUEGO' || !m.estado || m.isActivo;
      return eqMatches && isAct;
    });

    // Hash anti-redundancia para no duplicar managers
    const uniqueManagersMap = new Map();
    activeSedeManagers.forEach(m => {
      const mHash = generateEntityHash(['manager', sede, teamNum, m.id || m.email || m.nombre]);
      if (!uniqueManagersMap.has(mHash)) {
        uniqueManagersMap.set(mHash, {
          ...m,
          hash: mHash,
          hasCoach: Boolean(m.entrenador && m.entrenador !== 'Sin Asignar' && m.entrenador !== '-')
        });
      }
    });

    managersDetails = Array.from(uniqueManagersMap.values());

    // El directorio general no prueba asistencia ni una fase de Maestría.
    if (!isManagersCreation && !isManagersRelacion && Array.isArray(liveManagers)) {
      detectedRealValue = managersDetails.length;
    }

  } else if (isSentadosPx) {
    category = 'SENTADOS_PX';
    sources.push('Nodus Coordinadores C1/C2', 'Reportes de Sala');

    const roomReports = coordinatorReports.filter(r => {
      const reportTeam = String(r.equipo || r.data?.numEquipo || r.data?.equipo || '');
      const sameGoal = Boolean(goal.id && r.goal_id === goal.id);
      const reportStage = r.etapa || r.stage;
      const teamMatches = (sameGoal && !reportTeam) || reportTeam === teamNum || explicitTeamFromText(reportTeam) === teamNum;
      const stageMatches = (sameGoal && !reportStage) || (Boolean(goal.stage) && reportStage === goal.stage);
      return r.type === 'ReporteSentadosSala' &&
        normalizeSede(r.sede || r.data?.sede_id || '') === sede &&
        teamMatches && stageMatches &&
        goalProgress(r.data?.sentados, goal.targetValue).current !== null;
    }).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    // Confirmar una llamada no acredita estar sentado en sala.
    detectedRealValue = roomReports.length ? Number(roomReports[0].data.sentados) : null;
  } else if (isAliados) {
    category = 'ALIADOS';
    sources.push('Cuotas guardadas en la meta (sin contraste externo)');
    // Las cuotas guardadas se muestran en la tarjeta; no son verificación externa.
    detectedTarget = Number(goal?.targetValue) || 0;
    detectedRealValue = null;
  } else {
    detectedRealValue = null;
  }

  const hasScope = Boolean(teamNum && rawSede && !/global/i.test(rawSede));
  if (!hasScope) detectedRealValue = null;

  const currentValue = goalProgress(goal?.currentValue, goal?.targetValue).current;
  const currentProgress = goalProgress(goal?.currentValue, goal?.targetValue).percent;
  const newProgress = goalProgress(detectedRealValue, detectedTarget).percent;

  // Detección de Estado de Sincronización
  let syncStatus = 'SIN_VERIFICAR';
  let statusMessage = 'Sin evidencia suficiente para comparar. El avance registrado se conserva.';
  let badgeColor = '#94a3b8';

  if (detectedRealValue === null || newProgress === null) {
    statusMessage = hasScope ? statusMessage : 'Falta sede o equipo explícito para comparar con la fuente.';
  } else if (currentValue !== detectedRealValue) {
    syncStatus = 'PENDIENTE_SYNC';
    statusMessage = `La fuente disponible registra ${detectedRealValue}; la meta registra ${currentValue}. Revisa antes de actualizar.`;
    badgeColor = '#f59e0b';
  } else {
    syncStatus = 'COINCIDE';
    statusMessage = 'El avance coincide con la fuente disponible; esto no confirma la vigencia del daemon.';
    badgeColor = '#38bdf8';
  }

  const auditHash = generateEntityHash([
    'audit',
    goal?.id || 'goal',
    sede,
    teamNum,
    detectedRealValue,
    detectedTarget,
    new Date().toISOString().slice(0, 10)
  ]);

  return {
    goalId: goal?.id,
    goalTitle: goal?.title,
    sede,
    teamNum,
    targetTeamLabel,
    category,
    currentValue,
    currentProgress,
    detectedRealValue,
    detectedTarget,
    newProgress,
    syncStatus,
    statusMessage,
    badgeColor,
    auditHash,
    confidenceScore: null,
    sources,
    callsDetails,
    managersDetails,
    requiresUpdate: detectedRealValue !== null && newProgress !== null && currentValue !== detectedRealValue
  };
}

/**
 * Auditoría Masiva de Todas las Metas
 */
export function auditAllGoals(goals = [], parentGoalsMap = {}, options = {}) {
  const auditedList = [];
  let pendingSyncCount = 0;
  let totalAuditadas = 0;
  let totalConfirmadosAuditados = 0;

  goals.forEach(goal => {
    const parent = parentGoalsMap[goal.parentId] || null;
    const audit = auditSingleGoal(goal, parent, options);
    auditedList.push(audit);
    totalAuditadas++;
    if (audit.requiresUpdate) {
      pendingSyncCount++;
    }
    totalConfirmadosAuditados += audit.detectedRealValue;
  });

  return {
    auditedGoals: auditedList,
    totalAuditadas,
    pendingSyncCount,
    totalConfirmadosAuditados,
    unverifiedCount: auditedList.filter(a => a.syncStatus === 'SIN_VERIFICAR').length,
    matchingCount: auditedList.filter(a => a.syncStatus === 'COINCIDE').length,
    overallHealthPct: null,
    timestamp: new Date().toISOString()
  };
}
