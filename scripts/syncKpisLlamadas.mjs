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

export function normalizeTrainerName(s) {
  const clean = String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (clean.includes('jesusacosta') || clean.includes('chuyacosta')) return 'chuyacosta';
  if (clean.includes('erikagavilanez')) return 'erikagavilanez';
  if (clean.includes('fernandomendoza')) return 'fernandomendoza';
  if (clean.includes('josesanchez')) return 'josesanchez';
  if (clean.includes('juanferreinoso') || clean.includes('juanfernandoreinoso')) return 'juanfernandoreinoso';
  if (clean.includes('alejandrodiaz')) return 'alejandrodiaz';
  if (clean.includes('andresidrobo')) return 'andresidrobo';
  if (clean.includes('andresgomez')) return 'andresgomez';
  if (clean.includes('anacristinasanchez')) return 'anacristinasanchez';
  if (clean.includes('anamonroy')) return 'anamonroy';
  if (clean.includes('danielamonroy')) return 'danielamonroy';
  if (clean.includes('mariajoseroman')) return 'mariajoseroman';
  if (clean.includes('mildredmunoz')) return 'mildredmunoz';
  if (clean.includes('lourdespatino')) return 'lourdespatino';
  if (clean.includes('kerliecarrillo') || clean.includes('kerlycarrillo')) return 'kerliecarrillo';
  if (clean.includes('julionarvaez')) return 'julionarvaez';
  if (clean.includes('diegobravo')) return 'diegobravo';
  if (clean.includes('davidsosa')) return 'davidsosa';
  if (clean.includes('josetorr')) return 'josetorron';
  if (clean.includes('pamelacarrillo')) return 'pamelacarrillo';
  if (clean.includes('mauricio')) return 'mauricioramirez';
  return clean || 'sin-asignar';
}

export function slug(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sin-nombre';
}

function cleanStr(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export async function syncKpisLlamadas() {
  console.log('=== Iniciando Sincronización Integral de KPIs (Llamadas, Graduados, Desertores, Asignados) ===');
  const startTime = Date.now();

  // 1. Sheet 1: Managers Directorio Maestro
  console.log('Leyendo Sheet 1 (Managers)...');
  const resMan = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: SHEET_MANAGERS_ID,
    range: "'Hoja1'!A1:L1500",
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

  // 3. Sheet 2: LLamadas Detalle 1 a 16
  console.log('Leyendo Sheet 2 (LLamadas detalle)...');
  const resLlam = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: SHEET_LLAMADOS_ID,
    range: "'LLamadas'!A1:Z1800",
  });
  const llamRows = resLlam.data.values || [];
  console.log(`Sheet 2 (LLamadas): ${llamRows.length} filas leídas.`);

  // A. Parse Sheet 1 Managers (Directorio Maestro)
  const managersSheet1 = [];
  const statusByManagerCleanName = new Map();
  const trainerManagersMap = {};

  let totalGraduados = 0;
  let totalDesertores = 0;
  let totalActivos = 0;
  let totalAsignados = 0;
  let totalSinAsignar = 0;

  for (let i = 1; i < manRows.length; i++) {
    const r = manRows[i];
    if (!r || !r[1]) continue;

    const orden = r[0]?.trim() || `${i}`;
    const nombre = r[1]?.trim() || '';
    const rol = r[2]?.trim() || 'MANAGER';
    const telefono = r[3]?.trim() || '';
    const numEquipo = r[4]?.trim() || '';
    const nombreEquipo = r[5]?.trim() || '';
    const tieneEntrRaw = (r[6] || '').trim().toLowerCase();
    const tieneEntrenador = tieneEntrRaw === 'si' || tieneEntrRaw === 'sí';
    const entrenadorRaw = r[7]?.trim() || '';
    const coordinador = r[8]?.trim() || '';
    const sede = r[9]?.trim() || 'Sin Sede';
    const graduadoVal = (r[10] || '').trim().toUpperCase();
    const desertorVal = (r[11] || '').trim().toUpperCase();

    const isGraduado = graduadoVal.includes('GRADUAD') || graduadoVal === 'SI' || graduadoVal === 'X';
    const isDesertor = desertorVal.includes('DESERT') || desertorVal === 'SI' || desertorVal === 'X';

    let estado = 'EN_JUEGO';
    if (isGraduado) {
      estado = 'GRADUADO';
      totalGraduados++;
    } else if (isDesertor) {
      estado = 'DESERTOR';
      totalDesertores++;
    } else {
      totalActivos++;
    }

    const hasAssignedTrainer = tieneEntrenador;
    if (hasAssignedTrainer) {
      totalAsignados++;
    } else {
      totalSinAsignar++;
    }

    const managerObj = {
      id: `mgr_${i}`,
      orden,
      nombre,
      rol,
      telefono,
      numEquipo,
      nombreEquipo,
      tieneEntrenador: hasAssignedTrainer,
      entrenador: entrenadorRaw || 'Sin Asignar',
      coordinador,
      sede,
      estado,
      isGraduado,
      isDesertor,
      isActivo: estado === 'EN_JUEGO'
    };

    managersSheet1.push(managerObj);
    statusByManagerCleanName.set(cleanStr(nombre), {
      estado,
      isGraduado,
      isDesertor,
      telefono,
      coordinador,
      nombreEquipo,
      numEquipo
    });

    if (entrenadorRaw && entrenadorRaw !== '-' && entrenadorRaw.toLowerCase() !== 'sin asignar') {
      const tNorm = normalizeTrainerName(entrenadorRaw);
      if (!trainerManagersMap[tNorm]) {
        trainerManagersMap[tNorm] = {
          total: 0,
          graduados: 0,
          desertores: 0,
          activos: 0,
          managers: []
        };
      }
      trainerManagersMap[tNorm].total++;
      if (isGraduado) trainerManagersMap[tNorm].graduados++;
      else if (isDesertor) trainerManagersMap[tNorm].desertores++;
      else trainerManagersMap[tNorm].activos++;
      trainerManagersMap[tNorm].managers.push(managerObj);
    }
  }

  // B. Parse KPIs Entrenadores (Sheet 2)
  const kpis = [];
  for (let i = 2; i < kpiRows.length; i++) {
    const r = kpiRows[i];
    if (!r || !r[1] || r[1] === 'Suma total') continue;
    const entrenadorName = r[1].trim();
    const totalLlamadas = parseInt(r[2] || '0', 10);
    const pagadoLlamadas = parseFloat((r[3] || '0').replace('$', '').replace(/,/g, ''));
    const pendienteLlamadas = parseFloat((r[4] || '0').replace('$', '').replace(/,/g, ''));
    const montoTotal = parseFloat((r[5] || '0').replace('$', '').replace(/,/g, ''));

    const tNorm = normalizeTrainerName(entrenadorName);
    const trainerStats = trainerManagersMap[tNorm] || {
      total: 0,
      graduados: 0,
      desertores: 0,
      activos: 0,
      managers: []
    };

    const totalAsignadosTrainer = trainerStats.total;
    const graduadosTrainer = trainerStats.graduados;
    const desertoresTrainer = trainerStats.desertores;
    const activosTrainer = trainerStats.activos;

    kpis.push({
      entrenador: entrenadorName,
      normKey: tNorm,
      totalLlamadas,
      pagadoLlamadas,
      pendienteLlamadas,
      montoTotal,
      porcentajePagado: totalLlamadas > 0 ? Math.round((pagadoLlamadas / totalLlamadas) * 100) : 0,
      // Métricas de ciclo de vida del manager
      totalAsignados: totalAsignadosTrainer,
      graduados: graduadosTrainer,
      desertores: desertoresTrainer,
      activos: activosTrainer,
      tasaGraduacion: totalAsignadosTrainer > 0 ? Math.round((graduadosTrainer / totalAsignadosTrainer) * 100) : 0,
      tasaDesercion: totalAsignadosTrainer > 0 ? Math.round((desertoresTrainer / totalAsignadosTrainer) * 100) : 0,
    });
  }

  // C. Parse Sheet 2 LLamadas detalladas
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

    const mClean = cleanStr(manager);
    const sheet1Meta = statusByManagerCleanName.get(mClean) || {};

    llamadosDetalle.push({
      id: `llam_${i}`,
      entrenador: entrenador || 'Sin Asignar',
      manager: manager || '',
      sede: r[2]?.trim() || '',
      equipo: r[3]?.trim() || sheet1Meta.nombreEquipo || '',
      fechaInicio: r[4]?.trim() || '',
      fechaFinal: r[5]?.trim() || '',
      totalReportado: parseInt(r[22] || '0', 10),
      completadas,
      ausentes,
      calls,
      agosto: parseInt(r[23] || '0', 10) || 0,
      septiembre: parseInt(r[24] || '0', 10) || 0,
      octubre: parseInt(r[25] || '0', 10) || 0,
      estado: sheet1Meta.estado || 'EN_JUEGO',
      isGraduado: !!sheet1Meta.isGraduado,
      isDesertor: !!sheet1Meta.isDesertor,
      telefono: sheet1Meta.telefono || '',
      coordinador: sheet1Meta.coordinador || '',
    });
  }

  // Totales globales
  const totalLlamadas = kpis.reduce((acc, k) => acc + k.totalLlamadas, 0);
  const totalPagado = kpis.reduce((acc, k) => acc + k.pagadoLlamadas, 0);
  const totalPendiente = kpis.reduce((acc, k) => acc + k.pendienteLlamadas, 0);
  const montoTotal = kpis.reduce((acc, k) => acc + k.montoTotal, 0);

  // Agrupamiento por Sede
  const sedesDist = {};
  const sedesStatus = {};
  managersSheet1.forEach(m => {
    const s = m.sede || 'Sin Sede';
    sedesDist[s] = (sedesDist[s] || 0) + 1;
    if (!sedesStatus[s]) {
      sedesStatus[s] = { total: 0, graduados: 0, desertores: 0, activos: 0 };
    }
    sedesStatus[s].total++;
    if (m.isGraduado) sedesStatus[s].graduados++;
    else if (m.isDesertor) sedesStatus[s].desertores++;
    else sedesStatus[s].activos++;
  });

  const totalManagers = managersSheet1.length;
  const tasaGraduacionGlobal = totalManagers > 0 ? Math.round((totalGraduados / totalManagers) * 100) : 0;
  const tasaDesercionGlobal = totalManagers > 0 ? Math.round((totalDesertores / totalManagers) * 100) : 0;
  const tasaAsignacionGlobal = totalManagers > 0 ? Math.round((totalAsignados / totalManagers) * 100) : 0;

  const compiledData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      sheetManagersId: SHEET_MANAGERS_ID,
      sheetLlamadosId: SHEET_LLAMADOS_ID,
      totalTrainers: kpis.length,
      totalDetailedRecords: llamadosDetalle.length,
      totalManagersSheet1: totalManagers,
      syncDurationMs: Date.now() - startTime
    },
    totales: {
      totalLlamadas,
      totalPagado,
      totalPendiente,
      montoTotal,
      porcentajePagado: totalLlamadas > 0 ? Math.round((totalPagado / totalLlamadas) * 100) : 0,
      totalManagers,
      totalGraduados,
      totalDesertores,
      totalActivos,
      totalAsignados,
      totalSinAsignar,
      tasaGraduacionGlobal,
      tasaDesercionGlobal,
      tasaAsignacionGlobal,
      sedesDist,
      sedesStatus,
      statusDist: {
        Graduados: totalGraduados,
        Desertores: totalDesertores,
        'En Juego': totalActivos,
      }
    },
    kpis,
    llamadosDetalle,
    managersSheet1,
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

  // 2. Entrenadores con sus managers de ambas hojas
  const managersByTrainerDetail = {};
  llamadosDetalle.forEach(m => {
    const t = m.entrenador || 'Sin Asignar';
    if (!managersByTrainerDetail[t]) managersByTrainerDetail[t] = [];
    managersByTrainerDetail[t].push(m);
  });

  for (const kpi of kpis) {
    const trainerName = kpi.entrenador;
    const trainerSlug = slug(trainerName);
    const trainerRef = db.collection('kpis_entrenadores_llamadas').doc(trainerSlug);
    const callsList = managersByTrainerDetail[trainerName] || [];
    const tNorm = normalizeTrainerName(trainerName);
    const directoryList = trainerManagersMap[tNorm]?.managers || [];

    batch.set(trainerRef, {
      ...kpi,
      slug: trainerSlug,
      managersCount: callsList.length,
      managersList: callsList,
      directoryManagers: directoryList,
      actualizadoEl: new Date().toISOString()
    });
  }

  // --- NUEVA LÓGICA: Sincronizar hacia managers_directory ---
  console.log('Sincronizando managersSheet1 hacia managers_directory...');
  const snapManagers = await db.collection('managers_directory').get();
  const existingManagers = [];
  snapManagers.forEach(d => existingManagers.push({ ...d.data(), docId: d.id }));

  const normalizeStr = (str) => String(str || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  
  let added = 0;
  let updated = 0;

  for (const nodusMgr of managersSheet1) {
    if (!nodusMgr.nombre || nodusMgr.nombre === '') continue;
    
    // Find if it exists in Firebase (match by exact name and sede)
    const match = existingManagers.find(em => 
      normalizeStr(em.nombre) === normalizeStr(nodusMgr.nombre) && 
      normalizeStr(em.sede) === normalizeStr(nodusMgr.sede)
    );

    const updateData = {
      nombre: nodusMgr.nombre,
      rol: nodusMgr.rol || 'Manager',
      telefono: nodusMgr.telefono || '',
      numEquipo: nodusMgr.numEquipo || '',
      equipo: nodusMgr.nombreEquipo || '',
      sede: nodusMgr.sede || '',
      entrenador: nodusMgr.entrenador || 'Sin Asignar',
      tieneEntrenador: nodusMgr.tieneEntrenador || false,
      coordinador: nodusMgr.coordinador || '',
      estado: nodusMgr.estado || 'Activo',
      fuente: 'nodus'
    };

    if (match) {
      // Update existing
      const docRef = db.collection('managers_directory').doc(match.docId);
      batch.set(docRef, updateData, { merge: true });
      updated++;
    } else {
      // Insert new
      const docRef = db.collection('managers_directory').doc();
      updateData.id = docRef.id;
      batch.set(docRef, updateData);
      added++;
    }
  }

  console.log(`Managers sincronizados hacia Causa OS: ${added} nuevos, ${updated} actualizados.`);

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
