import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSedeDailyReport,
  formatGoogleChatCard,
  loadNodusSnapshot
} from '../scripts/sendDailyCallsReportChat.mjs';

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
