import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAINING_FILTER_TYPES,
  matchesTrainingType,
  matchesSelectedTrainingTypes,
  formatSelectedTrainingLabel,
} from '../src/utils/trainingTypeFilter.js';

test('TRAINING_FILTER_TYPES incluye opciones individuales para cada entrenamiento', () => {
  const ids = TRAINING_FILTER_TYPES.map((item) => item.id);
  assert.deepEqual(ids, [
    'C1',
    'C2',
    'MJ',
    'CAMINATA',
    'TANQUE',
    'CONFIANZA',
    'VIAJE',
    'OTROS',
  ]);
});

test('matchesSelectedTrainingTypes con array vacio retorna true para todos', () => {
  assert.equal(matchesSelectedTrainingTypes('Tanque', []), true);
  assert.equal(matchesSelectedTrainingTypes('Caminata sobre Fuego', []), true);
  assert.equal(matchesSelectedTrainingTypes('Capítulo 1', []), true);
});

test('matchesSelectedTrainingTypes filtra cada entrenamiento de manera individual', () => {
  assert.equal(matchesSelectedTrainingTypes('Tanque Lima', ['TANQUE']), true);
  assert.equal(matchesSelectedTrainingTypes('Caminata sobre Fuego', ['TANQUE']), false);

  assert.equal(matchesSelectedTrainingTypes('Caminata sobre Fuego', ['CAMINATA']), true);
  assert.equal(matchesSelectedTrainingTypes('Firewalk VIP', ['CAMINATA']), true);
  assert.equal(matchesSelectedTrainingTypes('Tanque Lima', ['CAMINATA']), false);

  assert.equal(matchesSelectedTrainingTypes('Noche de Confianza', ['CONFIANZA']), true);
  assert.equal(matchesSelectedTrainingTypes('Tanque', ['CONFIANZA']), false);

  assert.equal(matchesSelectedTrainingTypes('Capitulo 1', ['C1']), true);
  assert.equal(matchesSelectedTrainingTypes('Capítulo 2', ['C2']), true);
  assert.equal(matchesSelectedTrainingTypes('Maestria del Juego 34', ['MJ']), true);
  assert.equal(matchesSelectedTrainingTypes('Retiro Internacional Cusco', ['VIAJE']), true);
});

test('matchesSelectedTrainingTypes permite seleccionar varios entrenamientos al tiempo (ej. Tanque y Caminata)', () => {
  const selected = ['TANQUE', 'CAMINATA'];
  assert.equal(matchesSelectedTrainingTypes('Tanque', selected), true);
  assert.equal(matchesSelectedTrainingTypes('Caminata sobre Fuego', selected), true);
  assert.equal(matchesSelectedTrainingTypes('Noche de Confianza', selected), false);
  assert.equal(matchesSelectedTrainingTypes('Capítulo 1', selected), false);
});

test('matchesTrainingType distingue OTROS solo cuando no cae en categorias principales', () => {
  assert.equal(matchesTrainingType('Taller Especial de Liderazgo', 'OTROS'), true);
  assert.equal(matchesTrainingType('Tanque', 'OTROS'), false);
  assert.equal(matchesTrainingType('Caminata sobre Fuego', 'OTROS'), false);
});

test('formatSelectedTrainingLabel resume correctamente 0, 1, 2 y 3+ selecciones', () => {
  assert.equal(formatSelectedTrainingLabel([]), 'Todos los tipos');
  assert.equal(formatSelectedTrainingLabel(['TANQUE']), 'Tanque');
  assert.equal(
    formatSelectedTrainingLabel(['TANQUE', 'CAMINATA']),
    'Tanque + Caminata sobre Fuego',
  );
  assert.equal(
    formatSelectedTrainingLabel(['C1', 'C2', 'MJ']),
    'Capítulo 1 +2 más',
  );
});
