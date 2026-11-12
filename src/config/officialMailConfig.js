/**
 * Configuración Oficial y Canónica de Comunicaciones de Causa OS
 * ===============================================================
 * Todos los correos institucionales, alertas de tareas, pases, contratos legales,
 * códigos de acceso IMO y notificaciones de Causa OS utilizan como canal oficial:
 *   no-reply@crearpsl.net
 *
 * Seguridad:
 * - Ninguna contraseña ni llave se almacena jamás en código fuente o trazabilidad.
 * - La autenticación SMTP utiliza secretos cifrados (GitHub Secrets / Google Secret Manager / .env 0600).
 */

export const OFFICIAL_CAUSA_MAIL_ADDRESS = 'no-reply@crearpsl.net';
export const OFFICIAL_CAUSA_MAIL_NAME = 'CREAR PODER SIN LÍMITES — Causa OS';
export const OFFICIAL_CAUSA_MAIL_FROM = `"${OFFICIAL_CAUSA_MAIL_NAME}" <${OFFICIAL_CAUSA_MAIL_ADDRESS}>`;

export function resolveOfficialMailFrom(env = typeof process !== 'undefined' ? process.env : {}) {
  const addr = String(env?.CAUSA_OFFICIAL_FROM_EMAIL || OFFICIAL_CAUSA_MAIL_ADDRESS).trim() || OFFICIAL_CAUSA_MAIL_ADDRESS;
  const name = String(env?.CAUSA_OFFICIAL_FROM_NAME || OFFICIAL_CAUSA_MAIL_NAME).trim() || OFFICIAL_CAUSA_MAIL_NAME;
  return {
    address: addr,
    name,
    formattedFrom: `"${name}" <${addr}>`
  };
}
