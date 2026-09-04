import { AgentMetrics } from './AgentMetrics.mjs';
import { AgentReports } from './AgentReports.mjs';

export class AgentOrchestrator {
  constructor() {
    this.name = 'AgentOrchestrator';
    this.metricsAgent = new AgentMetrics();
    this.reportsAgent = new AgentReports();
  }

  async runWorkflow() {
    console.log(`\n======================================================`);
    console.log(`[${this.name}] Iniciando flujo de orquestación IMO Nodus`);
    console.log(`======================================================\n`);
    
    // 1. Delegar al agente de Métricas
    console.log(`[${this.name}] Desplegando ${this.metricsAgent.name}...`);
    const metricsSuccess = await this.metricsAgent.extractMetrics();
    
    if (!metricsSuccess) {
      console.warn(`[${this.name}] Advertencia: ${this.metricsAgent.name} reportó un error.`);
    }

    // 2. Delegar al agente de Reportes
    console.log(`\n[${this.name}] Desplegando ${this.reportsAgent.name}...`);
    const reportsSuccess = await this.reportsAgent.extractReports();
    
    if (!reportsSuccess) {
      console.warn(`[${this.name}] Advertencia: ${this.reportsAgent.name} reportó un error.`);
    }

    // 3. Consolidación (Simulada)
    console.log(`\n[${this.name}] Consolidando datos extraídos por agentes...`);
    if (metricsSuccess && reportsSuccess) {
      console.log(`[${this.name}] ✅ Flujo completado exitosamente. KPIs actualizados para el Dashboard.`);
      return true;
    } else {
      console.log(`[${this.name}] ⚠️ Flujo completado con advertencias/errores parciales.`);
      return false;
    }
  }
}
