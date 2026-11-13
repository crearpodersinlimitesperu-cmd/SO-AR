import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAutomaticDeadline, parseDeadlineDate } from '../src/utils/soarDates.js';

describe('soarDates: coherencia de fechas, horas límite y fases', () => {
  const sampleCycle = {
    id: 'EQ-32',
    name: 'Equipo 32',
    c1_start: '2026-11-06',
    c2_start: '2026-11-27',
    maestria_start: '2026-12-11',
    maestria_end: '2026-12-13'
  };

  it('calcula fechas sin desfase de zona horaria para reglas T-30, C1, POST-C1 y MJ', () => {
    assert.equal(calculateAutomaticDeadline({ id: 't30_salon', cyclePhase: 'PRE-C1' }, sampleCycle), '2026-10-07 18:00');
    assert.equal(calculateAutomaticDeadline({ id: 'c1_registro', cyclePhase: 'C1' }, sampleCycle), '2026-11-06 08:00');
    assert.equal(calculateAutomaticDeadline({ id: 'postc1_devolucion', cyclePhase: 'POST-C1' }, sampleCycle), '2026-11-09 12:00');
    assert.equal(calculateAutomaticDeadline({ id: 'mj_imposibles', cyclePhase: 'MJ' }, sampleCycle), '2026-12-12 15:00');
  });

  it('calcula PRE-C2 relativo a c2_start (-3 días) y no a c1_start', () => {
    const deadline = calculateAutomaticDeadline({ id: 'custom_prec2', cyclePhase: 'PRE-C2' }, sampleCycle);
    assert.equal(deadline, '2026-11-24 18:00');
  });

  it('parseDeadlineDate parsea formatos YYYY-MM-DD HH:mm e ISO sin Invalid Date', () => {
    const d1 = parseDeadlineDate('2026-11-13 18:00');
    assert.ok(d1 instanceof Date && !isNaN(d1.getTime()));
    assert.equal(d1.getFullYear(), 2026);
    assert.equal(d1.getMonth(), 10);
    assert.equal(d1.getDate(), 13);
    assert.equal(d1.getHours(), 18);

    const d2 = parseDeadlineDate('2026-11-13T18:00:00Z');
    assert.ok(d2 instanceof Date && !isNaN(d2.getTime()));

    assert.equal(parseDeadlineDate('fecha-invalida'), null);
    assert.equal(parseDeadlineDate(''), null);
  });
});
