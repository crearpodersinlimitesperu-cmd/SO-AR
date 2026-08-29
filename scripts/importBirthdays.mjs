// scripts/importBirthdays.mjs
//
// Importa el campo "Cumpleaños" desde el/los Directorio(s) Global(es) en Excel
// hacia Firestore (colección "users", campo cumpleanos), para alimentar la
// alerta de cumpleaños del Panel Super Admin.
//
// CONFIRMADO por inspección directa de los archivos (28/08/2026, vía openpyxl)
// antes de escribir este script — no se inventó ninguna columna:
//   DIRECTORIO GLOBAL .xlsx / _1.xlsx, hoja "Hoja 1":
//     Nombre | Cargo / Función | Correo | Sede | Teléfono |
//     Nombre y Apellido Preferido | Email CREARPSL.NET | Contraseña Temporal |
//     Dirección de Residencia | Nombre del Contacto de Emergencia |
//     Número del Contacto de Emergencia | Teléfono Personal | Cumpleaños
//   DIRECTORIO GLOBAL _2.xlsx tiene un layout DISTINTO (sin columna "Correo" en
//   el mismo orden/índice). Por eso este script busca las columnas por NOMBRE de
//   encabezado, nunca por posición fija, y simplemente ignora cualquier hoja que
//   no tenga columnas reconocibles de correo Y de cumpleaños (no asume nada).
//   QT Global.xlsx (confirmado 28/08/2026, mismo layout que la hoja en vivo de
//   QT), hoja "Hoja 1": Fecha y Hora (Timestamp) | Sede Base | Nombres y
//   Apellidos | Tipo de Documento | Número de Documento | Fecha de Nacimiento |
//   Género | Correo Electrónico | WhatsApp (Con Código) | ... — se cruza por
//   "Correo Electrónico" y "Fecha de Nacimiento".
//
// SEGURIDAD: la columna "Contraseña Temporal" existe en los archivos DIRECTORIO
// GLOBAL. Este script NUNCA la lee, imprime, ni transporta — solo toma la
// columna de correo (cualquiera de sus variantes de nombre reconocidas) y la
// de cumpleaños. Si en algún momento se edita este script, mantener esa
// restricción.
//
// MODO SEGURO POR DEFECTO: sin --write, el script solo IMPRIME un preview de los
// cambios que haría (dry-run) y no escribe nada en Firestore. Hay que pasar
// --write explícitamente para aplicar los cambios — no se sobrescribe ningún
// cumpleaños ya guardado salvo que también se pase --overwrite.
//
// Requisitos (instalar si faltan, una sola vez):
//   npm install xlsx
// (firebase-admin y el archivo de credenciales ./centro-operativo-cpsl-65ad52160f45.json
// ya se usan en los otros scripts de este repo — audit_roster.mjs, fix_andres_gomez_role.mjs)
//
// Uso (se puede pasar más de un archivo a la vez; duplicados de correo entre
// archivos se procesan solo una vez, con el primero que aparezca):
//   node scripts/importBirthdays.mjs "C:\Users\josem\Downloads\Hojas de Cálculo\DIRECTORIO GLOBAL .xlsx" "C:\Users\josem\Downloads\Hojas de Cálculo\DIRECTORIO GLOBAL _1.xlsx" "C:\Users\josem\Downloads\Hojas de Cálculo\DIRECTORIO GLOBAL _2.xlsx" "C:\Users\josem\Downloads\QT Global.xlsx"
//   node scripts/importBirthdays.mjs "...\DIRECTORIO GLOBAL .xlsx" --write
//   node scripts/importBirthdays.mjs "...\DIRECTORIO GLOBAL .xlsx" --write --overwrite

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import xlsx from 'xlsx';

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const OVERWRITE = args.includes('--overwrite');
const filePaths = args.filter(a => !a.startsWith('--'));

if (filePaths.length === 0) {
  console.error('Uso: node scripts/importBirthdays.mjs <ruta al DIRECTORIO GLOBAL .xlsx> [más rutas...] [--write] [--overwrite]');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const normEmail = (e) => (e || '').toString().trim().toLowerCase();

// Nombres de encabezado reconocidos (case-insensitive), para no asumir una sola
// grafía y para funcionar aunque una hoja use un nombre de columna ligeramente
// distinto (ej. "Email CREARPSL.NET" en vez de "Correo").
// (28/08/2026) Se agrega "correo electrónico" para reconocer QT Global.xlsx
// (confirmado por inspección directa: header real "Correo Electrónico", sin el
// sufijo "1" que sí trae la hoja en vivo de QT vista por WebFetch) — el mismo
// layout que "Fecha de Nacimiento" para el cumpleaños.
const EMAIL_HEADER_NAMES = ['correo', 'email crearpsl.net', 'email', 'correo electrónico 1', 'correo electrónico'];
const BIRTHDAY_HEADER_NAMES = ['cumpleaños', 'cumpleanos', 'fecha de nacimiento'];
// Columnas que NUNCA se deben leer, aunque existan en la hoja.
const FORBIDDEN_HEADER_NAMES = ['contraseña temporal', 'contrasena temporal', 'password'];

function findHeaderIndex(headerRow, candidates) {
  for (let i = 0; i < headerRow.length; i++) {
    const h = (headerRow[i] || '').toString().trim().toLowerCase();
    if (candidates.includes(h)) return i;
  }
  return -1;
}

// Convierte lo que venga en la celda de Cumpleaños (Date de Excel, string, etc.)
// al formato YYYY-MM-DD que usa el <input type="date"> del Panel Super Admin.
// Si no se puede interpretar con certeza, se descarta esa fila (nunca se inventa
// una fecha aproximada).
function toIsoDate(cell) {
  if (cell instanceof Date && !isNaN(cell.getTime())) {
    const y = cell.getFullYear();
    const m = String(cell.getMonth() + 1).padStart(2, '0');
    const d = String(cell.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof cell === 'string') {
    const s = cell.trim();
    // dd/mm/yyyy o dd-mm-yyyy
    const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m1) {
      const [, d, mo, y] = m1;
      return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // yyyy-mm-dd ya viene bien
    const m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m2) {
      const [, y, mo, d] = m2;
      return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  return null;
}

function extractFromWorkbook(filePath) {
  // cellDates:true para que las fechas lleguen como objetos Date en vez de
  // números seriales de Excel — así toIsoDate() no tiene que reinterpretar
  // el sistema de fechas de Excel a ciegas.
  const wb = xlsx.readFile(filePath, { cellDates: true });
  const found = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    if (rows.length < 2) continue;

    const headerRow = rows[0];
    const emailIdx = findHeaderIndex(headerRow, EMAIL_HEADER_NAMES);
    const birthdayIdx = findHeaderIndex(headerRow, BIRTHDAY_HEADER_NAMES);
    const forbiddenIdx = findHeaderIndex(headerRow, FORBIDDEN_HEADER_NAMES);

    if (emailIdx === -1 || birthdayIdx === -1) {
      console.log(`  [${sheetName}] sin columnas de correo+cumpleaños reconocibles — se omite.`);
      continue;
    }
    if (forbiddenIdx !== -1) {
      console.log(`  [${sheetName}] tiene columna de contraseña (índice ${forbiddenIdx}) — se ignora por completo, no se lee.`);
    }

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const email = normEmail(row[emailIdx]);
      const iso = toIsoDate(row[birthdayIdx]);
      if (!email || !iso) continue;
      found.push({ email, cumpleanos: iso, sourceSheet: sheetName, sourceFile: filePath });
    }
  }
  return found;
}

async function loadFirestoreEmailIndex() {
  // Igual que getAllCompanyUsers(): un registro puede tener el correo en
  // "email", "correo", "corporateEmail" o "personalEmail".
  const index = new Map(); // normEmail -> { collection, id, existingCumpleanos }
  for (const col of ['users', 'qt_directory']) {
    const snap = await db.collection(col).get();
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const keys = new Set(
        [d.email, d.correo, d.corporateEmail, d.personalEmail]
          .map(normEmail)
          .filter(Boolean)
      );
      for (const k of keys) {
        if (!index.has(k)) {
          index.set(k, { collection: col, id: docSnap.id, existingCumpleanos: d.cumpleanos || null });
        }
      }
    });
  }
  return index;
}

async function run() {
  console.log(`Modo: ${WRITE ? 'ESCRITURA' : 'DRY-RUN (solo preview, no se escribe nada)'}${WRITE && OVERWRITE ? ' + sobrescribir existentes' : ''}\n`);

  let allRows = [];
  for (const fp of filePaths) {
    console.log(`Leyendo: ${fp}`);
    const rows = extractFromWorkbook(fp);
    console.log(`  -> ${rows.length} filas con correo+cumpleaños válidos.\n`);
    allRows = allRows.concat(rows);
  }

  if (allRows.length === 0) {
    console.log('No se encontraron filas con correo + cumpleaños en ningún archivo. No hay nada que hacer.');
    process.exit(0);
  }

  console.log('Consultando "users" y "qt_directory" en Firestore para hacer el cruce por correo...\n');
  const emailIndex = await loadFirestoreEmailIndex();

  let matched = 0, skippedNoMatch = 0, skippedAlreadySet = 0, toWrite = [];
  const seenEmails = new Set();

  for (const row of allRows) {
    if (seenEmails.has(row.email)) continue; // evita procesar el mismo correo dos veces si aparece en varios archivos/hojas
    seenEmails.add(row.email);

    const target = emailIndex.get(row.email);
    if (!target) {
      skippedNoMatch++;
      continue;
    }
    matched++;

    if (target.existingCumpleanos && !OVERWRITE) {
      if (target.existingCumpleanos !== row.cumpleanos) {
        console.log(`  [DIFERENCIA, no se toca sin --overwrite] ${row.email}: Firestore ya tiene "${target.existingCumpleanos}", el Excel dice "${row.cumpleanos}" (${row.sourceSheet} de ${row.sourceFile})`);
      }
      skippedAlreadySet++;
      continue;
    }

    toWrite.push({ ...row, collection: target.collection, id: target.id });
  }

  console.log(`\nResumen: ${allRows.length} filas leídas, ${matched} correos encontrados en Firestore, ${skippedNoMatch} sin match, ${skippedAlreadySet} ya tenían cumpleaños (no tocados).`);
  console.log(`${toWrite.length} registros ${WRITE ? 'se van a escribir' : 'SE ESCRIBIRÍAN si corres con --write'}:\n`);

  for (const w of toWrite) {
    console.log(`  ${w.email} -> ${w.collection}/${w.id}: cumpleanos = "${w.cumpleanos}"`);
  }

  if (!WRITE) {
    console.log('\nDry-run terminado. Nada fue escrito en Firestore. Vuelve a correr con --write para aplicar.');
    process.exit(0);
  }

  console.log('\nEscribiendo en Firestore...');
  let written = 0;
  for (const w of toWrite) {
    await db.collection(w.collection).doc(w.id).update({ cumpleanos: w.cumpleanos });
    written++;
  }
  console.log(`\nListo. ${written} documentos actualizados con su cumpleaños.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Error importando cumpleaños:', err);
  process.exit(1);
});
