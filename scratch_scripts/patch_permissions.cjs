const fs = require('fs');
const file = 'src/config/permissions.js';
let content = fs.readFileSync(file, 'utf8');

const target = `  if (LIQUIDACION_ENTRENADORES_EMAILS.includes(email)) return true;\r\n\r\n  return false;\r\n};`;
const replacement = `  // Coordinadores de Maestría del Juego — pueden ver la liquidación para monitorear sus equipos\r\n  if (role === 'coord_maestria' || role === 'coordinador_mj') return true;\r\n  if (roles.some(r => r === 'coord_maestria' || r === 'coordinador_mj')) return true;\r\n\r\n  // Finanzas / CFO autorizado\r\n  if (LIQUIDACION_ENTRENADORES_EMAILS.includes(email)) return true;\r\n\r\n  return false;\r\n};`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log('Patch permissions done');
} else {
  console.log('Target not found, showing context...');
  const idx = content.indexOf('LIQUIDACION_ENTRENADORES_EMAILS.includes');
  console.log(JSON.stringify(content.substring(idx - 10, idx + 100)));
}
