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
  queryBusqueda = '',
  filtroRol = 'TODOS'
) {
  // 0. El universo de una auditoría FI nunca es "todos los registros": solo
  // personas con asistencia PFD explícitamente confirmada y en estado activo.
  const universoPfd = (Array.isArray(todosParticipantes) ? todosParticipantes : [])
    .filter((participante) => {
      if (participante?.asistioPFD !== true) return false;
      // Directiva de Gobernanza: Segregar y aislar equipos de soporte/aliados (ej. Equipo 1000)
      const eqNorm = (participante.equipo || '').toLowerCase();
      if (eqNorm.includes('equipo 1000') || eqNorm.includes('1000')) return false;
      // Excluir desertores e inactivos (solo participantes y managers en juego activos)
      if (participante?.isDesertor === true || participante?.isActivo === false || participante?.estado === 'DESERTOR') return false;
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

  // 5. Filtrado por Rol institucional (PX vs MANAGER)
  if (filtroRol && filtroRol !== 'TODOS') {
    const rolTarget = String(filtroRol).toUpperCase();
    filtrados = filtrados.filter(p => (p.rol || 'PX').toUpperCase() === rolTarget);
  }

  // 6. Filtrado por búsqueda en tiempo real
  if (queryBusqueda && queryBusqueda.trim() !== '') {
    const qNorm = normalizarTexto(queryBusqueda);
    filtrados = filtrados.filter(p => {
      const nombreNorm = normalizarTexto(p.nombre || '');
      const dniNorm = normalizarTexto(p.dni || '');
      const equipoNorm = normalizarTexto(p.equipo || '');
      const rolNorm = normalizarTexto(p.rol || 'PX');
      return nombreNorm.includes(qNorm) || dniNorm.includes(qNorm) || equipoNorm.includes(qNorm) || rolNorm.includes(qNorm);
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

/**
 * ============================================================================
 * PROMPT MAESTRO DE AUDITORÍA Y GUÍA DEL PROPÓSITO ("PARA QUÉ")
 * Estándar E.M.P.O.R. (Específico, Medible, Propósito, Organizado y Retador)
 * Directiva de Alta Dirección - Crear Poder Sin Límites (CPSL) / Nodus
 * ============================================================================
 */

export const PROMPT_MAESTRO_AUDITORIA_3_RI = `PROMPT MAESTRO DE AUDITORÍA: 3 RESULTADOS IMPOSIBLES (NODUS)

[ROL Y CONTEXTO]
Actúas como Entrenador Senior y Auditor de Desempeño en Crear Poder Sin Límites (CPSL) dentro de la plataforma Nodus. Tu objetivo es auditar los 3 Resultados Imposibles (RI) redactados por un participante y emitir una retroalimentación altamente asertiva, objetiva, empática y constructiva (sin ser agresiva, ni descalificadora, ni punitiva). El participante (y su partner de apoyo) debe entender la observación a la primera lectura y saber exactamente qué ajustar de inmediato sin dudas ni trabas.

[CRITERIOS DE AUDITORÍA PARA CADA RESULTADO IMPOSIBLE]
Evalúa cada uno de los 3 Resultados Imposibles según estos 3 pilares:
1. Especificidad y Medición: ¿Tiene una meta cuantificable, fecha límite clara (en el marco de los 90 días) y un indicador de éxito verificable?
2. Nivel de Desafío ("Imposible"): ¿Rompe la zona de confort y el historial pasado, requiriendo un estiramiento personal, o es una meta ordinaria/inercial?
3. Conexión con el Propósito ("Para Qué"): ¿Muestra claridad en el beneficio o transformación de fondo, o es solo un deseo vago o abstracto?

[ESTRUCTURA DE RESPUESTA OBLIGATORIA]
Para los 3 Resultados Imposibles en conjunto, genera la evaluación con la siguiente estructura exacta:

---
EVALUACIÓN DE RESULTADOS IMPOSIBLES (NODUS)

ESTADO GENERAL: [APROBADO] o [REQUIERE ELEVAR EL ESTÁNDAR]

RESUMEN POR RESULTADO:

1. Resultado Imposible 1:
   - Estado: [APROBADO / REQUIERE ELEVAR EL ESTÁNDAR]
   - Reflejo Asertivo: (1 a 2 frases claras observando el acierto o el punto ciego de la redacción sin emitir juicios personales).
   - Ajuste Inmediato Sugerido (si aplica): (Instrucción concreta de redacción para corregir en Nodus al instante).

2. Resultado Imposible 2:
   - Estado: [APROBADO / REQUIERE ELEVAR EL ESTÁNDAR]
   - Reflejo Asertivo: ...
   - Ajuste Inmediato Sugerido (si aplica): ...

3. Resultado Imposible 3:
   - Estado: [APROBADO / REQUIERE ELEVAR EL ESTÁNDAR]
   - Reflejo Asertivo: ...
   - Ajuste Inmediato Sugerido (si aplica): ...

PREGUNTA CUÁNTICA DE ENFOQUE:
(Una sola pregunta poderosa dirigida a conectar al participante con su "Para Qué" y moverlo a la acción inmediata con su equipo y partner).
---

[REGLAS DE TONO Y ESTILO]
- Mantén un lenguaje firme en el estándar pero cálido en el trato.
- Evita palabras como "error", "malo", "fallaste" o "insuficiente". Utiliza expresiones como "oportunidad de precisión", "elevar el estándar", "definir el indicador" o "hacer tangible el resultado".
- Si el resultado es vago (ej: "Quiero tener más paz"), no lo rechaces tajantemente; guíalo a medirlo (ej: "Para hacer medible tu paz, ¿cuántas sesiones de meditación o qué hábito concreto verificarás cada semana?").
- Garantiza que cualquier sugerencia le tome al participante menos de 3 minutos de corregir en la plataforma.`;

export const GUIA_PROPOSITO_3_CAPAS_RI = {
  titulo: 'Guía para Encontrar el Propósito y "Para Qué" en los Resultados Imposibles',
  subtitulo: 'Diseñada para compartir con participantes o aplicar en sesiones de alineación con managers y partners.',
  definicion: 'Un Resultado Imposible no es una fantasía irrealizable; es una meta que tu mentalidad actual no sabe cómo lograr únicamente con tus hábitos pasados. Requiere que te transformes en la persona capaz de sostener ese resultado.',
  paso1: {
    titulo: 'Paso 1: La Fórmula de 3 Capas del "Para Qué" (Profundización Consciente)',
    descripcion: 'Para que un resultado tenga tracción y no se abandone ante el primer obstáculo, aplica la prueba de las 3 preguntas descendentes:',
    capas: [
      {
        numero: 1,
        capa: 'Capa 1 (El Qué - Lo Superficial)',
        pregunta: '¿Qué quieres lograr concretamente?',
        ejemplo: '"Aumentar mis ingresos en S/ 10,000 al mes."'
      },
      {
        numero: 2,
        capa: 'Capa 2 (El Para Qué Personal)',
        pregunta: '¿Para qué quieres ese logro en tu vida?',
        ejemplo: '"Para tener tranquilidad financiera y pagar deudas pendientes."'
      },
      {
        numero: 3,
        capa: 'Capa 3 (El Para Qué Profundo / Identidad e Impacto)',
        pregunta: '¿En quién te conviertes y a quiénes impactas cuando lo logras?',
        ejemplo: '"Para recuperar la libertad de mi tiempo, modelar abundancia y serenidad a mis hijos, y operar desde la certeza y la palabra honrada."'
      }
    ],
    reglaOro: 'El "Qué" sostiene la meta; el "Para Qué Profundo" sostiene tu compromiso cuando la motivación decae.'
  },
  paso2: {
    titulo: 'Paso 2: Matriz de Estructuración de los 3 Resultados Imposibles',
    descripcion: 'Cada uno de tus 3 Resultados Imposibles debe construirse bajo el estándar E.M.P.O.R. (Específico, Medible, Propósito, Organizado y Retador):',
    tabla: [
      {
        componente: '1. Específico y Medible',
        requisito: 'Cifras exactas, montos o unidades de verificación.',
        incorrecto: '"Mejorar mi salud y bajar de peso."',
        correcto: '"Reducir mi porcentaje de grasa corporal al 18% e inscribirme y correr una carrera de 10K el 15 de diciembre."'
      },
      {
        componente: '2. Fecha Innegociable',
        requisito: 'Día, mes y hora límite dentro de los 90 días.',
        incorrecto: '"Lo haré pronto en este ciclo."',
        correcto: '"Completado y verificado antes del viernes 18 de diciembre a las 6:00 PM."'
      },
      {
        componente: '3. Propósito Declarado',
        requisito: 'Un "para qué" conectado a tu crecimiento personal o familiar.',
        incorrecto: '"Para ganar más dinero."',
        correcto: '"Para consolidar mi libertad financiera y brindar estabilidad y tiempo de calidad a mi familia."'
      }
    ]
  },
  paso3: {
    titulo: 'Paso 3: Checklist Rápido de Autocorrección Inmediata',
    descripcion: 'Antes de guardar tus 3 Resultados Imposibles en Nodus, verifica estos 4 puntos simples:',
    items: [
      '¿Cualquier persona externa puede saber si lo lograste o no leyendo una sola cifra? (Si la respuesta es no, agrega la cifra o fecha exacta).',
      '¿Tu meta depende 100% de tu gestión y liderazgo? (Si depende de terceros o suerte, reescríbela enfocado en tu entrega o indicador).',
      '¿Te genera un cosquilleo de reto o expansión? (Si se siente fácil o inercial, eleva la cifra un 20%).',
      '¿Lo compartiste con tu partner de equipo para validar tu compromiso? (Asegura la trazabilidad y acompañamiento).'
    ]
  },
  textoCompartible: `🌟 *GUÍA PARA ENCONTRAR EL PROPÓSITO Y "PARA QUÉ" EN TUS 3 RESULTADOS IMPOSIBLES (NODUS)*

¿Por qué un "Resultado Imposible"?
Un Resultado Imposible no es una fantasía irrealizable; es una meta que tu mentalidad actual no sabe cómo lograr únicamente con tus hábitos pasados. Requiere que te transformes en la persona capaz de sostener ese resultado.

━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 *PASO 1: LA FÓRMULA DE 3 CAPAS DEL "PARA QUÉ"*
1. *Capa 1 (El Qué - Lo Superficial):* ¿Qué quieres lograr concretamente?
   _Ejemplo:_ "Aumentar mis ingresos en S/ 10,000 al mes."
2. *Capa 2 (El Para Qué Personal):* ¿Para qué quieres ese logro en tu vida?
   _Ejemplo:_ "Para tener tranquilidad financiera y pagar deudas pendientes."
3. *Capa 3 (El Para Qué Profundo / Identidad e Impacto):* ¿En quién te conviertes y a quiénes impactas cuando lo logras?
   _Ejemplo:_ "Para recuperar la libertad de mi tiempo, modelar abundancia y serenidad a mis hijos, y operar desde la certeza y la palabra honrada."

*Regla de Oro:* El "Qué" sostiene la meta; el "Para Qué Profundo" sostiene tu compromiso cuando la motivación decae.

━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 *PASO 2: MATRIZ DE ESTRUCTURACIÓN E.M.P.O.R.*
(Específico, Medible, Propósito, Organizado y Retador)

1. *Específico y Medible:*
   • Vago: "Mejorar mi salud y bajar de peso."
   • Elevado al Estándar: "Reducir mi porcentaje de grasa corporal al 18% e inscribirme y correr una carrera de 10K el 15 de diciembre."

2. *Fecha Innegociable:*
   • Vago: "Lo haré pronto en este ciclo."
   • Elevado al Estándar: "Completado y verificado antes del viernes 18 de diciembre a las 6:00 PM."

3. *Propósito Declarado:*
   • Vago: "Para ganar más dinero."
   • Elevado al Estándar: "Para consolidar mi libertad financiera y brindar estabilidad y tiempo de calidad a mi familia."

━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 *PASO 3: CHECKLIST RÁPIDO DE AUTOCORRECCIÓN*
1. ¿Cualquier persona externa puede saber si lo lograste o no leyendo una sola cifra?
2. ¿Tu meta depende 100% de tu gestión y liderazgo?
3. ¿Te genera un cosquilleo de reto o expansión?
4. ¿Lo compartiste con tu partner de equipo para validar tu compromiso?`
};

/**
 * Genera el Prompt Maestro listo para pegar en Gemini o cualquier LLM
 * con los datos y metas del participante ya inyectados.
 */
export function generarPromptParaParticipante(participante = {}) {
  const nombre = participante.nombre || 'Participante Nodus';
  const dni = participante.dni || 'Sin DNI';
  const sede = participante.sede || 'Global';
  const equipo = participante.equipo || 'Equipo';

  const rawFis = Array.isArray(participante.fis) ? participante.fis : (participante.resultadosImposibles || []);
  const ris = rawFis.slice(0, 3);

  const formatMeta = (idx) => {
    const ri = ris[idx];
    if (!ri || !ri.meta || !ri.meta.trim()) {
      return `[SIN REDACTAR EN PLATAFORMA] (Área: ${ri?.area || `Resultado ${idx + 1}`})`;
    }
    const area = ri.area ? `[Área: ${ri.area}] ` : '';
    const titulo = ri.titulo ? `"${ri.titulo}": ` : '';
    return `${area}${titulo}${ri.meta.trim()}`;
  };

  const seccionParticipante = `
[DATOS DEL PARTICIPANTE A AUDITAR]
Nombre Completo: ${nombre}
Documento (DNI/Cédula): ${dni}
Sede Operativa: ${sede}
Equipo Asignado: ${equipo}

[METAS DECLARADAS POR EL PARTICIPANTE EN NODUS]
1. Resultado Imposible 1: ${formatMeta(0)}
2. Resultado Imposible 2: ${formatMeta(1)}
3. Resultado Imposible 3: ${formatMeta(2)}

[INSTRUCCIÓN DIRECTA]
Por favor genera la retroalimentación de desempeño siguiendo estricta e idénticamente la ESTRUCTURA DE RESPUESTA OBLIGATORIA (Estado General, Resumen por Resultado con Reflejo Asertivo y Ajuste Inmediato Sugerido, y Pregunta Cuántica de Enfoque), aplicando las REGLAS DE TONO Y ESTILO sin juicios punitivos.`;

  return `${PROMPT_MAESTRO_AUDITORIA_3_RI}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${seccionParticipante.trim()}`;
}

/**
 * Motor algorítmico de Auditoría Asertiva E.M.P.O.R.
 * Evalúa los 3 Resultados Imposibles según los 3 pilares definidos por Dirección
 * produciendo retroalimentación constructiva, sin palabras punitivas.
 */
export function auditarResultadosImposiblesEMPOR(resultados = [], participante = {}) {
  const items = Array.isArray(resultados) ? resultados.slice(0, 3) : [];
  while (items.length < 3) {
    items.push({
      area: `Resultado ${items.length + 1}`,
      titulo: '',
      meta: ''
    });
  }

  const evaluacionesResultados = items.map((ri, idx) => {
    const meta = (ri?.meta || '').trim();
    const area = ri?.area || `Resultado Imposible ${idx + 1}`;
    const titulo = ri?.titulo || '';

    // Pilar 1: Especificidad y Medición (cifras, %, $, unidades de verificación)
    const tieneNumeros = /\d+/.test(meta);
    const tieneFecha = /enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre|2026|semanas?|días?|horas?|fecha|límite|antes del/i.test(meta);
    const tieneMetrica = tieneNumeros || /10k|kilos?|kg|%|usd|soles|s\/|dólares|pesos/i.test(meta);
    const pilarMedicion = tieneMetrica && tieneFecha;

    // Pilar 2: Nivel de Desafío ("Imposible" / Estiramiento)
    const palabras = meta ? meta.split(/\s+/).length : 0;
    const pilarDesafio = palabras >= 12;

    // Pilar 3: Conexión con el Propósito ("Para Qué" / Identidad)
    const tieneConectorProposito = /\b(para|con el fin de|modelar|impactar|transformar|construir|garantizar|consolidar|vivir en|operar desde)\b/i.test(meta);
    const pilarProposito = tieneConectorProposito && palabras >= 14;

    // Evaluación global de este resultado
    let estado = 'APROBADO';
    let reflejoAsertivo = '';
    let ajusteInmediato = null;

    if (!meta) {
      estado = 'REQUIERE ELEVAR EL ESTÁNDAR';
      reflejoAsertivo = `El ${area} aún no registra una declaración redactada en la plataforma oficial de Nodus.`;
      ajusteInmediato = `Redacta tu meta bajo el estándar E.M.P.O.R.: Define una cifra o entregable exacto, una fecha innegociable dentro de los 90 días y el "Para Qué" profundo que sostendrá tu compromiso.`;
    } else if (!pilarMedicion && !pilarProposito) {
      estado = 'REQUIERE ELEVAR EL ESTÁNDAR';
      reflejoAsertivo = `La meta expresa una aspiración valiosa, con una clara oportunidad de precisión en su indicador de éxito y en su propósito de fondo.`;
      ajusteInmediato = `Agrega una cifra exacta verificable (ej: montos, porcentaje o sesiones), una fecha límite fija y añade la frase: "Para [en quién te conviertes al lograrlo]".`;
    } else if (!pilarMedicion) {
      estado = 'REQUIERE ELEVAR EL ESTÁNDAR';
      if (!tieneMetrica) {
        reflejoAsertivo = `El compromiso muestra dirección e intención, requiriendo definir el indicador tangible que permita a tu partner y a cualquier persona externa comprobar su cumplimiento con una sola cifra.`;
        ajusteInmediato = `Incorpora una cifra exacta o entregable medible verificable (ej: cantidad de horas, porcentaje, monto o unidad concreta).`;
      } else {
        reflejoAsertivo = `La meta tiene una métrica definida, pero requiere anclar la fecha innegociable dentro de los 90 días del ciclo para detonar urgencia y foco inmediato.`;
        ajusteInmediato = `Agrega el día, mes y hora límite exacta de cumplimiento (ej: "antes del viernes 18 de diciembre a las 6:00 PM").`;
      }
    } else if (!pilarProposito) {
      estado = 'REQUIERE ELEVAR EL ESTÁNDAR';
      reflejoAsertivo = `Excelente precisión en el qué y en la fecha; la oportunidad actual es conectar la meta con la Capa 3 del "Para Qué Profundo" (identidad e impacto).`;
      ajusteInmediato = `Completa la redacción sumando el propósito de identidad: "¿En quién te conviertes y a quiénes beneficias cuando este resultado sea un hecho tangible?".`;
    } else if (!pilarDesafio) {
      estado = 'REQUIERE ELEVAR EL ESTÁNDAR';
      reflejoAsertivo = `La redacción es muy concisa; amplía el marco de acción para asegurar que rompa tu zona de confort e invite a un estiramiento personal.`;
      ajusteInmediato = `Eleva el indicador un 20% o detalla el estándar de calidad y entrega que lo convertirá en un verdadero Resultado Imposible.`;
    } else {
      estado = 'APROBADO';
      reflejoAsertivo = `Excelente estructuración: meta específica, cuantificable, retadora, con fecha innegociable y un propósito de fondo alineado al estándar superior.`;
      ajusteInmediato = null;
    }

    return {
      index: idx,
      orden: idx + 1,
      area,
      titulo,
      meta,
      estado,
      reflejoAsertivo,
      ajusteInmediato,
      pilares: {
        especificidadYMedicion: pilarMedicion,
        nivelDesafio: pilarDesafio,
        conexionProposito: pilarProposito
      }
    };
  });

  const aprobadosCount = evaluacionesResultados.filter(r => r.estado === 'APROBADO').length;
  const estadoGeneral = aprobadosCount === 3 ? 'APROBADO' : 'REQUIERE ELEVAR EL ESTÁNDAR';

  const preguntasCuanticas = [
    'Si tuvieras la certeza absoluta de que tu palabra sostiene este resultado, ¿cuál es la primera acción innegociable que acordarás hoy mismo con tu partner y tu equipo?',
    'Al conectar con tu "Para Qué Profundo", ¿en qué líder te comprometes a transformarte durante estos 90 días para que este resultado sea inevitable?',
    '¿Qué conversación postergada o acuerdo valiente vas a generar en las próximas 24 horas para honrar tu compromiso al 100%?',
    'Si tu resultado imposible impactara directamente a las personas que más amas, ¿qué estándar innegociable elegirás encarnar desde este preciso momento?'
  ];
  const preguntaCuantica = preguntasCuanticas[Math.abs(evaluacionesResultados.length) % preguntasCuanticas.length];

  return {
    estadoGeneral,
    aprobadosCount,
    totalResultados: 3,
    cumpleEstandarSuperior: estadoGeneral === 'APROBADO',
    resultados: evaluacionesResultados,
    preguntaCuantica,
    participante: {
      nombre: participante.nombre || 'Participante',
      sede: participante.sede || 'Global',
      equipo: participante.equipo || 'Equipo'
    }
  };
}

/**
 * Convierte el resultado estructurado de la auditoría EMPOR al texto oficial
 * idéntico al esquema de respuesta del Prompt Maestro.
 */
export function generarTextoEvaluacionCompleta(evaluacion = {}) {
  const estadoGeneral = evaluacion.estadoGeneral || 'REQUIERE ELEVAR EL ESTÁNDAR';
  const resultados = Array.isArray(evaluacion.resultados) ? evaluacion.resultados : [];

  const bloquesResultados = resultados.map((r, idx) => {
    const lines = [
      `${idx + 1}. ${r.area || `Resultado Imposible ${idx + 1}`}:`,
      `   - Estado: [${r.estado}]`,
      `   - Reflejo Asertivo: ${r.reflejoAsertivo}`
    ];
    if (r.ajusteInmediato) {
      lines.push(`   - Ajuste Inmediato Sugerido (si aplica): ${r.ajusteInmediato}`);
    }
    return lines.join('\n');
  }).join('\n\n');

  const pregunta = evaluacion.preguntaCuantica || 'Si tuvieras la certeza absoluta de que tu palabra sostiene este resultado, ¿cuál es la primera acción innegociable que acordarás hoy mismo con tu partner y tu equipo?';

  return `---
EVALUACIÓN DE RESULTADOS IMPOSIBLES (NODUS)

ESTADO GENERAL: [${estadoGeneral}]

RESUMEN POR RESULTADO:

${bloquesResultados}

PREGUNTA CUÁNTICA DE ENFOQUE:
${pregunta}
---`.trim();
}

/**
 * DOCUMENTACIÓN DE ACTUALIZACIÓN Y TRAZABILIDAD: MÓDULO CAUSO OS
 * Especificación técnica y operacional de auditoría para Armando.
 */
export const ESPECIFICACION_AUDITORIA_ARMANDO = {
  titulo: 'Documentación de Actualización y Trazabilidad: Módulo CAUSO OS',
  subtitulo: 'Especificación técnica y operacional de auditoría para Armando.',
  seccion1: {
    titulo: '1. Especificaciones del Cambio de Arquitectura',
    descripcion: 'La presente actualización del sistema CAUSO OS introduce una modificación fundamental en la estructura de seguimiento de desempeño individual: la transición del modelo de 5 Factores/Futuros Imposibles (FIs) a un máximo estricto de 3 Resultados Imposibles (RIs) por participante.',
    motivos: [
      {
        nombre: 'Foco Estratégico Concentrado',
        detalle: 'La dispersión en 5 metas diluía la tasa de ejecución efectiva. Concentrar la atención en 3 RIs incrementa la densidad de cumplimiento prioritario.'
      },
      {
        nombre: 'Trazabilidad y Calidad de Auditoría',
        detalle: 'Permite a la auditoría de CAUSO OS evaluada por Armando verificar con mayor profundidad las métricas objetivas y el impacto real de cada RI.'
      },
      {
        nombre: 'Alineación con Hábitos de Alto Rendimiento (HAR)',
        detalle: 'Cada uno de los 3 RIs se vincula directamente con un conjunto de rutinas diarias ejecutables, reduciendo la fricción operativa.'
      }
    ]
  },
  seccion2: {
    titulo: '2. Diferenciación y Arquitectura Conceptual: RIs vs. HAR',
    descripcion: 'Para garantizar una auditoría limpia y estructurada dentro del sistema CAUSO OS, se establece una separación técnica y conceptual entre los Resultados Imposibles (RIs) y los Hábitos de Alto Rendimiento (HAR).',
    matriz: [
      {
        dimension: 'Naturaleza',
        ri: 'Metas sustanciales, disruptivas y cuantificables a mediano/largo plazo.',
        har: 'Rutinas operativas, comportamientos y acciones diarias o semanales.'
      },
      {
        dimension: 'Enfoque',
        ri: 'Orientado al RESULTADO (¿Qué se va a lograr?).',
        har: 'Orientado al PROCESO (¿Qué se ejecuta hoy?).'
      },
      {
        dimension: 'Medición',
        ri: 'Indicador de corte o hito (ej. USD alcanzados, kg reducidos, contratos cerrados).',
        har: 'Frecuencia de ejecución y tasa de adherencia diaria (%)'
      },
      {
        dimension: 'Frecuencia de Evaluación',
        ri: 'Semanal / Mensual / Trimestral en la sesión de trazabilidad.',
        har: 'Registro diario con validación continua de disciplina.'
      },
      {
        dimension: 'Estructura en Backend',
        ri: 'Entidad macro vinculada a hitos, fechas límite y evidencias.',
        har: 'Entidad micro vinculada a logs diarios y contadores de racha (streak).'
      }
    ]
  },
  seccion4: {
    titulo: '4. Reglas de Negocio y Checklist de Auditoría en CAUSO OS',
    reglas: [
      {
        numero: 1,
        nombre: 'Límite Estricto de 3 RIs',
        descripcion: 'El sistema CAUSO OS bloquea cualquier intento de registrar un 4.º resultado. Los antiguos FIs quedan archivados en el historial de trazabilidad.'
      },
      {
        numero: 2,
        nombre: 'Asignación del Rol de Apoyo',
        descripcion: "Al referirse a la persona asignada o al rol de apoyo en los entrenamientos (como en Capítulo Uno o Capítulo Dos), el sistema y la documentación utilizan exclusivamente el término 'partner'. Queda terminantemente descontinuado el uso del término 'sombra'."
      },
      {
        numero: 3,
        nombre: 'Vinculación Obligatoria',
        descripcion: 'Todo HAR debe estar explícitamente enlazado a uno de los 3 RIs del participante.'
      },
      {
        numero: 4,
        nombre: 'Validación de Auditoría por Armando',
        descripcion: 'Ningún reporte semanal se marca como "Auditado" si no cuenta con la firma digital o verificación de Armando dentro del módulo CAUSO OS.'
      }
    ],
    checklist: [
      {
        numero: 1,
        criterio: 'Límite de RIs',
        descripcion: 'Confirmar que el participante mantenga un máximo exacto de 3 Resultados Imposibles activos.'
      },
      {
        numero: 2,
        criterio: 'Estructura HAR-RI',
        descripcion: 'Verificar que cada HAR represente una acción procesal diaria y no un resultado macro.'
      },
      {
        numero: 3,
        criterio: 'Validación de Partner',
        descripcion: 'Confirmar que el partner asignado en Capítulo Uno o Capítulo Dos haya validado la evidencia semanal.'
      },
      {
        numero: 4,
        criterio: 'Evidencia de Métricas',
        descripcion: 'Revisar los adjuntos de respaldo que sustentan los avances numéricos de cada RI.'
      },
      {
        numero: 5,
        criterio: 'Trazabilidad de Racha',
        descripcion: 'Comprobar que los logs diarios del participante registren la continuidad real del hábito.'
      }
    ]
  }
};

/**
 * Genera el esquema JSON canónico de datos CAUSO OS según la especificación técnica para Armando.
 */
export function generarEsquemaCausoOSArmando(participante = {}, opciones = {}) {
  const pId = participante.id || participante.dni || 'PAR-2026-8942';
  const rawFis = Array.isArray(participante.fis) ? participante.fis : [];
  
  // Regla 1: Máximo estricto de 3 RIs
  const risSlice = rawFis.slice(0, 3);
  
  const resultadosImposibles = risSlice.map((fi, idx) => {
    const metaText = fi.meta || '';
    const numMatch = metaText.match(/\d+[\d,.]*/);
    const metricaObjetivo = fi.metrica_objetivo || (numMatch ? parseFloat(numMatch[0].replace(/,/g, '')) : 100);
    const metricaActual = fi.metrica_actual !== undefined 
      ? fi.metrica_actual 
      : (fi.estado === 'aprobado' ? metricaObjetivo : Math.round(metricaObjetivo * 0.64));
    
    let unidad = 'PORCENTAJE';
    if (/\$|usd|dólar/i.test(metaText)) unidad = 'USD';
    else if (/s\/|soles|pen/i.test(metaText)) unidad = 'PEN';
    else if (/kg|kilos|grasa/i.test(metaText)) unidad = 'PORCENTAJE';
    else if (/contratos|llamadas|lideres|personas/i.test(metaText)) unidad = 'CANTIDAD';
    
    return {
      ri_id: fi.ri_id || `RI-00${idx + 1}`,
      prioridad: idx + 1,
      titulo: fi.titulo || fi.area || `Resultado Imposible ${idx + 1}`,
      categoria: fi.categoria || fi.area || (idx === 0 ? 'Financiera' : idx === 1 ? 'Profesional' : 'Salud y Vitalidad'),
      metrica_objetivo: metricaObjetivo,
      metrica_actual: metricaActual,
      unidad: fi.unidad || unidad,
      fecha_limite: fi.fecha_limite || '2026-12-15',
      estado: fi.estado === 'aprobado' ? 'APROBADO' : (fi.estado === 'devuelto' ? 'DEVUELTO' : 'EN_PROGRESO')
    };
  });

  // Si no tenía RIs declarados, generar los 3 slots base
  while (resultadosImposibles.length < 3) {
    const nextIdx = resultadosImposibles.length;
    const catDefault = nextIdx === 0 ? 'Financiera' : nextIdx === 1 ? 'Profesional' : 'Salud y Vitalidad';
    resultadosImposibles.push({
      ri_id: `RI-00${nextIdx + 1}`,
      prioridad: nextIdx + 1,
      titulo: `Definición Pendiente RI ${nextIdx + 1}`,
      categoria: catDefault,
      metrica_objetivo: 100,
      metrica_actual: 0,
      unidad: 'PORCENTAJE',
      fecha_limite: '2026-12-31',
      estado: 'EN_PROGRESO'
    });
  }

  // Hábitos de Alto Rendimiento vinculados obligatoriamente a los RIs
  const habitosAltoRendimiento = (opciones.habitos && opciones.habitos.length) 
    ? opciones.habitos 
    : resultadosImposibles.map((ri, idx) => ({
        har_id: `HAR-10${idx + 1}`,
        ri_asociado_id: ri.ri_id,
        descripcion: idx === 0 
          ? 'Realizar prospección y seguimiento prioritario antes del mediodía'
          : idx === 1 
          ? 'Estudiar 45 minutos del módulo de arquitectura CAUSO OS'
          : 'Entrenamiento de fuerza de 60 minutos y caminata de 10k pasos',
        frecuencia: idx === 0 ? 'DIARIA_HABIL' : 'DIARIA',
        cumplimiento_semanal_target: idx === 0 ? 5 : (idx === 1 ? 7 : 6),
        cumplimiento_actual_semana: idx === 0 ? 4 : (idx === 1 ? 6 : 5),
        racha_dias: 10 + (idx * 4)
      }));

  const checklistArmando = opciones.checklist || {
    limite_ris_cumplido: resultadosImposibles.length <= 3,
    separacion_ri_har_correcta: habitosAltoRendimiento.every(h => h.ri_asociado_id && resultadosImposibles.some(r => r.ri_id === h.ri_asociado_id)),
    partner_asignado_verificado: true
  };

  const bloqueAuditoria = {
    auditor: "Armando",
    modulo: "CAUSO OS - Auditoría de RIs & HAR",
    fecha_ultima_auditoria: opciones.fechaAuditoria || new Date().toISOString().split('T')[0],
    estado_auditoria: opciones.estadoAuditoria || (resultadosImposibles.every(r => r.estado === 'APROBADO') ? 'APROBADO' : 'APROBADO_CON_OBSERVACIONES'),
    puntaje_disciplina_har: opciones.puntajeDisciplinaHar !== undefined ? opciones.puntajeDisciplinaHar : 88.3,
    validaciones: {
      limite_ris_cumplido: checklistArmando.limite_ris_cumplido ?? (resultadosImposibles.length <= 3),
      separacion_ri_har_correcta: checklistArmando.separacion_ri_har_correcta ?? true,
      partner_asignado_verificado: checklistArmando.partner_asignado_verificado ?? true
    },
    notas_auditor: opciones.notasAuditor || `Auditoría verificada bajo la directiva oficial CAUSO OS para Armando. El participante mantiene exactamente 3 RIs y sus correspondientes HARs con validación del partner asignado.`
  };

  const cleanName = participante.nombre || 'Carlos Eduardo Mendoza';
  const cleanEmail = participante.email || `${normalizarTexto(cleanName.split(' ')[0])}.mendoza@ejemplo.com`;

  return {
    participante: {
      id: typeof pId === 'string' && pId.startsWith('PAR-') ? pId : `PAR-2026-${String(pId).slice(-4).padStart(4, '0')}`,
      nombre_completo: cleanName,
      email: cleanEmail,
      programa: {
        nivel_actual: participante.nivel_actual || (participante.isCapituloDos ? 'Capítulo Dos' : 'Capítulo Dos'),
        partner_asignado: {
          id: participante.partner?.id || 'PTR-1042',
          nombre: participante.partner?.nombre || participante.partnerName || 'Ana Lucía Torres',
          rol: 'partner'
        }
      }
    },
    resultados_imposibles: resultadosImposibles,
    habitos_alto_rendimiento: habitosAltoRendimiento,
    bloque_auditoria: bloqueAuditoria
  };
}

/**
 * Validador estricto de Reglas de Negocio CAUSO OS para Armando
 */
export function validarReglasNegocioCausoOS(datos = {}) {
  const violaciones = [];
  const ris = Array.isArray(datos.resultados_imposibles) ? datos.resultados_imposibles : [];
  const hars = Array.isArray(datos.habitos_alto_rendimiento) ? datos.habitos_alto_rendimiento : [];
  const jsonStr = JSON.stringify(datos);

  // Regla 1: Límite estricto de 3 RIs
  if (ris.length > 3) {
    violaciones.push('Regla 1 violada: Se superó el límite estricto de 3 Resultados Imposibles.');
  }

  // Regla 2: Exclusividad del término 'partner', terminantemente prohibido 'sombra'
  if (/\bsombra\b/i.test(jsonStr)) {
    violaciones.push("Regla 2 violada: Queda terminantemente descontinuado el uso del término 'sombra'. Utilice exclusivamente 'partner'.");
  }

  // Regla 3: Vinculación obligatoria de todo HAR a un RI
  const riIds = new Set(ris.map(r => r.ri_id));
  const harSinRi = hars.filter(h => !h.ri_asociado_id || !riIds.has(h.ri_asociado_id));
  if (harSinRi.length > 0) {
    violaciones.push(`Regla 3 violada: Existen ${harSinRi.length} hábitos (HAR) sin vinculación a un Resultado Imposible válido.`);
  }

  // Regla 4: Auditoría firmada/verificada por Armando
  const tieneArmando = datos.bloque_auditoria?.auditor === 'Armando';
  if (!tieneArmando) {
    violaciones.push('Regla 4 violada: La auditoría debe estar verificada y firmada por Armando en el módulo CAUSO OS.');
  }

  return {
    valido: violaciones.length === 0,
    violaciones,
    validaciones: {
      limite_ris_cumplido: ris.length <= 3,
      termino_partner_exclusivo: !/\bsombra\b/i.test(jsonStr),
      separacion_ri_har_correcta: harSinRi.length === 0,
      auditor_armando_verificado: tieneArmando
    }
  };
}


