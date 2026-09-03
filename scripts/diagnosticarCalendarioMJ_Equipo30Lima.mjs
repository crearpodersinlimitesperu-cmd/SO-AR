// scripts/diagnosticarCalendarioMJ_Equipo30Lima.mjs
//
// CONTEXTO (03/09/2026): José reportó 2 problemas juntos, en el Generador
// de Calendario (Maestría del Juego / CalendarioMJ.jsx), con Linid Valencia
// como usuaria:
//   1) Al guardar aparece el toast rojo "No se pudo guardar el calendario.
//      Revisa los permisos de Firestore."
//   2) Al poner "Equipo 30 Lima", las fechas que se cargan NO corresponden
//      a las fechas reales.
//
// Este script es SOLO LECTURA. No escribe, no actualiza, no borra nada.
// Diagnostica ambos problemas contra Firestore real:
//
// --- Problema 1 (permisos) ---
// firestore.rules define, para mj_calendars:
//   allow write: if isSuperAdmin() || isGerenteODireccion() || callerRole();
//   callerRole() = users/{uid}.data.role in ['coord_maestria','director_maestria']
// Pero el resto de la app (src/config/permissions.js, EDIT_ROLES en
// CalendarioMJ.jsx) trata "coordinador_mj" como EQUIVALENTE a "coord_maestria"
// para efectos de edición. Si el campo "role" real de Linid en Firestore es
// "coordinador_mj" en vez de "coord_maestria" (aunque usersToImport.js diga
// que debería ser "coord_maestria" — mismo patrón de desincronización ya
// confirmado antes con Andres Gomez), callerRole() la rechaza aunque la UI
// le muestre los botones de edición. Este script imprime su rol REAL.
//
// --- Problema 2 (fechas de Equipo 30 Lima) ---
// El comentario en CalendarioMJ.jsx (línea ~440) dice explícitamente que el
// calendario del "Equipo 30" se creó ANTES de que existiera el cálculo
// automático de fechas (applyReliableDates), así que al abrirlo hoy, esa
// función auto-completa cualquier campo de fecha que haya quedado vacío,
// usando como ancla la fecha guardada de "Primer FDS".
//
// Cruzando eventos.json (calendario oficial real de Causa OS) para el
// Equipo 30 / Lima, aparecen estos eventos reales (NO hay ningún evento
// "MAESTRIA DEL JUEGO" para este equipo — por eso buscarEnCalendarioOficial()
// no puede precargarlo automáticamente):
//   CAIDA DE CONFIANZA   2026-09-19 (sábado)
//   TANQUE               2026-10-03 (sábado)
//   IMPACTO RELACION     2026-11-07 (sábado)
//   IMPACTO GRATITUD     2026-11-21 (sábado)
//   EL VIAJE             2026-11-27 (viernes)
//
// Aplicando la fórmula RELIABLE_ACTIVITY_OFFSETS EN REVERSA sobre estos 3
// eventos que sí tienen offset conocido (Entrenamiento de confianza=fds1+15,
// Entrenamiento Tanque=fds2-6, Impacto Relación=fds3-6), las 3 apuntan,
// SIN NINGUNA discrepancia, al mismo ancla:
//   Primer FDS  (fds1) = 2026-09-04 (viernes)
//   Segundo FDS (fds2) = 2026-10-09 (viernes)  [= fds1 + 35, coincide con la fórmula]
//   Tercer FDS  (fds3) = 2026-11-13 (viernes)  [= fds1 + 70, coincide con la fórmula]
// Los 3 caen en viernes, como corresponde a un "Primer FDS" (el horario
// arranca "Viernes: registro"). Esto es un CÁLCULO verificado con 3 puntos
// de referencia reales independientes, no una suposición.
//
// Este script imprime el documento REAL guardado en Firestore
// (mj_calendars/LIMA-EQ-30) y lo compara contra este ancla calculada, para
// confirmar (o descartar) que el Primer FDS guardado es distinto de
// 2026-09-04 — lo cual explicaría el arrastre de fechas incorrectas a las
// demás actividades vía applyReliableDates().
//
// MODO SEGURO: 100% solo lectura.
//
// Uso:
//   node scripts/diagnosticarCalendarioMJ_Equipo30Lima.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const EMAILS_A_REVISAR = ['linid.valencia@crearpsl.net', 'leyla.pasquel@crearpsl.net'];
const ROL_ESPERADO = ['coord_maestria', 'director_maestria']; // lo único que acepta callerRole() en firestore.rules

console.log('\n========================================================');
console.log('PROBLEMA 1: permisos de Firestore al guardar el calendario');
console.log('========================================================\n');

const usersSnap = await db.collection('users').get();

for (const emailBuscado of EMAILS_A_REVISAR) {
  let encontrado = null;
  usersSnap.forEach(doc => {
    const data = doc.data();
    const emails = Array.isArray(data.emails) ? data.emails.map(e => String(e).toLowerCase().trim()) : [];
    const emailSingular = data.email ? String(data.email).toLowerCase().trim() : null;
    if (emails.includes(emailBuscado) || emailSingular === emailBuscado) {
      encontrado = { id: doc.id, data };
    }
  });

  if (!encontrado) {
    console.log(`❌ ${emailBuscado}: no se encontró documento en "users". DATO FALTANTE.`);
    continue;
  }

  const rol = encontrado.data.role || null;
  const ok = ROL_ESPERADO.includes(rol);
  console.log(`${ok ? '✅' : '⚠️ '} ${emailBuscado}  →  users/${encontrado.id}`);
  console.log(`   role guardado en Firestore: "${rol}"`);
  console.log(`   callerRole() en firestore.rules acepta: [${ROL_ESPERADO.join(', ')}]`);
  if (!ok) {
    console.log(`   ⚠️  DESINCRONIZACIÓN CONFIRMADA: con role="${rol}", el "allow write" de`);
    console.log(`      mj_calendars en firestore.rules RECHAZA sus guardados — coincide`);
    console.log(`      exactamente con el error "Revisa los permisos de Firestore".`);
  }
  console.log('');
}

console.log('========================================================');
console.log('PROBLEMA 2: fechas de "Equipo 30 Lima" en el calendario');
console.log('========================================================\n');

const docId = 'LIMA-EQ-30';
const calSnap = await db.collection('mj_calendars').doc(docId).get();

if (!calSnap.exists) {
  console.log(`❌ No existe mj_calendars/${docId} en Firestore.`);
  console.log(`   Puede que el docId real sea otro (ej. si "sede" o "equipoNumero" se guardaron`);
  console.log(`   con otro texto). Revisa manualmente en la Consola de Firebase, colección`);
  console.log(`   "mj_calendars", buscando equipoNumero="30" y sede que contenga "Lima".`);
  process.exit(0);
}

const cal = calSnap.data();
console.log(`✅ Documento encontrado: mj_calendars/${docId}`);
console.log(`   sede: "${cal.sede}"  equipoNumero: "${cal.equipoNumero}"  equipoNombre: "${cal.equipoNombre}"\n`);

console.log('Fechas guardadas de los 3 FDS:');
(cal.fds || []).forEach((fb, i) => {
  console.log(`   [${i}] ${fb.titulo || fb.id}: fechaInicio="${fb.fechaInicio || '(vacío)'}"  fechaFin="${fb.fechaFin || '(vacío)'}"`);
});

const ANCLA_CALCULADA = { fds1: '2026-09-04', fds2: '2026-10-09', fds3: '2026-11-13' };
console.log('\nAncla calculada a partir de eventos.json reales (Equipo 30 Lima):');
console.log(`   Primer FDS esperado:  ${ANCLA_CALCULADA.fds1} (viernes)`);
console.log(`   Segundo FDS esperado: ${ANCLA_CALCULADA.fds2} (viernes)`);
console.log(`   Tercer FDS esperado:  ${ANCLA_CALCULADA.fds3} (viernes)`);

const fds1Guardado = cal.fds?.[0]?.fechaInicio || null;
if (fds1Guardado && fds1Guardado !== ANCLA_CALCULADA.fds1) {
  console.log(`\n⚠️  DISCREPANCIA CONFIRMADA: el Primer FDS guardado ("${fds1Guardado}") NO coincide`);
  console.log(`   con el ancla calculada ("${ANCLA_CALCULADA.fds1}"). Esto explica que TODAS las`);
  console.log(`   fechas auto-calculadas a partir de él (vía applyReliableDates) salgan corridas.`);
} else if (fds1Guardado === ANCLA_CALCULADA.fds1) {
  console.log(`\n✅ El Primer FDS guardado SÍ coincide con el ancla calculada. Si las fechas se`);
  console.log(`   siguen viendo mal, el problema está en actividades individuales editadas a mano`);
  console.log(`   (ver detalle abajo), no en el ancla.`);
} else {
  console.log(`\n❌ El documento no tiene Primer FDS guardado (fechaInicio vacío).`);
}

console.log('\nActividades guardadas (fecha real vs. fecha esperada por fórmula, cuando aplica):');
const OFFSETS_LABEL = {
  3: { label: 'Entrenamiento de confianza', esperado: '2026-09-19' },
  9: { label: 'Entrenamiento Tanque', esperado: '2026-10-03' },
  17: { label: 'Impacto Relación', esperado: '2026-11-07' }
};
(cal.actividades || []).forEach((a, i) => {
  const ref = OFFSETS_LABEL[i];
  const marcador = ref ? (a.fecha === ref.esperado ? '✅' : '⚠️ ') : '  ';
  console.log(`   ${marcador} [${i}] ${(a.actividad || '').split('\n')[0]}: fecha="${a.fecha || '(vacío)'}"${ref ? `  (esperado: ${ref.esperado})` : ''}`);
});

console.log('\n➡️  Este script no modificó nada. Con esta salida se puede confirmar la causa exacta');
console.log('   y preparar una corrección puntual (solo de los campos que estén mal), sin adivinar.');
