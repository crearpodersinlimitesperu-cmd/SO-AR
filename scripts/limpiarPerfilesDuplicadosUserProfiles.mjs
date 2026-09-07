// scripts/limpiarPerfilesDuplicadosUserProfiles.mjs
//
// CONTEXTO (04/09/2026): diagnosticarAvisosInactividadDuplicados.mjs confirmó
// la causa real de los 3 avisos de inactividad que le llegaron a José pese a
// entrar todos los días: existen 2 documentos DISTINTOS en user_profiles para
// jose.sanchez@crearpsl.net —
//   - user_profiles/jose.sanchez@crearpsl.net   (el correcto — su lastLoginAt
//     SÍ se actualiza en cada login real, vía auditService.js)
//   - user_profiles/huSHoqB2u5dqoGUCEzMLUir77Vz1 (un duplicado viejo, con el
//     UID de Firebase como ID en vez del correo — su lastLoginAt quedó
//     congelado en 22/08/2026 y su lastInactivityAlertAt nunca se llena,
//     porque mailerDaemon.js SIEMPRE escribe el debounce en el documento
//     cuyo ID es el correo, nunca en este — así que cada vez que corre el
//     daemon, este documento viejo vuelve a verse "inactivo hace semanas y
//     nunca alertado" y dispara OTRO correo, sin fin.
//
// Se revisó todo el código actual (auditService.js, UserProfileModal.jsx —
// los 2 únicos lugares que escriben en user_profiles) y AMBOS usan
// email.toLowerCase().trim() como ID del documento — ninguno usa el UID.
// O sea: no hay ningún camino en el código actual que vuelva a crear un
// duplicado como este. DATO FALTANTE: no se pudo determinar con certeza qué
// versión anterior del código (o qué script/migración ya no presente) creó
// ese documento con el UID como ID — no se va a inventar esa parte.
//
// Este script:
//   1. Por defecto (SIN --fix): SOLO LEE. Agrupa todos los documentos de
//      user_profiles por su correo (campo "email", normalizado). Para cada
//      grupo con más de 1 documento, muestra el contenido COMPLETO de cada
//      uno y marca cuál es el "canónico" (ID del documento == su propio
//      campo email) y cuáles son duplicados "huérfanos" (ID distinto).
//   2. Con --fix: SOLO para los grupos que SÍ tienen un documento canónico
//      (nunca se borra si no hay uno claro), hace un respaldo en un archivo
//      JSON local de cada duplicado huérfano ANTES de borrarlo, y luego lo
//      borra de Firestore. El documento canónico NUNCA se toca ni se borra.
//
// MODO SEGURO: 100% solo lectura por defecto. --fix respalda antes de borrar,
// y solo borra duplicados huérfanos cuando existe un documento canónico claro.
//
// Uso:
//   node scripts/limpiarPerfilesDuplicadosUserProfiles.mjs            (solo diagnóstico)
//   node scripts/limpiarPerfilesDuplicadosUserProfiles.mjs --fix       (diagnóstico + respalda + borra huérfanos)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';

const debeCorregir = process.argv.includes('--fix');

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function fechaLegible(v) {
  if (!v) return '(sin fecha)';
  const d = v.toDate ? v.toDate() : new Date(v);
  if (isNaN(d.getTime())) return `(fecha inválida)`;
  return d.toISOString();
}

// Convierte un documento a un objeto plano serializable en JSON (los
// Timestamp de Firestore no se pueden JSON.stringify tal cual).
function aObjetoPlano(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v;
  }
  return out;
}

console.log('\n🔎 Escaneando TODA la colección user_profiles buscando duplicados por correo...\n');

const snap = await db.collection('user_profiles').get();
console.log(`Total de documentos en user_profiles: ${snap.size}\n`);

const porCorreo = new Map();
snap.forEach(docSnap => {
  const data = docSnap.data();
  const emailCampo = (data.email || '').toLowerCase().trim();
  const clave = emailCampo || docSnap.id.toLowerCase().trim();
  if (!porCorreo.has(clave)) porCorreo.set(clave, []);
  porCorreo.get(clave).push({ docId: docSnap.id, data });
});

let gruposConDuplicado = 0;
let huerfanosParaBorrar = [];
let gruposSinCanonicoClaro = 0;

for (const [correo, docs] of porCorreo.entries()) {
  if (docs.length <= 1) continue;
  gruposConDuplicado++;

  const canonico = docs.find(d => d.docId.toLowerCase().trim() === correo);
  const huerfanos = docs.filter(d => d !== canonico);

  console.log(`🔴 ${correo} — ${docs.length} documentos:`);
  docs.forEach(d => {
    const esCanonico = d === canonico;
    console.log(`   ${esCanonico ? '✅ CANÓNICO' : '⚠️  HUÉRFANO '} — user_profiles/${d.docId}`);
    console.log(`        email (campo): "${d.data.email ?? '(sin campo)'}"`);
    console.log(`        lastLoginAt: ${fechaLegible(d.data.lastLoginAt)}`);
    console.log(`        lastInactivityAlertAt: ${fechaLegible(d.data.lastInactivityAlertAt)}`);
    console.log(`        lastAction: ${d.data.lastAction ?? '(sin dato)'}`);
  });

  if (canonico) {
    huerfanos.forEach(h => huerfanosParaBorrar.push({ correo, ...h }));
    console.log(`   ➡️  Con --fix, se respaldarían y borrarían los ${huerfanos.length} documento(s) huérfano(s) de arriba.`);
  } else {
    gruposSinCanonicoClaro++;
    console.log('   ⚠️  Ninguno de estos documentos tiene el correo como ID — no hay un "canónico" claro.');
    console.log('      Por seguridad, --fix NO toca este grupo. Revisa manualmente cuál debe quedar.');
  }
  console.log('');
}

console.log('========================================================');
console.log('📊 Resumen');
console.log('========================================================');
console.log(`Correos con más de 1 documento en user_profiles: ${gruposConDuplicado}`);
console.log(`  - Con un canónico claro (huérfanos elegibles para borrar con --fix): ${gruposConDuplicado - gruposSinCanonicoClaro}`);
console.log(`  - Sin canónico claro (requieren revisión manual, --fix no los toca): ${gruposSinCanonicoClaro}`);
console.log(`Total de documentos huérfanos elegibles para borrar: ${huerfanosParaBorrar.length}`);

if (!debeCorregir) {
  console.log('\n➡️  No se modificó ni borró nada (modo solo lectura).');
  if (huerfanosParaBorrar.length > 0) {
    console.log('   Para respaldar y borrar los huérfanos con canónico claro, corre:');
    console.log('     node scripts/limpiarPerfilesDuplicadosUserProfiles.mjs --fix');
  }
  process.exit(0);
}

if (huerfanosParaBorrar.length === 0) {
  console.log('\n✅ No hay huérfanos elegibles para borrar. Nada que hacer.');
  process.exit(0);
}

const marcaTiempo = new Date().toISOString().replace(/[:.]/g, '-');
const archivoRespaldo = `backup_user_profiles_huerfanos_borrados_${marcaTiempo}.json`;
const respaldo = huerfanosParaBorrar.map(h => ({ correo: h.correo, docId: h.docId, data: aObjetoPlano(h.data) }));
writeFileSync(archivoRespaldo, JSON.stringify(respaldo, null, 2), 'utf8');
console.log(`\n💾 Respaldo guardado en ./${archivoRespaldo} (${huerfanosParaBorrar.length} documento(s)) antes de borrar nada.`);

console.log('\n🗑️  Borrando documentos huérfanos...');
for (const h of huerfanosParaBorrar) {
  await db.collection('user_profiles').doc(h.docId).delete();
  console.log(`   ✅ Borrado: user_profiles/${h.docId} (correo: ${h.correo})`);
}

console.log('\n✅ Listo. El documento canónico (ID = correo) de cada persona no fue tocado.');
console.log(`   Si algo sale mal, el respaldo completo está en ./${archivoRespaldo}.`);
