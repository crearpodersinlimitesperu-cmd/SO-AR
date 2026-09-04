import { runMultiAgentSync } from './nodusMultiAgentSync.mjs';

const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hora
let isRunning = false;

async function executeCycle() {
  if (isRunning) {
    console.log("⏳ [Watchdog Daemon] Una sincronización previa sigue en curso. Omitiendo este ciclo.");
    return;
  }

  isRunning = true;
  console.log(`\n======================================================`);
  console.log(`⏰ [Watchdog Daemon] Iniciando ciclo horario de sincronización: ${new Date().toISOString()}`);
  console.log(`======================================================`);

  try {
    await runMultiAgentSync();
    console.log(`✅ [Watchdog Daemon] Ciclo horario completado exitosamente a las: ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    console.error(`❌ [Watchdog Daemon] Error en ciclo horario: ${error.message}`);
    console.log("🔄 [Watchdog Daemon] El demonio permanece vivo y reintentará en el próximo ciclo horario.");
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

console.log("🛡️ [Watchdog Daemon] Demonio autónomo horario de Nodus iniciado.");
console.log(`🕒 [Watchdog Daemon] Intervalo configurado: Cada 60 minutos (${ONE_HOUR_MS} ms).`);

// Ejecutar ciclo inicial inmediato
executeCycle();

// Configurar intervalo horario persistente
setInterval(executeCycle, ONE_HOUR_MS);
