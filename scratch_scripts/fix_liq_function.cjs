const fs = require('fs');
const file = 'src/config/permissions.js';
let content = fs.readFileSync(file, 'utf8');

// Replace the entire canViewLiquidacionEntrenadores function with the strict version
const OLD = `export const canViewLiquidacionEntrenadores = (currentUser) => {\r\n  if (!currentUser) return false;\r\n  const email = (currentUser.email || '').trim().toLowerCase();\r\n\r\n  // 'yo' / SuperAdmin\r\n  if (email === 'jose.sanchez@crearpsl.net') return true;\r\n  if (currentUser.isSuperAdmin || isSuperAdminEmail(email)) return true;\r\n\r\n  // 'directores'\r\n  if (currentUser.isDireccion) return true;\r\n  const role = (currentUser.appRole || currentUser.role || '').toLowerCase();\r\n  const roles = (currentUser.roles || []).map(r => String(r).toLowerCase());\r\n\r\n  if (isDireccionRole(role) || role === 'director_maestria') return true;\r\n  if (roles.some(r => isDireccionRole(r) || r === 'director_maestria')) return true;\r\n\r\n  // Coordinadores de Maestría del Juego — pueden ver la liquidación para monitorear sus equipos\r\n  if (role === 'coord_maestria' || role === 'coordinador_mj') return true;\r\n  if (roles.some(r => r === 'coord_maestria' || r === 'coordinador_mj')) return true;\r\n\r\n  // Finanzas / CFO autorizado\r\n  if (LIQUIDACION_ENTRENADORES_EMAILS.includes(email)) return true;\r\n\r\n  return false;\r\n};`;

// Use regex to find and replace the whole function regardless of minor whitespace differences
content = content.replace(
  /export const canViewLiquidacionEntrenadores = \(currentUser\) => \{[\s\S]*?return false;\s*\};/,
  `/**
 * ACCESO ESTRICTAMENTE RESTRINGIDO a 5 personas explícitas.
 * Pedido de José (01/10/2026): "solo lo puede ver eli, paul, fer y andres gomez y yo"
 * NO hay bypass por rol — solo por email de la lista LIQUIDACION_ENTRENADORES_EMAILS.
 */
export const canViewLiquidacionEntrenadores = (currentUser) => {
  if (!currentUser) return false;
  const email = (currentUser.email || '').trim().toLowerCase();
  // Acceso SOLO para emails explícitamente autorizados (Hard Lock)
  return LIQUIDACION_ENTRENADORES_EMAILS.includes(email);
};`
);

fs.writeFileSync(file, content);
console.log('canViewLiquidacionEntrenadores reemplazada');
console.log('Verificando...');
const newContent = fs.readFileSync(file, 'utf8');
const idx = newContent.indexOf('canViewLiquidacionEntrenadores');
console.log(newContent.substring(idx, idx + 300));
