import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TRAINER_CALENDAR_SYNC_AGENT_ID,
  ajustarFechaFinCalendario,
  applyAsignadorAuthoritativeProjection,
  computeCalendarProjectionPlan,
  extractTeamDigitsKey,
  indexAssignmentsForLookup,
  matchAssignmentForEvent,
  buildAsignadorEventKey,
  buildPublicAssignment,
  buildPublicOperational,
  calendarEventsForLocalDay,
  mergeOfficialCalendar,
  normalizeOperationalChanges,
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
    publicAssignments: [{
      id: '2026-10-15__Cuenca__CAPITULO DOS__24',
      ...planWithDrift.assignmentsToWrite[0].payload,
    }],
  });
  assert.equal(planInSync.inSync, true);
});

  const eventFixture = (equipo = '122', date = '2026-11-06', sede = 'UIO') => ({
    nombre: 'CAPITULO UNO', sede, equipo,
    fecha_inicio: `${date}T00:00:00`, fecha_fin: `${date}T00:00:00`,
    trainer: 'Sugerencia sintética',
  });
  const assignmentFixture = (event, trainer = 'Entrenador Sintético A') => ({
    id: buildAsignadorEventKey(event),
    entrenamiento: event.nombre, sede: event.sede, equipo: event.equipo,
    fechaInicio: event.fecha_inicio, fechaFin: event.fecha_fin,
    unico: trainer ? { entrenador: trainer, fechaIso: '2026-10-21T12:00:00Z' } : null,
  });

  test('parallel teams, other dates and other sites never share assignments or disappear', () => {
    const events = [
      eventFixture('122'), eventFixture('128'), eventFixture('122', '2026-11-13'),
      eventFixture('122', '2026-11-06', 'LIM'), eventFixture(''),
    ];
    const assignments = [
      assignmentFixture(events[0]), assignmentFixture(events[1], 'Entrenador Sintético B'),
    ];
    const result = applyAsignadorAuthoritativeProjection(events, assignments);
    assert.equal(result.length, 5);
    const byKey = new Map(result.map(event => [event.__sourceEventKey, event]));
    assert.equal(byKey.get(buildAsignadorEventKey(events[0])).trainer, 'Entrenador Sintético A');
    assert.equal(byKey.get(buildAsignadorEventKey(events[1])).trainer, 'Entrenador Sintético B');
    for (const event of events.slice(2)) assert.equal(byKey.get(buildAsignadorEventKey(event)).trainer, '');
    assert.deepEqual(events.map(event => event.trainer), Array(5).fill('Sugerencia sintética'));
  });

  test('unassignment wins over confirmed teamless fallback, irrespective of document order', () => {
    const event = eventFixture();
    const cleared = assignmentFixture(event, '');
    const teamless = assignmentFixture(eventFixture(''), 'No debe heredarse');
    for (const assignments of [[cleared, teamless], [teamless, cleared]]) {
      assert.equal(matchAssignmentForEvent(event, indexAssignmentsForLookup(assignments)), cleared);
      assert.equal(applyAsignadorAuthoritativeProjection([event], assignments)[0].trainer, '');
    }
  });

  test('teamless legacy matching is allowed only when unambiguous', () => {
    const event = eventFixture('122');
    const legacy = assignmentFixture(eventFixture(''));
    assert.equal(matchAssignmentForEvent(event, indexAssignmentsForLookup([legacy])), legacy);
    const parallel = assignmentFixture(eventFixture('128'));
    assert.equal(matchAssignmentForEvent(event, indexAssignmentsForLookup([legacy, parallel])), null);
    assert.equal(matchAssignmentForEvent(eventFixture(''), indexAssignmentsForLookup([
      assignmentFixture(event), parallel,
    ])), null);
  });

  test('team formatting normalization is shared across public and internal consumers', () => {
    const event = eventFixture('31, 29 y 30');
    const assignment = assignmentFixture(eventFixture('293031'));
    assert.equal(matchAssignmentForEvent(event, indexAssignmentsForLookup([assignment])), assignment);
    assert.equal(extractTeamDigitsKey('29.0'), '29');
    assert.equal(extractTeamDigitsKey('128'), '128');
  });

  test('a date, site and team change follows only its explicit stable source identity', () => {
    const event = eventFixture();
    const assignment = assignmentFixture(event);
    const other = eventFixture('128');
    const override = {
      id: assignment.id, kind: 'override', sourceEventKey: assignment.id,
      nombre: 'CAPITULO UNO', sede: 'Lima', equipo: '77',
      fechaInicio: '2026-12-01T00:00:00', fechaFin: '2026-12-02T00:00:00',
    };
    const result = applyAsignadorAuthoritativeProjection([event, other], [assignment], [override]);
    const changed = result.find(item => item.__sourceEventKey === assignment.id);
    assert.equal(changed.fecha_inicio, override.fechaInicio);
    assert.equal(changed.fecha_fin, override.fechaFin);
    assert.equal(changed.sede, 'Lima');
    assert.equal(changed.equipo, '77');
    assert.equal(changed.trainer, assignment.unico.entrenador);
    const unchanged = result.find(item => item.equipo === '128');
    assert.equal(unchanged.fecha_inicio, other.fecha_inicio);
    assert.equal(unchanged.trainer, '');
    assert.deepEqual(applyAsignadorAuthoritativeProjection(result, [assignment], [override]), result);
  });

  test('canonical date metadata propagates even when the historical document ID has an old date', () => {
    const event = eventFixture();
    const assignment = {
      ...assignmentFixture(event), fechaInicio: '2026-12-04T00:00:00', fechaFin: '2026-12-06T00:00:00',
    };
    const projected = applyAsignadorAuthoritativeProjection([event], [assignment])[0];
    assert.equal(projected.fecha_inicio, assignment.fechaInicio);
    assert.equal(projected.fecha_fin, assignment.fechaFin);
    assert.equal(projected.__assignmentKey, assignment.id);
  });

  test('teamless overrides do not move explicit parallel teams', () => {
    const events = [eventFixture(), eventFixture('128')];
    const override = {
      kind: 'override', sourceEventKey: buildAsignadorEventKey(eventFixture('')),
      fechaInicio: '2026-12-01T00:00:00',
    };
    const projected = applyAsignadorAuthoritativeProjection(events, [], [override]);
    assert.deepEqual(projected.map(event => event.fecha_inicio), events.map(event => event.fecha_inicio));
  });

  test('source reconciliation preserves parallel teams, teamless events and historical dates', () => {
    const historical = eventFixture('122', '2025-01-10');
    const api = [eventFixture(), eventFixture('128'), eventFixture(''), historical];
    const result = mergeOfficialCalendar(api, [{ ...eventFixture('128'), lugar: 'Salón sintético' }]);
    assert.equal(result.length, 4);
    assert.equal(result.find(event => event.equipo === '128').lugar, 'Salón sintético');
    assert.ok(result.includes(historical));
    assert.equal(api[1].lugar, undefined);
  });

  test('custom IDs from old CLI publications normalize to canonical assignment IDs without duplicates', () => {
    const custom = {
      id: 'synthetic-custom', kind: 'custom', nombre: 'TANQUE', sede: 'Lima',
      equipo: '77', fechaInicio: '2026-12-01T00:00:00', fechaFin: '2026-12-01T00:00:00',
    };
    const legacy = { ...custom, id: `custom__${custom.id}`, fechaInicio: '2026-11-01T00:00:00' };
    const assignment = { ...assignmentFixture(eventFixture()), id: custom.id };
    for (const changes of [[legacy, custom], [custom, legacy]]) {
      assert.equal(normalizeOperationalChanges(changes).length, 1);
      const result = applyAsignadorAuthoritativeProjection([], [assignment], changes);
      assert.equal(result.length, 1);
      assert.equal(result[0].__sourceEventKey, custom.id);
      assert.equal(result[0].fecha_inicio, custom.fechaInicio);
      assert.equal(result[0].trainer, assignment.unico.entrenador);
      assert.equal(applyAsignadorAuthoritativeProjection(result, [assignment], changes).length, 1);
    }
  });

  test('public allowlists omit trainer email and editor identity at every level', () => {
    const assignment = {
      ...assignmentFixture(eventFixture()),
      actualizadoPorEmail: 'editor@example.test',
      unico: { entrenador: 'Entrenador Sintético', entrenadorEmail: 'trainer@example.test', asignadoPor: 'Editor', fechaIso: 'now' },
    };
    const publicAssignment = buildPublicAssignment(assignment);
    assert.deepEqual(publicAssignment.unico, { entrenador: 'Entrenador Sintético', fechaIso: 'now' });
    const publicOperational = buildPublicOperational({
      ...assignment, actualizadoPor: 'Editor', actualizadoPorEmail: 'editor@example.test', creadoPor: 'Editor',
    }, 'custom', 'synthetic-custom');
    assert.doesNotMatch(JSON.stringify([publicAssignment, publicOperational]), /Email|asignadoPor|actualizadoPor|creadoPor|@/);
    const plan = computeCalendarProjectionPlan({
      assignments: [assignment],
      publicAssignments: [{ id: assignment.id, ...publicAssignment, unico: assignment.unico }],
    });
    assert.equal(plan.assignmentsToPublish.length, 1);
  });

  test('changed assignments, cleared orphans and legacy operational IDs converge after republication', () => {
    const assignment = assignmentFixture(eventFixture());
    const override = { id: assignment.id, nombre: 'CAPITULO UNO', sede: 'Quito', fechaInicio: '2026-12-04T00:00:00' };
    const custom = { id: 'synthetic-custom', nombre: 'TANQUE', sede: 'Lima', fechaInicio: '2026-12-05T00:00:00' };
    const state = {
      assignments: [assignment], overrides: [override], customEvents: [custom],
      publicAssignments: [assignmentFixture(eventFixture('128'))],
      publicOperational: [
        { id: `override__${override.id}`, kind: 'override', actualizadoPorEmail: 'editor@example.test' },
        { id: `custom__${custom.id}`, kind: 'custom', fechaInicio: '2025-01-01' },
      ],
    };
    const plan = computeCalendarProjectionPlan(state);
    assert.equal(plan.assignmentsToPublish.length, 2);
    assert.equal(plan.operationalToPublish.length, 4);
    const applyWrites = (current, writes) => [
      ...new Map([...current, ...writes.map(({ id, payload }) => ({ id, ...payload }))].map(item => [item.id, item])).values(),
    ];
    const next = {
      ...state,
      publicAssignments: applyWrites(state.publicAssignments, plan.assignmentsToPublish),
      publicOperational: applyWrites(state.publicOperational, plan.operationalToPublish),
    };
    assert.equal(computeCalendarProjectionPlan(next).inSync, true);
    assert.equal(next.publicAssignments.find(item => item.id.includes('__128')).unico, null);
    next.assignments = [{ ...assignment, unico: null }];
    const removal = computeCalendarProjectionPlan(next);
    assert.equal(removal.assignmentsToPublish.length, 1);
    assert.equal(removal.assignmentsToPublish[0].payload.unico, null);
  });

  test('team daily calendar reads actual projected fields using the local date, not UTC', () => {
    const day = new Date(2026, 10, 6, 23, 30);
    day.toISOString = () => { throw new Error('UTC conversion must not be used'); };
    const event = eventFixture();
    const range = { ...eventFixture('128'), fecha_fin: '2026-11-08T00:00:00' };
    assert.equal(calendarEventsForLocalDay([event, range, eventFixture('122', '2026-11-13')], day).length, 2);
    assert.deepEqual(calendarEventsForLocalDay([event, range], new Date(2026, 10, 8)), [range]);
  });

  test('projection writer chunks large publications, replaces public documents and surfaces errors', async () => {
    const firebaseMock = `export const doc = (db, collection, id) => ({ collection, id });
      export const serverTimestamp = () => 'SERVER_TIME';
      export const writeBatch = db => db.batch();`;
    const mockUrl = `data:text/javascript,${encodeURIComponent(firebaseMock)}`;
    const projectionUrl = new URL('./trainerCalendarProjection.js', import.meta.url).href;
    const source = readFileSync(new URL('./trainerCalendarSyncAgent.js', import.meta.url), 'utf8')
      .replace("'firebase/firestore'", JSON.stringify(mockUrl))
      .replaceAll("'./trainerCalendarProjection.js'", JSON.stringify(projectionUrl));
    const { syncTrainerCalendarProjections } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
    const commits = [];
    const db = {
      batch() {
        const writes = [];
        return {
          set(...args) { writes.push(args); },
          async commit() { commits.push(writes); },
        };
      },
    };
    const assignments = Array.from({ length: 901 }, (_, i) => ({
      ...assignmentFixture(eventFixture(String(i))), id: `synthetic-${i}`,
    }));
    const state = { assignments };
    const result = await syncTrainerCalendarProjections(db, state);
    assert.deepEqual(commits.map(items => items.length), [450, 450, 1]);
    assert.equal(result.repairedAssignments, 901);
    assert.ok(commits.flat().every(args => args.length === 2), 'public documents must be replaced, not merged');
    const publicAssignments = commits.flat().map(([ref, payload]) => ({ id: ref.id, ...payload }));
    const second = await syncTrainerCalendarProjections(db, { ...state, publicAssignments });
    assert.equal(second.repairedAssignments, 0);
    assert.equal(commits.length, 3);
    const failingDb = {
      batch: () => ({ set() {}, async commit() { throw new Error('Synthetic write rejection'); } }),
    };
    await assert.rejects(syncTrainerCalendarProjections(failingDb, state), /Synthetic write rejection/);
  });
