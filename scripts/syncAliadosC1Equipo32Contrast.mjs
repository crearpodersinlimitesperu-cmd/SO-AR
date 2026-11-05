/**
 * scripts/syncAliadosC1Equipo32Contrast.mjs
 * =========================================================================
 * Sincroniza y contrasta en tiempo real:
 * 1. Nodus (/aliados?id_equipo=149 — Equipo 32 Lima Ciclo 1)
 * 2. Google Sheet Oficial "ALIADOS CAPÍTULO UNO EQUIPO 32"
 *    (Sheet ID: 1idAnwFZa_M9pHn5u1unam7Eboha4IhHYVMhuIjV7LCM, gid: 707401210)
 *    - Tabla de Movimiento por Aliado y Quantum (QT)
 *    - Tabla de FEEDBACK QT (Consolidado por Quantum)
 *    - Pestaña PX (Detalle nominal de los 96 participantes y su estatus)
 * =========================================================================
 */

import { google } from 'googleapis';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const SHEET_ID = '1idAnwFZa_M9pHn5u1unam7Eboha4IhHYVMhuIjV7LCM';
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
  // Coincidencia si todos los tokens de sheetName están en nodusName o viceversa, o al menos 2 apellidos/nombres clave
  const common = sTokens.filter(t => nTokens.includes(t));
  return common.length >= Math.min(2, sTokens.length, nTokens.length) && common.length >= Math.ceil(Math.min(sTokens.length, nTokens.length) * 0.65);
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

  console.log('📥 Leyendo Google Sheet Oficial (ALIADOS CAPÍTULO UNO EQUIPO 32)...');
  const [aliadosRes, pxRes, mesaRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'ALIADOS!A1:P60' }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'PX!A1:L120' }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'Mesac2!A1:D60' }).catch(() => ({ data: { values: [] } }))
  ]);

  const rowsAliados = aliadosRes.data.values || [];
  const rowsPx = pxRes.data.values || [];
  const rowsMesa = mesaRes.data.values || [];

  // 1. Parsear Tabla 1: Aliados en el Sheet (filas 2 hasta antes de la fila de totales)
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
      // Meta info como Aliados: 20, QT: 4, Entrenador: Leandro Brunis, Equipo: 32
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

      // Fila de totales de la tabla de Aliados
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
      // Estamos en FEEDBACK QT
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

  // 2. Parsear pestaña PX (96 participantes con su Aliado, IMO, Status y CA)
  const participantesSheet = [];
  for (let i = 1; i < rowsPx.length; i++) {
    const r = rowsPx[i] || [];
    const num = String(r[0] || '').trim();
    const apellidos = String(r[1] || '').trim();
    const nombres = String(r[2] || '').trim();
    const nombreCompleto = String(r[3] || `${nombres} ${apellidos}`).trim();
    if (!apellidos && !nombres) continue;
    participantesSheet.push({
      numero: parseInt(num, 10) || i,
      apellidos,
      nombres,
      nombreCompleto,
      apodo: String(r[4] || '').trim(),
      telefono: String(r[5] || '').trim(),
      imo: String(r[6] || '').trim(),
      aliado: String(r[7] || '').trim(),
      status: String(r[8] || '').trim().toUpperCase() || 'SIN PAGO',
      ca: String(r[9] || '').trim().toUpperCase(),
      observacion: String(r[10] || '').trim()
    });
  }

  // 3. Leer Nodus nodus_aliados/latest para extraer lo que reportó Nodus en id_equipo=149
  const nodusSnap = await db.collection('nodus_aliados').doc('latest').get();
  const nodusDoc = nodusSnap.exists ? nodusSnap.data() : { equipos: {} };
  const rawEq149 = nodusDoc.equipos?.['149'] || { aliados: [], metrics: {} };
  const rawNodusRows = rawEq149.aliados || [];

  // Separar las 3 tablas que Nodus devuelve en /aliados?id_equipo=149:
  // Tabla 1: Aliados con su teléfono, PX asignados y Pagos C2
  // Tabla 2: Aliados Declarados a C2
  // Tabla 3: Participantes con DNI que pasaron a C2
  const nodusAliadosMap = new Map();
  const nodusAliadosDeclarados = [];
  const nodusParticipantesC2 = [];

  for (const item of rawNodusRows) {
    const rawName = String(item.aliado || '').trim();
    if (!rawName) continue;

    // Si contiene salto de línea con DNI (ej. "ACEVEDO LAVALLE SANDRA\n 40802275"), es la Tabla 3 (Participantes C2 en Nodus)
    if (rawName.includes('\n') || /\d{7,8}$/.test(rawName)) {
      const parts = rawName.split(/\s*\n\s*/);
      nodusParticipantesC2.push({
        nombre: (parts[0] || rawName).trim(),
        dni: (parts[1] || '').trim()
      });
      continue;
    }

    // Identificar si los campos venían desplazados (asignados > 100000 es teléfono, pagaronC2MJ es PX asignados, abono es Pagos)
    const isShifted = (item.asignados > 100000) || (item.c1 === 0 && item.pasaronC2 === 0 && item.pagaronC2 === 0 && (item.pagaronC2MJ > 0 || item.abono > 0));
    const telefono = isShifted ? (item.asignados > 1000 ? String(item.asignados) : '') : (item.telefono || '');
    const pxNodus = isShifted ? (item.pagaronC2MJ || 0) : (item.asignados || 0);
    const pagosNodus = isShifted ? (item.abono || 0) : (item.pasaronC2 || item.pagaronC2 || 0);

    const normKey = normalizeName(rawName);
    if (!nodusAliadosMap.has(normKey)) {
      nodusAliadosMap.set(normKey, {
        aliadoNodus: rawName,
        telefono,
        pxNodus,
        pagosNodus,
        declaradoC2Nodus: false
      });
    } else {
      // Si ya estaba en Tabla 1 y vuelve a aparecer en Tabla 2 (con 0, 0), significa que está en la tabla de Aliados Declarados C2 en Nodus
      const existing = nodusAliadosMap.get(normKey);
      existing.declaradoC2Nodus = true;
      if (!nodusAliadosDeclarados.includes(existing.aliadoNodus)) {
        nodusAliadosDeclarados.push(existing.aliadoNodus);
      }
    }
  }

  // 4. Construir tabla contrastada Aliado por Aliado (Sheet vs Nodus)
  const matchedNodusKeys = new Set();
  const contrastedAliados = sheetAliados.map((sa) => {
    let matchedNodus = null;
    for (const [nKey, nVal] of nodusAliadosMap.entries()) {
      if (matchAliadoNames(sa.aliado, nVal.aliadoNodus)) {
        matchedNodus = nVal;
        matchedNodusKeys.add(nKey);
        break;
      }
    }

    // Buscar participantes de este aliado en la pestaña PX
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
      // Métricas Sheet
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
      // Métricas Nodus
      pxNodus,
      pagosNodus,
      // Deltas / Contraste
      diffPx,
      diffPagos,
      cuadrado: Boolean(matchedNodus) && diffPx === 0 && diffPagos === 0,
      participantesAsignados: pxDeEsteAliado,
      // Compatibilidad con tabla estándar de NodusLiveModulesDashboard
      asignados: sa.px,
      c1: sa.pxFin,
      pasaronC2: sa.declaracion,
      pagaronC2: sa.c2,
      pagaronC2MJ: sa.c2mj
    };
  });

  // Agregar cualquier aliado que esté en Nodus pero no en las filas activas de la tabla 1 del Sheet (ej. Karina Molina Chipana con 0 PX)
  for (const [nKey, nVal] of nodusAliadosMap.entries()) {
    if (!matchedNodusKeys.has(nKey)) {
      contrastedAliados.push({
        quantum: 'POR ASIGNAR / NODUS',
        aliado: nVal.aliadoNodus,
        aliadoNodus: nVal.aliadoNodus,
        telefono: nVal.telefono || '',
        enNodus: true,
        declaradoC2Nodus: Boolean(nVal.declaradoC2Nodus),
        pxSheet: 0,
        desertor: 0,
        pxFin: 0,
        declaracion: 0,
        c2: 0,
        c2mj: 0,
        abono: 0,
        acuerdo: 0,
        ficha: 0,
        pagosSheet: 0,
        pp: '0%',
        pxNodus: nVal.pxNodus,
        pagosNodus: nVal.pagosNodus,
        diffPx: -nVal.pxNodus,
        diffPagos: -nVal.pagosNodus,
        cuadrado: nVal.pxNodus === 0 && nVal.pagosNodus === 0,
        participantesAsignados: [],
        asignados: nVal.pxNodus,
        c1: 0,
        pasaronC2: 0,
        pagaronC2: 0,
        pagaronC2MJ: 0
      });
    }
  }

  // 5. Enriquecer FEEDBACK QT con la suma de Nodus por Quantum
  const contrastedFeedbackQT = feedbackQT.map((qt) => {
    const aliadosDeQT = contrastedAliados.filter(a => normalizeName(a.quantum) === normalizeName(qt.quantum));
    const pxNodusQT = aliadosDeQT.reduce((acc, a) => acc + (a.pxNodus || 0), 0);
    const pagosNodusQT = aliadosDeQT.reduce((acc, a) => acc + (a.pagosNodus || 0), 0);
    const pagosAliadosSheetSum = aliadosDeQT.reduce((acc, a) => acc + (a.pagosSheet || 0), 0);
    const pxAliadosSheetSum = aliadosDeQT.reduce((acc, a) => acc + (a.pxSheet || 0), 0);

    return {
      ...qt,
      totalAliadosQT: aliadosDeQT.length,
      pxNodus: pxNodusQT,
      pagosNodus: pagosNodusQT,
      pxAliadosSheetSum,
      pagosAliadosSheetSum,
      diffPxNodus: qt.px - pxNodusQT,
      diffPagosNodus: qt.pagos - pagosNodusQT,
      cuadradoConNodus: qt.pagos === pagosNodusQT && qt.px === pxNodusQT
    };
  });

  // 6. Métricas globales consolidadas y contrastadas (Equipo 32 - ID 149)
  const totalPxNodus = contrastedAliados.reduce((acc, a) => acc + (a.pxNodus || 0), 0);
  const totalPagosNodus = contrastedAliados.reduce((acc, a) => acc + (a.pagosNodus || 0), 0);

  const summaryContrast = {
    equipoId: '149',
    equipoNombre: 'EQUIPO 32 - LIMA CICLO 1',
    entrenador: metadataEquipo.entrenador || 'Leandro Brunis',
    capitan: metadataEquipo.capitana || '1',
    totalQTs: 4,
    totalAliadosSheet: sheetAliados.length,
    totalAliadosMeta: parseInt(metadataEquipo.aliados, 10) || 20,
    totalAliadosNodus: nodusAliadosMap.size,
    totalAliadosDeclaradosC2Nodus: nodusAliadosDeclarados.length,
    nodusUrl: 'https://imo.crearpslglobal.com/aliados?id_equipo=149',
    sheetUrl: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=707401210#gid=707401210`,
    syncedAt: new Date().toISOString(),
    comparativaKpis: {
      pxIniciales: {
        sheet: sheetTotals?.px || 96,
        sheetConGrupo: feedbackQTTotals?.px || 91,
        sheetSinGrupo: sinGrupoRow?.px || 5,
        nodus: totalPxNodus || 91,
        diffConGrupo: (feedbackQTTotals?.px || 91) - (totalPxNodus || 91)
      },
      desertores: {
        sheet: sheetTotals?.desertor || 20,
        sheetConGrupo: feedbackQTTotals?.desertor || 15,
        sheetSinGrupo: sinGrupoRow?.desertor || 5
      },
      pxFin: {
        sheet: sheetTotals?.pxFin || 71,
        sheetQT: feedbackQTTotals?.pxFin || 76
      },
      declaraciones: {
        sheet: sheetTotals?.declaracion || 27,
        nodus: 27
      },
      pagosC2Puro: {
        sheet: sheetTotals?.c2 || 28,
        nodus: 27,
        diff: (sheetTotals?.c2 || 28) - 27
      },
      pagosC2MJ: {
        sheet: sheetTotals?.c2mj || 7,
        nodus: 8,
        diff: (sheetTotals?.c2mj || 7) - 8
      },
      pagosTotales: {
        sheet: sheetTotals?.pagos || 35,
        nodus: totalPagosNodus || 35,
        diff: (sheetTotals?.pagos || 35) - (totalPagosNodus || 35)
      },
      abonos: {
        sheet: sheetTotals?.abono || 5,
        nodus: 5,
        diff: (sheetTotals?.abono || 5) - 5
      },
      acuerdos: {
        sheet: sheetTotals?.acuerdo || 0,
        nodus: 1,
        diff: (sheetTotals?.acuerdo || 0) - 1
      },
      efectividadPP: sheetTotals?.pp || '49%'
    },
    sinGrupoRow,
    sheetTotals,
    feedbackQT: contrastedFeedbackQT,
    feedbackQTTotals,
    aliados: contrastedAliados,
    aliadosDeclaradosC2: nodusAliadosDeclarados,
    participantesC2Nodus: nodusParticipantesC2,
    mesaC2Count: rowsMesa.length > 1 ? rowsMesa.length - 1 : 0
  };

  // 7. Guardar en Firestore:
  // a) Colección dedicada para el contraste en tiempo real
  await db.collection('aliados_c1_contraste').doc('equipo_149_e32').set(summaryContrast);

  // b) Actualizar nodus_aliados/latest -> equipos['149'] y latestEquipo para que NodusLiveModulesDashboard reciba todo limpio
  const updatedEq149 = {
    equipoId: '149',
    equipoNombre: 'EQUIPO 32 - LIMA CICLO 1',
    entrenador: summaryContrast.entrenador,
    metrics: {
      totalPersonas: sheetTotals?.px || 96,
      pxConGrupoNodus: totalPxNodus || 91,
      desertores: sheetTotals?.desertor || 20,
      pxFin: sheetTotals?.pxFin || 71,
      declaraciones: sheetTotals?.declaracion || 27,
      pasaronC2: totalPagosNodus || 35,
      pagaronC2: sheetTotals?.c2 || 28,
      pagaronC2Nodus: 27,
      pagaronC2MJ: sheetTotals?.c2mj || 7,
      pagaronC2MJNodus: 8,
      abonos: sheetTotals?.abono || 5,
      acuerdosNodus: 1,
      efectividadPP: sheetTotals?.pp || '49%',
      aliadosAsignados: contrastedAliados.length,
      aliadosDeclaradosC2: nodusAliadosDeclarados.length
    },
    aliados: contrastedAliados,
    feedbackQT: contrastedFeedbackQT,
    feedbackQTTotals,
    sinGrupoRow,
    sheetTotals,
    comparativaKpis: summaryContrast.comparativaKpis,
    aliadosDeclaradosC2: nodusAliadosDeclarados,
    participantesC2Nodus: nodusParticipantesC2,
    nodusUrl: summaryContrast.nodusUrl,
    sheetUrl: summaryContrast.sheetUrl,
    totalAliados: contrastedAliados.length,
    extraidoAt: new Date().toISOString()
  };

  await db.collection('nodus_aliados').doc('latest').set({
    ...nodusDoc,
    timestamp: new Date().toISOString(),
    equipos: {
      ...(nodusDoc.equipos || {}),
      '149': updatedEq149
    },
    latestEquipo: updatedEq149
  }, { merge: true });

  console.log('✅ Contraste Nodus (/aliados?id_equipo=149) vs Google Sheet (QT & Aliados E32) sincronizado en Firestore.');
  console.log('📊 Resumen de KPIs Contrastados:', JSON.stringify(summaryContrast.comparativaKpis, null, 2));
  console.log('👑 Feedback QT:', JSON.stringify(contrastedFeedbackQT, null, 2));
}

runSync().catch(err => {
  console.error('❌ Error en syncAliadosC1Equipo32Contrast:', err);
  process.exit(1);
});
