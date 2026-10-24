/**
 * AGENTE CENTINELA DE INTELIGENCIA ARTIFICIAL &bull; AUDITOR DE RESULTADOS IMPOSIBLES
 * Módulo de Inteligencia Operativa y Diagnóstico Predictivo - Causa OS / NODUS CREAR
 * 
 * Directiva Cultural de Alta Dirección (Tecnología NEC):
 * Transición oficial y estricta: "Futuros Imposibles" -> "Resultados Imposibles".
 * Nueva Regla de Negocio: 3 Resultados Imposibles de estándar superior por participante en juego.
 * 
 * Misión del Agente:
 * 1. Auditar la cohorte completa de participantes post-PFD en NODUS (https://imo.crearpslglobal.com/futurosimposibles).
 * 2. Calcular índices de entrega, rezago crítico (0 Resultados), cuellos de botella de revisión (pendientes) y devueltos.
 * 3. Emitir dictámenes diagnósticos ejecutivos en tiempo real con recomendaciones tácticas para Dirección y Coordinadores.
 * 4. Proveer validación de calidad ontológica y SMART sobre los 3 Resultados Imposibles requeridos.
 */

import { canonicalSede } from '../utils/sede.js';

// Helper para remover tildes y diacríticos
export const normalizarTexto = (texto = '') => {
  return texto
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

// Convierte la clave sede|equipo en "Sede · EQUIPO n" para mostrarla.
export const etiquetaEquipo = (filtroEquipo, participantes = []) => {
  if (!filtroEquipo || filtroEquipo === 'Todos' || !String(filtroEquipo).includes('|')) return filtroEquipo;
  const p = participantes.find((x) => equipoKeyDe(x) === filtroEquipo);
  return p ? `${p.sede} · ${p.equipo}` : filtroEquipo;
};

export const equipoKeyDe = (p = {}) => `${normalizarTexto(p.sede || 'sin sede')}|${normalizarTexto(p.equipo || 'sin equipo')}`;

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
  // 0. El universo de una auditoría FI nunca es "todos los registros": solo
  // personas con asistencia PFD explícitamente confirmada. Si la fuente no
  // entrega esa señal, no se inventa una conclusión con datos ambiguos.
  const universoPfd = (Array.isArray(todosParticipantes) ? todosParticipantes : [])
    .filter((participante) => {
      if (participante?.asistioPFD !== true) return false;
      // Directiva de Gobernanza: Segregar y aislar equipos de soporte/aliados (ej. Equipo 1000)
      const eqNorm = (participante.equipo || '').toLowerCase();
      if (eqNorm.includes('equipo 1000') || eqNorm.includes('1000')) return false;
      return true;
    });

  // 1. Filtrado por Sede (Soporte canónico multi-sede y prevención de descalce)
  let participantesEnSede = universoPfd;
  const esFiltroGlobal = !filtroSede || ['global', 'sede global', 'todas', 'todos', 'all'].includes(normalizarTexto(filtroSede));
  if (!esFiltroGlobal) {
    const targetCanon = canonicalSede(filtroSede);
    const sedeNorm = normalizarTexto(filtroSede);
    participantesEnSede = participantesEnSede.filter(p => {
      const pCanon = canonicalSede(p.sede);
      return pCanon === targetCanon || normalizarTexto(p.sede).includes(sedeNorm);
    });
  }

  // 2. Mapa de desempeño por equipo (calculado sobre la sede completa para alimentar filtros y semáforos)
  const equiposMap = {};
  participantesEnSede.forEach(p => {
    const tot = p.totalFi || 0;
    const pen = p.pendientes || 0;
    const dev = p.devueltos || 0;
    const apr = p.aprobados || 0;

    const eqNombre = p.equipo || 'Sin Equipo';
    const eqKey = equipoKeyDe(p);
    if (!equiposMap[eqKey]) {
      equiposMap[eqKey] = {
        key: eqKey,
        sede: p.sede || 'Sin sede',
        equipo: eqNombre,
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

  // Orden jerárquico canónico por Sede institucional
  const SEDE_ORDER = {
    'lima': 1,
    'quito': 2,
    'guayaquil': 3,
    'cuenca': 4,
    'medellin': 5,
    'medellín': 5,
    'cdmx': 6
  };

  // Calcular semáforo de equipos de la sede
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
  }).sort((a, b) => {
    // Si es "Sin Equipo", siempre al final
    const aIsSinEquipo = (a.equipo || '').toLowerCase().includes('sin equipo');
    const bIsSinEquipo = (b.equipo || '').toLowerCase().includes('sin equipo');
    if (aIsSinEquipo && !bIsSinEquipo) return 1;
    if (!aIsSinEquipo && bIsSinEquipo) return -1;

    // Si estamos en vista GLOBAL, agrupar primero coherentemente por Sede
    if (esFiltroGlobal) {
      const orderA = SEDE_ORDER[normalizarTexto(a.sede)] || 99;
      const orderB = SEDE_ORDER[normalizarTexto(b.sede)] || 99;
      if (orderA !== orderB) return orderA - orderB;
    }
    const numA = parseInt((a.equipo || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt((b.equipo || '').replace(/\D/g, ''), 10) || 0;
    return numA - numB || b.pctEntrega - a.pctEntrega;
  });

  // 3. Aplicar filtro de equipo a los participantes
  let filtrados = participantesEnSede;
  if (filtroEquipo && filtroEquipo !== 'Todos') {
    // Empareja por sede+equipo: el mismo código puede existir en varias sedes.
    filtrados = filtrados.filter(p => String(filtroEquipo).includes('|')
      ? equipoKeyDe(p) === filtroEquipo
      : (p.equipo || '').toUpperCase().includes(filtroEquipo.toUpperCase()));
  }

  // 4. Filtrado por estado de FIs
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

  // 5. Filtrado por búsqueda en tiempo real
  if (queryBusqueda && queryBusqueda.trim() !== '') {
    const qNorm = normalizarTexto(queryBusqueda);
    filtrados = filtrados.filter(p => {
      const nombreNorm = normalizarTexto(p.nombre || '');
      const dniNorm = normalizarTexto(p.dni || '');
      const equipoNorm = normalizarTexto(p.equipo || '');
      return nombreNorm.includes(qNorm) || dniNorm.includes(qNorm) || equipoNorm.includes(qNorm);
    });
  }

  // 6. Métricas globales del subconjunto evaluado
  const totalParticipantes = filtrados.length;
  let conCeroFIs = 0;
  let conFIs = 0;
  let conFIsCompletos = 0;
  let totalFIsRegistrados = 0;
  let totalPendientes = 0;
  let totalDevueltos = 0;
  let totalAprobados = 0;

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

  const metricas = {
    totalParticipantes,
    totalParticipantesSede: participantesEnSede.length,
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
  const dictamenIA = generarDictamenEjecutivoIA(metricas, filtroSede, etiquetaEquipo(filtroEquipo, universoPfd));

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

  const sedeLabel = filtroSede === 'GLOBAL' ? 'todas las Sedes' : `Sede ${filtroSede}`;
  const equipoLabel = filtroEquipo === 'Todos' ? '' : ` (${filtroEquipo})`;

  // Cero participantes no es una situación óptima. Es ausencia de universo
  // verificable y por seguridad operativa debe detener el dictamen.
  if (totalParticipantes === 0) {
    return {
      severidad: 'SIN_DATOS',
      badgeTexto: '⛔ SIN UNIVERSO PFD VERIFICABLE',
      colorBadge: '#ef4444',
      resumen: `No se puede emitir un diagnóstico de Resultados Imposibles para ${sedeLabel}${equipoLabel}: la fuente actual no aporta participantes con asistencia PFD confirmada. No se interpreta este resultado como cobertura, cumplimiento ni estabilidad.`,
      pilarCobertura: {
        titulo: '1. Universo no verificable',
        detalle: 'La auditoría requiere participantes con asistencia PFD explícita. Hasta que NODUS entregue ese universo, cualquier porcentaje sería engañoso.',
        alerta: 'Sin datos verificables: revisar la sincronización de NODUS antes de tomar decisiones.'
      },
      pilarCuelloBotella: {
        titulo: '2. Revisión no calculable',
        detalle: 'No existen registros PFD verificables sobre los cuales medir entregas, pendientes, devoluciones o aprobaciones.',
        alerta: 'No se asignan responsables ni se envían recordatorios basados en este resultado.'
      },
      pilarPlanAccion: {
        titulo: '3. Acción requerida para recuperar evidencia',
        pasos: [{
          plazo: 'Inmediato',
          accion: 'Revisar la última sincronización NODUS y publicar participantes con id, sede, equipo, asistencia PFD y sus 3 Resultados Imposibles de alto estándar.',
          responsable: 'Integración NODUS / Dirección de Operaciones'
        }]
      },
      directivasParaDireccion: [
        'No declarar cumplimiento ni iniciar campañas con un universo PFD vacío.',
        'Validar fecha, origen y cantidad de registros de la sincronización antes de re-ejecutar el diagnóstico.'
      ]
    };
  }

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

  const resumen = `El Agente Centinela IA ha auditado el universo de ${totalParticipantes} participantes que asistieron a su Primer Fin de Semana (PFD) en ${sedeLabel}${equipoLabel}. Se detecta que ${conCeroFIs} participantes (${tasaSinEntrega}%) no registran ningún Resultado Imposible en la plataforma oficial de NODUS. El nuevo estándar de Alta Dirección exige declarar exactamente 3 Resultados Imposibles cuantificables y retadores por participante en juego.`;

  const pilarCobertura = {
    titulo: '1. Diagnóstico de Cobertura y Rezago de Entrega',
    detalle: `De ${totalParticipantes} participantes con asistencia confirmada a PFD, únicamente ${metricas.conFIs} participantes han iniciado la carga de sus 3 Resultados Imposibles. Existe un rezago sistemático donde los participantes no están accediendo a imo.crearpslglobal.com/futurosimposibles o los coordinadores no están exigiendo el comprobante de carga antes de la siguiente sesión.`,
    alerta: `${conCeroFIs} participantes en riesgo inminente de perder foco en sus metas.`
  };

  const pilarCuelloBotella = {
    titulo: '2. Cuello de Botella en el Pipeline de Revisión',
    detalle: `Actualmente se registran ${totalPendientes} Resultados Imposibles en estado "Pendiente" y ${totalDevueltos} en estado "Devuelto". ${totalAprobados} han sido completamente certificados bajo el estándar superior de 3 metas.`,
    alerta: totalPendientes > 15 ? 'Atención: Acumulación de Resultados Imposibles pendientes requiere sesión extraordinaria de revisión de mentores.' : 'Flujo de revisión en rango manejable.'
  };

  const pilarPlanAccion = {
    titulo: '3. Plan de Contingencia y Directivas Inmediatas (24h - 48h)',
    pasos: [
      {
        plazo: 'Primeras 24 Horas',
        accion: 'Disparar recordatorio masivo de alta prioridad vía WhatsApp desde la coordinación de IMO a los participantes con 0 Resultados Imposibles registrados.',
        responsable: 'Coordinadores C1/C2 y Gerentes de Sede'
      },
      {
        plazo: 'Próximas 48 Horas',
        accion: 'Habilitar "Clínica Virtual de Resultados Imposibles" (sesión de 45 min por Zoom) para redacción y subida en tiempo real de los 3 Resultados Imposibles de estándar superior guiados por mentores.',
        responsable: 'Equipo de Mentores y Facilitadores'
      },
      {
        plazo: 'Fin de Semana',
        accion: 'Bloque obligatorio de 2 horas para revisión de 100% de Resultados Imposibles pendientes y certificación en plataforma NODUS.',
        responsable: 'Mentores y Supervisión de Dirección'
      }
    ]
  };

  const directivasParaDireccion = [
    `Intervenir de forma prioritaria en los equipos con 0% de entrega reportados en el semáforo inferior.`,
    `Supervisar que cada coordinador exija la captura de aprobación de los 3 Resultados Imposibles en NODUS como requisito de habilitación operativa.`,
    `Monitorear el KPI de Resultados Imposibles devueltos (${totalDevueltos}) para garantizar que los participantes no queden bloqueados sin orientación.`
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
 * Validador ontológico y de calidad de un Resultado Imposible (RI)
 */
export function evaluarCalidadOntologicaFI(area, titulo, meta) {
  if (!meta || meta.trim().length === 0) {
    return {
      puntaje: 0,
      nivel: 'NO_PRESENTADO',
      etiqueta: 'Sin Redactar',
      color: '#94a3b8',
      observaciones: 'El participante aún no ha registrado este Resultado Imposible.'
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
    etiqueta = 'Resultado Extraordinario (Audaz & SMART)';
    color = '#10b981';
  } else if (puntaje < 60) {
    nivel = 'BAJA';
    etiqueta = 'Requiere Mayor Especificidad y Cuantificación';
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
    observaciones = 'La meta cumple con los estándares de Resultado Imposible: retadora, medible y con marco temporal explícito.';
  }

  return {
    puntaje,
    nivel,
    etiqueta,
    color,
    observaciones: observaciones.trim()
  };
}

// Alias cultural para mantener compatibilidad total
export const evaluarCalidadOntologicaRI = evaluarCalidadOntologicaFI;

/**
 * Motor de Auditoría IA para Participantes "En Juego" (Regla de 3 Resultados Imposibles)
 * Cruce inmutable con Nodus sin alteración de base de datos
 */
export function auditarParticipantesEnJuego3Resultados(participantes = [], evidenciasNodus = {}) {
  const enJuego = (Array.isArray(participantes) ? participantes : []).filter(p => {
    if (!p) return false;
    const asistio = p.asistioPFD === true;
    const esActivo = p.estadoParticipante === 'ACTIVO' || p.enJuego === true || asistio;
    const eqNorm = (p.equipo || '').toLowerCase();
    const noSoporte = !eqNorm.includes('equipo 1000') && !eqNorm.includes('1000');
    return esActivo && noSoporte;
  });

  const auditados = enJuego.map(p => {
    const rawFis = Array.isArray(p.fis) ? p.fis : [];
    // Estándar de Alto Rendimiento: Exactamente los 3 primeros Resultados Imposibles
    const activeRIs = rawFis.slice(0, 3).map((ri, idx) => {
      const evaluacion = evaluarCalidadOntologicaFI(ri.area || `Resultado ${idx + 1}`, ri.titulo, ri.meta);
      const tieneEvidenciaNodus = Boolean(evidenciasNodus[`${p.id}__${idx}`] || ri.evidenciaUrl || ri.estado === 'aprobado');
      
      let estadoAuditado = ri.estado || 'pendiente';
      if (!ri.meta || !ri.meta.trim()) {
        estadoAuditado = 'no_presentado';
      } else if (tieneEvidenciaNodus && evaluacion.puntaje >= 70) {
        estadoAuditado = 'aprobado';
      } else if (evaluacion.puntaje < 60) {
        estadoAuditado = 'devuelto';
      }

      return {
        ...ri,
        index: idx,
        orden: idx + 1,
        evaluacion,
        tieneEvidenciaNodus,
        estado: estadoAuditado
      };
    });

    // Rellenar hasta 3 si faltan declarar
    while (activeRIs.length < 3) {
      const idx = activeRIs.length;
      activeRIs.push({
        index: idx,
        orden: idx + 1,
        area: `Resultado ${idx + 1}`,
        titulo: '',
        meta: '',
        estado: 'no_presentado',
        evaluacion: evaluarCalidadOntologicaFI('', '', ''),
        tieneEvidenciaNodus: false
      });
    }

    const aprobados3 = activeRIs.filter(r => r.estado === 'aprobado').length;
    const pendientes3 = activeRIs.filter(r => r.estado === 'pendiente').length;
    const devueltos3 = activeRIs.filter(r => r.estado === 'devuelto').length;
    const cargados3 = activeRIs.filter(r => r.estado !== 'no_presentado').length;
    const cumpleEstandarSuperior = aprobados3 === 3;

    return {
      ...p,
      rawFis, // Inmutabilidad histórica total
      resultadosImposibles: activeRIs,
      totalResultados3: cargados3,
      aprobados3,
      pendientes3,
      devueltos3,
      cumpleEstandarSuperior,
      porcentajeCumplimiento: Math.round((aprobados3 / 3) * 100),
      dictamenIA: cumpleEstandarSuperior
        ? 'CERTIFICADO_3_DE_3'
        : cargados3 === 0
        ? 'REZAGO_CRITICO_0_DE_3'
        : 'EN_PROCESO_AUDITORIA'
    };
  });

  const totalEnJuego = auditados.length;
  const certificadosCompletos = auditados.filter(p => p.cumpleEstandarSuperior).length;
  const sinEntrega = auditados.filter(p => p.totalResultados3 === 0).length;
  const enProceso = totalEnJuego - certificadosCompletos - sinEntrega;
  const efectividadGlobal = totalEnJuego > 0 ? Math.round((certificadosCompletos / totalEnJuego) * 100) : 0;

  return {
    totalEnJuego,
    certificadosCompletos,
    sinEntrega,
    enProceso,
    efectividadGlobal,
    participantesAuditados: auditados
  };
}
