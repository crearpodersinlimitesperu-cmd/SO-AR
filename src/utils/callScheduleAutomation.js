/**
 * AUTOMATIZACIÓN DE CRONOGRAMA Y DIRECTIVAS DE ENTRENADORES DE LLAMADAS (CAUSA OS)
 *
 * Directivas Implementadas:
 * 1. Seguimiento estándar: Videollamada de Google Meet (20 a 30 minutos).
 * 2. Límite de carga: Máximo 5 mánagers activos por entrenador.
 * 3. Liquidación financiera: Liberación fija por llamada efectiva ($25 USD), independiente de graduación/deserción.
 * 4. Metas de alto rendimiento: Exactamente 3 Resultados Imposibles para avanzar (sin eliminar histórico).
 * 5. Cronograma automatizado:
 *    - Llamada 1: Obligatoria con el capitán antes de iniciar Capítulo 1.
 *    - Pausa operativa: Durante C1 y C2 (dinámicas de sala).
 *    - Llamadas 2..N: Semanales consecutivas tras el primer fin de semana de Maestría.
 *    - Cero bloqueos de fin de año: Continuidad operativa garantizada en dic/ene.
 */

export const STANDARD_CALL_CONTACT_TYPE = 'Videollamada de Google Meet';
export const STANDARD_CALL_DURATION = '20-30 min';
export const MAX_TRAINER_LOAD = 5;
export const FEE_PER_EFFECTIVE_CALL_USD = 25;
export const REQUIRED_FUTUROS_IMPOSIBLES = 3;

/**
 * Valida la capacidad de carga del entrenador.
 * Un entrenador no puede tener más de 5 mánagers asignados.
 */
export function validateTrainerCapacity(currentActiveCount = 0, incomingCount = 1) {
  const current = Number(currentActiveCount) || 0;
  const incoming = Number(incomingCount) || 0;
  const projected = current + incoming;
  const allowed = projected <= MAX_TRAINER_LOAD;
  const remaining = Math.max(0, MAX_TRAINER_LOAD - current);

  return {
    allowed,
    current,
    projected,
    remaining,
    max: MAX_TRAINER_LOAD,
    error: allowed
      ? null
      : `Límite de carga excedido: El entrenador tiene ${current} asignados y alcanzaría ${projected} (máximo permitido: ${MAX_TRAINER_LOAD}).`
  };
}

/**
 * Garantía de Continuidad de Fin de Año.
 * Las directivas prohíben bloqueos o suspensiones durante temporada de fin de año.
 * Siempre retorna false para indicar que NO hay suspensión.
 */
export function isYearEndBlocked(_date) {
  return false;
}

/**
 * Formatea una fecha YYYY-MM-DD agregando N días.
 */
function addDays(isoDateStr, days) {
  if (!isoDateStr) return '';
  const [y, m, d] = String(isoDateStr).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return isoDateStr;
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Genera el cronograma automatizado de llamadas según directivas.
 *
 * @param {Object} options
 * @param {string} options.c1StartDate Fecha de inicio de Capítulo 1 (YYYY-MM-DD)
 * @param {string} options.mjStartDate Fecha de inicio del 1er fin de semana de Maestría (YYYY-MM-DD)
 * @param {number} [options.totalCalls=7] Total de llamadas planificadas en el ciclo
 * @param {string} [options.equipo=''] Nombre o número del equipo
 * @param {string} [options.capitanName=''] Nombre del capitán
 */
export function generateAutomatedCallSchedule({
  c1StartDate = '',
  mjStartDate = '',
  totalCalls = 7,
  equipo = '',
  capitanName = ''
} = {}) {
  const schedule = [];

  // 1. Llamada Obligatoria con el Capitán Pre-Capítulo 1
  const preC1Date = c1StartDate ? addDays(c1StartDate, -3) : addDays(new Date().toISOString().slice(0, 10), 1);
  schedule.push({
    numeroLlamada: 1,
    tipo: 'pre_c1_capitan',
    titulo: 'Llamada 1: Obligatoria con el Capitán (Pre-C1)',
    destinatario: capitanName ? `Capitán: ${capitanName}` : 'Capitán del Equipo',
    tipoContacto: STANDARD_CALL_CONTACT_TYPE,
    duracionMinutos: STANDARD_CALL_DURATION,
    fechaProgramada: preC1Date,
    obligatoria: true,
    fase: 'Pre-Capítulo 1',
    descripcion: 'Alineación de visión, acuerdos operativos y metas antes de iniciar Capítulo 1.',
    requiereNotaVoz: true,
    estado: 'programada'
  });

  // 2. Pausa Operativa (Durante C1 y C2)
  const pausaFin = mjStartDate || (c1StartDate ? addDays(c1StartDate, 21) : addDays(preC1Date, 21));
  schedule.push({
    tipo: 'pausa_operativa',
    titulo: 'Pausa Operativa de Inmersión (C1 & C2)',
    fechaInicio: c1StartDate || addDays(preC1Date, 3),
    fechaFin: pausaFin,
    descripcion: 'Espacio de sala y dinámicas vivenciales para los participantes. Pausa en llamadas de seguimiento.',
    activa: true
  });

  // 3. Retoma Formal de Llamadas Semanales Post-1er Fin de Semana de Maestría
  const baseMjDate = mjStartDate || addDays(preC1Date, 28);
  const regularCallsCount = Math.max(1, totalCalls - 1);

  for (let i = 1; i <= regularCallsCount; i++) {
    const callNumber = i + 1;
    // Llamadas semanales: se programan cada 7 días tras culminar el primer FDS de Maestría
    const callDate = addDays(baseMjDate, i * 7);
    const isYearEnd = /-(12-(2[0-9]|3[01])|01-0[1-7])/.test(callDate);

    schedule.push({
      numeroLlamada: callNumber,
      tipo: 'semanal_maestria',
      titulo: `Llamada ${callNumber}: Seguimiento Semanal Maestría`,
      destinatario: equipo ? `Equipo ${equipo}` : 'Equipo de Mánagers',
      tipoContacto: STANDARD_CALL_CONTACT_TYPE,
      duracionMinutos: STANDARD_CALL_DURATION,
      fechaProgramada: callDate,
      obligatoria: true,
      fase: 'Maestría del Juego',
      descripcion: `Sesión de coaching semanal ${i}/${regularCallsCount}. Evaluación de avances y sentados.`,
      requiereNotaVoz: true,
      temporadaFinDeAno: isYearEnd,
      suspendida: false,
      bloqueada: false,
      continuidadOperativaGarantizada: true,
      estado: 'programada'
    });
  }

  return {
    equipo,
    capitanName,
    c1StartDate,
    mjStartDate,
    totalLlamadas: totalCalls,
    llamadaCapitanPreC1: schedule[0],
    pausaOperativa: schedule[1],
    llamadasSemanales: schedule.filter(item => item.tipo === 'semanal_maestria'),
    cronogramaCompleto: schedule
  };
}

/**
 * Calcula la liquidación fija del entrenador basada exclusivamente en llamadas efectivas registradas.
 * No depende de la graduación ni deserción del mánager.
 */
export function calculateTrainerLiquidation({
  effectiveCallsCount = 0,
  feePerCall = FEE_PER_EFFECTIVE_CALL_USD
} = {}) {
  const count = Math.max(0, Number(effectiveCallsCount) || 0);
  const fee = Number(feePerCall) || FEE_PER_EFFECTIVE_CALL_USD;
  const totalUSD = count * fee;

  return {
    llamadasEfectivas: count,
    tarifaPorLlamada: fee,
    totalUSD,
    moneda: 'USD',
    motivo: 'llamadas_efectivas',
    criterio: 'Liquidación fija por llamada efectiva registrada honestamente en Causa OS'
  };
}

/**
 * Valida si un participante cumple con exactamente 3 Resultados Imposibles para avanzar.
 * Garantiza inmutabilidad histórica.
 */
export function validateParticipantAdvance(approvedFIsCount = 0, required = REQUIRED_FUTUROS_IMPOSIBLES) {
  const approved = Number(approvedFIsCount) || 0;
  const req = Number(required) || REQUIRED_FUTUROS_IMPOSIBLES;
  const canAdvance = approved === req;

  return {
    canAdvance,
    approvedCount: approved,
    requiredCount: req,
    faltan: Math.max(0, req - approved),
    statusText: canAdvance
      ? 'Habilitado para avanzar: 3 Resultados Imposibles aprobados'
      : `Bloqueado para avanzar: Requiere exactamente ${req} Resultados Imposibles aprobados (actualmente: ${approved})`
  };
}

/**
 * Evalúa la continuidad de las llamadas grupales para un conjunto de equipos asignados.
 * Directiva: "Las llamadas grupales continuarán hasta que el último grupo asignado las tenga".
 *
 * @param {Array<Object>} assignedTeams Lista de equipos asignados
 * @param {number} [targetCalls=7] Meta estándar de llamadas grupales
 * @returns {Object} Estado de continuidad del ciclo de llamadas grupales
 */
export function getGroupCallsCycleStatus(assignedTeams = [], targetCalls = 7) {
  if (!Array.isArray(assignedTeams) || assignedTeams.length === 0) {
    return {
      active: false,
      shouldContinue: false,
      totalTeams: 0,
      completedTeams: 0,
      pendingTeams: 0,
      pendingTeamList: [],
      message: 'No hay equipos asignados en el ciclo actual.'
    };
  }

  const pendingTeamList = [];
  let completedTeams = 0;

  for (const team of assignedTeams) {
    const callsCount = Number(team.callsCount ?? team.totalLlamadas ?? team.llamadasCount ?? 0);
    const isCompleted = callsCount >= targetCalls;
    if (isCompleted) {
      completedTeams++;
    } else {
      pendingTeamList.push({
        equipo: team.equipo || team.name || team.id || 'Equipo sin nombre',
        sede: team.sede || '',
        entrenador: team.entrenador || '',
        callsCount,
        faltan: Math.max(0, targetCalls - callsCount)
      });
    }
  }

  const totalTeams = assignedTeams.length;
  const pendingTeams = pendingTeamList.length;
  // Las llamadas continúan mientras exista al menos un grupo asignado que aún no las haya completado todas
  const shouldContinue = pendingTeams > 0;

  return {
    active: shouldContinue,
    shouldContinue,
    totalTeams,
    completedTeams,
    pendingTeams,
    targetCalls,
    pendingTeamList,
    lastGroupPending: pendingTeamList.length > 0 ? pendingTeamList[pendingTeamList.length - 1] : null,
    message: shouldContinue
      ? `Las llamadas grupales continuarán activas hasta que el último grupo asignado las tenga (${completedTeams}/${totalTeams} completados, faltan ${pendingTeams}).`
      : `Ciclo grupal completado: El 100% de los grupos asignados (${totalTeams}/${totalTeams}) completó sus ${targetCalls} llamadas.`
  };
}

/**
 * Función booleana directa para verificar si las llamadas grupales deben continuar.
 */
export function shouldGroupCallsContinue(assignedTeams = [], targetCalls = 7) {
  return getGroupCallsCycleStatus(assignedTeams, targetCalls).shouldContinue;
}
