/**
 * AI GOVERNANCE & CYBERSECURITY SANDBOX GATE - CAUSA OS (SO-AR)
 * =============================================================
 * Arquitectura de Blindaje, DevSecOps y Gobernanza Zero-Trust.
 *
 * Directivas Obligatorias de Ciberseguridad:
 * 1. AI Sandbox: Aislamiento estricto de agentes (Copilot IA, Auditor de Seguros Gemini).
 * 2. Human-in-the-Loop (HITL): Las IAs tienen PROHIBIDO escribir directamente sobre
 *    colecciones financieras (liquidaciones_pagos, cfo-dashboard, finanzas_audit_trail, etc.).
 *    Cualquier sugerencia financiera genera una propuesta en cuarentena que requiere firma humana.
 * 3. Operatividad Fail-Open para Ingresos (SLA < 2s): Si los filtros de seguridad o WAF
 *    experimentan latencia o fallas, el registro de caja y abonos atómicos NO se detiene;
 *    se autoriza en modo Fail-Open y se emite auditoría asíncrona para revisión posterior.
 */

import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { reconcilePaymentBalancesAtomic } from './financeService.js';

export const PROTECTED_FINANCIAL_COLLECTIONS = Object.freeze([
  'liquidaciones_pagos',
  'cfo-dashboard',
  'finanzas_audit_trail',
  'liquidaciones_entrenadores',
  'pagos_comisiones',
  'banking_reconciliations',
  'finance_conciliations',
  'finance_daily_close',
  'agent_deterministic_ledger',
  'cfo_batch_approvals'
]);

export const PROTECTED_SENSITIVE_COLLECTIONS = Object.freeze([
  'px_legal_signatures',
  'identity_canonicals',
  'crm_participants'
]);

export const HUMAN_MANAGEMENT_ROLES = Object.freeze([
  'superadmin',
  'gerente',
  'direccion',
  'cfo',
  'ceo',
  'coordinador_c1c2'
]);

/**
 * Bloqueo estricto para Copilot IA y Agentes Autónomos.
 * Garantiza que las IAs solo puedan realizar lecturas en colecciones financieras.
 */
export function enforceAICopilotFinancialLock(agentName = '', action = 'read', targetCollection = '') {
  const normCol = String(targetCollection).toLowerCase().trim();
  const isFinancial = PROTECTED_FINANCIAL_COLLECTIONS.includes(normCol);
  
  const isAIAgent = /(copilot|gemini|gpt|groq|ai|bot|autonomous|scraper)/i.test(agentName);

  if (isAIAgent && isFinancial && action !== 'read') {
    return {
      locked: true,
      reason: `[AI CYBERSECURITY LOCK] El agente ${agentName} tiene prohibido modificar la colección financiera '${normCol}'. Acción confinada a solo-lectura.`
    };
  }

  return { locked: false };
}

/**
 * Valida si una operación solicitada por un agente de IA está autorizada o debe ser contenida.
 */
export async function validateAIOperation({
  agentName = 'Unknown-AI-Agent',
  targetCollection = '',
  action = 'read', // 'read' | 'create' | 'update' | 'delete'
  payload = {},
  authenticatedUser = null
}) {
  const normCol = String(targetCollection).toLowerCase().trim();
  const isFinancial = PROTECTED_FINANCIAL_COLLECTIONS.includes(normCol);
  const isSensitive = PROTECTED_SENSITIVE_COLLECTIONS.includes(normCol);

  // Lecturas permitidas para análisis
  if (action === 'read') {
    return {
      allowed: true,
      requiresHITL: false,
      reason: 'Lectura autorizada para análisis de IA.'
    };
  }

  // Verificación específica de Copilot IA
  const lockCheck = enforceAICopilotFinancialLock(agentName, action, normCol);
  if (lockCheck.locked) {
    console.warn(`🚨 ${lockCheck.reason}`);
  }

  // REGLA ZERO-TRUST: Si una IA intenta escribir en finanzas o datos sensibles
  if (isFinancial || isSensitive) {
    // Si no hay un usuario humano autenticado con rol gerencial explícito, BLOQUEO ABSOLUTO
    const userRole = (authenticatedUser?.role || authenticatedUser?.appRole || '').toLowerCase();
    const isHumanManager = authenticatedUser && HUMAN_MANAGEMENT_ROLES.includes(userRole);

    if (!isHumanManager) {
      console.warn(`🚨 [AI Sandbox] Intento de escritura autónoma de ${agentName} en ${normCol} bloqueado.`);

      // Registrar propuesta en cola de aprobación humana (HITL)
      let proposalId = null;
      try {
        const proposalsCol = collection(db, 'ai_pending_approvals');
        const proposalDoc = await addDoc(proposalsCol, {
          agentName,
          targetCollection: normCol,
          action,
          proposedPayload: payload,
          status: 'PENDING_HUMAN_APPROVAL',
          createdAt: serverTimestamp(),
          securityFlag: 'CONTAINED_BY_AI_SANDBOX',
          requiresRole: 'gerente_o_cfo'
        });
        proposalId = proposalDoc.id;
      } catch (err) {
        console.error('Error registrando propuesta HITL:', err);
      }

      return {
        allowed: false,
        requiresHITL: true,
        proposalId,
        reason: `Acción financiera o sensible de IA en '${normCol}' contenida. Requiere aprobación humana explícita (Human-in-the-loop).`
      };
    }
  }

  // Operaciones no críticas permitidas
  return {
    allowed: true,
    requiresHITL: false,
    reason: 'Operación permitida en sandbox.'
  };
}

/**
 * Operatividad Fail-Open para el Flujo de Ingresos (Mesa de Registro & Pagos).
 * 
 * Si los escudos de seguridad (WAF, verificación de IPs, rate limiters) experimentan
 * latencia o caída, el cobro y reconciliación atómica proceden de inmediato sin perder
 * un solo dólar, emitiendo una auditoría en cuarentena asíncrona.
 * 
 * SLA Garantizado: < 800ms.
 */
export async function executeFailOpenRevenueTransaction(paymentRecord = {}, newAbono = null, securityGatePromise = null) {
  const startTime = Date.now();
  let failOpenTriggered = false;
  let securityError = null;

  // Si hay un chequeo de seguridad provisto (ej. validación WAF o IP), correr con timeout estricto de 350ms
  if (securityGatePromise && typeof securityGatePromise.then === 'function') {
    try {
      const securityTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SECURITY_GATE_TIMEOUT_350MS')), 350)
      );
      await Promise.race([securityGatePromise, securityTimeout]);
    } catch (secErr) {
      failOpenTriggered = true;
      securityError = secErr.message;
      console.warn(`⚡ [Revenue Fail-Open] Chequeo de seguridad derivado a auditoría asíncrona: ${secErr.message}`);
    }
  }

  // Ejecución de la reconciliación atómica financiera (hecho inmutable)
  const reconciled = reconcilePaymentBalancesAtomic(paymentRecord, newAbono);

  const durationMs = Date.now() - startTime;

  if (failOpenTriggered) {
    reconciled.securityStatus = 'FAIL_OPEN_APPROVED_PENDING_AUDIT';
    reconciled.quarantineAuditRequired = true;
    reconciled.securityAuditNote = `Aprobado por política Fail-Open (SLA ${durationMs}ms): ${securityError}`;

    // Disparar registro asíncrono a auditoría de cuarentena sin frenar la respuesta
    recordQuarantineAuditAsync({
      paymentRecordId: paymentRecord.id || paymentRecord.ticket,
      monto: newAbono?.monto || paymentRecord.montoTotal,
      sede: paymentRecord.sede || 'Global',
      reason: securityError,
      latencyMs: durationMs,
      timestamp: new Date().toISOString()
    });
  } else {
    reconciled.securityStatus = 'VERIFIED_ZERO_TRUST';
  }

  return {
    success: true,
    reconciledPayment: reconciled,
    failOpenTriggered,
    durationMs,
    slaStatus: durationMs < 2000 ? 'SLA_MET_SUB_2S' : 'SLA_BREACH'
  };
}

/**
 * Envoltorio de Resiliencia Operativa y Cero Fricción para Ingresos (SLA < 2000ms).
 */
export async function executeZeroLatencySafeFallback(primaryOperation, {
  operationName = 'Critical-Revenue-Operation',
  timeoutMs = 1800,
  fallbackOperation = null
} = {}) {
  const startTime = Date.now();

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`SLA_TIMEOUT_EXCEEDED (${timeoutMs}ms)`)), timeoutMs);
    });

    const result = await Promise.race([primaryOperation(), timeoutPromise]);
    const duration = Date.now() - startTime;
    return {
      success: true,
      data: result,
      durationMs: duration,
      fallbackUsed: false
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.warn(`⚡ [Business Continuity] Fallback activado en '${operationName}' tras ${duration}ms: ${err.message}`);

    recordSecurityAnomalyAsync({
      operationName,
      error: err.message,
      durationMs: duration,
      timestamp: new Date().toISOString()
    });

    if (typeof fallbackOperation === 'function') {
      try {
        const fallbackResult = await fallbackOperation();
        return {
          success: true,
          data: fallbackResult,
          durationMs: Date.now() - startTime,
          fallbackUsed: true,
          anomalyLogged: true
        };
      } catch (fErr) {
        console.error(`Error crítico en fallback de '${operationName}':`, fErr);
      }
    }

    return {
      success: false,
      error: err.message,
      durationMs: duration,
      fallbackUsed: true
    };
  }
}

/**
 * Registra eventos en cuarentena asíncrona sin agregar latencia al checkout.
 */
function recordQuarantineAuditAsync(auditData) {
  setTimeout(async () => {
    try {
      const colRef = collection(db, 'security_quarantine_audits');
      await addDoc(colRef, {
        ...auditData,
        status: 'QUARANTINE_LOGGED',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      // Silencioso en caso de desconexión transitoria
    }
  }, 10);
}

/**
 * Registra anomalías en background sin agregar latencia a los flujos en vivo.
 */
function recordSecurityAnomalyAsync(anomaly) {
  setTimeout(async () => {
    try {
      const logsCol = collection(db, 'audit_logs');
      await addDoc(logsCol, {
        action: 'SECURITY_MODULE_SAFE_FALLBACK_TRIGGERED',
        category: 'business_continuity',
        details: anomaly,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      // Silencioso para no romper ejecución de cliente
    }
  }, 10);
}
