import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeReadiness } from '../auditImoCampaignReadiness.mjs';

test('readiness counts exact sede/team and does not expose participant fields or authorize sharing', () => {
  const mission = { id: 'synthetic', sede: 'Lima', equipo: 'EQUIPO 32',
    imoNombre: 'Synthetic Inviter', c1SourceUpdatedAt: '2026-10-12T01:00:00Z',
    enrolados: [
      { id: 'a', nombre: 'Synthetic Pending', asistenciaC1: false },
      { id: 'b', nombre: 'Synthetic Trained', asistenciaC1: true },
      { id: 'c', nombre: 'Synthetic Unknown' },
    ] };
  const events = [{ sede: 'Lima', team: 32, name: 'CAPITULO UNO', date: '2026-10-23', source: 'Calendario oficial' }];
  const summary = summarizeReadiness([mission, { ...mission, id: 'other', sede: 'Quito' },
    { ...mission, id: 'previous', equipo: 'EQUIPO 31' }], events, [], 'Lima', 32);
  assert.equal(summary.sourceMissions, 1);
  assert.deepEqual(summary.statuses, { eligible: 1, already_attended: 1, unverified: 1 });
  assert.equal(summary.candidateImos, 1);
  assert.equal(summary.candidateEnrollees, 1);
  assert.equal(summary.sharingAuthorized, false);
  assert.equal(summary.c1Dates[0].date, '2026-10-23');
  assert.ok(summary.blockers.includes('unverified_c1_evidence'));
  assert.doesNotMatch(JSON.stringify(summary), /Synthetic|telefono|nombre|synthetic/);
});

test('empty projections and missing calendar are blockers, not a ready campaign', () => {
  const summary = summarizeReadiness([], [], [], 'Lima', 32);
  assert.equal(summary.sharingAuthorized, false);
  assert.ok(summary.blockers.includes('no_source_missions'));
  assert.ok(summary.blockers.includes('no_eligible_candidates'));
  assert.ok(summary.blockers.includes('missing_or_ambiguous_c1_date'));
});
