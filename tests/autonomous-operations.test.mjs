import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateBayesianSeatedProjection,
  scoreBankTransactionMatch,
  reconcileBatchBankTransactions,
  dispatchTransactionalMailRealtime,
  computeMailDispatchId,
  normalizeNationalId,
  normalizePhoneNumber,
  resolveParticipantIdentity,
  evaluateFinancialClearanceTier,
  executeBatchFinancialSigning
} from '../src/services/autonomousOperationsEngine.js';

test('1. Inferencia Bayesiana de Conversión Real (Cero Multiplicadores Estáticos)', () => {
  // Caso Lima: Con 100 confirmados a 3 días del evento
  const projectionLima = calculateBayesianSeatedProjection({
    sede: 'lima',
    confirmados: 100,
    diasParaEvento: 3,
    capacidadSala: 120
  });

  assert.equal(projectionLima.confirmados, 100);
  assert.equal(projectionLima.metodo, 'INFERENCIA_BAYESIANA_BETA_BINOMIAL_HISTORICA');
  assert.ok(projectionLima.p10_conservador > 65, 'P10 debe ser realista y conservador');
  assert.ok(projectionLima.p50_esperado >= projectionLima.p10_conservador, 'P50 >= P10');
  assert.ok(projectionLima.p90_optimista >= projectionLima.p50_esperado, 'P90 >= P50');
  assert.ok(projectionLima.p90_optimista <= 100, 'P90 no puede superar el total de confirmados');
  assert.equal(projectionLima.riesgoAforo, 'NORMAL');

  // Caso cero confirmados
  const zeroProjection = calculateBayesianSeatedProjection({
    sede: 'quito',
    confirmados: 0
  });
  assert.equal(zeroProjection.proyeccionMedia, 0);
  assert.ok(zeroProjection.advertencia.includes('Cero participantes confirmados'));
});

test('2. Conciliación Bancaria Algorítmica con Scoring Determinista', () => {
  const bankLine = {
    referencia: 'VOUCH-009841',
    monto: 350.00,
    fecha: '2026-10-24T12:00:00Z',
    descripcion: 'PAGO CUOTA JUAN PEREZ 70412890'
  };

  const nodusTx = {
    id: 'TX-NODUS-5541',
    voucher: 'VOUCH-009841',
    monto: 350.00,
    fecha: '2026-10-24T14:30:00Z',
    participanteNombre: 'Juan Perez Gomez',
    participanteDni: '70412890'
  };

  const match = scoreBankTransactionMatch(bankLine, nodusTx);
  assert.ok(match.score >= 90, `El score debe ser >= 90 (obtenido: ${match.score})`);
  assert.equal(match.status, 'AUTO_CONCILIATED');
  assert.equal(match.requiresHumanAction, false);

  // Conciliación en Lote
  const batchResult = reconcileBatchBankTransactions([bankLine], [nodusTx]);
  assert.equal(batchResult.autoConciliatedCount, 1);
  assert.equal(batchResult.unmatchedCount, 0);
  assert.equal(batchResult.porcentajeAutomatizacion, '100%');
});

test('3. Despacho Transaccional de Correos en Tiempo Real con Idempotencia Criptográfica', async () => {
  const to = 'participante@gmail.com';
  const templateType = 'CONFIRMACION_ASISTENCIA_C1';
  const eventId = 'EVT-C1-E32-LIMA';

  const dispatchId1 = computeMailDispatchId(to, templateType, eventId);
  const dispatchId2 = computeMailDispatchId(to, templateType, eventId);
  assert.equal(dispatchId1, dispatchId2, 'El dispatchId debe ser determinista para prevenir correos dobles');

  const dispatchResult = await dispatchTransactionalMailRealtime({
    to,
    subject: 'Tu asiento está confirmado para C1 E32',
    templateType,
    eventId,
    htmlContent: '<h1>Bienvenido a Sala C1</h1>'
  });

  assert.equal(dispatchResult.status, 'DELIVERED_IMMEDIATE');
  assert.equal(dispatchResult.dispatchId, dispatchId1);
});

test('4. Resolución de Homónimos Inter-Sede y Normalización E.164 / DNI', () => {
  // DNI con ceros faltantes vs DNI con ceros completos en Perú
  const cleanDni1 = normalizeNationalId('7041289', 'peru');
  const cleanDni2 = normalizeNationalId('07041289', 'peru');
  assert.equal(cleanDni1, '07041289');
  assert.equal(cleanDni1, cleanDni2);

  // Teléfono local sin prefijo vs internacional
  const phone1 = normalizePhoneNumber('987654321', 'peru');
  const phone2 = normalizePhoneNumber('+51 987 654 321', 'peru');
  assert.equal(phone1, '+51987654321');
  assert.equal(phone2, '+51987654321');

  // Resolución entre sede Lima y sede Quito de la misma persona
  const personLima = {
    nombre: 'José Luis Sánchez Moreno',
    documento: '7041289',
    telefono: '987654321',
    sede: 'Lima'
  };

  const personQuito = {
    nombre: 'Jose Sanchez Moreno',
    documento: '07041289',
    telefono: '+51 987654321',
    sede: 'Quito'
  };

  const resolution = resolveParticipantIdentity(personLima, personQuito);
  assert.equal(resolution.isSamePerson, true);
  assert.equal(resolution.classification, 'EXACT_NATIONAL_ID_MATCH');
});

test('5. Aprobación Financiera Inteligente en 2 Niveles (Micro-Clearance y Lote Criptográfico 1-Clic)', () => {
  // Ítem 1: Cumple al 100% las condiciones de micro-aprobación
  const cleanTrainerPayment = {
    id: 'LIQ-001',
    beneficiario: 'Carlos Entrenador',
    montoUsd: 250.00,
    sede: 'lima',
    auditComplianceRatio: 1.0,
    hasValidContract: true,
    isNewBankAccount: false,
    hqCurrentEscrowUsedUsd: 2000.00
  };

  const eval1 = evaluateFinancialClearanceTier(cleanTrainerPayment);
  assert.equal(eval1.tier, 'TIER_1_AUTO_MICRO_CLEARANCE');
  assert.equal(eval1.requiresHumanIntervention, false);
  assert.equal(eval1.status, 'APPROVED_FOR_DISBURSEMENT');

  // Ítem 2: Requiere escalamiento (auditoría incompleta)
  const anomalousPayment = {
    id: 'LIQ-002',
    beneficiario: 'Entrenador Discrepante',
    montoUsd: 400.00, // Excede 350
    sede: 'quito',
    auditComplianceRatio: 0.80, // Solo 80% verificado
    hasValidContract: false,
    isNewBankAccount: true,
    hqCurrentEscrowUsedUsd: 1000.00
  };

  const eval2 = evaluateFinancialClearanceTier(anomalousPayment);
  assert.equal(eval2.tier, 'TIER_2_MACRO_EXECUTIVE_ESCALATION');
  assert.equal(eval2.requiresHumanIntervention, true);
  assert.ok(eval2.escalationReasons.length >= 3);

  // Firma en Lote por el CFO (1 solo clic para todo el lote)
  const batchSignResult = executeBatchFinancialSigning(
    [cleanTrainerPayment, anomalousPayment],
    { userId: 'USR-CFO-01', role: 'CFO_GLOBAL', name: 'Gabriela Rivadeneyra' }
  );

  assert.equal(batchSignResult.totalProcessed, 2);
  assert.equal(batchSignResult.approvedBatchCount, 1);
  assert.equal(batchSignResult.escalatedCount, 1);
  assert.equal(batchSignResult.totalApprovedMontoUsd, 250.00);
  assert.ok(batchSignResult.batchSignatureDigest.length === 64, 'Digest criptográfico SHA-256');
});
