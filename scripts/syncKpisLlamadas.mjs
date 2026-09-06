import { google } from 'googleapis';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const KEY_FILE = './centro-operativo-cpsl-65ad52160f45.json';

if (!fs.existsSync(KEY_FILE)) {
  console.error(`No se encontró el archivo de credenciales ${KEY_FILE}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheetsApi = google.sheets({ version: 'v4', auth });

const SHEET_MANAGERS_ID = '1KF58QXAiIk4KP_9G2aiAM3ERVoptcqKlIraszNKq2Ow';
const SHEET_LLAMADOS_ID = '1lWAHh1PSAKu9eU6DOBxZExrHMbCYc3f2Sr8GdghNxD0';

function slug(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sin-nombre';
}

export async function syncKpisLlamadas() {
  console.log('=== Iniciando Sincronización en Tiempo Real de KPIs de Entrenadores de Llamadas ===');
  const startTime = Date.now();

  // 1. Sheet 1: Managers Directorio
  console.log('Leyendo Sheet 1 (Managers)...');
  const resMan = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: SHEET_MANAGERS_ID,
    range: "'Hoja1'!A1:L1200",
  });
  const manRows = resMan.data.values || [];
  console.log(`Sheet 1: ${manRows.length} filas leídas.`);

  // 2. Sheet 2: KPIs Entrenadores
  console.log('Leyendo Sheet 2 (KPIs Entrenadores)...');
  const resKpis = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: SHEET_LLAMADOS_ID,
    range: "'KPIs Entrenadores'!A1:F100",
  });
  const kpiRows = resKpis.data.values || [];
  console.log(`Sheet 2 (KPIs): ${kpiRows.length} filas leídas.`);

  // 3. Sheet 2: LLamadas Detalladas
  console.log('Leyendo Sheet 2 (LLamadas detalle)...');
  const resLlam = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: SHEET_LLAMADOS_ID,
    range: "'LLamadas'!A1:Z1500",
  });
  const llamRows = resLlam.data.values || [];
  console.log(`Sheet 2 (LLamadas): ${llamRows.length} filas leídas.`);

  // Parse KPIs
  const kpis = [];
  for (let i = 2; i < kpiRows.length; i++) {
    const r = kpiRows[i];
    if (!r || !r[1] || r[1] === 'Suma total') continue;
    const totalLlamadas = parseInt(r[2] || '0', 10);
    const pagadoLlamadas = parseFloat((r[3] || '0').replace('$', '').replace(/,/g, ''));
    const pendienteLlamadas = parseFloat((r[4] || '0').replace('$', '').replace(/,/g, ''));
    const montoTotal = parseFloat((r[5] || '0').replace('$', '').replace(/,/g, ''));
    kpis.push({
      entrenador: r[1].trim(),
      totalLlamadas,
      pagadoLlamadas,
      pendienteLlamadas,
      montoTotal,
      porcentajePagado: totalLlamadas > 0 ? Math.round((pagadoLlamadas / totalLlamadas) * 100) : 0,
    });
  }

  // Parse LLamadas detailed
  const llamadosDetalle = [];
  for (let i = 1; i < llamRows.length; i++) {
    const r = llamRows[i];
    const entrenador = r[0]?.trim();
    const manager = r[1]?.trim();
    if (!entrenador && !manager) continue;

    let completadas = 0;
    let ausentes = 0;
    const calls = [];
    for (let c = 1; c <= 16; c++) {
      const val = (r[5 + c] || '').trim().toUpperCase();
      calls.push(val);
      if (val === 'SI') completadas++;
      else if (val === 'NO') ausentes++;
    }

    llamadosDetalle.push({
      id: `llam_${i}`,
      entrenador: entrenador || 'Sin Asignar',
      manager: manager || '',
      sede: r[2]?.trim() || '',
      equipo: r[3]?.trim() || '',
      fechaInicio: r[4]?.trim() || '',
      fechaFinal: r[5]?.trim() || '',
      totalReportado: parseInt(r[22] || '0', 10),
      completadas,
      ausentes,
      calls,
      agosto: parseInt(r[23] || '0', 10) || 0,
      septiembre: parseInt(r[24] || '0', 10) || 0,
      octubre: parseInt(r[25] || '0', 10) || 0,
    });
  }

  // Totales globales
  const totalLlamadas = kpis.reduce((acc, k) => acc + k.totalLlamadas, 0);
  const totalPagado = kpis.reduce((acc, k) => acc + k.pagadoLlamadas, 0);
  const totalPendiente = kpis.reduce((acc, k) => acc + k.pendienteLlamadas, 0);
  const montoTotal = kpis.reduce((acc, k) => acc + k.montoTotal, 0);

  // Agrupamiento por Sede
  const sedesDist = {};
  llamadosDetalle.forEach(d => {
    const s = d.sede || 'Sin Sede';
    sedesDist[s] = (sedesDist[s] || 0) + 1;
  });

  const compiledData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      sheetManagersId: SHEET_MANAGERS_ID,
      sheetLlamadosId: SHEET_LLAMADOS_ID,
      totalTrainers: kpis.length,
      totalDetailedRecords: llamadosDetalle.length,
      totalManagersSheet1: manRows.length > 1 ? manRows.length - 1 : 0,
      syncDurationMs: Date.now() - startTime
    },
    totales: {
      totalLlamadas,
      totalPagado,
      totalPendiente,
      montoTotal,
      porcentajePagado: totalLlamadas > 0 ? Math.round((totalPagado / totalLlamadas) * 100) : 0,
      sedesDist,
    },
    kpis,
    llamadosDetalle,
  };

  // Guardar archivo JSON local
  const jsonPath = path.resolve('./src/data/kpisEntrenadoresData.json');
  fs.writeFileSync(jsonPath, JSON.stringify(compiledData, null, 2));
  console.log(`Archivo local actualizado en: ${jsonPath}`);

  // Sincronizar en Firestore
  console.log('Sincronizando Firestore colección kpis_entrenadores_llamadas...');
  const batch = db.batch();

  // 1. Resumen
  const resumenRef = db.collection('kpis_entrenadores_llamadas').doc('_resumen');
  batch.set(resumenRef, {
    metadata: compiledData.metadata,
    totales: compiledData.totales,
    kpis: compiledData.kpis,
    actualizadoEl: new Date().toISOString()
  });

  // 2. Entrenadores con sus managers
  const managersByTrainer = {};
  llamadosDetalle.forEach(m => {
    const t = m.entrenador || 'Sin Asignar';
    if (!managersByTrainer[t]) managersByTrainer[t] = [];
    managersByTrainer[t].push(m);
  });

  for (const kpi of kpis) {
    const trainerName = kpi.entrenador;
    const trainerSlug = slug(trainerName);
    const trainerRef = db.collection('kpis_entrenadores_llamadas').doc(trainerSlug);
    const list = managersByTrainer[trainerName] || [];

    batch.set(trainerRef, {
      ...kpi,
      slug: trainerSlug,
      managersCount: list.length,
      managersList: list,
      actualizadoEl: new Date().toISOString()
    });
  }

  await batch.commit();
  console.log('✅ Sincronización exitosa en Firestore y archivo local.');
  return compiledData;
}

if (process.argv[1] && process.argv[1].endsWith('syncKpisLlamadas.mjs')) {
  syncKpisLlamadas()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error sincronizando KPIs:', err);
      process.exit(1);
    });
}
