import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { USERS_TO_IMPORT } from '../src/data/usersToImport.js';
import {
  canAccessCampusInteractivo,
  canAssignTrainer,
  canManageUserStatus,
  canViewAllManagers,
  canViewInactiveUsers,
  getAssignableRoles,
  NODUS_REPORT_ADMIN_EMAILS
} from '../src/config/permissions.js';
import { isModuleVisible, MODULE_REGISTRY } from '../src/config/moduleRegistry.js';
import { findUserByAnyEmail } from '../src/data/usersData.js';
import { isUserInactive, mergeUserRecords, normalizeUserRecord } from '../src/utils/userNormalizer.js';

test('July Leon y Lennin Chasi conservan perfiles históricos inactivos en usersToImport', () => {
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
  assert.equal(lennin.isActive, false);
  assert.equal(lennin.status, 'inactive');
  assert.equal(lennin.estado, 'inactivo');
  assert.equal(lennin.role, 'inactivo');
  assert.deepEqual(lennin.roles, []);
  assert.ok(lennin.motivo.includes('Renuncia'));
  assert.equal(lennin.previousRole, 'talento_humano');
  assert.equal(lennin.deactivatedAt, '2026-10-28');
  assert.equal(findUserByAnyEmail('talento.humano@crearpsl.net'), lennin);
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

test('El helper detecta todos los marcadores de inactividad y los conserva al normalizar/fusionar', () => {
  const inactiveProfiles = [
    { active: false },
    { isActive: false },
    { status: 'inactive' },
    { estado: 'INACTIVO' },
    { role: 'inactivo' },
    { appRole: 'inactivo' },
    { rol: 'inactivo' },
    { roles: ['gerente', 'inactivo'] }
  ];
  inactiveProfiles.forEach(profile => assert.equal(isUserInactive(profile), true));

  const normalized = normalizeUserRecord({ role: 'direccion', roles: ['direccion'], estado: 'inactivo' });
  assert.equal(normalized.status, 'inactive');
  assert.equal(normalized.active, false);
  assert.equal(normalized.isActive, false);

  const merged = mergeUserRecords(
    { email: 'former@example.test', role: 'direccion', active: true },
    { email: 'former@example.test', role: 'colaborador', roles: ['inactivo'] }
  );
  assert.equal(merged.status, 'inactive');
  assert.equal(merged.active, false);
  assert.equal(merged.isActive, false);
});

test('Un perfil inactivo no obtiene permisos aunque conserve marcadores administrativos', () => {
  const inactiveAdmin = {
    email: 'former@example.test',
    role: 'direccion',
    appRole: 'direccion',
    roles: ['director_maestria'],
    isSuperAdmin: true,
    isDireccion: true,
    active: false
  };
  assert.equal(canViewInactiveUsers(inactiveAdmin), false);
  assert.equal(canManageUserStatus(inactiveAdmin), false);
  assert.equal(canAssignTrainer(inactiveAdmin), false);
  assert.equal(canViewAllManagers(inactiveAdmin), false);
  assert.equal(canAccessCampusInteractivo(inactiveAdmin), false);
  assert.equal(isModuleVisible(MODULE_REGISTRY.find(module => module.id === 'campus'), inactiveAdmin), false);
  assert.deepEqual(getAssignableRoles(inactiveAdmin), []);

  const inactiveRoleOnly = { email: 'former@example.test', roles: ['inactivo', 'superadmin'], isSuperAdmin: true };
  assert.equal(canViewInactiveUsers(inactiveRoleOnly), false);
  assert.equal(canManageUserStatus(inactiveRoleOnly), false);
});

test('Talento Humano activo conserva sus permisos por rol, no por el correo dado de baja', () => {
  const activeHr = {
    email: 'hr-active@example.test',
    role: 'talento_humano',
    appRole: 'talento_humano',
    roles: ['talento_humano'],
    active: true,
    isActive: true,
    status: 'active'
  };
  assert.equal(canViewInactiveUsers(activeHr), true);
  assert.equal(canManageUserStatus(activeHr), true);
  assert.equal(isModuleVisible(MODULE_REGISTRY.find(module => module.id === 'hr-command-center'), activeHr), true);
  assert.equal(canViewInactiveUsers({ email: 'talento.humano@crearpsl.net', role: 'colaborador' }), false);
  assert.equal(canManageUserStatus({ email: 'talento.humano@crearpsl.net', role: 'colaborador' }), false);
});

test('July Leon no tiene privilegios de Nodus Report Admin ni en firestore.rules', () => {
  assert.equal(NODUS_REPORT_ADMIN_EMAILS.includes('emely.leon@crearpsl.net'), false);
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.equal(rules.includes('emely.leon@crearpsl.net'), false);
});

test('Identidad dada de baja ausente de Workspace, destinatarios y autorizaciones operativas', () => {
  const email = 'talento.humano@crearpsl.net';
  const workspaceCatalogs = [
    new URL('../src/data/googleWorkspaceUsers.json', import.meta.url),
    new URL('../scripts/google_workspace_users.json', import.meta.url)
  ];
  workspaceCatalogs.forEach(url => {
    const records = JSON.parse(readFileSync(url, 'utf8').replace(/^\uFEFF/, ''));
    assert.equal(records.some(record => record.email?.toLowerCase() === email), false);
  });

  const operationalFiles = [
    '../public/calendario_global.html',
    '../src/components/HorariosEntrenamientoModal.jsx',
    '../src/services/scheduleGovernanceAgent.js',
    '../src/config/permissions.js'
  ];
  operationalFiles.forEach(path => {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.equal(source.includes(email), false, `${path} no debe contener la identidad operativa`);
  });
});

test('Directorios, asignaciones y onboarding filtran perfiles institucionales inactivos', () => {
  const service = readFileSync(new URL('../src/services/userService.js', import.meta.url), 'utf8');
  const assignment = readFileSync(new URL('../src/components/TaskAssignmentModal.jsx', import.meta.url), 'utf8');
  const trainerAssignment = readFileSync(new URL('../src/pages/AsignadorEntrenadores.jsx', import.meta.url), 'utf8');
  const qtDirectory = readFileSync(new URL('../src/pages/DirectorioQT.jsx', import.meta.url), 'utf8');
  const legalService = readFileSync(new URL('../src/services/legalSignatureService.js', import.meta.url), 'utf8');
  const scheduleService = readFileSync(new URL('../src/services/scheduleGovernanceAgent.js', import.meta.url), 'utf8');

  assert.match(service, /allUsers\.filter\(u =>[\s\S]*isUserInactive\(u\)[\s\S]*isInactiveTrainer\(u\.name \|\| u\.displayName\)/);
  assert.match(assignment, /isUserInactive\(user\)/);
  assert.match(trainerAssignment, /const activo = !isUserInactive\(u\)/);
  assert.match(qtDirectory, /isUserInactive\(m\)/);
  assert.match(legalService, /if \(isUserInactive\(u\)\) return null;/);
  assert.match(scheduleService, /if \(isUserInactive\(currentUser\)\)/);
  assert.match(scheduleService, /isUserInactive\(officialProfile\)/);
});

test('Andrés Gómez está configurado formalmente como Directivo', () => {
  const andres = USERS_TO_IMPORT.find(u => u.id === 'staff_andresgomez');
  assert.ok(andres, 'Andrés Gómez debe existir en el catálogo');
  assert.equal(andres.role, 'direccion');
  assert.equal(andres.isDireccion, true);
  assert.ok(andres.roles.includes('direccion'));
  assert.ok(andres.roles.includes('director_maestria'));
  assert.equal(canViewInactiveUsers(andres), true);
});
