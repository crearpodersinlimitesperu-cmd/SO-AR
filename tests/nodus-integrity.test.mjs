import test from 'node:test';
import assert from 'node:assert/strict';
import { fallbackAttendance, participantMetrics, recordedPhase, snapshotFreshness, MISSING_NODUS } from '../src/utils/nodusIntegrity.js';

test('confirmation does not establish attendance, missing desertion is not desertion', () => {
  assert.equal(fallbackAttendance({llamada1:'Confirmado',asistencia:'—',desertor:'—'}), 'CONFIRMADO');
  assert.equal(fallbackAttendance({asistencia:'No asistió',desertor:'—'}), MISSING_NODUS);
  assert.equal(fallbackAttendance({asistencia:'Asistió'}), 'SENTADO');
  assert.equal(fallbackAttendance({desertor:'Desertor'}), 'DESERTOR');
});
test('person counts exclude staff, team aggregates and special teams; negative status is not attendance', () => {
  assert.deepEqual(participantMetrics([
    {estadoC1:'SENTADO',equipo:'EQUIPO 31'}, {estadoC1:'NO SENTADO'},
    {estadoC1:'SENTADO',isManager:true}, {estadoC1:'SENTADO',isNodusTeam:true},
    {estadoC1:'SENTADO',equipo:'EQUIPO 1000 — QUITO'},
    {estadoC1:'PENDIENTE',equipo:'EQUIPO 10001'}
  ]), {total:3,seated:1,pending:1});
});
test('phase is explicit and independent of sede or team number', () => {
  assert.equal(recordedPhase({equipo:'EQUIPO 129',sede:'Quito'}),null);
  assert.equal(recordedPhase({equipo:'EQUIPO 32',fase:'Capítulo Dos'}),'C2');
  assert.equal(recordedPhase({equipo:'EQUIPO 129',capitulo:'C1'}),'C1');
});
test('stale, missing and invalid source timestamps cannot be reported as recent', () => {
  const now=Date.parse('2026-10-08T23:00:00Z');
  for (const stamp of [undefined,'bad','2026-10-09T23:00:00Z','2026-09-28T23:00:00Z']) assert.equal(snapshotFreshness(stamp,now).stale,true);
  assert.deepEqual(snapshotFreshness('2026-10-08T22:00:00Z',now),{stale:false,label:'Hace 1 h 0 m'});
});
