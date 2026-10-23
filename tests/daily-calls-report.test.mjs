import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSedeDailyReport,
  formatGoogleChatCard,
  loadNodusSnapshot,
  getSedeCallingSchedule
} from '../scripts/sendDailyCallsReportChat.mjs';

test('getSedeCallingSchedule suppresses calling reports during training (Friday-Tuesday) and activates on Wednesday/Thursday', () => {
  // Caso 1: Lima el viernes 23 de octubre de 2026 (día que inició C1 E32)
  const limaViernes = getSedeCallingSchedule('Lima', new Date('2026-10-23T17:30:00Z'));
  assert.equal(limaViernes.shouldSendReport, false);
  assert.equal(limaViernes.isCallingOpen, false);
  assert.equal(limaViernes.status, 'IN_TRAINING_OR_POST');
  assert.match(limaViernes.reason, /C1 E32/);
  assert.match(limaViernes.reason, /en curso en sala/);
  assert.match(limaViernes.reason, /No se envía reporte de Nodus hasta el miércoles/);

  // Caso 2: Lima el sábado 24 de octubre de 2026 (en plena sala de C1 E32)
  const limaSabado = getSedeCallingSchedule('Lima', new Date('2026-10-24T17:30:00Z'));
  assert.equal(limaSabado.shouldSendReport, false);
  assert.equal(limaSabado.status, 'IN_TRAINING_OR_POST');

  // Caso 3: Lima el martes 27 de octubre de 2026 (cierre post-entrenamiento de C1 E32)
  const limaMartes = getSedeCallingSchedule('Lima', new Date('2026-10-27T17:30:00Z'));
  assert.equal(limaMartes.shouldSendReport, false);
  assert.equal(limaMartes.status, 'IN_TRAINING_OR_POST');

  // Caso 4: Quito el miércoles 28 de octubre de 2026 (apertura de llamadas y nuevos pagos para C1 E130 del 30 de octubre)
  const quitoMiercoles = getSedeCallingSchedule('Quito', new Date('2026-10-28T17:30:00Z'));
  assert.equal(quitoMiercoles.shouldSendReport, true);
  assert.equal(quitoMiercoles.isCallingOpen, true);
  assert.equal(quitoMiercoles.status, 'CALLING_ACTIVE');
  assert.equal(quitoMiercoles.targetTeam, 130);

  // Caso 5: Quito el jueves 29 de octubre de 2026 (último día de confirmaciones previas)
  const quitoJueves = getSedeCallingSchedule('Quito', new Date('2026-10-29T17:30:00Z'));
  assert.equal(quitoJueves.shouldSendReport, true);
  assert.equal(quitoJueves.isCallingOpen, true);
  assert.equal(quitoJueves.targetTeam, 130);

  // Caso 6: Quito el viernes 30 de octubre de 2026 (inicio de C1 E130 en sala -> llamadas cerradas)
  const quitoViernes = getSedeCallingSchedule('Quito', new Date('2026-10-30T17:30:00Z'));
  assert.equal(quitoViernes.shouldSendReport, false);
  assert.equal(quitoViernes.status, 'IN_TRAINING_OR_POST');
});

test('buildSedeDailyReport scopes to target upcoming team when available in equiposReporte instead of lifetime coordinator contacts', () => {
  const snapshotWithActiveTeam = {
    timestamp: '2026-10-23T17:30:00Z',
    sedes: [{ sede: 'Lima', gestionesTotal: 206, asignadosTotal: 2267 }],
    equiposReporte: [
      {
        equipoId: '149',
        equipoNombre: 'EQUIPO 32 — LIMA CICLO 1 ✓',
        totalParticipantes: 149,
        confirmadosLlamada: 88
      }
    ],
    coordinadores: [
      {
        nombre: 'JOYCE',
        sede: 'Lima',
        asignados: 1153,
        gestiones: 124,
        equipos: [
          { equipo: 'EQUIPO 32', llamadas: 122, confirmado: 47, porConfirmar: 3, noContesta: 7 }
        ]
      },
      {
        nombre: 'DIANA',
        sede: 'Lima',
        asignados: 1114,
        gestiones: 82,
        equipos: [
          { equipo: 'EQUIPO 32', llamadas: 82, confirmado: 41, porConfirmar: 0, noContesta: 14 }
        ]
      }
    ]
  };

  // Con force: true para evaluar los datos sin supresión de fecha
  const report = buildSedeDailyReport('Lima', snapshotWithActiveTeam, {
    force: true,
    referenceDate: new Date('2026-10-23T17:30:00Z')
  });

  // Los participantes en sala deben ser 149 (el padrón oficial del equipo), NUNCA 2267
  assert.equal(report.pxAsignados, 149);
  assert.equal(report.pxConfirmados, 88);
  assert.equal(report.gestionesTotales, 204);
  assert.equal(report.targetTeamLabel, 'C1 — EQUIPO 32');

  // El detalle de coordinadoras debe reflejar las llamadas y confirmaciones específicas del equipo 32
  const joyce = report.coordinadores.find(c => c.nombre === 'JOYCE');
  assert.equal(joyce.pxConfirmados, 47);
  assert.equal(joyce.gestionesTotales, 122);

  const diana = report.coordinadores.find(c => c.nombre === 'DIANA');
  assert.equal(diana.pxConfirmados, 41);
  assert.equal(diana.gestionesTotales, 82);

  // Al formatear la tarjeta, no debe mostrarse el número histórico acumulado de 2267
  const card = formatGoogleChatCard(report);
  assert.ok(card.text.includes('149'));
  assert.ok(!card.text.includes('2267'));
  assert.ok(card.text.includes('C1 — EQUIPO 32'));
});

test('buildSedeDailyReport strictly separates PX (unique persons) from gestiones (calls made)', async () => {
  const { data: snapshot } = await loadNodusSnapshot('nodus_latest_snapshot.json');

  const limaReport = buildSedeDailyReport('Lima', snapshot);
  assert.equal(limaReport.sede, 'Lima');
  assert.equal(limaReport.available, true);
  // PX asignados
  assert.equal(typeof limaReport.pxAsignados, 'number');
  assert.equal(limaReport.pxAsignados, 2051);
  // Gestiones de llamadas (attempts/efforts)
  assert.equal(typeof limaReport.gestionesTotales, 'number');
  assert.equal(limaReport.gestionesTotales, 5712);
  // Must NOT equal each other (a participant receives multiple calls)
  assert.notEqual(limaReport.pxAsignados, limaReport.gestionesTotales);
  assert.equal(limaReport.pxPorConfirmar, 353);
  assert.equal(limaReport.pxNoContesta, 881);
});

test('buildSedeDailyReport correctly aggregates coordinators for Quito without hallucinated data', async () => {
  const { data: snapshot } = await loadNodusSnapshot('nodus_latest_snapshot.json');

  const quitoReport = buildSedeDailyReport('Quito', snapshot);
  assert.equal(quitoReport.available, true);
  assert.equal(quitoReport.pxConfirmados, 939);
  assert.equal(quitoReport.gestionesTotales, 5380);
  assert.ok(quitoReport.coordinadores.length >= 5);
  // Check that each coordinator has explicit fields
  for (const c of quitoReport.coordinadores) {
    assert.ok(c.nombre);
    assert.equal(typeof c.pxAsignados, 'number');
    assert.equal(typeof c.pxConfirmados, 'number');
    assert.equal(typeof c.gestionesTotales, 'number');
  }
});

test('buildSedeDailyReport handles missing or unverified sede in fail-closed mode (zero invented data)', () => {
  const mockSnapshot = {
    timestamp: '2026-10-22T12:30:00Z',
    sedes: [],
    coordinadores: []
  };

  const report = buildSedeDailyReport('Tokyo', mockSnapshot);
  assert.equal(report.available, false);
  assert.equal(report.reason, 'Sin datos registrados en Nodus para esta sede en el corte actual.');

  const card = formatGoogleChatCard(report);
  assert.ok(card.text.includes('Cero datos inventados'));
  assert.ok(card.text.includes('Estado Nodus: Sin datos registrados en Nodus'));
});

test('formatGoogleChatCard produces valid Google Chat CardsV2 format with PX distinction', async () => {
  const { data: snapshot } = await loadNodusSnapshot('nodus_latest_snapshot.json');
  const report = buildSedeDailyReport('Lima', snapshot);
  const cardPayload = formatGoogleChatCard(report);

  assert.ok(cardPayload.text.includes('PX ASIGNADOS EN SALA'));
  assert.ok(cardPayload.text.includes('GESTIONES REALIZADAS'));
  assert.ok(cardPayload.text.includes('Un PX puede recibir múltiples llamadas'));

  assert.ok(Array.isArray(cardPayload.cardsV2));
  assert.equal(cardPayload.cardsV2.length, 1);

  const card = cardPayload.cardsV2[0].card;
  assert.ok(card.header.title.includes('CREAR PODER SIN LÍMITES'));
  assert.ok(card.header.subtitle.includes('12:30 PM'));
  assert.ok(Array.isArray(card.sections));
  assert.ok(card.sections.length >= 3);
});
