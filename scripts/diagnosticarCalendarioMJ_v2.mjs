// scripts/diagnosticarCalendarioMJ_v2.mjs
//
// CONTEXTO (03/09/2026): la primera versión de este diagnóstico
// (diagnosticarCalendarioMJ_Equipo30Lima.mjs) DESCARTÓ la hipótesis de que
// el "role" de Linid/Leyla estuviera desincronizado (su documento
// users/linid_valencia SÍ dice "coord_maestria", correcto) y encontró que
// mj_calendars/LIMA-EQ-30 NO EXISTE — o sea, mi primer intento apuntaba a
// la causa equivocada. Este script v2 investiga la causa REAL, encontrada
// leyendo el código con más cuidado después de ese resultado:
//
// --- PROBLEMA 1 (permisos), causa real encontrada en el código ---
// firestore.rules define, para /users/{userId}:
//     allow write: if isSuperAdmin();
// Pero src/context/AuthContext.jsx, en CADA login (líneas ~293-299 y
// ~393-399), necesita escribir el documento users/{SU PROPIO UID REAL DE
// FIREBASE AUTH} para mantenerlo sincronizado — el propio comentario del
// código dice: "🔥 CRÍTICO: Guardar el usuario en la colección users. Si no
// existe aquí, las reglas de Firestore rechazarán todas sus peticiones" —
// y ese mismo setDoc está envuelto en un try/catch que solo imprime:
//     "Cannot update /users since only superadmin can, continuing login"
// Es decir: el propio código YA SABE que esta escritura falla para
// cualquier usuario que no sea superadmin, y sigue el login igual (por
// diseño, para no bloquear a nadie) — pero corriendo, el ÚNICO documento
// users/{uid} que existe para Linid es el que le puso el script de
// importación masiva bootstrapSync.js, en users/linid_valencia (un slug de
// su correo, NO su uid real de Firebase Auth).
//
// callerRole() (usado por mj_calendars, notas_seguimiento y
// canManageManagers()/managers_directory) busca el rol en:
//     get(/databases/$(database)/documents/users/$(request.auth.uid))
// — es decir, en users/{SU UID REAL}, NO en users/linid_valencia. Si esos
// dos documentos son distintos (uno con slug, otro con uid real, y el de
// uid real nunca se pudo crear/actualizar por el bug de arriba), esa
// búsqueda no encuentra nada (o encuentra un documento viejo/incompleto) y
// callerRole() devuelve false → Firestore rechaza el guardado → exactamente
// el error "No se pudo guardar el calendario. Revisa los permisos de
// Firestore."
//
// Esto NO es exclusivo de Linid: afectaría a CUALQUIER coord_maestria/
// director_maestria cuyo users/{uid real} nunca se haya podido escribir —
// y a 3 colecciones (mj_calendars, notas_seguimiento, managers_directory),
// no solo el calendario.
//
// Este script usa firebase-admin (que SÍ puede leer Firebase Auth y
// Firestore sin las reglas del cliente) para comprobar, con datos reales:
//   1. Cuál es el UID REAL de Firebase Auth de Linid y Leyla.
//   2. Si existe users/{ese UID real} y qué "role" tiene guardado ahí
//      (que es el ÚNICO documento que callerRole() realmente lee).
//
// --- PROBLEMA 2 (fechas Equipo 30 Lima) ---
// LIMA-EQ-30 no existe como docId exacto. Este script ahora busca en TODA
// la colección mj_calendars cualquier documento cuyo equipoNumero contenga
// "30" y cuya sede contenga "lima" (sin adivinar el docId), para encontrar
// el documento real si existe con otro ID.
//
// MODO SEGURO: 100% solo lectura (ni siquiera usa las reglas de cliente,
// así que no hay forma de que esto escriba nada).
//
// Uso:
//   node scripts/diagnosticarCalendarioMJ_v2.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const authAdmin = getAuth();

const EMAILS_A_REVISAR = ['linid.valencia@crearpsl.net', 'leyla.pasquel@crearpsl.net'];
const ROL_ESPERADO = ['coord_maestria', 'director_maestria'];

console.log('\n========================================================');
console.log('PROBLEMA 1 (v2): el documento users/{UID REAL} que de verdad lee callerRole()');
console.log('========================================================\n');

for (const emailBuscado of EMAILS_A_REVISAR) {
  let authUser;
  try {
    authUser = await authAdmin.getUserByEmail(emailBuscado);
  } catch (e) {
    console.log(`❌ ${emailBuscado}: no tiene cuenta en Firebase Authentication (${e.message}). No puede haber iniciado sesión nunca.`);
    continue;
  }

  console.log(`👤 ${emailBuscado}`);
  console.log(`   UID real de Firebase Auth: ${authUser.uid}`);
  console.log(`   Último login registrado en Firebase Auth: ${authUser.metadata.lastSignInTime || '(nunca)'}`);

  const uidDocRef = db.collection('users').doc(authUser.uid);
  const uidDocSnap = await uidDocRef.get();

  if (!uidDocSnap.exists) {
    console.log(`   ❌ users/${authUser.uid}  →  NO EXISTE.`);
    console.log(`      callerRole() hace get() sobre esta ruta exacta — si no existe, la lectura`);
    console.log(`      falla y el "allow write"/"allow update" que dependen de callerRole() se`);
    console.log(`      evalúan como false. CONFIRMA la causa del error de guardado.`);
  } else {
    const data = uidDocSnap.data();
    const rol = data.role || null;
    const ok = ROL_ESPERADO.includes(rol);
    console.log(`   ${ok ? '✅' : '⚠️ '} users/${authUser.uid}  existe.  role: "${rol}"`);
    if (!ok) {
      console.log(`      ⚠️  Existe pero el role NO es uno de [${ROL_ESPERADO.join(', ')}] — también explicaría el rechazo.`);
    } else {
      console.log(`      Este documento SÍ tiene el role correcto — si el error de guardado persiste`);
      console.log(`      con esto en verde, la causa está en otro lado (revisar reglas desplegadas`);
      console.log(`      vs. las del repo, o el mensaje de error real en la consola del navegador).`);
    }
  }
  console.log('');
}

console.log('========================================================');
console.log('PROBLEMA 2 (v2): búsqueda amplia de "Equipo 30 Lima" en mj_calendars');
console.log('========================================================\n');

const allCalsSnap = await db.collection('mj_calendars').get();
console.log(`Total de documentos en mj_calendars: ${allCalsSnap.size}\n`);

let encontrados = 0;
allCalsSnap.forEach(docSnap => {
  const c = docSnap.data();
  const sede = (c.sede || '').toLowerCase();
  const equipo = String(c.equipoNumero || '').trim();
  if (sede.includes('lima') && equipo === '30') {
    encontrados++;
    console.log(`✅ Encontrado: mj_calendars/${docSnap.id}`);
    console.log(`   sede: "${c.sede}"  equipoNumero: "${c.equipoNumero}"  equipoNombre: "${c.equipoNombre}"`);
    console.log(`   Primer FDS guardado: "${c.fds?.[0]?.fechaInicio || '(vacío)'}"`);
    console.log(`   (ancla calculada a partir de eventos.json reales: "2026-09-04")`);
  }
});

if (encontrados === 0) {
  console.log('❌ Ningún documento en mj_calendars tiene sede que contenga "lima" y equipoNumero="30".');
  console.log('   Listado completo de docIds existentes, para ubicarlo a simple vista:\n');
  allCalsSnap.forEach(docSnap => {
    const c = docSnap.data();
    console.log(`   - ${docSnap.id}  (sede: "${c.sede}", equipoNumero: "${c.equipoNumero}")`);
  });
  console.log('\n   Si "Equipo 30 Lima" no aparece en esta lista, el calendario que Linid ve con');
  console.log('   fechas incorrectas TODAVÍA NO SE GUARDÓ NUNCA en Firestore — lo que ve en');
  console.log('   pantalla es el formulario "nuevo" sin haber podido guardar (coherente con el');
  console.log('   PROBLEMA 1: si nunca pudo guardar, nunca se creó el documento).');
}

console.log('\n➡️  Solo lectura. Nada fue modificado.');
