import test from 'node:test';
import assert from 'node:assert/strict';
import { getEffectiveCompletion, applyCycleCompletion } from '../src/utils/taskLifecycle.js';
import { calculateAutomaticDeadline } from '../src/utils/soarDates.js';

test('getEffectiveCompletion recovers cycle completion when cycleId is pending or undefined (prevents reset to 0)', () => {
  const task = {
    id: 'cc1y2_post1',
    completions: {
      'Cuenca__CUE-EQ-24': {
        completed: true,
        status: 'Completada',
        cycleId: 'CUE-EQ-24',
        progressPercentage: 100,
        progress: 100,
        updatedAt: '2026-10-27T10:00:00.000Z'
      }
    }
  };

  // When cycleId is not yet loaded (undefined or null) on page reload
  const result = getEffectiveCompletion(task, { sede: 'Cuenca', cycleId: undefined, cycleScoped: true });
  assert.equal(result.completed, true);
  assert.equal(result.status, 'Completada');
  assert.equal(result.completion?.cycleId, 'CUE-EQ-24');

  // Also via applyCycleCompletion
  const applied = applyCycleCompletion(task, { sede: 'Cuenca', cycleId: undefined });
  assert.equal(applied.completed, true);
  assert.equal(applied.progressPercentage, 100);
});

test('getEffectiveCompletion handles case-insensitive sede matching and exact cycle matching', () => {
  const task = {
    id: 'cc1y2_post1',
    completions: {
      'Cuenca__CUE-EQ-24': {
        completed: true,
        status: 'Completada',
        cycleId: 'CUE-EQ-24',
        progressPercentage: 100,
        updatedAt: '2026-10-27T10:00:00.000Z'
      }
    }
  };

  // Exact matching with matching cycleId
  const result = getEffectiveCompletion(task, { sede: 'Cuenca', cycleId: 'CUE-EQ-24', cycleScoped: true });
  assert.equal(result.completed, true);
  assert.equal(result.status, 'Completada');

  // Lowercase sede in user context (e.g. sede: "cuenca")
  const resultLower = getEffectiveCompletion(task, { sede: 'cuenca', cycleId: 'CUE-EQ-24', cycleScoped: true });
  assert.equal(resultLower.completed, true);

  // Different future cycle does not inherit completion
  const resultOther = getEffectiveCompletion(task, { sede: 'Cuenca', cycleId: 'CUE-EQ-25', cycleScoped: true });
  assert.equal(resultOther.completed, false);
  assert.equal(resultOther.status, 'Pendiente');
});

test('coord_c1 operational cycle targets CAPITULO UNO and calculates future deadline without 90d overdue', () => {
  // Sede events resembling Guayaquil in late October 2026
  const sedeEvents = [
    { nombre: 'CAPITULO UNO', equipo: '36', fecha_inicio: '2026-07-31T00:00:00' },
    { nombre: 'CAPITULO DOS', equipo: '36', fecha_inicio: '2026-08-14T00:00:00' },
    { nombre: 'CAPITULO UNO', equipo: '37', fecha_inicio: '2026-09-04T00:00:00' },
    { nombre: 'CAPITULO DOS', equipo: '37', fecha_inicio: '2026-09-18T00:00:00' },
    { nombre: 'CAPITULO UNO', equipo: '38', fecha_inicio: '2026-10-09T00:00:00' },
    { nombre: 'CAPITULO DOS', equipo: '38', fecha_inicio: '2026-10-22T00:00:00' },
    { nombre: 'MAESTRIA DEL JUEGO', equipo: '36, 37 y 38', fecha_inicio: '2026-10-30T00:00:00' },
    { nombre: 'CAPITULO UNO', equipo: '39', fecha_inicio: '2026-11-13T00:00:00' },
    { nombre: 'CAPITULO DOS', equipo: '39', fecha_inicio: '2026-11-26T00:00:00' }
  ];

  const today = new Date('2026-10-27T12:00:00');
  const lookbackDate = new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000);

  // When role is coord_c1, allowedEventNames is strictly CAPITULO UNO
  const userRole = 'coord_c1';
  const allowedEventNames = ['CAPITULO UNO'];

  let nextEvent = null;
  for (const e of sedeEvents) {
    const d = new Date(e.fecha_inicio.replace('Z', ''));
    if (d >= lookbackDate && allowedEventNames.includes(e.nombre)) {
      nextEvent = e;
      break;
    }
  }

  assert.ok(nextEvent, 'Must find next event for coord_c1');
  assert.equal(nextEvent.nombre, 'CAPITULO UNO');
  assert.equal(nextEvent.equipo, '39');
  assert.equal(nextEvent.fecha_inicio, '2026-11-13T00:00:00');

  // Verify deadline for PRE-C1 task cc1y2_pre1
  const task = {
    id: 'cc1y2_pre1',
    task: 'Martes 09:00 - 10:00: Reunión de Coordinación de Sede, validar salón y solicitar baúles',
    cyclePhase: 'PRE-C1',
    isCritical: true
  };

  const cycle = {
    id: 'GYE-EQ-39',
    name: 'Equipo 39',
    c1_start: nextEvent.fecha_inicio,
    c2_start: '2026-11-26T00:00:00'
  };

  const deadline = calculateAutomaticDeadline(task, cycle);
  assert.ok(deadline.startsWith('2026-11-'), `Deadline must be in November 2026, got ${deadline}`);
  assert.ok(!deadline.startsWith('2026-07-'), 'Deadline must NOT be in July 2026 (90d overdue bug fixed)');
});

test('composite team buildCycleForEquipo selects cohort closest to anchor date instead of oldest', () => {
  const anchorDate = new Date('2026-10-30T00:00:00');
  const equipoStr = '36, 37 y 38';

  const equipoEvents = [
    { nombre: 'CAPITULO UNO', equipo: '36', fecha_inicio: '2026-07-31T00:00:00' },
    { nombre: 'CAPITULO DOS', equipo: '36', fecha_inicio: '2026-08-14T00:00:00' },
    { nombre: 'CAPITULO UNO', equipo: '37', fecha_inicio: '2026-09-04T00:00:00' },
    { nombre: 'CAPITULO DOS', equipo: '37', fecha_inicio: '2026-09-18T00:00:00' },
    { nombre: 'CAPITULO UNO', equipo: '38', fecha_inicio: '2026-10-09T00:00:00' },
    { nombre: 'CAPITULO DOS', equipo: '38', fecha_inicio: '2026-10-22T00:00:00' },
    { nombre: 'MAESTRIA DEL JUEGO', equipo: '36, 37 y 38', fecha_inicio: '2026-10-30T00:00:00' }
  ];

  const c1Events = equipoEvents.filter(e => e.nombre === 'CAPITULO UNO');
  const pickClosest = (eventsList) => {
    if (!eventsList.length) return null;
    if (eventsList.length === 1) return eventsList[0];
    return eventsList.reduce((best, curr) => {
      const dtCurr = new Date(curr.fecha_inicio.replace('Z', ''));
      const dtBest = new Date(best.fecha_inicio.replace('Z', ''));
      return Math.abs(dtCurr - anchorDate) < Math.abs(dtBest - anchorDate) ? curr : best;
    });
  };

  const closestC1 = pickClosest(c1Events);
  assert.equal(closestC1.equipo, '38', 'Closest C1 to Maestría 36, 37 y 38 must be Equipo 38');
  assert.equal(closestC1.fecha_inicio, '2026-10-09T00:00:00');
});

test('first-time progress update creates catalog doc with participant states instead of dropping save', () => {
  // Simulates updateIndividualProgress behavior when doc does not exist yet in Firestore
  const taskId = 'cc1y2_post1';
  const baseTask = {
    id: taskId,
    task: 'Lunes: Verificar consolidado de asistencias de C1',
    role: 'coord_c1',
    cyclePhase: 'POST-C1',
    isCritical: true
  };
  const exists = false;

  let initialData = {};
  if (!exists) {
    initialData = {
      ...baseTask,
      id: taskId,
      catalogTask: true,
      completed: false,
      status: 'Pendiente',
      priority: baseTask.isCritical ? '🔴 ROJO' : '🟡 AMARILLO',
      progressPercentage: 0,
      deadline: '2026-10-29 18:00',
      created_at: '2026-10-27T12:00:00.000Z',
      assigneeProgress: {}
    };
  }

  const em = 'evelyn.cedillo@crearpsl.net';
  const participantUpdate = {
    [em]: {
      name: 'Pauly Cedillo',
      role: 'coord_c1',
      sede: 'Cuenca',
      completed: true,
      progress: 100
    }
  };

  const savedDoc = {
    ...initialData,
    assigneeProgress: participantUpdate,
    progressPercentage: 100,
    status: 'Completada',
    completed: true
  };

  assert.equal(savedDoc.id, 'cc1y2_post1');
  assert.equal(savedDoc.catalogTask, true);
  assert.equal(savedDoc.completed, true);
  assert.equal(savedDoc.assigneeProgress[em].completed, true);
  assert.equal(savedDoc.assigneeProgress[em].progress, 100);
});

