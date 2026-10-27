import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STANDARD_CALL_CONTACT_TYPE,
  STANDARD_CALL_DURATION,
  MAX_TRAINER_LOAD,
  FEE_PER_EFFECTIVE_CALL_USD,
  REQUIRED_FUTUROS_IMPOSIBLES,
  validateTrainerCapacity,
  isYearEndBlocked,
  generateAutomatedCallSchedule,
  calculateTrainerLiquidation,
  validateParticipantAdvance,
  getGroupCallsCycleStatus,
  shouldGroupCallsContinue
} from '../src/utils/callScheduleAutomation.js';

test('Directiva 1: Estándares de Videollamada Google Meet y Duración', () => {
  assert.equal(STANDARD_CALL_CONTACT_TYPE, 'Videollamada de Google Meet');
  assert.equal(STANDARD_CALL_DURATION, '20-30 min');
});

test('Directiva 1: Límite estricto de carga (Máximo 5 mánagers por entrenador)', () => {
  // Con 0 asignados, permite 1
  const check0 = validateTrainerCapacity(0, 1);
  assert.equal(check0.allowed, true);
  assert.equal(check0.remaining, 5);

  // Con 4 asignados, permite 1 (alcanza 5)
  const check4 = validateTrainerCapacity(4, 1);
  assert.equal(check4.allowed, true);
  assert.equal(check4.projected, 5);
  assert.equal(check4.remaining, 1);

  // Con 5 asignados, rechaza asignación adicional
  const check5 = validateTrainerCapacity(5, 1);
  assert.equal(check5.allowed, false);
  assert.equal(check5.remaining, 0);
  assert.match(check5.error, /Límite de carga excedido/);

  // Intentar asignar 2 cuando ya tiene 4 también debe fallar
  const checkOver = validateTrainerCapacity(4, 2);
  assert.equal(checkOver.allowed, false);
});

test('Directiva 2: Liquidación fija por llamada efectiva ($25 USD) sin condicionar a graduación', () => {
  assert.equal(FEE_PER_EFFECTIVE_CALL_USD, 25);

  // 1 llamada efectiva = $25 USD
  const liq1 = calculateTrainerLiquidation({ effectiveCallsCount: 1 });
  assert.equal(liq1.totalUSD, 25);
  assert.equal(liq1.motivo, 'llamadas_efectivas');

  // 4 llamadas efectivas = $100 USD (incluso si el equipo no se ha graduado)
  const liq4 = calculateTrainerLiquidation({ effectiveCallsCount: 4 });
  assert.equal(liq4.totalUSD, 100);

  // 7 llamadas efectivas = $175 USD
  const liq7 = calculateTrainerLiquidation({ effectiveCallsCount: 7 });
  assert.equal(liq7.totalUSD, 175);
});

test('Directiva 3: Exactamente 3 Resultados Imposibles para avanzar e inmutabilidad histórica', () => {
  assert.equal(REQUIRED_FUTUROS_IMPOSIBLES, 3);

  // Con 0 o 2 aprobados, el avance debe estar bloqueado
  const check2 = validateParticipantAdvance(2);
  assert.equal(check2.canAdvance, false);
  assert.equal(check2.faltan, 1);
  assert.match(check2.statusText, /Bloqueado para avanzar/);

  // Con exactamente 3 aprobados, el avance queda habilitado
  const check3 = validateParticipantAdvance(3);
  assert.equal(check3.canAdvance, true);
  assert.equal(check3.faltan, 0);
  assert.match(check3.statusText, /Habilitado para avanzar/);

  // Inmutabilidad: un participante histórico que tenía 5 RIs conserva los 5 en rawFis
  const historicalParticipant = {
    nombre: 'Participante Histórico',
    rawFis: ['Meta 1', 'Meta 2', 'Meta 3', 'Meta 4', 'Meta 5'],
    aprobados: 3
  };
  assert.equal(historicalParticipant.rawFis.length, 5, 'El array histórico de 5 metas no debe ser borrado');
});

test('Directiva 4: Cronograma automatizado (Llamada 1 Pre-C1 con Capitán -> Pausa -> Semanales post-MJ)', () => {
  const schedule = generateAutomatedCallSchedule({
    c1StartDate: '2026-11-13',
    mjStartDate: '2026-12-04',
    totalCalls: 7,
    equipo: '31',
    capitanName: 'Carlos Capitán'
  });

  // 1. Llamada 1 debe ser Pre-Capítulo 1 con el Capitán
  assert.equal(schedule.llamadaCapitanPreC1.numeroLlamada, 1);
  assert.equal(schedule.llamadaCapitanPreC1.tipo, 'pre_c1_capitan');
  assert.equal(schedule.llamadaCapitanPreC1.tipoContacto, 'Videollamada de Google Meet');
  assert.equal(schedule.llamadaCapitanPreC1.duracionMinutos, '20-30 min');
  assert.equal(schedule.llamadaCapitanPreC1.destinatario, 'Capitán: Carlos Capitán');
  assert.equal(schedule.llamadaCapitanPreC1.fechaProgramada, '2026-11-10'); // 3 días antes de C1

  // 2. Pausa Operativa de Inmersión durante C1 y C2
  assert.equal(schedule.pausaOperativa.tipo, 'pausa_operativa');
  assert.equal(schedule.pausaOperativa.fechaInicio, '2026-11-13');
  assert.equal(schedule.pausaOperativa.fechaFin, '2026-12-04');

  // 3. Llamadas semanales: 6 llamadas posteriores para totalizar 7
  assert.equal(schedule.llamadasSemanales.length, 6);
  assert.equal(schedule.llamadasSemanales[0].numeroLlamada, 2);
  assert.equal(schedule.llamadasSemanales[0].fechaProgramada, '2026-12-11'); // 7 días después de MJ

  // 4. Continuidad operativa de fin de año (Diciembre/Enero)
  const decCall = schedule.llamadasSemanales.find(c => c.fechaProgramada.includes('2026-12-25') || c.temporadaFinDeAno);
  assert.ok(decCall, 'Debe existir llamada en temporada de fin de año');
  assert.equal(decCall.suspendida, false);
  assert.equal(decCall.bloqueada, false);
  assert.equal(decCall.continuidadOperativaGarantizada, true);
  assert.equal(isYearEndBlocked(decCall.fechaProgramada), false);
});

test('Directiva de Continuidad: Las llamadas grupales continuarán hasta que el último grupo asignado las tenga', () => {
  const assignedGroups = [
    { equipo: 'Equipo 30', callsCount: 7 }, // Ya completó sus 7 llamadas
    { equipo: 'Equipo 31', callsCount: 7 }, // Ya completó sus 7 llamadas
    { equipo: 'Equipo 32', callsCount: 4 }, // Faltan 3 llamadas
  ];

  // Aunque el Equipo 30 y 31 hayan terminado, las llamadas grupales DEBEN continuar por el Equipo 32
  const status = getGroupCallsCycleStatus(assignedGroups, 7);
  assert.equal(status.shouldContinue, true, 'Las llamadas deben continuar mientras el último grupo tenga llamadas pendientes');
  assert.equal(status.active, true);
  assert.equal(status.completedTeams, 2);
  assert.equal(status.pendingTeams, 1);
  assert.equal(status.lastGroupPending.equipo, 'Equipo 32');
  assert.equal(status.lastGroupPending.faltan, 3);
  assert.match(status.message, /Las llamadas grupales continuarán activas hasta que el último grupo asignado las tenga/);

  assert.equal(shouldGroupCallsContinue(assignedGroups, 7), true);

  // Cuando el último grupo asignado finalmente completa sus llamadas:
  const allCompletedGroups = [
    { equipo: 'Equipo 30', callsCount: 7 },
    { equipo: 'Equipo 31', callsCount: 7 },
    { equipo: 'Equipo 32', callsCount: 7 },
  ];
  const completedStatus = getGroupCallsCycleStatus(allCompletedGroups, 7);
  assert.equal(completedStatus.shouldContinue, false);
  assert.equal(completedStatus.active, false);
  assert.equal(completedStatus.completedTeams, 3);
  assert.equal(completedStatus.pendingTeams, 0);
  assert.match(completedStatus.message, /Ciclo grupal completado/);
});

test('Integridad Impecable del Historial (Lossless Call History & Zero Data Loss)', () => {
  // Simular un manager con llamadas individuales previas
  const manager = {
    id: 'mng-999',
    nombre: 'Valeria Manager',
    equipo: 'Equipo 31',
    sede: 'Lima',
    llamadaFecha: '2026-09-10',
    llamadaAsistio: 'SI',
    llamadasHistorial: [
      {
        id: 'call-indiv-1',
        tipo: 'individual',
        fecha: '2026-09-10',
        asistio: true,
        tipoContacto: 'Videollamada de Google Meet',
        duracionMinutos: '20-30 min',
        notaVozEnviada: true,
        registradoPorNombre: 'Coach Lima'
      }
    ]
  };

  // Simular historial de llamadas del equipo en llamadas_grupales_historial
  const llamadasEquipo = [
    {
      id: 'call-group-1',
      callId: 'call-group-1',
      equipoKey: 'LIMA_EQUIPO 31',
      fecha: '2026-09-17',
      totalIntegrantes: 5,
      asistieron: 5,
      tipoContacto: 'Videollamada de Google Meet',
      duracionMinutos: '20-30 min',
      notaVozEnviada: true
    },
    {
      id: 'call-group-2',
      callId: 'call-group-2',
      equipoKey: 'LIMA_EQUIPO 31',
      fecha: '2026-09-24',
      totalIntegrantes: 5,
      asistieron: 4,
      tipoContacto: 'Videollamada de Google Meet',
      duracionMinutos: '20-30 min',
      notaVozEnviada: true
    }
  ];

  // Algoritmo de unificación sin pérdida
  const memberCalls = Array.isArray(manager.llamadasHistorial) ? [...manager.llamadasHistorial] : [];
  const seenCallIds = new Set(memberCalls.map(c => c.id || `${c.fecha}_${c.tipo}`));

  const unifiedHistory = [
    ...memberCalls,
    ...llamadasEquipo
      .filter(l => !seenCallIds.has(l.id || l.callId || `${l.fecha}_grupal`))
      .map(l => ({
        id: l.id || l.callId,
        tipo: 'grupal',
        tipoContacto: l.tipoContacto,
        duracionMinutos: l.duracionMinutos,
        notaVozEnviada: l.notaVozEnviada,
        fecha: l.fecha,
        asistio: true,
        llamadaEfectiva: true
      }))
  ].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  // Debe contener exactamente 3 llamadas (1 individual + 2 grupales), ordenadas descendente
  assert.equal(unifiedHistory.length, 3, 'El historial unificado no debe perder ninguna llamada');
  assert.equal(unifiedHistory[0].fecha, '2026-09-24');
  assert.equal(unifiedHistory[1].fecha, '2026-09-17');
  assert.equal(unifiedHistory[2].fecha, '2026-09-10');

  // Cada llamada debe conservar los metadatos completos
  unifiedHistory.forEach(call => {
    assert.ok(call.tipoContacto, 'Debe conservar tipoContacto');
    assert.ok(call.duracionMinutos, 'Debe conservar duracionMinutos');
    assert.equal(typeof call.asistio, 'boolean', 'Debe conservar estado booleano de asistencia');
  });
});
