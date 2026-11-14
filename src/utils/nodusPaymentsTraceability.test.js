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

test('combo payments and Nodus alternate stage fields populate stageSummary accurately', () => {
  const contrato = { numeroDocumento: '45729876', nombre: 'Zorayda Alvarez' };
  const nodusCross = { pagadoC1: true, pagadoC2: false };
  const allPagos = [
    {
      id_factura: 22771,
      fecha: '2026-09-01',
      identificacion: '45729876',
      curso: 'Cap 1',
      metodo_pago: 'TC(DATAFAST)',
      monto: 790
    },
    {
      id_factura: 23463,
      fecha: '2026-10-01',
      identificacion: '45729876',
      entrenamiento: 'Capítulo 2 y Maestría (2do fin)',
      metodo_pago: 'TRANSFERENCIA AHORROS',
      monto: 3500
    }
  ];

  const trace = buildParticipantPaymentTraceability({ contrato, nodusCross, allPagos });
  assert.deepEqual(trace.stageSummary, { C1: true, C2: true, MJ: true });
  assert.equal(trace.hasUnclassifiedPayments, false);
  assert.equal(trace.allPaymentsUnclassified, false);
});

test('unclassified /api/pagos rows set hasUnclassifiedPayments and respect nodusCross pagadoC1/C2', () => {
  const contrato = { numeroDocumento: '11223344', nombre: 'Juan Perez' };
  const nodusCross = { pagadoC1: true, pagadoC2: false };
  const allPagos = [
    {
      id_factura: 27154,
      fecha: '2026-09-10',
      identificacion: '11223344',
      metodo_pago: 'TC(DATAFAST)',
      monto: 785
    },
    {
      id_factura: 30050,
      fecha: '2026-10-10',
      identificacion: '11223344',
      metodo_pago: 'EFECTIVO',
      monto: 2000
    }
  ];

  const trace = buildParticipantPaymentTraceability({ contrato, nodusCross, allPagos });
  assert.deepEqual(trace.stageSummary, { C1: true, C2: false, MJ: false });
  assert.equal(trace.hasUnclassifiedPayments, true);
  assert.equal(trace.allPaymentsUnclassified, true);
  assert.deepEqual(trace.invoiceNumbers, ['27154', '30050']);
});

test('underscore-separated Nodus concepts like c2_maestria match both C2 and MJ', () => {
  const contrato = { numeroDocumento: '22334455', nombre: 'Maria Lopez' };
  const allPagos = [
    {
      id_factura: 27154,
      fecha: '2026-09-04 16:37:34',
      identificacion: '22334455',
      concepto: 'c1',
      metodo_pago: 'TC(DATAFAST)',
      monto: 785
    },
    {
      id_factura: 30050,
      fecha: '2026-11-03 09:37:24',
      identificacion: '22334455',
      concepto: 'c2_maestria',
      metodo_pago: 'TRANSFERENCIA AHORROS',
      monto: 1000
    },
    {
      id_factura: 30154,
      fecha: '2026-11-07 12:24:16',
      identificacion: '22334455',
      concepto: 'c2_maestria',
      metodo_pago: 'EFECTIVO',
      monto: 1000
    }
  ];

  const trace = buildParticipantPaymentTraceability({ contrato, nodusCross: {}, allPagos });
  assert.deepEqual(trace.stageSummary, { C1: true, C2: true, MJ: true });
  assert.equal(trace.hasUnclassifiedPayments, false);
  assert.deepEqual(trace.payments[1].etapas, ['C2', 'MJ']);
});

test('normalizeNodusPaymentRow extracts SUNAT invoice numbers (F001-1324 / B001-4737) without confusing bank comprobante refs', () => {
  const fromCodigo = normalizeNodusPaymentRow({
    id_factura: 30050,
    codigo: 'F001-1324',
    comprobante: '007327',
    fecha: '2026-11-06',
    monto: 2000
  });
  assert.equal(fromCodigo.numeroFactura, 'F001-1324');
  assert.equal(fromCodigo.referencia, '007327');
  assert.equal(fromCodigo.idFactura, '30050');

  const fromSerieNumero = normalizeNodusPaymentRow({
    id_factura: 30051,
    serie: 'B001',
    correlativo: '4737',
    fecha: '2026-11-06',
    monto: 2000
  });
  assert.equal(fromSerieNumero.numeroFactura, 'B001-4737');
});

test('does NOT invent MJ true when all Nodus payments are explicitly tagged c2', () => {
  const contrato = { numeroDocumento: '45729876', nombre: 'Zorayda Alvarez' };
  const nodusCross = { maestriaNodus: true, pagadoC1: true, pagadoC2: true };
  const allPagos = [
    { id_factura: 22771, fecha: '2026-08-10', identificacion: '45729876', concepto: 'c1', monto: 720 },
    { id_factura: 23463, fecha: '2026-09-20', identificacion: '45729876', concepto: 'c2', monto: 1875 },
    { id_factura: 28455, fecha: '2026-10-28', identificacion: '45729876', concepto: 'c2', monto: 1695 }
  ];

  const trace = buildParticipantPaymentTraceability({ contrato, nodusCross, allPagos });
  assert.deepEqual(trace.stageSummary, { C1: true, C2: true, MJ: false });
  assert.equal(trace.totalByCurrency.PEN, 4290);
});
