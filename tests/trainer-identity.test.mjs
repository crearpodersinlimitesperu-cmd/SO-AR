import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENTRENADORES_INACTIVOS_LIST, normalizeTrainer, isInactiveTrainer } from '../src/data/trainerIdentity.js';
import * as directory from '../src/data/managersData.js';

test('directory preserves its trainer identity API without duplicate implementations', () => {
  assert.equal(directory.normalizeTrainer, normalizeTrainer);
  assert.equal(directory.isInactiveTrainer, isInactiveTrainer);
  assert.equal(directory.ENTRENADORES_INACTIVOS_LIST, ENTRENADORES_INACTIVOS_LIST);
});

test('normalization preserves aliases, accents, case, whitespace and unknown names', () => {
  for (const [input, expected] of [
    [' DANIELA MONROY ', 'Daniela Monroy Fabbri'],
    ['Erika Gavilánez', 'Erika Gissell Gavilanez Gallardo'],
    ['Lourdes Patiño', 'María De Lourdes Patiño Galarraga'],
    ['Fredy Sosa', 'David Sosa'],
    ['Edison Paul Sosa', 'Paul Sosa'],
    ['  KRISCIA   QUISPE ', 'Kriscia Rodas'],
    ['José Torrón', 'Jose Torron'],
    ['María José Román', 'Maria Jose Roman'],
    [' Nuevo Entrenador ', 'Nuevo Entrenador'],
    ['', ''],
    [null, ''],
    [undefined, '']
  ]) assert.equal(normalizeTrainer(input), expected, String(input));
});

test('all inactive aliases remain denied and active/unknown names remain unaffected', () => {
  assert.deepEqual(ENTRENADORES_INACTIVOS_LIST, ['Ana Cristina Sanchez', 'Christian Tito', 'Jose Torron', 'Kriscia Rodas', 'Maria Jose Roman', 'Pamela Carrillo']);
  for (const name of [...ENTRENADORES_INACTIVOS_LIST, 'Ana Cristina Sánchez', ' KRISCIA  LISZET RODAS QUISPE ', 'kriscia quispe', 'JOSÉ TORRÓN', 'María José Román']) {
    assert.equal(isInactiveTrainer(name), true, name);
  }
  for (const name of ['Fredy Sosa', 'Edison Paul Sosa', 'Daniela Monroy', 'Nuevo Entrenador', '', null, undefined]) {
    assert.equal(isInactiveTrainer(name), false, String(name));
  }
});

test('authentication only imports the small identity module, not the managers directory', () => {
  const auth = readFileSync(new URL('../src/context/AuthContext.jsx', import.meta.url), 'utf8');
  const identity = readFileSync(new URL('../src/data/trainerIdentity.js', import.meta.url), 'utf8');
  assert.match(auth, /import \{ isInactiveTrainer \} from '\.\.\/data\/trainerIdentity'/);
  assert.doesNotMatch(auth, /from ['"][^'"]*managersData/);
  assert.doesNotMatch(identity, /\bimport\b|INITIAL_MANAGERS|LIQUIDACIONES_DATA/);
});
