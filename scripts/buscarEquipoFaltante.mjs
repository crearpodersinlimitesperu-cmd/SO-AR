// scripts/buscarEquipoFaltante.mjs
//
// CONTEXTO (02/09/2026): José reportó "desaparecio el equipo 35 de gye"
// (Guayaquil). No tengo acceso a Firestore en vivo desde este entorno (nunca
// tengo ni debo tener el archivo de credenciales de servicio), así que no
// puedo confirmar por mí mismo si el equipo existe, fue eliminado, o nunca
// existió con ese número — esto es DATO FALTANTE hasta que este script se
// corra contra la base real.
//
// Qué hace: busca en managers_directory (solo lectura) cualquier documento
// cuyo numEquipo coincida con el buscado, sin importar la sede (para detectar
// si el equipo existe pero quedó mal etiquetado en otra sede — recordatorio
// de un hallazgo anterior: los números de equipo se REPITEN entre sedes, no
// son únicos globalmente), y por separado filtra los que además coinciden en
// sede. También busca en llamadas_grupales_historial cualquier registro
// histórico con ese equipoKey, como evidencia de que el equipo SÍ existió
// antes (si managers_directory ya no lo tiene pero el historial sí, eso
// apunta a una eliminación, no a que nunca existió).
//
// MODO SEGURO: solo lectura. No escribe, no actualiza, no borra nada en
// Firestore. Solo imprime en consola.
//
// Uso:
//   node scripts/buscarEquipoFaltante.mjs [numEquipo] [sede]
//   node scripts/buscarEquipoFaltante.mjs 35 Guayaquil        (por defecto)
//   node scripts/buscarEquipoFaltante.mjs 12 Lima

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const numEquipoBuscado = process.argv[2] || '35';
const sedeBuscada = process.argv[3] || 'Guayaquil';

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

const sedeNorm = normalizeSede(sedeBuscada);

const FORBIDDEN_FIELDS = ['password', 'contraseña', 'contrasena', 'contraseñaTemporal', 'temporaryPassword'];
function sinCamposProhibidos(data) {
  const copia = { ...data };
  for (const f of FORBIDDEN_FIELDS) delete copia[f];
  return copia;
}

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

console.log(`\n🔎 Buscando Equipo #${numEquipoBuscado} — sede solicitada: "${sedeBuscada}" (normalizada: "${sedeNorm}")\n`);

// --- 1. managers_directory: cualquier manager cuyo numEquipo coincida ---
console.log('📡 Leyendo managers_directory (solo lectura)...');
const snapManagers = await db.collection('managers_directory').get();
const todosLosManagers = [];
snapManagers.forEach(doc => todosLosManagers.push({ id: doc.id, ...doc.data() }));
console.log(`✅ ${todosLosManagers.length} managers leídos.\n`);

const coincidenNumero = todosLosManagers.filter(m => String(m.numEquipo ?? '').trim() === String(numEquipoBuscado).trim());
const coincidenNumeroYSede = coincidenNumero.filter(m => normalizeSede(m.sede) === sedeNorm);

if (coincidenNumeroYSede.length > 0) {
  console.log(`✅ ENCONTRADO en managers_directory: ${coincidenNumeroYSede.length} manager(es) con Equipo #${numEquipoBuscado} en ${sedeNorm}:`);
  coincidenNumeroYSede.forEach(m => console.log('  ', JSON.stringify(sinCamposProhibidos(m), null, 2)));
} else {
  console.log(`❌ NO encontrado en managers_directory: ningún manager activo tiene Equipo #${numEquipoBuscado} con sede = ${sedeNorm}.`);
}

if (coincidenNumero.length > coincidenNumeroYSede.length) {
  const otrasSedes = coincidenNumero.filter(m => normalizeSede(m.sede) !== sedeNorm);
  console.log(`\n⚠️  Aviso: el número ${numEquipoBuscado} SÍ existe en managers_directory pero en OTRA sede (recuerda: los números de equipo se repiten entre sedes, no son únicos globalmente):`);
  otrasSedes.forEach(m => console.log(`   - ${m.nombre || '(sin nombre)'} | Equipo: ${m.equipo || '(sin nombre de equipo)'} | Sede registrada: ${m.sede || '(vacía)'}`));
}

// --- 2. llamadas_grupales_historial: evidencia de que el equipo existió ---
console.log('\n📡 Leyendo llamadas_grupales_historial (solo lectura)...');
const snapLlamadas = await db.collection('llamadas_grupales_historial').get();
const todasLasLlamadas = [];
snapLlamadas.forEach(doc => todasLasLlamadas.push({ id: doc.id, ...doc.data() }));
console.log(`✅ ${todasLasLlamadas.length} llamadas grupales leídas.\n`);

const llamadasDelEquipo = todasLasLlamadas.filter(l =>
  String(l.numEquipo ?? '').trim() === String(numEquipoBuscado).trim() && normalizeSede(l.sede) === sedeNorm
);

if (llamadasDelEquipo.length > 0) {
  console.log(`⚠️  Hay ${llamadasDelEquipo.length} registro(s) histórico(s) de llamadas grupales para Equipo #${numEquipoBuscado} en ${sedeNorm} — esto es EVIDENCIA de que el equipo SÍ existió (con ese nombre/entrenador registrado en su momento):`);
  llamadasDelEquipo.forEach(l => console.log(`   - ${l.fecha || '(sin fecha)'} | Equipo: ${l.equipo || '(sin nombre)'} | Entrenador: ${l.entrenador || '(sin dato)'} | Asistieron: ${l.asistieron ?? '?'}/${l.totalIntegrantes ?? '?'}`));
} else {
  console.log(`ℹ️  No hay registros históricos de llamadas grupales para Equipo #${numEquipoBuscado} en ${sedeNorm}.`);
}

console.log('\n📋 RESULTADO:');
if (coincidenNumeroYSede.length === 0 && llamadasDelEquipo.length === 0) {
  console.log(`   DATO FALTANTE: no hay ningún rastro (ni manager activo ni historial de llamadas) de un Equipo #${numEquipoBuscado} en ${sedeNorm} en la base de datos actual. No puedo determinar desde aquí si nunca existió con ese número, si fue eliminado, o si está registrado bajo otro nombre/sede — revisa manualmente o dime más contexto (¿en qué pantalla lo viste antes? ¿tienes el nombre del equipo o del manager?).`);
} else if (coincidenNumeroYSede.length === 0 && llamadasDelEquipo.length > 0) {
  console.log(`   Hay historial de llamadas pero el manager/equipo YA NO aparece en managers_directory — esto sugiere que el registro fue eliminado o modificado (recuerda: solo Dirección/Gerencia/Coordinación de Maestría pueden eliminar o editar según firestore.rules). Revisa el historial de auditoría (audit_log si existe) para ver quién y cuándo.`);
} else {
  console.log(`   El equipo SÍ está en managers_directory — si en la app no aparece, puede ser un problema de filtro/UI, no de datos. Dime en qué pantalla no lo ves.`);
}

console.log('\nEste script NO modificó nada en Firestore.\n');
