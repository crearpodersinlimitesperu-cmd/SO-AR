import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { USERS_TO_IMPORT } from '../src/data/usersToImport.js';
import { canViewInactiveUsers, NODUS_REPORT_ADMIN_EMAILS } from '../src/config/permissions.js';

test('July Leon y Lennin Chasi están desactivados e inmutables en usersToImport', () => {
  const july = USERS_TO_IMPORT.find(u => u.id === 'staff_emelyjuliettlenchavez');
  assert.ok(july, 'July Leon debe existir en el catálogo');
  assert.equal(july.active, false);
  assert.equal(july.estado, 'inactivo');
  assert.equal(july.role, 'inactivo');
  assert.deepEqual(july.roles, []);
  assert.ok(july.motivo.includes('Renuncia'));
  assert.equal(july.previousRole, 'gerente');

  const lennin = USERS_TO_IMPORT.find(u => u.id === 'staff_lenninfernandochasilima');
  assert.ok(lennin, 'Lennin Chasi debe existir en el catálogo');
  assert.equal(lennin.active, false);
  assert.equal(lennin.estado, 'inactivo');
  assert.equal(lennin.role, 'inactivo');
  assert.deepEqual(lennin.roles, []);
  assert.ok(lennin.motivo.includes('Renuncia'));
  assert.equal(lennin.previousRole, 'talento_humano');
});

test('Privacidad estricta: Solo directivos y SuperAdmins pueden ver usuarios inactivos', () => {
  // Directivos autorizados
  assert.equal(canViewInactiveUsers({ email: 'paul.sosa@crearpsl.net', role: 'director_general' }), true);
  assert.equal(canViewInactiveUsers({ email: 'fer.aragon@crearpsl.net', role: 'direccion' }), true);
  assert.equal(canViewInactiveUsers({ email: 'andres.gomez@crearpsl.net', isDireccion: true }), true);
  assert.equal(canViewInactiveUsers({ email: 'jose.sanchez@crearpsl.net' }), true);

  // Inactivos o desvinculados NUNCA pueden ver inactivos
  assert.equal(canViewInactiveUsers({ email: 'emely.leon@crearpsl.net', active: false, role: 'inactivo' }), false);
  assert.equal(canViewInactiveUsers({ email: 'talento.humano@crearpsl.net', active: false, estado: 'inactivo' }), false);
  assert.equal(canViewInactiveUsers({ email: 'leyla.pasquel@crearpsl.net', role: 'inactivo' }), false);

  // Coordinadores, Coaches y QT regulares NO pueden ver inactivos
  assert.equal(canViewInactiveUsers({ email: 'alejandro.diaz@crearpsl.net', role: 'entrenador_llamadas' }), false);
  assert.equal(canViewInactiveUsers({ email: 'lili.cubillo@crearpsl.net', role: 'coordinador_mj' }), false);
  assert.equal(canViewInactiveUsers({ email: 'mabe.catota@crearpsl.net', role: 'coordinador_c1' }), false);
  assert.equal(canViewInactiveUsers({ email: 'carlos.brunis@crearpsl.net', role: 'quantum_team' }), false);
});

test('July Leon no tiene privilegios de Nodus Report Admin ni en firestore.rules', () => {
  assert.equal(NODUS_REPORT_ADMIN_EMAILS.includes('emely.leon@crearpsl.net'), false);
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.equal(rules.includes('emely.leon@crearpsl.net'), false);
});
