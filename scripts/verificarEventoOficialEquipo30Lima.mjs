// scripts/verificarEventoOficialEquipo30Lima.mjs
//
// CONTEXTO (03/09/2026): confirmamos con diagnosticarCalendarioMJ_v2.mjs que
// la colección "mj_calendars" está COMPLETAMENTE VACÍA (0 documentos) — o
// sea, nadie ha podido guardar NINGÚN calendario de Maestría del Juego
// todavía (por el bug de permisos ya confirmado). Eso significa que las
// "fechas que no son reales" que ve Linid para Equipo 30 Lima NO vienen de
// un documento guardado con datos incorrectos — tienen que venir de la
// PRECARGA AUTOMÁTICA del formulario "nuevo calendario", que busca el
// evento oficial "MAESTRIA DEL JUEGO" de ese equipo+sede en el calendario
// oficial de Causa OS (src/context/CyclesContext.jsx).
//
// Ese calendario oficial NO sale de eventos.json (el archivo del repo es
// solo un respaldo/export puntual) — sale en vivo de un endpoint público de
// Google Apps Script:
//   https://script.google.com/macros/s/AKfycbxSZFhddMYyspZpkW-qPHEi8hycLGfnhFeCPSYc4VbckWIeiiZAbxyJY71XRb2-Ya4U/exec?action=getEventos
//
// Mi entorno en la nube NO tiene salida de red hacia script.google.com (la
// bloquea la política de red de la organización), así que no puedo leerlo
// yo mismo — DATO FALTANTE que este script, corrido desde tu computadora,
// resuelve. Es una URL pública (sin credenciales, sin firebase-admin).
//
// Qué hace: descarga el calendario oficial EN VIVO (el mismo que carga la
// app ahora mismo) y filtra todos los eventos de Equipo 30 en sedes que
// contengan "lim" (Lima). Si aparece un evento "MAESTRIA DEL JUEGO" con una
// fecha, esa es la fecha que el formulario está usando para precargar el
// Primer FDS — y podemos compararla contra la fecha correcta calculada
// (2026-09-04, verificada con 3 puntos de referencia reales de
// eventos.json: Caída de Confianza, Tanque e Impacto Relación).
//
// MODO SEGURO: 100% solo lectura, no requiere credenciales.
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

const sedeAliases = ['lima', 'lim'];
const equipo30 = eventos.filter(e => {
  const sede = (e.sede || e.sedeTag || e.place || e.lugar || '').toString().toLowerCase();
  const equipo = String(e.equipo || '').trim();
  const sedeMatches = sedeAliases.some(a => sede.includes(a));
  return sedeMatches && equipo === '30';
});

if (equipo30.length === 0) {
  console.log('❌ No hay NINGÚN evento de Equipo 30 en Lima en el calendario oficial en vivo ahora mismo.');
  console.log('   Eso significa que la precarga automática del formulario tampoco encuentra nada,');
  console.log('   y cualquier fecha que Linid vea para "Equipo 30 Lima" la tuvo que escribir ella');
  console.log('   misma a mano (o quedó de una sesión anterior sin guardar en el navegador).');
} else {
  console.log(`Eventos reales de Equipo 30 / Lima en el calendario oficial en vivo (${equipo30.length}):\n`);
  equipo30
    .sort((a, b) => new Date(a.fecha_inicio || a.start) - new Date(b.fecha_inicio || b.start))
    .forEach(e => {
      const nombre = e.nombre || e.name || '(sin nombre)';
      const inicio = (e.fecha_inicio || e.start || '').slice(0, 10);
      const marcador = nombre === 'MAESTRIA DEL JUEGO' ? '⭐' : '  ';
      console.log(`   ${marcador} ${inicio}  —  ${nombre}`);
    });

  const mj = equipo30.find(e => (e.nombre || e.name) === 'MAESTRIA DEL JUEGO');
  if (mj) {
    const inicio = (mj.fecha_inicio || mj.start || '').slice(0, 10);
    console.log(`\n⭐ Evento "MAESTRIA DEL JUEGO" encontrado: ${inicio}`);
    console.log('   Esta es la fecha que CalendarioMJ.jsx usa para precargar el Primer FDS.');
    console.log('   Ancla correcta calculada independientemente (Caída de Confianza/Tanque/');
    console.log('   Impacto Relación, todas del mismo Equipo 30 Lima): 2026-09-04.');
    if (inicio !== '2026-09-04') {
      console.log(`   ⚠️  DISCREPANCIA CONFIRMADA: "${inicio}" ≠ "2026-09-04" — esta es la causa`);
      console.log('      exacta de que las fechas precargadas para Equipo 30 Lima no sean reales.');
    } else {
      console.log('   ✅ Coincide — la precarga automática no sería la causa del problema de fechas.');
    }
  } else {
    console.log('\n❌ No hay evento "MAESTRIA DEL JUEGO" para Equipo 30 Lima en el calendario oficial.');
    console.log('   findOfficialMJEvent() no puede precargar nada — cualquier fecha visible en');
    console.log('   pantalla para este equipo la escribió Linid a mano, no vino automática.');
  }
}

console.log('\n➡️  Solo lectura. Nada fue modificado ni guardado.');
