// scripts/analizarLlamadasHistoricas.mjs
//
// CONTEXTO (02/09/2026): para la pestaña de Liquidación de Entrenadores ($400 USD
// por equipo al llegar a 7 llamadas grupales), José pidió usar los conteos
// históricos REALES en vez de empezar todos los equipos desde cero. Compartió dos
// archivos de su Descargas:
//   "Managers en juego Quito, Guayaquil, Lima, Cuenca, Medellín y CDMX.xlsx"
//   "LLAMADOS MANAGERS.xlsx"
//
// INSPECCIÓN REAL (02/09/2026, vía openpyxl, antes de escribir este script):
//   - El roster ("Managers en juego...") tiene una sola hoja "Hoja1" con columnas
//     (fila 1, encabezados reales): Orden | Nombre y Apellido | Rol |
//     Número de teléfono | Número de Equipo | Nombre de Equipo |
//     Tiene entrenador de llamadas? | Entrenador | Coordinador MJ | Sede |
//     GRADUADO | DESERTOR — 1019 filas.
//   - "LLAMADOS MANAGERS.xlsx" tiene 43 pestañas, mantenidas a mano, con
//     estructura DISTINTA en cada una (confirmado real, no supuesto): algunas
//     pestañas mensuales con formato "MESAAAA" (ENERO2026, FEBRERO2026, ...,
//     AGOSTO2026) tienen encabezados Entrenador/Manager/SEDE/EQUIPO/TARIFA, pero
//     la columna "EQUIPO" a veces trae el número real del equipo (ej. 15, 3, 19,
//     32 en JULIO2026) y a veces un valor que NO coincide con ningún equipo real
//     del roster (ej. 120 en AGOSTO2026 fila 2) — probablemente una tarifa u otro
//     dato desplazado de columna, no un número de equipo. Hay además pestañas más
//     viejas sin año en el nombre ("Enero", "Julio", "MIKE", etc.) con estructura
//     totalmente distinta (nombres de managers en columnas, no filas) — este
//     script las IGNORA a propósito (no se puede leer su estructura sin
//     inventar), y las reporta como "omitidas" al final.
//
// QUÉ HACE ESTE SCRIPT (y qué NO hace):
//   1. Lee el roster y arma un índice: número de equipo -> {nombre de equipo,
//      sede} (reporta colisiones si un número de equipo aparece con más de un
//      nombre/sede distinto — no adivina cuál es la correcta).
//   2. Recorre SOLO las pestañas con formato MESAAAA reconocible (regex
//      MES+año de 4 dígitos). Para cada una, busca los encabezados
//      "Entrenador", "Manager", "SEDE", "EQUIPO" POR NOMBRE (no por posición
//      fija) — si una pestaña no tiene esos 4 encabezados, la omite y la
//      reporta, no inventa columnas.
//   3. Para cada fila con un número de equipo que SÍ resuelve en el índice del
//      roster, registra "este equipo tuvo actividad en este mes". Cuenta,
//      por equipo, en cuántos meses distintos aparece — ese es el conteo
//      PROPUESTO de llamadas grupales históricas (mes con actividad ≈ 1
//      llamada grupal ese mes, criterio que José confirmó explícitamente).
//   4. Lee (con permiso de solo lectura) la colección real
//      llamadas_grupales_historial de Firestore, para mostrar cuántas
//      llamadas YA están registradas ahí por equipo — así José puede decidir
//      caso por caso si el conteo del Excel debe sumarse o no (evita
//      contar dos veces las llamadas que los entrenadores ya registraron
//      directo en la app).
//   5. Imprime una tabla y también escribe llamadas_historicas_propuesta.csv.
//
// MODO SEGURO: este script es 100% de SOLO LECTURA — no escribe nada en
// Firestore ni en ningún archivo salvo el CSV de reporte. Es el PASO 1 de 2:
// primero José revisa el CSV/la tabla, y solo después (si los números
// cuadran) se escribiría un script separado --write para sembrar los
// documentos en llamadas_grupales_historial — ese script aparte no se ha
// escrito todavía, a propósito, hasta tener esta revisión.
//
// Requisitos: node scripts/analizarLlamadasHistoricas.mjs, con
// ./centro-operativo-cpsl-65ad52160f45.json en la raíz del repo (mismo
// archivo que ya usan importBirthdays.mjs / exportUsersList.mjs).
//
// Uso:
//   node scripts/analizarLlamadasHistoricas.mjs \
//     "C:\Users\josem\Downloads\Managers en juego Quito, Guayaquil, Lima, Cuenca, Medellín y CDMX.xlsx" \
//     "C:\Users\josem\Downloads\LLAMADOS MANAGERS.xlsx"
//
// (si no pasas rutas, busca esos 2 nombres exactos en la carpeta actual)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import xlsx from 'xlsx';

const rosterPath = process.argv[2] || 'Managers en juego Quito, Guayaquil, Lima, Cuenca, Medellín y CDMX.xlsx';
const llamadosPath = process.argv[3] || 'LLAMADOS MANAGERS.xlsx';

if (!existsSync(rosterPath)) {
  console.error(`❌ No encuentro el archivo del roster: ${rosterPath}`);
  process.exit(1);
}
if (!existsSync(llamadosPath)) {
  console.error(`❌ No encuentro el archivo de llamados: ${llamadosPath}`);
  process.exit(1);
}

// Mismo criterio de normalización de sede que usa la app (src/data/usersData.js)
// — se copia aquí a propósito, NUNCA se importa código de src/ en un script node
// suelto para no arrastrar dependencias de Vite/React.
function normalizeSede(sede) {
  if (!sede) return 'Sede Global';
  const s = String(sede).trim();
  if (s === 'MED' || s.toLowerCase().includes('medell')) return 'Medellín';
  if (s === 'LIM' || s.toLowerCase().includes('lima')) return 'Lima';
  if (s === 'CUE' || s.toLowerCase().includes('cuenca')) return 'Cuenca';
  if (s === 'GYE' || s.toLowerCase().includes('guayaquil')) return 'Guayaquil';
  if (s.toLowerCase().includes('quito')) return 'Quito';
  if (s.toLowerCase().includes('mexico') || s.toLowerCase().includes('méxico') || s.toLowerCase().includes('cdmx')) return 'México';
  return s;
}

function findCol(headerRow, candidates) {
  for (let c = 0; c < headerRow.length; c++) {
    const h = String(headerRow[c] || '').trim().toLowerCase();
    if (candidates.some(cand => h === cand.toLowerCase())) return c;
  }
  return -1;
}

// --- 1. Roster: número de equipo -> {nombre, sede} ---
console.log('📂 Leyendo roster:', rosterPath);
const rosterWb = xlsx.readFile(rosterPath);
const rosterWs = rosterWb.Sheets[rosterWb.SheetNames[0]];
const rosterRows = xlsx.utils.sheet_to_json(rosterWs, { header: 1, defval: null });
const rosterHeader = rosterRows[0].map(h => String(h || '').trim());
const idxNum = rosterHeader.findIndex(h => h.toLowerCase().startsWith('número de equipo') || h.toLowerCase().startsWith('numero de equipo'));
const idxNombreEq = rosterHeader.findIndex(h => h.toLowerCase().startsWith('nombre de equipo'));
const idxSede = rosterHeader.findIndex(h => h.toLowerCase() === 'sede');

if (idxNum === -1 || idxNombreEq === -1 || idxSede === -1) {
  console.error('❌ El roster no tiene las columnas esperadas (Número de Equipo / Nombre de Equipo / Sede). No continúo — revisa el archivo a mano.');
  process.exit(1);
}

// IMPORTANTE (confirmado ejecutando este script contra los archivos reales,
// 02/09/2026): el "Número de Equipo" NO es único en todo el roster — se
// reutiliza por sede (ej. el Equipo #1 es "TRINA MUNAY KI" en Cuenca, "HENKO"
// en Medellín Y "MARDUK AETT" en México, los tres al mismo tiempo). Por eso la
// clave de resolución es SEDE + NÚMERO, nunca el número solo.
const equipoIndex = new Map(); // "sede||num" -> Set de nombres de equipo vistos con esa combinación
for (let r = 1; r < rosterRows.length; r++) {
  const row = rosterRows[r];
  if (!row) continue;
  const num = row[idxNum];
  const nombre = row[idxNombreEq];
  const sede = row[idxSede];
  if (num == null || !nombre || !sede) continue; // sin sede en la fila, no se puede resolver de forma confiable
  const key = `${normalizeSede(sede)}||${Math.trunc(Number(num))}`;
  if (!equipoIndex.has(key)) equipoIndex.set(key, new Set());
  equipoIndex.get(key).add(String(nombre).trim());
}

const colisiones = [...equipoIndex.entries()].filter(([, set]) => set.size > 1);
if (colisiones.length > 0) {
  console.log(`\n⚠️  ${colisiones.length} combinaciones sede+número tienen más de un nombre de equipo en el roster (no se adivina cuál es la correcta, se descartan del conteo):`);
  colisiones.forEach(([key, set]) => console.log(`   ${key.replace('||', ' — Equipo #')}: ${[...set].join('  /  ')}`));
}
// Solo se usan las combinaciones sede+número SIN colisión para resolver filas de llamados.
const equipoResuelto = new Map(); // "sede||num" -> { nombre, sede }
for (const [key, set] of equipoIndex.entries()) {
  if (set.size !== 1) continue;
  const [sede] = key.split('||');
  equipoResuelto.set(key, { nombre: [...set][0], sede });
}
console.log(`✅ ${equipoResuelto.size} combinaciones sede+número resueltas sin ambigüedad de ${equipoIndex.size} totales en el roster.`);

// --- 2. LLAMADOS MANAGERS.xlsx: solo pestañas MESAAAA ---
console.log('\n📂 Leyendo llamados:', llamadosPath);
const llamadosWb = xlsx.readFile(llamadosPath);
const MES_REGEX = /^(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)(\d{4})$/i;

const actividadPorEquipoMes = new Map(); // equipoKey -> Set de "MESAAAA"
const entrenadorPorEquipo = new Map(); // equipoKey -> Set de entrenadores vistos
const omitidas = [];
const noResueltas = [];
let filasResueltas = 0;

for (const sheetName of llamadosWb.SheetNames) {
  const m = sheetName.trim().match(MES_REGEX);
  if (!m) continue; // pestaña con formato no reconocible, se ignora a propósito
  const ws = llamadosWb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });
  if (rows.length === 0) { omitidas.push(`${sheetName} (vacía)`); continue; }
  const header = rows[0].map(h => String(h || '').trim());
  const idxEntrenador = findCol(header, ['Entrenador', 'Entrenador ']);
  const idxSedeL = findCol(header, ['SEDE', 'Sede']);
  const idxEquipo = findCol(header, ['EQUIPO', 'Equipo']);
  if (idxEntrenador === -1 || idxSedeL === -1 || idxEquipo === -1) {
    omitidas.push(`${sheetName} (sin columnas Entrenador/SEDE/EQUIPO reconocibles)`);
    continue;
  }
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const entrenador = row[idxEntrenador];
    const sedeCruda = row[idxSedeL];
    const equipoNum = row[idxEquipo];
    if (!entrenador || equipoNum == null || !sedeCruda) continue;
    if (Number.isNaN(Number(equipoNum))) continue; // ej. AGOSTO2026 donde esta columna trae una tarifa, no un número de equipo real
    const key = `${normalizeSede(sedeCruda)}||${Math.trunc(Number(equipoNum))}`;
    const resuelto = equipoResuelto.get(key);
    if (!resuelto) {
      noResueltas.push({ hoja: sheetName, fila: r + 1, sedeCruda, equipoNumCrudo: equipoNum, entrenador });
      continue;
    }
    const equipoKey = `${resuelto.sede}_${resuelto.nombre}`;
    if (!actividadPorEquipoMes.has(equipoKey)) actividadPorEquipoMes.set(equipoKey, new Set());
    actividadPorEquipoMes.get(equipoKey).add(sheetName.toUpperCase());
    if (!entrenadorPorEquipo.has(equipoKey)) entrenadorPorEquipo.set(equipoKey, new Set());
    entrenadorPorEquipo.get(equipoKey).add(String(entrenador).trim());
    filasResueltas++;
  }
}

console.log(`✅ ${filasResueltas} filas resueltas contra el roster, en ${actividadPorEquipoMes.size} equipos distintos.`);
console.log(`⚠️  ${noResueltas.length} filas con combinación sede+equipo que NO existe (o es ambigua) en el roster — muestra de hasta 15:`);
noResueltas.slice(0, 15).forEach(x => console.log(`   [${x.hoja}] fila ${x.fila}: sede="${x.sedeCruda}" equipo="${x.equipoNumCrudo}" entrenador="${x.entrenador}"`));
if (omitidas.length > 0) {
  console.log(`\nℹ️  Pestañas omitidas (formato no reconocible, no se leyeron): ${omitidas.join(', ')}`);
}

// --- 3. Comparar contra lo que YA existe en Firestore (solo lectura) ---
const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

console.log('\n📡 Leyendo llamadas_grupales_historial (solo lectura)...');
const snap = await db.collection('llamadas_grupales_historial').get();
const yaEnFirestore = new Map(); // equipoKey -> count
snap.forEach(doc => {
  const d = doc.data();
  if (!d.equipoKey) return;
  yaEnFirestore.set(d.equipoKey, (yaEnFirestore.get(d.equipoKey) || 0) + 1);
});

// --- 4. Reporte final ---
const filas = [];
for (const [equipoKey, meses] of actividadPorEquipoMes.entries()) {
  filas.push({
    equipoKey,
    mesesDetectadosExcel: meses.size,
    yaEnFirestore: yaEnFirestore.get(equipoKey) || 0,
    entrenadores: [...(entrenadorPorEquipo.get(equipoKey) || [])].join(' / '),
    meses: [...meses].sort().join(', ')
  });
}
filas.sort((a, b) => b.mesesDetectadosExcel - a.mesesDetectadosExcel);

console.log('\n' + '='.repeat(100));
console.log('RESUMEN — conteo PROPUESTO (revisar antes de sembrar nada en Firestore):');
console.log('='.repeat(100));
filas.forEach(f => {
  console.log(`${f.equipoKey.padEnd(45)} Excel: ${String(f.mesesDetectadosExcel).padStart(2)} meses   Ya en Firestore: ${String(f.yaEnFirestore).padStart(2)}   Entrenador(es): ${f.entrenadores}`);
});

const csvLines = ['equipoKey,mesesDetectadosExcel,yaEnFirestore,entrenadores,meses'];
filas.forEach(f => csvLines.push(`"${f.equipoKey}",${f.mesesDetectadosExcel},${f.yaEnFirestore},"${f.entrenadores}","${f.meses}"`));
writeFileSync('llamadas_historicas_propuesta.csv', csvLines.join('\n'), 'utf8');
console.log('\n📄 Reporte completo guardado en llamadas_historicas_propuesta.csv');
console.log('\nEste script NO escribió nada en Firestore. Revisa el CSV con José antes de decidir cómo sembrar los conteos reales.');
