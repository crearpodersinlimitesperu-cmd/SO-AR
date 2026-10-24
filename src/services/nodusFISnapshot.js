import { equipoKeyDe, normalizarTexto } from './nodusFIAgent.js';

import { snapshotFreshness } from '../utils/nodusIntegrity.js';

// Decide qué universo FI muestra el módulo y cómo se rotula su origen.
const hasPfd = (list) => list.filter((p) => p?.asistioPFD === true);

export function resolveFISource(payload, fallback = [], now = Date.now()) {
  const participantes = Array.isArray(payload?.participantes) ? payload.participantes : [];
  const universo = hasPfd(participantes);
  const syncedAt = payload?.extractedAt || payload?.syncedAt || payload?.timestamp || payload?.updatedAt || null;
  const freshness = snapshotFreshness(syncedAt, now);
  if (universo.length > 0) {
    const sedes = new Set(universo.map((p) => p.sede).filter(Boolean)).size;
    const partial = payload?.completeness === 'partial';
    const stale = freshness.stale;
    return {
      participantes,
      sourceState: {
        status: stale ? 'stale' : partial ? 'partial' : 'live',
        label: stale ? 'NODUS CREAR · snapshot antiguo o sin fecha verificable'
          : partial ? 'NODUS CREAR · lectura PARCIAL' : 'NODUS CREAR · fuente en vivo',
        detail: `${universo.length} participantes con PFD confirmado en ${sedes} sede(s). ${freshness.label}.${partial && payload?.completenessReasons?.length ? ` ${payload.completenessReasons.join(' ')}` : ''}`,
        syncedAt
      }
    };
  }
  return {
    participantes: fallback,
    sourceState: {
      status: fallback.length > 0 ? 'fallback' : 'unavailable',
      label: fallback.length > 0
        ? 'RESPALDO ESTÁTICO PARCIAL · no es NODUS en vivo'
        : 'SIN PUBLICACIÓN VERIFICABLE DE NODUS · cero datos inventados',
      detail: fallback.length > 0
        ? `No hay participantes PFD confirmados en una publicación verificable de NODUS; se muestra un respaldo estático de ${fallback.length} participantes que NO incluye todas las sedes ni los FI reales.${syncedAt ? ` Última marca disponible: ${freshness.label}.` : ' Fecha de sincronización desconocida.'}`
        : `No hay participantes con PFD confirmado en una publicación verificable de NODUS.${syncedAt ? ` Última marca disponible: ${freshness.label}.` : ' Fecha de sincronización desconocida.'} No se inventan ni sustituyen registros.`,
      syncedAt
    }
  };
}

const GLOBAL_KEYS = ['', 'global', 'sede global', 'todas', 'todos', 'all'];

// Opciones del selector de equipo: solo equipos observados en la sede elegida;
// en GLOBAL se etiquetan con su sede y se identifican por sede+equipo.
export function opcionesEquipo(participantes = [], sede = 'GLOBAL') {
  const global = GLOBAL_KEYS.includes(normalizarTexto(sede));
  const sedeNorm = normalizarTexto(sede);
  const map = new Map();
  for (const p of participantes) {
    if (!p?.equipo) continue;
    // Directiva de Gobernanza: Aislar Equipo 1000 de los selectores operativos
    const eqNorm = (p.equipo || '').toLowerCase();
    if (eqNorm.includes('equipo 1000') || eqNorm.includes('1000')) continue;
    if (!global && !normalizarTexto(p.sede).includes(sedeNorm)) continue;
    const value = equipoKeyDe(p);
    if (!map.has(value)) map.set(value, { value, equipo: p.equipo.trim(), sede: p.sede || 'Sin sede' });
  }
  const SEDE_ORDER = {
    'lima': 1,
    'quito': 2,
    'guayaquil': 3,
    'cuenca': 4,
    'medellin': 5,
    'medellín': 5,
    'cdmx': 6
  };
  const num = (t) => parseInt(t.replace(/\D/g, ''), 10) || 0;
  const list = [...map.values()]
    .sort((a, b) => {
      const aIsSinEquipo = (a.equipo || '').toLowerCase().includes('sin equipo');
      const bIsSinEquipo = (b.equipo || '').toLowerCase().includes('sin equipo');
      if (aIsSinEquipo && !bIsSinEquipo) return 1;
      if (!aIsSinEquipo && bIsSinEquipo) return -1;
      const orderA = SEDE_ORDER[normalizarTexto(a.sede)] || 99;
      const orderB = SEDE_ORDER[normalizarTexto(b.sede)] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return num(a.equipo) - num(b.equipo) || a.equipo.localeCompare(b.equipo);
    })
    .map((o) => ({ value: o.value, label: global ? `${o.sede} · ${o.equipo}` : o.equipo }));
  return [{ value: 'Todos', label: 'Todos' }, ...list];
}
