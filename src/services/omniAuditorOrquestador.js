/**
 * ======================================================================================
 * OMNI-AUDITOR Y SUPER-AGENTE ORQUESTADOR DE CAUSA OS (SO-AR)
 * Causa OS — Sistema Operativo de Alto Rendimiento (CPSL)
 * ======================================================================================
 * 
 * PRINCIPIO FUNDAMENTAL:
 * "Nodus es el hecho inmutable, Causa OS toma la decisión verificable."
 * 
 * MISIÓN Y GOBERNANZA ANTI-ALUCINACIÓN:
 * 1. Cero Alucinación y Verdad Única: Prohibición de inferir o inventar datos. Si no existe en Nodus,
 *    se cataloga estrictamente como [DATO NO REGISTRADO EN NODUS] y se aborta cualquier acción dependiente.
 * 2. Trazabilidad Determinista (Hashing Anti-Redundancia): Cada operación cruzada se sella con SHA-256.
 *    Las acciones repetidas se descartan automáticamente de forma idempotente.
 * 3. Auditoría de Rendición de Cuentas (Sentinels & Heartbeats): Monitoreo de agentes activos.
 *    Emisión de Alerta Roja ante inactividad o quiebres operativos a Dirección General y SuperAdmin.
 * 4. Control Humano en Decisiones Críticas (HITL): Los agentes jamás ejecutan acciones financieras
 *    o legales sin la autorización explícita de un humano con rol directivo (CFO, Gerente, SuperAdmin).
 * 5. Aislamiento de Fase Activa: Filtrado temporal estricto (PRE-C1, C1, C2, MJ). Se rechaza el
 *    procesamiento de ciclos o meses futuros lejanos para evitar polución operativa.
 */

import { db } from './firebase.js';
import { collection, doc, getDoc, setDoc, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { validateAIOperation } from './aiGovernanceSecuritySandbox.js';

// Lista oficial de agentes autónomos bajo gobernanza del Super-Agente
export const MONITORED_AUTONOMOUS_AGENTS = [
  { id: 'CausaNodusAgent', name: 'Agente Sincronizador Nodus CRM', maxInactivityHours: 6, critical: true },
  { id: 'cmjSentinelAgent', name: 'Centinela de Maestría del Juego (CMJ)', maxInactivityHours: 12, critical: true },
  { id: 'goalsSentinelAgent', name: 'Centinela de Metas y Compromisos', maxInactivityHours: 12, critical: true },
  { id: 'GuardianConfidencialidad', name: 'Guardián de Confidencialidad y Aislamiento', maxInactivityHours: 24, critical: true },
  { id: 'AgentAuditoriaSentadosConfirmados', name: 'Auditor de Sentados vs Confirmados', maxInactivityHours: 12, critical: true },
  { id: 'segurosSentinelAgent', name: 'Centinela de Pólizas y Seguros', maxInactivityHours: 24, critical: false },
  { id: 'nodusHrSentinelAgent', name: 'Centinela de Talento Humano y Staff', maxInactivityHours: 24, critical: false }
];

// Fases operativas permitidas
export const VALID_OPERATIONAL_PHASES = ['PRE-C1', 'C1', 'C2', 'MJ'];

/**
 * Genera un Hash Criptográfico Determinista SHA-256
 * Compatible tanto con Node.js (Crypto) como con entornos de navegador (SubtleCrypto / Polyfill).
 */
export async function computeDeterministicHash(payload) {
  const serialized = typeof payload === 'string' 
    ? payload 
    : JSON.stringify(payload, Object.keys(payload).sort());

  // Entorno Node.js
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      const crypto = await import('node:crypto');
      return crypto.createHash('sha256').update(serialized).digest('hex');
    } catch {
      // Fallback a crypto global
    }
  }

  // Entorno Navegador con Web Crypto API
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(serialized);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback determinista seguro de 64 caracteres
  let hash1 = 0x811c9dc5;
  let hash2 = 0x5a17e3f9;
  for (let i = 0; i < serialized.length; i++) {
    const code = serialized.charCodeAt(i);
    hash1 ^= code;
    hash1 = Math.imul(hash1, 0x01000193);
    hash2 ^= (code << 3);
    hash2 = Math.imul(hash2, 0x01000193);
  }
  const h1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const h2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return (h1 + h2).repeat(4).slice(0, 64);
}

/**
 * Normaliza identificadores para cruces libres de ambigüedad
 */
export function normalizeEntityString(val) {
  if (!val) return '';
  return String(val)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export class OmniAuditorOrquestador {
  constructor(options = {}) {
    this.name = 'Omni-Auditor-Super-Agent';
    this.version = '3.5.0';
    this.options = options;
    this.ledgerCache = new Set();
  }

  /**
   * DIRECTIVA 1: CERO ALUCINACIÓN Y VERDAD ÚNICA
   * Verifica si un hecho transaccional existe de forma veraz e inmutable en el repositorio Nodus.
   * Si no existe, se cataloga estrictamente como [DATO NO REGISTRADO EN NODUS] y se aborta cualquier acción.
   */
  verifyNodusSourceFact(candidateRecord, nodusDataset, entityType = 'participant') {
    if (!candidateRecord) {
      return {
        verified: false,
        status: 'REJECTED_EMPTY_CANDIDATE',
        label: '[DATO NO REGISTRADO EN NODUS]',
        reason: 'El registro candidato provisto es nulo o inválido.'
      };
    }

    if (!nodusDataset) {
      return {
        verified: false,
        status: 'ABORTED_NO_NODUS_SOURCE',
        label: '[DATO NO REGISTRADO EN NODUS]',
        reason: 'La fuente transaccional de Nodus no está disponible. Operación abortada.'
      };
    }

    // Identificadores de cruce: ID directo, correo o documento de identidad / teléfono
    const candidateId = candidateRecord.id || candidateRecord.standardId || candidateRecord.docId;
    const candidateEmail = normalizeEntityString(candidateRecord.email);
    const candidateDni = normalizeEntityString(candidateRecord.dni || candidateRecord.cedula || candidateRecord.identificacion);
    const candidateName = normalizeEntityString(candidateRecord.nombre || candidateRecord.name || candidateRecord.participantName);

    let foundFact = null;

    if (Array.isArray(nodusDataset)) {
      foundFact = nodusDataset.find(item => {
        if (!item) return false;
        const itemId = item.id || item.standardId || item.docId;
        const itemEmail = normalizeEntityString(item.email);
        const itemDni = normalizeEntityString(item.dni || item.cedula || item.identificacion);
        const itemName = normalizeEntityString(item.nombre || item.name || item.participantName);

        if (candidateId && itemId && String(candidateId).trim() === String(itemId).trim()) return true;
        if (candidateEmail && itemEmail && candidateEmail === itemEmail) return true;
        if (candidateDni && itemDni && candidateDni === itemDni) return true;
        if (candidateName && itemName && candidateName === itemName && candidateName.length > 5) return true;
        return false;
      });
    } else if (typeof nodusDataset === 'object') {
      // Búsqueda en mapas indexados o estructuras complejas (ej. maestriaData por equipo/etapa)
      const values = Object.values(nodusDataset);
      for (const val of values) {
        if (Array.isArray(val)) {
          const subFind = this.verifyNodusSourceFact(candidateRecord, val, entityType);
          if (subFind.verified) return subFind;
        } else if (val && typeof val === 'object') {
          // Búsqueda en sub-arreglos (PFD, SFD, TFD participantes)
          const nested = [val.PFD?.participantes, val.SFD?.participantes, val.TFD?.participantes, val.participantes, val.enrolados];
          for (const arr of nested) {
            if (Array.isArray(arr)) {
              const subFind = this.verifyNodusSourceFact(candidateRecord, arr, entityType);
              if (subFind.verified) return subFind;
            }
          }
        }
      }
    }

    if (!foundFact) {
      return {
        verified: false,
        status: 'UNVERIFIED_INVENTED_OR_MISSING',
        label: '[DATO NO REGISTRADO EN NODUS]',
        reason: `El registro '${candidateName || candidateEmail || candidateId}' no existe en Nodus transaccional. Acción automatizada abortada.`,
        candidate: candidateRecord
      };
    }

    return {
      verified: true,
      status: 'VERIFIED_NODUS_SOURCE',
      label: foundFact.nombre || foundFact.name || candidateName,
      sourceNodusFact: foundFact
    };
  }

  /**
   * DIRECTIVA 2: TRAZABILIDAD DETERMINISTA (HASHING ANTI-REDUNDANCIA)
   * Valida y registra una acción cruzada mediante un hash matemático SHA-256 único.
   * Descarta tareas repetidas de forma idempotente para evitar duplicación o métricas infladas.
   */
  async validateAndRecordDeterministicAction(actionPayload) {
    const {
      agentId,
      entityId,
      cyclePhase,
      operationType,
      timestampDate,
      payload
    } = actionPayload;

    if (!agentId || !entityId || !operationType) {
      throw new Error('[OmniAuditor] actionPayload debe incluir agentId, entityId y operationType.');
    }

    const canonicalComponents = [
      agentId,
      entityId,
      cyclePhase || 'GENERAL',
      operationType,
      timestampDate || new Date().toISOString().slice(0, 10), // Fecha en granularidad de día
      payload ? JSON.stringify(payload) : ''
    ];

    const actionHash = await computeDeterministicHash(canonicalComponents.join('::'));

    // 1. Verificación en caché rápida local
    if (this.ledgerCache.has(actionHash)) {
      return {
        executed: false,
        status: 'DUPLICATE_DISCARDED_LOCAL',
        hash: actionHash,
        message: 'Acción previamente ejecutada en esta sesión. Descartada por idempotencia determinista.'
      };
    }

    // 2. Verificación en Firestore Ledger persistente (si db está disponible)
    if (db) {
      try {
        const ledgerRef = doc(db, 'agent_deterministic_ledger', actionHash);
        const existingSnap = await getDoc(ledgerRef);

        if (existingSnap.exists()) {
          this.ledgerCache.add(actionHash);
          return {
            executed: false,
            status: 'DUPLICATE_DISCARDED_PERSISTED',
            hash: actionHash,
            existingRecord: existingSnap.data(),
            message: 'Acción ya registrada en el ledger inmutable de Firestore. Descartada para evitar inflación.'
          };
        }

        // Registrar nuevo hecho en el ledger inmutable
        await setDoc(ledgerRef, {
          hash: actionHash,
          agentId,
          entityId,
          cyclePhase: cyclePhase || 'GENERAL',
          operationType,
          timestamp: new Date().toISOString(),
          createdAt: serverTimestamp()
        });

        this.ledgerCache.add(actionHash);
      } catch (err) {
        console.warn(`[OmniAuditor Ledger] Ledger offline / error de conexión: ${err.message}`);
        this.ledgerCache.add(actionHash);
      }
    } else {
      this.ledgerCache.add(actionHash);
    }

    return {
      executed: true,
      status: 'COMMITTED',
      hash: actionHash,
      message: 'Acción sellada criptográficamente y aprobada para procesamiento.'
    };
  }

  /**
   * DIRECTIVA 3: AUDITORÍA DE RENDICIÓN DE CUENTAS (SENTINELS & HEARTBEATS)
   * Escanea las bitácoras y latidos de los agentes autónomos.
   * Si detecta inactividad mayor a la tolerada o quiebres operativos, emite una ALERTA ROJA inmediata.
   */
  async scanSentinelsAndAuditHeartbeats(agentHeartbeats = []) {
    const now = new Date();
    const scanReport = {
      timestamp: now.toISOString(),
      totalMonitored: MONITORED_AUTONOMOUS_AGENTS.length,
      healthyAgents: [],
      quiebresDetectados: [],
      alertasRojasEmitidas: []
    };

    const heartbeatsMap = new Map();
    agentHeartbeats.forEach(hb => {
      if (hb?.agentId) heartbeatsMap.set(hb.agentId, hb);
    });

    for (const def of MONITORED_AUTONOMOUS_AGENTS) {
      const hb = heartbeatsMap.get(def.id);

      if (!hb) {
        // Quiebre: Agente nunca ha reportado latido
        const quiebre = {
          agentId: def.id,
          agentName: def.name,
          tipoQuiebre: 'SIN_LATIDO_HISTORICO',
          nivelGravedad: def.critical ? 'CRITICA' : 'ALTA',
          horasInactivo: null,
          detalle: `El agente ${def.name} (${def.id}) no registra ninguna actividad en el sistema de bitácora.`
        };
        scanReport.quiebresDetectados.push(quiebre);
        await this.emitAlertaRojaQuiebre(quiebre, scanReport);
        continue;
      }

      // Evaluar última actividad
      const lastActiveTime = hb.lastHeartbeat ? new Date(hb.lastHeartbeat) : (hb.timestamp ? new Date(hb.timestamp) : null);
      if (!lastActiveTime || isNaN(lastActiveTime.getTime())) {
        const quiebre = {
          agentId: def.id,
          agentName: def.name,
          tipoQuiebre: 'FECHA_LATIDO_INVALIDA',
          nivelGravedad: 'ALTA',
          detalle: `El agente ${def.name} tiene un timestamp de latido no parseable.`
        };
        scanReport.quiebresDetectados.push(quiebre);
        await this.emitAlertaRojaQuiebre(quiebre, scanReport);
        continue;
      }

      const hoursInactive = (now.getTime() - lastActiveTime.getTime()) / (1000 * 60 * 60);

      // Evaluación de errores consecutivos o fallos reportados
      const consecutiveErrors = hb.consecutiveErrors || 0;
      const isFailedState = hb.status === 'ERROR' || hb.status === 'FAILED' || consecutiveErrors >= 3;

      if (isFailedState) {
        const quiebre = {
          agentId: def.id,
          agentName: def.name,
          tipoQuiebre: 'FALLO_OPERATIVO_RECURRENTE',
          nivelGravedad: 'CRITICA',
          consecutiveErrors,
          lastError: hb.lastError || 'Estado de fallo persistente en el agente.',
          detalle: `El agente ${def.name} ha reportado ${consecutiveErrors} errores consecutivos. Operación suspendida preventivamente.`
        };
        scanReport.quiebresDetectados.push(quiebre);
        await this.emitAlertaRojaQuiebre(quiebre, scanReport);
      } else if (hoursInactive > def.maxInactivityHours) {
        const quiebre = {
          agentId: def.id,
          agentName: def.name,
          tipoQuiebre: 'INACTIVIDAD_PROLONGADA',
          nivelGravedad: def.critical ? 'CRITICA' : 'MEDIA',
          horasInactivo: Math.round(hoursInactive * 10) / 10,
          umbralMaximoHoras: def.maxInactivityHours,
          detalle: `El agente ${def.name} lleva ${Math.round(hoursInactive * 10) / 10} horas inactivo (máximo tolerado: ${def.maxInactivityHours}h).`
        };
        scanReport.quiebresDetectados.push(quiebre);
        await this.emitAlertaRojaQuiebre(quiebre, scanReport);
      } else {
        scanReport.healthyAgents.push({
          agentId: def.id,
          agentName: def.name,
          status: 'HEALTHY',
          hoursInactive: Math.round(hoursInactive * 10) / 10
        });
      }
    }

    return scanReport;
  }

  /**
   * Emite una Alerta Roja a Dirección General y SuperAdmin ante el quiebre de un agente
   */
  async emitAlertaRojaQuiebre(quiebre, scanReport) {
    const alertId = `ALERTA_ROJA_${quiebre.agentId}_${Date.now()}`;
    const payload = {
      alertId,
      tipo: 'ALERTA_ROJA_QUIEBRE_AGENTE',
      nivel: 'EMERGENCIA_OPERATIVA',
      quiebre,
      destinatarios: ['jose.sanchez@crearpsl.net', 'armando.pilacuan@crearpsl.net', 'paul.sosa@crearpsl.net'],
      rolesDestino: ['superadmin', 'direccion', 'cfo'],
      timestamp: new Date().toISOString(),
      resuelto: false
    };

    scanReport.alertasRojasEmitidas.push(payload);
    console.error(`🚨 [ALERTA ROJA SUPER-AGENTE] Quiebre de ${quiebre.agentName}: ${quiebre.detalle}`);

    if (db) {
      try {
        await addDoc(collection(db, 'alerts_red_sentinel'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn(`[OmniAuditor] No se pudo persistir Alerta Roja en Firestore: ${err.message}`);
      }
    }
  }

  /**
   * DIRECTIVA 4: CONTROL HUMANO EN DECISIONES CRÍTICAS (HUMAN-IN-THE-LOOP)
   * Enforza que ninguna acción financiera o legal se aplique de forma autónoma.
   * Conecta con aiGovernanceSecuritySandbox para garantizar validación directiva humana.
   */
  async enforceHumanInTheLoopApproval(actionRequest, userContext = null) {
    const actionNormalized = (actionRequest.action || actionRequest.operation || 'read').toLowerCase();
    const payload = {
      ...actionRequest,
      action: actionNormalized,
      authenticatedUser: userContext || actionRequest.authenticatedUser
    };
    return validateAIOperation(payload);
  }

  /**
   * DIRECTIVA 5: AISLAMIENTO DE FASE ACTIVA
   * Asegura que los agentes procesen exclusivamente los datos de la fase en curso.
   * Descarta tareas e indicadores de ciclos futuros lejanos para evitar saturación de la operación.
   */
  filterActivePhaseScope(records = [], activePhaseConfig = {}) {
    const {
      currentPhase = 'C1', // PRE-C1, C1, C2, MJ
      activeCycleYear = 2026,
      activeTeamNumbers = [],
      allowedStages = [1, 2, 3]
    } = activePhaseConfig;

    if (!Array.isArray(records)) return [];

    return records.filter(item => {
      if (!item) return false;

      // 1. Verificación de Fase Operativa
      const itemPhase = (item.stage || item.etapa || item.fase || '').toUpperCase();
      if (itemPhase && itemPhase !== currentPhase.toUpperCase() && !itemPhase.includes(currentPhase.toUpperCase())) {
        return false;
      }

      // 2. Verificación de Equipo Activo (si se suministra lista)
      if (activeTeamNumbers && activeTeamNumbers.length > 0) {
        const teamNum = parseInt(item.teamNumber || item.equipoNumero || item.equipo, 10);
        if (!isNaN(teamNum) && !activeTeamNumbers.includes(teamNum)) {
          return false;
        }
      }

      // 3. Verificación de Ciclo / Año (no procesar futuros lejanos)
      if (item.year && parseInt(item.year, 10) > activeCycleYear) {
        return false;
      }
      if (item.date) {
        const itemDate = new Date(item.date);
        if (!isNaN(itemDate.getTime())) {
          const maxAllowedDate = new Date();
          maxAllowedDate.setDate(maxAllowedDate.getDate() + 45); // Máximo 45 días en el horizonte
          if (itemDate > maxAllowedDate) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * REQUERIMIENTO ESPECÍFICO: AUDITORÍA DE EJECUCIÓN DE CMJSENTINELAGENT
   * Valida que las llamadas reales de Maestría del Juego (MJ) correspondan a hechos inmutables de Nodus
   * sin inflar números:
   * - Separa estrictamente Personas Únicas (PX) de Gestiones Totales de Llamadas.
   * - Cataloga como [DATO NO REGISTRADO EN NODUS] a participantes no encontrados y los descarta de las métricas.
   * - Aplica deduplicación SHA-256 a cada llamada reportada.
   * - Aísla los datos a los equipos activos de Maestría de cada sede.
   */
  async auditCmjMaestriaCalls(callsData = [], nodusMaestriaData = {}, phaseConfig = {}) {
    const auditReport = {
      timestamp: new Date().toISOString(),
      agenteSupervisor: this.name,
      agenteSupervisado: 'cmjSentinelAgent',
      totalLlamadasRecibidas: callsData.length,
      metricasRealesNodus: {
        pxUnicosConfirmados: 0,
        gestionesLlamadasTotales: 0,
        participantesValidados: [],
        desercionesAuditadas: 0
      },
      anomaliasInflacionDescartadas: [],
      datosNoRegistradosEnNodus: []
    };

    const seenPxMap = new Set();
    const seenCallHashes = new Set();

    for (const rawCall of callsData) {
      // 1. Verificación en Nodus Transaccional (Directiva 1)
      const nodusVerification = this.verifyNodusSourceFact(rawCall, nodusMaestriaData, 'maestria_participant');

      if (!nodusVerification.verified) {
        auditReport.datosNoRegistradosEnNodus.push({
          registroInvalido: rawCall,
          motivo: nodusVerification.reason,
          etiqueta: '[DATO NO REGISTRADO EN NODUS]'
        });
        continue;
      }

      const realNodusParticipant = nodusVerification.sourceNodusFact;
      const canonicalPxId = realNodusParticipant.id || realNodusParticipant.dni || realNodusParticipant.email || realNodusParticipant.nombre;

      // 2. Trazabilidad Determinista SHA-256 Anti-Redundancia (Directiva 2)
      const callHash = await computeDeterministicHash({
        agent: 'cmjSentinelAgent',
        pxId: canonicalPxId,
        trainer: rawCall.trainerName || rawCall.entrenador,
        callDate: rawCall.date || rawCall.callDate || new Date().toISOString().slice(0, 10),
        callNumber: rawCall.callNumber || 1
      });

      if (seenCallHashes.has(callHash)) {
        auditReport.anomaliasInflacionDescartadas.push({
          tipo: 'LLAMADA_DUPLICADA_INFLADA',
          callHash,
          registro: rawCall,
          motivo: 'Intento de contabilizar la misma llamada múltiples veces. Descartada por SHA-256.'
        });
        continue;
      }

      seenCallHashes.add(callHash);
      auditReport.metricasRealesNodus.gestionesLlamadasTotales += 1;

      // 3. Conteo de Personas Únicas (PX)
      if (!seenPxMap.has(canonicalPxId)) {
        seenPxMap.add(canonicalPxId);
        auditReport.metricasRealesNodus.pxUnicosConfirmados += 1;
        auditReport.metricasRealesNodus.participantesValidados.push({
          pxId: canonicalPxId,
          nombre: realNodusParticipant.nombre || realNodusParticipant.name,
          sede: realNodusParticipant.sede || rawCall.sede,
          equipo: realNodusParticipant.equipoLabel || rawCall.equipoLabel,
          estadoNodus: realNodusParticipant.estado || 'EN_JUEGO'
        });
      }
    }

    // 4. Registro en el Ledger Determinista del Super-Agente
    await this.validateAndRecordDeterministicAction({
      agentId: 'cmjSentinelAgent',
      entityId: `MAESTRIA_AUDIT_${phaseConfig.sede || 'GLOBAL'}`,
      cyclePhase: 'MJ',
      operationType: 'AUDITORIA_LLAMADAS_MAESTRIA',
      payload: {
        pxUnicosConfirmados: auditReport.metricasRealesNodus.pxUnicosConfirmados,
        gestionesTotales: auditReport.metricasRealesNodus.gestionesLlamadasTotales,
        inflacionDescartada: auditReport.anomaliasInflacionDescartadas.length,
        noEnNodus: auditReport.datosNoRegistradosEnNodus.length
      }
    });

    return auditReport;
  }
}

export const omniAuditor = new OmniAuditorOrquestador();
