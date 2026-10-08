import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTeamKeyResolver } from './teamGrouping.js';

const managers = [
  { nombre: 'Dayana Tamayo', equipo: 'KAIZEN MAINICHI', numEquipo: 122, sede: 'Quito' },
  { nombre: 'Viviana Ruiz', equipo: 'KAIZEN MAINICHI', numEquipo: 122, sede: 'Quito' },
  { nombre: 'Ivan Tinillo', equipo: 'KAIZEN MAINICHI', numEquipo: 124, sede: 'Quito' },
  { nombre: 'Doris Balseca', equipo: 'Kaizen Mainichi ', numEquipo: '124', sede: 'Quito' },
];

test('same-named teams with different numbers are kept separate', () => {
  const keyOf = buildTeamKeyResolver(managers);
  assert.equal(keyOf(managers[0]), keyOf(managers[1]));
  assert.equal(keyOf(managers[2]), keyOf(managers[3]));
  assert.notEqual(keyOf(managers[0]), keyOf(managers[2]));
});

test('a member without number joins the only numbered team of that name', () => {
  const list = [
    { equipo: 'ALFA MURI', numEquipo: 121, sede: 'Quito' },
    { equipo: 'ALFA MURI', sede: 'Quito' },
  ];
  const keyOf = buildTeamKeyResolver(list);
  assert.equal(keyOf(list[1]), keyOf(list[0]));
});

test('a member without number stays apart when the name is ambiguous', () => {
  const keyOf = buildTeamKeyResolver([...managers, { equipo: 'KAIZEN MAINICHI', sede: 'Quito' }]);
  const orphan = keyOf({ equipo: 'KAIZEN MAINICHI', sede: 'Quito' });
  assert.notEqual(orphan, keyOf(managers[0]));
  assert.notEqual(orphan, keyOf(managers[2]));
});

test('same name in different sedes stays separate', () => {
  const keyOf = buildTeamKeyResolver([]);
  assert.notEqual(
    keyOf({ equipo: 'LOBOS', numEquipo: 5, sede: 'Quito' }),
    keyOf({ equipo: 'LOBOS', numEquipo: 5, sede: 'Lima' })
  );
});
