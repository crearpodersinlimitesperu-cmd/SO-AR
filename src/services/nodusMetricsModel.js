import { snapshotFreshness } from '../utils/nodusIntegrity.js';

export function selectCoordinatorSnapshot(remote, fallback) {
  if (Array.isArray(remote?.coordinadores)) {
    return {
      coordinadores: remote.coordinadores,
      source: 'nodus',
      timestamp: remote.timestamp || remote.updatedAt || null,
    };
  }
  if (Array.isArray(fallback?.coordinadores)) {
    return {
      coordinadores: fallback.coordinadores,
      source: 'fallback',
      timestamp: fallback.timestamp || null,
    };
  }
  return { coordinadores: [], source: 'unavailable', timestamp: null };
}

const count = (...values) => {
  const value = values.find(candidate => candidate !== undefined && candidate !== null && candidate !== '');
  if (value === undefined) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

const sumIfComplete = (rows, field) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const values = rows.map(row => count(row?.[field]));
  return values.every(value => value !== null) ? values.reduce((sum, value) => sum + value, 0) : null;
};

export function extractNodusMetrics(coord) {
  if (!coord || typeof coord !== 'object') return null;
  const states = coord.estados || {};
  const teams = Array.isArray(coord.equipos) ? coord.equipos : [];
  const asignados = count(coord.asignadosTotal, coord.asignados, states.asignados);
  const confirmados = count(coord.confirmadosTotal, coord.confirmados, states.confirmado, states.confirmados)
    ?? sumIfComplete(teams, 'confirmado');
  const porConfirmar = count(states.porConfirmar, coord.porConfirmar) ?? sumIfComplete(teams, 'porConfirmar');
  const noContesta = count(states.noContesta, coord.noContesta) ?? sumIfComplete(teams, 'noContesta');
  const noInteresa = count(states.noInteresa, coord.noInteresa) ?? sumIfComplete(teams, 'noInteresa');
  const llamadas = count(coord.gestionesTotal, coord.gestiones, states.llamadas) ?? sumIfComplete(teams, 'llamadas');
  const asistieron = count(coord.sentadosTotal, coord.asistieron, coord.sentadosC1) ?? sumIfComplete(teams, 'asistieron');
  const contactabilidad = count(coord.coberturaPct);
  const conversion = count(coord.tasaEfectividad);

  return {
    asignados, confirmados, porConfirmar, noContesta, noInteresa, llamadas, asistieron,
    contactabilidad, contactabilidadSource: contactabilidad === null ? 'missing' : 'nodus',
    conversion, conversionSource: conversion === null ? 'missing' : 'nodus',
    sede: typeof coord.sede === 'string' ? coord.sede : null,
    nombre: typeof (coord.nombre || coord.name) === 'string' ? (coord.nombre || coord.name) : null,
    equipos: teams,
  };
}

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase().replace(/\s+/g, ' ').trim();

export function findFreshNodusMetrics(snapshot, person, now = Date.now()) {
  if (!snapshot || !person || !Array.isArray(snapshot.coordinadores)) return null;
  const timestamp = snapshot.extractedAt || snapshot.syncedAt || snapshot.timestamp || snapshot.updatedAt || null;
  const freshness = snapshotFreshness(timestamp, now);
  if (freshness.stale) return null;
  const email = normalize(person.email);
  const name = normalize(person.name || person.nombre);
  const matches = snapshot.coordinadores.filter(coord => {
    if (!coord || typeof coord !== 'object') return false;
    if (email) return normalize(coord.email) === email;
    if (!name) return false;
    return normalize(coord.nombreCompleto || coord.nombre || coord.name) === name;
  });
  if (matches.length !== 1) return null;
  const metrics = extractNodusMetrics(matches[0]);
  return metrics ? { ...metrics, timestamp, freshness: freshness.label } : null;
}
