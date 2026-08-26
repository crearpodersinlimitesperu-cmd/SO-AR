import { google } from 'googleapis';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./centro-operativo-cpsl-65ad52160f45.json', 'utf8'));

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}
const db = getFirestore();

const auth = new google.auth.GoogleAuth({
  keyFile: './centro-operativo-cpsl-65ad52160f45.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({version: 'v4', auth});

// Helper to check if a color is reddish
function isReddish(color) {
    if (!color) return false;
    const r = color.red || 0;
    const g = color.green || 0;
    const b = color.blue || 0;
    return r > 0.6 && g < 0.4 && b < 0.4;
}

// Helper to check if text contains desertor or renuncia
function isInactiveText(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return lower.includes('desertor') || lower.includes('renuncia');
}

async function syncQT() {
  console.log('--- Analizando QT Global ---');
  const res = await sheets.spreadsheets.get({ 
      spreadsheetId: '10sz7KNvZ31GOgGDhzH0P3gbISGLW8HPBsSAZwOw5L8U', 
      includeGridData: true,
      ranges: ['A1:Z500']
  });
  
  const grid = res.data.sheets[0].data[0].rowData;
  let headers = [];
  let emailsToDisable = [];

  grid.forEach((row, rowIndex) => {
      if (!row.values) return;
      
      const rowValues = row.values.map(v => v.formattedValue || '');
      if (rowIndex === 0) {
          headers = rowValues;
          return;
      }
      
      const emailIndex = 7; // Correo Electrónico
      const statusIndex = 16; // Estado de Perfil
      const email = rowValues[emailIndex]?.trim().toLowerCase();
      
      if (!email) return;

      let shouldDisable = false;
      const statusText = rowValues[statusIndex];
      
      if (isInactiveText(statusText)) shouldDisable = true;
      
      // Check colors in the row
      const isRed = row.values.some(v => v.effectiveFormat && v.effectiveFormat.backgroundColor && isReddish(v.effectiveFormat.backgroundColor));
      if (isRed) shouldDisable = true;

      if (shouldDisable) {
          emailsToDisable.push(email);
      }
  });

  console.log(`QT: Encontrados ${emailsToDisable.length} para desactivar.`);
  return emailsToDisable;
}

async function syncDirectorio() {
  console.log('--- Analizando DIRECTORIO GLOBAL ---');
  const res = await sheets.spreadsheets.get({ 
      spreadsheetId: '1bl1_R6Qiee4tQ31Oix1Mjo_Jsbmddv3nsc5xBIy7QJY', 
      includeGridData: true,
      ranges: ['A1:Z500']
  });
  
  const grid = res.data.sheets[0].data[0].rowData;
  let headers = [];
  let emailsToDisable = [];

  grid.forEach((row, rowIndex) => {
      if (!row.values) return;
      
      const rowValues = row.values.map(v => v.formattedValue || '');
      if (rowIndex === 0) {
          headers = rowValues;
          return;
      }
      
      const emailIndex = 2; // Correo
      const statusIndex = 13; // STATUS
      const email = rowValues[emailIndex]?.trim().toLowerCase();
      
      if (!email) return;

      let shouldDisable = false;
      const statusText = rowValues[statusIndex];
      
      if (isInactiveText(statusText)) shouldDisable = true;
      
      // Check colors
      const isRed = row.values.some(v => v.effectiveFormat && v.effectiveFormat.backgroundColor && isReddish(v.effectiveFormat.backgroundColor));
      if (isRed) shouldDisable = true;

      if (shouldDisable) {
          emailsToDisable.push(email);
      }
  });

  console.log(`Directorio: Encontrados ${emailsToDisable.length} para desactivar.`);
  return emailsToDisable;
}

async function run() {
    const qtEmails = await syncQT();
    const dirEmails = await syncDirectorio();
    
    const allEmailsToDisable = [...new Set([...qtEmails, ...dirEmails])];
    console.log(`Total únicos a desactivar: ${allEmailsToDisable.length}`);
    
    // Disable in 'users'
    const usersSnap = await db.collection('users').get();
    let updatedUsers = 0;
    for (const doc of usersSnap.docs) {
        const data = doc.data();
        const userEmails = [data.email, ...(data.emails || [])].filter(Boolean).map(e => e.toLowerCase());
        
        if (userEmails.some(e => allEmailsToDisable.includes(e))) {
            if (data.esActivo !== false) {
                await db.collection('users').doc(doc.id).update({ esActivo: false });
                console.log(`Desactivado en users: ${userEmails.join(',')}`);
                updatedUsers++;
            }
        }
    }
    
    // Disable in 'qt_directory'
    const qtSnap = await db.collection('qt_directory').get();
    let updatedQt = 0;
    for (const doc of qtSnap.docs) {
        const data = doc.data();
        const userEmails = [data.email, ...(data.emails || [])].filter(Boolean).map(e => e.toLowerCase());
        
        if (userEmails.some(e => allEmailsToDisable.includes(e))) {
            if (data.esActivo !== false) {
                await db.collection('qt_directory').doc(doc.id).update({ esActivo: false });
                console.log(`Desactivado en qt_directory: ${userEmails.join(',')}`);
                updatedQt++;
            }
        }
    }
    
    console.log(`Completado. Actualizados ${updatedUsers} en users y ${updatedQt} en qt_directory.`);
}

run().catch(console.error);
