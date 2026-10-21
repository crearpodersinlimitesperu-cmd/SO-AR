import test from 'node:test';
import assert from 'node:assert/strict';
import { getTaskProgressRoles } from '../src/utils/taskProgressRoles.js';

test('vista consolidada incluye los roles reales y excluye los demás', () => {
  const roles = getTaskProgressRoles('consolidado', ['gerente', 'coord_c1', 'consolidado']);

  assert.ok(roles.includes('gerente'));
  assert.ok(roles.includes('coord_c1'));
  assert.ok(!roles.includes('legal'));
  assert.ok(!roles.includes('consolidado'));
});

test('vista de rol único solo incluye el rol activo', () => {
  assert.deepEqual(
    getTaskProgressRoles('gerente', ['gerente', 'coord_c1']),
    ['gerente']
  );
});

test('vista consolidada sin roles reales no incluye tareas por rol', () => {
  assert.deepEqual(getTaskProgressRoles('consolidado', ['consolidado']), []);
});
