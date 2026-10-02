/**
 * Helper utilitario para formatear strings de equipos concatenados en la plataforma.
 * Ejemplos:
 *  - "293031" -> "Eq. 29, 30, 31"
 *  - "191817" -> "Eq. 19, 18, 17"
 *  - "126124122" -> "Eq. 126, 124, 122"
 *  - "35" -> "Eq. 35"
 */
export function formatTeamString(eq) {
  if (!eq) return '';
  const s = String(eq).trim();
  if (!s) return '';
  
  // Si ya tiene prefijo "Eq" o formato legible, respetar
  const clean = s.replace(/^(eq\.?|equipo(s)?)\s*/i, '').trim();
  
  // 6 dígitos (3 equipos de 2 dígitos, ej. 293031 o 191817)
  if (/^\d{6}$/.test(clean)) {
    return `Eq. ${clean.slice(0, 2)}, ${clean.slice(2, 4)}, ${clean.slice(4, 6)}`;
  }
  // 9 dígitos (3 equipos de 3 dígitos, ej. 126124122)
  if (/^\d{9}$/.test(clean)) {
    return `Eq. ${clean.slice(0, 3)}, ${clean.slice(3, 6)}, ${clean.slice(6, 9)}`;
  }
  // 4 dígitos (2 equipos de 2 dígitos, ej. 2526)
  if (/^\d{4}$/.test(clean)) {
    return `Eq. ${clean.slice(0, 2)}, ${clean.slice(2, 4)}`;
  }
  // Si ya tiene comas o espacios
  if (clean.includes(',') || clean.includes(' y ') || clean.includes('-')) {
    return `Eq. ${clean}`;
  }
  // Un solo equipo numérico o alfanumérico
  return `Eq. ${clean}`;
}
