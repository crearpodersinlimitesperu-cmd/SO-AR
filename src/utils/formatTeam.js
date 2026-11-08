/**
 * Helper utilitario para separar números de equipos concatenados en la plataforma (Google Calendar, Apps Script, Causa OS).
 * Casos reales CPSL:
 *  - "987" -> ["9", "8", "7"] (Maestría del Juego: ciclos 9, 8 y 7)
 *  - "1098" -> ["10", "9", "8"]
 *  - "11109" -> ["11", "10", "9"]
 *  - "121110" -> ["12", "11", "10"]
 *  - "293031" -> ["29", "30", "31"]
 *  - "10098" -> ["100", "98"]
 *  - "1009896" -> ["100", "98", "96"]
 *  - "10210098" -> ["102", "100", "98"]
 *  - "126124122" -> ["126", "124", "122"]
 *  - "1112" -> ["11", "12"]
 *  - "31" -> ["31"]
 */
export function splitConcatenatedTeamNumbers(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap(splitConcatenatedTeamNumbers);
  }
  const text = String(raw).trim();
  if (!text) return [];

  // Match all digit groups if separated by commas, spaces, dashes, "/", "&", "y", "•"
  const parts = text.match(/\d+/g) || [];
  if (parts.length > 1) {
    return parts.flatMap(p => splitConcatenatedTeamNumbers(p));
  }
  const s = parts[0];
  if (!s) return [];

  const len = s.length;

  // 1-2 digits: single team (e.g. "31", "9")
  if (len <= 2) return [s];

  // 3 digits: e.g. 987, 876, 765, 321, 123
  if (len === 3) {
    const d0 = parseInt(s[0], 10);
    const d1 = parseInt(s[1], 10);
    const d2 = parseInt(s[2], 10);
    const isMonotonic = (d0 - d1 === 1 && d1 - d2 === 1) || 
                        (d1 - d0 === 1 && d2 - d1 === 1) ||
                        (d0 - d1 === 2 && d1 - d2 === 2) ||
                        (d1 - d0 === 2 && d2 - d1 === 2);
    if (isMonotonic) {
      return [s[0], s[1], s[2]];
    }
    return [s]; // e.g. "100", "101"
  }

  // 4 digits:
  // e.g. 1098 -> 10, 9, 8 (2 + 1 + 1)
  // e.g. 8910 -> 8, 9, 10 (1 + 1 + 2)
  // e.g. standard 2 teams: 2930, 1110, 2526, 1211, 1112 (2 + 2)
  if (len === 4) {
    const n2_1 = [s.slice(0, 2), s.slice(2, 3), s.slice(3, 4)].map(Number);
    if (n2_1[0] - n2_1[1] === 1 && n2_1[1] - n2_1[2] === 1) {
      return [s.slice(0, 2), s.slice(2, 3), s.slice(3, 4)];
    }
    const n1_2 = [s.slice(0, 1), s.slice(1, 2), s.slice(2, 4)].map(Number);
    if (n1_2[1] - n1_2[0] === 1 && n1_2[2] - n1_2[1] === 1) {
      return [s.slice(0, 1), s.slice(1, 2), s.slice(2, 4)];
    }
    return [s.slice(0, 2), s.slice(2, 4)];
  }

  // 5 digits:
  // e.g. 10098 -> 100, 98 (3 + 2)
  // e.g. 11109 -> 11, 10, 9 (2 + 2 + 1)
  // e.g. 91011 -> 9, 10, 11 (1 + 2 + 2)
  if (len === 5) {
    const c3_2 = [s.slice(0, 3), s.slice(3, 5)].map(Number);
    if (s[0] !== '0' && s[3] !== '0' && Math.abs(c3_2[0] - c3_2[1]) <= 3) {
      return [s.slice(0, 3), s.slice(3, 5)];
    }
    if (s[2] !== '0') {
      const c2_2_1 = [s.slice(0, 2), s.slice(2, 4), s.slice(4, 5)].map(Number);
      if (Math.abs(c2_2_1[0] - c2_2_1[1]) <= 2 && Math.abs(c2_2_1[1] - c2_2_1[2]) <= 2) {
        return [s.slice(0, 2), s.slice(2, 4), s.slice(4, 5)];
      }
    }
    if (s[1] !== '0' && s[3] !== '0') {
      const c1_2_2 = [s.slice(0, 1), s.slice(1, 3), s.slice(3, 5)].map(Number);
      if (Math.abs(c1_2_2[1] - c1_2_2[0]) <= 2 && Math.abs(c1_2_2[2] - c1_2_2[1]) <= 2) {
        return [s.slice(0, 1), s.slice(1, 3), s.slice(3, 5)];
      }
    }
  }

  // 6 digits:
  // e.g. 102100 -> 102, 100 (3 + 3)
  // e.g. 121110 -> 12, 11, 10 (2 + 2 + 2)
  if (len === 6) {
    const c3_3 = [s.slice(0, 3), s.slice(3, 6)].map(Number);
    if (s[0] !== '0' && s[3] !== '0' && Math.abs(c3_3[0] - c3_3[1]) <= 3 && c3_3[0] >= 100) {
      return [s.slice(0, 3), s.slice(3, 6)];
    }
    return [s.slice(0, 2), s.slice(2, 4), s.slice(4, 6)];
  }

  // 7 digits:
  // e.g. 1009896 -> 100, 98, 96 (3 + 2 + 2)
  if (len === 7) {
    const c3_2_2 = [s.slice(0, 3), s.slice(3, 5), s.slice(5, 7)].map(Number);
    if (s[0] !== '0' && s[3] !== '0' && s[5] !== '0' && Math.abs(c3_2_2[0] - c3_2_2[1]) <= 3 && Math.abs(c3_2_2[1] - c3_2_2[2]) <= 3) {
      return [s.slice(0, 3), s.slice(3, 5), s.slice(5, 7)];
    }
  }

  // 8 digits:
  // e.g. 10210098 -> 102, 100, 98 (3 + 3 + 2)
  if (len === 8) {
    const c3_3_2 = [s.slice(0, 3), s.slice(3, 6), s.slice(6, 8)].map(Number);
    if (s[0] !== '0' && s[3] !== '0' && s[6] !== '0' && Math.abs(c3_3_2[0] - c3_3_2[1]) <= 3 && Math.abs(c3_3_2[1] - c3_3_2[2]) <= 3) {
      return [s.slice(0, 3), s.slice(3, 6), s.slice(6, 8)];
    }
  }

  // 9 digits:
  // e.g. 126124122 -> 126, 124, 122 (3 + 3 + 3)
  if (len === 9) {
    return [s.slice(0, 3), s.slice(3, 6), s.slice(6, 9)];
  }

  return [s];
}

/**
 * Helper utilitario para formatear strings de equipos concatenados en la plataforma.
 * Ejemplos:
 *  - "987" -> "Eq. 9, 8, 7"
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
  
  const parts = splitConcatenatedTeamNumbers(clean);
  if (parts.length > 1) {
    return `Eq. ${parts.join(', ')}`;
  }
  
  // Si ya tiene comas o espacios
  if (clean.includes(',') || clean.includes(' y ') || clean.includes('-')) {
    return `Eq. ${clean}`;
  }
  return `Eq. ${clean}`;
}
