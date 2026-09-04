// src/services/qtSheetService.js
// Conexión y saneamiento de los miembros de Quantum Team (QT).
// MIGRADOS A FIRESTORE DESDE GOOGLE SHEETS EN EL HITO 3 (Fase de Seguridad)
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export const QT_SHEET_CSV_URL = import.meta.env.VITE_QT_SHEET_CSV_URL || 'https://docs.google.com/spreadsheets/d/10sz7KNvZ31GOgGDhzH0P3gbISGLW8HPBsSAZwOw5L8U/export?format=csv&gid=0';
export const QT_SHEET_EDIT_URL = import.meta.env.VITE_QT_SHEET_EDIT_URL || 'https://docs.google.com/spreadsheets/d/10sz7KNvZ31GOgGDhzH0P3gbISGLW8HPBsSAZwOw5L8U/edit?gid=0#gid=0';

const CACHE_KEY = 'cpsl_qt_members_cache_v4';
const CACHE_TIME_KEY = 'cpsl_qt_members_cache_time_v4';
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutos de caché automático

export function clearQTCache() {
  try {
    localStorage.removeItem('cpsl_qt_members_cache_v3');
    localStorage.removeItem('cpsl_qt_members_cache_time_v3');
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIME_KEY);
  } catch (e) {
    console.warn("Error al limpiar caché de QT:", e);
  }
}

/**
 * Mapeo de código de sede a nombre oficial y país
 */
export const normalizeQTSede = (rawSede = '') => {
  const s = rawSede.trim().toUpperCase();
  if (s === 'UIO' || s.includes('QUITO')) return 'Quito';
  if (s === 'GYE' || s.includes('GUAYAQUIL')) return 'Guayaquil';
  if (s === 'CUE' || s.includes('CUENCA')) return 'Cuenca';
  if (s === 'LIM' || s.includes('LIMA')) return 'Lima';
  if (s === 'MED' || s.includes('MEDELLIN') || s.includes('MEDELLÍN')) return 'Medellín';
  if (s === 'MEX' || s.includes('MEXICO') || s.includes('MÉXICO') || s.includes('CDMX')) return 'México';
  return rawSede.trim() || 'Global';
};

// ==========================================
// HEURÍSTICAS DE VALIDACIÓN SEMÁNTICA
// ==========================================
const isEmail = (val = '') => /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(val.trim());
const isDate = (val = '') => /^\d{4}-\d{2}-\d{2}$/.test(val.trim()) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val.trim());

const isPhone = (val = '') => {
  const clean = val.replace(/[^0-9+]/g, '').trim();
  return clean.length >= 8 && (
    clean.startsWith('+') || 
    clean.startsWith('09') || 
    clean.startsWith('593') || 
    clean.startsWith('51') || 
    clean.startsWith('57') || 
    clean.startsWith('52') || 
    clean.length >= 9
  );
};

const isTalla = (val = '') => {
  const v = val.trim().toUpperCase();
  return ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'S (MUJER)', 'M (HOMBRE)', 'L (HOMBRE)', 'S (HOMBRE)', 'M (MUJER)', 'L (MUJER)'].includes(v);
};

const isEdicion = (val = '') => {
  const v = val.trim().toLowerCase();
  return v.includes('edicion') || v.includes('ediciones') || v.includes('primera vez') || v.includes('senior') || v.includes('graduado');
};

const isInstagram = (val = '') => {
  const v = val.trim();
  if (!v) return false;
  const upper = v.toUpperCase();
  // Filter out any potential sizes (including new form answers), genders, states
  if (upper.includes('ACTIVO') || upper.includes('VERIFICADO') || upper.includes('FEMENINO') || upper.includes('MASCULINO')) return false;
  if (['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'S (MUJER)', 'M (HOMBRE)', 'L (HOMBRE)', 'S (HOMBRE)', 'M (MUJER)', 'L (MUJER)'].includes(upper)) return false;
  
  if (v.length > 35) return false;
  if (v.includes(' ') && !v.startsWith('@')) return false;
  return v.startsWith('@') || v.includes('instagram.com');
};

const isEstado = (val = '') => {
  const upper = val.trim().toUpperCase();
  return ['ACTIVO - VERIFICADO', 'ACTIVO', 'INACTIVO', 'VERIFICADO', 'PENDIENTE', 'SUSPENDIDO'].some(k => upper.includes(k));
};

const isDeclaracion = (val = '') => {
  const v = val.trim();
  return v.length > 25 && !isEmail(v) && !isEdicion(v);
};

/**
 * Parser robusto de CSV compatible con saltos de línea y comillas dobles
 */
export function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // Saltar siguiente comilla de escape
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++; // Saltar '\n'
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Transforma y SANEAMENTE INTELIGENTE de las filas crudas del CSV en objetos de miembros de QT
 * Corrige automáticamente filas desfasadas, datos invertidos y elimina duplicados.
 */
export function mapRowsToQTMembers(rows) {
  if (!rows || rows.length < 2) return [];

  const dataRows = rows.slice(1);
  const seenDocs = new Set();
  const validMembers = [];

  for (let index = 0; index < dataRows.length; index++) {
    const r = dataRows[index];
    if (!r || r.length < 3) continue;

    const rawTimestamp = r[0] || '';
    const rawSede = r[1] || '';
    const sede = normalizeQTSede(rawSede);
    const nombre = (r[2] || '').trim();
    if (!nombre) continue;

    const docTipo = (r[3] || 'Cédula').trim();
    let docNumero = (r[4] || '').trim();

    // Recolectar campos adicionales para análisis semántico inteligente
    const extraValues = r.slice(5).map(v => (v || '').trim()).filter(Boolean);

    // Ranuras objetivo
    let email = '';
    let phone = '';
    let birthDate = '';
    let talla = '';
    let ediciones = '';
    let instagram = '';
    let declaracion = '';
    let estado = 'ACTIVO - VERIFICADO';

    // 1er Pase: Clasificación por reglas semánticas fuertes
    const remaining = [];
    for (const val of extraValues) {
      if (!email && isEmail(val)) {
        email = val.toLowerCase();
      } else if (!birthDate && isDate(val)) {
        birthDate = val;
      } else if (!estado && isEstado(val)) {
        estado = val;
      } else if (!ediciones && isEdicion(val)) {
        ediciones = val;
      } else if (!declaracion && isDeclaracion(val)) {
        declaracion = val;
      } else {
        remaining.push(val);
      }
    }

    // 2do Pase: Identificar talla, teléfono e instagram
    for (const val of remaining) {
      if (!talla && isTalla(val)) {
        talla = val.toUpperCase();
      } else if (!phone && isPhone(val)) {
        phone = val;
      } else if (!instagram && isInstagram(val)) {
        instagram = val;
      }
    }

    // Fallback posicional estándar si las heurísticas no detectaron algún campo
    if (!email && r[7] && isEmail(r[7])) email = r[7].trim().toLowerCase();
    if (!phone && r[8] && isPhone(r[8])) phone = r[8].trim();
    if (!talla && r[12] && isTalla(r[12])) talla = r[12].trim().toUpperCase();
    if (!ediciones && r[13] && isEdicion(r[13])) ediciones = r[13].trim();
    
    // Safety check: if instagram was mistakenly parsed as something that looks like a Talla
    if (instagram && isTalla(instagram)) {
      if (!talla) talla = instagram.toUpperCase();
      instagram = '';
    }

    if (!instagram && r[14] && isInstagram(r[14])) instagram = r[14].trim();
    // Safety check again over r[14]
    if (!instagram && r[14] && !isTalla(r[14]) && r[14].length > 1 && !r[14].includes(' ')) instagram = r[14].trim();

    if (!declaracion && r[15] && isDeclaracion(r[15])) declaracion = r[15].trim();
    if (!estado && r[16] && isEstado(r[16])) estado = r[16].trim();

    // Valores por defecto consistentes
    if (!ediciones) ediciones = '1 a 3 ediciones';

    // Saneamiento y limpieza de Instagram
    let cleanInstagram = '';
    if (instagram && !isTalla(instagram)) {
      let rawInsta = instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '').trim();
      if (!rawInsta.toUpperCase().includes('FEMENINO') && !rawInsta.toUpperCase().includes('MASCULINO') && !rawInsta.toUpperCase().includes('ACTIVO')) {
        if (!rawInsta.startsWith('@') && rawInsta.length > 0) {
          cleanInstagram = '@' + rawInsta;
        } else {
          cleanInstagram = rawInsta;
        }
      }
    }

    // Formatear WhatsApp para enlace wa.me
    let cleanPhone = (phone || '').replace(/[^0-9+]/g, '');
    if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.substring(1);
    }
    if (cleanPhone.length === 9 || cleanPhone.length === 10) {
      if (sede === 'Lima' && !cleanPhone.startsWith('51')) {
        cleanPhone = '51' + cleanPhone;
      } else if (['Quito', 'Guayaquil', 'Cuenca'].includes(sede) && !cleanPhone.startsWith('593')) {
        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        cleanPhone = '593' + cleanPhone;
      } else if (sede === 'Medellín' && !cleanPhone.startsWith('57')) {
        cleanPhone = '57' + cleanPhone;
      } else if (sede === 'México' && !cleanPhone.startsWith('52')) {
        cleanPhone = '52' + cleanPhone;
      }
    }

    // Deduplicación por Documento o Email
    const dedupeKey = docNumero ? `doc_${docNumero}` : email ? `email_${email}` : `nom_${nombre.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    if (seenDocs.has(dedupeKey)) {
      continue; // Omitir duplicados
    }
    seenDocs.add(dedupeKey);

    const id = docNumero ? `qt_${docNumero}` : email ? `qt_${email.replace(/[^a-z0-9]/g, '_')}` : `qt_${index + 1}`;

    const isSenior = ediciones.toLowerCase().includes('senior') || 
                     ediciones.toLowerCase().includes('más de 15') || 
                     ediciones.toLowerCase().includes('mas de 15') || 
                     ediciones.toLowerCase().includes('9 a 15');

    validMembers.push({
      id,
      index: validMembers.length + 1,
      timestamp: rawTimestamp,
      sedeCode: rawSede,
      sede,
      nombre,
      docTipo,
      docNumero,
      birthDate,
      email,
      whatsapp: phone,
      cleanPhone,
      whatsappUrl: cleanPhone ? `https://wa.me/${cleanPhone}` : null,
      talla,
      ediciones,
      isSenior,
      instagram: cleanInstagram,
      instagramUrl: cleanInstagram ? `https://instagram.com/${cleanInstagram.replace('@', '')}` : null,
      declaracion,
      estado,
      esActivo: estado.toUpperCase().includes('ACTIVO')
    });
  }

  return validMembers;
}

/**
 * Obtiene los miembros de QT en tiempo real desde Google Sheets oficial (con fallback a Firestore)
 */
export async function getQTMembers({ forceRefresh = false } = {}) {
  // 1. Revisar caché local si no es forzado
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime, 10);
        if (age < CACHE_TTL_MS) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return {
              data: parsed,
              fromCache: true,
              lastUpdated: new Date(parseInt(cacheTime, 10)).toISOString(),
              total: parsed.length
            };
          }
        }
      }
    } catch (e) {
      console.warn("Error leyendo caché local de QT:", e);
    }
  }

  // 2. Fetch en vivo desde Google Sheets (fuente en tiempo real de nuevas altas)
  try {
    const response = await fetch(QT_SHEET_CSV_URL, {
      method: 'GET',
      cache: 'no-cache'
    });

    if (response.ok) {
      const csvText = await response.text();
      const rows = parseCSV(csvText);
      const members = mapRowsToQTMembers(rows);

      if (members && members.length > 0) {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(members));
          localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        } catch (e) {}

        return {
          data: members,
          fromCache: false,
          lastUpdated: new Date().toISOString(),
          total: members.length
        };
      }
    }
  } catch (sheetError) {
    console.warn("Error al sincronizar con Google Sheets, intentando Firestore:", sheetError);
  }

  // 3. Fallback en vivo desde Firestore
  try {
    const qtRef = collection(db, 'qt_directory');
    const q = query(qtRef, orderBy('index', 'asc'));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const members = snapshot.docs.map(doc => doc.data());
      
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(members));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      } catch (e) {}

      return {
        data: members,
        fromCache: false,
        lastUpdated: new Date().toISOString(),
        total: members.length
      };
    }
  } catch (error) {
    console.error("Error al conectar con Firestore (qt_directory):", error);
  }

  // 4. Fallback de caché antiguo si falló la red
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        data: parsed,
        fromCache: true,
        lastUpdated: cacheTime ? new Date(parseInt(cacheTime, 10)).toISOString() : null,
        total: parsed.length,
        isFallback: true
      };
    }
  } catch (e) {}

  return {
    data: [],
    fromCache: false,
    lastUpdated: null,
    total: 0,
    error: "No se pudo sincronizar el directorio de QT."
  };
}
