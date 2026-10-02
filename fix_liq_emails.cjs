const fs = require('fs');
const file = 'src/config/permissions.js';
let content = fs.readFileSync(file, 'utf8');

// Reemplazar la lista de emails y la función completa de canViewLiquidacion
const oldList = `export const LIQUIDACION_ENTRENADORES_EMAILS = [\r\n  'jose.sanchez@crearpsl.net',        // Jos\xc3\x83\xc2\xa9 S\xc3\x83\xc2\xa1nchez\r\n  'contabilidad.global@crearpsl.net', // Elizabeth Escobar (CFO)\r\n];`;

const newList = `/**
 * ACCESO RESTRINGIDO — Liquidación de Entrenadores y Panel Financiero
 * EXCLUSIVO para: José Sánchez, Elizabeth Escobar, Paul Sosa, Fer Aragón, Andrés Gómez.
 * Pedido explícito de José (01/10/2026): "ojo esto solo lo puede ver eli, paul, fer y andres gomez y yo"
 */
export const LIQUIDACION_ENTRENADORES_EMAILS = [
  'jose.sanchez@crearpsl.net',        // José Sánchez (SuperAdmin)
  'contabilidad.global@crearpsl.net', // Elizabeth Escobar (CFO)
  'paul.sosa@crearpsl.net',           // Paul Sosa (CCO)
  'fer.aragon@crearpsl.net',          // Fer Aragón (CEO)
  'fer.aragon@crearpsl.com',          // Fer Aragón (correo alterno)
  'andres.gomez@crearpsl.net',        // Andrés Gómez (Director MJ)
  'gomeznueve@gmail.com',             // Andrés Gómez (cuenta alterna)
];`;

if (content.includes("'jose.sanchez@crearpsl.net',        // Jos")) {
  content = content.replace(
    `export const LIQUIDACION_ENTRENADORES_EMAILS = [\r\n  'jose.sanchez@crearpsl.net',        // Jos\xc3\x83\xc2\xa9 S\xc3\x83\xc2\xa1nchez\r\n  'contabilidad.global@crearpsl.net', // Elizabeth Escobar (CFO)\r\n];`,
    newList
  );
} else {
  // Try simpler search
  const idx = content.indexOf("'jose.sanchez@crearpsl.net',        // Jos");
  if (idx === -1) {
    console.log('Not found with specific text');
    // Find what's there
    const lidx = content.indexOf('LIQUIDACION_ENTRENADORES_EMAILS = [');
    console.log('List starts at:', lidx);
    console.log('Context:', JSON.stringify(content.substring(lidx, lidx + 200)));
  }
}

// Replace with a simpler regex approach
content = content.replace(
  /export const LIQUIDACION_ENTRENADORES_EMAILS = \[[^\]]*\];/,
  `export const LIQUIDACION_ENTRENADORES_EMAILS = [
  'jose.sanchez@crearpsl.net',        // José Sánchez (SuperAdmin)
  'contabilidad.global@crearpsl.net', // Elizabeth Escobar (CFO)
  'paul.sosa@crearpsl.net',           // Paul Sosa (CCO)
  'fer.aragon@crearpsl.net',          // Fer Aragón (CEO)
  'fer.aragon@crearpsl.com',          // Fer Aragón (correo alterno)
  'andres.gomez@crearpsl.net',        // Andrés Gómez (Director MJ)
  'gomeznueve@gmail.com',             // Andrés Gómez (cuenta alterna)
];`
);

// NOW also revoke the role-based access we added earlier (coord_maestria)
// Replace canViewLiquidacionEntrenadores to NOT allow coord_maestria by role, only by explicit email
const oldRoleBlock = `  // Coordinadores de Maestría del Juego — pueden ver la liquidación para monitorear sus equipos
  if (role === 'coord_maestria' || role === 'coordinador_mj') return true;
  if (roles.some(r => r === 'coord_maestria' || r === 'coordinador_mj')) return true;`;

const newRoleBlock = `  // NOTA: Coordinadores de Maestría del Juego ya NO tienen acceso por rol.
  // Solo los emails explícitos de LIQUIDACION_ENTRENADORES_EMAILS tienen acceso.
  // (Pedido de José, 01/10/2026: acceso solo para él, Eli, Paul, Fer y Andrés)`;

content = content.replace(oldRoleBlock, newRoleBlock);

// Also remove the role-based bypass for isDireccion/director_maestria
const oldDirBlock = `  // 'directores'
  if (currentUser.isDireccion) return true;
  const role = (currentUser.appRole || currentUser.role || '').toLowerCase();
  const roles = (currentUser.roles || []).map(r => String(r).toLowerCase());

  if (isDireccionRole(role) || role === 'director_maestria') return true;
  if (roles.some(r => isDireccionRole(r) || r === 'director_maestria')) return true;`;

const newDirBlock = `  const role = (currentUser.appRole || currentUser.role || '').toLowerCase();
  const roles = (currentUser.roles || []).map(r => String(r).toLowerCase());

  // ACCESO SÓLO POR EMAIL EXPLÍCITO — no por rol genérico de dirección
  // (José, Eli, Paul, Fer, Andrés)`;

content = content.replace(oldDirBlock, newDirBlock);

fs.writeFileSync(file, content);
console.log('Fix liquidacion emails done');
