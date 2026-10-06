import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDocument, scopedEnrollee, projectEnrollee, buildImoRequest, reviewImoRequest, reconcileApprovedRequest } from '../../functions-imo/controlModel.mjs';
const person = { id: 'person1', imoId: 'imo1', nombre: 'PRUEBA', sede: 'Lima', currentTeam: 30, coordinadorId: 'coord1', coordinadorEmail: 'coord@example.test', sourceUpdatedAt: '2026-10-01T00:00:00Z', documento: '00123456', email: 'private@example.test' };
const at = '2026-10-05T00:00:00Z';
const makeRequest = () => buildImoRequest({ requestId: 'req1', actorId: 'imo1', enrollee: person, type: 'team_change', targetEvent: { id: 'event32', stage: 'C1', sede: 'Lima', team: 32, date: '2026-10-23' }, at });
test('document and stable assignments preserve identity without fuzzy name matches', () => {
  assert.equal(normalizeDocument('00.123-456'), '00123456');
  assert.throws(() => scopedEnrollee([person], 'another-imo', person.id));
  assert.throws(() => scopedEnrollee([person, person], 'imo1', person.id));
  const projected = projectEnrollee(person);
  assert.equal(projected.documento, undefined); assert.equal(projected.email, undefined);
});
test('team 30 to 32 is a request, never an automatic change to Nodus', () => {
  const request = makeRequest();
  assert.equal(person.currentTeam, 30); assert.equal(request.before.currentTeam, 30);
  assert.equal(request.requested.team, 32); assert.equal(request.status, 'pending_coordinator');
  assert.throws(() => buildImoRequest({ requestId: 'x', actorId: 'another-imo', enrollee: person }));
});
test('only assigned coordinator resolves; acceptance remains pending until a fresh Nodus snapshot confirms', () => {
  const request = makeRequest();
  assert.throws(() => reviewImoRequest(request, { id: 'other' }, 'approve', '', at));
  const approved = reviewImoRequest(request, { id: 'coord1', email: 'coord@example.test', active: true, sede: 'Lima' }, 'approve', '', at);
  assert.equal(approved.status, 'approved_pending_nodus');
  assert.throws(() => reviewImoRequest(approved, { id: 'coord1', email: 'coord@example.test', active: true, sede: 'Lima' }, 'approve', '', at));
  assert.equal(reconcileApprovedRequest(approved, { ...person, currentTeam: 32 }, at).status, 'approved_pending_nodus');
  assert.equal(reconcileApprovedRequest(approved, { ...person, currentTeam: 32, sourceUpdatedAt: '2026-10-06T00:00:00Z' }, at).status, 'confirmed_in_nodus');
});

test('missing or invalid source timestamps cannot confirm an approved change', () => {
  const approved = reviewImoRequest(makeRequest(), { id: 'coord1', email: 'coord@example.test', active: true, sede: 'Lima' }, 'approve', '', at);
  for (const sourceUpdatedAt of [undefined, null, '', 'invalid', at]) {
    assert.equal(reconcileApprovedRequest(approved, { ...person, currentTeam: 32, sourceUpdatedAt }, at).status, 'approved_pending_nodus');
  }
  assert.equal(reconcileApprovedRequest({ ...approved, reviewedAt: undefined }, { ...person, currentTeam: 32, sourceUpdatedAt: '2026-10-06T00:00:00Z' }, at).status, 'approved_pending_nodus');
});
