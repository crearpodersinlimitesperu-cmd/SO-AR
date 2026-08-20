// src/services/qtSheetService.js
// Conexión y sincronización en tiempo real del Directorio Oficial de Quantum Team (QT) desde Google Sheets

export const QT_SHEET_CSV_URL = import.meta.env.VITE_QT_SHEET_CSV_URL || 'https://docs.google.com/spreadsheets/d/10sz7KNvZ31GOgGDhzH0P3gbISGLW8HPBsSAZwOw5L8U/export?format=csv&gid=0';
export const QT_SHEET_EDIT_URL = import.meta.env.VITE_QT_SHEET_EDIT_URL || 'https://docs.google.com/spreadsheets/d/10sz7KNvZ31GOgGDhzH0P3gbISGLW8HPBsSAZwOw5L8U/edit?gid=0#gid=0';

const CACHE_KEY = 'cpsl_qt_members_cache_v2';
const CACHE_TIME_KEY = 'cpsl_qt_members_cache_time_v2';
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutos de caché automático

export function clearQTCache() {
  try {
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
  return s || 'Global';
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
 * Transforma las filas crudas del CSV en objetos de miembros de QT
 */
export function mapRowsToQTMembers(rows) {
  if (!rows || rows.length < 2) return [];

  // Fila 0 es el encabezado
  const dataRows = rows.slice(1);

  return dataRows
    .filter(r => r && r.length >= 3 && r[2] && r[2].trim() !== '')
    .map((r, index) => {
      const timestamp = r[0] || '';
      const rawSede = r[1] || '';
      const sede = normalizeQTSede(rawSede);
      const nombre = (r[2] || '').trim();
      const docTipo = r[3] || 'DNI';
      const docNumero = (r[4] || '').trim();
      const fechaNacimiento = r[5] || '';
      const genero = r[6] || '';
      const email = (r[7] || '').trim().toLowerCase();
      const rawWhatsapp = (r[8] || '').trim();
      const estatura = r[9] || '';
      const pesoActual = r[10] || '';
      const pesoIdeal = r[11] || '';
      const talla = (r[12] || '').trim().toUpperCase();
      const ediciones = (r[13] || '').trim();
      const instagram = (r[14] || '').trim();
      const declaracion = (r[15] || '').trim();
      const estado = (r[16] || 'ACTIVO - VERIFICADO').trim();

      // Formatear WhatsApp para wa.me
      let cleanPhone = rawWhatsapp.replace(/[^0-9+]/g, '');
      if (cleanPhone.startsWith('+')) {
        cleanPhone = cleanPhone.substring(1);
      }
      // Asegurar código si es 9 dígitos local
      if (cleanPhone.length === 9 || cleanPhone.length === 10) {
        if (sede === 'Lima') cleanPhone = '51' + cleanPhone;
        else if (['Quito', 'Guayaquil', 'Cuenca'].includes(sede)) {
          if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
          cleanPhone = '593' + cleanPhone;
        } else if (sede === 'Medellín') cleanPhone = '57' + cleanPhone;
        else if (sede === 'México') cleanPhone = '52' + cleanPhone;
      }

      // ID determinístico basado en DNI o email o nombre
      const id = docNumero ? `qt_${docNumero}` : email ? `qt_${email.replace(/[^a-z0-9]/g, '_')}` : `qt_${index + 1}`;

      return {
        id,
        index: index + 1,
        timestamp,
        sedeCode: rawSede,
        sede,
        nombre,
        docTipo,
        docNumero,
        fechaNacimiento,
        genero,
        email,
        whatsapp: rawWhatsapp,
        cleanPhone,
        whatsappUrl: cleanPhone ? `https://wa.me/${cleanPhone}` : null,
        estatura,
        pesoActual,
        pesoIdeal,
        talla,
        ediciones,
        isSenior: ediciones.toLowerCase().includes('senior') || ediciones.toLowerCase().includes('más de 15') || ediciones.toLowerCase().includes('9 a 15'),
        instagram: instagram ? (instagram.startsWith('@') ? instagram : `@${instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')}`) : '',
        instagramUrl: instagram ? (instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`) : null,
        declaracion,
        estado,
        esActivo: estado.toUpperCase().includes('ACTIVO')
      };
    });
}

/**
 * Obtiene los miembros de QT desde caché o desde Google Sheets
 */
export async function getQTMembers({ forceRefresh = false } = {}) {
  // 1. Revisar caché si no es forzado
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

  // 2. Fetch en vivo desde Google Sheets
  try {
    const response = await fetch(QT_SHEET_CSV_URL, {
      method: 'GET',
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);
    const members = mapRowsToQTMembers(rows);

    if (members.length > 0) {
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
    console.error("Error al conectar con Google Sheets de QT:", error);
  }

  // 3. Fallback de caché antiguo si falló la red
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
    error: "No se pudo sincronizar con el Google Sheet oficial."
  };
}
