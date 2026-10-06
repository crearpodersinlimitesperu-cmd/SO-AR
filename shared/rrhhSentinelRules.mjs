export function normalizeIdentityName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function sameSede(candidateSede, requestedSede) {
  if (!requestedSede || !candidateSede) return true;
  return normalizeIdentityName(candidateSede) === normalizeIdentityName(requestedSede);
}

export function resolveUniqueNameMatch(rawName, entries, {
  getName = entry => entry?.name || entry?.displayName || '',
  getSede = entry => entry?.sede || '',
  sede = ''
} = {}) {
  const target = normalizeIdentityName(rawName);
  if (!target || !Array.isArray(entries)) return null;

  const eligible = entries.filter(entry => sameSede(getSede(entry), sede));
  const exact = eligible.filter(entry => normalizeIdentityName(getName(entry)) === target);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;

  if (target.includes(' ')) return null;
  const firstNameMatches = eligible.filter(entry => {
    const name = normalizeIdentityName(getName(entry));
    return name === target || name.startsWith(`${target} `);
  });
  return firstNameMatches.length === 1 ? firstNameMatches[0] : null;
}

function readCount(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const number = Number(value);
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return null;
}

function readCoordinatorMetric(coordinator, key, ...values) {
  if (coordinator?.metricasDisponibles?.[key] === false) return null;
  return readCount(...values);
}

export function getCoordinatorMetrics(coordinator) {
  const states = coordinator?.estados || {};
  const asignados = readCoordinatorMetric(coordinator, 'asignados', coordinator?.asignados);
  const gestiones = readCoordinatorMetric(coordinator, 'gestiones', coordinator?.gestiones, coordinator?.llamadas);
  const coberturaSource = readCoordinatorMetric(coordinator, 'coberturaPct', coordinator?.coberturaPct);
  const derivedCoverage = gestiones === null ? null : Math.round((gestiones / asignados) * 100);
  const coberturaPct = asignados > 0 && (coberturaSource !== null || derivedCoverage !== null)
    ? coberturaSource ?? derivedCoverage
    : null;
  const confirmadosC1 = readCoordinatorMetric(coordinator, 'confirmadosC1', coordinator?.confirmadosC1);
  const confirmadosC2 = readCoordinatorMetric(coordinator, 'confirmadosC2', coordinator?.confirmadosC2);
  const sentadosC1 = readCoordinatorMetric(coordinator, 'sentadosC1', coordinator?.sentadosC1);
  const sentadosC2 = readCoordinatorMetric(coordinator, 'sentadosC2', coordinator?.sentadosC2);
  const sumWhenKnown = (left, right) => left === null && right === null
    ? null
    : (left ?? 0) + (right ?? 0);

  return {
    asignados,
    gestiones,
    coberturaPct,
    coberturaOrigen: coberturaPct === null
      ? null
      : coberturaSource !== null ? 'nodus' : 'calculada',
    confirmados: readCoordinatorMetric(coordinator, 'confirmados', coordinator?.confirmados, states.confirmado) ?? sumWhenKnown(confirmadosC1, confirmadosC2),
    confirmadosC1,
    confirmadosC2,
    sentadosC1,
    sentadosC2,
    sentadosTotal: readCoordinatorMetric(coordinator, 'sentadosTotal', coordinator?.sentadosTotal, coordinator?.asistieron) ?? sumWhenKnown(sentadosC1, sentadosC2),
    gestionesC1: readCoordinatorMetric(coordinator, 'gestionesC1', coordinator?.gestionesC1, coordinator?.c1),
    gestionesC2: readCoordinatorMetric(coordinator, 'gestionesC2', coordinator?.gestionesC2, coordinator?.c2),
    noContesta: readCoordinatorMetric(coordinator, 'noContesta', coordinator?.noContesta, states.noContesta),
    porConfirmar: readCoordinatorMetric(coordinator, 'porConfirmar', coordinator?.porConfirmar, states.porConfirmar),
    noInteresa: readCoordinatorMetric(coordinator, 'noInteresa', coordinator?.noInteresa, states.noInteresa),
    devolucion: readCoordinatorMetric(coordinator, 'devolucion', coordinator?.devolucion, states.devolucion)
  };
}

export function classifyCoordinatorPerformance(coordinator) {
  const metrics = getCoordinatorMetrics(coordinator);
  const coverageDescription = metrics.coberturaOrigen === 'nodus'
    ? 'Cobertura informada por Nodus'
    : 'Cobertura calculada a partir de gestiones y asignados';
  if (metrics.asignados === 0) {
    return {
      nivelRiesgo: 'SIN_BASE',
      motivo: 'No hay participantes asignados en este corte; no se calcula cobertura.',
      coachingFeedback: 'Validar si corresponde asignar una base antes de evaluar desempeño.'
    };
  }
  if (metrics.asignados === null || metrics.gestiones === null) {
    return {
      nivelRiesgo: 'INDETERMINADO',
      motivo: 'Faltan datos de asignación o gestiones para evaluar este corte.',
      coachingFeedback: 'Verificar la extracción de Nodus antes de asignar una intervención.'
    };
  }

  if (metrics.gestiones === 0) {
    return {
      nivelRiesgo: 'CRITICO',
      motivo: `Nodus registra 0 gestiones en el corte para ${metrics.asignados} asignados.`,
      coachingFeedback: 'Revisar con la persona si los datos están completos y acordar el siguiente paso.'
    };
  }

  if (metrics.asignados > 10 && metrics.coberturaPct < 35) {
    return {
      nivelRiesgo: 'CRITICO',
      motivo: `${coverageDescription} de ${metrics.coberturaPct}% (${metrics.gestiones}/${metrics.asignados}) en este corte.`,
      coachingFeedback: 'Revisar la carga y acordar prioridades de seguimiento con la persona.'
    };
  }

  if (metrics.gestiones > 5 && metrics.noContesta !== null && metrics.noContesta / metrics.gestiones > 0.6) {
    return {
      nivelRiesgo: 'MEDIO',
      motivo: `Nodus registra ${Math.round((metrics.noContesta / metrics.gestiones) * 100)}% de estados "No Contesta" respecto de las gestiones.`,
      coachingFeedback: 'Revisar conjuntamente el resultado y acordar si conviene ajustar el seguimiento.'
    };
  }

  if (metrics.coberturaPct < 60) {
    return {
      nivelRiesgo: 'MEDIO',
      motivo: `${coverageDescription} de ${metrics.coberturaPct}% (${metrics.gestiones}/${metrics.asignados}) en este corte.`,
      coachingFeedback: 'Revisar el avance y acordar el próximo seguimiento.'
    };
  }

  return {
    nivelRiesgo: 'OPTIMO',
    motivo: `Cobertura registrada de ${metrics.coberturaPct}% (${metrics.gestiones}/${metrics.asignados}) en este corte.`,
    coachingFeedback: 'Mantener seguimiento y validar las metas del ciclo antes de emitir una evaluación de resultados.'
  };
}

export function timestampToMillis(value) {
  if (value && typeof value.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && Number.isFinite(date.getTime()) ? date.getTime() : null;
  }
  const millis = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(millis) ? millis : null;
}

export function isSnapshotFresh(timestamp, now = Date.now(), maxAgeMs = 24 * 60 * 60 * 1000) {
  const updatedAt = timestampToMillis(timestamp);
  const age = now - updatedAt;
  return updatedAt !== null && age >= 0 && age <= maxAgeMs;
}
