import test from 'node:test';
import assert from 'node:assert/strict';
import {
  campoAsignacionSlot,
  extraerPreasignaciones,
  resolverSugerenciaEntrenador,
} from './trainerAssignments.js';

test('parses distinct calendar suggestions and removes duplicate identities', () => {
  assert.deepEqual(
    extraerPreasignaciones('Fer Aragón / Fernando Aragón; Ana Elena Monroy'),
    ['Fer Aragón', 'Ana Elena Monroy']
  );
});

test('a single legacy name is a candidate only for the first MJ slot and remains a reference elsewhere', () => {
  const suggestions = ['Creación', 'Relación', 'Gratitud'].map((_, index) =>
    resolverSugerenciaEntrenador(['Ana Elena Monroy'], index, true)
  );
  assert.deepEqual(suggestions, [
    { candidato: 'Ana Elena Monroy', referencia: 'Ana Elena Monroy', referenciaGeneral: true },
    { candidato: '', referencia: 'Ana Elena Monroy', referenciaGeneral: true },
    { candidato: '', referencia: 'Ana Elena Monroy', referenciaGeneral: true },
  ]);
});

test('multiple calendar names map to their corresponding MJ slot without fallback', () => {
  const calendarNames = ['Ana Elena Monroy', 'Mike Boada'];
  assert.deepEqual(
    [0, 1, 2].map(index => resolverSugerenciaEntrenador(calendarNames, index, true).candidato),
    ['Ana Elena Monroy', 'Mike Boada', '']
  );
});

test('a saved assignment update contains only its selected slot', () => {
  assert.deepEqual(campoAsignacionSlot('Relación', { entrenador: 'Mike Boada' }), {
    'Relación': { entrenador: 'Mike Boada' },
  });
  assert.deepEqual(campoAsignacionSlot('Gratitud', null), { Gratitud: null });
});
