/**
 * AGENTE CENTINELA DE INTELIGENCIA ARTIFICIAL &bull; AUDITOR DE FUTUROS IMPOSIBLES (FIs)
 * Módulo de Inteligencia Operativa y Diagnóstico Predictivo - Causa OS / NODUS CREAR
 * 
 * Misión del Agente:
 * 1. Auditar la cohorte completa de participantes post-PFD en NODUS (https://imo.crearpslglobal.com/futurosimposibles).
 * 2. Calcular índices de entrega, rezago crítico (0 FIs), cuellos de botella de revisión (pendientes) y devueltos.
 * 3. Emitir dictámenes diagnósticos ejecutivos en tiempo real con recomendaciones tácticas para Dirección y Coordinadores.
 * 4. Proveer validación de calidad ontológica sobre las 5 áreas de Futuros Imposibles.
 */

// Helper para remover tildes y diacríticos
export const normalizarTexto = (texto = '') => {
  return texto
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Motor principal de diagnóstico del Agente IA
 */
export function ejecutarDiagnosticoFIs(
  todosParticipantes = [],
  filtroSede = 'GLOBAL',
  filtroEquipo = 'Todos',
  filtroEstado = 'TODOS',
  queryBusqueda = ''
) {
  // 1. Filtrado por sede
  let filtrados = todosParticipantes;
  if (filtroSede && filtroSede !== 'GLOBAL') {
    const sedeNorm = normalizarTexto(filtroSede);
    filtrados = filtrados.filter(p => normalizarTexto(p.sede).includes(sedeNorm));
  }

  // 2. Filtrado por equipo
  if (filtroEquipo && filtroEquipo !== 'Todos') {
    filtrados = filtrados.filter(p => (p.equipo || '').toUpperCase().includes(filtroEquipo.toUpperCase()));
  }

  // 3. Filtrado por estado de FIs
  if (filtroEstado && filtroEstado !== 'TODOS') {
    if (filtroEstado === 'SIN_ENTREGA') {
      filtrados = filtrados.filter(p => (p.totalFi || 0) === 0);
    } else if (filtroEstado === 'PENDIENTES') {
      filtrados = filtrados.filter(p => (p.pendientes || 0) > 0);
    } else if (filtroEstado === 'DEVUELTOS') {
      filtrados = filtrados.filter(p => (p.devueltos || 0) > 0);
    } else if (filtroEstado === 'APROBADOS') {
      filtrados = filtrados.filter(p => (p.aprobados || 0) > 0);
    }
  }

  // 4. Filtrado por búsqueda en tiempo real
  if (queryBusqueda && queryBusqueda.trim() !== '') {
    const qNorm = normalizarTexto(queryBusqueda);
    filtrados = filtrados.filter(p => {
      const nombreNorm = normalizarTexto(p.nombre || '');
      const dniNorm = normalizarTexto(p.dni || '');
      const equipoNorm = normalizarTexto(p.equipo || '');
      return nombreNorm.includes(qNorm) || dniNorm.includes(qNorm) || equipoNorm.includes(qNorm);
    });
  }

  // 5. Métricas globales del subconjunto evaluado
  const totalParticipantes = filtrados.length;
  let conCeroFIs = 0;
  let conFIs = 0;
  let conFIsCompletos = 0;
  let totalFIsRegistrados = 0;
  let totalPendientes = 0;
  let totalDevueltos = 0;
  let totalAprobados = 0;

  // Mapa de desempeño por equipo
  const equiposMap = {};

  filtrados.forEach(p => {
    const tot = p.totalFi || 0;
    const pen = p.pendientes || 0;
    const dev = p.devueltos || 0;
    const apr = p.aprobados || 0;

    totalFIsRegistrados += tot;
    totalPendientes += pen;
    totalDevueltos += dev;
    totalAprobados += apr;

    if (tot === 0) {
      conCeroFIs++;
    } else {
      conFIs++;
      if (tot >= 5) conFIsCompletos++;
    }

    const eqKey = p.equipo || 'Sin Equipo';
    if (!equiposMap[eqKey]) {
      equiposMap[eqKey] = {
        equipo: eqKey,
        total: 0,
        sinEntrega: 0,
        conEntrega: 0,
        pendientes: 0,
        devueltos: 0,
        aprobados: 0
      };
    }
    equiposMap[eqKey].total++;
    if (tot === 0) equiposMap[eqKey].sinEntrega++;
    else equiposMap[eqKey].conEntrega++;
    equiposMap[eqKey].pendientes += pen;
    equiposMap[eqKey].devueltos += dev;
    equiposMap[eqKey].aprobados += apr;
  });

  const tasaEntrega = totalParticipantes > 0 
    ? Math.round((conFIs / totalParticipantes) * 100) 
    : 0;
  const tasaSinEntrega = totalParticipantes > 0 
    ? Math.round((conCeroFIs / totalParticipantes) * 100) 
    : 0;
  const tasaAprobacion = totalFIsRegistrados > 0 
    ? Math.round((totalAprobados / totalFIsRegistrados) * 100) 
    : 0;

  // Calcular semáforo de equipos
  const equiposList = Object.values(equiposMap).map(eq => {
    const pctEntrega = eq.total > 0 ? Math.round((eq.conEntrega / eq.total) * 100) : 0;
    let semaforo = 'ROJO';
    if (pctEntrega >= 75) semaforo = 'VERDE';
    else if (pctEntrega >= 30) semaforo = 'AMARILLO';
    return {
      ...eq,
      pctEntrega,
      semaforo
    };
  }).sort((a, b) => b.pctEntrega - a.pctEntrega);

  const metricas = {
    totalParticipantes,
    conCeroFIs,
    conFIs,
    conFIsCompletos,
    totalFIsRegistrados,
    totalPendientes,
    totalDevueltos,
    totalAprobados,
    tasaEntrega,
    tasaSinEntrega,
    tasaAprobacion,
    equiposList
  };

  // 6. Generar dictamen de inteligencia artificial
  const dictamenIA = generarDictamenEjecutivoIA(metricas, filtroSede, filtroEquipo);

  return {
    participantes: filtrados,
    metricas,
    dictamenIA
  };
}

/**
 * Generador de Dictamen Narrativo y Plan de Acción de la IA
 */
export function generarDictamenEjecutivoIA(metricas, filtroSede, filtroEquipo) {
  const { totalParticipantes, conCeroFIs, tasaSinEntrega, totalPendientes, totalDevueltos, totalAprobados } = metricas;

  let severidad = 'OPTIMA';
  let badgeTexto = 'SITUACIÓN ESTABLE &bull; METAS EN REGLA';
  let colorBadge = '#10b981';

  if (tasaSinEntrega >= 75) {
    severidad = 'CRITICA';
    badgeTexto = `🚨 REZAGO CRÍTICO MASIVO (${tasaSinEntrega}% SIN ENTREGAR)`;
    colorBadge = '#ef4444';
  } else if (tasaSinEntrega >= 35 || totalPendientes > 30) {
    severidad = 'ALERTA';
    badgeTexto = `⚠️ ALERTA OPERATIVA (${tasaSinEntrega}% REZAGADOS / ${totalPendientes} PENDIENTES)`;
    colorBadge = '#f59e0b';
  }

  const sedeLabel = filtroSede === 'GLOBAL' ? 'todas las Sedes' : `Sede ${filtroSede}`;
  const equipoLabel = filtroEquipo === 'Todos' ? '' : ` (${filtroEquipo})`;

  const resumen = `El Agente Centinela IA ha auditado el universo de ${totalParticipantes} participantes que asistieron a su Primer Fin de Semana (PFD) en ${sedeLabel}${equipoLabel}. Se detecta que ${conCeroFIs} participantes (${tasaSinEntrega}%) no registran ningún Futuro Imposible en la plataforma oficial de NODUS. Esto representa un punto ciego crítico para el acompañamiento y consolidación de metas transformacionales del Ciclo 1.`;

  const pilarCobertura = {
    titulo: '1. Diagnóstico de Cobertura y Rezago de Entrega',
    detalle: `De ${totalParticipantes} participantes con asistencia confirmada a PFD, únicamente ${metricas.conFIs} participantes han iniciado la carga de sus metas. Existe un rezago sistemático donde los participantes no están accediendo a imo.crearpslglobal.com/futurosimposibles o los coordinadores no están exigiendo el comprobante de carga antes de la siguiente sesión.`,
    alerta: `${conCeroFIs} participantes en riesgo inminente de perder foco en sus metas.`
  };

  const pilarCuelloBotella = {
    titulo: '2. Cuello de Botella en el Pipeline de Revisión',
    detalle: `Actualmente se registran ${totalPendientes} FIs en estado "Pendiente" y ${totalDevueltos} en estado "Devuelto". ${totalAprobados} han sido completamente certificados. El tiempo de respuesta de los mentores en las revisiones pendientes es clave para que los participantes ajusten metas devueltas antes del próximo fin de semana.`,
    alerta: totalPendientes > 15 ? 'Atención: Acumulación de FIs pendientes requiere sesión extraordinaria de revisión de mentores.' : 'Flujo de revisión en rango manejable.'
  };

  const pilarPlanAccion = {
    titulo: '3. Plan de Contingencia y Directivas Inmediatas (24h - 48h)',
    pasos: [
      {
        plazo: 'Primeras 24 Horas',
        accion: 'Disparar recordatorio masivo de alta prioridad vía WhatsApp desde la coordinación de IMO a los participantes con 0 FIs registrados.',
        responsable: 'Coordinadores C1/C2 y Gerentes de Sede'
      },
      {
        plazo: 'Próximas 48 Horas',
        accion: 'Habilitar "Clínica Virtual de Futuros Imposibles" (sesión de 45 min por Zoom) para redacción y subida en tiempo real de los 5 FIs guiados por mentores.',
        responsable: 'Equipo de Mentores y Facilitadores'
      },
      {
        plazo: 'Fin de Semana',
        accion: 'Bloque obligatorio de 2 horas para revisión de 100% de FIs pendientes y certificación en plataforma NODUS.',
        responsable: 'Mentores y Supervisión de Dirección (José Sánchez)'
      }
    ]
  };

  const directivasParaDireccion = [
    `Intervenir de forma prioritaria en los equipos con 0% de entrega reportados en el semáforo inferior.`,
    `Supervisar que cada coordinador exija la captura de aprobación del FI en NODUS como requisito de habilitación operativa.`,
    `Monitorear el KPI de FIs devueltos (${totalDevueltos}) para garantizar que los participantes no queden bloqueados sin orientación.`
  ];

  return {
    severidad,
    badgeTexto,
    colorBadge,
    resumen,
    pilarCobertura,
    pilarCuelloBotella,
    pilarPlanAccion,
    directivasParaDireccion
  };
}

/**
 * Validador ontológico y de calidad de un Futuro Imposible (FI)
 */
export function evaluarCalidadOntologicaFI(area, titulo, meta) {
  if (!meta || meta.trim().length === 0) {
    return {
      puntaje: 0,
      nivel: 'NO_PRESENTADO',
      etiqueta: 'Sin Redactar',
      color: '#94a3b8',
      observaciones: 'El participante aún no ha registrado esta meta.'
    };
  }

  const palabras = meta.trim().split(/\s+/).length;
  const tieneNumeros = /\d+/.test(meta);
  const tieneFechas = /enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre|2026|meses|semanas/i.test(meta);

  let puntaje = 50;
  if (palabras >= 12) puntaje += 20;
  if (tieneNumeros) puntaje += 15;
  if (tieneFechas) puntaje += 15;

  let nivel = 'MEDIA';
  let etiqueta = 'Alineación Estándar';
  let color = '#f59e0b';

  if (puntaje >= 85) {
    nivel = 'ALTA';
    etiqueta = 'Meta Extraordinaria (Audaz & SMART)';
    color = '#10b981';
  } else if (puntaje < 60) {
    nivel = 'BAJA';
    etiqueta = 'Requiere Mayor Especificidad';
    color = '#ef4444';
  }

  let observaciones = '';
  if (!tieneNumeros) {
    observaciones += 'Se sugiere cuantificar el impacto con números, montos o indicadores precisos. ';
  }
  if (!tieneFechas) {
    observaciones += 'Falta definir la fecha límite exacta o el hito temporal de consecución. ';
  }
  if (palabras < 10) {
    observaciones += 'La redacción es demasiado breve; amplíe el contexto y el compromiso personal.';
  }
  if (!observaciones) {
    observaciones = 'La meta cumple con los estándares de Futuro Imposible: retadora, medible y con marco temporal explícito.';
  }

  return {
    puntaje,
    nivel,
    etiqueta,
    color,
    observaciones: observaciones.trim()
  };
}
