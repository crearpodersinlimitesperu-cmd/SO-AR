// scripts/escanearTextoFuturosImposiblesTodos.mjs
//
// CONTEXTO (03/09/2026): ya se confirmó y corrigió el texto viejo de
// "Entrega de futuros imposibles al correo" (URL/usuario/contraseña
// anteriores) guardado en mj_calendars/LIMA-EQ-30 — ver
// repararTextoFuturosImposiblesEquipo30Lima.mjs (José corrió --fix y
// confirmó "✅ Corregido").
//
// Ese mismo problema (texto viejo "horneado" en un documento ya guardado
// ANTES de que se corrigiera la plantilla del código) podría existir
// también en OTROS calendarios de mj_calendars ya guardados por otros
// coordinadores/equipos — no se ha verificado todavía. Este script es
// puramente de diagnóstico: escanea TODA la colección mj_calendars y
// reporta, para cada documento, si alguna de sus "actividades" contiene el
// texto viejo conocido (URL vieja "crearpslglobal.com/admin/login.php" o
// usuario viejo "invitadoFI").
//
// MODO SEGURO: 100% solo lectura. No modifica ni corrige nada — solo
// informa cuáles documentos (si los hay) necesitarían el mismo tipo de
// corrección aplicada a LIMA-EQ-30, para decidir con José si hace falta
// extender el fix a más equipos.
//
// Uso:
//   node scripts/escanearTextoFuturosImposiblesTodos.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Fragmentos del texto viejo conocido — basta con que aparezca cualquiera
// de estos dentro del texto de una actividad para marcarlo como sospechoso.
const MARCAS_TEXTO_VIEJO = [
  'crearpslglobal.com/admin/login.php',
  'invitadoFI'
];

console.log('\n🔎 Escaneando TODA la colección mj_calendars por el texto viejo de "futuros imposibles"...\n');

const snap = await db.collection('mj_calendars').get();
console.log(`Total de documentos en mj_calendars: ${snap.size}\n`);

let sospechosos = 0;

snap.forEach(docSnap => {
  const cal = docSnap.data();
  const actividades = cal.actividades || [];
  const hallazgos = [];

  actividades.forEach((a, i) => {
    const texto = a.actividad || '';
    const marcaEncontrada = MARCAS_TEXTO_VIEJO.find(m => texto.includes(m));
    if (marcaEncontrada) {
      hallazgos.push({ index: i, marca: marcaEncontrada, texto });
    }
  });

  if (hallazgos.length > 0) {
    sospechosos++;
    console.log(`⚠️  mj_calendars/${docSnap.id}  (sede: "${cal.sede}", equipoNumero: "${cal.equipoNumero}", equipoNombre: "${cal.equipoNombre}")`);
    hallazgos.forEach(h => {
      console.log(`      actividades[${h.index}] contiene texto viejo ("${h.marca}"):`);
      console.log(`      "${h.texto.split('\n')[0]}..."`);
    });
    console.log('');
  }
});

if (sospechosos === 0) {
  console.log('✅ Ningún otro documento en mj_calendars tiene el texto viejo conocido. LIMA-EQ-30 era el único caso.');
} else {
  console.log(`📊 Total de documentos con texto viejo detectado: ${sospechosos}.`);
  console.log('   Ninguno fue modificado — esto es solo diagnóstico. Si confirmas que también hay que corregirlos,');
  console.log('   puedo preparar el mismo tipo de script de reparación (solo lectura por defecto, --fix para corregir)');
  console.log('   para cada uno de estos documentos.');
}

console.log('\n➡️  Solo lectura. Nada fue modificado.');
