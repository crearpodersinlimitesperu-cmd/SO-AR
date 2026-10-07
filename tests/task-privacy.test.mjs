import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checklistData } from '../src/data/checklistData.js';
import { filterTasksForUser, isTaskVisibleForUser } from '../src/utils/taskPrivacy.js';

const coordinator = {
  uid: 'coord-1',
  email: 'coord@example.com',
  appRole: 'coord_c1',
  roles: ['coord_c1']
};

const rangedCatalogAllowlist = [
  { role: 'capitan', pattern: 'cap_chk_([1-9]|[1-4][0-9]|5[0-7])', idPattern: /^cap_chk_(?:[1-9]|[1-4][0-9]|5[0-7])$/ },
  { role: 'coord_c1', pattern: 'cc1_chk_([1-9]|[1-4][0-9]|5[0-2])', idPattern: /^cc1_chk_(?:[1-9]|[1-4][0-9]|5[0-2])$/ },
  { role: 'coord_maestria', pattern: 'cmj_chk_([1-9]|1[0-6])', idPattern: /^cmj_chk_(?:[1-9]|1[0-6])$/ },
  { role: 'gerente', pattern: 'ger_chk_([1-9]|[1-5][0-9]|60)', idPattern: /^ger_chk_(?:[1-9]|[1-5][0-9]|60)$/ },
  { role: 'qt', pattern: 'qt_chk_([1-9]|[1-3][0-9]|4[0-4])', idPattern: /^qt_chk_(?:[1-9]|[1-3][0-9]|4[0-4])$/ }
];
const reservedCatalogPrefixes = ['cap_chk', 'cc1_chk', 'cmj_chk', 'ger_chk', 'qt_chk'];

test('a user sees catalog tasks only for their assigned role', () => {
  assert.equal(isTaskVisibleForUser({ id: 'soar_12', role: 'coord_c1' }, coordinator), true);
  assert.equal(isTaskVisibleForUser({ id: 'soar_1', role: 'gerente' }, coordinator), false);
});

test('a personalized task is hidden unless the user is assigned, collaborating, or its creator', () => {
  const privateTask = {
    id: 'custom_private',
    role: 'coord_c1',
    assignedToEmails: ['other@example.com'],
    createdBy: 'manager@example.com'
  };

  assert.equal(isTaskVisibleForUser(privateTask, coordinator), false);
  assert.equal(isTaskVisibleForUser({
    ...privateTask,
    assignedToEmails: ['coord@example.com']
  }, coordinator), true);
  assert.equal(isTaskVisibleForUser({
    ...privateTask,
    assignedToEmails: ['other@example.com'],
    collaborators: [{ email: 'coord@example.com' }]
  }, coordinator), true);
  assert.equal(isTaskVisibleForUser({
    ...privateTask,
    createdBy: 'coord@example.com'
  }, coordinator), true);
});

test('consolidated and simulated users remain restricted to their own profile roles', () => {
  const consolidated = { ...coordinator, appRole: 'consolidado', roles: ['coord_c1', 'capitan'] };
  assert.deepEqual(
    filterTasksForUser([
      { id: 'soar_12', role: 'coord_c1' },
      { id: 'soar_14', role: 'capitan' },
      { id: 'soar_1', role: 'gerente' }
    ], consolidated).map(task => task.id),
    ['soar_12', 'soar_14']
  );

  const simulatedCoordinator = { ...coordinator, isSimulated: true };
  assert.equal(isTaskVisibleForUser({
    id: 'custom_private',
    role: 'gerente',
    assignedToEmail: 'admin@example.com'
  }, simulatedCoordinator), false);
});

test('every static catalog task is included in the Firestore role allowlist', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const roleBlocks = new Map();
  for (const { role } of checklistData) {
    if (roleBlocks.has(role)) continue;
    const start = rules.indexOf(`(roleName == '${role}'`);
    const nextRole = rules.indexOf("\n        (roleName == '", start + 1);
    const end = nextRole < 0 ? rules.indexOf('\n      );', start) : nextRole;
    roleBlocks.set(role, start < 0 || end < 0 ? '' : rules.slice(start, end));
  }

  const missingIds = checklistData
    .filter(task => {
      const roleBlock = roleBlocks.get(task.role) || '';
      if (roleBlock.includes(`'${task.id}'`)) return false;
      return !rangedCatalogAllowlist.some(({ role, pattern, idPattern }) =>
        role === task.role &&
        idPattern.test(task.id) &&
        roleBlock.includes(`taskId.matches('${pattern}')`)
      );
    })
    .map(task => `${task.role}:${task.id}`);

  assert.deepEqual(missingIds, []);
  const reservedStart = rules.indexOf('function isReservedChecklistTaskId');
  const reservedEnd = rules.indexOf('\n    function isChecklistCatalogTask', reservedStart);
  const reservedBlock = rules.slice(reservedStart, reservedEnd);
  for (const prefix of reservedCatalogPrefixes) {
    assert.ok(reservedBlock.includes(`taskId.matches('${prefix}_[0-9]+')`), `missing reserved-ID pattern: ${prefix}`);
  }
});
