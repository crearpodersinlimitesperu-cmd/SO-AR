import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Cargar variables de entorno
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

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/10sz7KNvZ31GOgGDhzH0P3gbISGLW8HPBsSAZwOw5L8U/export?format=csv';

// Función para limpiar acentos y caracteres especiales del nombre para el ID
const cleanId = (name) => {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
};

// Función para normalizar la sede
const normalizeSede = (sede) => {
  if (!sede) return 'Sede Global';
  const s = sede.trim();
  if (s === 'MED' || s.toLowerCase().includes('medell')) return 'Medellín';
  if (s === 'LIM' || s.toLowerCase().includes('lima')) return 'Lima';
  if (s === 'CUE' || s.toLowerCase().includes('cuenca')) return 'Cuenca';
  if (s === 'GYE' || s.toLowerCase().includes('guayaquil')) return 'Guayaquil';
  if (s === 'MEX' || s.toLowerCase().includes('mex')) return 'México';
  if (s === 'UIO-C1' || s.toLowerCase().includes('ciclo 1') || s.toLowerCase().includes('ciclo1')) return 'Quito Ciclo 1';
  if (s === 'UIO-C2' || s.toLowerCase().includes('ciclo 2') || s.toLowerCase().includes('ciclo2')) return 'Quito Ciclo 2';
  if (s === 'UIO' || s.toLowerCase().includes('quito')) return 'Quito Ciclo 1';
  if (s.toLowerCase().includes('global')) return 'Sede Global';
  return s;
};

// Función para parsear CSV manual
const parseCSV = (text) => {
  const lines = text.split('\n');
  if (lines.length < 2) return [];
  
  // Una forma robusta usando split simple por filas y limpiando
  // Ya que en la sheet los comas suelen estar escapados con comillas
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    // Simple split por comas que ignora las que están dentro de comillas
    let inQuotes = false;
    let val = '';
    const values = [];
    for (let char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(val.trim().replace(/^"|"$/g, ''));
        val = '';
      } else {
        val += char;
      }
    }
    values.push(val.trim().replace(/^"|"$/g, '')); // último valor
    
    const row = {};
    headers.forEach((h, index) => {
      row[h] = values[index] !== undefined ? values[index] : '';
    });
    rows.push(row);
  }
  return rows;
};

async function syncQTSheet() {
  console.log(`[${new Date().toLocaleTimeString()}] Iniciando sincronización del Quantum Team...`);
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    
    let updatedCount = 0;

    for (const row of rows) {
      const rawName = row['Nombres y Apellidos'] || row['Nombres y apellidos'];
      if (!rawName || rawName === 'nan') continue;
      
      const name = String(rawName).trim();
      const rawSede = row['Sede Base'] || 'Sede Global';
      const sede = normalizeSede(String(rawSede).trim());
      
      // Búsqueda inteligente de correo
      let email = '';
      const emailRegex = /^[\w\.-]+@[\w\.-]+\.\w+$/;
      
      for (const key in row) {
        const val = String(row[key]).trim().toLowerCase();
        if (val.includes('@') && val.includes('.') && !val.includes(' ') && emailRegex.test(val)) {
          email = val;
          break;
        }
      }

      if (!email) {
        console.warn(`⚠️ No se encontró correo para: ${name}`);
        continue;
      }

      const uid = 'qt_' + cleanId(name);
      const userRef = doc(db, 'users', uid);
      
      await setDoc(userRef, {
        id: uid,
        name: name,
        role: 'qt',
        sede: sede,
        emails: [email],
        updatedAt: new Date().toISOString(),
        source: 'qtSyncDaemon'
      }, { merge: true });
      
      updatedCount++;
    }

    console.log(`✅ Sincronización exitosa. ${updatedCount} miembros procesados.`);
  } catch (error) {
    console.error('❌ Error sincronizando:', error.message);
  }
}

syncQTSheet();
const INTERVAL_MS = 15 * 60 * 1000; // 15 minutos
setInterval(syncQTSheet, INTERVAL_MS);
console.log("🚀 QT Sync Daemon iniciado. Monitoreando Google Sheet cada 15 minutos.");
