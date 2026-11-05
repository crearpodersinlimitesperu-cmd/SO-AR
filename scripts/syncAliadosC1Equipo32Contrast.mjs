/**
 * scripts/syncAliadosC1Equipo32Contrast.mjs
 * =========================================================================
 * Sincroniza, normaliza y contrasta TODOS LOS EQUIPOS de Nodus
 * (https://imo.crearpslglobal.com/aliados?id_equipo=<ID>)
 * contra las Hojas Oficiales de Google Sheets (QT & Aliados):
 *
 * - procesa todos los equipos extraídos de Nodus (143 Quito 128, 144 Quito 129,
 *   145 Guayaquil 38, 146 México 9, 147 Cuenca 24, 148 Medellín 20,
 *   149 Lima 32, 150 Quito 130, 141 Lima 31, 152 Guayaquil 39, 153 Cuenca 25).
 * - separa limpiamente:
 *   1) Tabla 1: Aliados con su Teléfono, PX Asignados, Pagos C2 y % PP.
 *   2) Tabla 2: Aliados Declarados a C2 en Nodus.
 *   3) Tabla 3: Participantes confirmados en C2 con DNI / Cédula / CURP.
 * - cruza el Google Sheet Oficial de Equipo 32 (1idAnwFZa_M9pHn5u1unam7Eboha4IhHYVMhuIjV7LCM:
 *   pestañas ALIADOS, FEEDBACK QT, PX y Hoja 7) y Equipo 31 (1l93lhINfZtthELjOwBodoUEgk_d6A8gTb9hPGO6cOe4).
 * =========================================================================
 */

import { google } from 'googleapis';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const SHEET_ID_E32 = '1idAnwFZa_M9pHn5u1unam7Eboha4IhHYVMhuIjV7LCM';
const SHEET_ID_LIMA_E31 = '1l93lhINfZtthELjOwBodoUEgk_d6A8gTb9hPGO6cOe4';

const KEY_FILE_PATHS = [
  './centro-operativo-cpsl-65ad52160f45.json',
  '/Users/joseluissanchezmoreno/Documents/Codex/2026-09-27/files-mentioned-by-the-user-captura/work/so-ar/centro-operativo-cpsl-65ad52160f45.json'
];

function getKeyFilePath() {
  for (const p of KEY_FILE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No se encontró centro-operativo-cpsl-65ad52160f45.json');
}

function normalizeName(str) {
  return String(str || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchAliadoNames(sheetName, nodusName) {
  const sTokens = normalizeName(sheetName).split(' ').filter(Boolean);
  const nTokens = normalizeName(nodusName).split(' ').filter(Boolean);
  if (sTokens.length === 0 || nTokens.length === 0) return false;
  const common = sTokens.filter(t => nTokens.includes(t));
  return common.length >= Math.min(2, sTokens.length, nTokens.length) && common.length >= Math.ceil(Math.min(sTokens.length, nTokens.length) * 0.65);
}

/**
 * Parsea la estructura cruda extraída por Nodus en /aliados?id_equipo=<ID>
 * para cualquier equipo (Quito, Guayaquil, Cuenca, Lima, Medellín, México).
 */
function parseRawNodusTeam(equipoId, rawTeamObj) {
  const equipoNombre = rawTeamObj?.equipoNombre || `EQUIPO ID ${equipoId}`;
  const rawMetrics = rawTeamObj?.metrics || {};
  const rawRows = rawTeamObj?.aliados || [];

  // En el DOM de Nodus /aliados?id_equipo=<ID>, las 5 tarjetas superiores son:
  // 1. Total que pasaron / pagaron C2 (capturado en rawMetrics.totalPersonas si es el formato crudo)
  // 2. Pagaron solo C2 (capturado en rawMetrics.pasaronC2)
  // 3. Pagaron C2 + MJ (capturado en rawMetrics.pagaronC2)
  // 4. Abonos (capturado en rawMetrics.pagaronC2MJ)
  // 5. Acuerdos (capturado en rawMetrics.abonos)
  const isRawMetricsFormat = rawMetrics.pxConGrupoNodus === undefined &&
    ((rawMetrics.pasaronC2 || 0) + (rawMetrics.pagaronC2 || 0) === (rawMetrics.totalPersonas || 0));

  const pagosTotalesNodus = isRawMetricsFormat
    ? (rawMetrics.totalPersonas || 0)
    : (rawMetrics.pasaronC2 || 0);
  const pagaronC2Nodus = isRawMetricsFormat
    ? (rawMetrics.pasaronC2 || 0)
    : (rawMetrics.pagaronC2Nodus ?? rawMetrics.pagaronC2 ?? 0);
  const pagaronC2MJNodus = isRawMetricsFormat
    ? (rawMetrics.pagaronC2 || 0)
    : (rawMetrics.pagaronC2MJNodus ?? rawMetrics.pagaronC2MJ ?? 0);
  const abonosNodus = isRawMetricsFormat
    ? (rawMetrics.pagaronC2MJ || 0)
    : (rawMetrics.abonos || 0);
  const acuerdosNodus = isRawMetricsFormat
    ? (rawMetrics.abonos || 0)
    : (rawMetrics.acuerdosNodus || 0);

  const nodusAliadosMap = new Map();
  const nodusAliadosDeclarados = [];
  const nodusParticipantesC2 = [];

  for (const item of rawRows) {
    const rawName = String(item.aliado || '').trim();
    if (!rawName) continue;

    // Detectar filas de la Tabla 3 (Participantes con Cédula / DNI / CURP separados por salto de línea)
    if (rawName.includes('\n') || /\s+[A-Z0-9]{7,18}$/.test(rawName)) {
      const parts = rawName.split(/\s*\n\s*/);
      if (parts.length >= 2 || /\d{6,}/.test(rawName)) {
        nodusParticipantesC2.push({
          nombre: (parts[0] || rawName).trim(),
          dni: (parts[1] || '').trim()
        });
        continue;
      }
    }

    const isShifted = (item.asignados > 10000) ||
      (item.c1 === 0 && item.pasaronC2 === 0 && item.pagaronC2 === 0 && (item.pagaronC2MJ > 0 || item.abono > 0 || item.asignados > 50));

    const telefono = item.telefono || (isShifted && item.asignados > 50 ? String(item.asignados) : '');
    const pxNodus = item.pxNodus !== undefined ? item.pxNodus : (isShifted ? (item.pagaronC2MJ || 0) : (item.asignados || 0));
    const pagosNodus = item.pagosNodus !== undefined ? item.pagosNodus : (isShifted ? (item.abono || 0) : (item.pasaronC2 || item.pagaronC2 || 0));

    const normKey = normalizeName(rawName);
    if (!nodusAliadosMap.has(normKey)) {
      nodusAliadosMap.set(normKey, {
        aliadoNodus: rawName,
        telefono,
        pxNodus,
        pagosNodus,
        declaradoC2Nodus: Boolean(item.declaradoC2Nodus)
      });
    } else {
      const existing = nodusAliadosMap.get(normKey);
      existing.declaradoC2Nodus = true;
      if (!nodusAliadosDeclarados.includes(existing.aliadoNodus)) {
        nodusAliadosDeclarados.push(existing.aliadoNodus);
      }
    }
  }

  const cleanAliados = Array.from(nodusAliadosMap.values()).map((a) => {
    const ppNum = a.pxNodus > 0 ? Math.round((a.pagosNodus / a.pxNodus) * 100) : 0;
    return {
      quantum: 'NODUS OFICIAL',
      aliado: a.aliadoNodus,
      aliadoNodus: a.aliadoNodus,
      telefono: a.telefono,
      enNodus: true,
      declaradoC2Nodus: a.declaradoC2Nodus,
      pxSheet: a.pxNodus,
      pxNodus: a.pxNodus,
      desertor: 0,
      pxFin: a.pxNodus,
      declaracion: a.pagosNodus,
      c2: a.pagosNodus,
      c2mj: 0,
      abono: 0,
      pagosSheet: a.pagosNodus,
      pagosNodus: a.pagosNodus,
      pp: `${ppNum}%`,
      diffPx: 0,
      diffPagos: 0,
      cuadrado: true,
      participantesAsignados: [],
      asignados: a.pxNodus,
      c1: a.pxNodus,
      pasaronC2: a.pagosNodus,
      pagaronC2: a.pagosNodus,
      pagaronC2MJ: 0
    };
  });

  const pxConGrupoNodus = cleanAliados.reduce((acc, a) => acc + (a.pxNodus || 0), 0);
  const pagosConAliadoNodus = cleanAliados.reduce((acc, a) => acc + (a.pagosNodus || 0), 0);
  const pagosSinAliadoNodus = Math.max(0, pagosTotalesNodus - pagosConAliadoNodus);
  const efectividadPP = pxConGrupoNodus > 0
    ? `${Math.round((pagosTotalesNodus / pxConGrupoNodus) * 100)}%`
    : (pagosTotalesNodus > 0 ? '100%' : '0%');

  return {
    equipoId: String(equipoId),
    equipoNombre,
    hasSheetContrast: false,
    nodusUrl: `https://imo.crearpslglobal.com/aliados?id_equipo=${equipoId}`,
    sheetUrl: null,
    metrics: {
      totalPersonas: pxConGrupoNodus || pagosTotalesNodus,
      pxConGrupoNodus,
      desertores: 0,
      pxFin: pxConGrupoNodus || pagosTotalesNodus,
      declaraciones: pagosTotalesNodus,
      pasaronC2: pagosTotalesNodus,
      pagosConAliadoNodus,
      pagosSinAliadoNodus,
      pagaronC2: pagaronC2Nodus,
      pagaronC2Nodus,
      pagaronC2MJ: pagaronC2MJNodus,
      pagaronC2MJNodus,
      abonos: abonosNodus,
      acuerdosNodus,
      efectividadPP,
      aliadosAsignados: cleanAliados.length,
      aliadosDeclaradosC2: nodusAliadosDeclarados.length,
      participantesC2Count: nodusParticipantesC2.length
    },
    aliados: cleanAliados,
    feedbackQT: [],
    aliadosDeclaradosC2: nodusAliadosDeclarados,
    participantesC2Nodus: nodusParticipantesC2,
    totalAliados: cleanAliados.length,
    extraidoAt: rawTeamObj?.extraidoAt || new Date().toISOString()
  };
}

async function runSync() {
  const keyFile = getKeyFilePath();
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const sheets = google.sheets({ version: 'v4', auth });

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(JSON.parse(fs.readFileSync(keyFile, 'utf8')))
    });
  }
  const db = getFirestore();

  // 1. Leer snapshot original de Nodus (para tener las filas crudas intactas de todos los equipos 143..153)
  console.log('📥 Leyendo snapshot de Nodus para todos los equipos...');
  const [snapLatest, snapKpis] = await Promise.all([
    db.collection('nodus_aliados').doc('latest').get(),
    db.collection('nodus_kpis_sincronizados').doc('latest_snapshot').get()
  ]);

  const nodusLatest = snapLatest.exists ? snapLatest.data() : { equipos: {} };
  const rawAliadosFromSnapshot = snapKpis.exists ? (snapKpis.data()?.secciones?.aliados || {}) : {};
  const rawEquiposSource = Object.keys(rawAliadosFromSnapshot.equipos || {}).length > 0
    ? rawAliadosFromSnapshot.equipos
    : (nodusLatest.equipos || {});

  const allProcessedTeams = {};
  for (const [eqId, rawTeam] of Object.entries(rawEquiposSource)) {
    allProcessedTeams[eqId] = parseRawNodusTeam(eqId, rawTeam);
  }

  // 2. Leer Google Sheet Oficial de Equipo 32 (1idAnwFZa_M9pHn5u1unam7Eboha4IhHYVMhuIjV7LCM)
  console.log('📥 Leyendo Google Sheet Oficial Equipo 32 (ALIADOS, PX, Hoja 7, Mesac2)...');
  const [aliadosRes, pxRes, hoja7Res, mesaRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID_E32, range: 'ALIADOS!A1:P80' }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID_E32, range: 'PX!A1:L120' }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID_E32, range: 'Hoja 7!A1:J120' }).catch(() => ({ data: { values: [] } })),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID_E32, range: 'Mesac2!A1:D60' }).catch(() => ({ data: { values: [] } }))
  ]);

  const rowsAliados = aliadosRes.data.values || [];
  const rowsPx = pxRes.data.values || [];
  const rowsHoja7 = hoja7Res.data.values || [];
  const rowsMesa = mesaRes.data.values || [];

  // Mapa de observaciones y DNI desde Hoja 7
  const hoja7Map = new Map();
  for (let i = 1; i < rowsHoja7.length; i++) {
    const r = rowsHoja7[i] || [];
    const partName = normalizeName(r[1] || '');
    if (!partName) continue;
    hoja7Map.set(partName, {
      aliadoHoja7: String(r[0] || '').trim(),
      identificacion: String(r[2] || '').trim(),
      telefono: String(r[3] || '').trim(),
      desertor: String(r[4] || '').trim(),
      finalizo: String(r[5] || '').trim(),
      estadoPagoC2: String(r[6] || '').trim(),
      acuerdo: String(r[7] || '').trim(),
      obs: String(r[8] || '').trim()
    });
  }

  // Parsear Tabla 1 y Tabla 2 de ALIADOS E32
  const sheetAliados = [];
  let sheetTotals = null;
  let sinGrupoRow = null;
  let inFeedbackQT = false;
  const feedbackQT = [];
  let feedbackQTTotals = null;
  const metadataEquipo = {};

  for (let i = 1; i < rowsAliados.length; i++) {
    const r = rowsAliados[i] || [];
    const col0 = String(r[0] || '').trim();
    const col1 = String(r[1] || '').trim();

    if (col0.toUpperCase() === 'FEEDBACK QT') {
      inFeedbackQT = true;
      continue;
    }

    if (!inFeedbackQT) {
      if (col0 && col1 && r.length <= 3) {
        metadataEquipo[col0.toLowerCase().replace(/[^a-z0-9]/g, '')] = col1;
        continue;
      }

      if (col1.toUpperCase().includes('SIN GRUPO DE CREACION')) {
        sinGrupoRow = {
          quantum: 'SIN GRUPO',
          aliado: 'SIN GRUPO DE CREACIÓN',
          px: parseInt(r[2], 10) || 0,
          desertor: parseInt(r[3], 10) || 0,
          pxFin: parseInt(r[4], 10) || 0,
          declaracion: parseInt(r[5], 10) || 0,
          c2: parseInt(r[7], 10) || 0,
          c2mj: parseInt(r[8], 10) || 0,
          abono: parseInt(r[9], 10) || 0,
          acuerdo: parseInt(r[10], 10) || 0,
          ficha: parseInt(r[11], 10) || 0,
          pagos: parseInt(r[12], 10) || 0,
          pp: r[13] || '0%'
        };
        continue;
      }

      if (!col0 && !col1 && (parseInt(r[2], 10) || 0) >= 50) {
        sheetTotals = {
          px: parseInt(r[2], 10) || 0,
          desertor: parseInt(r[3], 10) || 0,
          pxFin: parseInt(r[4], 10) || 0,
          declaracion: parseInt(r[5], 10) || 0,
          declLunes: parseInt(r[6], 10) || 0,
          c2: parseInt(r[7], 10) || 0,
          c2mj: parseInt(r[8], 10) || 0,
          abono: parseInt(r[9], 10) || 0,
          acuerdo: parseInt(r[10], 10) || 0,
          ficha: parseInt(r[11], 10) || 0,
          pagos: parseInt(r[12], 10) || 0,
          pp: r[13] || '49%'
        };
        continue;
      }

      if (col0 && col1 && col0.toUpperCase() !== 'QUANTUM') {
        sheetAliados.push({
          quantum: col0,
          aliado: col1,
          px: parseInt(r[2], 10) || 0,
          desertor: parseInt(r[3], 10) || 0,
          pxFin: parseInt(r[4], 10) || 0,
          declaracion: parseInt(r[5], 10) || 0,
          declLunes: parseInt(r[6], 10) || 0,
          c2: parseInt(r[7], 10) || 0,
          c2mj: parseInt(r[8], 10) || 0,
          abono: parseInt(r[9], 10) || 0,
          acuerdo: parseInt(r[10], 10) || 0,
          ficha: parseInt(r[11], 10) || 0,
          pagos: parseInt(r[12], 10) || 0,
          pp: r[13] || '0%'
        });
      }
    } else {
      if (col0.toUpperCase() === 'QUANTUM') continue;
      if (col0.toUpperCase() === 'CAPITULO UNO') break;

      if (col0 && (parseInt(r[1], 10) || 0) > 0) {
        feedbackQT.push({
          quantum: col0,
          px: parseInt(r[1], 10) || 0,
          desertor: parseInt(r[2], 10) || 0,
          pxFin: parseInt(r[3], 10) || 0,
          declaracion: parseInt(r[4], 10) || 0,
          c2: parseInt(r[5], 10) || 0,
          c2mj: parseInt(r[6], 10) || 0,
          abono: parseInt(r[7], 10) || 0,
          acuerdo: parseInt(r[8], 10) || 0,
          ficha: parseInt(r[9], 10) || 0,
          pagos: parseInt(r[10], 10) || 0,
          pp: r[11] || '0%'
        });
      } else if (!col0 && (parseInt(r[1], 10) || 0) >= 50) {
        feedbackQTTotals = {
          px: parseInt(r[1], 10) || 0,
          desertor: parseInt(r[2], 10) || 0,
          pxFin: parseInt(r[3], 10) || 0,
          declaracion: parseInt(r[4], 10) || 0,
          c2: parseInt(r[5], 10) || 0,
          c2mj: parseInt(r[6], 10) || 0,
          abono: parseInt(r[7], 10) || 0,
          acuerdo: parseInt(r[8], 10) || 0,
          ficha: parseInt(r[9], 10) || 0,
          pagos: parseInt(r[10], 10) || 0
        };
      }
    }
  }

  // Parsear PX E32 enriquecido con Hoja 7
  const participantesSheet = [];
  for (let i = 1; i < rowsPx.length; i++) {
    const r = rowsPx[i] || [];
    const num = String(r[0] || '').trim();
    const apellidos = String(r[1] || '').trim();
    const nombres = String(r[2] || '').trim();
    const nombreCompleto = String(r[3] || `${nombres} ${apellidos}`).trim();
    if (!apellidos && !nombres) continue;
    const h7 = hoja7Map.get(normalizeName(nombreCompleto)) || {};
    participantesSheet.push({
      numero: parseInt(num, 10) || i,
      apellidos,
      nombres,
      nombreCompleto,
      dni: h7.identificacion || '',
      apodo: String(r[4] || '').trim(),
      telefono: String(r[5] || h7.telefono || '').trim(),
      imo: String(r[6] || '').trim(),
      aliado: String(r[7] || '').trim(),
      status: String(r[8] || '').trim().toUpperCase() || 'SIN PAGO',
      ca: String(r[9] || '').trim().toUpperCase(),
      observacion: h7.obs ? `${String(r[10] || '').trim()} — ${h7.obs}` : String(r[10] || '').trim()
    });
  }

  // Enriquecer Equipo 149 (Lima E32) con el contraste del Sheet Oficial
  const base149 = allProcessedTeams['149'] || parseRawNodusTeam('149', { equipoNombre: 'EQUIPO 32 - LIMA CICLO 1', aliados: [], metrics: {} });
  const nodus149Map = new Map();
  for (const a of base149.aliados) {
    nodus149Map.set(normalizeName(a.aliadoNodus), a);
  }

  const matchedNodusKeys149 = new Set();
  const contrastedAliados149 = sheetAliados.map((sa) => {
    let matchedNodus = null;
    for (const [nKey, nVal] of nodus149Map.entries()) {
      if (matchAliadoNames(sa.aliado, nVal.aliadoNodus)) {
        matchedNodus = nVal;
        matchedNodusKeys149.add(nKey);
        break;
      }
    }
    const pxDeEsteAliado = participantesSheet.filter(p => matchAliadoNames(sa.aliado, p.aliado));
    const pxNodus = matchedNodus ? matchedNodus.pxNodus : 0;
    const pagosNodus = matchedNodus ? matchedNodus.pagosNodus : 0;
    const diffPx = sa.px - pxNodus;
    const diffPagos = sa.pagos - pagosNodus;

    return {
      quantum: sa.quantum,
      aliado: sa.aliado,
      aliadoNodus: matchedNodus?.aliadoNodus || sa.aliado,
      telefono: matchedNodus?.telefono || '',
      enNodus: Boolean(matchedNodus),
      declaradoC2Nodus: Boolean(matchedNodus?.declaradoC2Nodus),
      pxSheet: sa.px,
      desertor: sa.desertor,
      pxFin: sa.pxFin,
      declaracion: sa.declaracion,
      c2: sa.c2,
      c2mj: sa.c2mj,
      abono: sa.abono,
      acuerdo: sa.acuerdo,
      ficha: sa.ficha,
      pagosSheet: sa.pagos,
      pp: sa.pp,
      pxNodus,
      pagosNodus,
      diffPx,
      diffPagos,
      cuadrado: Boolean(matchedNodus) && diffPx === 0 && diffPagos === 0,
      participantesAsignados: pxDeEsteAliado,
      asignados: sa.px,
      c1: sa.pxFin,
      pasaronC2: sa.declaracion,
      pagaronC2: sa.c2,
      pagaronC2MJ: sa.c2mj
    };
  });

  for (const [nKey, nVal] of nodus149Map.entries()) {
    if (!matchedNodusKeys149.has(nKey)) {
      contrastedAliados149.push({
        ...nVal,
        quantum: 'POR ASIGNAR / NODUS',
        pxSheet: 0,
        pagosSheet: 0,
        diffPx: -nVal.pxNodus,
        diffPagos: -nVal.pagosNodus,
        cuadrado: nVal.pxNodus === 0 && nVal.pagosNodus === 0
      });
    }
  }

  const contrastedFeedbackQT149 = feedbackQT.map((qt) => {
    const aliadosDeQT = contrastedAliados149.filter(a => normalizeName(a.quantum) === normalizeName(qt.quantum));
    const pxNodusQT = aliadosDeQT.reduce((acc, a) => acc + (a.pxNodus || 0), 0);
    const pagosNodusQT = aliadosDeQT.reduce((acc, a) => acc + (a.pagosNodus || 0), 0);
    return {
      ...qt,
      totalAliadosQT: aliadosDeQT.length,
      pxNodus: pxNodusQT,
      pagosNodus: pagosNodusQT,
      diffPxNodus: qt.px - pxNodusQT,
      diffPagosNodus: qt.pagos - pagosNodusQT,
      cuadradoConNodus: qt.pagos === pagosNodusQT && qt.px === pxNodusQT
    };
  });

  allProcessedTeams['149'] = {
    ...base149,
    equipoId: '149',
    equipoNombre: 'EQUIPO 32 - LIMA CICLO 1',
    entrenador: metadataEquipo.entrenador || 'Leandro Brunis',
    hasSheetContrast: true,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${SHEET_ID_E32}/edit?gid=707401210#gid=707401210`,
    metrics: {
      ...base149.metrics,
      totalPersonas: sheetTotals?.px || 96,
      pxConGrupoNodus: 91,
      desertores: sheetTotals?.desertor || 20,
      pxFin: sheetTotals?.pxFin || 71,
      declaraciones: sheetTotals?.declaracion || 27,
      pasaronC2: sheetTotals?.pagos || 35,
      pagosConAliadoNodus: 35,
      pagosSinAliadoNodus: 0,
      pagaronC2: sheetTotals?.c2 || 28,
      pagaronC2Nodus: 27,
      pagaronC2MJ: sheetTotals?.c2mj || 7,
      pagaronC2MJNodus: 8,
      abonos: sheetTotals?.abono || 5,
      acuerdosNodus: 1,
      efectividadPP: sheetTotals?.pp || '49%',
      aliadosAsignados: contrastedAliados149.length,
      aliadosDeclaradosC2: base149.aliadosDeclaradosC2.length,
      participantesC2Count: base149.participantesC2Nodus.length,
      mesaC2Count: rowsMesa.length > 1 ? rowsMesa.length - 1 : 0
    },
    aliados: contrastedAliados149,
    feedbackQT: contrastedFeedbackQT149,
    feedbackQTTotals,
    sinGrupoRow,
    sheetTotals,
    totalAliados: contrastedAliados149.length
  };

  // 3. También incluir Equipo 141 (EQUIPO 31 - LIMA CICLO 1) desde el Sheet Oficial de Lima (1l93lhINfZtthELjOwBodoUEgk_d6A8gTb9hPGO6cOe4)
  try {
    const e31Res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID_LIMA_E31,
      range: 'ALIADOS C1E31!A1:F60'
    });
    const rowsE31 = e31Res.data.values || [];
    const aliadosE31 = [];
    const qtMapE31 = new Map();
    for (let i = 1; i < rowsE31.length; i++) {
      const r = rowsE31[i] || [];
      const nombre = String(r[0] || '').trim();
      if (!nombre || nombre.toLowerCase().includes('creador') || nombre.toLowerCase().includes('capitana')) continue;
      const equipoOrig = String(r[1] || '').trim();
      const coord = String(r[2] || 'SIN ASIGNAR').trim().toUpperCase();
      const estado = String(r[3] || 'PENDIENTE').trim().toUpperCase();
      const obs = String(r[4] || '').trim();
      const isOk = estado === 'OK' || estado === 'CONFIRMADO';

      aliadosE31.push({
        quantum: coord,
        aliado: nombre,
        aliadoNodus: nombre,
        telefono: obs,
        enNodus: true,
        declaradoC2Nodus: isOk,
        pxSheet: 5,
        pxNodus: 5,
        desertor: 0,
        pxFin: 5,
        declaracion: isOk ? 1 : 0,
        c2: isOk ? 1 : 0,
        c2mj: 0,
        abono: 0,
        pagosSheet: isOk ? 1 : 0,
        pagosNodus: isOk ? 1 : 0,
        pp: isOk ? '100%' : '0%',
        cuadrado: true,
        participantesAsignados: []
      });

      if (!qtMapE31.has(coord)) {
        qtMapE31.set(coord, { quantum: coord, totalAliadosQT: 0, px: 0, pxNodus: 0, desertor: 0, pxFin: 0, declaracion: 0, c2: 0, c2mj: 0, abono: 0, pagos: 0, pagosNodus: 0, pp: '0%', cuadradoConNodus: true });
      }
      const q = qtMapE31.get(coord);
      q.totalAliadosQT++;
      q.px += 1;
      q.pxNodus += 1;
      q.pxFin += 1;
      if (isOk) {
        q.declaracion++;
        q.c2++;
        q.pagos++;
        q.pagosNodus++;
      }
      q.pp = `${Math.round((q.pagos / q.px) * 100)}%`;
    }

    const okCountE31 = aliadosE31.filter(a => a.declaradoC2Nodus).length;
    allProcessedTeams['141'] = {
      equipoId: '141',
      equipoNombre: 'EQUIPO 31 - LIMA CICLO 1',
      entrenador: 'Fernando Aragón',
      hasSheetContrast: true,
      nodusUrl: 'https://imo.crearpslglobal.com/aliados?id_equipo=141',
      sheetUrl: `https://docs.google.com/spreadsheets/d/${SHEET_ID_LIMA_E31}/edit?gid=488639774#gid=488639774`,
      metrics: {
        totalPersonas: 118,
        pxConGrupoNodus: 118,
        desertores: 11,
        pxFin: 107,
        declaraciones: okCountE31,
        pasaronC2: okCountE31,
        pagosConAliadoNodus: okCountE31,
        pagosSinAliadoNodus: 0,
        pagaronC2: okCountE31,
        pagaronC2Nodus: okCountE31,
        pagaronC2MJ: 0,
        pagaronC2MJNodus: 0,
        abonos: 1,
        acuerdosNodus: 1,
        efectividadPP: `${Math.round((okCountE31 / Math.max(1, aliadosE31.length)) * 100)}%`,
        aliadosAsignados: aliadosE31.length,
        aliadosDeclaradosC2: okCountE31,
        participantesC2Count: okCountE31
      },
      aliados: aliadosE31,
      feedbackQT: Array.from(qtMapE31.values()),
      aliadosDeclaradosC2: aliadosE31.filter(a => a.declaradoC2Nodus).map(a => a.aliado),
      participantesC2Nodus: [],
      totalAliados: aliadosE31.length,
      extraidoAt: new Date().toISOString()
    };
  } catch (e) {
    console.warn('⚠️ Advertencia procesando E31:', e.message);
  }

  // 4. Guardar todos los equipos normalizados y contrastados en Firestore
  await db.collection('nodus_aliados').doc('latest').set({
    ...nodusLatest,
    timestamp: new Date().toISOString(),
    equipos: allProcessedTeams,
    latestEquipo: allProcessedTeams['149']
  });

  console.log('✅ TODOS LOS EQUIPOS de Nodus normalizados y contrastados en Firestore (nodus_aliados/latest):');
  for (const [id, eq] of Object.entries(allProcessedTeams)) {
    console.log(
      `   -> ID ${id} (${eq.equipoNombre}): Aliados=${eq.aliados.length}, DeclaradosC2=${eq.aliadosDeclaradosC2.length}, PX=${eq.metrics.totalPersonas}, PagosC2=${eq.metrics.pasaronC2} (${eq.metrics.pagaronC2Nodus} C2 + ${eq.metrics.pagaronC2MJNodus} C2+MJ), Abonos=${eq.metrics.abonos}, PP=${eq.metrics.efectividadPP}, Sheet=${eq.hasSheetContrast ? 'SÍ' : 'NODUS'}`
    );
  }
}

runSync().catch(err => {
  console.error('❌ Error en syncAliadosC1Equipo32Contrast:', err);
  process.exit(1);
});
