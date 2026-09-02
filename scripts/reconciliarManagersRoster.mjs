// scripts/reconciliarManagersRoster.mjs
//
// CONTEXTO (02/09/2026): José descargó
// "Managers en juego Quito, Guayaquil, Lima, Cuenca, Medellín y CDMX.xlsx"
// para que la info de managers_directory sea más fiel, aclarando que "algunos
// entrenadores de llamadas YA actualizaron su info directo en la nube" — por
// eso, ante una diferencia entre el Excel y la nube, GANA LA NUBE (decisión
// explícita de José). Este script NUNCA sobrescribe un campo que ya tiene
// valor en managers_directory — solo propone RELLENAR campos que están
// vacíos/ausentes ahí, usando el Excel como respaldo.
//
// INSPECCIÓN REAL (02/09/2026): el roster tiene una sola hoja "Hoja1",
// columnas reales (fila 1): Orden | Nombre y Apellido | Rol |
// Número de teléfono | Número de Equipo | Nombre de Equipo |
// Tiene entrenador de llamadas? | Entrenador | Coordinador MJ | Sede |
// GRADUADO | DESERTOR. managers_directory (mismos nombres de campo que
// src/data/managersData.js, confirmado por lectura directa del código): id,
// nombre, rol, telefono, numEquipo, equipo, tieneEntrenador, entrenador,
// coordinador, sede, estado ('Activo' | 'Graduado' | 'Desertor').
//
// CÓMO EMPAREJA: por nombre normalizado (minúsculas, sin tildes, espacios
// colapsados). Un nombre del Excel que no calza EXACTO así con ningún manager
// de la nube se reporta como "no encontrado en la nube" — nunca se crea un
// manager nuevo automáticamente (evita duplicados por coincidencia parcial
// mal hecha). Revísalos a mano.
//
// MODO SEGURO: este script es de SOLO LECTURA — no escribe nada en Firestore,
// solo imprime un reporte y escribe reconciliacion_managers_propuesta.csv con
// los rellenos propuestos, para que José los revise (y aplique manualmente
// desde el botón "Editar Integrante" que ya existe en la app, o confirme que
// se puede armar un --write más adelante) antes de tocar la base real.
//
// Uso:
//   node scripts/reconciliarManagersRoster.mjs "C:\...\Managers en juego ....xlsx"
// (si no pasas la ruta, busca ese nombre exacto en la carpeta actual)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import xlsx from 'xlsx';

const rosterPath = process.argv[2] || 'Managers en juego Quito, Guayaquil, Lima, Cuenca, Medellín y CDMX.xlsx';
if (!existsSync(rosterPath)) {
  console.error(`❌ No encuentro el archivo: ${rosterPath}`);
  process.exit(1);
}

function normalizeName(name) {
  return String(name || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

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

function estadoDesdeRoster(row, idxGraduado, idxDesertor) {
  const desertor = String(row[idxDesertor] || '').trim().toUpperCase();
  const graduado = String(row[idxGraduado] || '').trim().toUpperCase();
  if (desertor === 'DESERTOR') return 'Desertor';
  if (graduado === 'GRADUADO') return 'Graduado';
  return 'Activo';
}

console.log('📂 Leyendo roster:', rosterPath);
const wb = xlsx.readFile(rosterPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });
const header = rows[0].map(h => String(h || '').trim());

const idx = {
  nombre: header.findIndex(h => h.toLowerCase().startsWith('nombre y apellido')),
  rol: header.findIndex(h => h.toLowerCase() === 'rol'),
  telefono: header.findIndex(h => h.toLowerCase().startsWith('número de teléfono') || h.toLowerCase().startsWith('numero de telefono')),
  numEquipo: header.findIndex(h => h.toLowerCase().startsWith('número de equipo') || h.toLowerCase().startsWith('numero de equipo')),
  equipo: header.findIndex(h => h.toLowerCase().startsWith('nombre de equipo')),
  entrenador: header.findIndex(h => h.toLowerCase() === 'entrenador'),
  coordinador: header.findIndex(h => h.toLowerCase().startsWith('coordinador mj')),
  sede: header.findIndex(h => h.toLowerCase() === 'sede'),
  graduado: header.findIndex(h => h.toLowerCase() === 'graduado'),
  desertor: header.findIndex(h => h.toLowerCase() === 'desertor'),
};
const faltantes = Object.entries(idx).filter(([, v]) => v === -1).map(([k]) => k);
if (idx.nombre === -1) {
  console.error('❌ No encuentro la columna "Nombre y Apellido" en el roster. No continúo.');
  process.exit(1);
}
if (faltantes.length > 0) {
  console.log(`⚠️  Columnas no encontradas en el roster (se ignoran esos campos al rellenar): ${faltantes.join(', ')}`);
}

// Índice del roster por nombre normalizado — reporta duplicados de nombre
// (misma persona repetida en el Excel), no se adivina cuál fila es la buena.
const rosterPorNombre = new Map();
const rosterDuplicados = new Set();
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (!row || !row[idx.nombre]) continue;
  const key = normalizeName(row[idx.nombre]);
  if (rosterPorNombre.has(key)) rosterDuplicados.add(key);
  rosterPorNombre.set(key, row);
}
if (rosterDuplicados.size > 0) {
  console.log(`⚠️  ${rosterDuplicados.size} nombres aparecen más de una vez en el roster — se usa la ÚLTIMA fila de cada uno, revisa si son la misma persona o dos distintas: ${[...rosterDuplicados].slice(0, 10).join(', ')}${rosterDuplicados.size > 10 ? '...' : ''}`);
}

// --- Leer managers_directory REAL (solo lectura) ---
const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

console.log('\n📡 Leyendo managers_directory (solo lectura)...');
const snap = await db.collection('managers_directory').get();
const nubeManagers = [];
snap.forEach(doc => nubeManagers.push({ id: doc.id, ...doc.data() }));
console.log(`✅ ${nubeManagers.length} managers leídos de la nube.`);

const nubePorNombre = new Map();
nubeManagers.forEach(m => nubePorNombre.set(normalizeName(m.nombre), m));

const CAMPOS = ['telefono', 'numEquipo', 'equipo', 'entrenador', 'coordinador', 'sede'];
const propuestas = []; // { id, nombre, campo, valorNube, valorExcel }
const noEncontradosEnNube = [];

for (const [nombreNorm, row] of rosterPorNombre.entries()) {
  const nube = nubePorNombre.get(nombreNorm);
  if (!nube) {
    noEncontradosEnNube.push(row[idx.nombre]);
    continue;
  }
  const excelValues = {
    telefono: idx.telefono !== -1 ? row[idx.telefono] : null,
    numEquipo: idx.numEquipo !== -1 ? row[idx.numEquipo] : null,
    equipo: idx.equipo !== -1 ? row[idx.equipo] : null,
    entrenador: idx.entrenador !== -1 ? row[idx.entrenador] : null,
    coordinador: idx.coordinador !== -1 ? row[idx.coordinador] : null,
    sede: idx.sede !== -1 ? normalizeSede(row[idx.sede]) : null,
  };
  for (const campo of CAMPOS) {
    const valorNube = nube[campo];
    const valorExcel = excelValues[campo];
    const nubeVacia = valorNube === undefined || valorNube === null || String(valorNube).trim() === '';
    if (nubeVacia && valorExcel != null && String(valorExcel).trim() !== '') {
      propuestas.push({ id: nube.id, nombre: nube.nombre, campo, valorNube: valorNube ?? '(vacío)', valorExcel });
    }
  }
}

console.log(`\n✅ ${propuestas.length} campos vacíos en la nube que el Excel podría rellenar (nunca sobrescribe algo que ya tiene valor).`);
console.log(`⚠️  ${noEncontradosEnNube.length} nombres del Excel que NO encontré en managers_directory (posibles faltantes, o el nombre no calza exacto) — muestra de hasta 15:`);
noEncontradosEnNube.slice(0, 15).forEach(n => console.log(`   ${n}`));

const csvLines = ['id,nombre,campo,valorActualEnNube,valorPropuestoDelExcel'];
propuestas.forEach(p => csvLines.push(`"${p.id}","${p.nombre}","${p.campo}","${String(p.valorNube).replace(/"/g, "'")}","${String(p.valorExcel).replace(/"/g, "'")}"`));
writeFileSync('reconciliacion_managers_propuesta.csv', csvLines.join('\n'), 'utf8');

const csvFaltantes = ['nombreEnExcelNoEncontradoEnNube'];
noEncontradosEnNube.forEach(n => csvFaltantes.push(`"${String(n).replace(/"/g, "'")}"`));
writeFileSync('reconciliacion_managers_no_encontrados.csv', csvFaltantes.join('\n'), 'utf8');

console.log('\n📄 Reportes guardados: reconciliacion_managers_propuesta.csv y reconciliacion_managers_no_encontrados.csv');
console.log('Este script NO escribió nada en Firestore. Revisa los CSV con José antes de aplicar cualquier relleno (a mano desde "Editar Integrante", o pídeme un --write después de revisarlos).');
