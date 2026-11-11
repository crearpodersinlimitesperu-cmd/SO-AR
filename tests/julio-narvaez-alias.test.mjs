import test from 'node:test';
import assert from 'node:assert/strict';
import { nombreLegalEntrenador, normalizarIdentidadEntrenador } from '../src/data/trainerAliases.js';
import { normalizeTrainer } from '../src/data/trainerIdentity.js';
import { normalizeTrainerName } from '../src/data/trainerDictionary.js';
import { normalizeCoordinator } from '../src/data/managersData.js';

test('julio narvaez y julo cersar navaez resuelven al mismo nombre legal en trainerAliases', () => {
  const legal1 = nombreLegalEntrenador('Julio Narvaez');
  const legal2 = nombreLegalEntrenador('Julio Cesar Narvaez');
  const legal3 = nombreLegalEntrenador('julo cersar navaez');
  const legal4 = nombreLegalEntrenador('Julio César Narváez Mora');
  const legal5 = nombreLegalEntrenador('Julio Navaez');

  assert.equal(legal1, 'Julio César Narváez');
  assert.equal(legal2, 'Julio César Narváez');
  assert.equal(legal3, 'Julio César Narváez');
  assert.equal(legal4, 'Julio César Narváez');
  assert.equal(legal5, 'Julio César Narváez');
});

test('todas las variantes de Julio Narvaez resuelven a la misma identidad canónica en trainerIdentity', () => {
  const norm1 = normalizeTrainer('Julio Narvaez');
  const norm2 = normalizeTrainer('Julio Cesar Narvaez');
  const norm3 = normalizeTrainer('julo cersar navaez');
  const norm4 = normalizeTrainer('Julio César Narváez Mora');
  const norm5 = normalizeTrainer('Julo Cesar Narvaez');

  assert.equal(norm1, 'Julio Narvaez');
  assert.equal(norm2, 'Julio Narvaez');
  assert.equal(norm3, 'Julio Narvaez');
  assert.equal(norm4, 'Julio Narvaez');
  assert.equal(norm5, 'Julio Narvaez');
});

test('trainerDictionary normaliza variantes hacia JULIO CESAR NARVAEZ', () => {
  assert.equal(normalizeTrainerName('JULIO NARVAEZ'), 'JULIO CESAR NARVAEZ');
  assert.equal(normalizeTrainerName('JULIO CESAR NARVAEZ'), 'JULIO CESAR NARVAEZ');
  assert.equal(normalizeTrainerName('JULO CERSAR NAVAEZ'), 'JULIO CESAR NARVAEZ');
  assert.equal(normalizeTrainerName('CREACIÓN: JULIO NARVAEZ'), 'JULIO CESAR NARVAEZ');
});

test('normalizeCoordinator unifica variantes de Julio Narvaez', () => {
  assert.equal(normalizeCoordinator('JULIO NARVAEZ'), 'JULIO CESAR NARVAEZ');
  assert.equal(normalizeCoordinator('JULO CERSAR NAVAEZ'), 'JULIO CESAR NARVAEZ');
  assert.equal(normalizeCoordinator('JULIO CESAR NARVAEZ MORA'), 'JULIO CESAR NARVAEZ');
});
