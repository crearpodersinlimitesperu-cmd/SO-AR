import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUnverifiedFallbackReport } from './nodusUserAccessReport.js';

test('static user-access fallback never claims active status or current coverage', () => {
  const report = buildUnverifiedFallbackReport([
    { Estado: 'Activo', 'Últ. conexión': '2026-01-01' },
    { Estado: 'Activo' },
  ]);
  assert.equal(report.accountCount, 2);
  assert.equal(report.coverage, 'unknown');
  assert.equal(report.publishedAt, null);
  assert.equal(report.accountsWithLastConnection, null);
  assert.equal(report.lastConnectionColumn, null);
  assert.equal(report.statusColumn, null);
  assert.deepEqual(report.statusCounts, {});
  assert.match(report.source, /no verificadas/);
});
