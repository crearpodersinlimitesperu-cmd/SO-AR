const fs = require('fs');
let code = fs.readFileSync('scripts/mailerDaemon.js', 'utf8');

code = code.replace(
  '    await processPendingMails();\n    await checkInactivity();\n    await checkOverdueTaskReminders();',
  '    await checkInactivity();\n    await checkOverdueTaskReminders();\n    await processPendingMails();'
);

fs.writeFileSync('scripts/mailerDaemon.js', code, 'utf8');
