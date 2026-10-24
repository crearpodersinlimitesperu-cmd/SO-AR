import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectItemSede,
  getParticipantOriginSede,
  transferParticipantSede
} from '../src/services/crmGenealogyAgent.js';
import {
  reconcilePaymentBalancesAtomic
} from '../src/services/financeService.js';

describe('Estabilización y Corrección Quirúrgica (SO-AR / Causa OS)', () => {

  it('1. Reconciliación de Pagos Atómica: evita descuadres aritméticos al editar abonos', () => {
    const originalPayment = {
      id: 'PAG-LIMA-2026-001',
      participantName: 'Valeria Rios',
      montoTotal: 1500,
      abonos: [
        { id: 'AB-1', monto: 500, metodoPago: 'TRANSFERENCIA', fecha: '2026-10-01' }
      ]
    };

    // Caso 1: Nuevo abono parcial de 400
    const reconciledPartial = reconcilePaymentBalancesAtomic(originalPayment, {
      id: 'AB-2',
      monto: 400,
      metodoPago: 'TARJETA'
    });

    assert.equal(reconciledPartial.montoTotal, 1500);
    assert.equal(reconciledPartial.montoAbonado, 900);
    assert.equal(reconciledPartial.saldoPendiente, 600);
    assert.equal(reconciledPartial.estadoPago, 'ABONO_PARCIAL');
    assert.equal(reconciledPartial.abonos.length, 2);

    // Caso 2: Nuevo abono que liquida la totalidad restante (600)
    const reconciledComplete = reconcilePaymentBalancesAtomic(reconciledPartial, {
      id: 'AB-3',
      monto: 600,
      metodoPago: 'EFECTIVO'
    });

    assert.equal(reconciledComplete.montoTotal, 1500);
    assert.equal(reconciledComplete.montoAbonado, 1500);
    assert.equal(reconciledComplete.saldoPendiente, 0);
    assert.equal(reconciledComplete.estadoPago, 'PAGADO_TOTAL');
    assert.equal(reconciledComplete.abonos.length, 3);
  });

  it('2. Preservación de Linaje y Sede de Origen en Traslados: no pierde la atribución al cambiar de sede', () => {
    const originalParticipant = {
      id: 'PX-CUENCA-888',
      name: 'Mateo Cárdenas',
      sede: 'Cuenca',
      equipo: 'EQUIPO 23 CUENCA',
      enrolador: 'FERNANDO REINOSO'
    };

    // Detección inicial de sede de origen
    const originSede = getParticipantOriginSede(originalParticipant);
    assert.equal(originSede, 'Cuenca');

    // Traslado del participante de Cuenca a Guayaquil por motivo de viaje
    const transferredToGye = transferParticipantSede(originalParticipant, 'Guayaquil');

    assert.equal(transferredToGye.sede, 'Guayaquil');
    assert.equal(transferredToGye.sedeActual, 'Guayaquil');
    // La sede de origen DEBE mantenerse inmutable como Cuenca
    assert.equal(transferredToGye.sedeOrigen, 'Cuenca');
    assert.equal(getParticipantOriginSede(transferredToGye), 'Cuenca');

    // Debe registrar la trazabilidad histórica del traslado
    assert.ok(Array.isArray(transferredToGye.historialTraslados));
    assert.equal(transferredToGye.historialTraslados.length, 1);
    assert.equal(transferredToGye.historialTraslados[0].from, 'Cuenca');
    assert.equal(transferredToGye.historialTraslados[0].to, 'Guayaquil');

    // Segundo traslado posterior a Lima
    const secondTransfer = transferParticipantSede(transferredToGye, 'Lima');
    assert.equal(secondTransfer.sede, 'Lima');
    assert.equal(secondTransfer.sedeOrigen, 'Cuenca'); // Sigue siendo Cuenca
    assert.equal(secondTransfer.historialTraslados.length, 2);
  });
});
