/**
 * Motor de sincronizacion: Google Sheets -> Firestore
 *
 * Sincroniza EN UN SOLO SENTIDO (la hoja de Google es la fuente de verdad,
 * nunca se escribe de vuelta a la hoja):
 *
 *   1) Hoja "Managers en juego ..." (Hoja1)  -> coleccion Firestore `managers_directory`
 *   2) Hoja "LLAMADOS MANAGERS" (pestañas mensuales tipo AGOSTO2026, JULIO2026, ...)
 *      -> coleccion Firestore `llamados_directory`
 *
 * Es IDEMPOTENTE: se puede correr tantas veces como se quiera sin duplicar
 * registros ni pisar managers que no coincidan por nombre.
 *
 * Fuente de los mapeos de columnas: verificados a mano comparando la hoja
 * con INITIAL_MANAGERS / INITIAL_LLAMADOS ya existentes en
 * src/data/managersData.js (esos catalogos ya habian sido transcritos de
 * estas mismas hojas en algun momento anterior de este proyecto).
 *
 * IMPORTANTE - fuera de alcance a proposito (no se toca, para no inventar
 * estructura que no ha sido verificada):
 *   - La pestaña "LLamadas" (50 columnas) de la Hoja de llamados.
 *   - La mini-tabla de la derecha (columnas Sede/Monto/COACH/ciudades) que
 *     aparece junto a la tabla principal en cada pestaña mensual.
 *   Si esos datos tambien deben sincronizarse, hay que definir su
 *   significado exacto antes de escribirlo (no esta documentado en ningun
 *   lado que se haya revisado).
 */

import { google } from 'googleapis';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import { INITIAL_MANAGERS, INITIAL_LLAMADOS } from './src/data/managersData.js';

const KEY_FILE = './centro-operativo-cpsl-65ad52160f45.json';

const SHEET_MANAGERS_ID = '1KF58QXAiIk4KP_9G2aiAM3ERVoptcqKlIraszNKq2Ow';
const SHEET_MANAGERS_TAB_GID = '1416300654'; // "Hoja1"

const SHEET_LLAMADOS_ID = '1lWAHh1PSAKu9eU6DOBxZExrHMbCYc3f2Sr8GdghNxD0';
// Solo pestañas mensuales con este patron (MES + año de 4 digitos), p.ej.
// AGOSTO2026, JULIO2026, ENERO2026... No se tocan pestañas sin año
// (Enero, Febrero, ...), ni pestañas de utilidad (Hoja1, MIKE, KPIs, etc.)
const MONTH_TAB_PATTERN = /^[A-ZÑÁÉÍÓÚ]+20\d{2}$/i;

const serviceAccount = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheetsApi = google.sheets({ version: 'v4', auth });

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------

function normalizeName(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar tildes
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// Particulas que en español van en minuscula dentro de un nombre propio
// (excepto si son la primera palabra), p.ej. "Juan de la Cruz".
const LOWERCASE_PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e']);

// Convierte un nombre a formato "Nombre Propio" sin importar como este
// escrito en el origen (TODO MAYUSCULAS, todo minusculas, mezclado...).
function toProperCase(s) {
  const raw = String(s || '').trim().replace(/\s+/g, ' ');
  if (!raw) return '';
  return raw
    .toLowerCase()
    .split(' ')
    .map((word, i) => {
      if (i > 0 && LOWERCASE_PARTICLES.has(word)) return word;
      // Capitaliza cada segmento separado por guion o apostrofe
      // (ej. "maria-jose" -> "Maria-Jose", "o'brien" -> "O'Brien").
      return word
        .split(/([-'])/)
        .map((seg) => (seg === '-' || seg === "'" ? seg : seg.charAt(0).toUpperCase() + seg.slice(1)))
        .join('');
    })
    .join(' ');
}

// Llave compuesta para hacer coincidir un manager del sheet con uno ya
// existente: nombre + equipo. Un mismo manager puede aparecer legitimamente
// en mas de un equipo — en ese caso NO deben tratarse como el mismo
// registro, solo se deduplica si nombre Y equipo coinciden.
function managerMatchKey(nombre, equipo) {
  return `${normalizeName(nombre)}||${normalizeName(equipo)}`;
}

function slug(s) {
  return normalizeName(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sin-dato';
}

function toNumber(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// Convierte una fila de valores (array) + fila de encabezados en un objeto
// { encabezado: valor }, sin importar el orden de columnas.
function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    if (h) obj[h.trim()] = row[i] !== undefined ? row[i] : '';
  });
  return obj;
}

function findHeaderIndexMap(headers) {
  // Mapa normalizado de encabezado -> indice, para tolerar variaciones de
  // mayusculas/espacios entre pestañas.
  const map = {};
  headers.forEach((h, i) => {
    if (h) map[normalizeName(h)] = i;
  });
  return map;
}

// ---------------------------------------------------------------------
// 1) MANAGERS: Hoja "Managers en juego..." -> managers_directory
// ---------------------------------------------------------------------

async function syncManagers() {
  console.log('\n=== Sincronizando MANAGERS (Hoja: Managers en juego...) ===');

  // 1. Estado actual "efectivo" (igual que lo calcula la app: catalogo fijo
  //    + lo que ya haya en Firestore, Firestore gana si el id coincide).
  const existingSnap = await db.collection('managers_directory').get();
  const firestoreById = new Map();
  existingSnap.forEach((doc) => firestoreById.set(String(doc.id), { id: doc.id, ...doc.data() }));

  const effectiveById = new Map();
  INITIAL_MANAGERS.forEach((m) => {
    const fromFs = firestoreById.get(String(m.id));
    effectiveById.set(String(m.id), fromFs ? { ...m, ...fromFs } : m);
  });
  firestoreById.forEach((m, id) => {
    if (!effectiveById.has(String(id))) effectiveById.set(String(id), m);
  });

  // Llave = nombre+equipo -> id. Un manager en 2 equipos distintos genera 2
  // llaves distintas apuntando a 2 documentos distintos (no se fusionan).
  const keyToId = new Map();
  let maxId = 0;
  effectiveById.forEach((m, id) => {
    const numId = Number(id);
    if (Number.isFinite(numId) && numId > maxId) maxId = numId;
    if (m.nombre) keyToId.set(managerMatchKey(m.nombre, m.equipo), id);
  });

  // 2. Leer la hoja.
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId: SHEET_MANAGERS_ID });
  const sheetMeta = meta.data.sheets.find((s) => String(s.properties.sheetId) === SHEET_MANAGERS_TAB_GID);
  if (!sheetMeta) throw new Error(`No se encontro la pestaña gid=${SHEET_MANAGERS_TAB_GID} en la hoja de managers.`);
  const title = sheetMeta.properties.title;

  const res = await sheetsApi.spreadsheets.values.get({ spreadsheetId: SHEET_MANAGERS_ID, range: `'${title}'!A1:Z2000` });
  const rows = res.data.values || [];
  if (rows.length < 2) {
    console.log('Hoja de managers vacia o sin datos, no se hace nada.');
    return { creados: 0, actualizados: 0, sinNombre: 0 };
  }
  const headers = rows[0];
  const idx = findHeaderIndexMap(headers);

  const col = {
    nombre: idx['nombre y apellido'],
    rol: idx['rol'],
    telefono: idx['numero de telefono'],
    numEquipo: idx['numero de equipo'],
    equipo: idx['nombre de equipo'],
    tieneEntrenador: idx['tiene entrenador de llamadas?'],
    entrenador: idx['entrenador'],
    coordinador: idx['coordinador mj'],
    sede: idx['sede'],
    graduado: idx['graduado'],
    desertor: idx['desertor'],
  };

  let creados = 0;
  let actualizados = 0;
  let sinNombre = 0;
  let batch = db.batch();
  let batchCount = 0;

  const seenKeys = new Map(); // deteccion de filas duplicadas EXACTAS dentro de la misma hoja (mismo nombre+equipo repetido)
  let duplicadosEnHoja = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const nombreRaw = (col.nombre !== undefined ? row[col.nombre] : '')?.toString().trim();
    if (!nombreRaw) { sinNombre++; continue; }
    const nombre = toProperCase(nombreRaw); // nombre normalizado a formato "Nombre Propio"
    const equipoRaw = col.equipo !== undefined ? (row[col.equipo] || '').toString().trim() : '';

    const key = managerMatchKey(nombreRaw, equipoRaw);
    if (seenKeys.has(key)) {
      duplicadosEnHoja++;
      console.log(`  AVISO: fila ${r + 1} repite a "${nombre}" en el mismo equipo "${equipoRaw}" (ya vista en fila ${seenKeys.get(key) + 1}) — se conserva la ultima version.`);
    }
    seenKeys.set(key, r);

    let docId = keyToId.get(key);
    let isNew = false;
    if (!docId) {
      maxId += 1;
      docId = String(maxId);
      keyToId.set(key, docId);
      isNew = true;
    }

    const desertorVal = col.desertor !== undefined ? (row[col.desertor] || '').toString().trim() : '';
    const graduadoVal = col.graduado !== undefined ? (row[col.graduado] || '').toString().trim() : '';
    let estado = '';
    if (desertorVal) estado = 'Desertor';
    else if (graduadoVal) estado = 'Graduado';

    const data = {
      id: Number.isFinite(Number(docId)) ? Number(docId) : docId,
      nombre,
      rol: col.rol !== undefined ? (row[col.rol] || '').toString().trim() : '',
      telefono: col.telefono !== undefined ? (row[col.telefono] || '').toString().trim() : '',
      numEquipo: col.numEquipo !== undefined ? toNumber(row[col.numEquipo]) : null,
      equipo: equipoRaw,
      tieneEntrenador: col.tieneEntrenador !== undefined ? (row[col.tieneEntrenador] || '').toString().trim() : '',
      entrenador: col.entrenador !== undefined ? (row[col.entrenador] || '').toString().trim() : '',
      coordinador: col.coordinador !== undefined ? (row[col.coordinador] || '').toString().trim() : '',
      sede: col.sede !== undefined ? (row[col.sede] || '').toString().trim() : '',
      estado,
      _syncSource: 'sheet:managers_en_juego',
      _syncUpdatedAt: new Date().toISOString(),
    };

    batch.set(db.collection('managers_directory').doc(String(docId)), data, { merge: true });
    batchCount++;
    if (isNew) creados++; else actualizados++;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }
  if (batchCount > 0) await batch.commit();

  console.log(`Managers -> creados: ${creados}, actualizados: ${actualizados}, filas sin nombre (omitidas): ${sinNombre}, filas duplicadas exactas (mismo nombre+equipo repetido en la hoja): ${duplicadosEnHoja}`);
  return { creados, actualizados, sinNombre, duplicadosEnHoja };
}

// ---------------------------------------------------------------------
// 2) LLAMADOS: pestañas mensuales -> llamados_directory
// ---------------------------------------------------------------------

async function syncLlamados() {
  console.log('\n=== Sincronizando LLAMADOS (Hoja: LLAMADOS MANAGERS) ===');

  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId: SHEET_LLAMADOS_ID });
  const monthTabs = meta.data.sheets
    .map((s) => s.properties.title)
    .filter((title) => MONTH_TAB_PATTERN.test(title.trim()));

  console.log(`Pestañas mensuales detectadas (${monthTabs.length}):`, monthTabs.join(', '));

  let totalCreados = 0;
  let totalActualizados = 0;
  let totalSinDatos = 0;

  for (const mes of monthTabs) {
    const res = await sheetsApi.spreadsheets.values.get({ spreadsheetId: SHEET_LLAMADOS_ID, range: `'${mes}'!A1:F2000` });
    const rows = res.data.values || [];
    if (rows.length < 2) continue;
    const headers = rows[0];
    const idx = findHeaderIndexMap(headers);

    const col = {
      entrenador: idx['entrenador'],
      manager: idx['manager'],
      sede: idx['sede'],
      equipo: idx['equipo'],
      tarifa: idx['tarifa'],
    };

    if (col.entrenador === undefined || col.manager === undefined) {
      console.log(`  [${mes}] encabezados inesperados (${headers.join(' | ')}), pestaña omitida.`);
      continue;
    }

    let batch = db.batch();
    let batchCount = 0;
    let creadosMes = 0;
    let actualizadosMes = 0;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const entrenador = (row[col.entrenador] || '').toString().trim();
      const manager = (row[col.manager] || '').toString().trim();
      if (!entrenador && !manager) { totalSinDatos++; continue; }

      const docId = `${mes}__${slug(entrenador)}__${slug(manager)}__${r}`;
      const data = {
        mes,
        entrenador,
        manager,
        sede: col.sede !== undefined ? (row[col.sede] || '').toString().trim() : '',
        equipo: col.equipo !== undefined ? toNumber(row[col.equipo]) : null,
        tarifa: col.tarifa !== undefined ? toNumber(row[col.tarifa]) : null,
        _syncSource: 'sheet:llamados_managers',
        _syncUpdatedAt: new Date().toISOString(),
      };

      const ref = db.collection('llamados_directory').doc(docId);
      batch.set(ref, data, { merge: true });
      batchCount++;
      creadosMes++; // no distinguimos creado/actualizado aqui: el id ya es idempotente (mismo id -> mismo registro)

      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
    if (batchCount > 0) await batch.commit();
    totalCreados += creadosMes;
    console.log(`  [${mes}] ${creadosMes} registros sincronizados.`);
  }

  console.log(`Llamados -> total registros sincronizados: ${totalCreados}, filas vacias omitidas: ${totalSinDatos}`);
  return { totalCreados, totalSinDatos };
}

// ---------------------------------------------------------------------

async function run() {
  const managersResult = await syncManagers();
  const llamadosResult = await syncLlamados();
  console.log('\n=== Resumen ===');
  console.log(JSON.stringify({ managersResult, llamadosResult }, null, 2));
}

run().catch((e) => {
  console.error('ERROR FATAL en sync_managers_llamados.mjs:', e);
  process.exit(1);
});
