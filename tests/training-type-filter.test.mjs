import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAINING_FILTER_TYPES,
  matchesTrainingType,
  matchesSelectedTrainingTypes,
  formatSelectedTrainingLabel,
} from '../src/utils/trainingTypeFilter.js';

test('TRAINING_FILTER_TYPES incluye opciones individuales reales (incluyendo El Viaje)', () => {
  const ids = TRAINING_FILTER_TYPES.map((item) => item.id);
  assert.deepEqual(ids, [
    'C1',
    'C2',
    'MJ',
    'VIAJE',
    'CAMINATA',
    'TANQUE',
    'CONFIANZA',
    'ROMPIMIENTO',
    'IMPACTO',
    'REVISION',
    'OTROS',
  ]);
  const viaje = TRAINING_FILTER_TYPES.find((item) => item.id === 'VIAJE');
  assert.equal(viaje?.label, 'El Viaje');
});

test('matchesSelectedTrainingTypes con array vacio retorna true para todos', () => {
  assert.equal(matchesSelectedTrainingTypes('TANQUE', []), true);
  assert.equal(matchesSelectedTrainingTypes('CAMINATA SOBRE FUEGO', []), true);
  assert.equal(matchesSelectedTrainingTypes('EL VIAJE', []), true);
});

test('matchesSelectedTrainingTypes filtra cada entrenamiento real de manera individual', () => {
  assert.equal(matchesSelectedTrainingTypes('TANQUE', ['TANQUE']), true);
  assert.equal(matchesSelectedTrainingTypes('CAMINATA SOBRE FUEGO', ['TANQUE']), false);

  assert.equal(matchesSelectedTrainingTypes('CAMINATA SOBRE FUEGO', ['CAMINATA']), true);
  assert.equal(matchesSelectedTrainingTypes('TANQUE', ['CAMINATA']), false);

  assert.equal(matchesSelectedTrainingTypes('EL VIAJE', ['VIAJE']), true);
  assert.equal(matchesSelectedTrainingTypes('CAIDA DE CONFIANZA', ['CONFIANZA']), true);
  assert.equal(matchesSelectedTrainingTypes('ROMPIMIENTO B.', ['ROMPIMIENTO']), true);
  assert.equal(matchesSelectedTrainingTypes('IMPACTO CREACION', ['IMPACTO']), true);
  assert.equal(matchesSelectedTrainingTypes('REVISION DE FI', ['REVISION']), true);

  assert.equal(matchesSelectedTrainingTypes('CAPITULO UNO', ['C1']), true);
  assert.equal(matchesSelectedTrainingTypes('CAPITULO DOS', ['C2']), true);
  assert.equal(matchesSelectedTrainingTypes('MAESTRIA DEL JUEGO', ['MJ']), true);
});

test('matchesSelectedTrainingTypes permite seleccionar varios entrenamientos al tiempo (ej. Tanque y Caminata)', () => {
  const selected = ['TANQUE', 'CAMINATA'];
  assert.equal(matchesSelectedTrainingTypes('TANQUE', selected), true);
  assert.equal(matchesSelectedTrainingTypes('CAMINATA SOBRE FUEGO', selected), true);
  assert.equal(matchesSelectedTrainingTypes('EL VIAJE', selected), false);
  assert.equal(matchesSelectedTrainingTypes('CAPITULO UNO', selected), false);
});

test('matchesTrainingType distingue OTROS solo cuando no cae en categorias principales', () => {
  assert.equal(matchesTrainingType('Taller Especial de Liderazgo', 'OTROS'), true);
  assert.equal(matchesTrainingType('TANQUE', 'OTROS'), false);
  assert.equal(matchesTrainingType('EL VIAJE', 'OTROS'), false);
});

test('formatSelectedTrainingLabel resume correctamente 0, 1, 2 y 3+ selecciones', () => {
  assert.equal(formatSelectedTrainingLabel([]), 'Todos los tipos');
  assert.equal(formatSelectedTrainingLabel(['TANQUE']), 'Tanque');
  assert.equal(
    formatSelectedTrainingLabel(['TANQUE', 'CAMINATA']),
    'Tanque + Caminata sobre Fuego',
  );
  assert.equal(
    formatSelectedTrainingLabel(['VIAJE', 'TANQUE', 'CAMINATA']),
    'El Viaje +2 más',
  );
});
