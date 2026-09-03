// scripts/verificarReglasDesplegadas.mjs
//
// CONTEXTO (03/09/2026): tras el fix de firestore.rules (permitir que cada
// usuario escriba users/{su propio uid}) y con confirmación de José
// ("reparar para todos"), volviste a correr diagnosticarCalendarioMJ_v2.mjs
// y users/{uid real} de Linid y Leyla SIGUE sin existir. Antes de seguir
// investigando código, hay que descartar lo más simple: que el archivo
// firestore.rules editado nunca haya llegado a desplegarse a producción (o
// que el deploy haya fallado sin que se notara).
//
// Este script usa la API de Firebase Admin (admin.securityRules()) para
// leer, DIRECTAMENTE DE PRODUCCIÓN, cuál es el contenido REAL de las reglas
// de Firestore que están activas ahora mismo — sin depender de lo que diga
// la terminal del "firebase deploy", ni de mi copia local del archivo.
//
// Busca la marca de texto exacta que dejé en el comentario del fix
// ("reparar para todos") dentro de esas reglas activas:
//   - Si APARECE: el deploy sí se aplicó. El problema es otra cosa (ej.
//     Linid no recargó la sesión, o hay otra causa distinta).
//   - Si NO APARECE: el deploy nunca llegó a producción — hay que volver a
//     correr "firebase deploy --only firestore:rules" y revisar bien la
//     salida de esa terminal por cualquier error.
//
// MODO SEGURO: 100% solo lectura. No modifica ni despliega nada.
//
// Uso:
//   node scripts/verificarReglasDesplegadas.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });

console.log('\n🔎 Leyendo las reglas de Firestore REALMENTE activas en producción ahora mismo...\n');

const rules = getSecurityRules();
let ruleset;
try {
  ruleset = await rules.getFirestoreRuleset();
} catch (e) {
  console.error(`❌ No se pudo leer el ruleset activo: ${e.message}`);
  process.exit(1);
}

const source = ruleset.source?.[0]?.content || '';
console.log(`✅ Ruleset activo obtenido. Nombre: ${ruleset.name}`);
console.log(`   Longitud del archivo activo: ${source.length} caracteres.\n`);

const MARCA_DEL_FIX = 'reparar para todos';
const tieneElFix = source.includes(MARCA_DEL_FIX);

console.log(`¿El texto "${MARCA_DEL_FIX}" (marca del fix de hoy) está en las reglas activas?  ${tieneElFix ? 'SÍ ✅' : 'NO ❌'}\n`);

if (!tieneElFix) {
  console.log('⚠️  El deploy del fix NUNCA llegó a producción. Las reglas activas todavía son');
  console.log('   una versión anterior. Hay que volver a correr, desde la carpeta del proyecto:');
  console.log('     firebase deploy --only firestore:rules');
  console.log('   y revisar la salida completa de esa terminal por cualquier mensaje de error.');
  console.log('\n   Fragmento de las reglas de /users/{userId} REALMENTE activas ahora mismo:\n');
  const idx = source.indexOf('match /users/{userId}');
  if (idx >= 0) {
    console.log(source.slice(idx, idx + 400));
  } else {
    console.log('   (no se encontró el bloque "match /users/{userId}" en las reglas activas — revisar manualmente)');
  }
} else {
  console.log('✅ El deploy sí se aplicó — las reglas activas en producción SON las nuevas.');
  console.log('   Si users/{uid real} de Linid sigue sin existir, el problema ya no es el deploy:');
  console.log('   puede ser que su sesión en el navegador no se haya vuelto a sincronizar todavía');
  console.log('   (necesita recargar la app o cerrar sesión y volver a entrar DESPUÉS del deploy),');
  console.log('   o hay que revisar el mensaje de error exacto que ve en la consola del navegador');
  console.log('   (F12 → pestaña Console) al intentar guardar, para descartar otra causa distinta.');
}

console.log('\n➡️  Solo lectura. Nada fue modificado ni desplegado.');
