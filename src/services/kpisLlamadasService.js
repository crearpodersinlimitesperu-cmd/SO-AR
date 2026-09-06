import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import defaultKpisData from '../data/kpisEntrenadoresData.json';

/**
 * Suscribe a los cambios en tiempo real del resumen de KPIs de Entrenadores de Llamadas.
 * @param {Function} callback - Callback con los datos actualizados { totales, kpis, metadata }
 * @returns {Function} Unsubscribe function
 */
export function subscribeToKpisSummary(callback) {
  // Inicialmente proveer datos precargados para visualización instantánea (0 ms)
  callback(defaultKpisData);

  try {
    const docRef = doc(db, 'kpis_entrenadores_llamadas', '_resumen');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback({
          metadata: data.metadata || defaultKpisData.metadata,
          totales: data.totales || defaultKpisData.totales,
          kpis: data.kpis || defaultKpisData.kpis,
          llamadosDetalle: defaultKpisData.llamadosDetalle,
        });
      }
    }, (error) => {
      console.warn('Nota: Usando datos locales de KPIs (Firestore offline o reglas restringidas):', error);
      callback(defaultKpisData);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Error inicializando suscripción a KPIs:', err);
    return () => {};
  }
}

/**
 * Obtiene o suscribe al detalle de un entrenador específico con su lista de managers.
 * @param {string} trainerSlug 
 * @param {Function} callback 
 */
export function subscribeToTrainerDetail(trainerSlug, callback) {
  if (!trainerSlug) return () => {};

  try {
    const docRef = doc(db, 'kpis_entrenadores_llamadas', trainerSlug);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
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
        });
      }
    }, (err) => {
      console.warn('Fallback local para entrenador:', trainerSlug, err);
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
      });
    });

    return unsubscribe;
  } catch (e) {
    console.error('Error suscribiendo a detalle de entrenador:', e);
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
