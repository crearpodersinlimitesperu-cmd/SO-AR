import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterNodusSedes,
  hasNodusTeamAccess,
  nodusAccessScope,
  scopedNodusContext,
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

test('gerentes retain assigned sites, never global access from gerente or consolidated views', () => {
  const user = { roles: ['gerente', 'coord_c1'], appRole: 'consolidado', sede: 'Lima',
    roleSedes: { gerente: 'Quito', coord_c1: 'Cuenca', direccion: 'Guayaquil' } };
  const scope = nodusAccessScope(user, false);
  assert.equal(scope.type, 'sede');
  assert.deepEqual(scope.sedes, ['Lima', 'Quito', 'Cuenca']);
  const sedes = ['Lima', 'Quito', 'Cuenca', 'Guayaquil'].map(nombre => ({ nombre }));
  assert.deepEqual(filterNodusSedes(sedes, scope), sedes.slice(0, 3));
  assert.deepEqual(nodusAccessScope({ role: 'gerente', sede: 'Global' }, false), { type: 'denied' });
  assert.deepEqual(nodusAccessScope({ role: 'gerente', sede: 'unverified' }, false), { type: 'denied' });
  assert.deepEqual(nodusAccessScope({ role: 'direccion', sede: 'Lima' }, false), { type: 'global' });
  assert.deepEqual(nodusAccessScope({ role: 'gerente', active: false, sede: 'Lima' }, true), { type: 'denied' });
  assert.deepEqual(nodusAccessScope({ role: 'consolidado', sede: 'Lima' }, false), { type: 'general' });
});

test('local Nodus context excludes foreign totals, raw sections and nested personal rows', () => {
  const snapshot = {
    timestamp: 'synthetic-time', totales: { asignados: 999 },
    secciones: { private: 'FOREIGN_RAW' },
    sedes: [{ sede: 'Lima', asignados: 3, private: 'NESTED_PRIVATE' }, { sede: 'Quito', asignados: 9 }],
    coordinadores: [
      { sede: 'Lima', email: 'local@example.invalid', asignados: 3, equipos: [{ private: 'NESTED_PRIVATE' }],
        estados: { llamadas: 2, private: 'NESTED_PRIVATE' } },
      { sede: 'Quito', email: 'FOREIGN_EMAIL', asignados: 9 },
      { email: 'UNSCOPED_EMAIL', asignados: 12 }
    ],
    equiposSummary: [{ sede: 'Lima', equipo: '42', asignados: 3, participantes: ['NESTED_PRIVATE'] }]
  };
  const scoped = scopedNodusContext(snapshot, { type: 'sede', sede: 'Lima' });
  assert.equal(scoped.totales, undefined);
  assert.equal(scoped.secciones, undefined);
  assert.equal(scoped.coordinadores.length, 1);
  assert.equal(scoped.coordinadores[0].email, 'local@example.invalid');
  assert.doesNotMatch(JSON.stringify(scoped), /FOREIGN|NESTED_PRIVATE|UNSCOPED/);
  assert.deepEqual(scopedNodusContext(snapshot, { type: 'general' }), {
    timestamp: 'synthetic-time', totales: { asignados: 999 }
  });
  assert.equal(scopedNodusContext(snapshot, { type: 'global' }), snapshot);
  assert.throws(() => scopedNodusContext(snapshot, { type: 'denied' }), /denied/);
});

test('unknown or contradictory site labels cannot widen local scope', () => {
  const scope = { type: 'sede', sede: 'Lima' };
  assert.deepEqual(filterNodusSedes([
    { nombre: 'Lima foreign' }, { nombre: 'Quito', ciudad: 'Lima' }, { ciudad: 'Lima', nombre: 'LIMA CICLO 1' }
  ], scope), [{ ciudad: 'Lima', nombre: 'LIMA CICLO 1' }]);
});
