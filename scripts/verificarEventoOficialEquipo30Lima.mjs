// scripts/verificarEventoOficialEquipo30Lima.mjs (v2)
//
// CONTEXTO (03/09/2026): José reportó que las fechas de "Equipo 30 Lima"
// SIGUEN saliendo mal en el editor (capturas: fechas de diciembre 2024 /
// enero 2025 — más de un año en el pasado).
//
// Investigando "eventos.json" del repo (un export puntual, no la fuente en
// vivo) encontré algo que cambia el diagnóstico anterior: la Maestría del
// Juego en Lima SÍ tiene eventos oficiales relacionados al Equipo 30, pero
// el calendario oficial AGRUPA 3 equipos de Capítulo 1 en una sola cohorte
// de MJ, con el campo "equipo" como los 3 números concatenados sin
// separador (ej. "282930" = equipos 28+29+30 juntos, "303132" = 30+31+32).
// En el export más reciente encontré 3 candidatos que "30" podría matchear,
// los 3 en 2026 y consistentes entre sí:
//   282930 → 2026-09-04  (coincide EXACTO con el ancla que calculé antes de
//                          forma independiente, a partir de actividades
//                          reales del Equipo 30: Caída de Confianza, Tanque,
//                          Impacto Relación)
//   293031 → 2026-10-09
//   303132 → 2026-11-13
//
// El código de la app (findOfficialMJEvent() en CalendarioMJ.jsx) busca el
// PRIMER evento cuyo campo "equipo" (como texto) CONTENGA "30" como
// substring — así reconoce estas cohortes agrupadas. Con los datos del
// export del repo, ese primer match sería el correcto (2026-09-04). Pero el
// export del repo NO es la fuente real — la app carga esto en vivo desde un
// endpoint público de Google Apps Script, que puede tener eventos
// adicionales o distintos (por ejemplo, algún equipo viejo de 2024/2025
// cuyo "equipo" también contenga "30" como substring, y que aparezca ANTES
// en el array en vivo) — eso explicaría fechas de hace más de un año.
//
// Este script reproduce EXACTAMENTE la misma lógica de búsqueda que usa
// CalendarioMJ.jsx (findOfficialMJEvent), pero contra el calendario oficial
// EN VIVO (el mismo endpoint público que carga la app ahora mismo), para
// ver con certeza cuál evento está encontrando de verdad — sin adivinar.
//
// MODO SEGURO: 100% solo lectura, no requiere credenciales (endpoint público).
//
// Uso:
//   node scripts/verificarEventoOficialEquipo30Lima.mjs

const API_URL = 'https://script.google.com/macros/s/AKfycbxSZFhddMYyspZpkW-qPHEi8hycLGfnhFeCPSYc4VbckWIeiiZAbxyJY71XRb2-Ya4U/exec?action=getEventos';

console.log('\n🔎 Descargando el calendario oficial EN VIVO (el mismo que usa CyclesContext)...\n');

let data;
try {
  const res = await fetch(API_URL);
  if (!res.ok) {
    console.error(`❌ El endpoint respondió con estado ${res.status}. No se pudo verificar.`);
    process.exit(1);
  }
  data = await res.json();
} catch (e) {
  console.error(`❌ No se pudo conectar al endpoint: ${e.message}`);
  process.exit(1);
}

const eventos = Array.isArray(data) ? data : (data.eventos || data.events || []);
console.log(`✅ Se descargaron ${eventos.length} eventos del calendario oficial en vivo.\n`);

// --- Reproduce findOfficialMJEvent() de src/pages/CalendarioMJ.jsx, tal cual ---
function findOfficialMJEvent(events, sede, equipoNumero) {
  if (!sede?.trim() || !equipoNumero?.trim() || !events?.length) return null;
  const sedeNorm = sede.trim().toLowerCase();
  const equipoNorm = String(equipoNumero).trim();
  const sedeAliases = [
    ['lima', 'lim'], ['quito', 'uio'], ['guayaquil', 'gye'],
    ['cuenca', 'cue'], ['medell', 'med'], ['mexico', 'mex'], ['méxico', 'mex'], ['cdmx', 'mex']
  ];
  return events.find(e => {
    const nombre = e.nombre || e.name || '';
    if (nombre !== 'MAESTRIA DEL JUEGO') return false;
    const evSede = (e.sede || e.sedeTag || e.place || e.address || '').toLowerCase();
    if (!evSede) return false;
    const sedeMatches = evSede.includes(sedeNorm) || sedeNorm.includes(evSede) ||
      sedeAliases.some(([a, b]) => (sedeNorm.includes(a) && evSede.includes(b)));
    if (!sedeMatches) return false;
    const evEquipo = String(e.equipo || '').trim();
    return evEquipo === equipoNorm || evEquipo.includes(equipoNorm) || (equipoNorm && equipoNorm.includes(evEquipo));
  }) || null;
}

console.log('=== Lo que la app ENCONTRARÍA de verdad para sede="Lima", equipo="30" ===\n');
const match = findOfficialMJEvent(eventos, 'Lima', '30');
if (!match) {
  console.log('❌ findOfficialMJEvent() no encuentra ningún evento — la app no debería poder');
  console.log('   precargar nada automáticamente. Si Linid ve fechas igual, las escribió a mano.');
} else {
  console.log('⭐ Evento que la app usa como Primer FDS (el PRIMERO que matchea, en orden del array):');
  console.log(`   id: ${match.id || '(sin id)'}`);
  console.log(`   equipo: "${match.equipo}"`);
  console.log(`   sede: "${match.sede}"`);
  console.log(`   fecha_inicio: ${(match.fecha_inicio || match.start || '').slice(0, 10)}`);
  console.log(`   nombre: ${match.nombre}`);
}

console.log('\n=== TODOS los candidatos que matchean "30" como substring (para ver si hay más de uno) ===\n');
const sedeNorm = 'lima';
const sedeAliases = [['lima', 'lim'], ['quito', 'uio'], ['guayaquil', 'gye'], ['cuenca', 'cue'], ['medell', 'med'], ['mexico', 'mex'], ['méxico', 'mex'], ['cdmx', 'mex']];
const candidatos = eventos.filter(e => {
  if ((e.nombre || e.name || '') !== 'MAESTRIA DEL JUEGO') return false;
  const evSede = (e.sede || e.sedeTag || e.place || e.address || '').toLowerCase();
  if (!evSede) return false;
  const sedeMatches = evSede.includes(sedeNorm) || sedeNorm.includes(evSede) || sedeAliases.some(([a, b]) => (sedeNorm.includes(a) && evSede.includes(b)));
  if (!sedeMatches) return false;
  const evEquipo = String(e.equipo || '').trim();
  return evEquipo === '30' || evEquipo.includes('30') || '30'.includes(evEquipo);
});

if (candidatos.length === 0) {
  console.log('(ninguno)');
} else {
  candidatos.forEach((c, i) => {
    const marcador = (match && c === match) ? '⭐ (este es el que gana, por ser el primero)' : '  ';
    console.log(`   ${marcador} [pos ${i}] equipo="${c.equipo}"  fecha_inicio=${(c.fecha_inicio || c.start || '').slice(0, 10)}  id=${c.id || '(sin id)'}`);
  });
}

console.log('\n➡️  Solo lectura. Nada fue modificado.');
