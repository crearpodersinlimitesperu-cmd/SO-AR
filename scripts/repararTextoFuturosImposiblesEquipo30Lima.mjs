// scripts/repararTextoFuturosImposiblesEquipo30Lima.mjs
//
// CONTEXTO (03/09/2026): José reportó (con 2 capturas del editor de
// calendario) que la actividad "Entrega de futuros imposibles al correo"
// del calendario YA GUARDADO de Equipo 30 Lima (mj_calendars/LIMA-EQ-30)
// TODAVÍA muestra el texto VIEJO:
//     https://crearpslglobal.com/admin/login.php
//     Usuario: invitadoFI
//     (Contraseña: invitadofi)
//
// La plantilla del código (DEFAULT_ACTIVITIES[1] en src/pages/CalendarioMJ.jsx)
// SÍ fue corregida antes (confirmado presente en origin/master, commit
// ca678d5) con el texto nuevo que José confirmó:
//     https://imo.crearpslglobal.com
//     Usuario: invitadofiper
//     Contraseña: invitadofiper
//
// Pero ese cambio de plantilla SOLO afecta calendarios NUEVOS que se creen
// desde ahora en adelante — exactamente el mismo patrón que el bug de
// fechas ya reparado con repararFechasCalendarioMJ_Equipo30Lima.mjs: el
// documento mj_calendars/LIMA-EQ-30 ya fue guardado en Firestore ANTES de
// ese cambio de plantilla, con su propia copia independiente del texto
// (campo actividades[1].actividad), y ese campo ya guardado nunca se
// actualiza solo — hay que corregirlo directamente en Firestore.
//
// Este script:
//   1. Por defecto (SIN --fix): SOLO LEE el documento real y muestra el
//      texto guardado en actividades[1].actividad vs. el texto correcto
//      (el mismo que ya está en la plantilla del código en origin/master).
//      No modifica nada.
//   2. Con --fix: corrige EN FIRESTORE, con merge (no toca ningún otro
//      campo del documento ni de la actividad — ni "fecha", ni "hora", ni
//      "seccion" — SOLO el texto de "actividad" de ese único índice, y
//      solo si el texto guardado coincide EXACTAMENTE con el texto VIEJO
//      conocido, para no pisar por error un texto que Linid haya editado
//      a mano con algo distinto).
//
// MODO SEGURO: por defecto 100% solo lectura. La escritura solo ocurre si
// corres explícitamente con --fix, después de revisar el diagnóstico.
//
// Uso:
//   node scripts/repararTextoFuturosImposiblesEquipo30Lima.mjs            (solo diagnóstico)
//   node scripts/repararTextoFuturosImposiblesEquipo30Lima.mjs --fix       (diagnóstico + corrige)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const debeCorregir = process.argv.includes('--fix');
const DOC_ID = 'LIMA-EQ-30';
const INDICE_ACTIVIDAD = 1; // "Entrega de futuros imposibles al correo" — DEFAULT_ACTIVITIES[1]

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Texto viejo EXACTO visto en las capturas de José (lo que hay que reemplazar).
const TEXTO_VIEJO = 'Entrega de futuros imposibles al correo:\nhttps://crearpslglobal.com/admin/login.php\nUsuario: invitadoFI\nContraseña: invitadofi';

// Texto correcto EXACTO — copiado tal cual de DEFAULT_ACTIVITIES[1] en
// src/pages/CalendarioMJ.jsx (confirmado presente en origin/master, commit ca678d5).
const TEXTO_CORRECTO = 'Entrega de futuros imposibles al correo:\nhttps://imo.crearpslglobal.com\nUsuario: invitadofiper\nContraseña: invitadofiper';

console.log(`\n🔎 Leyendo mj_calendars/${DOC_ID}...\n`);
const ref = db.collection('mj_calendars').doc(DOC_ID);
const snap = await ref.get();

if (!snap.exists) {
  console.error(`❌ No existe mj_calendars/${DOC_ID}. Nada que reparar.`);
  process.exit(1);
}

const cal = snap.data();
console.log(`Documento: sede="${cal.sede}" equipoNumero="${cal.equipoNumero}" equipoNombre="${cal.equipoNombre}"\n`);

const actividades = cal.actividades || [];
const act = actividades[INDICE_ACTIVIDAD];

if (!act) {
  console.error(`❌ No existe actividades[${INDICE_ACTIVIDAD}] en este documento. Nada que reparar.`);
  process.exit(1);
}

const guardado = act.actividad || '';

console.log('=== Actividad guardada vs. texto correcto ===\n');
console.log(`[${INDICE_ACTIVIDAD}] Texto GUARDADO actualmente en Firestore:`);
console.log('---');
console.log(guardado || '(vacío)');
console.log('---\n');
console.log(`[${INDICE_ACTIVIDAD}] Texto CORRECTO (el que ya está en la plantilla del código):`);
console.log('---');
console.log(TEXTO_CORRECTO);
console.log('---\n');

if (guardado === TEXTO_CORRECTO) {
  console.log('✅ El texto guardado YA es el correcto. No hay nada que corregir.');
  process.exit(0);
}

const coincideConElViejoConocido = guardado === TEXTO_VIEJO;

if (coincideConElViejoConocido) {
  console.log('⚠️  El texto guardado coincide EXACTAMENTE con el texto viejo conocido (URL/usuario/contraseña anteriores).');
} else {
  console.log('⚠️  El texto guardado es DIFERENTE tanto del texto correcto como del texto viejo conocido exacto.');
  console.log('    Esto puede significar que Linid (u otra persona) editó esta actividad a mano con otro texto.');
  console.log('    Por seguridad, este script SOLO corrige automáticamente si el texto guardado coincide EXACTO');
  console.log('    con el texto viejo conocido — así nunca se pisa una edición manual sin que un humano la revise.');
}

if (!debeCorregir) {
  console.log('\n➡️  No se modificó nada (modo solo lectura).');
  if (coincideConElViejoConocido) {
    console.log('   Para aplicar esta corrección, corre:');
    console.log('     node scripts/repararTextoFuturosImposiblesEquipo30Lima.mjs --fix');
  } else {
    console.log('   Antes de forzar un cambio aquí, confirma con Linid si el texto actual fue una edición manual suya.');
  }
  process.exit(0);
}

if (!coincideConElViejoConocido) {
  console.log('\n🛑 No se aplica ninguna corrección: el texto guardado no coincide exacto con el texto viejo conocido,');
  console.log('   así que --fix NO escribe nada, para no arriesgar pisar una edición manual sin confirmar primero.');
  process.exit(1);
}

console.log('\n✏️  Aplicando corrección (merge, solo actividades[1].actividad — ningún otro campo se toca)...');
const actividadesFinal = actividades.map((a, i) => (i === INDICE_ACTIVIDAD ? { ...a, actividad: TEXTO_CORRECTO } : a));

await ref.set({
  actividades: actividadesFinal,
  updatedAt: new Date().toISOString(),
  updatedBy: 'repararTextoFuturosImposiblesEquipo30Lima.mjs (confirmado por José, 03/09/2026)'
}, { merge: true });

console.log('✅ Corregido: actividades[1].actividad. Ningún otro campo del documento fue tocado.');
console.log('   Vuelve a abrir el calendario de Equipo 30 Lima en la app (o exporta el PDF) para confirmar.');
