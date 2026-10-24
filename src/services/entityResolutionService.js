/**
 * Cross-Sede Entity Resolution & Homonym Disambiguation Service
 * 
 * Resuelve la fragmentación de participantes entre sedes (Lima, Quito, Cuenca, etc.)
 * causada por diferencias de formato en DNI (ceros a la izquierda), teléfonos sin prefijo
 * internacional, o variaciones ortográficas en nombres y apellidos.
 * 
 * Principio CPSL: "Nodus es el hecho inmutable, Causa OS toma la decisión verificable".
 */

/**
 * Infiere el país a partir de nombres de sede, país o abreviaciones.
 */
export function detectCountryFromLocation(loc = '') {
  const s = String(loc || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (s.includes('peru') || s.includes('pe') || s.includes('lima')) return 'peru';
  if (s.includes('ecuador') || s.includes('ec') || s.includes('quito') || s.includes('guayaquil') || s.includes('cuenca')) return 'ecuador';
  if (s.includes('colombia') || s.includes('co') || s.includes('medellin') || s.includes('bogota')) return 'colombia';
  return 'peru';
}

/**
 * Normaliza el Documento Nacional de Identidad según estándares de cada país.
 * Perú: 8 dígitos numéricos (rellena con ceros a la izquierda si tiene 7 o menos).
 * Ecuador: 10 dígitos numéricos (cédula de identidad).
 * Colombia: 6 a 10 dígitos.
 */
export function normalizeNationalId(rawId, pais = 'peru') {
  if (!rawId) return '';
  const clean = String(rawId).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const digitsOnly = clean.replace(/\D/g, '');

  const normCountry = detectCountryFromLocation(pais);
  if (normCountry === 'peru') {
    if (digitsOnly.length > 0 && digitsOnly.length <= 8) {
      return digitsOnly.padStart(8, '0');
    }
  } else if (normCountry === 'ecuador') {
    if (digitsOnly.length > 0 && digitsOnly.length <= 10) {
      return digitsOnly.padStart(10, '0');
    }
  }

  return clean;
}

/**
 * Normaliza números telefónicos al formato estándar internacional E.164.
 */
export function normalizePhoneNumber(rawPhone, pais = 'peru') {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/\D/g, '');

  const normCountry = detectCountryFromLocation(pais);
  if (normCountry === 'peru') {
    if (digits.startsWith('51') && digits.length === 11) {
      return `+${digits}`;
    }
    if (digits.length === 9 && digits.startsWith('9')) {
      return `+51${digits}`;
    }
  } else if (normCountry === 'ecuador') {
    if (digits.startsWith('593') && digits.length >= 11) {
      return `+${digits}`;
    }
    if (digits.length === 9 && digits.startsWith('9')) {
      return `+593${digits}`;
    }
    if (digits.length === 10 && digits.startsWith('09')) {
      return `+593${digits.substring(1)}`;
    }
  } else if (normCountry === 'colombia') {
    if (digits.startsWith('57') && digits.length === 12) {
      return `+${digits}`;
    }
    if (digits.length === 10 && digits.startsWith('3')) {
      return `+57${digits}`;
    }
  }

  return digits ? `+${digits}` : '';
}

/**
 * Normaliza y ordena los tokens de un nombre completo para comparar sin importar el orden de apellidos.
 */
export function normalizeNameTokens(name) {
  if (!name) return [];
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(token => token.length >= 2)
    .sort();
}

/**
 * Calcula la distancia de similitud de Jaro entre dos cadenas.
 */
function jaroDistance(s1, s2) {
  if (s1 === s2) return 1.0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0.0;

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let t = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) t++;
    k++;
  }

  return (matches / len1 + matches / len2 + (matches - t / 2) / matches) / 3.0;
}

/**
 * Calcula la métrica de Jaro-Winkler para medir proximidad en nombres de personas.
 */
export function jaroWinklerSimilarity(s1, s2) {
  const jaro = jaroDistance(s1, s2);
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Compara dos perfiles de participantes para determinar si representan a la misma persona física.
 * 
 * @param {Object} p1 - Perfil participante 1
 * @param {Object} p2 - Perfil participante 2
 * @returns {Object} Veredicto de resolución de identidad con score determinista
 */
export function resolveParticipantIdentity(p1, p2) {
  if (!p1 || !p2) {
    return { isSamePerson: false, score: 0, reason: 'Perfiles incompletos' };
  }

  const dni1 = normalizeNationalId(p1.dni || p1.documento, p1.pais || p1.sede);
  const dni2 = normalizeNationalId(p2.dni || p2.documento, p2.pais || p2.sede);

  const rawDigits1 = String(p1.dni || p1.documento || '').replace(/\D/g, '').replace(/^0+/, '');
  const rawDigits2 = String(p2.dni || p2.documento || '').replace(/\D/g, '').replace(/^0+/, '');
  const isDniDigitsMatch = rawDigits1 && rawDigits2 && rawDigits1 === rawDigits2 && rawDigits1.length >= 6;

  // Regla 1: DNI normalizado idéntico o dígitos significativos idénticos (certeza absoluta del 100%)
  if ((dni1 && dni2 && dni1 === dni2) || isDniDigitsMatch) {
    return {
      isSamePerson: true,
      confidence: 1.0,
      classification: 'EXACT_NATIONAL_ID_MATCH',
      canonicalDni: dni1 || dni2 || rawDigits1,
      reason: 'DNI normalizado idéntico entre sedes'
    };
  }

  // Regla 2: Email idéntico (certeza del 98%)
  const email1 = (p1.email || '').trim().toLowerCase();
  const email2 = (p2.email || '').trim().toLowerCase();
  if (email1 && email2 && email1 === email2) {
    return {
      isSamePerson: true,
      confidence: 0.98,
      classification: 'EXACT_EMAIL_MATCH',
      canonicalEmail: email1,
      reason: 'Correo electrónico idéntico verificado'
    };
  }

  // Regla 3: Teléfono E.164 idéntico
  const phone1 = normalizePhoneNumber(p1.telefono || p1.phone, p1.pais || p1.sede);
  const phone2 = normalizePhoneNumber(p2.telefono || p2.phone, p2.pais || p2.sede);
  const phoneMatch = phone1 && phone2 && phone1 === phone2;

  // Comparación fonética/ortográfica de nombres
  const tokens1 = normalizeNameTokens(p1.nombre || p1.name);
  const tokens2 = normalizeNameTokens(p2.nombre || p2.name);
  const str1 = tokens1.join(' ');
  const str2 = tokens2.join(' ');

  const nameSimilarity = jaroWinklerSimilarity(str1, str2);

  // Si el teléfono coincide y el nombre tiene similitud >= 0.70
  if (phoneMatch && nameSimilarity >= 0.70) {
    return {
      isSamePerson: true,
      confidence: 0.95,
      classification: 'PHONE_AND_FUZZY_NAME_MATCH',
      canonicalPhone: phone1,
      nameSimilarity: Math.round(nameSimilarity * 100) / 100,
      reason: 'Teléfono E.164 coincidente con alta similitud de nombre'
    };
  }

  // Si no hay DNI ni teléfono idéntico, evaluar si el nombre es casi idéntico (>= 0.94)
  if (nameSimilarity >= 0.94) {
    return {
      isSamePerson: false,
      isCandidateAlias: true,
      confidence: Math.round(nameSimilarity * 100) / 100,
      classification: 'STRONG_NAME_HOMONYM_CANDIDATE',
      reason: 'Nombres casi idénticos en distintas sedes; requiere validación de contacto'
    };
  }

  return {
    isSamePerson: false,
    confidence: Math.round(nameSimilarity * 100) / 100,
    classification: 'DISTINCT_PARTICIPANTS',
    reason: 'Identificadores distintos'
  };
}
