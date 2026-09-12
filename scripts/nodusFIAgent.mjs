/**
 * AGENTE 6: AUDITOR CENTINELA DE FUTUROS IMPOSIBLES (FIs) - PIPELINE MULTI-AGENTE NODUS
 * Ejecuta la auditoría autónoma del universo de participantes post-PFD.
 * Guarda diagnóstico en Firestore 'nodus_futuros_imposibles/latest' y genera respaldo local.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class NodusFIAgent {
  constructor(options = {}) {
    this.name = "NodusFIAgent";
    this.version = "1.0.0";
    this.options = options;
  }

  async runAudit(participantes = []) {
    console.log(`\n======================================================`);
    console.log(`🎯 [${this.name}] Iniciando Auditoría de Futuros Imposibles`);
    console.log(`======================================================`);

    const total = participantes.length;
    let conCeroFIs = 0;
    let conFIs = 0;
    let totalFIsRegistrados = 0;
    let totalPendientes = 0;
    let totalDevueltos = 0;
    let totalAprobados = 0;

    const equiposMap = {};

    for (const p of participantes) {
      const tot = p.totalFi || 0;
      const pen = p.pendientes || 0;
      const dev = p.devueltos || 0;
      const apr = p.aprobados || 0;

      totalFIsRegistrados += tot;
      totalPendientes += pen;
      totalDevueltos += dev;
      totalAprobados += apr;

      if (tot === 0) conCeroFIs++;
      else conFIs++;

      const eq = p.equipo || 'Sin Equipo';
      if (!equiposMap[eq]) {
        equiposMap[eq] = { equipo: eq, total: 0, conEntrega: 0, sinEntrega: 0, pendientes: 0, devueltos: 0, aprobados: 0 };
      }
      equiposMap[eq].total++;
      if (tot === 0) equiposMap[eq].sinEntrega++;
      else equiposMap[eq].conEntrega++;
      equiposMap[eq].pendientes += pen;
      equiposMap[eq].devueltos += dev;
      equiposMap[eq].aprobados += apr;
    }

    const tasaSinEntrega = total > 0 ? Math.round((conCeroFIs / total) * 100) : 0;
    const tasaEntrega = total > 0 ? Math.round((conFIs / total) * 100) : 0;
    const tasaAprobacion = totalFIsRegistrados > 0 ? Math.round((totalAprobados / totalFIsRegistrados) * 100) : 0;

    console.log(`📊 Total Participantes Post-PFD Evaluados: ${total}`);
    console.log(`🚨 Participantes con 0 FIs (Sin Entrega): ${conCeroFIs} (${tasaSinEntrega}%)`);
    console.log(`✅ Participantes con FIs Cargados: ${conFIs} (${tasaEntrega}%)`);
    console.log(`⏳ FIs Pendientes de Revisión: ${totalPendientes}`);
    console.log(`🔄 FIs Devueltos para Ajuste: ${totalDevueltos}`);
    console.log(`🏆 FIs Aprobados / Certificados: ${totalAprobados}`);

    const diagnosticPayload = {
      timestamp: new Date().toISOString(),
      agente: this.name,
      version: this.version,
      resumen: {
        totalParticipantes: total,
        conCeroFIs,
        conFIs,
        totalFIsRegistrados,
        totalPendientes,
        totalDevueltos,
        totalAprobados,
        tasaSinEntrega,
        tasaEntrega,
        tasaAprobacion
      },
      severidad: tasaSinEntrega >= 75 ? 'CRITICA' : tasaSinEntrega >= 35 ? 'ALERTA' : 'OPTIMA',
      equiposDesglose: Object.values(equiposMap)
    };

    return diagnosticPayload;
  }
}

// Ejecución directa si se invoca por CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const agent = new NodusFIAgent();
  console.log("Ejecutando NodusFIAgent en modo CLI...");
}
