import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  inferPaymentStage,
  normalizeNodusPaymentRow,
  buildParticipantPaymentTraceability
} from './nodusPaymentsTraceability.js';

test('inferPaymentStage classifies C1, C2 and Maestría (PFD/SFD/TFD/MJ)', () => {
  assert.equal(inferPaymentStage('Capítulo 1', 'Inscripción C1'), 'C1');
  assert.equal(inferPaymentStage('', 'Pago Segundo Capítulo C2'), 'C2');
  assert.equal(inferPaymentStage('SFD', 'Maestría del Juego Equipo 31'), 'MJ');
  assert.equal(inferPaymentStage('MJ', 'Caminata sobre fuego'), 'MJ');
});

test('buildParticipantPaymentTraceability merges C1->MJ payments from /api/pagos and nodusRecord', () => {
  const contrato = {
    nombre: 'Zorayda Susana Alvarez Neyra',
    numeroDocumento: '45729876',
    email: 'zoraed@gmail.com'
  };

  const nodusCross = {
    nodusDoc: '45729876',
    nodusRecord: {
      id: 9081,
      identificacion: '45729876',
      capitulo1: { asistio: true, pagado: true },
      capitulo2: { asistio: true, pagado: true },
      pagos: [
        {
          id_factura: 1001,
          fecha: '2026-06-10 10:15:00',
          etapa: 'C1',
          concepto: 'Capítulo 1',
          metodo_pago: 'Yape',
          monto: 650,
          moneda: 'PEN',
          referencia: 'YP-8821'
        }
      ]
    }
  };

  const allPagos = [
    // Duplicate id_factura 1001 from /api/pagos should deduplicate cleanly
    {
      id_factura: 1001,
      fecha: '2026-06-10 10:15:00',
      identificacion: '45729876',
      etapa: 'C1',
      metodo_pago: 'Yape',
      monto: 650
    },
    {
      id_factura: 1045,
      fecha: '2026-08-05 14:20:00',
      identificacion: '45729876',
      concepto: 'Capítulo 2 - Equipo 31',
      modo_pago: 'Transferencia BCP',
      nro_operacion: 'OP-99310',
      monto: 900,
      moneda: 'PEN'
    },
    {
      id_factura: 1199,
      fecha: '2026-10-12 18:00:00',
      id_participante: 9081,
      concepto: 'Maestría SFD',
      forma_pago: 'Tarjeta Visa',
      comprobante: 'B001-442',
      monto: 1200,
      moneda: 'PEN'
    },
    // Different participant should NOT match
    {
      id_factura: 1200,
      fecha: '2026-10-13 09:00:00',
      identificacion: '99999999',
      concepto: 'Maestría SFD',
      metodo_pago: 'Efectivo',
      monto: 500
    }
  ];

  const trace = buildParticipantPaymentTraceability({ contrato, nodusCross, allPagos });

  assert.equal(trace.payments.length, 3);
  assert.deepEqual(trace.payments.map((p) => p.etapa), ['C1', 'C2', 'MJ']);
  assert.deepEqual(trace.payments.map((p) => p.modoPago), ['Yape', 'Transferencia BCP', 'Tarjeta Visa']);
  assert.equal(trace.totalByCurrency.PEN, 2750);
  assert.deepEqual(trace.stageSummary, { C1: true, C2: true, MJ: true });
});

test('normalizeNodusPaymentRow preserves missing amount without inventing zeros', () => {
  const row = normalizeNodusPaymentRow({ id_factura: 55, fecha: '2026-11-01', metodo_pago: 'Efectivo' });
  assert.equal(row.monto, null);
  assert.equal(row.modoPago, 'Efectivo');
});
