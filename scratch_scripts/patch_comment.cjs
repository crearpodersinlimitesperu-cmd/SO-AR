const fs = require('fs');
const file = 'src/config/permissions.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  "  // Finanzas / CFO autorizado\r\n  // Coordinadores de Maestría del Juego",
  "  // Coordinadores de Maestría del Juego"
);
fs.writeFileSync(file, content);
console.log('Comment cleanup done');
