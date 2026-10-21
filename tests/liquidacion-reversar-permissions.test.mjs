import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canReverseLiquidacionEntrenadores,
  canViewKPIsLlamadas,
  canViewLiquidacionEntrenadores
} from '../src/config/permissions.js';

test('liquidación comparte exactamente el acceso de dirección de los KPIs', () => {
  const users = [
    null,
    { email: 'director@x.org', appRole: 'director_maestria' },
    { email: 'cfo@x.org', roles: ['cfo'] },
    { email: 'jose.sanchez@crearpsl.net' },
    { email: 'coordinador@x.org', appRole: 'coord_maestria' },
    { email: 'gerente@x.org', appRole: 'gerente' }
  ];

  for (const user of users) {
    assert.equal(canViewLiquidacionEntrenadores(user), canViewKPIsLlamadas(user));
  }
});

test('Director autorizado (Andrés) puede reversar', () => {
  assert.equal(canReverseLiquidacionEntrenadores({ email: 'andres.gomez@crearpsl.net', appRole: 'director_maestria', roles: ['director_maestria'] }), true);
});

test('SuperAdmin autorizado puede reversar', () => {
  assert.equal(canReverseLiquidacionEntrenadores({ email: 'jose.sanchez@crearpsl.net', isSuperAdmin: true }), true);
});

test('contabilidad sin rol directivo no puede ver ni reversar', () => {
  assert.equal(canReverseLiquidacionEntrenadores({ email: 'contabilidad.global@crearpsl.net', appRole: 'contabilidad', roles: ['contabilidad'] }), false);
});

test('gerente y coordinador locales no pueden', () => {
  assert.equal(canReverseLiquidacionEntrenadores({ email: 'g@x.org', appRole: 'gerente', roles: ['gerente'] }), false);
  assert.equal(canReverseLiquidacionEntrenadores({ email: 'c@x.org', appRole: 'coord_maestria', roles: ['coord_maestria'] }), false);
});

test('director en roles[] activo como coordinador requiere email autorizado para reversar', () => {
  assert.equal(canReverseLiquidacionEntrenadores({ email: 'andres.gomez@crearpsl.net', appRole: 'coord_maestria', roles: ['director_maestria', 'coord_maestria'] }), true);
  assert.equal(canReverseLiquidacionEntrenadores({ email: 'otro@x.org', appRole: 'coord_maestria', roles: ['director_maestria', 'coord_maestria'] }), false);
});

test('sin usuario no puede', () => {
  assert.equal(canReverseLiquidacionEntrenadores(null), false);
});
