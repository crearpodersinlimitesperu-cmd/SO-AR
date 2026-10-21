import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canEditSedeDatos } from '../src/utils/sedeDatosPermissions.js';

test('gerente edita solo su sede', () => {
  const u = { role: 'gerente', sede: 'Cuenca' };
  assert.ok(canEditSedeDatos(u, 'Cuenca'));
  assert.ok(!canEditSedeDatos(u, 'Lima'));
});
test('superadmin global; otros roles y sede global no editan', () => {
  assert.ok(canEditSedeDatos({ isSuperAdmin: true }, 'Quito'));
  assert.ok(!canEditSedeDatos({ role: 'entrenador', sede: 'Cuenca' }, 'Cuenca'));
  assert.ok(!canEditSedeDatos({ role: 'gerente', sede: 'Global' }, 'Cuenca'));
  assert.ok(!canEditSedeDatos(null, 'Cuenca'));
});
test('las reglas protegen sedes_institucionales por rol y sede', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const block = rules.slice(rules.indexOf('match /sedes_institucionales/'));
  assert.match(block, /allow read: if true/);
  assert.match(block, /canEditSedeInstitucional\(sedeId\)/);
  assert.match(block, /allow delete: if isSuperAdmin\(\)/);
});
