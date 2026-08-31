import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const QT_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/10sz7KNvZ31GOgGDhzH0P3gbISGLW8HPBsSAZwOw5L8U/export?format=csv&gid=0';

// ==========================================
// HEURÍSTICAS DE VALIDACIÓN SEMÁNTICA
// ==========================================
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

const isEmail = (val = '') => /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(val.trim());
const isDate = (val = '') => /^\d{4}-\d{2}-\d{2}$/.test(val.trim()) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val.trim());
const isPhone = (val = '') => {
  const clean = val.replace(/[^0-9+]/g, '').trim();
  return clean.length >= 8 && (
    clean.startsWith('+') || clean.startsWith('09') || clean.startsWith('593') || 
    clean.startsWith('51') || clean.startsWith('57') || clean.startsWith('52') || clean.length >= 9
  );
};
const isTalla = (val = '') => ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'S (MUJER)', 'M (HOMBRE)', 'L (HOMBRE)', 'S (HOMBRE)', 'M (MUJER)', 'L (MUJER)'].includes(val.trim().toUpperCase());
const isEdicion = (val = '') => {
  const v = val.trim().toLowerCase();
  return v.includes('edicion') || v.includes('ediciones') || v.includes('primera vez') || v.includes('senior') || v.includes('graduado');
};
const isInstagram = (val = '') => {
  const v = val.trim();
  if (!v) return false;
  const upper = v.toUpperCase();
  if (upper.includes('ACTIVO') || upper.includes('VERIFICADO') || upper.includes('FEMENINO') || upper.includes('MASCULINO')) return false;
  if (isTalla(v)) return false;
  if (v.length > 35) return false;
  if (v.includes(' ') && !v.startsWith('@')) return false;
  return v.startsWith('@') || v.includes('instagram.com');
};
const isEstado = (val = '') => ['ACTIVO - VERIFICADO', 'ACTIVO', 'INACTIVO', 'VERIFICADO', 'PENDIENTE', 'SUSPENDIDO'].some(k => val.trim().toUpperCase().includes(k));
const isDeclaracion = (val = '') => {
  const v = val.trim();
  return v.length > 25 && !isEmail(v) && !isEdicion(v);
};

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
        i++; 
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
        i++;
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

    const extraValues = r.slice(5).map(v => (v || '').trim()).filter(Boolean);
    let email = '', phone = '', birthDate = '', talla = '', ediciones = '', instagram = '', declaracion = '', estado = 'ACTIVO - VERIFICADO';
    
    const remaining = [];
    for (const val of extraValues) {
      if (!email && isEmail(val)) email = val.toLowerCase();
      else if (!birthDate && isDate(val)) birthDate = val;
      else if (!estado && isEstado(val)) estado = val;
      else if (!ediciones && isEdicion(val)) ediciones = val;
      else if (!declaracion && isDeclaracion(val)) declaracion = val;
      else remaining.push(val);
    }
    for (const val of remaining) {
      if (!talla && isTalla(val)) talla = val.toUpperCase();
      else if (!phone && isPhone(val)) phone = val;
      else if (!instagram && isInstagram(val)) instagram = val;
    }

    if (!email && r[7] && isEmail(r[7])) email = r[7].trim().toLowerCase();
    if (!phone && r[8] && isPhone(r[8])) phone = r[8].trim();
    if (!talla && r[12] && isTalla(r[12])) talla = r[12].trim().toUpperCase();
    if (!ediciones && r[13] && isEdicion(r[13])) ediciones = r[13].trim();
    
    if (instagram && isTalla(instagram)) {
      if (!talla) talla = instagram.toUpperCase();
      instagram = '';
    }
    if (!instagram && r[14] && isInstagram(r[14])) instagram = r[14].trim();
    if (!instagram && r[14] && !isTalla(r[14]) && r[14].length > 1 && !r[14].includes(' ')) instagram = r[14].trim();
    if (!declaracion && r[15] && isDeclaracion(r[15])) declaracion = r[15].trim();
    if (!estado && r[16] && isEstado(r[16])) estado = r[16].trim();

    if (!ediciones) ediciones = '1 a 3 ediciones';

    let cleanInstagram = '';
    if (instagram && !isTalla(instagram)) {
      let rawInsta = instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '').trim();
      if (!rawInsta.toUpperCase().includes('FEMENINO') && !rawInsta.toUpperCase().includes('MASCULINO') && !rawInsta.toUpperCase().includes('ACTIVO')) {
        cleanInstagram = (!rawInsta.startsWith('@') && rawInsta.length > 0) ? '@' + rawInsta : rawInsta;
      }
    }

    let cleanPhone = (phone || '').replace(/[^0-9+]/g, '');
    if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);
    if (cleanPhone.length === 9 || cleanPhone.length === 10) {
      if (sede === 'Lima' && !cleanPhone.startsWith('51')) cleanPhone = '51' + cleanPhone;
      else if (['Quito', 'Guayaquil', 'Cuenca'].includes(sede) && !cleanPhone.startsWith('593')) {
        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        cleanPhone = '593' + cleanPhone;
      } else if (sede === 'Medellín' && !cleanPhone.startsWith('57')) cleanPhone = '57' + cleanPhone;
      else if (sede === 'México' && !cleanPhone.startsWith('52')) cleanPhone = '52' + cleanPhone;
    }

    const dedupeKey = docNumero ? `doc_${docNumero}` : email ? `email_${email}` : `nom_${nombre.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    if (seenDocs.has(dedupeKey)) continue;
    seenDocs.add(dedupeKey);

    const id = docNumero ? `qt_${docNumero}` : email ? `qt_${email.replace(/[^a-z0-9]/g, '_')}` : `qt_${index + 1}`;
    const isSenior = ediciones.toLowerCase().includes('senior') || ediciones.toLowerCase().includes('más de 15') || ediciones.toLowerCase().includes('mas de 15') || ediciones.toLowerCase().includes('9 a 15');

    validMembers.push({
      id, index: validMembers.length + 1, timestamp: rawTimestamp, sedeCode: rawSede, sede, nombre, docTipo, docNumero, birthDate, email,
      whatsapp: phone, cleanPhone, whatsappUrl: cleanPhone ? `https://wa.me/${cleanPhone}` : null,
      talla, ediciones, isSenior, instagram: cleanInstagram, instagramUrl: cleanInstagram ? `https://instagram.com/${cleanInstagram.replace('@', '')}` : null,
      declaracion, estado, esActivo: estado.toUpperCase().includes('ACTIVO')
    });
  }
  return validMembers;
}

async function migrate() {
  console.log("Descargando CSV público de QT...");
  const response = await fetch(QT_SHEET_CSV_URL);
  const csvText = await response.text();
  console.log("Parseando CSV...");
  const rows = parseCSV(csvText);
  const members = mapRowsToQTMembers(rows);
  console.log(`Encontrados ${members.length} miembros válidos.`);

  console.log("Subiendo a Firestore...");
  let count = 0;
  for (const m of members) {
    await setDoc(doc(db, 'qt_directory', m.id), m);
    count++;
    if (count % 100 === 0) console.log(`${count} subidos...`);
  }
  console.log("¡Migración Completada!");
  process.exit(0);
}

migrate();
