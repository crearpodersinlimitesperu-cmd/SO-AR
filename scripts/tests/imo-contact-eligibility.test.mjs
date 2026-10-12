import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTACT_MISSION, contactRegistration, isContactCandidate, isMissionCandidate } from '../../functions-imo/contactEligibility.mjs';
import { c1Eligibility } from '../../functions-imo/c1Eligibility.mjs';
import { buildCampaignCandidates } from '../../src/features/imo/campaignCandidates.js';
import { summarizeReadiness } from '../auditImoCampaignReadiness.mjs';

const context = { sede: 'Lima', targetTeam: 32, c1Date: '2026-10-23', missionKind: CONTACT_MISSION };
const person = { id: 'synthetic-person', nombre: 'Synthetic Enrollee', asistenciaC1: null,
  c1Registration: { source: 'Nodus /participantessede/datos', chapter: true,
    sede: 'Lima', targetTeam: 32, date: '2026-10-23', status: 'pendiente' } };

test('verified registration enables contact without changing unknown historical attendance', () => {
  for (const status of ['pendiente', 'confirmado', 'Pendiente', ' CONFIRMADO ']) {
    const e = { ...person, c1Registration: { ...person.c1Registration, status } };
    assert.equal(c1Eligibility(e), 'unverified');
    assert.equal(isContactCandidate(e, context), true);
    assert.equal(isMissionCandidate(e, context), true);
    assert.equal(isMissionCandidate(e, { ...context, missionKind: undefined }), false);
    assert.equal(e.asistenciaC1, null);
  }
});

test('unknown, malformed, other sede/team/date, trained and unsupported states fail closed', () => {
  for (const patch of [{ source: 'manual' }, { chapter: false }, { sede: 'Quito' },
    { targetTeam: 31 }, { date: '2026-10-24' }, { status: 'asistio' }, { targetTeam: undefined }]) {
    assert.equal(isContactCandidate({ ...person, c1Registration: { ...person.c1Registration, ...patch } }, context), false);
  }
  assert.equal(isContactCandidate({ ...person, asistenciaC1: true }, context), false);
  assert.equal(isContactCandidate({ id: 'unknown' }, context), false);
  assert.equal(isContactCandidate({ ...person, asistenciaC1: true, desertorC1: true }, context), true);
});

test('generator and readback distinguish contact candidates from historically eligible enrolments', () => {
  const m = { id: 'synthetic-mission', sede: 'Lima', targetTeam: 32, c1Date: context.c1Date,
    imoNombre: 'Synthetic Inviter', enrolados: [person] };
  const options = { ...context, resolveSede: m => m.sede, getEnrolados: m => m.enrolados };
  const result = buildCampaignCandidates([m, { ...m, id: 'other', sede: 'Quito' }], options);
  assert.equal(result.candidates.length, 1);
  assert.deepEqual(result.candidates[0].enrolados[0].c1Registration, person.c1Registration);
  assert.equal(result.candidates[0].originTeam, 0);
  assert.equal(buildCampaignCandidates([m], { ...options, c1Date: '2026-10-24' }).candidates.length, 0);
  const summary = summarizeReadiness([m], [{ sede: 'Lima', team: 32, date: context.c1Date, name: 'CAPITULO UNO' }], [], 'Lima', 32);
  assert.equal(summary.statuses.unverified, 1);
  assert.equal(summary.candidateEnrollees, 0);
  assert.equal(summary.contactMission.candidateEnrollees, 1);
  assert.equal(summary.sharingAuthorized, false);
});

test('existing scoped registration requires stored identity, source and destination, without new source writes', () => {
  const registration = { chapter: true, date: context.c1Date, status: 'pendiente' };
  const e = { ...person, nodusParticipantId: '123', c1Source: 'Nodus /participantessede/datosTabla',
    c1Registration: registration };
  const m = { id: 'synthetic', sede: 'Lima', targetTeam: 32,
    c1SourceUpdatedAt: '2026-10-12T15:32:03.848Z', imoNombre: 'Synthetic Owner', enrolados: [e] };
  const projected = contactRegistration(e, m);
  assert.equal(isContactCandidate({ ...e, c1Registration: projected }, context), true);
  assert.deepEqual(e.c1Registration, registration);
  for (const bad of [{ ...e, nodusParticipantId: '' }, { ...e, c1Source: 'unverified' }]) {
    assert.equal(isContactCandidate({ ...bad, c1Registration: contactRegistration(bad, m) }, context), false);
  }
  for (const bad of [{ ...m, sede: '' }, { ...m, targetTeam: undefined },
    { ...m, c1SourceUpdatedAt: undefined }, { ...m, schemaVersion: 2 }]) {
    assert.equal(isContactCandidate({ ...e, c1Registration: contactRegistration(e, bad) }, context), false);
  }
  const candidates = buildCampaignCandidates([m], { ...context, resolveSede: m => m.sede, getEnrolados: m => m.enrolados }).candidates;
  assert.equal(candidates.length, 1);
  assert.equal(isMissionCandidate(candidates[0].enrolados[0], context), true);
  assert.equal(c1Eligibility(candidates[0].enrolados[0]), 'unverified');
});

test('62 synthetic IMOs and 121 enrolments flow through contact selection with historical origins intact', () => {
  const missions = Array.from({ length: 62 }, (_, i) => {
    const code = String.fromCharCode(65 + Math.floor(i / 26), 65 + i % 26);
    return { id: `source-${i}`, sede: 'Lima', targetTeam: 32, imoNombre: `Synthetic Owner ${code}`,
      enrolados: Array.from({ length: i < 59 ? 2 : 1 }, (_, j) => ({
        ...person, id: `person-${i}-${j}`, nombre: `Synthetic Person ${code} ${j ? 'Beta' : 'Alpha'}`,
      })) };
  });
  const origins = [29, 30, 31].map(targetTeam => ({ sede: 'Lima', targetTeam,
    enrolados: missions.filter((_, i) => 29 + i % 3 === targetTeam).map(m => ({ nombre: m.imoNombre })) }));
  const result = buildCampaignCandidates([...missions, ...origins], {
    ...context, resolveSede: m => m.sede, getEnrolados: m => m.enrolados,
  });
  assert.equal(result.candidates.length, 62);
  const people = result.candidates.flatMap(c => c.enrolados);
  assert.equal(people.length, 121);
  assert.equal(new Set(people.map(e => e.id)).size, 121);
  assert.ok(result.candidates.every(c => [29, 30, 31].includes(c.originTeam)));
  assert.ok(people.every(e => c1Eligibility(e) === 'unverified' && isMissionCandidate(e, context)));
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.phoneConflicts.length, 0);
});
