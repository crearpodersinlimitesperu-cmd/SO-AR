import test from 'node:test';
import assert from 'node:assert/strict';
import { extractNodusMetrics, findFreshNodusMetrics, selectCoordinatorSnapshot } from './nodusMetricsModel.js';
import { readFileSync } from 'node:fs';
import { snapshotFreshness } from '../utils/nodusIntegrity.js';

test('a remote snapshot never promotes historical rows or their roles into its current source', () => {
  const remote = { timestamp: '2026-10-13T20:00:00Z', coordinadores: [
    { id: 'remote', email: 'current@example.test', sede: 'Lima', role: 'coord_c2', equipos: [{ equipo: '31' }] },
  ] };
  const fallback = { timestamp: '2026-01-01T00:00:00Z', coordinadores: [
    { id: 'historical', email: 'old@example.test', sede: 'Quito', role: 'coord_c1' },
    { id: 'remote', email: 'current@example.test', role: 'gerente' },
  ] };
  const selected = selectCoordinatorSnapshot(remote, fallback);
  assert.deepEqual(selected, { coordinadores: remote.coordinadores, source: 'nodus', timestamp: remote.timestamp });
  assert.equal(selected.coordinadores[0].role, 'coord_c2');
  assert.deepEqual(selected.coordinadores[0].equipos, [{ equipo: '31' }]);
  assert.equal(selected.coordinadores.some(row => row.id === 'historical'), false);
});

test('an explicit empty remote list remains empty instead of restoring historical assignments', () => {
  assert.deepEqual(selectCoordinatorSnapshot({ coordinadores: [], timestamp: '2026-10-13T20:00:00Z' },
    { coordinadores: [{ id: 'historical' }] }), {
    coordinadores: [], source: 'nodus', timestamp: '2026-10-13T20:00:00Z',
  });
});

test('missing or invalid remote lists keep fallback provenance and never borrow a remote timestamp', () => {
  const fallback = { coordinadores: [{ id: 'historical' }], timestamp: '2026-01-01T00:00:00Z' };
  for (const remote of [null, {}, { coordinadores: {}, timestamp: '2026-10-13T20:00:00Z' }]) {
    assert.deepEqual(selectCoordinatorSnapshot(remote, fallback), {
      coordinadores: fallback.coordinadores, source: 'fallback', timestamp: fallback.timestamp,
    });
  }
  assert.deepEqual(selectCoordinatorSnapshot({}, {}), { coordinadores: [], source: 'unavailable', timestamp: null });
  assert.equal(selectCoordinatorSnapshot({ coordinadores: [] }, fallback).timestamp, null);
});

test('Portfolio binds its rows and task freshness to the same selected source', () => {
  const board = readFileSync(new URL('../pages/PortfolioBoard.jsx', import.meta.url), 'utf8');
  assert.match(board, /selectCoordinatorSnapshot\(data, nodusFallbackData\)/);
  assert.match(board, /setCoordinadoresRaw\(coordinatorSource\.coordinadores\)/);
  assert.match(board, /source: coordinatorSource\.source, timestamp: coordinatorSource\.timestamp/);
  assert.doesNotMatch(board, /fallbackList\.forEach|mergedCoords/);
  assert.match(board, /coordinatorSnapshot\.source === 'nodus' && isSnapshotFresh/);
  assert.match(board, /if \(coordinatorSnapshot\.source !== 'nodus' \|\| !isSnapshotFresh\(coordinatorSnapshot\.timestamp\)\) return/);
});

test('missing metrics stay missing and explicit zero stays zero', () => {
  const metrics = extractNodusMetrics({ asignados: 0, coberturaPct: 0, tasaEfectividad: 0, equipos: [] });
  assert.equal(metrics.asignados, 0);
  assert.equal(metrics.contactabilidad, 0);
  assert.equal(metrics.conversion, 0);
  assert.equal(metrics.confirmados, null);
  assert.equal(metrics.llamadas, null);
});

test('percentage metrics are only exposed when Nodus supplies them explicitly', () => {
  const metrics = extractNodusMetrics({ asignados: 10, gestiones: 5, confirmados: 2, equipos: [] });
  assert.equal(metrics.contactabilidad, null);
  assert.equal(metrics.contactabilidadSource, 'missing');
  assert.equal(metrics.conversion, null);
  assert.equal(metrics.conversionSource, 'missing');
  const missing = extractNodusMetrics({ gestiones: 5, equipos: [] });
  assert.equal(missing.contactabilidad, null);
  assert.equal(missing.conversion, null);
});

test('explicit Nodus percentages above target are not silently clamped', () => {
  const metrics = extractNodusMetrics({ coberturaPct: 183, tasaEfectividad: 125 });
  assert.equal(metrics.contactabilidad, 183);
  assert.equal(metrics.conversion, 125);
});

test('boolean and non-numeric metric values are not converted to numeric zero', () => {
  const metrics = extractNodusMetrics({ asignados: false, confirmados: [], equipos: [] });
  assert.equal(metrics.asignados, null);
  assert.equal(metrics.confirmados, null);
});

test('a source must be fresh and match exactly one coordinator by email or full name', () => {
  const now = Date.parse('2026-10-12T17:00:00Z');
  const snapshot = { timestamp: new Date(now - 30_000).toISOString(), coordinadores: [
    { email: 'coord@example.test', nombreCompleto: 'Synthetic Coordinator', asignados: 4, coberturaPct: 25 },
  ] };
  assert.equal(findFreshNodusMetrics(snapshot, { email: 'coord@example.test' }, now).asignados, 4);
  assert.equal(findFreshNodusMetrics(snapshot, { nombre: 'synthetic   coordinator' }, now).asignados, 4);
  assert.equal(findFreshNodusMetrics(snapshot, { nombre: 'Synthetic' }, now), null);
  assert.equal(findFreshNodusMetrics({ ...snapshot, coordinadores: [...snapshot.coordinadores, ...snapshot.coordinadores] },
    { email: 'coord@example.test' }, now), null);
  assert.equal(findFreshNodusMetrics({ ...snapshot, timestamp: new Date(now - 120 * 60_000).toISOString() },
    { email: 'coord@example.test' }, now), null);
});

test('snapshot freshness becomes stale at exactly 120 minutes and rejects missing time', () => {
  const now = Date.parse('2026-10-12T17:00:00Z');
  assert.equal(snapshotFreshness(new Date(now - 119 * 60_000).toISOString(), now).stale, false);
  assert.equal(snapshotFreshness(new Date(now - 120 * 60_000).toISOString(), now).stale, true);
  assert.equal(snapshotFreshness(null, now).stale, true);
});
