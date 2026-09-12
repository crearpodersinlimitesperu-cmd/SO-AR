import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const KEY_FILE = './centro-operativo-cpsl-65ad52160f45.json';

// Inicializar Firebase Admin si existe la clave o credenciales por defecto
if (fs.existsSync(KEY_FILE)) {
  const serviceAccount = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount) });
  }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  if (getApps().length === 0) {
    initializeApp();
  }
}

let db = null;
try {
  if (getApps().length > 0) {
    db = getFirestore();
  }
} catch (e) {
  console.warn('Firebase Admin no pudo inicializarse automÃ¡ticamente:', e.message);
}

const SHEET_ID = '1l93lhINfZtthELjOwBodoUEgk_d6A8gTb9hPGO6cOe4';
const GID_ALIADOS_C1E31 = '488639774';
const GID_STAFF_E31 = '1709168726';
const GID_STAFF_E30 = '695198016';

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows = [];
  for (const line of lines) {
    // Parsea lÃ­nea respetando comillas
    const matches = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g) || [];
    const cols = matches.map(m => {
      let val = m.replace(/^,/, '').trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"').trim();
      }
      return val;
    });
    rows.push(cols);
  }
  return rows;
}

export async function fetchAndProcessLimaSheet() {
  console.log('ðŸ”„ Descargando datos de GRADUADOS LIMA (Sheet ID:', SHEET_ID, ')...');

  // 1. Descargar ALIADOS C1E31
  const aliadosUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID_ALIADOS_C1E31}`;
  const aliadosRes = await fetch(aliadosUrl);
  if (!aliadosRes.ok) throw new Error(`Error descargando ALIADOS C1E31: ${aliadosRes.statusText}`);
  const aliadosCsv = await aliadosRes.text();
  const aliadosRows = parseCSV(aliadosCsv);

  // Analizar Aliados
  const aliadosList = [];
  const coordStats = {
    JOYCE: { count: 0, ok: 0, sig: 0, name: 'Joyce Marin Suarez', email: 'joyce.marin@crearpsl.net', role: 'coord_c1' },
    DIANA: { count: 0, ok: 0, sig: 0, name: 'Diana Moscoso Robles', email: 'diana.moscoso@crearpsl.net', role: 'coord_c1' },
    LINID: { count: 0, ok: 0, sig: 0, name: 'Linid Valencia', email: 'linid.valencia@crearpsl.net', role: 'coord_maestria' },
    LEYLA: { count: 0, ok: 0, sig: 0, name: 'Leyla Pasquel', email: 'leyla.pasquel@crearpsl.net', role: 'coord_maestria' },
    JOSE: { count: 0, ok: 0, sig: 0, name: 'Jose Sanchez', email: 'jose.sanchez@crearpsl.net', role: 'gerente' }
  };

  let totalOk = 0;
  let totalSig = 0;

  // Header en fila 0/1
  for (let i = 1; i < aliadosRows.length; i++) {
    const r = aliadosRows[i];
    if (!r || r.length < 3) continue;
    const nombre = (r[0] || '').trim();
    if (!nombre || nombre.toLowerCase().includes('creador cuantico') || nombre.toLowerCase().includes('capitana')) continue;

    const equipo = (r[1] || '').trim();
    const resp = (r[2] || '').trim().toUpperCase();
    const estado = (r[3] || '').trim().toUpperCase();
    const observaciones = (r[4] || '').trim();

    aliadosList.push({
      nombre,
      equipo,
      responsable: resp,
      estado,
      observaciones
    });

    let k = Object.keys(coordStats).find(ck => resp.includes(ck));
    if (k) {
      coordStats[k].count++;
      if (estado === 'OK') coordStats[k].ok++;
      if (estado === 'SIG') coordStats[k].sig++;
    }

    if (estado === 'OK') totalOk++;
    if (estado === 'SIG') totalSig++;
  }

  console.log(`âœ… Procesados ${aliadosList.length} registros de ALIADOS C1E31.`);
  console.log(`ðŸ“Š Total OK: ${totalOk} | Total SIG: ${totalSig}`);
  for (const [k, v] of Object.entries(coordStats)) {
    console.log(`   - ${k} (${v.name}): ${v.ok} OK / ${v.count} asignados`);
  }

  // 2. Descargar STAFF ELITE CAP 1 E31
  const staffUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID_STAFF_E31}`;
  let staffList = [];
  try {
    const staffRes = await fetch(staffUrl);
    if (staffRes.ok) {
      const staffCsv = await staffRes.text();
      const staffRows = parseCSV(staffCsv);
      for (let i = 1; i < staffRows.length; i++) {
        const r = staffRows[i];
        if (!r || r.length < 2) continue;
        const resp = (r[0] || '').trim().toUpperCase();
        const nombre = (r[1] || '').trim();
        if (!nombre || nombre.toLowerCase().includes('staff elite')) continue;
        const equipo = (r[2] || '').trim();
        const viernes = (r[3] || '').trim();
        const sabado = (r[4] || '').trim();
        const domingoAM = (r[5] || '').trim();
        const domingoPM = (r[6] || '').trim();
        const observaciones = (r[7] || '').trim();

        staffList.push({
          responsable: resp,
          nombre,
          equipo,
          viernes,
          sabado,
          domingoAM,
          domingoPM,
          observaciones,
          edicion: 'E31'
        });
      }
      console.log(`âœ… Procesados ${staffList.length} registros de STAFF ELITE CAP 1 E31.`);
    }
  } catch (err) {
    console.warn('Aviso leyendo STAFF ELITE:', err.message);
  }

  return {
    totalOk,
    totalSig,
    coordStats,
    aliadosList,
    staffList
  };
}

export async function syncLimaGoalsToFirestore() {
  const data = await fetchAndProcessLimaSheet();
  if (!db) {
    console.log('âš ï¸ db de Firestore no inicializada en este entorno local. Los datos se calcularon exitosamente.');
    return data;
  }

  console.log('ðŸ”¥ Sincronizando metas de Lima en Firestore...');
  const goalsSnapshot = await db.collection('goals').get();
  let limaAliadosGoal = null;
  let limaCycleGoal = null;

  goalsSnapshot.forEach(docSnap => {
    const g = docSnap.data();
    const sedeNorm = (g.sede || '').toLowerCase();
    if (sedeNorm.includes('lima')) {
      const titleLower = (g.title || '').toLowerCase();
      if (titleLower.includes('aliados') && (titleLower.includes('1') || titleLower.includes('c1') || g.stage === 'C1')) {
        limaAliadosGoal = { id: docSnap.id, ...g };
      }
      if (g.scope === 'CICLO') {
        limaCycleGoal = { id: docSnap.id, ...g };
      }
    }
  });

  const targetVal = limaAliadosGoal?.targetValue || 32;
  const progressPct = Math.min(100, Math.round((data.totalOk / targetVal) * 100));

  const assignedCoordinators = [
    {
      name: data.coordStats.DIANA.name,
      email: data.coordStats.DIANA.email,
      role: data.coordStats.DIANA.role,
      sede: 'Lima',
      targetQuota: data.coordStats.DIANA.ok || 13,
      currentQuota: data.coordStats.DIANA.ok
    },
    {
      name: data.coordStats.JOYCE.name,
      email: data.coordStats.JOYCE.email,
      role: data.coordStats.JOYCE.role,
      sede: 'Lima',
      targetQuota: data.coordStats.JOYCE.ok || 12,
      currentQuota: data.coordStats.JOYCE.ok
    },
    {
      name: data.coordStats.LINID.name,
      email: data.coordStats.LINID.email,
      role: data.coordStats.LINID.role,
      sede: 'Lima',
      targetQuota: data.coordStats.LINID.ok || 3,
      currentQuota: data.coordStats.LINID.ok
    },
    {
      name: data.coordStats.LEYLA.name,
      email: data.coordStats.LEYLA.email,
      role: data.coordStats.LEYLA.role,
      sede: 'Lima',
      targetQuota: 2,
      currentQuota: data.coordStats.LEYLA.ok
    },
    {
      name: data.coordStats.JOSE.name,
      email: data.coordStats.JOSE.email,
      role: data.coordStats.JOSE.role,
      sede: 'Lima',
      targetQuota: 2,
      currentQuota: data.coordStats.JOSE.ok
    }
  ];

  if (limaAliadosGoal) {
    console.log(`ðŸ“ Actualizando meta existente: ${limaAliadosGoal.title} (ID: ${limaAliadosGoal.id})...`);
    await db.collection('goals').doc(limaAliadosGoal.id).update({
      currentValue: data.totalOk,
      progress: progressPct,
      assignedCoordinators,
      autoSyncedFromLimaSheet: true,
      limaSheetSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Rollup a Meta de Ciclo
    if (limaAliadosGoal.parentId) {
      console.log(`ðŸ”„ Ejecutando Rollup a meta padre: ${limaAliadosGoal.parentId}...`);
      const siblingsSnap = await db.collection('goals').where('parentId', '==', limaAliadosGoal.parentId).get();
      let totalProgress = progressPct;
      let count = 1;
      siblingsSnap.forEach(sDoc => {
        if (sDoc.id !== limaAliadosGoal.id) {
          totalProgress += (sDoc.data().progress || 0);
          count++;
        }
      });
      const avg = Math.round(totalProgress / count);
      await db.collection('goals').doc(limaAliadosGoal.parentId).update({
        progress: avg,
        updatedAt: new Date().toISOString()
      });
      console.log(`âœ¨ Meta Ciclo actualizada a ${avg}%.`);
    }
  } else {
    console.log('âž• Creando nueva meta Aliados - CapÃ­tulo 1 para Lima...');
    const newDoc = await db.collection('goals').add({
      title: 'Aliados - CapÃ­tulo 1',
      kpi: 'Cantidad de Aliados',
      targetValue: 32,
      currentValue: data.totalOk,
      progress: progressPct,
      scope: 'ENTRENAMIENTO',
      cyclePhase: 'C1',
      parentId: limaCycleGoal?.id || null,
      stage: 'C1',
      ownerId: 'admin',
      sede: 'Lima',
      assignedCoordinators,
      autoSyncedFromLimaSheet: true,
      limaSheetSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    if (limaCycleGoal) {
      await db.collection('goals').doc(limaCycleGoal.id).update({
        progress: progressPct,
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Guardar directorio en batch
  if (data.aliadosList.length > 0) {
    console.log(`ðŸ’¾ Guardando directorio de ${data.aliadosList.length} aliados de Lima...`);
    const batch = db.batch();
    const colRef = db.collection('lima_aliados_directory');
    data.aliadosList.slice(0, 450).forEach((item, idx) => {
      const docId = `aliado_${idx}_${item.nombre.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 30)}`;
      batch.set(colRef.doc(docId), {
        ...item,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
    await batch.commit();
    console.log('âœ… Directorio de aliados de Lima guardado en Firestore.');
  }

  console.log('ðŸŽ‰ SincronizaciÃ³n oficial de Lima completada con Ã©xito.');
  return data;
}

// EjecuciÃ³n directa por CLI
if (process.argv[1] && process.argv[1].includes('syncLimaAliadosStaff.mjs')) {
  syncLimaGoalsToFirestore().catch(err => {
    console.error('âŒ Error en syncLimaAliadosStaff:', err);
    process.exit(1);
  });
}
