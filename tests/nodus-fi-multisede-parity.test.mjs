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

test('Nodus FI Anti-Falsificación: Detección y purga de placeholders genéricos', async () => {
  const { isSyntheticPlaceholder, evaluarCalidadOntologicaFI } = await import('../src/services/nodusFIAgent.js');

  // 1. Textos genéricos falsos deben ser detectados como synthetic
  assert.strictEqual(
    isSyntheticPlaceholder('Estándar superior alcanzado y validado en Nodus Maestría del Juego'),
    true,
    'Debe detectar placeholder de Salud'
  );
  assert.strictEqual(
    isSyntheticPlaceholder('Meta financiera cuantificable aprobada y en seguimiento de 90 días'),
    true,
    'Debe detectar placeholder de Finanzas'
  );
  assert.strictEqual(
    isSyntheticPlaceholder('Liderazgo transformacional y resultados de alto impacto'),
    true,
    'Debe detectar placeholder de Relaciones'
  );

  // 2. Metas reales auténticas NO deben ser detectadas como synthetic
  assert.strictEqual(
    isSyntheticPlaceholder('Reducir 10kg de grasa corporal y entrenar 5 veces por semana con plan medido'),
    false,
    'Meta real no debe ser synthetic'
  );
  assert.strictEqual(
    isSyntheticPlaceholder('Facturar $15,000 USD mensuales netos en mi negocio de consultoría'),
    false,
    'Meta real cuantificable no debe ser synthetic'
  );

  // 3. Evaluar calidad ontológica de placeholder sintético debe resultar en NO_PRESENTADO
  const evalPlaceholder = evaluarCalidadOntologicaFI('Salud', 'Salud', 'Estándar superior alcanzado y validado en Nodus Maestría del Juego');
  assert.strictEqual(evalPlaceholder.nivel, 'NO_PRESENTADO', 'Placeholder sintético debe ser catalogado como NO_PRESENTADO');
  assert.strictEqual(evalPlaceholder.puntaje, 0, 'Puntaje de placeholder debe ser 0');
});
