/**
 * MOTOR DE REFRESCO CONTINUO DE METAS EN JUEGO (RESULTADOS IMPOSIBLES - RIs)
 * =========================================================================
 * Plataforma: Causa OS (SO-AR v3.0.0) para CREAR PODER SIN LÍMITES
 * Sedes: Lima (LIM), Quito (UIO), Guayaquil (GYE), Cuenca (CUE), Medellín (MED), México (MEX/CDMX), Monterrey.
 *
 * Directivas de Arquitectura y Gobernanza:
 * 1. Terminología estricta: Utilizar exclusivamente "partner" (NUNCA "sombra").
 * 2. Estructura canónica: Cada participante activo cuenta con exactamente 3 Resultados Imposibles (RIs)
 *    evaluados bajo el modelo EMPOR (Evidencia, Medición, Propósito, Ontología).
 * 3. Idempotencia y Trazabilidad Inmutable: Cero deletes físicos. Los ciclos anteriores se preservan
 *    en 'historialCiclos' y cada lote se audita en la colección 'audit_logs'.
 * 4. Invalidación de Caché: Actualiza la clave 'cpsl_managers_data_v3' en 'system_metadata/cache_invalidation'.
 */

import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const SEDES_VALIDAS = [
  'LIMA', 'LIM',
  'QUITO', 'UIO',
  'GUAYAQUIL', 'GYE',
  'CUENCA', 'CUE',
  'MEDELLIN', 'MED',
  'MEXICO', 'MEX', 'CDMX',
  'MONTERREY', 'MTY'
];

/**
 * Inicialización tolerante y segura del cliente Firebase Admin Firestore.
 */
export function getAdminDb() {
  if (getApps().length > 0) {
    return getFirestore(getApps()[0]);
  }

  const rawSA = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (rawSA) {
    try {
      const sa = JSON.parse(rawSA);
      const app = initializeApp({ credential: cert(sa) });
      return getFirestore(app);
    } catch (err) {
      console.warn('⚠️ Error al parsear GOOGLE_SERVICE_ACCOUNT_JSON:', err.message);
    }
  }

  // Búsqueda en rutas locales de llaves conocidas
  const localKeys = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.resolve(process.cwd(), 'centro-operativo-cpsl-65ad52160f45.json'),
    path.resolve(process.cwd(), 'centro-operativo-cpsl-firebase-adminsdk-fbsvc-bcacde54f8.json'),
    path.resolve(process.cwd(), 'centro-operativo-cpsl-707cf6af45b2.json')
  ].filter(Boolean);

  for (const keyPath of localKeys) {
    if (fs.existsSync(keyPath)) {
      try {
        const sa = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        const app = initializeApp({ credential: cert(sa) });
        return getFirestore(app);
      } catch (e) {
        // Continuar buscando
      }
    }
  }

  return null;
}

/**
 * Normaliza nombres de sedes a formato canónico.
 */
export function normalizarSede(sede) {
  const s = String(sede || '').trim().toUpperCase();
  if (s.includes('LIM')) return 'Lima';
  if (s.includes('UIO') || s.includes('QUIT')) return 'Quito';
  if (s.includes('GYE') || s.includes('GUAYAQ')) return 'Guayaquil';
  if (s.includes('CUE') || s.includes('CUENC')) return 'Cuenca';
  if (s.includes('MED') || s.includes('MEDELL')) return 'Medellín';
  if (s.includes('CDMX') || s.includes('MEX')) return 'México';
  if (s.includes('MTY') || s.includes('MONTERR')) return 'Monterrey';
  return sede || 'Global';
}

/**
 * Genera el paquete canónico de 3 RIs para la transición de ciclo.
 */
export function estructurar3RIsTransicion(fisExistentes = [], participante = {}) {
  const risBase = Array.isArray(fisExistentes) ? fisExistentes.slice(0, 3) : [];
  const categoriasDefault = ['Financiera', 'Profesional', 'Salud y Vitalidad'];

  const tresRIs = [];
  for (let i = 0; i < 3; i++) {
    const item = risBase[i] || {};
    const cat = item.categoria || item.area || categoriasDefault[i];
    tresRIs.push({
      ri_id: item.ri_id || `RI-00${i + 1}`,
      prioridad: i + 1,
      titulo: item.titulo || item.meta || `Resultado Imposible ${i + 1} (${cat})`,
      categoria: cat,
      metrica_objetivo: item.metrica_objetivo || 100,
      metrica_actual: 0, // Reinicio para el nuevo ciclo
      unidad: item.unidad || 'PORCENTAJE',
      estadoAprobacion: 'EN_REVISION_PARTNER',
      evaluacionEMPOR: {
        evidencia: 'PENDIENTE',
        medicion: 'PENDIENTE',
        proposito: 'PENDIENTE',
        ontologia: 'PENDIENTE',
        puntaje: 0,
        estado: 'PENDIENTE_AUDITORIA',
        ultimaRevision: new Date().toISOString()
      },
      partnerAsignado: {
        nombre: participante.partnerNombre || item.partnerAsignado?.nombre || 'Partner por Asignar',
        rol: 'partner', // NUNCA sombra
        confirmado: !!participante.partnerNombre
      }
    });
  }

  return tresRIs;
}

/**
 * Procesa la transición de ciclo y refresco de metas en Cloud Firestore.
 */
export async function refreshMetasCicloGraduacion({
  sede = 'TODAS',
  cicloIdOrigen = 'C1',
  cicloIdDestino = 'C2',
  dryRun = false,
  db = null
} = {}) {
  const firestore = db || getAdminDb();
  const timestamp = new Date().toISOString();

  const resultado = {
    operacion: 'REFRESCO_METAS_CICLOS',
    sede,
    cicloIdOrigen,
    cicloIdDestino,
    dryRun,
    timestamp,
    participantesProcesados: 0,
    participantesActualizados: 0,
    participantesOmitidosDemo: 0,
    lotesEjecutados: 0,
    detalles: [],
    errores: []
  };

  if (!firestore) {
    resultado.errores.push('No se pudo inicializar Cloud Firestore. Verifique credenciales.');
    return resultado;
  }

  try {
    let query = firestore.collection('nodus_futuros_imposibles')
      .where('cycleId', '==', cicloIdOrigen)
      .where('activo', '==', true);

    if (sede && sede !== 'TODAS' && sede !== 'GLOBAL') {
      const sedeNorm = normalizarSede(sede);
      query = query.where('sede', '==', sedeNorm);
    }

    const snapshot = await query.get();
    resultado.participantesProcesados = snapshot.size;

    if (snapshot.empty) {
      resultado.mensaje = `No se encontraron documentos en ${cicloIdOrigen} activos para la sede seleccionada.`;
      return resultado;
    }

    const docsParaActualizar = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const equipoStr = String(data.equipo || data.numEquipo || '').toLowerCase();

      // Omitir cuentas demo o equipos de prueba
      if (equipoStr.includes('demo') || equipoStr.includes('test') || equipoStr === '1000' || equipoStr === '999') {
        resultado.participantesOmitidosDemo++;
        return;
      }

      const nuevos3RIs = estructurar3RIsTransicion(data.fis || data.resultados_imposibles, {
        partnerNombre: data.partnerNombre || data.partnerAsignado?.nombre
      });

      const historialPrevio = Array.isArray(data.historialCiclos) ? data.historialCiclos : [];
      const nuevoHistorial = [
        ...historialPrevio,
        {
          fechaTransicion: timestamp,
          origen: cicloIdOrigen,
          destino: cicloIdDestino,
          sede: data.sede || normalizarSede(sede),
          motivo: 'TRANSICION_CICLO_GRADUACION',
          metasAnteriores: (data.fis || []).length
        }
      ];

      const patch = {
        cycleId: cicloIdDestino,
        cicloAnterior: cicloIdOrigen,
        fis: nuevos3RIs,
        resultados_imposibles: nuevos3RIs,
        estadoAprobacion: 'EN_REVISION_PARTNER',
        futurosImposiblesAlert: true, // Alerta al partner y coordinador para auditar
        historialCiclos: nuevoHistorial,
        updatedAt: timestamp,
        ultimoRefrescoDaemon: timestamp
      };

      docsParaActualizar.push({ docId, ref: docSnap.ref, patch, nombre: data.nombre || docId });
    });

    resultado.participantesActualizados = docsParaActualizar.length;

    if (dryRun) {
      resultado.mensaje = `Modo DRY-RUN: Se simularon ${docsParaActualizar.length} actualizaciones en lote. Cero escrituras realizadas.`;
      resultado.detalles = docsParaActualizar.slice(0, 5).map(d => ({
        id: d.docId,
        nombre: d.nombre,
        nuevoCiclo: cicloIdDestino
      }));
      return resultado;
    }

    // Ejecución en batches de máximo 400 docs (límite Firestore: 500)
    const BATCH_SIZE = 400;
    for (let i = 0; i < docsParaActualizar.length; i += BATCH_SIZE) {
      const batch = firestore.batch();
      const chunk = docsParaActualizar.slice(i, i + BATCH_SIZE);

      for (const item of chunk) {
        batch.set(item.ref, item.patch, { merge: true });
      }

      await batch.commit();
      resultado.lotesEjecutados++;
    }

    // Invalidación de caché en el cliente
    await firestore.collection('system_metadata').doc('cache_invalidation').set({
      key: 'cpsl_managers_data_v3',
      invalidatedAt: timestamp,
      motivo: `TRANSICION_${cicloIdOrigen}_A_${cicloIdDestino}`,
      sedeAfectada: sede,
      totalAfectados: docsParaActualizar.length
    }, { merge: true });

    // Registro inmutable en audit_logs
    await firestore.collection('audit_logs').add({
      tipoAccion: 'REFRESCO_METAS_CICLOS_GRADUACION',
      sede: normalizarSede(sede),
      cicloOrigen: cicloIdOrigen,
      cicloDestino: cicloIdDestino,
      documentosAfectados: docsParaActualizar.length,
      timestamp,
      ejecutadoPor: 'Daemon_refreshMetasCiclosDaemon',
      cacheKeyInvalidada: 'cpsl_managers_data_v3'
    });

    resultado.mensaje = `Transición exitosa: ${docsParaActualizar.length} participantes actualizados de ${cicloIdOrigen} a ${cicloIdDestino} en ${resultado.lotesEjecutados} lotes.`;
  } catch (error) {
    console.error('❌ Error ejecutando refreshMetasCiclosDaemon:', error);
    resultado.errores.push(error.message);
  }

  return resultado;
}

// Invocación directa CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const cleanArgs = args.filter(a => a !== '--dry-run');

  const sede = cleanArgs[0] || 'TODAS';
  const cicloOrigen = cleanArgs[1] || 'C1';
  const cicloDestino = cleanArgs[2] || 'C2';

  console.log(`🚀 Iniciando Daemon de Refresco de Metas en Juego...`);
  console.log(`   Sede: ${sede} | Origen: ${cicloOrigen} -> Destino: ${cicloDestino} | Dry-Run: ${dryRun}`);

  refreshMetasCicloGraduacion({ sede, cicloIdOrigen: cicloOrigen, cicloIdDestino: cicloDestino, dryRun })
    .then(res => {
      console.log('✅ Resultado:', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error fatal:', err);
      process.exit(1);
    });
}
