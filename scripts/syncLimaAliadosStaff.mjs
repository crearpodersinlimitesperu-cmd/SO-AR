/**
 * syncLimaAliadosStaff.mjs - Causa OS Enterprise
 * ==============================================
 * Sincronización oficial del Google Sheet de LIMA:
 * Sheet ID: 1l93lhINfZtthELjOwBodoUEgk_d6A8gTb9hPGO6cOe4
 * 
 * 1. Pestaña 'ALIADOS C1E31' (gid: 488639774) -> Metas de C1E31 Aliados en Firestore.
 * 2. Pestaña 'GRADUADOS ' (gid: 1933359030) -> Linaje Genealógico Histórico de Lima (E4 a E39)
 *    para cruce directo con Nodus y visualización en el Árbol Genealógico (/crm-maestro).
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fetch from 'node-fetch';

const SHEET_ID = '1l93lhINfZtthELjOwBodoUEgk_d6A8gTb9hPGO6cOe4';
const GID_ALIADOS_C1E31 = '488639774';
const GID_STAFF_E31 = '1709168726';
const GID_STAFF_E30 = '695198016';
const GID_GRADUADOS_LIMA = '1933359030';

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows = [];
  for (const line of lines) {
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

function cleanPersonName(raw) {
  if (!raw) return '';
  return String(raw).trim().toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchAndProcessLimaSheet() {
  console.log('🔄 Descargando datos de GRADUADOS LIMA (Sheet ID:', SHEET_ID, ')...');

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

  for (let i = 1; i < aliadosRows.length; i++) {
    const r = aliadosRows[i];
    if (!r || r.length < 3) continue;
    const nombre = (r[0] || '').trim();
    if (!nombre || nombre.toLowerCase().includes('creador cuantico') || nombre.toLowerCase().includes('capitana')) continue;

    const equipo = (r[1] || '').trim();
    const coordAsignada = (r[2] || '').trim().toUpperCase();
    const estado = (r[3] || '').trim().toUpperCase();
    const obs = (r[4] || '').trim();

    const isOk = estado === 'OK' || estado === 'CONFIRMADO';
    const isSig = estado === 'SIG' || estado.includes('SIGUE') || estado.includes('PROCESO');

    if (isOk) totalOk++;
    if (isSig) totalSig++;

    let coordKey = null;
    if (coordAsignada.includes('JOYCE')) coordKey = 'JOYCE';
    else if (coordAsignada.includes('DIANA')) coordKey = 'DIANA';
    else if (coordAsignada.includes('LINID')) coordKey = 'LINID';
    else if (coordAsignada.includes('LEYLA')) coordKey = 'LEYLA';
    else if (coordAsignada.includes('JOSE')) coordKey = 'JOSE';

    if (coordKey && coordStats[coordKey]) {
      coordStats[coordKey].count++;
      if (isOk) coordStats[coordKey].ok++;
      if (isSig) coordStats[coordKey].sig++;
    }

    aliadosList.push({
      nombre,
      equipo,
      coordinadora: coordAsignada || 'SIN ASIGNAR',
      estado: isOk ? 'OK' : (isSig ? 'SIG' : (estado || 'PENDIENTE')),
      observaciones: obs,
      sede: 'Lima'
    });
  }

  // 2. Descargar Linaje de GRADUADOS LIMA (GID: 1933359030)
  console.log('📜 Descargando pestaña GRADUADOS (GID:', GID_GRADUADOS_LIMA, ')...');
  const gradUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID_GRADUADOS_LIMA}`;
  const gradRes = await fetch(gradUrl);
  const graduadosList = [];

  const roleMap = {
    'M': 'Manager',
    'A': 'Aliado',
    'C': 'Coordinador',
    'Q': 'Staff Quantum'
  };

  if (gradRes.ok) {
    const gradCsv = await gradRes.text();
    const gradRows = parseCSV(gradCsv);
    if (gradRows.length > 1) {
      const gradHeaders = gradRows[0];
      for (let i = 1; i < gradRows.length; i++) {
        const r = gradRows[i];
        if (!r || r.length < 2) continue;
        const nombre = (r[0] || '').trim();
        const equipoOrig = (r[1] || '').trim();

        if (nombre && !nombre.toLowerCase().includes('crear cuantico')) {
          const participaciones = [];
          const rolesSummary = { manager: 0, aliado: 0, coordinador: 0, staff: 0 };
          let ultimoRol = null;

          for (let c = 2; c < Math.min(r.length, gradHeaders.length); c++) {
            const val = (r[c] || '').trim().toUpperCase();
            if (val && val !== '-' && val !== 'NI' && val !== '0') {
              const edLabel = gradHeaders[c] || `E${c}`;
              const roleLabel = roleMap[val] || val;

              participaciones.push({
                edicion: edLabel,
                rolCode: val,
                rolLabel: roleLabel
              });

              if (val === 'M') rolesSummary.manager++;
              else if (val === 'A') rolesSummary.aliado++;
              else if (val === 'C') rolesSummary.coordinador++;
              else if (val === 'Q') rolesSummary.staff++;

              ultimoRol = `${edLabel}: ${roleLabel}`;
            }
          }

          graduadosList.push({
            nombre,
            nombreNorm: cleanPersonName(nombre),
            equipoOriginal: equipoOrig,
            participaciones,
            totalParticipaciones: participaciones.length,
            rolesSummary,
            ultimoRol
          });
        }
      }
      console.log(`✅ ${graduadosList.length} Creadores Cuánticos Graduados procesados exitosamente.`);
    }
  } else {
    console.warn('⚠️ No se pudo descargar pestaña GRADUADOS:', gradRes.statusText);
  }

  return {
    totalAliados: aliadosList.length,
    totalOk,
    totalSig,
    targetAliados: 25,
    coordStats,
    aliadosList,
    graduadosList
  };
}

export async function syncLimaGoalsToFirestore() {
  const data = await fetchAndProcessLimaSheet();
  console.log(`📊 Lima Aliados: ${data.totalOk} OK de ${data.targetAliados} meta (${data.totalAliados} registrados)`);

  let db;
  try {
    if (getApps().length === 0) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKey) {
        initializeApp({
          credential: cert(JSON.parse(serviceAccountKey))
        });
      } else {
        initializeApp();
      }
    }
    db = getFirestore();
  } catch (err) {
    console.error('❌ Error inicializando Firebase Admin SDK:', err.message);
    throw err;
  }

  // 1. Buscar Meta de Aliados C1E31 Lima
  const goalsSnapshot = await db.collection('goals').get();
  let limaAliadosGoal = null;
  let limaCycleGoal = null;

  goalsSnapshot.forEach(docSnap => {
    const g = { id: docSnap.id, ...docSnap.data() };
    const title = (g.title || '').toUpperCase();
    if (g.sede === 'Lima' || title.includes('LIMA')) {
      if (title.includes('ALIADOS') && (title.includes('C1') || title.includes('E31'))) {
        limaAliadosGoal = g;
      }
      if (title.includes('CICLO 1') || title.includes('C1E31') || g.scope === 'CICLO') {
        limaCycleGoal = g;
      }
    }
  });

  const progressPct = Math.min(100, Math.round((data.totalOk / data.targetAliados) * 100));

  const assignedCoordinators = [
    {
      name: data.coordStats.DIANA.name,
      email: data.coordStats.DIANA.email,
      role: data.coordStats.DIANA.role,
      sede: 'Lima',
      targetQuota: 6,
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
    console.log(`📝 Actualizando meta existente: ${limaAliadosGoal.title} (ID: ${limaAliadosGoal.id})...`);
    await db.collection('goals').doc(limaAliadosGoal.id).update({
      currentValue: data.totalOk,
      progress: progressPct,
      assignedCoordinators,
      autoSyncedFromLimaSheet: true,
      limaSheetSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    if (limaAliadosGoal.parentId) {
      console.log(`🔄 Ejecutando Rollup a meta padre: ${limaAliadosGoal.parentId}...`);
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
      console.log(`✨ Meta Ciclo actualizada a ${avg}%.`);
    }
  } else {
    console.log('➕ Creando nueva meta de Aliados C1E31 Lima...');
    await db.collection('goals').add({
      title: 'Aliados C1E31 Lima (Oficial Sheet)',
      description: 'Meta oficial de aliados comprometidos para el Ciclo 1 Entrenamiento 31 de Lima',
      type: 'QUANTITATIVE',
      targetValue: data.targetAliados,
      currentValue: data.totalOk,
      progress: progressPct,
      unit: 'Aliados',
      frequency: 'CYCLE',
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

  // Guardar directorio de Aliados en batch
  if (data.aliadosList.length > 0) {
    console.log(`💾 Guardando directorio de ${data.aliadosList.length} aliados de Lima...`);
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
    console.log('✅ Directorio de aliados de Lima guardado en Firestore.');
  }

  // Guardar Linaje Histórico de Graduados de Lima (E4 a E39)
  if (data.graduadosList && data.graduadosList.length > 0) {
    console.log(`💾 Guardando linaje de ${data.graduadosList.length} Creadores Cuánticos Graduados de Lima en Firestore...`);
    await db.collection('lima_graduados_lineage').doc('latest').set({
      graduados: data.graduadosList,
      metadata: {
        totalGraduados: data.graduadosList.length,
        sheetId: SHEET_ID,
        tabGid: GID_GRADUADOS_LIMA,
        tabName: 'GRADUADOS',
        sede: 'Lima',
        updatedAt: new Date().toISOString()
      }
    }, { merge: true });
    console.log('✅ Linaje de Creadores Graduados de Lima guardado en Firestore (lima_graduados_lineage/latest).');
  }

  console.log('🎉 Sincronización oficial de Lima completada con éxito.');
  return data;
}

// Ejecución directa por CLI
if (process.argv[1] && process.argv[1].includes('syncLimaAliadosStaff.mjs')) {
  syncLimaGoalsToFirestore().catch(err => {
    console.error('❌ Error en syncLimaAliadosStaff:', err);
    process.exit(1);
  });
}
