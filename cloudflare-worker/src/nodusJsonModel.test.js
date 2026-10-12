import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterNodusSedes,
  hasNodusTeamAccess,
  nodusAccessScope,
  summarizeNodusCatalog,
  summarizeNodusTeam
} from './nodusJsonModel.js';

test('manager, coordinator and operational scope follow server-side identity fields', () => {
  assert.deepEqual(nodusAccessScope({ role: 'colaborador', sede: 'Lima' }, true), { type: 'global' });
  assert.deepEqual(nodusAccessScope({ roles: ['coord_c1'], sede: 'Lima' }, false), { type: 'sede', sede: 'Lima' });
  assert.deepEqual(nodusAccessScope({ role: 'operativo', sede: 'Lima' }, false), { type: 'general' });
  assert.deepEqual(nodusAccessScope({ role: 'coord_c1' }, false), { type: 'denied' });
});

test('coordinator location matching handles accents but never broadens to other cities', () => {
  const sedes = [
    { id: 1, nombre: 'GUAYAQUIL CICLO 1', ciudad: 'GUAYAQUIL' },
    { id: 2, nombre: 'LIMA CICLO 2', ciudad: 'LIMA' },
    { id: 3, nombre: 'MÉXICO', ciudad: 'CIUDAD DE MÉXICO' },
    { id: 4, nombre: 'QUITO CICLO 1', ciudad: 'QUITO' }
  ];
  assert.deepEqual(filterNodusSedes(sedes, { type: 'sede', sede: 'Guayaquil' }), [sedes[0]]);
  assert.deepEqual(filterNodusSedes(sedes, { type: 'sede', sede: 'GYE' }), [sedes[0]]);
  assert.deepEqual(filterNodusSedes(sedes, { type: 'sede', sede: 'Lima' }), [sedes[1]]);
  assert.deepEqual(filterNodusSedes(sedes, { type: 'sede', sede: 'UIO C1' }), [sedes[3]]);
  assert.deepEqual(filterNodusSedes(sedes, { type: 'sede', sede: 'Quito' }), [sedes[3]]);
  assert.deepEqual(filterNodusSedes(sedes, { type: 'global' }), sedes);
  assert.equal(hasNodusTeamAccess([{ equipos: [{ id: 12 }] }], 12), true);
  assert.equal(hasNodusTeamAccess([{ equipos: [{ id: 12 }] }], 13), false);
});

test('team summary reports only documented booleans and leaves absent states unknown', () => {
  const summary = summarizeNodusTeam({
    equipo: { id: 149, nombre: 'EQUIPO 38', sede: 'GUAYAQUIL CICLO 1' },
    participantes: [
      { identificacion: 'private-1', capitulo1: { pagado: true, asistio: true }, capitulo2: { pagado: false, maestria: false } },
      { identificacion: 'private-2', capitulo1: { pagado: false, asistio: false, desertor: true }, capitulo2: { pagado: true, maestria: true } },
      { identificacion: 'private-3', capitulo1: {}, capitulo2: {} }
    ]
  });
  assert.deepEqual(summary.capitulo1Pagado, { yes: 1, no: 1, unknown: 1 });
  assert.deepEqual(summary.capitulo1Asistio, { yes: 1, no: 1, unknown: 1 });
  assert.deepEqual(summary.capitulo1Desertor, { yes: 1, no: 0, unknown: 2 });
  assert.deepEqual(summary.capitulo2Pagado, { yes: 1, no: 1, unknown: 1 });
  assert.deepEqual(summary.maestria, { yes: 1, no: 1, unknown: 1 });
  assert.equal(JSON.stringify(summary).includes('private-1'), false);
});

test('catalog totals reject invalid participant counts instead of treating them as zero', () => {
  assert.deepEqual(summarizeNodusCatalog([
    { equipos: [{ participantes: 2 }, { participantes: 3 }] },
    { equipos: [{ participantes: 0 }] }
  ]), { sedes: 2, equipos: 3, participantes: 5 });
  assert.throws(() => summarizeNodusCatalog([{ equipos: [{ participantes: 'unknown' }] }]), /invalid_equipos_schema/);
});
