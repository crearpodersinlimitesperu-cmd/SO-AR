import test from 'node:test';
import assert from 'node:assert/strict';
import { extractNodusMetrics, findFreshNodusMetrics } from './nodusMetricsModel.js';
import { snapshotFreshness } from '../utils/nodusIntegrity.js';

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
