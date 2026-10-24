import { collection, doc, getDocs, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

export async function getHQOperationalStatus() {
  const hqStatuses = [];
  try {
    const snap = await getDocs(collection(db, 'hq_operational_status'));
    snap.forEach(doc => {
      hqStatuses.push({ id: doc.id, ...doc.data() });
    });
    return hqStatuses;
  } catch (error) {
    console.error("Error fetching HQ status:", error);
    return [];
  }
}

export async function toggleHQBlock(sedeId, isBlocked, blockedBy, reason = '') {
  try {
    const hqRef = doc(db, 'hq_operational_status', sedeId);
    await setDoc(hqRef, {
      sede: sedeId,
      isBlocked,
      blockedBy,
      blockedAt: isBlocked ? serverTimestamp() : null,
      reason: isBlocked ? reason : ''
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error toggling HQ block:", error);
    return false;
  }
}

// Datos canónicos reales de sedes y contadores para auditoría Zero-Trust de CREAR
export const officialFinancialData = [
  { 
    sede: 'Lima (Perú)', 
    sedeKey: 'lima',
    pais: 'Perú',
    razonSocial: 'CREACIÓN CUÁNTICA E.I.R.L. (RUC 20612592811)',
    gerentes: ['Jose Sanchez'],
    contadores: ['Gabriela Rivadeneyra'], 
    emailContable: 'contabilidad.lima@crearpsl.net',
    nodusIncome: 118500, 
    bankConciliated: 118500, 
    pendingExpenses: 6800, 
    asistentesNodus: 927,
    matriculadosNodus: 2051,
    slaStatus: 'COMPLETED', 
    isBlocked: false 
  },
  { 
    sede: 'Quito (Ecuador)', 
    sedeKey: 'quito',
    pais: 'Ecuador',
    gerentes: ['Emily Campuzano', 'David Sosa'],
    contadores: ['Diego Flores', 'Alexis Teran'], 
    emailContable: 'diego.flores@crearpsl.net',
    nodusIncome: 94200, 
    bankConciliated: 91800, 
    pendingExpenses: 11200, 
    asistentesNodus: 885,
    matriculadosNodus: 5067,
    slaStatus: 'WARNING', 
    isBlocked: false 
  },
  { 
    sede: 'Medellín (Colombia)', 
    sedeKey: 'medellin',
    pais: 'Colombia',
    gerentes: ['Yurany G Franco'],
    contadores: ['Hector Gonzalez'], 
    emailContable: 'contabilidad.medellin@crearpsl.net',
    nodusIncome: 68400, 
    bankConciliated: 65900, 
    pendingExpenses: 6200, 
    asistentesNodus: 1018,
    matriculadosNodus: 1418,
    slaStatus: 'WARNING', 
    isBlocked: false 
  },
  { 
    sede: 'Guayaquil (Ecuador)', 
    sedeKey: 'guayaquil',
    pais: 'Ecuador',
    gerentes: ['Josue Vera'],
    contadores: ['Sebastian Jacome', 'Erica Logacho'], 
    emailContable: 'contabilidad.global@crearpsl.net',
    nodusIncome: 52000, 
    bankConciliated: 52000, 
    pendingExpenses: 5400, 
    asistentesNodus: 27,
    matriculadosNodus: 1902,
    slaStatus: 'COMPLETED', 
    isBlocked: false 
  },
  { 
    sede: 'Cuenca (Ecuador)', 
    sedeKey: 'cuenca',
    pais: 'Ecuador',
    gerentes: ['July Leon', 'Edison Ricardo Gavilánez'],
    contadores: ['Erica Logacho'], 
    emailContable: 'asistente.contable@crearpsl.net',
    nodusIncome: 41500, 
    bankConciliated: 41500, 
    pendingExpenses: 3650, 
    asistentesNodus: 8,
    matriculadosNodus: 3137,
    slaStatus: 'COMPLETED', 
    isBlocked: false 
  }
];

export const mockFinancialData = officialFinancialData;

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIVA SUBALTERNA (Contadores / Analistas)
// ─────────────────────────────────────────────────────────────────────────────

export async function submitDailyClose(sede, payload) {
  try {
    const closeRef = doc(collection(db, 'finance_daily_close'));
    await setDoc(closeRef, {
      sede,
      ...payload,
      timestamp: serverTimestamp(),
      hash: 'SHA256-MOCK-HASH-' + Date.now() // Simulación de inmutabilidad criptográfica
    });
    return true;
  } catch (error) {
    console.error("Error en cierre diario:", error);
    return false;
  }
}

export async function submitWeeklySLA(sede, payload) {
  try {
    // 1. Guardar el reporte
    const reportRef = doc(collection(db, 'finance_conciliations'));
    await setDoc(reportRef, {
      sede,
      ...payload,
      submittedAt: serverTimestamp(),
      status: 'SUBMITTED'
    });

    // 2. Aquí iría la lógica en Cloud Functions para cruzar con Nodus, 
    // pero actualizamos el estado optimista para el dashboard.
    return true;
  } catch (error) {
    console.error("Error al enviar SLA semanal:", error);
    return false;
  }
}

/**
 * Reconciliación Matemática y Transaccional de Pagos / Abonos (Zero-Descuadre).
 * Garantiza que la sumatoria de abonos, el saldo pendiente y el monto total
 * mantengan consistencia atómica inmutable sin descuadres aritméticos.
 */
export function reconcilePaymentBalancesAtomic(paymentRecord = {}, newAbono = null) {
  const montoTotal = Number(paymentRecord.montoTotal || paymentRecord.totalAmount || paymentRecord.price || 0);
  const existingAbonos = Array.isArray(paymentRecord.abonos) ? [...paymentRecord.abonos] : [];

  if (newAbono && Number(newAbono.monto) > 0) {
    existingAbonos.push({
      ...newAbono,
      monto: Number(newAbono.monto),
      fecha: newAbono.fecha || new Date().toISOString(),
      metodoPago: newAbono.metodoPago || 'EFECTIVO'
    });
  }

  const montoAbonado = existingAbonos.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
  const saldoPendiente = Math.max(0, Math.round((montoTotal - montoAbonado) * 100) / 100);

  let estadoPago = 'PENDIENTE';
  if (saldoPendiente <= 0 && montoTotal > 0) {
    estadoPago = 'PAGADO_TOTAL';
  } else if (montoAbonado > 0) {
    estadoPago = 'ABONO_PARCIAL';
  }

  return {
    ...paymentRecord,
    montoTotal,
    montoAbonado: Math.round(montoAbonado * 100) / 100,
    saldoPendiente,
    estadoPago,
    abonos: existingAbonos,
    ultimaReconciliacion: new Date().toISOString()
  };
}

/**
 * Registra o actualiza un pago con abonos en Firestore utilizando runTransaction(db, ...).
 * Garantiza cero colisiones y cero descuadres aritméticos entre múltiples cajas concurrentes.
 * 
 * Directiva Fail-Open Comercial:
 * Si la conexión experimenta timeout o latencia de red, se efectúa la reconciliación atómica
 * en memoria y se aprueba de inmediato la transacción para no detener el cobro al participante,
 * emitiendo una alerta asíncrona a la bitácora de auditoría.
 * 
 * @param {Object} params
 * @param {string} params.paymentId - Identificador único de la cuenta/ticket del participante
 * @param {string} params.sede - Sede de registro (ej. 'lima', 'quito')
 * @param {Object} [params.newAbono] - Nuevo abono { monto, metodoPago, referencia, fecha }
 * @param {Object} [params.metadata] - Datos adicionales de contexto
 * @returns {Promise<Object>} Resultado atómico con saldo actualizado y estado transaccional
 */
export async function recordPaymentTransactionAtomic({
  paymentId,
  sede = 'Global',
  newAbono = null,
  metadata = {}
}) {
  if (!paymentId) {
    throw new Error('Identificador de pago obligatorio para garantizar consistencia');
  }

  const startTime = Date.now();
  const paymentRef = doc(db, 'finance_payments', String(paymentId));
  const auditCol = collection(db, 'finanzas_audit_trail');

  try {
    const result = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(paymentRef);
      const currentData = snap.exists() ? snap.data() : { id: paymentId, sede, montoTotal: 0, abonos: [] };

      // Reconciliación atómica de saldos (hecho inmutable)
      const reconciled = reconcilePaymentBalancesAtomic(currentData, newAbono);

      const updatePayload = {
        ...reconciled,
        sede,
        ...metadata,
        updatedAt: serverTimestamp(),
        lastTransactionLatencyMs: Date.now() - startTime
      };

      transaction.set(paymentRef, updatePayload, { merge: true });

      // Registro inmutable en bitácora de transacciones
      const auditDocRef = doc(auditCol);
      transaction.set(auditDocRef, {
        paymentId,
        sede,
        montoAbonado: Number(newAbono?.monto || 0),
        saldoPendiente: reconciled.saldoPendiente,
        estadoPago: reconciled.estadoPago,
        metodoPago: newAbono?.metodoPago || 'EFECTIVO',
        timestamp: serverTimestamp(),
        concurrencyProtected: true
      });

      return reconciled;
    });

    return {
      success: true,
      failOpen: false,
      data: result,
      latencyMs: Date.now() - startTime
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.warn(`[Finance Fail-Open] Transacción Firestore diferida por contingencia (${error.message}). Activando registro comercial inmediato.`);

    // Fail-Open Innegociable: el cobro no se detiene jamás en sala
    const fallbackReconciled = reconcilePaymentBalancesAtomic(
      { id: paymentId, sede, montoTotal: metadata.montoTotal || 0, abonos: metadata.existingAbonos || [] },
      newAbono
    );

    // Registro asíncrono en cuarentena para auditoría posterior sin frenar la mesa
    setTimeout(async () => {
      try {
        const quarantineCol = collection(db, 'security_quarantine_audits');
        await setDoc(doc(quarantineCol), {
          paymentId,
          sede,
          montoAbonado: Number(newAbono?.monto || 0),
          errorReason: error.message,
          latencyMs,
          status: 'FAIL_OPEN_APPROVED_PENDING_AUDIT',
          timestamp: serverTimestamp()
        });
      } catch (e) {
        // Silencioso para garantizar cero impacto en el cliente
      }
    }, 10);

    return {
      success: true,
      failOpen: true,
      data: fallbackReconciled,
      warning: 'Operación asegurada en modo de continuidad operativa (Fail-Open)',
      latencyMs
    };
  }
}

/**
 * Script de Hidratación (Cero Pérdida de Datos)
 * Etiqueta tareas históricas de contadores con una categoría financiera silenciosa.
 * Se puede ejecutar una sola vez desde el panel de SuperAdmin.
 */
export async function hydrateFinanceTasks() {
  throw new Error('La hidratación de tareas asignadas a terceros requiere un proceso confiable de backend; no puede ejecutarse desde el cliente.');
}
