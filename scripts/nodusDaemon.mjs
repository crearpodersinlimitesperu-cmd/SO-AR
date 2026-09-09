import { runMultiAgentSync } from './nodusMultiAgentSync.mjs';

const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutos
let isRunning = false;

async function executeCycle() {
  if (isRunning) {
    console.log("⏳ [Watchdog Daemon] Una sincronización previa sigue en curso. Omitiendo este ciclo.");
    return;
  }

  isRunning = true;
  console.log(`\n======================================================`);
  console.log(`⏰ [Watchdog Daemon] Iniciando ciclo de sincronización: ${new Date().toISOString()}`);
  console.log(`======================================================`);

  try {
    await runMultiAgentSync();
    console.log(`✅ [Watchdog Daemon] Ciclo completado exitosamente a las: ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    console.error(`❌ [Watchdog Daemon] Error en ciclo: ${error.message}`);
    console.log("🔄 [Watchdog Daemon] El demonio permanece vivo y reintentará en el próximo ciclo.");
  } finally {
    isRunning = false;
  }
}

// Manejadores globales para blindar contra terminación inesperada
process.on('uncaughtException', (err) => {
  console.error("🚨 [Watchdog Daemon] Excepción no capturada interceptada:", err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("🚨 [Watchdog Daemon] Rechazo no manejado interceptado:", reason);
});

console.log("🛡️ [Watchdog Daemon] Demonio autónomo de Nodus iniciado.");
console.log(`🕒 [Watchdog Daemon] Intervalo configurado: Cada 15 minutos (${SYNC_INTERVAL_MS} ms).`);

// Ejecutar ciclo inicial inmediato
executeCycle();

// Configurar intervalo persistente
setInterval(executeCycle, SYNC_INTERVAL_MS);
