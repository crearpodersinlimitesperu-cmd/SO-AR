/**
 * AGENTE DE AUDITORÍA Y CONCILIACIÓN: SENTADOS VS CONFIRMADOS (C1 & C2)
 * ======================================================================
 * Audita rigurosamente y sin invención de datos la relación entre:
 * 1. Participantes CONFIRMADOS por llamadas de coordinación.
 * 2. Participantes SENTADOS (asistencia real en sala).
 * 3. Desglose estricto por cohorte: NUEVOS vs REZAGADOS.
 * 4. Alcance para Capítulo 1 (C1) y Capítulo 2 (C2) en todas las sedes.
 * 5. Detección de desviaciones críticas: No-Shows, Walk-ins y Tasa de Fuga.
 *
 * Persiste los resultados certificados en Firestore:
 * - `nodus_auditoria_sentados_confirmados/latest_reconciliation`
 * - `nodus_auditoria_sentados_confirmados/${sede.toLowerCase()}_${stage.toLowerCase()}_e${team}`
 * - `audit_logs` (Caja Negra)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const REPORT_SEDES = ['Lima', 'Quito', 'Cuenca', 'Guayaquil', 'Medellín', 'México'];

/**
 * Normaliza cadenas de texto para comparaciones seguras.
 */
export function normStr(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Identifica la sede institucional a partir del nombre del equipo o texto.
 */
export function inferSedeFromTeamName(teamName) {
  const norm = normStr(teamName);
  if (norm.includes('LIMA')) return 'Lima';
  if (norm.includes('QUITO')) return 'Quito';
  if (norm.includes('GUAYAQUIL') || norm.includes('GYE')) return 'Guayaquil';
  if (norm.includes('CUENCA')) return 'Cuenca';
  if (norm.includes('MEDELLIN') || norm.includes('MEDELLÍN')) return 'Medellín';
  if (norm.includes('MEXICO') || norm.includes('MÉXICO')) return 'México';
  return 'Desconocida';
}

/**
 * Identifica el capítulo o fase (C1 o C2).
 */
export function inferStageFromTeamName(teamName) {
  const norm = normStr(teamName);
  if (norm.includes('CICLO 2') || norm.includes('C2') || norm.includes('CAPITULO 2') || norm.includes('CAPÍTULO 2')) return 'C2';
  return 'C1';
}

/**
 * Extrae el número del equipo.
 */
export function extractTeamNumber(teamName) {
  const match = String(teamName || '').match(/EQUIPO\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Construye un mapa consolidado de gestiones por equipo a partir de los coordinadores.
 */
export function buildCoordinatorTeamMap(coordinadores = []) {
  const map = new Map();

  for (const c of coordinadores) {
    const sede = c.sede || 'Desconocida';
    for (const eq of (c.equipos || [])) {
      if (!eq.equipo) continue;
      const teamNum = extractTeamNumber(eq.equipo);
      const stage = eq.fase || eq.capitulo || 'C1';
      const key = `${sede}_${stage}_${teamNum}`;

      if (!map.has(key)) {
        map.set(key, {
          sede,
          stage,
          teamNum,
          llamadasTotal: 0,
          confirmadosTotal: 0,
          sentadosCoordTotal: 0,
          coordinadores: []
        });
      }

      const entry = map.get(key);
      entry.llamadasTotal += (eq.llamadas || 0);
      entry.confirmadosTotal += (eq.confirmado || 0);
      entry.sentadosCoordTotal += (eq.asistieron || 0);
      entry.coordinadores.push({
        nombre: c.nombre,
        llamadas: eq.llamadas || 0,
        confirmados: eq.confirmado || 0,
        asistieron: eq.asistieron || 0
      });
    }
  }

  return map;
}

/**
 * Reconcilia un equipo individual calculando métricas de Sentados vs Confirmados para Nuevos y Rezagados.
 */
export function reconcileTeamAttendance({
  equipoId,
  equipoNombre,
  sede,
  stage,
  participantes = [],
  summary = null,
  coordMetrics = null
}) {
  const cleanSede = sede || inferSedeFromTeamName(equipoNombre);
  const cleanStage = stage || inferStageFromTeamName(equipoNombre);
  const teamNumber = extractTeamNumber(equipoNombre);

  // 1. CASO A: Listado granular de participantes disponible
  if (Array.isArray(participantes) && participantes.length > 0) {
    let nuevosTotal = 0;
    let nuevosConfirmados = 0;
    let nuevosSentados = 0;
    let nuevosNoShows = 0;
    let nuevosWalkIns = 0;

    let rezagadosTotal = 0;
    let rezagadosConfirmados = 0;
    let rezagadosSentados = 0;
    let rezagadosNoShows = 0;
    let rezagadosWalkIns = 0;

    const noShowList = [];
    const walkInList = [];

    for (const p of participantes) {
      // 1. Determinar cohorte (Rezagado vs Nuevo)
      const finDeSemana = normStr(p.finDeSemana || p.grupoReporte || p.tipoParticipante || '');
      const coordName = normStr(p.coordinador || '');
      const prefName = normStr(p.nombrePreferido || p.nombres || '');
      const cat = normStr(p.categoria || '');
      const estC1 = normStr(p.estadoC1 || '');
      
      const isRezagado = finDeSemana.includes('REZAGAD') || 
                          coordName.includes('REZAGAD') || 
                          prefName.includes('REZAGAD') ||
                          cat.includes('REZAGAD') ||
                          estC1.includes('REZAGAD');

      // 2. Determinar confirmación por llamada
      const l1 = normStr(p.llamada1 || '');
      const l2 = normStr(p.llamada2 || '');
      const isConfirmado = l1.includes('CONFIRMADO') || l2.includes('CONFIRMADO') || p.isConfirmed === true;

      // 3. Determinar asistencia real en sala (Sentado)
      const isSentado = p.reportAttendanceC1 === true || 
                        p.reportAttendanceC2 === true || 
                        p.isSeated === true || 
                        normStr(p.asistencia || '').includes('SI') || 
                        normStr(p.asistencia || '') === 'ASISTIO';

      // 4. Clasificar por cohorte
      if (isRezagado) {
        rezagadosTotal++;
        if (isConfirmado) rezagadosConfirmados++;
        if (isSentado) rezagadosSentados++;

        if (isConfirmado && !isSentado) {
          rezagadosNoShows++;
          noShowList.push({
            id: p.nodusParticipantId || p.id || `${p.apellidos}_${p.nombres}`,
            nombre: `${p.nombres || ''} ${p.apellidos || ''}`.trim() || p.nombreCompleto || 'Sin nombre',
            telefono: p.telefono || 'N/D',
            coordinador: p.coordinador || 'N/D',
            cohorte: 'REZAGADO'
          });
        } else if (!isConfirmado && isSentado) {
          rezagadosWalkIns++;
          walkInList.push({
            id: p.nodusParticipantId || p.id || `${p.apellidos}_${p.nombres}`,
            nombre: `${p.nombres || ''} ${p.apellidos || ''}`.trim() || p.nombreCompleto || 'Sin nombre',
            telefono: p.telefono || 'N/D',
            coordinador: p.coordinador || 'N/D',
            cohorte: 'REZAGADO',
            motivo: p.categoria || 'Acreditación directa en sala / Rezagado'
          });
        }
      } else {
        nuevosTotal++;
        if (isConfirmado) nuevosConfirmados++;
        if (isSentado) nuevosSentados++;

        if (isConfirmado && !isSentado) {
          nuevosNoShows++;
          noShowList.push({
            id: p.nodusParticipantId || p.id || `${p.apellidos}_${p.nombres}`,
            nombre: `${p.nombres || ''} ${p.apellidos || ''}`.trim() || p.nombreCompleto || 'Sin nombre',
            telefono: p.telefono || 'N/D',
            coordinador: p.coordinador || 'N/D',
            cohorte: 'NUEVO'
          });
        } else if (!isConfirmado && isSentado) {
          nuevosWalkIns++;
          walkInList.push({
            id: p.nodusParticipantId || p.id || `${p.apellidos}_${p.nombres}`,
            nombre: `${p.nombres || ''} ${p.apellidos || ''}`.trim() || p.nombreCompleto || 'Sin nombre',
            telefono: p.telefono || 'N/D',
            coordinador: p.coordinador || 'N/D',
            cohorte: 'NUEVO',
            motivo: p.categoria || 'Walk-in / Cambio de cupo / Sin confirmación telefónica'
          });
        }
      }
    }

    const totalAsignados = nuevosTotal + rezagadosTotal;
    const totalConfirmados = nuevosConfirmados + rezagadosConfirmados;
    const totalSentados = nuevosSentados + rezagadosSentados;
    const totalNoShows = nuevosNoShows + rezagadosNoShows;
    const totalWalkIns = nuevosWalkIns + rezagadosWalkIns;

    const tasaAsistenciaNuevos = nuevosConfirmados > 0 
      ? Math.round((nuevosSentados / nuevosConfirmados) * 100) 
      : 0;

    const tasaAsistenciaRezagados = rezagadosConfirmados > 0 
      ? Math.round((rezagadosSentados / rezagadosConfirmados) * 100) 
      : 0;

    const tasaAsistenciaGeneral = totalConfirmados > 0 
      ? Math.round((totalSentados / totalConfirmados) * 100) 
      : 0;

    const tasaFuga = totalConfirmados > 0 
      ? Math.round((totalNoShows / totalConfirmados) * 100) 
      : 0;

    return {
      equipoId,
      equipoNombre,
      teamNumber,
      sede: cleanSede,
      stage: cleanStage,
      origenDatos: 'GRANULAR_PARTICIPANTES',
      coordinadores: coordMetrics?.coordinadores || [],
      metricas: {
        totalAsignados,
        totalConfirmados,
        totalSentados,
        tasaAsistenciaGeneral,
        tasaFuga,
        totalNoShows,
        totalWalkIns,
        nuevos: {
          total: nuevosTotal,
          confirmados: nuevosConfirmados,
          sentados: nuevosSentados,
          tasaAsistencia: tasaAsistenciaNuevos,
          noShows: nuevosNoShows,
          walkIns: nuevosWalkIns
        },
        rezagados: {
          total: rezagadosTotal,
          confirmados: rezagadosConfirmados,
          sentados: rezagadosSentados,
          tasaAsistencia: tasaAsistenciaRezagados,
          noShows: rezagadosNoShows,
          walkIns: rezagadosWalkIns
        }
      },
      hallazgos: {
        noShows: noShowList.slice(0, 50),
        walkIns: walkInList.slice(0, 50)
      }
    };
  }

  // 2. CASO B: Resumen oficial de Nodus (cruce coordinadores + sala general)
  const totalParticipantes = summary?.totalParticipantes ?? summary?.total ?? 0;
  const asistieronSala = summary?.asistieron ?? summary?.sentados ?? 0;
  
  // Si tenemos confirmados registrados por coordinadores en Nodus, usar la cifra verídica
  const confirmadosCoord = coordMetrics?.confirmadosTotal ?? 0;
  const confirmadosLlamada = summary?.confirmadosLlamada ?? 0;
  const confirmados = confirmadosCoord > 0 ? confirmadosCoord : confirmadosLlamada;

  // Asistentes reportados desde la lista de llamadas de los coordinadores
  const asistieronCoord = coordMetrics?.sentadosCoordTotal ?? 0;
  const sentados = asistieronSala > 0 ? asistieronSala : asistieronCoord;

  const rezagados = summary?.rezagados ?? 0;
  const nuevos = Math.max(0, totalParticipantes - rezagados);

  // Si hay más sentados que confirmados, la diferencia son ingresos en puerta / walk-ins
  const walkInsEstimados = Math.max(0, sentados - confirmados);
  // Si confirmaron más de los que asistieron de la lista, la diferencia son no-shows
  const noShowsEstimados = Math.max(0, confirmados - (asistieronCoord > 0 ? asistieronCoord : sentados));

  const tasaGeneral = confirmados > 0 ? Math.round((sentados / confirmados) * 100) : 0;
  const tasaFuga = confirmados > 0 ? Math.round((noShowsEstimados / confirmados) * 100) : 0;

  // Desglose por cohorte estimado
  const nuevosConfirmados = Math.min(confirmados, nuevos);
  const nuevosSentados = Math.min(sentados, nuevos);
  const rezagadosConfirmados = Math.max(0, confirmados - nuevosConfirmados);
  const rezagadosSentados = Math.max(0, sentados - nuevosSentados);

  return {
    equipoId,
    equipoNombre,
    teamNumber,
    sede: cleanSede,
    stage: cleanStage,
    origenDatos: 'CONCILIACION_CRUZADA_NODUS',
    coordinadores: coordMetrics?.coordinadores || [],
    metricas: {
      totalAsignados: totalParticipantes,
      totalConfirmados: confirmados,
      totalSentados: sentados,
      tasaAsistenciaGeneral: tasaGeneral,
      tasaFuga,
      totalNoShows: noShowsEstimados,
      totalWalkIns: walkInsEstimados,
      nuevos: {
        total: nuevos,
        confirmados: nuevosConfirmados,
        sentados: nuevosSentados,
        tasaAsistencia: nuevosConfirmados > 0 ? Math.round((nuevosSentados / nuevosConfirmados) * 100) : 0,
        noShows: Math.max(0, nuevosConfirmados - nuevosSentados),
        walkIns: Math.max(0, nuevosSentados - nuevosConfirmados)
      },
      rezagados: {
        total: rezagados,
        confirmados: rezagadosConfirmados,
        sentados: rezagadosSentados,
        tasaAsistencia: rezagadosConfirmados > 0 ? Math.round((rezagadosSentados / rezagadosConfirmados) * 100) : 0,
        noShows: Math.max(0, rezagadosConfirmados - rezagadosSentados),
        walkIns: Math.max(0, rezagadosSentados - rezagadosConfirmados)
      }
    },
    hallazgos: {
      noShows: [],
      walkIns: []
    }
  };
}

/**
 * Obtiene la instancia de Firestore con autenticación segura.
 */
export function getFirebaseDb() {
  const saPaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    '/Users/joseluissanchezmoreno/Downloads/Code/centro-operativo-cpsl-707cf6af45b2.json'
  ].filter(Boolean);

  let credential = null;
  for (const p of saPaths) {
    if (fs.existsSync(p)) {
      credential = cert(JSON.parse(fs.readFileSync(p, 'utf8')));
      break;
    }
  }

  if (!getApps().length) {
    if (credential) {
      initializeApp({ credential });
    } else {
      initializeApp({ projectId: 'centro-operativo-cpsl' });
    }
  }
  return getFirestore();
}

/**
 * Carga los datos de snapshot oficiales de Nodus desde Firestore.
 */
export async function loadNodusSnapshotData(db) {
  let kpiData = null;
  let coordsData = null;
  let auditoriaSalas = [];

  try {
    const kpiSnap = await db.doc('nodus_kpis_sincronizados/latest_snapshot').get();
    if (kpiSnap.exists) kpiData = kpiSnap.data();
  } catch (e) {
    console.warn(`[AgentReconciliation] Advertencia leyendo latest_snapshot: ${e.message}`);
  }

  try {
    const coordSnap = await db.doc('nodus_coordinadores_c1c2/latest').get();
    if (coordSnap.exists) coordsData = coordSnap.data();
  } catch (e) {
    console.warn(`[AgentReconciliation] Advertencia leyendo nodus_coordinadores_c1c2: ${e.message}`);
  }

  try {
    const salasSnap = await db.collection('nodus_auditoria_salas').get();
    auditoriaSalas = salasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn(`[AgentReconciliation] Advertencia leyendo nodus_auditoria_salas: ${e.message}`);
  }

  return { kpiData, coordsData, auditoriaSalas };
}

/**
 * Ejecuta la auditoría completa de reconciliación para C1 y C2.
 */
export async function runSentadosConfirmadosAudit(options = {}) {
  const {
    targetSede = 'all',
    targetStage = 'all', // C1, C2, o all
    targetTeam = null,
    applyToFirestore = false
  } = options;

  console.log('🔍 [Agente Auditor] Iniciando auditoría Sentados vs Confirmados (Nuevos & Rezagados - C1 & C2)...');
  const db = getFirebaseDb();
  const { kpiData, coordsData, auditoriaSalas } = await loadNodusSnapshotData(db);

  // Mapa de llamadas por equipo de los coordinadores
  const coordTeamMap = buildCoordinatorTeamMap(coordsData?.coordinadores || []);

  const equipos = kpiData?.equiposSummary || kpiData?.equipos || [];
  const results = [];

  for (const eq of equipos) {
    const teamName = eq.equipoNombre || eq.equipo || '';
    const sede = inferSedeFromTeamName(teamName);
    const stage = inferStageFromTeamName(teamName);
    const teamNum = extractTeamNumber(teamName);

    // Filtros de ejecución
    if (targetSede !== 'all' && normStr(sede) !== normStr(targetSede)) continue;
    if (targetStage !== 'all' && normStr(stage) !== normStr(targetStage)) continue;
    if (targetTeam && String(teamNum) !== String(targetTeam)) continue;

    // Verificar métricas de coordinadores para este equipo
    const coordKey = `${sede}_${stage}_${teamNum}`;
    const coordMetrics = coordTeamMap.get(coordKey) || null;

    // Verificar si existe auditoría detallada en nodus_auditoria_salas
    const salaDetallada = auditoriaSalas.find(s => {
      const matchSede = normStr(s.sede || '').includes(normStr(sede));
      const matchNum = extractTeamNumber(s.equipo || s.id) === teamNum;
      return matchSede && matchNum;
    });

    let participantes = [];
    if (salaDetallada?.todos && Array.isArray(salaDetallada.todos)) {
      participantes = salaDetallada.todos;
    } else if (eq.participantes && Array.isArray(eq.participantes)) {
      participantes = eq.participantes;
    }

    const reconciled = reconcileTeamAttendance({
      equipoId: eq.equipoId,
      equipoNombre: teamName,
      sede,
      stage,
      participantes,
      summary: eq,
      coordMetrics
    });

    results.push(reconciled);
  }

  // Ordenar por sede, etapa y número de equipo descendente
  results.sort((a, b) => {
    if (a.sede !== b.sede) return a.sede.localeCompare(b.sede);
    if (a.stage !== b.stage) return a.stage.localeCompare(b.stage);
    return (b.teamNumber || 0) - (a.teamNumber || 0);
  });

  // Resumen global consolidado
  const consolidated = {
    totalEquiposAuditados: results.length,
    timestamp: new Date().toISOString(),
    global: {
      totalAsignados: results.reduce((acc, r) => acc + r.metricas.totalAsignados, 0),
      totalConfirmados: results.reduce((acc, r) => acc + r.metricas.totalConfirmados, 0),
      totalSentados: results.reduce((acc, r) => acc + r.metricas.totalSentados, 0),
      totalNoShows: results.reduce((acc, r) => acc + r.metricas.totalNoShows, 0),
      totalWalkIns: results.reduce((acc, r) => acc + r.metricas.totalWalkIns, 0),
      nuevos: {
        total: results.reduce((acc, r) => acc + r.metricas.nuevos.total, 0),
        confirmados: results.reduce((acc, r) => acc + r.metricas.nuevos.confirmados, 0),
        sentados: results.reduce((acc, r) => acc + r.metricas.nuevos.sentados, 0),
        noShows: results.reduce((acc, r) => acc + r.metricas.nuevos.noShows, 0),
        walkIns: results.reduce((acc, r) => acc + r.metricas.nuevos.walkIns, 0)
      },
      rezagados: {
        total: results.reduce((acc, r) => acc + r.metricas.rezagados.total, 0),
        confirmados: results.reduce((acc, r) => acc + r.metricas.rezagados.confirmados, 0),
        sentados: results.reduce((acc, r) => acc + r.metricas.rezagados.sentados, 0),
        noShows: results.reduce((acc, r) => acc + r.metricas.rezagados.noShows, 0),
        walkIns: results.reduce((acc, r) => acc + r.metricas.rezagados.walkIns, 0)
      }
    },
    porSedeYEtapa: {}
  };

  // Calcular tasas globales
  consolidated.global.tasaAsistenciaGeneral = consolidated.global.totalConfirmados > 0
    ? Math.round((consolidated.global.totalSentados / consolidated.global.totalConfirmados) * 100)
    : 0;
  consolidated.global.nuevos.tasaAsistencia = consolidated.global.nuevos.confirmados > 0
    ? Math.round((consolidated.global.nuevos.sentados / consolidated.global.nuevos.confirmados) * 100)
    : 0;
  consolidated.global.rezagados.tasaAsistencia = consolidated.global.rezagados.confirmados > 0
    ? Math.round((consolidated.global.rezagados.sentados / consolidated.global.rezagados.confirmados) * 100)
    : 0;

  for (const r of results) {
    const key = `${r.sede}_${r.stage}`;
    if (!consolidated.porSedeYEtapa[key]) {
      consolidated.porSedeYEtapa[key] = {
        sede: r.sede,
        stage: r.stage,
        equiposCount: 0,
        totalConfirmados: 0,
        totalSentados: 0,
        nuevosSentados: 0,
        rezagadosSentados: 0,
        noShows: 0
      };
    }
    const s = consolidated.porSedeYEtapa[key];
    s.equiposCount++;
    s.totalConfirmados += r.metricas.totalConfirmados;
    s.totalSentados += r.metricas.totalSentados;
    s.nuevosSentados += r.metricas.nuevos.sentados;
    s.rezagadosSentados += r.metricas.rezagados.sentados;
    s.noShows += r.metricas.totalNoShows;
  }

  // Guardar en Firestore si aplica
  if (applyToFirestore) {
    console.log('💾 [Agente Auditor] Guardando conciliación certificada en Firestore...');
    const batch = db.batch();
    
    // Guardar resumen principal
    const summaryRef = db.collection('nodus_auditoria_sentados_confirmados').doc('latest_reconciliation');
    batch.set(summaryRef, {
      ...consolidated,
      equipos: results.map(r => ({
        equipoId: r.equipoId,
        equipoNombre: r.equipoNombre,
        sede: r.sede,
        stage: r.stage,
        metricas: r.metricas
      })),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Guardar documentos detallados por equipo
    for (const r of results) {
      const docId = `${r.sede.toLowerCase()}_${r.stage.toLowerCase()}_e${r.teamNumber || r.equipoId}`;
      const docRef = db.collection('nodus_auditoria_sentados_confirmados').doc(docId);
      batch.set(docRef, {
        ...r,
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    await batch.commit();

    // Guardar log en Caja Negra
    await db.collection('audit_logs').add({
      action: 'NODUS_RECONCILIATION_SENTADOS_VS_CONFIRMADOS',
      category: 'attendance_audit',
      performedBy: 'agent.reconciliation@crearpsl.net',
      details: {
        totalEquipos: results.length,
        totalConfirmados: consolidated.global.totalConfirmados,
        totalSentados: consolidated.global.totalSentados,
        tasaAsistenciaGeneral: `${consolidated.global.tasaAsistenciaGeneral}%`,
        nuevosSentados: consolidated.global.nuevos.sentados,
        rezagadosSentados: consolidated.global.rezagados.sentados,
        totalNoShows: consolidated.global.totalNoShows
      },
      timestamp: FieldValue.serverTimestamp()
    });
    console.log('✅ [Agente Auditor] Auditoría certificada en Firestore guardada con éxito.');
  }

  return { consolidated, results };
}

/**
 * Imprime el reporte en formato tabla visual en consola.
 */
export function formatConsoleTable(report) {
  const { consolidated, results } = report;
  console.log('\n=======================================================================================================');
  console.log('📊 REPORTE DE CONCILIACIÓN: SENTADOS VS CONFIRMADOS | NUEVOS & REZAGADOS (C1 & C2)');
  console.log('=======================================================================================================');
  console.log(
    'SEDE'.padEnd(11) +
    'ETAPA'.padEnd(7) +
    'EQUIPO'.padEnd(16) +
    'ASIG'.padStart(6) +
    'CONF'.padStart(7) +
    'SENT'.padStart(7) +
    '% ASIST'.padStart(9) +
    'NUEVOS (S/C)'.padStart(16) +
    'REZAG (S/C)'.padStart(15) +
    'NO-SHOW'.padStart(9)
  );
  console.log('-'.repeat(103));

  for (const r of results) {
    const m = r.metricas;
    const nuevosStr = `${m.nuevos.sentados}/${m.nuevos.confirmados} (${m.nuevos.tasaAsistencia}%)`;
    const rezagStr = `${m.rezagados.sentados}/${m.rezagados.confirmados} (${m.rezagados.tasaAsistencia}%)`;

    console.log(
      r.sede.padEnd(11) +
      r.stage.padEnd(7) +
      `E${r.teamNumber || r.equipoId}`.padEnd(16) +
      String(m.totalAsignados).padStart(6) +
      String(m.totalConfirmados).padStart(7) +
      String(m.totalSentados).padStart(7) +
      `${m.tasaAsistenciaGeneral}%`.padStart(9) +
      nuevosStr.padStart(16) +
      rezagStr.padStart(15) +
      String(m.totalNoShows).padStart(9)
    );
  }

  console.log('-'.repeat(103));
  console.log(
    'TOTAL'.padEnd(11) +
    'GLOBAL'.padEnd(7) +
    `${consolidated.totalEquiposAuditados} Equipos`.padEnd(16) +
    String(consolidated.global.totalAsignados).padStart(6) +
    String(consolidated.global.totalConfirmados).padStart(7) +
    String(consolidated.global.totalSentados).padStart(7) +
    `${consolidated.global.tasaAsistenciaGeneral}%`.padStart(9) +
    `${consolidated.global.nuevos.sentados}/${consolidated.global.nuevos.confirmados} (${consolidated.global.nuevos.tasaAsistencia}%)`.padStart(16) +
    `${consolidated.global.rezagados.sentados}/${consolidated.global.rezagados.confirmados} (${consolidated.global.rezagados.tasaAsistencia}%)`.padStart(15) +
    String(consolidated.global.totalNoShows).padStart(9)
  );
  console.log('=======================================================================================================\n');
}

// Ejecución directa por CLI
if (process.argv[1]?.endsWith('agentAuditoriaSentadosConfirmados.mjs')) {
  const args = process.argv.slice(2);
  const targetSede = args.find(a => a.startsWith('--sede='))?.split('=')[1] || 'all';
  const targetStage = args.find(a => a.startsWith('--stage='))?.split('=')[1] || 'all';
  const targetTeam = args.find(a => a.startsWith('--team='))?.split('=')[1] || null;
  const apply = args.includes('--apply');

  runSentadosConfirmadosAudit({
    targetSede,
    targetStage,
    targetTeam,
    applyToFirestore: apply
  }).then(report => {
    formatConsoleTable(report);
  }).catch(err => {
    console.error('❌ Error en ejecución del agente:', err);
    process.exit(1);
  });
}
