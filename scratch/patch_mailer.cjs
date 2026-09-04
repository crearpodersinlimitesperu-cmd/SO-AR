const fs = require('fs');
let code = fs.readFileSync('scripts/mailerDaemon.js', 'utf8');

code = code.replace(
    if (isOneShot) {
    console.log("⚡ Ejecución en modo One-Shot (GitHub Actions / Tarea programada)...");
    await processPendingMails();
    await checkInactivity();
    await checkOverdueTaskReminders();
    console.log("✅ Tarea de envío y verificación completada.");
    process.exit(0);
  },
    if (isOneShot) {
    console.log("⚡ Ejecución en modo One-Shot (GitHub Actions / Tarea programada)...");
    await checkInactivity();
    await checkOverdueTaskReminders();
    await processPendingMails();
    console.log("✅ Tarea de envío y verificación completada.");
    process.exit(0);
  }
);

fs.writeFileSync('scripts/mailerDaemon.js', code, 'utf8');
