import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  omniAuditor,
  OmniAuditorOrquestador,
  computeDeterministicHash,
  normalizeEntityString,
  MONITORED_AUTONOMOUS_AGENTS
} from '../src/services/omniAuditorOrquestador.js';
import { cmjSentinel } from '../src/services/cmjSentinelAgent.js';

describe('OmniAuditorOrquestador - Gobernanza Anti-Alucinación y Super-Agente', () => {

  it('1. Cero Alucinación: cataloga [DATO NO REGISTRADO EN NODUS] y rechaza registros ausentes en Nodus', () => {
    const nodusDataset = [
      { id: 'NODUS-PX-01', nombre: 'Carlos Mendoza', email: 'carlos@empresa.com', dni: '0912345678', estado: 'EN_JUEGO' },
      { id: 'NODUS-PX-02', nombre: 'Andrea Morales', email: 'andrea@gmail.com', dni: '1723456789', estado: 'GRADUADO' }
    ];

    // Candidato 1: Existe en Nodus
    const candidateReal = { id: 'NODUS-PX-01', nombre: 'Carlos Mendoza' };
    const verificationReal = omniAuditor.verifyNodusSourceFact(candidateReal, nodusDataset);
    assert.equal(verificationReal.verified, true);
    assert.equal(verificationReal.status, 'VERIFIED_NODUS_SOURCE');
    assert.equal(verificationReal.sourceNodusFact.id, 'NODUS-PX-01');

    // Candidato 2: Alucinado / Inventado (No existe en Nodus)
    const candidateInventado = { id: 'INVENTED-99', nombre: 'Participante Fantasma', email: 'fantasma@test.com' };
    const verificationInventado = omniAuditor.verifyNodusSourceFact(candidateInventado, nodusDataset);
    assert.equal(verificationInventado.verified, false);
    assert.equal(verificationInventado.label, '[DATO NO REGISTRADO EN NODUS]');
    assert.match(verificationInventado.reason, /no existe en Nodus transaccional/);
  });

  it('2. Trazabilidad Determinista: genera hash SHA-256 e implementa descarte de tareas duplicadas por idempotencia', async () => {
    const actionPayload = {
      agentId: 'goalsSentinelAgent',
      entityId: 'GOAL-QUITO-C1-E32',
      cyclePhase: 'C1',
      operationType: 'AUDITORIA_AVANCE_PX',
      timestampDate: '2026-10-24',
      payload: { confirmados: 45, sentadosEstimados: 40 }
    };

    // Primera ejecución: debe cometerse con hash SHA-256 de 64 caracteres hex
    const firstRun = await omniAuditor.validateAndRecordDeterministicAction(actionPayload);
    assert.equal(firstRun.executed, true);
    assert.equal(firstRun.status, 'COMMITTED');
    assert.equal(typeof firstRun.hash, 'string');
    assert.equal(firstRun.hash.length, 64);

    // Segunda ejecución idéntica: debe descartarse automáticamente
    const secondRun = await omniAuditor.validateAndRecordDeterministicAction(actionPayload);
    assert.equal(secondRun.executed, false);
    assert.equal(secondRun.status, 'DUPLICATE_DISCARDED_LOCAL');
    assert.equal(secondRun.hash, firstRun.hash);
  });

  it('3. Rendición de Cuentas: detecta agentes inactivos o fallidos y emite Alerta Roja a Dirección General', async () => {
    const testOrchestrator = new OmniAuditorOrquestador();
    const staleDate = new Date();
    staleDate.setHours(staleDate.getHours() - 36); // 36 horas inactivo

    const mockHeartbeats = [
      {
        agentId: 'CausaNodusAgent',
        lastHeartbeat: new Date().toISOString(),
        status: 'HEALTHY',
        consecutiveErrors: 0
      },
      {
        agentId: 'cmjSentinelAgent',
        lastHeartbeat: staleDate.toISOString(), // Supera 12h umbral
        status: 'HEALTHY',
        consecutiveErrors: 0
      },
      {
        agentId: 'goalsSentinelAgent',
        lastHeartbeat: new Date().toISOString(),
        status: 'FAILED',
        consecutiveErrors: 4,
        lastError: 'Fallo al sincronizar base transaccional de Nodus'
      }
      // GuardianConfidencialidad omitido a propósito para testear SIN_LATIDO_HISTORICO
    ];

    const report = await testOrchestrator.scanSentinelsAndAuditHeartbeats(mockHeartbeats);

    // CausaNodusAgent debe estar sano
    const healthyCausa = report.healthyAgents.find(a => a.agentId === 'CausaNodusAgent');
    assert.ok(healthyCausa);

    // cmjSentinelAgent debe tener quiebre por INACTIVIDAD_PROLONGADA
    const inactivoCMJ = report.quiebresDetectados.find(q => q.agentId === 'cmjSentinelAgent');
    assert.ok(inactivoCMJ);
    assert.equal(inactivoCMJ.tipoQuiebre, 'INACTIVIDAD_PROLONGADA');

    // goalsSentinelAgent debe tener quiebre por FALLO_OPERATIVO_RECURRENTE
    const falloGoals = report.quiebresDetectados.find(q => q.agentId === 'goalsSentinelAgent');
    assert.ok(falloGoals);
    assert.equal(falloGoals.tipoQuiebre, 'FALLO_OPERATIVO_RECURRENTE');

    // GuardianConfidencialidad debe tener quiebre por SIN_LATIDO_HISTORICO
    const sinLatido = report.quiebresDetectados.find(q => q.agentId === 'GuardianConfidencialidad');
    assert.ok(sinLatido);
    assert.equal(sinLatido.tipoQuiebre, 'SIN_LATIDO_HISTORICO');

    // Deben haberse emitido Alertas Rojas con destinatarios directivos
    assert.ok(report.alertasRojasEmitidas.length >= 3);
    assert.ok(report.alertasRojasEmitidas[0].destinatarios.includes('jose.sanchez@crearpsl.net'));
  });

  it('4. Control Humano (HITL): bloquea decisiones financieras/legales autónomas de agentes', async () => {
    // Intento 1: Agente autónomo intenta liquidar pagos sin humano
    const unapprovedAction = {
      agentName: 'CFO-Automation-Bot',
      targetCollection: 'liquidaciones_pagos',
      action: 'update',
      documentId: 'liq_octubre_lima',
      proposedChanges: { status: 'PAID', amount: 15400 }
    };

    const blockResult = await omniAuditor.enforceHumanInTheLoopApproval(unapprovedAction, null);
    assert.equal(blockResult.allowed, false);
    assert.equal(blockResult.requiresHITL, true);
    assert.match(blockResult.reason, /contenida. Requiere aprobación humana/);

    // Intento 2: Usuario humano con rol CFO aprueba la acción
    const humanManagerUser = {
      email: 'cfo.crearpsl@crearpsl.net',
      role: 'cfo'
    };

    const approvedResult = await omniAuditor.enforceHumanInTheLoopApproval(unapprovedAction, humanManagerUser);
    assert.equal(approvedResult.allowed, true);
    assert.equal(approvedResult.requiresHITL, false);
  });

  it('5. Aislamiento de Fase Activa: filtra estrictamente tareas de la fase actual y rechaza ciclos futuros lejanos', () => {
    const rawRecords = [
      { id: 'rec-1', etapa: 'C1', teamNumber: 32, year: 2026, date: '2026-10-25' },
      { id: 'rec-2', etapa: 'C2', teamNumber: 31, year: 2026, date: '2026-11-05' }, // Otra etapa
      { id: 'rec-3', etapa: 'C1', teamNumber: 32, year: 2028, date: '2028-05-10' }, // Futuro lejano 2028
      { id: 'rec-4', etapa: 'C1', teamNumber: 99, year: 2026, date: '2026-10-26' }  // Equipo inactivo
    ];

    const activeConfig = {
      currentPhase: 'C1',
      activeCycleYear: 2026,
      activeTeamNumbers: [32]
    };

    const filtered = omniAuditor.filterActivePhaseScope(rawRecords, activeConfig);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'rec-1');
  });

  it('Requerimiento Específico: CMJSentinelAgent audita llamadas de Maestría sin inflar números', async () => {
    // Base de datos transaccional de Nodus para Maestría (hecho inmutable)
    const nodusMaestriaData = {
      'equipo_30_lima': {
        nombreNodus: 'MAESTRIA 30 LIMA',
        PFD: {
          participantes: [
            { id: 'PX-M30-01', nombre: 'Valeria Rios', dni: '44556677', estado: 'EN_JUEGO' },
            { id: 'PX-M30-02', nombre: 'Ricardo Palma', dni: '88990011', estado: 'EN_JUEGO' }
          ]
        }
      }
    };

    // Reporte de llamadas con intentos de duplicación (inflación) y participante no registrado
    const rawCallsReport = [
      // Llamada 1: Real
      { id: 'PX-M30-01', nombre: 'Valeria Rios', callNumber: 1, date: '2026-10-24', trainerName: 'Linid Valencia' },
      // Llamada 2: Misma persona, llamada número 2 (gestión adicional válida)
      { id: 'PX-M30-01', nombre: 'Valeria Rios', callNumber: 2, date: '2026-10-24', trainerName: 'Linid Valencia' },
      // Llamada 3: DUPLICADA IDÉNTICA (intento de inflar número de la llamada 1)
      { id: 'PX-M30-01', nombre: 'Valeria Rios', callNumber: 1, date: '2026-10-24', trainerName: 'Linid Valencia' },
      // Llamada 4: Real segundo participante
      { id: 'PX-M30-02', nombre: 'Ricardo Palma', callNumber: 1, date: '2026-10-24', trainerName: 'Linid Valencia' },
      // Llamada 5: Alucinada (No existe en Nodus)
      { id: 'PX-FAKE-99', nombre: 'Ficticio Pérez', callNumber: 1, date: '2026-10-24', trainerName: 'Linid Valencia' }
    ];

    const auditResult = await cmjSentinel.auditMaestriaCalls(
      rawCallsReport,
      nodusMaestriaData,
      { sede: 'Lima', currentPhase: 'MJ', activeTeamNumbers: [30] }
    );

    // Verificaciones:
    // 1. Debe haber exactamente 2 PX ÚNICOS (Valeria y Ricardo), NO 3 ni 5
    assert.equal(auditResult.metricasRealesNodus.pxUnicosConfirmados, 2);

    // 2. Gestiones totales aceptadas: 3 (Llamada 1 Valeria, Llamada 2 Valeria, Llamada 1 Ricardo)
    assert.equal(auditResult.metricasRealesNodus.gestionesLlamadasTotales, 3);

    // 3. Duplicada rechazada por SHA-256 (Llamada 3 idéntica a Llamada 1)
    assert.equal(auditResult.anomaliasInflacionDescartadas.length, 1);
    assert.equal(auditResult.anomaliasInflacionDescartadas[0].tipo, 'LLAMADA_DUPLICADA_INFLADA');

    // 4. Dato no registrado en Nodus (Ficticio Pérez)
    assert.equal(auditResult.datosNoRegistradosEnNodus.length, 1);
    assert.equal(auditResult.datosNoRegistradosEnNodus[0].etiqueta, '[DATO NO REGISTRADO EN NODUS]');
  });
});
