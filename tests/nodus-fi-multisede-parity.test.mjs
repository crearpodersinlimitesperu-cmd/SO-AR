import test from 'node:test';
import assert from 'node:assert/strict';
import { ejecutarDiagnosticoFIs } from '../src/services/nodusFIAgent.js';
import { NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES } from '../src/data/nodusFuturosImposiblesData.js';

test('Nodus FI Diagnostico: Paridad multisede y filtrado por sede', () => {
  // 1. Filtrado para sede Cuenca
  const diagCuenca = ejecutarDiagnosticoFIs(
    NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES,
    'Cuenca',
    'Todos',
    'TODOS',
    '',
    'TODOS'
  );

  assert.ok(diagCuenca.participantes.length > 0, 'Debe haber participantes en Cuenca');
  assert.ok(
    diagCuenca.participantes.every(p => p.sede.toLowerCase().includes('cuenca')),
    'Todos los participantes en filtro Cuenca deben pertenecer a Cuenca'
  );
  assert.ok(diagCuenca.metricas.equiposList.length > 0, 'Debe haber equipos para Cuenca');
  assert.ok(
    diagCuenca.metricas.equiposList.every(eq => eq.sede.toLowerCase().includes('cuenca')),
    'Todos los equipos en semáforo de Cuenca deben ser de Cuenca'
  );

  // 2. Filtrado para sede Quito
  const diagQuito = ejecutarDiagnosticoFIs(
    NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES,
    'Quito',
    'Todos',
    'TODOS',
    '',
    'TODOS'
  );
  assert.ok(diagQuito.participantes.length > 0, 'Debe haber participantes en Quito');
  assert.ok(
    diagQuito.participantes.every(p => p.sede.toLowerCase().includes('quito')),
    'Todos los participantes en filtro Quito deben pertenecer a Quito'
  );

  // 3. Vista GLOBAL
  const diagGlobal = ejecutarDiagnosticoFIs(
    NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES,
    'GLOBAL',
    'Todos',
    'TODOS',
    '',
    'TODOS'
  );
  assert.strictEqual(
    diagGlobal.participantes.length,
    NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES.length,
    'Vista global debe contener todos los participantes'
  );

  // Validar que en vista global existen equipos de múltiples sedes
  const sedesEncontradas = new Set(diagGlobal.metricas.equiposList.map(eq => eq.sede.toLowerCase()));
  assert.ok(sedesEncontradas.has('lima'), 'Debe incluir Lima');
  assert.ok(sedesEncontradas.has('quito'), 'Debe incluir Quito');
  assert.ok(sedesEncontradas.has('cuenca'), 'Debe incluir Cuenca');
  assert.ok(sedesEncontradas.has('guayaquil'), 'Debe incluir Guayaquil');
});
