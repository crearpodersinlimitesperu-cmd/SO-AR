// scripts/verificarRolAndresGomez.mjs
//
// CONTEXTO (02/09/2026): José envió una captura en vivo de Causa OS donde
// el encabezado de Andres Gomez muestra la etiqueta "COORDINADOR MAESTRÍA
// DEL JUEGO (MJ)" y aclaró por chat: "andres gomez es el director de
// maestria del juego, entrenador de c2 y relacion mj, entrenador de
// llamadas". La fuente de sincronización (src/data/usersToImport.js) ya
// tiene su rol como "director_maestria", y src/config/permissions.js ya lo
// documentaba como entrenador dual-role — pero no tengo forma de leer su
// documento REAL en Firestore desde este entorno (nunca tengo ni debo tener
// el archivo de credenciales de servicio), así que no puedo confirmar por mí
// mismo si el campo "role" en Firestore quedó desincronizado (ej. en
// "coordinador_mj" o "coord_maestria") o si la pantalla solo reflejaba un
// "rol activo" temporal del selector dual-role (ver AuthContext.jsx) — esto
// es DATO FALTANTE hasta correr este script contra la base real.
//
// Qué hace en modo diagnóstico (por defecto, SOLO LECTURA):
//   Busca en la colección "users" el documento cuyo campo "emails" (o
//   "email") contenga andres.gomez@crearpsl.net, e imprime su contenido
//   completo tal cual está en Firestore. No escribe, no actualiza, no borra
//   nada.
//
// Qué hace en modo --fix (ESCRITURA, requiere confirmación explícita):
//   Si el campo "role" del documento encontrado NO es "director_maestria",
//   lo corrige a "director_maestria" mediante set(..., {merge:true}) —
//   igual que el patrón ya usado en scripts/bootstrapSync.js — y dentro del
//   mismo objeto añade "rolesDetalle": "Director Maestría del Juego +
//   Entrenador C2 + Entrenador Relación MJ + Entrenador de Llamadas" como
//   nota descriptiva, sin tocar ningún otro campo del documento (no toca
//   contraseñas, sedes, emails, ni ningún otro dato). Si el rol YA es
//   correcto, no escribe nada y solo lo informa.
//
// MODO SEGURO: por defecto (sin --fix) es 100% de solo lectura. La escritura
// solo ocurre si TÚ decides correr el comando con --fix, después de revisar
// el diagnóstico impreso en pantalla.
//
// Uso:
//   node scripts/verificarRolAndresGomez.mjs             (solo diagnóstico)
//   node scripts/verificarRolAndresGomez.mjs --fix        (diagnóstico + corrige si hace falta)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const EMAIL_BUSCADO = 'andres.gomez@crearpsl.net';
const ROL_ESPERADO = 'director_maestria';
const debeCorregir = process.argv.includes('--fix');

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

console.log(`\n🔎 Buscando en Firestore "users" el documento de ${EMAIL_BUSCADO} (solo lectura primero)...\n`);

const snap = await db.collection('users').get();
let encontrado = null;

snap.forEach(doc => {
  const data = doc.data();
  const emails = Array.isArray(data.emails) ? data.emails.map(e => String(e).toLowerCase().trim()) : [];
  const emailSingular = data.email ? String(data.email).toLowerCase().trim() : null;
  if (emails.includes(EMAIL_BUSCADO) || emailSingular === EMAIL_BUSCADO) {
    encontrado = { id: doc.id, data };
  }
});

if (!encontrado) {
  console.error(`❌ No se encontró ningún documento en la colección "users" con el correo ${EMAIL_BUSCADO}.`);
  console.error(`   DATO FALTANTE: puede que su cuenta esté en un uid distinto al esperado ("staff_andresgomez")`);
  console.error(`   o que aún no se haya sincronizado desde usersToImport.js. Revisa manualmente en la Consola de Firebase.`);
  process.exit(1);
}

console.log(`✅ Documento encontrado: users/${encontrado.id}`);
console.log(JSON.stringify(encontrado.data, null, 2));

const rolActual = encontrado.data.role || null;
console.log(`\n📋 Campo "role" actual en Firestore: "${rolActual}"`);
console.log(`📋 Rol esperado según usersToImport.js y lo confirmado por José: "${ROL_ESPERADO}"`);

if (rolActual === ROL_ESPERADO) {
  console.log(`\n✅ El campo "role" en Firestore YA es correcto ("${ROL_ESPERADO}").`);
  console.log(`   Si la pantalla de Causa OS sigue mostrando "COORDINADOR MAESTRÍA DEL JUEGO (MJ)",`);
  console.log(`   probablemente sea el selector de "rol activo" (dual-role) mostrando una vista`);
  console.log(`   distinta a su rol de base, no un error de datos. Revisa AuthContext.jsx / el`);
  console.log(`   selector de rol en la interfaz para confirmarlo con Andres directamente.`);
  process.exit(0);
}

console.log(`\n⚠️  DESINCRONIZACIÓN CONFIRMADA: el campo "role" en Firestore ("${rolActual}") no coincide`);
console.log(`   con "${ROL_ESPERADO}".`);

if (!debeCorregir) {
  console.log(`\n➡️  No se modificó nada (modo solo lectura). Para corregirlo, vuelve a correr:`);
  console.log(`     node scripts/verificarRolAndresGomez.mjs --fix`);
  process.exit(0);
}

console.log(`\n✏️  Corrigiendo campo "role" a "${ROL_ESPERADO}" (merge, no toca ningún otro campo)...`);
await db.collection('users').doc(encontrado.id).set({
  role: ROL_ESPERADO,
  rolesDetalle: 'Director Maestría del Juego + Entrenador C2 + Entrenador Relación MJ + Entrenador de Llamadas',
  updatedAt: new Date().toISOString(),
  source: 'verificarRolAndresGomez (confirmado por José, 02/09/2026)'
}, { merge: true });

console.log(`✅ Corregido. Vuelve a cargar Causa OS con la cuenta de Andres para confirmar visualmente.`);
