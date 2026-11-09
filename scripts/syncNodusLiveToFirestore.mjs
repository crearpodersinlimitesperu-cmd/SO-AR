/**
 * scripts/syncNodusLiveToFirestore.mjs
 * =========================================================================
 * Sincronizador Oficial Nodus API -> Cloud Firestore (Causa OS / SO-AR)
 * =========================================================================
 * Consume la API oficial https://imo.crearpslglobal.com/api con la clave provista
 * por Dirección (Armando Pilacuán) e inserta o actualiza participantes en Firestore.
 *
 * Directivas de Seguridad e Integridad:
 * 1. Cero deletes físicos.
 * 2. Cero suposiciones o inventos: Solo escribe los datos provistos por la API.
 * 3. Terminología estricta: Siempre 'partner' para rol de apoyo, nunca 'sombra'.
 * 4. Manejo por lotes: batches <= 400 operaciones.
 */

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getLiveNodusParticipantes, getLiveNodusSedes } from '../src/services/nodusLiveApiService.js';

function getDb() {
  if (getApps().length > 0) return getFirestore(getApps()[0]);
  const rawSA = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawSA) return null;
  try {
    const sa = JSON.parse(rawSA);
    const app = initializeApp({ credential: cert(sa) });
    return getFirestore(app);
  } catch (err) {
    console.warn('⚠️ No se pudo inicializar Firebase Admin:', err.message);
    return null;
  }
}

export async function sincronizarEquipoNodus(equipoId, { dryRun = false, db = null } = {}) {
  const firestore = db || getDb();
  console.log(`[Nodus Sync] Consultando Equipo ID ${equipoId} en Nodus API...`);

  const nodusRes = await getLiveNodusParticipantes(equipoId);
  if (!nodusRes.ok) {
    console.error(`❌ Error consultando Nodus API: ${nodusRes.error}`);
    return { ok: false, error: nodusRes.error };
  }

  const { equipo, participantes, total } = nodusRes;
  console.log(`✅ [Nodus Sync] ${total} participantes obtenidos para '${equipo.nombre}' (${equipo.sede}).`);

  if (!firestore) {
    console.log(`ℹ️ [Nodus Sync] Firestore Admin no configurado en entorno. Retornando datos sin escribir en BD.`);
    return { ok: true, equipo, total, dryRun: true, participantes: participantes.slice(0, 3) };
  }

  if (dryRun) {
    console.log(`ℹ️ [Nodus Sync] Modo Dry-Run activo. Se procesarían ${total} documentos.`);
    return { ok: true, equipo, total, dryRun: true };
  }

  const BATCH_SIZE = 400;
  let lotes = 0;
  const timestamp = new Date().toISOString();

  for (let i = 0; i < participantes.length; i += BATCH_SIZE) {
    const chunk = participantes.slice(i, i + BATCH_SIZE);
    const batch = firestore.batch();

    for (const p of chunk) {
      const docRef = firestore.collection('nodus_enrolados').doc(String(p.id));
      batch.set(docRef, {
        ...p,
        syncedFromNodusAt: timestamp,
        nodusSource: 'API_DIRECTA_IMO',
        activo: true
      }, { merge: true });
    }

    await batch.commit();
    lotes++;
  }

  // Registrar en audit_logs
  await firestore.collection('audit_logs').add({
    tipoAccion: 'SINCRONIZACION_NODUS_API',
    equipoId: equipo.id,
    equipoNombre: equipo.nombre,
    sede: equipo.sede,
    participantesSincronizados: total,
    lotes,
    timestamp,
    ejecutadoPor: 'syncNodusLiveToFirestore'
  });

  console.log(`🎉 [Nodus Sync] Equipo ${equipo.nombre} sincronizado exitosamente en ${lotes} lote(s).`);
  return { ok: true, equipo, total, lotes };
}

// Invocación CLI
if (process.argv[1] && process.argv[1].endsWith('syncNodusLiveToFirestore.mjs')) {
  const args = process.argv.slice(2);
  const equipoId = args.find(a => /^\d+$/.test(a)) || 141; // Default: Equipo 31 (141)
  const dryRun = args.includes('--dry-run');

  sincronizarEquipoNodus(equipoId, { dryRun })
    .then(r => {
      console.log('Resultado:', JSON.stringify(r, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Error fatal:', err);
      process.exit(1);
    });
}
