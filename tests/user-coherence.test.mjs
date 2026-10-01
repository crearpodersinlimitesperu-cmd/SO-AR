import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalSede } from '../src/utils/sede.js';
import { normalizeUserRecord } from '../src/utils/userNormalizer.js';

test('aliases geográficos no asignan arbitrariamente un ciclo de Quito', () => {
  for (const input of ['Quito', 'UIO', 'UIO C1', 'UIO-C2', 'Quito Ciclo 2']) {
    assert.equal(canonicalSede(input), 'Quito');
  }
  for (const input of ['lim', 'LIM', 'Lima']) assert.equal(canonicalSede(input), 'Lima');
  for (const input of ['CDMX', 'mex', 'México']) assert.equal(canonicalSede(input), 'México');
  assert.equal(canonicalSede('Sede Global'), 'Global');
  assert.equal(canonicalSede('Sede nueva'), 'Sede nueva');
});

test('conserva rol principal aunque roles adicionales aparezcan primero', () => {
  const user = normalizeUserRecord({role:'coord_c1', roles:['entrenador','coord_c1'], sede:'UIO C2', equiposQuito:['122','128']});
  assert.equal(user.role, 'coord_c1');
  assert.equal(user.sede, 'Quito');
  assert.deepEqual(user.equiposQuito, ['122','128']);
  assert.deepEqual(user.roles, ['entrenador','coord_c1']);
});

test('tolera correos vacíos en registros existentes', () => {
  assert.doesNotThrow(() => normalizeUserRecord({emails:[null, '', 'persona@crearpsl.net']}));
});
