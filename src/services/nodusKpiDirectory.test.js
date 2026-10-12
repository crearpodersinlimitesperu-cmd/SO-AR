import test from 'node:test';
import assert from 'node:assert/strict';
import { operationalRole, resolveCoordinatorKpiAssignment } from './nodusKpiDirectory.js';

test('KPI tabs and labels come from canonical role assignments', () => {
  assert.deepEqual(operationalRole('director_maestria'), {
    tabCategory: 'mj',
    roleName: 'Coordinador Maestría del Juego (CMJ)',
  });
  assert.equal(operationalRole('coord_c2').tabCategory, 'c1');
  assert.equal(operationalRole('unknown-role'), null);
  assert.deepEqual(resolveCoordinatorKpiAssignment(
    { email: 'coord@example.test' },
    [{ email: 'COORD@example.test', role: 'director_maestria' }]
  ), {
    role: 'director_maestria',
    tabCategory: 'mj',
    roleName: 'Coordinador Maestría del Juego (CMJ)',
  });
});

test('coordinator assignment never uses fuzzy names or an ambiguous email match', () => {
  const fallback = {
    role: 'nodus_coordinacion_c1c2',
    tabCategory: 'c1',
    roleName: 'Coordinación C1/C2 según el origen Nodus',
  };
  assert.deepEqual(resolveCoordinatorKpiAssignment(
    { email: 'unknown@example.test', nombre: 'Synthetic Person' },
    [{ email: 'known@example.test', name: 'Synthetic Person', role: 'coord_c1' }]
  ), fallback);
  assert.deepEqual(resolveCoordinatorKpiAssignment(
    { email: 'known@example.test' },
    [
      { email: 'known@example.test', role: 'coord_c1' },
      { email: 'KNOWN@example.test', role: 'director_maestria' },
    ]
  ), fallback);
});
