import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAINER_CALENDAR_SYNC_AGENT_ID,
  ajustarFechaFinCalendario,
  applyAsignadorAuthoritativeProjection,
  computeCalendarProjectionPlan,
  extractTeamDigitsKey,
  indexAssignmentsForLookup,
  matchAssignmentForEvent,
} from './trainerCalendarSyncAgent.js';

test('never displays unconfirmed Google Sheet trainers (e.g. Cuenca) when unassigned in /asignador-entrenadores', () => {
  const rawCuencaEvents = [
    {
      sede: 'CUE',
      fecha_inicio: '2026-10-29T00:00:00',
      fecha_fin: '2026-11-01T00:00:00',
      nombre: 'CAPITULO DOS',
      equipo: '24',
      trainer: 'JUAN ANGEL ARREOLA MORALES',
    },
    {
      sede: 'CUE',
      fecha_inicio: '2026-10-31T00:00:00',
      fecha_fin: '2026-10-31T00:00:00',
      nombre: 'TANQUE',
      equipo: '23',
      trainer: 'MILDRED MUÑOZ VASQUEZ',
    },
  ];

  const projected = applyAsignadorAuthoritativeProjection({
    rawEvents: rawCuencaEvents,
    assignments: [],
    overrides: {},
    customEvents: [],
  });

  assert.equal(projected.length, 2);
  assert.equal(projected[0].trainer, '');
  assert.equal(projected[0].entrenador, '');
  assert.equal(projected[0].sheetTrainer, 'JUAN ANGEL ARREOLA MORALES');
  assert.equal(projected[0].assignmentSource, 'unassigned_in_asignador');

  assert.equal(projected[1].trainer, '');
  assert.equal(projected[1].entrenador, '');
  assert.equal(projected[1].sheetTrainer, 'MILDRED MUÑOZ VASQUEZ');
  assert.equal(projected[1].assignmentSource, 'unassigned_in_asignador');
});

test('matches confirmed assignments across team formatting variants (29, 30 y 31 vs 293031) and date overrides', () => {
  assert.equal(extractTeamDigitsKey('29, 30 y 31'), '293031');
  assert.equal(extractTeamDigitsKey('293031'), '293031');

  const assignments = [
    {
      id: '2026-10-09__Lima__MAESTRIA DEL JUEGO__293031',
      sede: 'Lima',
      entrenamiento: 'MAESTRIA DEL JUEGO',
      fechaInicio: '2026-10-09T00:00:00',
      equipo: '293031',
      Creación: { entrenador: 'PONCE DE LEON HERNANDEZ ALFONSO' },
      Relación: { entrenador: 'MILDRED MUÑOZ VASQUEZ' },
    },
    {
      id: '2026-10-08__Lima__CAMINATA SOBRE FUEGO',
      sede: 'Lima',
      entrenamiento: 'CAMINATA SOBRE FUEGO',
      fechaInicio: '2026-11-12T00:00:00',
      equipo: '31',
      unico: { entrenador: 'CRISTHIAN MANUEL MENDEZ TORRES' },
    },
  ];

  const index = indexAssignmentsForLookup(assignments);
  const mjEvent = {
    sede: 'LIM',
    start: '2026-10-09T00:00:00',
    name: 'MAESTRIA DEL JUEGO',
    equipo: '29, 30 y 31',
  };
  const matchedMj = matchAssignmentForEvent(mjEvent, index, 'Lima');
  assert.ok(matchedMj);
  assert.equal(matchedMj.Creación.entrenador, 'PONCE DE LEON HERNANDEZ ALFONSO');

  const firewalkOverridden = {
    sede: 'LIM',
    start: '2026-11-12T00:00:00',
    name: 'CAMINATA SOBRE FUEGO',
    equipo: '31',
  };
  const matchedFirewalk = matchAssignmentForEvent(firewalkOverridden, index, 'Lima');
  assert.ok(matchedFirewalk);
  assert.equal(matchedFirewalk.unico.entrenador, 'CRISTHIAN MANUEL MENDEZ TORRES');
});

test('adjusts end dates for 1-day complementary events and Sunday-ending weekend trainings', () => {
  assert.equal(ajustarFechaFinCalendario('TANQUE', '2026-10-31T00:00:00', '2026-11-02T00:00:00'), '2026-10-31T00:00:00');
  assert.equal(ajustarFechaFinCalendario('CAPITULO UNO', '2026-10-16T00:00:00', '2026-10-17T00:00:00'), '2026-10-18T00:00:00');
});

test('detects drift between canonical /asignador-entrenadores and public projections', () => {
  const canonicalAssignments = {
    '2026-10-15__Cuenca__CAPITULO DOS__24': {
      entrenamiento: 'CAPITULO DOS',
      sede: 'Cuenca',
      fechaInicio: '2026-10-15T00:00:00',
      equipo: '24',
      unico: { entrenador: 'CRISTHIAN MANUEL MENDEZ TORRES', fechaIso: '2026-10-21T15:00:00Z' },
    },
  };

  const planWithDrift = computeCalendarProjectionPlan({
    assignments: canonicalAssignments,
    overrides: {},
    customEvents: [],
    publicAssignments: [],
    publicOperational: [],
  });

  assert.equal(planWithDrift.inSync, false);
  assert.equal(planWithDrift.assignmentsToWrite.length, 1);
  assert.equal(planWithDrift.assignmentsToWrite[0].payload.syncedByAgent, TRAINER_CALENDAR_SYNC_AGENT_ID);

  const planInSync = computeCalendarProjectionPlan({
    assignments: canonicalAssignments,
    overrides: {},
    customEvents: [],
    publicAssignments: [
      {
        id: '2026-10-15__Cuenca__CAPITULO DOS__24',
        ...planWithDrift.assignmentsToWrite[0].payload,
      },
    ],
    publicOperational: [],
  });

  assert.equal(planInSync.inSync, true);
});
