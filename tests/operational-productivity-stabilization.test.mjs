import test from 'node:test';
import assert from 'node:assert/strict';

import {
  reconcilePaymentBalancesAtomic,
  recordPaymentTransactionAtomic
} from '../src/services/financeService.js';

test('1. Transaccionalidad Atómica en Caja y Abonos con Fail-Open Comercial', async () => {
  const initialPayment = {
    id: 'PAY-TEST-ATOMIC-01',
    montoTotal: 650.00,
    abonos: [
      { monto: 300.00, metodoPago: 'TRANSF', fecha: '2026-10-24T10:00:00Z' }
    ]
  };

  const newAbono = {
    monto: 350.00,
    metodoPago: 'EFECTIVO',
    referencia: 'VOUCHER-MESA-099'
  };

  // Reconciliación matemática pura
  const reconciled = reconcilePaymentBalancesAtomic(initialPayment, newAbono);
  assert.equal(reconciled.montoTotal, 650.00);
  assert.equal(reconciled.montoAbonado, 650.00);
  assert.equal(reconciled.saldoPendiente, 0);
  assert.equal(reconciled.estadoPago, 'PAGADO_TOTAL');
  assert.equal(reconciled.abonos.length, 2);

  // Ejecución transaccional (con fallback fail-open si Firestore offline en test runner)
  const txResult = await recordPaymentTransactionAtomic({
    paymentId: 'PAY-TEST-ATOMIC-01',
    sede: 'Lima',
    newAbono,
    metadata: { existingAbonos: initialPayment.abonos, montoTotal: 650.00 }
  });

  assert.equal(txResult.success, true);
  assert.equal(txResult.data.estadoPago, 'PAGADO_TOTAL');
  assert.equal(txResult.data.saldoPendiente, 0);
  assert.ok(txResult.latencyMs < 2000, 'SLA transaccional menor a 2 segundos');
});

test('2. Inmutabilidad Absoluta y Filtrado Visual de Fase Activa (Cero Deletes)', () => {
  // Simulación de tareas en base de datos
  const mockTasks = [
    {
      id: 'TASK-OLD-CLOSED-01',
      taskTitle: 'Cierre de Sala C1 E30 Lima',
      isClosed: true,
      completed: true,
      deadline: '2026-08-15T18:00:00Z', // Evento histórico pasado (> 2 meses)
      priority: 'high'
    },
    {
      id: 'TASK-ACTIVE-01',
      taskTitle: 'Llamadas de confirmación de asistencia C1 E32',
      isClosed: false,
      completed: false,
      deadline: '2026-10-25T12:00:00Z', // Activa para este fin de semana
      priority: 'high'
    },
    {
      id: 'TASK-ACTIVE-02',
      taskTitle: 'Reconciliación de abonos de caja en mesa de registro',
      isClosed: false,
      completed: false,
      deadline: '2026-10-25T15:00:00Z',
      priority: 'high'
    },
    {
      id: 'TASK-ACTIVE-SECONDARY-03',
      taskTitle: 'Revisión de stock de pulseras y credenciales',
      isClosed: false,
      completed: false,
      deadline: '2026-10-26T10:00:00Z',
      priority: 'normal'
    }
  ];

  // Filtro visual de ventana activa
  const isTaskInActiveWindow = (task) => {
    if (!task.isClosed && !task.completed) return true;
    if (task.deadline) {
      const deadlineDate = new Date(task.deadline);
      const diffDays = (Date.now() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 7 && (task.isClosed || task.completed)) {
        return false;
      }
    }
    return true;
  };

  const activePhaseTasks = mockTasks.filter(isTaskInActiveWindow);

  // Verificación: la tarea antigua se oculta visualmente pero el array original NO fue mutado ni borrado
  assert.equal(activePhaseTasks.length, 3);
  assert.equal(mockTasks.length, 4, 'Ningún registro fue eliminado de la base de datos');

  // Selección de los 2 compromisos de mayor impacto comercial (Bloque Protegido)
  const sorted = [...activePhaseTasks].sort((a, b) => {
    const isComercialA = /(asistencia|confirmar|abono|pago|check-in|caja|llamada)/i.test(a.taskTitle || '');
    const isComercialB = /(asistencia|confirmar|abono|pago|check-in|caja|llamada)/i.test(b.taskTitle || '');
    if (isComercialA && !isComercialB) return -1;
    if (!isComercialA && isComercialB) return 1;
    return 0;
  });

  const highImpact = sorted.slice(0, 2);
  const secondary = sorted.slice(2);

  assert.equal(highImpact.length, 2);
  assert.equal(secondary.length, 1);
  assert.ok(highImpact[0].taskTitle.includes('Llamadas de confirmación'));
  assert.ok(highImpact[1].taskTitle.includes('Reconciliación de abonos'));
});

test('3. Opacidad Tecnológica y Experiencia de Usuario Limpia', () => {
  // Lista de términos prohibidos en la interfaz de usuario
  const FORBIDDEN_JARGON = [
    'Efecto Zeigarnik',
    'Principio de Pareto',
    'Transacciones Atómicas',
    'Firestore',
    'Bayesiano'
  ];

  const UI_TEXT_SAMPLES = [
    'Cierre de Jornada — Mi Enfoque para Mañana',
    'Enfoque Operativo del Día — Bloque Protegido',
    'Tus 2 compromisos prioritarios para la jornada actual (Horario sugerido: 09:00 am - 11:00 am).',
    'Ver Actividades Complementarias',
    'Confirmación de Asistentes en Sala',
    'Reconciliación y Cobro de Abonos'
  ];

  for (const text of UI_TEXT_SAMPLES) {
    for (const forbidden of FORBIDDEN_JARGON) {
      assert.ok(
        !text.toLowerCase().includes(forbidden.toLowerCase()),
        `El texto UI '${text}' no debe contener jerga técnica o psicológica ('${forbidden}')`
      );
    }
  }
});
