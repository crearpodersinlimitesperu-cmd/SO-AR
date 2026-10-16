import test from 'node:test';
import assert from 'node:assert/strict';
import { latestTeamsBySede, buildOperationalReview } from './operationalReview.js';
import { REPORT_SEDES } from './nodusReportModel.js';
import { operationalRole } from './nodusKpiDirectory.js';
import { USERS_TO_IMPORT } from '../data/usersToImport.js';

const now = Date.parse('2026-10-17T00:00:00Z');
const event = (sede, equipo, fecha_inicio, nombre = 'C1') => ({ sede, equipo, fecha_inicio, nombre });
const source = (sede, team, stage, participants = []) => ({
  equipoNombre: `EQUIPO ${team} - ${sede} ${stage}`,
  extractionComplete: true, totalParticipantes: participants.length, participantes: participants
});

test('selects six unique teams for EACH sede by dated C1 chronology, not ID magnitude', () => {
  const events = REPORT_SEDES.flatMap(sede => Array.from({ length: 8 }, (_, i) =>
    event(sede, i === 7 ? 1 : i + 10, `2026-10-${String(i + 1).padStart(2, '0')}`)));
  events.push(event('Lima', 1, '2026-10-15', 'C2'));
  events.push(event('Lima', 1, '2026-10-09')); // Duplicate cannot move cohort chronology.
  events.push(event('Lima', 99, '2026-12-01'));
  const groups = latestTeamsBySede(events, now);
  assert.equal(groups.length, 6);
  assert.equal(groups.reduce((sum, group) => sum + group.teams.length, 0), 36);
  for (const group of groups) {
    assert.equal(group.teams[0].team, '1');
    assert.equal(group.teams[0].start, '2026-10-08');
    assert.equal(group.teams.at(-1).start, '2026-10-03');
    assert.equal(group.missingCalendarTeams, 0);
  }
});

test('excludes invalid dates, undated teams, ambiguous sede, special team and future local days', () => {
  const events = [
    event('Lima', 1, '2026-02-31'), event('Lima', 2, '2026-13-01'),
    event('Lima', 3, ''), event('Lima', 1000, '2026-10-01'),
    event('', 123, '2026-10-01'), event('Lima', 4, '2026-10-17'),
    event('México', 4, '2026-10-16')
  ];
  const groups = latestTeamsBySede(events, now);
  assert.equal(groups.find(group => group.sede === 'Lima').teams.length, 0);
  assert.equal(groups.find(group => group.sede === 'Lima').invalidEvents, 4);
  assert.equal(groups.find(group => group.sede === 'México').teams[0].team, '4');
  assert.equal(groups.find(group => group.sede === 'Quito').missingCalendarTeams, 6);
});

test('shows missing, summary, partial, unknown and duplicate evidence as null, never false zeros', () => {
  const events = [event('Lima', 1, '2026-10-01')];
  const review = rows => buildOperationalReview(events, { timestamp: new Date(now).toISOString(), equiposReporte: rows }, now)
    .sedes.find(group => group.sede === 'Lima').teams[0].stages[0];
  assert.equal(review([]).rows, null);
  assert.equal(review([{ ...source('Lima', 1, 'C1'), participantes: undefined }]).rows, null);
  assert.equal(review([{ ...source('Lima', 1, 'C1'), extractionComplete: false }]).rows, null);
  assert.equal(review([{ ...source('Lima', 1, 'C1'), totalParticipantes: 3 }]).rows, null);
  assert.equal(review([source('Lima', 1, 'C1', [{}])]).confirmed, null);
  assert.equal(review([source('Lima', 1, 'C1'), source('Lima', 1, 'C1')]).status, 'duplicate');
  assert.equal(review([source('Quito', 1, 'C1')]).rows, null);
  assert.equal(review([source('Lima', 1, 'C2')]).rows, null);
  assert.equal(review([source('Lima', 1, 'C1')]).rows, 0); // Explicitly complete empty report.
  assert.equal(review([source('Lima', 1, 'C1', [{ grupoReporte: 'Nuevo', llamada1: 'Confirmado' }])]).confirmed, 1);
});

test('snapshot must be recent and dated; counts are not reused from stale or future sources', () => {
  for (const timestamp of [null, 'bad', '2026-09-01', new Date(now + 1).toISOString()]) {
    const review = buildOperationalReview([event('Lima', 1, '2026-10-01')], {
      timestamp, equiposReporte: [source('Lima', 1, 'C1')]
    }, now);
    assert.equal(review.freshness.stale, true);
    assert.equal(review.sedes.find(group => group.sede === 'Lima').teams[0].stages[0].rows, null);
  }
});

test('official Fer/Paul identities retain CEO/CCO labels instead of gerencia defaults or omission', () => {
  for (const email of ['fer.aragon@crearpsl.net', 'paul.sosa@crearpsl.net']) {
    const person = USERS_TO_IMPORT.find(person => person.email === email);
    assert.ok(person);
    const role = operationalRole(person.role);
    assert.equal(role.tabCategory, 'ejecutivo');
    assert.match(role.roleName, /CEO|CCO/);
  }
});
