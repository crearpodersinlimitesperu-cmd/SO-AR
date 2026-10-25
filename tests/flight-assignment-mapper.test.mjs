import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { 
  getAuthoritativeTrainerAssignments, 
  matchFlightToAssignment, 
  cleanSearchTokens,
  TRAINER_FLIGHT_MAPPINGS 
} from '../src/services/flightAssignmentMapperAgent.js';

test('1. Resolución Automática de Pasajeros Críticos (Casos de Imágenes)', () => {
  const assignments = getAuthoritativeTrainerAssignments();

  // Caso 1: LEANDRO BRUNIS AVILES (LATAM LA 1444, PNR: YVCUJD)
  const flightLeandro = {
    airline: 'LATAM Airlines',
    reservationCode: 'YVCUJD',
    flightNumber: 'LA 1444',
    passengers: ['LEANDRO BRUNIS AVILES'],
    schedule: { scheduledDeparture: '2026-10-25T23:30:00-05:00' },
    route: { originCity: 'Lima', destinationCity: 'Quito' }
  };
  const resLeandro = matchFlightToAssignment(flightLeandro, assignments);
  assert.ok(resLeandro, 'Debe identificar el vuelo de Leandro Brunis');
  assert.equal(resLeandro.matched, true);
  assert.equal(resLeandro.asignacion.canonicalName, 'Leandro Brunis');
  assert.equal(resLeandro.asignacion.legalName, 'Leandro Emilio Brunis Avilés');
  assert.equal(resLeandro.asignacion.sede, 'Cuenca');
  assert.ok(resLeandro.asignacion.cartaUrl.includes('leandro_brunis'));

  // Caso 2: Juan Angel Arreola (Avianca AV 1604, PNR: ADAHS5)
  const flightArreola = {
    airline: 'Avianca',
    reservationCode: 'ADAHS5',
    flightNumber: 'AV 1604',
    passengers: ['Juan Angel Arreola'],
    schedule: { scheduledDeparture: '2026-11-01T21:20:00-05:00' },
    route: { originCity: 'Cuenca', destinationCity: 'Quito' }
  };
  const resArreola = matchFlightToAssignment(flightArreola, assignments);
  assert.ok(resArreola, 'Debe identificar el vuelo de Juan Ángel Arreola');
  assert.equal(resArreola.matched, true);
  assert.equal(resArreola.asignacion.canonicalName, 'Juan Ángel Arreola');
  assert.equal(resArreola.asignacion.legalName, 'Juan Ángel Arreola Morales');

  // Caso 3: CARLOS BRUNIS VILLACIS (LATAM LA 1414, PNR: JGIWQZ)
  const flightCarlos = {
    airline: 'LATAM Airlines',
    reservationCode: 'JGIWQZ',
    flightNumber: 'LA 1414',
    passengers: ['CARLOS BRUNIS VILLACIS'],
    schedule: { scheduledDeparture: '2026-10-26T16:16:00-05:00' },
    route: { originCity: 'Guayaquil', destinationCity: 'Quito' }
  };
  const resCarlos = matchFlightToAssignment(flightCarlos, assignments);
  assert.ok(resCarlos, 'Debe identificar el vuelo de Carlos Brunis');
  assert.equal(resCarlos.matched, true);
  assert.equal(resCarlos.asignacion.canonicalName, 'Carlos Brunis');
  assert.equal(resCarlos.asignacion.legalName, 'Carlos Emilio Brunis Villacís');
  assert.equal(resCarlos.asignacion.sede, 'Cuenca');
  assert.ok(resCarlos.asignacion.cartaUrl.includes('carlos_brunis'));
});

test('2. Directiva Fail-Open: Disponibilidad Autoritativa sin Firestore', () => {
  // Cuando Firestore entrega lista vacía o falla por permisos, la proyección autoritativa se entrega intacta
  const assignments = getAuthoritativeTrainerAssignments([], []);
  assert.ok(assignments.length >= TRAINER_FLIGHT_MAPPINGS.length, 'Debe contener al menos el catálogo oficial de entrenadores');

  const leandro = assignments.find(a => a.canonicalName === 'Leandro Brunis');
  const carlos = assignments.find(a => a.canonicalName === 'Carlos Brunis');
  const arreola = assignments.find(a => a.canonicalName === 'Juan Ángel Arreola');

  assert.ok(leandro, 'Leandro Brunis debe estar disponible en Fail-Open');
  assert.ok(carlos, 'Carlos Brunis debe estar disponible en Fail-Open');
  assert.ok(arreola, 'Juan Ángel Arreola debe estar disponible en Fail-Open');
});

test('3. Algoritmo de Identificación 100% sobre los 337 Vuelos Indexados', () => {
  const data = JSON.parse(fs.readFileSync('./public/vuelos_tracker.json', 'utf-8'));
  const entries = Object.entries(data.flights);
  const assignments = getAuthoritativeTrainerAssignments();

  let matched = 0;
  let unmatched = 0;
  const unmatchedList = [];

  for (const [key, flight] of entries) {
    const res = matchFlightToAssignment(flight, assignments);
    if (res && res.matched) {
      matched++;
    } else {
      unmatched++;
      unmatchedList.push({ key, passengers: flight.passengers, pnr: flight.reservationCode });
    }
  }

  assert.equal(unmatched, 0, `Todos los vuelos deben tener match automático. Sin match: ${JSON.stringify(unmatchedList)}`);
  assert.equal(matched, entries.length, 'El 100% de los vuelos indexados debe quedar vinculado sin requerir revisión manual');
});
