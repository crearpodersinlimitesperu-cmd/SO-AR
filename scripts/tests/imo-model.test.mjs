import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { confirmedStatus, isMissionComplete, missionProgress, teamNumber, validateCampaign } from '../../src/features/imo/missionModel.js';
test('completion requires saved boolean contact AND attendance for every enrollee', () => {
  assert.equal(isMissionComplete([]), false);
  assert.equal(isMissionComplete([{ asistencia: true, contacto: false }]), false);
  assert.equal(isMissionComplete([{ asistencia: 'NO', contacto: true }]), false);
  assert.equal(missionProgress([{ asistencia: true, contacto: true }, { asistencia: true, contacto: false }]), 50);
});
test('negative, pending and accented Nodus statuses', () => {
  for (const s of ['NO ASISTE', 'NO PAGÓ', 'POR CONFIRMAR', 'SIN CONFIRMAR', 'PENDIENTE', 'SIN PAGO']) assert.equal(confirmedStatus(s), false, s);
  for (const s of ['SÍ', 'CONFIRMADO', 'ASISTIÓ']) assert.equal(confirmedStatus(s), true, s);
});
const assignment = { sourceMissionId: 'source', nombre: 'IMO EJEMPLO', originTeam: 30, enrolados: [{ id: 'a', nombre: 'PERSONA EJEMPLO' }] };
test('campaign preserves origin and destination, validates duplicate enrolment', () => {
  assert.equal(teamNumber('EQUIPO 31 - QUITO C1'), 31);
  const input = { sede: 'Quito', targetTeam: 31, c1Date: '2026-10-16', assignments: [assignment] };
  assert.doesNotThrow(() => validateCampaign(input));
  assert.throws(() => validateCampaign({ ...input, targetTeam: 30 }), /origen/);
  assert.throws(() => validateCampaign({ ...input, assignments: [assignment, { ...assignment, sourceMissionId: 'other' }] }), /aparece más/);
});
test('Nodus verification never crashes on known enrollee and refuses negated confirmations', () => {
  const source = readFileSync(new URL('../../src/services/nodusVerificationService.js', import.meta.url), 'utf8').replace(/^import .*;$/mg, '').replace(/export /g, '');
  const ctx = { baseRecords: [], confirmedStatus, console };
  vm.createContext(ctx); vm.runInContext(source, ctx);
  for (const llamada1 of ['POR CONFIRMAR', 'NO ASISTE', 'NO PAGÓ', 'CONFIRMADO']) {
    const result = ctx.evaluateEnroladoVerification({ nombre: 'PRUEBA', asistencia: true, llamada1 }, 'IMO', 'EQUIPO 31');
    assert.equal(result.status === 'VERIFICADO_OK', llamada1 === 'CONFIRMADO', llamada1);
  }
  vm.runInContext("indexRecord({nombreNorm:'ANA PEREZ', equipo:'EQUIPO 30', asistencia:'SI'}); indexRecord({nombreNorm:'ANA PEREZ',equipo:'EQUIPO 31',asistencia:'NO'});", ctx);
  assert.equal(ctx.findParticipantInNodus({ nombre: 'Ana Pérez' }), null);
  assert.equal(ctx.findParticipantInNodus({ nombre: 'Ana Pérez' }, '', 'EQUIPO 31').asistencia, 'NO');
});

test('background agent processes real snapshot shapes even when local cache is full', async () => {
  const { getEnroladosList } = await import('../../src/features/imo/missionEnrolados.js');
  const listeners = [];
  const source = readFileSync(new URL('../../src/services/CausaNodusAgent.js', import.meta.url), 'utf8').replace(/^import .*;$/mg, '').replace(/export /g, '');
  const ctx = {
    getEnroladosList, db: {}, collection: () => 'missions', doc: () => 'nodus',
    onSnapshot: (ref, cb) => { listeners.push({ ref, cb }); return () => {}; },
    evaluateEnroladoVerification: e => ({ status: e.asistencia ? 'CONFIRMED' : 'PENDING', detalle: 'test detail' }),
    localStorage: { getItem: () => null, setItem: () => { throw Error('quota exceeded'); } },
    window: { dispatchEvent: () => {} }, Event: class {}, console: { log() {}, warn() {} }
  };
  vm.createContext(ctx); vm.runInContext(source, ctx); ctx.startCausaNodusAgent();
  const mission = { schemaVersion: 2, enrolados: [{ id: 'a', nombre: 'TEST' }], checks: { a: { contacto: true, asistencia: false } } };
  assert.doesNotThrow(() => listeners.find(l => l.ref === 'missions').cb({ docs: [{ id: 'm1', data: () => mission }] }));
  assert.equal(vm.runInContext('globalCache.enroladosConStatus[0].statusIA', ctx), 'PENDING');
  assert.equal(vm.runInContext('globalCache.enroladosConStatus[0].statusRazon', ctx), 'test detail');
  assert.equal(getEnroladosList({ id: 'legacy', checks: { TEST_PERSON: { asistencia: true } } })[0].nombre, 'TEST PERSON');
  ctx.stopCausaNodusAgent();
});
