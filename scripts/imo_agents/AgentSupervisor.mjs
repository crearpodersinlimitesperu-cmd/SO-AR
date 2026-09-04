import { AgentOrchestrator } from './AgentOrchestrator.mjs';
import { CONFIG } from './config.mjs';

class AgentSupervisor {
  constructor() {
    this.name = 'AgentSupervisor24_7';
    this.orchestrator = new AgentOrchestrator();
    this.isRunning = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async startDaemon() {
    this.isRunning = true;
    console.log(`[${this.name}] ======================================`);
    console.log(`[${this.name}] Iniciando Operación 24/7`);
    console.log(`[${this.name}] Frecuencia: Cada ${CONFIG.SUPERVISOR.intervalMinutes} minutos`);
    console.log(`[${this.name}] ======================================\n`);

    while (this.isRunning) {
      const timestamp = new Date().toLocaleString();
      console.log(`[${this.name}] [${timestamp}] Despertando Orquestador...`);
      
      let attempts = 0;
      let success = false;

      while (attempts < CONFIG.SUPERVISOR.maxRetries && !success) {
        try {
          success = await this.orchestrator.runWorkflow();
          if (!success) throw new Error('El Orquestador reportó fallos parciales.');
        } catch (e) {
          attempts++;
          console.error(`[${this.name}] Fallo en intento ${attempts}/${CONFIG.SUPERVISOR.maxRetries}: ${e.message}`);
          if (attempts < CONFIG.SUPERVISOR.maxRetries) {
            console.log(`[${this.name}] Reintentando en 60 segundos...`);
            await this.sleep(60000);
          }
        }
      }

      if (!success) {
        console.error(`[${this.name}] CRÍTICO: El Orquestador falló tras ${CONFIG.SUPERVISOR.maxRetries} intentos. Requiere intervención manual (IMO caído o credenciales inválidas).`);
      } else {
        console.log(`[${this.name}] Orquestación exitosa. Volviendo a dormir...`);
      }

      const msToWait = CONFIG.SUPERVISOR.intervalMinutes * 60 * 1000;
      console.log(`[${this.name}] Próxima ejecución programada en ${CONFIG.SUPERVISOR.intervalMinutes} minutos.\n`);
      await this.sleep(msToWait);
    }
  }

  stop() {
    this.isRunning = false;
    console.log(`[${this.name}] Señal de apagado recibida.`);
  }
}

// Iniciar Supervisor
const supervisor = new AgentSupervisor();

process.on('SIGINT', () => supervisor.stop());
process.on('SIGTERM', () => supervisor.stop());

supervisor.startDaemon();
