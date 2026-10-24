/**
 * AGENTE EVALUADOR IA &bull; AUDITORÍA DE RESULTADOS IMPOSIBLES (3 METAS DE ALTO ESTÁNDAR)
 * =========================================================================================
 * Directiva Oficial de Alta Dirección / Tecnología NEC:
 * Purgado completo del término "Futuros Imposibles" -> "Resultados Imposibles".
 * Nueva regla de negocio: Exactamente 3 Resultados Imposibles de estándar superior por participante en juego.
 * 
 * Reglas de Ejecución:
 * 1. Lee la base inmutable de Nodus (sin alterar claves en BD).
 * 2. Cruza participantes "En Juego" (asistencia a PFD o activos en equipo).
 * 3. Valida calidad SMART y evidencia medible sobre los 3 Resultados Imposibles.
 * 4. Cero deletes: Preserva inmutablemente el historial pasado.
 * 5. Cero inflación de avances: Solo certifica lo que tiene evidencia y métricas explícitas.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { auditarParticipantesEnJuego3Resultados, evaluarCalidadOntologicaFI } from '../src/services/nodusFIAgent.js';

export function ejecutarAuditoriaResultadosImposibles(participantesRaw = [], evidenciasOverrides = {}) {
  const auditResult = auditarParticipantesEnJuego3Resultados(participantesRaw, evidenciasOverrides);

  const informeEjecutivo = {
    titulo: 'AUDITORÍA EJECUTIVA DE RESULTADOS IMPOSIBLES (ESTÁNDAR 3 METAS)',
    fechaAuditoria: new Date().toISOString(),
    reglaNegocio: '3 Resultados Imposibles de estándar superior por participante en juego',
    metricasGenerales: {
      totalParticipantesEnJuego: auditResult.totalEnJuego,
      certificadosCompletos3de3: auditResult.certificadosCompletos,
      enProcesoRevision: auditResult.enProceso,
      rezagoCriticoSinResultados: auditResult.sinEntrega,
      efectividadGlobalCertificada: `${auditResult.efectividadGlobal}%`
    },
    resumenPorSede: {},
    hallazgosCriticos: []
  };

  // Desglose institucional por Sede
  auditResult.participantesAuditados.forEach(p => {
    const sede = p.sede || 'Sin Sede';
    if (!informeEjecutivo.resumenPorSede[sede]) {
      informeEjecutivo.resumenPorSede[sede] = {
        total: 0,
        cumplen3de3: 0,
        sinEntrega: 0,
        pctEfectividad: '0%'
      };
    }
    informeEjecutivo.resumenPorSede[sede].total++;
    if (p.cumpleEstandarSuperior) informeEjecutivo.resumenPorSede[sede].cumplen3de3++;
    if (p.totalResultados3 === 0) informeEjecutivo.resumenPorSede[sede].sinEntrega++;
  });

  Object.keys(informeEjecutivo.resumenPorSede).forEach(sede => {
    const s = informeEjecutivo.resumenPorSede[sede];
    s.pctEfectividad = s.total > 0 ? `${Math.round((s.cumplen3de3 / s.total) * 100)}%` : '0%';
    if (s.sinEntrega > 0) {
      informeEjecutivo.hallazgosCriticos.push(
        `Sede ${sede}: ${s.sinEntrega} participante(s) en juego sin ningún Resultado Imposible registrado.`
      );
    }
  });

  return {
    ...auditResult,
    informeEjecutivo
  };
}

// Ejecución autónoma CLI
if (process.argv[1] && process.argv[1].endsWith('agentAuditoriaResultadosImposibles.mjs')) {
  console.log('🤖 [Agente Evaluador IA] Iniciando auditoría de Resultados Imposibles...');
  let sourceParticipants = [];
  try {
    const snapPath = path.resolve('nodus_latest_snapshot.json');
    if (fs.existsSync(snapPath)) {
      const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
      sourceParticipants = snap.participantes || [];
    }
  } catch (e) {
    console.warn('⚠️ No se pudo leer snapshot local:', e.message);
  }

  const resultado = ejecutarAuditoriaResultadosImposibles(sourceParticipants);
  console.log('\n📊 RESUMEN AUDITORÍA IA:');
  console.log(`- Participantes en juego auditados: ${resultado.totalEnJuego}`);
  console.log(`- Certificados (3 de 3 completados): ${resultado.certificadosCompletos}`);
  console.log(`- En proceso de acompañamiento: ${resultado.enProceso}`);
  console.log(`- Sin Resultados Imposibles (0 de 3): ${resultado.sinEntrega}`);
  console.log(`- Efectividad Global: ${resultado.efectividadGlobal}%`);
  console.log('\n✅ Auditoría finalizada sin alteración de base de datos ni invención de métricas.');
}
