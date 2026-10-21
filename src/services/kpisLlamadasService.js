import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import defaultKpisData from '../data/kpisEntrenadoresData.json';

/**
 * Suscribe a los cambios en tiempo real del resumen de KPIs de Entrenadores de Llamadas.
 * @param {Function} callback - Callback con los datos actualizados { totales, kpis, metadata }
 * @returns {Function} Unsubscribe function
 */
export function subscribeToKpisSummary(callback) {
  callback(defaultKpisData, { status: 'loading', source: 'bundled' });

  try {
    const docRef = doc(db, 'kpis_entrenadores_llamadas', '_resumen');
    const unsubscribe = onSnapshot(docRef, { includeMetadataChanges: true }, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback({
          metadata: data.metadata || defaultKpisData.metadata,
          totales: data.totales || defaultKpisData.totales,
          kpis: data.kpis || defaultKpisData.kpis,
          llamadosDetalle: data.llamadosDetalle || defaultKpisData.llamadosDetalle,
          managersSheet1: data.managersSheet1 || defaultKpisData.managersSheet1 || [],
        }, {
          status: docSnap.metadata.fromCache ? 'stale'
            : Array.isArray(data.llamadosDetalle) && Array.isArray(data.managersSheet1) ? 'ready'
              : 'partial',
        });
      } else {
        callback(defaultKpisData, {
          status: docSnap.metadata.fromCache ? 'stale' : 'empty',
          source: 'bundled',
        });
      }
    }, (error) => {
      console.error('Error leyendo resumen de KPIs de llamadas:', error);
      callback(defaultKpisData, { status: 'error', source: 'bundled', error });
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Error inicializando suscripción a KPIs:', err);
    callback(defaultKpisData, { status: 'error', source: 'bundled', error: err });
    return () => {};
  }
}

/**
 * Obtiene o suscribe al detalle de un entrenador específico con su lista de managers.
 * @param {string} trainerSlug 
 * @param {Function} callback 
 */
export function subscribeToTrainerDetail(trainerSlug, callback) {
  if (!trainerSlug) {
    callback({ managersList: [], managersCount: 0 }, { status: 'empty' });
    return () => {};
  }

  try {
    const docRef = doc(db, 'kpis_entrenadores_llamadas', trainerSlug);
    const unsubscribe = onSnapshot(docRef, { includeMetadataChanges: true }, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data(), { status: docSnap.metadata.fromCache ? 'stale' : 'ready' });
      } else {
        // Fallback a los datos locales
        const fallbackList = (defaultKpisData.llamadosDetalle || []).filter(
          m => slugify(m.entrenador) === trainerSlug
        );
        const kpiItem = (defaultKpisData.kpis || []).find(
          k => slugify(k.entrenador) === trainerSlug
        );
        callback({
          ...(kpiItem || {}),
          managersList: fallbackList,
          managersCount: fallbackList.length,
        }, { status: docSnap.metadata.fromCache ? 'stale' : 'empty', source: 'bundled' });
      }
    }, (err) => {
      console.error('Error leyendo el detalle de entrenador:', trainerSlug, err);
      const fallbackList = (defaultKpisData.llamadosDetalle || []).filter(
        m => slugify(m.entrenador) === trainerSlug
      );
      const kpiItem = (defaultKpisData.kpis || []).find(
        k => slugify(k.entrenador) === trainerSlug
      );
      callback({
        ...(kpiItem || {}),
        managersList: fallbackList,
        managersCount: fallbackList.length,
      }, { status: 'error', source: 'bundled', error: err });
    });

    return unsubscribe;
  } catch (e) {
    console.error('Error suscribiendo a detalle de entrenador:', e);
    callback({ managersList: [], managersCount: 0 }, { status: 'error', error: e });
    return () => {};
  }
}

export function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sin-nombre';
}
