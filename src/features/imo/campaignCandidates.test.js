import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCampaignCandidates, inferOriginTeam, buildOriginIndex, recordTeamNumber, teamsWithRecords } from './campaignCandidates.js';
import { validateCampaign } from './missionModel.js';
import { getEnroladosList } from './missionEnrolados.js';

const sedeOf = m => m.sede;
const rec = (id, imo, equipo, enrolados, lastUpdated = '2026-09-28T00:00:00Z', sede = 'Lima') =>
  ({ id, imoNombre: imo, equipo, sede, lastUpdated, enrolados: enrolados.map(([nombre, telefono = '', coord = 'DIANA']) => ({ id: `enr_${nombre.replace(/ /g, '_').toLowerCase()}`, nombre, telefono, coordinadora_nombre: coord })), checks: {} });

const missions = [
  rec('a1', 'ANA PEREZ', 'EQUIPO 31 - LIMA CICLO 1', [['LUIS ROJAS', '+51 999 111 222'], ['EVA DIAZ'], ['Pagado (S/. 3,530.00) (C2 + MJ) —']]),
  rec('a2', 'Ana Pérez', 'EQUIPO 31 — LIMA CICLO 1 ✓', [['LUIS ROJAS', '999111222'], ['RAUL SOTO']], '2026-09-17T00:00:00Z'),
  rec('b1', 'BETO RUIZ', 'EQUIPO 31', [['EVA DIAZ'], ['NINA PAZ'], ['Pagado (S/. 3,530.00) (C2 + MJ) —'], ['Sin pago (S/. 1,875.00) X']], '2026-09-11T00:00:00Z'),
  rec('c1', 'CARLA MENA', 'EQUIPO 30 - LIMA CICLO 1', [['ANA PEREZ'], ['MARIO VEGA']]),
  rec('c2', 'DORA LUNA', 'EQUIPO 29 - LIMA CICLO 1', [['BETO RUIZ']]),
  rec('s1', 'Sin invitador', 'EQUIPO 31', [['OTRO SOLO']]),
  rec('b2', 'BETO RUIZ', 'EQUIPO 31', [['EVA DIAZ']], '2026-09-10T00:00:00Z'),
  rec('q1', 'QUITO IMO', 'EQUIPO 31', [['X Y']], '2026-09-28T00:00:00Z', 'Quito'),
  { id: 'v2', schemaVersion: 2, imoNombre: 'ANA PEREZ', targetTeam: 31, sede: 'Lima', enrolados: [{ id: 'z', nombre: 'ZOE' }] },
];

test('el equipo del registro Nodus es el equipo de ingreso', () => {
  assert.equal(recordTeamNumber({ equipo: 'EQUIPO 31 — LIMA CICLO 1 ✓' }), 31);
  assert.equal(recordTeamNumber({ equipo: 'X', targetTeam: 32 }), 32);
  assert.deepEqual(teamsWithRecords(missions, 'Lima', sedeOf, getEnroladosList).map(t => t.team), [31, 30, 29]);
  const onlyPayments = [rec('p', 'IMO X', 'EQUIPO 38', [['Pagado (S/. 1,00) —']], undefined, 'Guayaquil')];
  assert.deepEqual(teamsWithRecords(onlyPayments, 'Guayaquil', sedeOf, getEnroladosList), []);
});

test('el equipo de origen se deduce del equipo donde el IMO fue enrolado', () => {
  const index = buildOriginIndex(missions, sedeOf);
  assert.equal(inferOriginTeam('Ana Perez', 31, index, 'Lima'), 30);
  assert.equal(inferOriginTeam('BETO RUIZ', 31, index, 'Lima'), 29);
  assert.equal(inferOriginTeam('DESCONOCIDO', 31, index, 'Lima'), 0);
  assert.equal(inferOriginTeam('ANA PEREZ', 31, index, 'Quito'), 0);
});

test('un candidato por IMO, sin enrolados duplicados y solo de la sede/equipo', () => {
  const { candidates, conflicts } = buildCampaignCandidates(missions, { sede: 'Lima', targetTeam: 31, resolveSede: sedeOf, getEnrolados: getEnroladosList });
  assert.deepEqual(candidates.map(c => c.nombre), ['ANA PEREZ', 'BETO RUIZ']);
  const ana = candidates[0];
  assert.deepEqual(ana.sourceMissionIds, ['a1', 'a2']);
  assert.deepEqual(ana.enrolados.map(e => e.nombre), ['LUIS ROJAS', 'EVA DIAZ', 'RAUL SOTO']);
  assert.equal(ana.originTeam, 30);
  assert.deepEqual(candidates[1].enrolados.map(e => e.nombre), ['NINA PAZ']);
  assert.deepEqual(conflicts, [{ enrolado: 'EVA DIAZ', keptWith: 'ANA PEREZ', skippedFrom: 'BETO RUIZ' }]);
  assert.doesNotThrow(() => validateCampaign({ sede: 'Lima', targetTeam: 31, c1Date: '2026-10-23', assignments: candidates }));
});

test('búsqueda por IMO o enrolado y equipos sin datos', () => {
  const opts = { sede: 'Lima', resolveSede: sedeOf, getEnrolados: getEnroladosList };
  assert.deepEqual(buildCampaignCandidates(missions, { ...opts, targetTeam: 31, search: 'nina' }).candidates.map(c => c.nombre), ['BETO RUIZ']);
  assert.equal(buildCampaignCandidates(missions, { ...opts, targetTeam: 32 }).candidates.length, 0);
});

test('validación admite origen por confirmar y hasta 200 IMOs', () => {
  const one = i => ({ nombre: `IMO ${i}`, sourceMissionId: `m${i}`, originTeam: 0, enrolados: [{ id: `e${i}`, nombre: `ENROLADO ${i}` }] });
  assert.doesNotThrow(() => validateCampaign({ sede: 'Quito', targetTeam: 130, c1Date: '2026-10-30', assignments: Array.from({ length: 200 }, (_, i) => one(i)) }));
  assert.throws(() => validateCampaign({ sede: 'Quito', targetTeam: 130, c1Date: '2026-10-30', assignments: Array.from({ length: 201 }, (_, i) => one(i)) }));
  assert.throws(() => validateCampaign({ sede: 'Quito', targetTeam: 130, c1Date: '2026-10-30', assignments: [{ ...one(1), originTeam: 130 }] }));
});
