import { confirmedStatus } from '../features/imo/missionModel.js';
/**
 * nodusVerificationService.js
 * ===========================
 * Servicio de Validación Automática Cruzada: IMOs vs. Coordinadoras en Nodus
 *
 * Cruza en tiempo real las afirmaciones de los IMOs (asistencia: true)
 * contra las confirmaciones efectivas de llamadas registradas por las coordinadoras
 * en Nodus (1ra y 2da llamada, asistencia y estado en CRM/Nodus).
 */

import { db } from './firebase';
import { doc, collection, onSnapshot } from 'firebase/firestore';

// Función para normalizar texto (sin tildes, sin puntuación innecesaria, mayúsculas)
export const normText = (s) => {
  if (!s) return '';
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Normalizar teléfono (mantener todos los dígitos para soportar 10 dígitos de MX/EC)
export const normPhone = (p) => {
  if (!p) return '';
  return String(p).replace(/\D/g, '');
};

// Mapa en memoria para indexación O(1) de participantes Nodus
const masterMap = new Map();

// Helper para indexar un registro Nodus en el mapa maestro
function indexRecord(rec) {
  if (!rec) return;
  const keys = [];
  if (rec.nombreNorm) keys.push(rec.nombreNorm);
  if (rec.telefonoNorm?.length >= 7) keys.push(`TEL_${rec.telefonoNorm}`);
  if (rec.email?.includes('@')) keys.push(`EMAIL_${rec.email.toLowerCase().trim()}`);
  keys.forEach(key => {
    const rows = masterMap.get(key) || [];
    const index = rows.findIndex(r => r.nombreNorm === rec.nombreNorm && r.equipo === rec.equipo && r.telefonoNorm === rec.telefonoNorm);
    if (index >= 0) rows[index] = rec; else rows.push(rec);
    masterMap.set(key, rows);
  });
}

// Verification uses live records only; a bundled snapshot cannot certify current attendance.

// Suscripción en tiempo real a Firestore para recibir actualizaciones de Nodus en vivo
let subscribers = new Set();
let stopListeners = [];
let liveRoot = [], liveTeams = [];
function notifySubscribers() { subscribers.forEach(callback => callback(masterMap.size)); }
export function initNodusRealtimeListener(onUpdateCallback) {
  subscribers.add(onUpdateCallback);
  const unsubscribe = () => {
    subscribers.delete(onUpdateCallback);
    if (!subscribers.size) { stopListeners.forEach(stop => stop()); stopListeners = []; liveRoot = []; liveTeams = []; }
  };
  if (stopListeners.length) return unsubscribe;

  const processParticipante = (p, equipoNombre) => {
    const fullName = (p.n || `${p.nombres || ''} ${p.apellidos || ''}`).trim();
    if (!fullName && !p.telefono && !p.t) return;
    const rec = {
      nombre: fullName,
      nombreNorm: normText(fullName),
      email: p.email || p.e || '',
      telefono: p.telefono || p.t || '',
      telefonoNorm: normPhone(p.telefono || p.t),
      coordinador: p.coordinador || p.c || '',
      imo: p.imo || '',
      llamada1: p.llamada1 || p.l1 || '',
      llamada2: p.llamada2 || p.l2 || '',
      asistencia: p.asistencia || p.a || '',
      desertor: p.desertor || p.d || '',
      pago: p.pago || p.p || '',
      equipo: equipoNombre || ''
    };
    indexRecord(rec);
  };

  const rebuild = () => {
    masterMap.clear();
    [...liveRoot, ...liveTeams].forEach(eq => (eq.participantes || []).forEach(p => processParticipante(p, eq.equipoNombre)));
    notifySubscribers();
  };
  try {
    // 1. Escuchar documento raíz 'latest'
    const docRef = doc(db, 'nodus_coordinadores_c1c2', 'latest');
    stopListeners.push(onSnapshot(docRef, snapshot => {
      liveRoot = snapshot.exists() ? snapshot.data().equiposReporte || [] : [];
      rebuild();
    }, err => console.warn('No se pudo consultar Nodus:', err.message)));

    // 2. Escuchar subcolección 'equipos' (persistencia desacoplada para evitar límite de 1MB)
    const colRef = collection(db, 'nodus_coordinadores_c1c2', 'latest', 'equipos');
    stopListeners.push(onSnapshot(colRef, snapshot => {
      liveTeams = snapshot.docs.map(d => d.data());
      rebuild();
    }, err => console.warn('No se pudo consultar equipos Nodus:', err.message)));

  } catch (e) {
    console.warn('Error inicializando listener de Nodus:', e);
  }
  return unsubscribe;
}

/**
 * Busca un enrolado en el índice maestro de Nodus por Nombre, Teléfono o Email
 */
export function findParticipantInNodus(enrolado, imoNombre = '', imoEquipo = '') {
  if (!enrolado) return null;
  const name = normText(enrolado.nombre), phone = normPhone(enrolado.telefono), email = (enrolado.email || '').toLowerCase().trim();
  const teamKey = value => normText(value).replace(/\bCICLO\s*1\b/g, 'C1').replace(/\s+V$/, '').replace(/[^A-Z0-9]/g, '');
  const scoped = rows => rows.filter(r => (!imoEquipo || teamKey(r.equipo) === teamKey(imoEquipo)) && (!r.imo || !imoNombre || normText(r.imo) === normText(imoNombre)));
  for (const key of [email && `EMAIL_${email}`, phone && `TEL_${phone}`, name].filter(Boolean)) {
    const rows = scoped(masterMap.get(key) || []);
    if (rows.length > 1) return null;
    if (rows.length === 1) {
      const r = rows[0];
      if (phone && r.telefonoNorm && phone !== r.telefonoNorm) return null;
      return r;
    }
  }
  return null;
}

/**
 * Evalúa el cruce de verificación para un Enrolado individual
 */
export function evaluateEnroladoVerification(enrolado, imoNombre = '', imoEquipo = '') {
  // 1. Buscar en índice maestro de Nodus
  // 2. Si aún no está en el índice maestro, verificar si el enrolado ya trae sus datos de Nodus incrustados
  const nodusRec = findParticipantInNodus(enrolado, imoNombre, imoEquipo) || (
    (enrolado?.llamada1 || enrolado?.asistenciaNodus || enrolado?.desertor || enrolado?.pago) ? {
      nombre: enrolado.nombre,
      telefono: enrolado.telefono,
      coordinador: enrolado.coordinadora_nombre || '',
      llamada1: enrolado.llamada1 || '',
      llamada2: enrolado.llamada2 || '',
      asistencia: enrolado.asistenciaNodus || '',
      desertor: enrolado.desertor || '',
      pago: enrolado.pago || '',
      equipo: imoEquipo || ''
    } : null
  );

  const imoSaysAsiste = Boolean(enrolado.asistencia);

  if (!nodusRec) {
    if (imoSaysAsiste) {
      return {
        matched: false,
        nodusRec: null,
        coordinador: enrolado.coordinadora_nombre || 'No asignada',
        llamada1: 'Sin Registro',
        llamada2: '—',
        asistenciaNodus: '—',
        desertor: '—',
        pago: '—',
        status: 'PENDIENTE_SYNC',
        statusLabel: '⏳ Pendiente Registro Nodus',
        statusColor: '#a855f7',
        statusBg: 'rgba(168, 85, 247, 0.15)',
        statusBorder: 'rgba(168, 85, 247, 0.3)',
        coincide: false,
        detalle: 'El IMO indica que asistirá, pero aún no figura en el reporte de llamadas de Coordinadoras.'
      };
    }
    return {
      matched: false,
      nodusRec: null,
      coordinador: enrolado.coordinadora_nombre || 'No asignada',
      llamada1: '—',
      llamada2: '—',
      asistenciaNodus: '—',
      desertor: '—',
      pago: '—',
      status: 'SIN_REGISTRO',
      statusLabel: '⚪ Sin Registro Nodus',
      statusColor: '#94a3b8',
      statusBg: 'rgba(255, 255, 255, 0.05)',
      statusBorder: 'rgba(255, 255, 255, 0.1)',
      coincide: false,
      detalle: 'No se encontró registro de este participante en Nodus.'
    };
  }

  // Evaluar estado de llamada de Coordinadora
  const l1 = normText(nodusRec.llamada1 || '');
  const l2 = normText(nodusRec.llamada2 || '');
  const asist = normText(nodusRec.asistencia || '');
  const des = normText(nodusRec.desertor || '');
  const pago = normText(nodusRec.pago || '');

  const coordDesercion = confirmedStatus(des) || /\b(DESERTOR|DESERTO|NO ASISTE|NO ASISTIO|NO INTERESA|NO LE INTERESA)\b/.test([des, l1, l2, asist].join(' '));
  const coordConfirmado = !coordDesercion && (confirmedStatus(asist) || [l1, l2].some(v => /^(SI|CONFIRMADO|CONFIRMADA|ASISTE|ASISTIO|SENTADO|SENTADA)$/.test(v)));
  const coordNombre = nodusRec.coordinador || enrolado.coordinadora_nombre || 'Coordinación';
  const asistenciaNodus = nodusRec.asistencia || '—';
  const asistioNodus = confirmedStatus(asist) ? 'SÍ' : (/^NO\b/.test(asist) || coordDesercion ? 'NO' : '—');
  const desertoNodus = coordDesercion ? 'SÍ' : (/^NO\b/.test(des) ? 'NO' : '—');
  const pagoC2Nodus = confirmedStatus(pago) ? 'SÍ' : (/^NO\b/.test(pago) ? 'NO' : '—');

  if (imoSaysAsiste) {
    if (coordConfirmado) {
      return {
        matched: true,
        nodusRec,
        coordinador: coordNombre,
        llamada1: nodusRec.llamada1 || 'Confirmado',
        llamada2: nodusRec.llamada2 || '—',
        asistenciaNodus,
        asistioNodus,
        desertoNodus,
        pagoC2Nodus,
        desertor: nodusRec.desertor || '—',
        pago: nodusRec.pago || '—',
        status: 'VERIFICADO_OK',
        statusLabel: '✅ Verificado Nodus (Confirmado en Llamada)',
        statusColor: '#22c55e',
        statusBg: 'rgba(34, 197, 94, 0.15)',
        statusBorder: 'rgba(34, 197, 94, 0.35)',
        coincide: true,
        detalle: `Coincide: El IMO reportó asistencia y Coord. ${coordNombre} confirmó en llamada (${nodusRec.llamada1 || 'Confirmado'}).`
      };
    }

    if (coordDesercion) {
      return {
        matched: true,
        nodusRec,
        coordinador: coordNombre,
        llamada1: nodusRec.llamada1 || 'Desertor',
        llamada2: nodusRec.llamada2 || '—',
        asistenciaNodus,
        asistioNodus,
        desertoNodus,
        pagoC2Nodus,
        desertor: nodusRec.desertor || '—',
        pago: nodusRec.pago || '—',
        status: 'DISCREPANCIA',
        statusLabel: '🚨 Discrepancia: Coord. reporta Desertor / No Asiste',
        statusColor: '#ef4444',
        statusBg: 'rgba(239, 68, 68, 0.2)',
        statusBorder: 'rgba(239, 68, 68, 0.45)',
        coincide: false,
        detalle: `¡Alerta de Quiebre! El IMO afirma que asistirá, pero Coord. ${coordNombre} registró en llamada: ${nodusRec.llamada1 || nodusRec.desertor || 'Deserción'}.`
      };
    }

    // Pendiente de llamada
    return {
      matched: true,
      nodusRec,
      coordinador: coordNombre,
      llamada1: nodusRec.llamada1 || 'Por Confirmar',
      llamada2: nodusRec.llamada2 || '—',
      asistenciaNodus,
      asistioNodus,
      desertoNodus,
      pagoC2Nodus,
      desertor: nodusRec.desertor || '—',
      pago: nodusRec.pago || '—',
      status: 'PENDIENTE_COORD',
      statusLabel: `⏳ Falta Confirma de Coord. (${nodusRec.llamada1 || 'Por Confirmar'})`,
      statusColor: '#f59e0b',
      statusBg: 'rgba(245, 158, 11, 0.15)',
      statusBorder: 'rgba(245, 158, 11, 0.35)',
      coincide: false,
      detalle: `El IMO indica que asistirá, pero la llamada de Coord. ${coordNombre} aún está en '${nodusRec.llamada1 || 'Por Confirmar'}'.`
    };
  }

  // IMO aún no marca asistencia
  if (coordConfirmado) {
    return {
      matched: true,
      nodusRec,
      coordinador: coordNombre,
      llamada1: nodusRec.llamada1 || 'Confirmado',
      llamada2: nodusRec.llamada2 || '—',
      asistenciaNodus,
      asistioNodus,
      desertoNodus,
      pagoC2Nodus,
      desertor: nodusRec.desertor || '—',
      pago: nodusRec.pago || '—',
      status: 'COORD_CONFIRMO',
      statusLabel: `ℹ️ Confirmado por Coord. ${coordNombre} (Pendiente IMO)`,
      statusColor: '#38bdf8',
      statusBg: 'rgba(56, 189, 248, 0.15)',
      statusBorder: 'rgba(56, 189, 248, 0.3)',
      coincide: false,
      detalle: `Coord. ${coordNombre} ya confirmó la llamada, pero el IMO aún no lo ha marcado en su misión.`
    };
  }

  return {
    matched: true,
    nodusRec,
    coordinador: coordNombre,
    llamada1: nodusRec.llamada1 || 'Por Confirmar',
    llamada2: nodusRec.llamada2 || '—',
    asistenciaNodus,
    asistioNodus,
    desertoNodus,
    pagoC2Nodus,
    desertor: nodusRec.desertor || '—',
    pago: nodusRec.pago || '—',
    status: 'PENDIENTE_AMBOS',
    statusLabel: `⚪ Pendiente de Llamada y de IMO`,
    statusColor: '#94a3b8',
    statusBg: 'rgba(255, 255, 255, 0.05)',
    statusBorder: 'rgba(255, 255, 255, 0.1)',
    coincide: false,
    detalle: 'Pendiente de gestión de llamada y reporte del IMO.'
  };
}

/**
 * Evalúa el resumen global de una Misión IMO completa
 */
export function evaluateMissionVerification(mission, enroladosList = []) {
  let imoAsistencias = 0;
  let validadosOk = 0;
  let pendientesCoord = 0;
  let discrepancias = 0;
  let pendientesSync = 0;
  let coordConfirmoImoNo = 0;

  enroladosList.forEach(enrolado => {
    const res = evaluateEnroladoVerification(enrolado, mission.imoNombre, mission.equipo);
    if (enrolado.asistencia) {
      imoAsistencias++;
      if (res.status === 'VERIFICADO_OK') validadosOk++;
      else if (res.status === 'DISCREPANCIA') discrepancias++;
      else if (res.status === 'PENDIENTE_SYNC') pendientesSync++;
      else pendientesCoord++;
    } else {
      if (res.status === 'COORD_CONFIRMO') coordConfirmoImoNo++;
    }
  });

  const total = enroladosList.length;
  const pctCoincidencia = imoAsistencias > 0
    ? Math.round((validadosOk / imoAsistencias) * 100)
    : 0;

  // Determinar estatus general de la Misión IMO
  let overallStatus = 'SIN_CONFIRMACIONES';
  let badgeLabel = '⚪ Sin Asistencias IMO';
  let badgeColor = '#94a3b8';
  let badgeBg = 'rgba(255, 255, 255, 0.06)';
  let badgeBorder = 'rgba(255, 255, 255, 0.12)';
  let tooltip = 'El IMO no ha marcado enrolados que asistirán aún.';

  if (discrepancias > 0) {
    overallStatus = 'DISCREPANCIA';
    badgeLabel = `🚨 Discrepancia Nodus (${discrepancias})`;
    badgeColor = '#ef4444';
    badgeBg = 'rgba(239, 68, 68, 0.2)';
    badgeBorder = 'rgba(239, 68, 68, 0.4)';
    tooltip = `¡Alerta! ${discrepancias} participante(s) reportado(s) por el IMO como asistente(s), pero marcado(s) como desertor(es) en llamada de coordinadora.`;
  } else if (imoAsistencias > 0 && validadosOk === imoAsistencias) {
    overallStatus = 'VERIFICADO_OK';
    badgeLabel = `🟢 100% Verificado Nodus (${validadosOk}/${imoAsistencias})`;
    badgeColor = '#22c55e';
    badgeBg = 'rgba(34, 197, 94, 0.18)';
    badgeBorder = 'rgba(34, 197, 94, 0.35)';
    tooltip = `¡Validado! Todas las afirmaciones del IMO (${validadosOk}/${imoAsistencias}) coinciden con la llamada de la coordinadora.`;
  } else if (imoAsistencias > 0 && validadosOk > 0) {
    overallStatus = 'PARCIAL';
    badgeLabel = `🟡 En Verificación (${validadosOk}/${imoAsistencias} en llamada)`;
    badgeColor = '#f59e0b';
    badgeBg = 'rgba(245, 158, 11, 0.18)';
    badgeBorder = 'rgba(245, 158, 11, 0.35)';
    tooltip = `${validadosOk} de ${imoAsistencias} confirmaciones coinciden con la llamada de la coordinadora. (${pendientesCoord + pendientesSync} pendientes).`;
  } else if (imoAsistencias > 0) {
    overallStatus = 'PENDIENTE_COORD';
    badgeLabel = `⏳ Falta Confirma Coord. (0/${imoAsistencias})`;
    badgeColor = '#a855f7';
    badgeBg = 'rgba(168, 85, 247, 0.18)';
    badgeBorder = 'rgba(168, 85, 247, 0.35)';
    tooltip = `El IMO reportó ${imoAsistencias} asistente(s), pero aún no tienen llamada confirmada por la coordinadora en Nodus.`;
  }

  return {
    totalEnrolados: total,
    imoAsistencias,
    validadosOk,
    pendientesCoord,
    pendientesSync,
    discrepancias,
    coordConfirmoImoNo,
    pctCoincidencia,
    overallStatus,
    badgeLabel,
    badgeColor,
    badgeBg,
    badgeBorder,
    tooltip
  };
}

/**
 * Calcula las métricas globales para las tarjetas KPI de la cabecera
 */
export function getGlobalNodusStats(missions, getEnroladosList) {
  let totalReportadosImo = 0;
  let totalValidadosLlamada = 0;
  let totalDiscrepancias = 0;
  let totalPendientesCoord = 0;
  let imosCompletamenteVerificados = 0;
  let imosConDiscrepancia = 0;

  missions.forEach(m => {
    const list = getEnroladosList(m);
    const summary = evaluateMissionVerification(m, list);

    totalReportadosImo += summary.imoAsistencias;
    totalValidadosLlamada += summary.validadosOk;
    totalDiscrepancias += summary.discrepancias;
    totalPendientesCoord += (summary.pendientesCoord + summary.pendientesSync);

    if (summary.overallStatus === 'VERIFICADO_OK') imosCompletamenteVerificados++;
    if (summary.overallStatus === 'DISCREPANCIA') imosConDiscrepancia++;
  });

  const porcentajeGlobal = totalReportadosImo > 0
    ? Math.round((totalValidadosLlamada / totalReportadosImo) * 100)
    : 0;

  return {
    totalReportadosImo,
    totalValidadosLlamada,
    totalDiscrepancias,
    totalPendientesCoord,
    imosCompletamenteVerificados,
    imosConDiscrepancia,
    porcentajeGlobal,
    totalRegistrosNodus: masterMap.size
  };
}

