import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewAllManagers } from '../src/config/permissions.js';

test('director_maestria activo ve todos los managers', () => {
  assert.equal(canViewAllManagers({ email: 'a@x.org', appRole: 'director_maestria', roles: ['director_maestria'] }), true);
});

test('director_maestria solo en roles[] conserva vista global', () => {
  assert.equal(canViewAllManagers({ email: 'a@x.org', appRole: 'coord_maestria', roles: ['director_maestria', 'coord_maestria', 'entrenador'] }), true);
  assert.equal(canViewAllManagers({ email: 'a@x.org', appRole: 'entrenador', roles: ['director_maestria', 'entrenador'] }), true);
});

test('rol de dirección en roles[] conserva vista global', () => {
  assert.equal(canViewAllManagers({ email: 'a@x.org', appRole: 'gerente', roles: ['gerente', 'cfo'] }), true);
});

test('gerente y coordinador locales no reciben vista global', () => {
  assert.equal(canViewAllManagers({ email: 'g@x.org', appRole: 'gerente', roles: ['gerente'] }), false);
  assert.equal(canViewAllManagers({ email: 'c@x.org', appRole: 'coord_maestria', roles: ['coord_maestria'] }), false);
});
