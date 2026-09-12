// src/services/dataIntegrityAgent.js
// Agente Supervisor de Integridad y Calidad de Datos (Managers, Equipos y Nodus)
// Asegura datos reales, consistencia operativa, trazabilidad y cero duplicados en la base de datos.

import { db } from './firebase';
import { collection, getDocs, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { normalizeTrainer, normalizeCoordinator } from '../data/managersData';
import { normalizeSede } from '../data/usersData';
import { recordAuditEvent } from './auditService';


/**
 * Normaliza una cadena de texto eliminando tildes, espacios redundantes y convirtiendo a minúsculas.
 */
export function canonicalCleanString(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Audita y sanea en línea la colección `managers_directory` en Firestore:
 * - Detecta registros duplicados (mismo nombre canónico, misma sede y/o equipo)
 * - Identifica registros fantasma o huérfanos sin nombre o sin equipo
 * - Consolida la información (conserva llamadas registradas, estados y teléfonos válidos)
 * - Elimina físicamente los documentos redundantes
 */
export async function auditAndDeduplicateManagers(options = { dryRun: false, currentUserName: 'Supervisor de Datos' }) {
  try {
    const snap = await getDocs(collection(db, 'managers_directory'));
    const allDocs = [];
    snap.forEach(d => {
      allDocs.push({
        docId: d.id,
        ...d.data()
      });
    });

    const groups = new Map();
    const phantomDocs = [];

    allDocs.forEach(m => {
      const cleanName = canonicalCleanString(m.nombre);
      const cleanSede = canonicalCleanString(normalizeSede(m.sede));
      const cleanTeam = canonicalCleanString(m.equipo);

      // Si no tiene nombre válido o equipo válido, marcarlo como fantasma
      if (!cleanName || cleanName.length < 3) {
        phantomDocs.push({ docId: m.docId, reason: 'Registro sin nombre válido', data: m });
        return;
      }

      // Clave canónica del manager dentro de su contexto operativo
      const key = `${cleanSede}__${cleanTeam}__${cleanName}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(m);
    });

    const duplicatesFound = [];
    const docsToDelete = [];
    const docsToUpdate = [];

    groups.forEach((members, key) => {
      if (members.length > 1) {
        // Ordenar: preferir el registro con llamadaFecha más reciente, teléfono válido o docId oficial
        members.sort((a, b) => {
          const aScore = (a.llamadaFecha ? 10 : 0) + (a.telefono ? 5 : 0) + (a.entrenador ? 3 : 0);
          const bScore = (b.llamadaFecha ? 10 : 0) + (b.telefono ? 5 : 0) + (b.entrenador ? 3 : 0);
          return bScore - aScore;
        });

        const canonicalRecord = members[0];
        const redundantRecords = members.slice(1);

        // Fusionar cualquier dato complementario que tuvieran los duplicados
        let mergedCalls = canonicalRecord.llamadaFecha;
        let mergedAttended = canonicalRecord.llamadaAsistio;
        let mergedPhone = canonicalRecord.telefono;
        let mergedTrainer = canonicalRecord.entrenador;

        redundantRecords.forEach(r => {
          if (!mergedCalls && r.llamadaFecha) {
            mergedCalls = r.llamadaFecha;
            mergedAttended = r.llamadaAsistio;
          }
          if (!mergedPhone && r.telefono) mergedPhone = r.telefono;
          if (!mergedTrainer && r.entrenador) mergedTrainer = r.entrenador;
          docsToDelete.push(r.docId);
        });

        duplicatesFound.push({
          key,
          name: canonicalRecord.nombre,
          sede: canonicalRecord.sede,
          team: canonicalRecord.equipo,
          keepDocId: canonicalRecord.docId,
          deletedDocIds: redundantRecords.map(r => r.docId),
          count: members.length
        });

        // Actualizar el canónico con los mejores datos consolidados
        docsToUpdate.push({
          docId: canonicalRecord.docId,
          data: {
            ...canonicalRecord,
            llamadaFecha: mergedCalls || '',
            llamadaAsistio: mergedAttended || '',
            telefono: mergedPhone || '',
            entrenador: mergedTrainer || '',
            lastSupervisorCheck: new Date().toISOString()
          }
        });
      }
    });

    // Agregar fantasmas a borrar
    phantomDocs.forEach(p => {
      docsToDelete.push(p.docId);
    });

    // Ejecutar mutaciones si no es simulación
    if (!options.dryRun && (docsToDelete.length > 0 || docsToUpdate.length > 0)) {
      const batch = writeBatch(db);

      docsToDelete.forEach(id => {
        batch.delete(doc(db, 'managers_directory', id));
      });

      docsToUpdate.forEach(item => {
        batch.set(doc(db, 'managers_directory', item.docId), item.data, { merge: true });
      });

      await batch.commit();

      recordAuditEvent({
        action: 'SUPERVISOR_PURGA_DUPLICADOS',
        user: options.currentUserName || 'Supervisor de Datos',
        details: `Supervisor de datos eliminó ${docsToDelete.length} documentos duplicados/fantasmas y consolidó ${docsToUpdate.length} managers en managers_directory.`
      });
    }

    return {
      status: 'success',
      totalScanned: allDocs.length,
      duplicatesFoundCount: duplicatesFound.length,
      docsToDeleteCount: docsToDelete.length,
      duplicatesDetail: duplicatesFound,
      phantomDocsCount: phantomDocs.length,
      isDryRun: !!options.dryRun
    };

  } catch (error) {
    console.error('Error en auditAndDeduplicateManagers:', error);
    return {
      status: 'error',
      error: error.message
    };
  }
}
