/**
 * AI GOVERNANCE & CYBERSECURITY SANDBOX GATE - CAUSA OS (SO-AR)
 * =============================================================
 * Arquitectura de Blindaje y Gobernanza Zero-Trust para Inteligencias Artificiales.
 *
 * Directivas Obligatorias de Ciberseguridad:
 * 1. AI Sandbox: Aislamiento estricto de agentes (Copilot IA, Auditor de Seguros Gemini).
 * 2. Human-in-the-Loop (HITL): Las IAs tienen PROHIBIDO escribir directamente sobre
 *    colecciones financieras (liquidaciones_pagos, cfo-dashboard, finanzas_audit_trail, etc.).
 *    Cualquier sugerencia financiera genera una propuesta en cuarentena que requiere firma humana.
 * 3. Continuidad del Negocio (SLA <2s): Mecanismo de fallback seguro que garantiza
 *    cero latencia y cero fricción en Mesa de Registro (Check-in) y Domingo de Cosecha Comercial (C1 a C2).
 */

import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

export const PROTECTED_FINANCIAL_COLLECTIONS = Object.freeze([
  'liquidaciones_pagos',
  'cfo-dashboard',
  'finanzas_audit_trail',
  'liquidaciones_entrenadores',
  'pagos_comisiones',
  'banking_reconciliations'
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
 * Envoltorio de Resiliencia Operativa y Cero Fricción para Ingresos (SLA < 2000ms).
 * Si un módulo de seguridad auxiliar experimenta timeout o fallo, prioriza el flujo
 * de recaudación y registro de sala, ejecutando la operación y registrando la anomalía.
 */
export async function executeZeroLatencySafeFallback(primaryOperation, {
  operationName = 'Critical-Revenue-Operation',
  timeoutMs = 1800,
  fallbackOperation = null
} = {}) {
  const startTime = Date.now();

  try {
    // Carrera entre la operación principal y el timeout del SLA
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

    // Registro asíncrono de anomalía en Caja Negra sin bloquear el hilo principal
    recordSecurityAnomalyAsync({
      operationName,
      error: err.message,
      durationMs: duration,
      timestamp: new Date().toISOString()
    });

    // Ejecutar fallback de continuidad si fue provisto
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
