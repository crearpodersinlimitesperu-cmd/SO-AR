import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as permissions from '../src/config/permissions.js';
import { canViewAllManagers } from '../src/config/permissions.js';
import { canonicalSede } from '../src/utils/sede.js';
import { matchesExplicitTrainer } from '../src/utils/trainerCoherence.js';

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

// Execute the actual filter bodies with only the permission bindings imported by
// the component: injecting the whole namespace would hide a missing import.
const source = readFileSync(new URL('../src/pages/CentroManagers.jsx', import.meta.url), 'utf8');
const permissionImports = source.match(/import \{([^{}]+)\} from '\.\.\/config\/permissions';/)[1]
  .split(',').map(name => name.trim());
const importedPermissions = Object.fromEntries(permissionImports.map(name => [name, permissions[name]]));
const userData = readFileSync(new URL('../src/data/usersData.js', import.meta.url), 'utf8');
const normalizeSede = runInNewContext(
  `(${userData.match(/export const normalizeSede = ([\s\S]+?\n\});/)[1]})`,
  { canonicalSede }
);
const managers = [
  { id: 'local', sede: 'Lima', rol: 'Manager' },
  { id: 'remote', sede: 'Quito', rol: 'Manager' },
  { id: 'remote-manager', sede: 'Quito', rol: 'Gerente' },
  { id: 'global-qt', sede: 'Global', rol: 'QT' },
  { id: 'assigned', sede: 'Quito', rol: 'Manager', entrenadorEmail: 'trainer@example.test' },
].map(row => ({
  equipo: `Fixture ${row.id}`, estado: 'Activo', entrenadorEmail: 'other@example.test', ...row,
}));

for (const filter of ['filteredManagers', 'groupTeams']) {
  const marker = `const ${filter} = useMemo(() => {`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing ${filter} callback`);
  const end = source.indexOf('\n    });', start);
  assert.notEqual(end, -1, `missing ${filter} filter end`);
  const body = source.slice(start + marker.length, end + '\n    });'.length);
  const execute = (currentUser, viewAsTrainer = false, bindings = importedPermissions) => {
    let coordinatorCalls = 0;
    const context = {
      ...bindings,
      currentUser, managers, viewAsTrainer,
      canViewAll: permissions.canViewAllManagers(currentUser),
      canViewOwnSede: permissions.canViewSede(currentUser),
      currentTrainerName: 'Fixture Trainer',
      isTrainerRole: currentUser.roles.includes('entrenador'),
      matchesExplicitTrainer, normalizeSede,
      filterSede: '', filterEntrenador: '', filterEquipo: '', statusFilter: 'Todos', search: '',
    };
    if (context.isMaestriaCoordinator) {
      const officialHelper = context.isMaestriaCoordinator;
      context.isMaestriaCoordinator = user => {
        coordinatorCalls += 1;
        return officialHelper(user);
      };
    }
    const result = runInNewContext(
      `(() => { ${body} ${filter === 'groupTeams' ? 'return visibleManagers;' : ''} })()`,
      context
    );
    return { ids: Array.from(result, row => row.id), coordinatorCalls };
  };
  const profile = role => ({
    email: `${role}@example.test`, appRole: role, roles: [role], sede: 'Lima',
  });

  test(`${filter}: local QT reaches the official helper and preserves sede limits`, () => {
    const result = execute(profile('qt'));
    assert.ok(result.coordinatorCalls > 0, 'must not short-circuit before the missing identifier');
    assert.deepEqual(result.ids, ['local', 'global-qt']);
    const { isMaestriaCoordinator: _missing, ...brokenBindings } = importedPermissions;
    assert.throws(() => execute(profile('qt'), false, brokenBindings),
      { name: 'ReferenceError', message: 'isMaestriaCoordinator is not defined' });
  });

  test(`${filter}: existing hierarchy and trainer visibility stay unchanged`, () => {
    assert.deepEqual(execute(profile('gerente')).ids, ['local', 'global-qt']);
    for (const role of ['coord_maestria', 'coordinador_mj', 'coord_c1', 'capitan']) {
      assert.deepEqual(execute(profile(role)).ids, ['local', 'remote-manager'], role);
    }
    for (const role of ['direccion', 'director_maestria']) {
      assert.deepEqual(execute(profile(role)).ids, managers.map(row => row.id), role);
    }
    const trainer = { ...profile('entrenador'), email: 'trainer@example.test' };
    assert.deepEqual(execute(trainer, true).ids, ['assigned']);
    assert.deepEqual(execute(trainer).ids, ['assigned']);
    assert.deepEqual(execute(profile('miembro')).ids, ['local']);
    assert.deepEqual(execute({ ...profile('qt'), email: 'carlos.brunis@example.test' }).ids,
      managers.map(row => row.id));
  });
}
