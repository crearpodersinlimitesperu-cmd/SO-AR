/**
 * CONFIGURACIÓN OFICIAL DE SEDES Y EQUIPOS VIGENTES PARA ALIADOS (C1 & C2)
 * Crear Poder Sin Límites · Causa OS
 * Regla: JAMÁS mostrar fechas en etiquetas de los entrenamientos.
 */

export const OFFICIAL_SEDES = [
  'Lima',
  'Quito',
  'Guayaquil',
  'Cuenca',
  'Medellín',
  'México',
];

/**
 * Equipos de Capítulo Uno (C1) ordenados por sede.
 * Las fechas se manejan únicamente a nivel interno de sistema para el corte automático.
 * En la interfaz NUNCA se muestran fechas ni rangos de días.
 */
export const VIGENTES_TEAMS_C1 = {
  Lima: [
    {
      id: 'C1E33',
      code: 'E33',
      label: 'C1E33 · Próximo C1',
      startDate: '2026-11-27T08:00:00',
      endDate: '2026-11-29T23:59:59',
      isCurrent: true,
      description: 'Entrenamiento C1 activo en Lima para enrolamiento y registro.',
    },
    {
      id: 'C1E34',
      code: 'E34',
      label: 'C1E34 · Convocatoria Futura',
      startDate: '2027-01-08T08:00:00',
      endDate: '2027-01-10T23:59:59',
      isCurrent: false,
      description: 'Siguiente generación programada.',
    },
  ],
  Quito: [
    {
      id: 'C1E131',
      code: 'E131',
      label: 'C1E131 · Próximo C1',
      startDate: '2026-11-06T08:00:00',
      endDate: '2026-11-08T23:59:59',
      isCurrent: true,
      description: 'Entrenamiento C1 en Quito.',
    },
    {
      id: 'C1E132',
      code: 'E132',
      label: 'C1E132 · Convocatoria Futura',
      startDate: '2026-12-04T08:00:00',
      endDate: '2026-12-06T23:59:59',
      isCurrent: false,
      description: 'Generación futura Quito.',
    },
  ],
  Guayaquil: [
    {
      id: 'C1E39',
      code: 'E39',
      label: 'C1E39 · Próximo C1',
      startDate: '2026-11-13T08:00:00',
      endDate: '2026-11-15T23:59:59',
      isCurrent: true,
      description: 'Entrenamiento C1 Guayaquil.',
    },
    {
      id: 'C1E40',
      code: 'E40',
      label: 'C1E40 · Convocatoria Futura',
      startDate: '2026-12-18T08:00:00',
      endDate: '2026-12-20T23:59:59',
      isCurrent: false,
      description: 'Generación futura Guayaquil.',
    },
  ],
  Cuenca: [
    {
      id: 'C1E25',
      code: 'E25',
      label: 'C1E25 · Próximo C1',
      startDate: '2026-11-20T08:00:00',
      endDate: '2026-11-22T23:59:59',
      isCurrent: true,
      description: 'Entrenamiento C1 Cuenca.',
    },
    {
      id: 'C1E26',
      code: 'E26',
      label: 'C1E26 · Convocatoria Futura',
      startDate: '2027-01-08T08:00:00',
      endDate: '2027-01-10T23:59:59',
      isCurrent: false,
      description: 'Generación futura Cuenca.',
    },
  ],
  Medellín: [
    {
      id: 'C1E21',
      code: 'E21',
      label: 'C1E21 · Próximo C1',
      startDate: '2026-11-20T08:00:00',
      endDate: '2026-11-22T23:59:59',
      isCurrent: true,
      description: 'Entrenamiento C1 Medellín.',
    },
    {
      id: 'C1E22',
      code: 'E22',
      label: 'C1E22 · Convocatoria Futura',
      startDate: '2027-01-15T08:00:00',
      endDate: '2027-01-17T23:59:59',
      isCurrent: false,
      description: 'Generación futura Medellín.',
    },
  ],
  México: [
    {
      id: 'C1E10',
      code: 'E10',
      label: 'C1E10 · Próximo C1',
      startDate: '2026-11-27T08:00:00',
      endDate: '2026-11-29T23:59:59',
      isCurrent: true,
      description: 'Entrenamiento C1 México.',
    },
    {
      id: 'C1E11',
      code: 'E11',
      label: 'C1E11 · Convocatoria Futura',
      startDate: '2027-01-15T08:00:00',
      endDate: '2027-01-17T23:59:59',
      isCurrent: false,
      description: 'Generación futura México.',
    },
  ],
};

/**
 * Equipos de Capítulo Dos (C2) ordenados por sede.
 * En la interfaz NUNCA se muestran fechas ni rangos de días.
 */
export const VIGENTES_TEAMS_C2 = {
  Lima: [
    {
      id: 'C2E32',
      code: 'E32',
      label: 'C2E32 · Próximo C2',
      startDate: '2026-11-06T08:00:00',
      endDate: '2026-11-08T23:59:59',
      isCurrent: true,
      description: 'Entrenamiento C2 activo en Lima.',
    },
    {
      id: 'C2E33',
      code: 'E33',
      label: 'C2E33 · Convocatoria Futura',
      startDate: '2026-12-11T08:00:00',
      endDate: '2026-12-13T23:59:59',
      isCurrent: false,
      description: 'Siguiente generación de C2.',
    },
  ],
  Quito: [
    {
      id: 'C2E130',
      code: 'E130',
      label: 'C2E130 · Próximo C2',
      startDate: '2026-11-13T08:00:00',
      endDate: '2026-11-15T23:59:59',
      isCurrent: true,
      description: 'Entrenamiento C2 en Quito.',
    },
    {
      id: 'C2E131',
      code: 'E131',
      label: 'C2E131 · Convocatoria Futura',
      startDate: '2026-11-20T08:00:00',
      endDate: '2026-11-22T23:59:59',
      isCurrent: false,
      description: 'Siguiente ciclo C2 Quito.',
    },
  ],
  Guayaquil: [
    {
      id: 'C2E38',
      code: 'E38',
      label: 'C2E38 · Próximo C2',
      startDate: '2026-11-06T08:00:00',
      endDate: '2026-11-08T23:59:59',
      isCurrent: true,
      description: 'Entrenamiento C2 Guayaquil.',
    },
    {
      id: 'C2E39',
      code: 'E39',
      label: 'C2E39 · Convocatoria Futura',
      startDate: '2026-11-27T08:00:00',
      endDate: '2026-11-29T23:59:59',
      isCurrent: false,
      description: 'Siguiente ciclo C2 Guayaquil.',
    },
  ],
  Cuenca: [
    {
      id: 'C2E24',
      code: 'E24',
      label: 'C2E24 · Próximo C2',
      startDate: '2026-11-06T08:00:00',
      endDate: '2026-11-08T23:59:59',
      isCurrent: true,
      description: 'Entrenamiento C2 Cuenca.',
    },
    {
      id: 'C2E25',
      code: 'E25',
      label: 'C2E25 · Convocatoria Futura',
      startDate: '2026-12-04T08:00:00',
      endDate: '2026-12-06T23:59:59',
      isCurrent: false,
      description: 'Siguiente ciclo C2 Cuenca.',
    },
  ],
  Medellín: [
    {
      id: 'C2E20',
      code: 'E20',
      label: 'C2E20 · Próximo C2',
      startDate: '2026-11-06T08:00:00',
      endDate: '2026-11-08T23:59:59',
      isCurrent: true,
      description: 'Entrenamiento C2 Medellín.',
    },
    {
      id: 'C2E21',
      code: 'E21',
      label: 'C2E21 · Convocatoria Futura',
      startDate: '2026-12-04T08:00:00',
      endDate: '2026-12-06T23:59:59',
      isCurrent: false,
      description: 'Siguiente ciclo C2 Medellín.',
    },
  ],
  México: [
    {
      id: 'C2E9',
      code: 'E9',
      label: 'C2E9 · Próximo C2',
      startDate: '2026-11-06T08:00:00',
      endDate: '2026-11-08T23:59:59',
      isCurrent: true,
      description: 'Entrenamiento C2 México.',
    },
    {
      id: 'C2E10',
      code: 'E10',
      label: 'C2E10 · Convocatoria Futura',
      startDate: '2026-12-11T08:00:00',
      endDate: '2026-12-13T23:59:59',
      isCurrent: false,
      description: 'Siguiente ciclo C2 México.',
    },
  ],
};

/**
 * Evalúa si el Aliado/Staff tiene acceso vigente o si el entrenamiento ya concluyó
 * y por lo tanto el acceso debe ser retirado de manera automática.
 */
export function evaluateAccessValidity(surveyData, capitulo = 'C1') {
  if (!surveyData) {
    return {
      isValid: false,
      isExpired: false,
      status: 'SIN_ENCUESTA',
      reason: 'Encuesta no completada.',
    };
  }

  const sede = surveyData.sede || surveyData.sedeOficial || 'Lima';
  const rawEquipo = String(surveyData.equipo || surveyData.equipoGeneracion || '').trim().toUpperCase();
  const cleanNumber = rawEquipo.replace(/[^0-9]/g, '');

  // Regla especial para Staff de Mesa / Apoyos:
  // A diferencia de los Aliados que están asignados a un único equipo, los Apoyos de Mesa pueden estar
  // en todos los entrenamientos disponibles (C1, C2 y MJ) de la sede en rotación continua.
  if (capitulo === 'STAFF_MESA' || surveyData.capitulo === 'STAFF_MESA' || surveyData.puestoMesa || surveyData.mesaRol) {
    if (rawEquipo.includes('TODOS') || rawEquipo === 'TODOS_DISPONIBLES' || !rawEquipo) {
      return {
        isValid: true,
        isExpired: false,
        status: 'VIGENTE',
        equipoLabel: '⭐ Todos los entrenamientos disponibles (C1, C2 y MJ)',
      };
    }
  }

  // Regla especial histórica: En Lima C1, el Equipo 32 culminó su ciclo.
  if (capitulo === 'C1' && sede === 'Lima' && (cleanNumber === '32' || rawEquipo.includes('32'))) {
    return {
      isValid: false,
      isExpired: true,
      status: 'EXPIRADO_AUTOMATICO',
      reason: 'El ciclo de entrenamiento de Capítulo Uno (C1) para el Equipo 32 en Lima ha concluido oficialmente. Conforme al estándar de Crear Poder Sin Límites, el acceso a los materiales operativos se retira de manera automática al término del ciclo.',
      endDateIso: '2026-10-25T23:59:59',
      equipoLabel: 'C1E32 · Lima (Finalizado)',
    };
  }

  const catalog = capitulo === 'C1' ? VIGENTES_TEAMS_C1 : VIGENTES_TEAMS_C2;
  const teamsInSede = catalog[sede] || [];

  const match = teamsInSede.find(t =>
    t.id === rawEquipo ||
    t.code === rawEquipo ||
    (cleanNumber && t.code === `E${cleanNumber}`) ||
    t.label.toUpperCase().includes(rawEquipo)
  );

  if (match) {
    const now = new Date();
    const end = new Date(match.endDate);
    const isPast = now > end;

    if (isPast) {
      return {
        isValid: false,
        isExpired: true,
        status: 'EXPIRADO_AUTOMATICO',
        reason: `El ciclo de entrenamiento para ${match.label} ha concluido oficialmente. Conforme al acuerdo de confidencialidad de Crear Poder Sin Límites, el acceso operativo se ha retirado de forma automática.`,
        endDateIso: match.endDate,
        equipoLabel: match.label,
      };
    }

    return {
      isValid: true,
      isExpired: false,
      status: 'VIGENTE',
      equipoLabel: match.label,
      endDateIso: match.endDate,
    };
  }

  return {
    isValid: true,
    isExpired: false,
    status: 'VIGENTE',
    equipoLabel: rawEquipo,
  };
}
