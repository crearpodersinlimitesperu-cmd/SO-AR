const SOURCE_ROLE = {
  role: 'nodus_coordinacion_c1c2',
  tabCategory: 'c1',
  roleName: 'Coordinación C1/C2 según el origen Nodus',
};

export function operationalRole(role) {
  const normalizedRole = (role || '').toLowerCase();
  if (normalizedRole === 'ceo' || normalizedRole === 'cco') {
    return { tabCategory: 'ejecutivo', roleName: normalizedRole === 'ceo' ? 'Dirección ejecutiva (CEO)' : 'Dirección operativa (CCO)' };
  }
  if (normalizedRole.includes('maestria') || normalizedRole.includes('mj') || normalizedRole.includes('director_maestria')) {
    return { tabCategory: 'mj', roleName: 'Coordinador Maestría del Juego (CMJ)' };
  }
  if (normalizedRole.includes('capitan')) return { tabCategory: 'capitan', roleName: 'Capitán de Sede' };
  if (normalizedRole.includes('qt')) return { tabCategory: 'qt', roleName: 'Quantum Team (QT)' };
  if (normalizedRole.includes('gerente') || normalizedRole.includes('direccion') || normalizedRole.includes('ceo') || normalizedRole.includes('cfo')) {
    return { tabCategory: 'gerencia', roleName: 'Gerencia de Sede' };
  }
  if (normalizedRole === 'coord_c1' || normalizedRole === 'coord_c2') {
    return { tabCategory: 'c1', roleName: 'Coordinador C1 / C2' };
  }
  return null;
}

export function resolveCoordinatorKpiAssignment(coordinator, staffDirectory) {
  const email = String(coordinator?.email || '').trim().toLowerCase();
  if (!email) return SOURCE_ROLE;
  const assignments = staffDirectory.filter(person =>
    String(person?.email || '').trim().toLowerCase() === email
  );
  if (assignments.length !== 1) return SOURCE_ROLE;
  const assignment = assignments[0];
  const mappedRole = operationalRole(assignment.role);
  return {
    role: assignment.role,
    tabCategory: mappedRole?.tabCategory || SOURCE_ROLE.tabCategory,
    roleName: mappedRole?.roleName || SOURCE_ROLE.roleName,
  };
}

// ============================================================================
// MARCO OFICIAL: EVALUACIÓN INTEGRAL DE COORDINADORES EN NODUS (TRIMESTRAL)
// Marco de Impecabilidad Contable, Rúbrica de Métricas y Triggers Autónomos
// Ref: Documento Oficial Nodus / Google Docs 14hMuG5m3sKZk6QYhtDiPQMO9oVlpG1jsRcgNspD-1m4
// ============================================================================

export const NODUS_TRIMESTRAL_METRICS = [
  // Capítulo Uno (C1)
  {
    code: 'KPI-C1-001',
    module: 'C1',
    moduleName: 'Capítulo Uno (C1)',
    name: 'Asistencia a Apertura',
    formula: '(Asistentes Reales / Total Confirmados) * 100',
    metaBase: 95.0,
    metaReto: 98.0,
    unit: '%',
    weight: 0.075,
    source: 'Nodus Check-In / Geofencing',
    deadline: 'Viernes de Apertura 19:30 hrs',
    isLowerBetter: false,
    description: 'Medición de concurrencia y puntualidad en sala al momento de la apertura del C1.'
  },
  {
    code: 'KPI-C1-002',
    module: 'C1',
    moduleName: 'Capítulo Uno (C1)',
    name: 'Retención C1',
    formula: '(Graduados C1 / Asistentes Iniciales C1) * 100',
    metaBase: 90.0,
    metaReto: 95.0,
    unit: '%',
    weight: 0.075,
    source: 'Registros de Asistencia Nodus',
    deadline: 'Domingo Cierre 21:00 hrs',
    isLowerBetter: false,
    description: 'Porcentaje de participantes que completan el proceso vivencial completo de C1.'
  },
  {
    code: 'KPI-C1-003',
    module: 'C1',
    moduleName: 'Capítulo Uno (C1)',
    name: 'Conversión C1 -> C2',
    formula: '(Inscritos Confirmados C2 / Graduados C1) * 100',
    metaBase: 50.0,
    metaReto: 52.0,
    unit: '%',
    weight: 0.25, // 25% ponderación oficial
    source: 'Nodus Sales Engine',
    deadline: 'Domingo Cierre 22:30 hrs',
    isLowerBetter: false,
    description: 'Pilar comercial y enrolamiento orgánico del ciclo hacia Capítulo Dos.'
  },

  // Capítulo Dos (C2)
  {
    code: 'KPI-C2-001',
    module: 'C2',
    moduleName: 'Capítulo Dos (C2)',
    name: 'Asistencia C2',
    formula: '(Asistentes C2 / Registrados C2) * 100',
    metaBase: 95.0,
    metaReto: 98.0,
    unit: '%',
    weight: 0.075,
    source: 'Nodus Check-In GPS',
    deadline: 'Primer Día C2 09:00 hrs',
    isLowerBetter: false,
    description: 'Cumplimiento de presencia en el primer día de entrenamiento de C2.'
  },
  {
    code: 'KPI-C2-002',
    module: 'C2',
    moduleName: 'Capítulo Dos (C2)',
    name: 'Tasa de Breakthrough',
    formula: '(Evaluaciones Breakthrough Aprobadas / Total) * 100',
    metaBase: 90.0,
    metaReto: 95.0,
    unit: '%',
    weight: 0.075,
    source: 'Módulo Evaluaciones Nodus',
    deadline: 'Sábado C2 22:00 hrs',
    isLowerBetter: false,
    description: 'Porcentaje de aprobaciones de quiebre transformacional y evaluación en sala.'
  },
  {
    code: 'KPI-C2-003',
    module: 'C2',
    moduleName: 'Capítulo Dos (C2)',
    name: 'Tasa Palabras Rotas',
    formula: '(Compromisos Incumplidos / Total Compromisos) * 100',
    metaBase: 5.0,
    metaReto: 2.0,
    unit: '%',
    weight: 0.15, // 15% ponderación oficial
    source: 'Nodus Integrity Log',
    deadline: 'Trigger: Viernes 14:01 hrs',
    isLowerBetter: true,
    description: 'Métrica de integridad operativa. A menor porcentaje, mayor impecabilidad.'
  },
  {
    code: 'KPI-C2-004',
    module: 'C2',
    moduleName: 'Capítulo Dos (C2)',
    name: 'Conversión C2 -> MJ',
    formula: '(Inscritos MJ / Graduados C2) * 100',
    metaBase: 70.0,
    metaReto: 93.0,
    unit: '%',
    weight: 0.30, // 30% ponderación oficial
    source: 'Nodus Conversion Hub',
    deadline: 'Domingo Cierre C2 21:30 hrs',
    isLowerBetter: false,
    description: 'Métrica crítica de consolidación de ciclo hacia Maestría del Juego (MJ).'
  },

  // Maestría del Juego (MJ)
  {
    code: 'KPI-MJ-001',
    module: 'MJ',
    moduleName: 'Maestría del Juego (MJ)',
    name: 'Retención MJ',
    formula: '(Participantes Activos Mes / Total Registrados MJ) * 100',
    metaBase: 90.0,
    metaReto: 95.0,
    unit: '%',
    weight: 0.15, // 15% ponderación oficial
    source: 'Nodus Student Tracker',
    deadline: 'Último día hábil del mes',
    isLowerBetter: false,
    description: 'Porcentaje de participantes activos durante la vigencia mensual de MJ.'
  },
  {
    code: 'KPI-MJ-002',
    module: 'MJ',
    moduleName: 'Maestría del Juego (MJ)',
    name: 'Efectividad Managers',
    formula: '(Sesiones Mentoring Cumplidas / Sesiones Programadas) * 100',
    metaBase: 90.0,
    metaReto: 96.0,
    unit: '%',
    weight: 0.05,
    source: 'Nodus Mentoring Hub',
    deadline: 'Domingos 23:59 hrs',
    isLowerBetter: false,
    description: 'Acompañamiento efectivo de los managers a sus discípulos.'
  },
  {
    code: 'PRO-MJ-003',
    module: 'MJ',
    moduleName: 'Maestría del Juego (MJ)',
    name: 'Futuros Imposibles',
    formula: '(Expedientes Auditados y Aprobados / Total Participantes) * 100',
    metaBase: 100.0,
    metaReto: 100.0,
    unit: '%',
    weight: 0.05,
    source: 'Nodus Document Vault',
    deadline: 'Miércoles 19:00 hrs',
    isLowerBetter: false,
    description: '100% de expedientes y fichas de Futuros Imposibles validados.'
  }
];

export const NODUS_AUTONOMOUS_TRIGGERS = [
  {
    id: 'TRG-ADM-001',
    name: 'Impecabilidad Contable',
    dayTime: 'Lunes 12:00 PM',
    module: 'Administración / Finanzas',
    source: 'Nodus Finance Portal',
    rule: 'Conciliación de cobros, facturas y gastos 100% descuadrados = 0.',
    actionOnFail: 'Alerta Roja Contable inmediata en el dashboard gerencial.'
  },
  {
    id: 'TRG-MJ-002',
    name: 'Auditoría Futuros Imposibles (MJ)',
    dayTime: 'Miércoles 19:00 hrs',
    module: 'Maestría del Juego',
    source: 'Nodus Document Vault',
    rule: 'Carga digital y aprobación del 100% de las fichas de Futuros Imposibles.',
    actionOnFail: 'Reporte automático de incumplimiento operativo y escalamiento.'
  },
  {
    id: 'TRG-C2-003',
    name: 'Trigger Tasa de Palabras Rotas (C2)',
    dayTime: 'Viernes 14:01 hrs',
    module: 'Capítulo Dos (C2)',
    source: 'Nodus Integrity Log',
    rule: 'Compromisos caídos o reprogramados debe ser estrictamente menor al 5.0%.',
    actionOnFail: 'Notificación de incumplimiento de integridad al área de Calidad.'
  },
  {
    id: 'TRG-OPS-004',
    name: 'Check-In Permanente con Geofencing',
    dayTime: 'Tiempo Real (Apertura Módulos)',
    module: 'Operaciones',
    source: 'GPS Nodus Mobile Engine',
    rule: 'Presencia física del coordinador a menos de 50 metros del venue registrado.',
    actionOnFail: 'Observación en auditoría de presencia física y puntualidad.'
  }
];

export const NODUS_EVALUATION_LEVELS = [
  {
    level: 4,
    badge: 'NIVEL 4 – CICLO DE ORO',
    title: 'Ciclo de Oro (Excepcional)',
    color: '#ffb703',
    bg: 'rgba(255, 183, 3, 0.12)',
    border: 'rgba(255, 183, 3, 0.4)',
    criteria: 'Supera todas las Metas Base y alcanza Metas de Reto en Conversión C1->C2 (>52%) y C2->MJ (>93%). Cero fallas en triggers contables, Geofencing e impecabilidad.'
  },
  {
    level: 3,
    badge: 'NIVEL 3 – RETO ALCANZADO',
    title: 'Reto Alcanzado (Sobresaliente)',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.4)',
    criteria: 'Cumple el 100% de Metas Base y al menos dos Metas de Reto en el período, manteniendo palabras rotas < 5%.'
  },
  {
    level: 2,
    badge: 'NIVEL 2 – BASE CUMPLIDA',
    title: 'Base Cumplida (Satisfactorio)',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.4)',
    criteria: 'Cumple el 100% de Metas Base en todos los módulos (C1, C2, MJ, Ops) sin incurrir en faltas graves ni retrasos.'
  },
  {
    level: 1,
    badge: 'NIVEL 1 – PLAN DE ACCIÓN',
    title: 'Requiere Plan de Acción (Insuficiente)',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.4)',
    criteria: 'Incumple una o más Metas Base o registra activaciones negativas en los triggers de Lunes 12:00 PM, Miércoles 19:00 hrs o Viernes 14:01 hrs.'
  }
];

export function calculateCoordinatorScore(resultsMap = {}, triggersStatusMap = {}) {
  let basePassedCount = 0;
  let retoPassedCount = 0;
  let totalMetrics = NODUS_TRIMESTRAL_METRICS.length;
  let hasCriticalTriggerFail = false;

  const triggerResults = NODUS_AUTONOMOUS_TRIGGERS.map(trg => {
    const status = triggersStatusMap[trg.id] || 'APROBADO';
    if (status === 'FALLIDO' || status === 'ALERTA_ROJA') {
      hasCriticalTriggerFail = true;
    }
    return { ...trg, status };
  });

  const evaluatedMetrics = NODUS_TRIMESTRAL_METRICS.map(m => {
    const val = resultsMap[m.code] !== undefined ? Number(resultsMap[m.code]) : null;
    let basePassed = false;
    let retoPassed = false;

    if (val !== null) {
      if (m.isLowerBetter) {
        basePassed = val <= m.metaBase;
        retoPassed = val <= m.metaReto;
      } else {
        basePassed = val >= m.metaBase;
        retoPassed = val >= m.metaReto;
      }
    }

    if (basePassed) basePassedCount++;
    if (retoPassed) retoPassedCount++;

    return {
      ...m,
      val,
      basePassed,
      retoPassed,
      statusLabel: retoPassed ? 'Meta de Reto Alcanzada' : basePassed ? 'Base Cumplida' : 'Requiere Mejora'
    };
  });

  const convC1PassedReto = evaluatedMetrics.find(m => m.code === 'KPI-C1-003')?.retoPassed;
  const convC2PassedReto = evaluatedMetrics.find(m => m.code === 'KPI-C2-004')?.retoPassed;

  let assignedLevel = 1;
  if (!hasCriticalTriggerFail) {
    if (basePassedCount === totalMetrics && convC1PassedReto && convC2PassedReto) {
      assignedLevel = 4;
    } else if (basePassedCount === totalMetrics && retoPassedCount >= 2) {
      assignedLevel = 3;
    } else if (basePassedCount === totalMetrics) {
      assignedLevel = 2;
    } else {
      assignedLevel = 1;
    }
  }

  const levelInfo = NODUS_EVALUATION_LEVELS.find(l => l.level === assignedLevel) || NODUS_EVALUATION_LEVELS[3];

  return {
    evaluatedMetrics,
    triggerResults,
    basePassedCount,
    retoPassedCount,
    totalMetrics,
    assignedLevel,
    levelInfo,
    hasCriticalTriggerFail
  };
}
