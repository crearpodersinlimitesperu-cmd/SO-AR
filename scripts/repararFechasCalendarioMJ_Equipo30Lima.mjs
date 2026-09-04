// scripts/repararFechasCalendarioMJ_Equipo30Lima.mjs
//
// CONTEXTO (03/09/2026): confirmado con datos reales (diagnosticarCalendarioMJ_v2.mjs
// + verificarEventoOficialEquipo30Lima.mjs):
//   - El calendario oficial EN VIVO tiene la fecha correcta del Primer FDS de
//     Equipo 30 Lima: 2026-09-04 (viernes) — la app la encuentra bien.
//   - Pero el documento YA GUARDADO en Firestore (mj_calendars/LIMA-EQ-30,
//     creado por Linid después del fix de permisos) tiene el Primer FDS
//     guardado como "2024-12-20" — más de un año y medio antes de la fecha
//     correcta. Por eso el editor y el PDF muestran fechas de
//     diciembre 2024/enero 2025: applyReliableDates() SOLO llena campos
//     vacíos, nunca pisa un valor ya guardado — así que una vez que el
//     Primer FDS quedó mal guardado, todo lo demás que se calculó a partir
//     de él (Segundo/Tercer FDS y las 19 actividades con fórmula) también
//     quedó mal, y ya no se corrige solo con volver a abrir el calendario.
//
// Este script:
//   1. Por defecto (SIN --fix): SOLO LEE el documento real y muestra, campo
//      por campo, el valor guardado vs. el valor correcto calculado con la
//      MISMA fórmula que usa la app (RELIABLE_ACTIVITY_OFFSETS/
//      applyReliableDates(), copiada tal cual de CalendarioMJ.jsx) a partir
//      del ancla correcta (2026-09-04). No modifica nada.
//   2. Con --fix: corrige EN FIRESTORE, con merge (no toca ningún otro
//      campo del documento — equipoNombre, infoText, actividades sin
//      fórmula como "Caminata sobre fuego", etc. quedan intactos), SOLO
//      los campos de fecha que la fórmula sabe calcular (fds[0/1/2].fechaInicio/
//      fechaFin y las actividades con offset conocido). Cualquier actividad
//      fuera de la fórmula (ej. "Caminata sobre fuego", o actividades que
//      Linid haya agregado a mano) NO se toca.
//
// MODO SEGURO: por defecto 100% solo lectura. La escritura solo ocurre si
// corres explícitamente con --fix, después de revisar el diagnóstico.
//
// Uso:
//   node scripts/repararFechasCalendarioMJ_Equipo30Lima.mjs            (solo diagnóstico)
//   node scripts/repararFechasCalendarioMJ_Equipo30Lima.mjs --fix       (diagnóstico + corrige)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const debeCorregir = process.argv.includes('--fix');
const DOC_ID = 'LIMA-EQ-30';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// --- Copiado tal cual de src/pages/CalendarioMJ.jsx, para garantizar el MISMO resultado ---
function addDaysISO(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const RELIABLE_ACTIVITY_OFFSETS = {
  0: { from: 'fds1', days: 3 },
  1: { from: 'fds1', days: 6 },
  2: { from: 'fds1', days: 14 },
  3: { from: 'fds1', days: 15 },
  4: { from: 'fds1', days: 15 },
  5: { from: 'fds1', days: 15 },
  6: { from: 'fds1', days: 15 },
  7: { from: 'fds1', days: 16 },
  8: { from: 'fds2', days: -7 },
  9: { from: 'fds2', days: -6 },
  10: { from: 'fds2', days: -6 },
  11: { from: 'fds2', days: -6 },
  13: { from: 'fds2', days: 15 },
  14: { from: 'fds2', days: 16 },
  15: { from: 'fds3', days: -7 },
  16: { from: 'fds3', days: -6 },
  17: { from: 'fds3', days: -6 },
  18: { from: 'fds3', days: -6 },
  19: { from: 'fds3', days: -6 }
};

const FDS1_CORRECTO = '2026-09-04'; // verificado en vivo: calendario oficial, evento MAESTRIA DEL JUEGO "282930"

console.log(`\n🔎 Leyendo mj_calendars/${DOC_ID}...\n`);
const ref = db.collection('mj_calendars').doc(DOC_ID);
const snap = await ref.get();

if (!snap.exists) {
  console.error(`❌ No existe mj_calendars/${DOC_ID}. Nada que reparar.`);
  process.exit(1);
}

const cal = snap.data();
console.log(`Documento: sede="${cal.sede}" equipoNumero="${cal.equipoNumero}" equipoNombre="${cal.equipoNombre}"\n`);

const fds1Anchor = FDS1_CORRECTO;
const fds2Anchor = addDaysISO(fds1Anchor, 35);
const fds3Anchor = addDaysISO(fds1Anchor, 70);
const anchors = { fds1: fds1Anchor, fds2: fds2Anchor, fds3: fds3Anchor };

console.log('=== Bloques FDS: guardado vs. correcto ===\n');
const fdsCorrecciones = [];
const fdsEsperado = [
  { fechaInicio: fds1Anchor, fechaFin: addDaysISO(fds1Anchor, 2) },
  { fechaInicio: fds2Anchor, fechaFin: addDaysISO(fds2Anchor, 2) },
  { fechaInicio: fds3Anchor, fechaFin: addDaysISO(fds3Anchor, 2) }
];
(cal.fds || []).forEach((fb, i) => {
  const esperado = fdsEsperado[i];
  if (!esperado) return;
  const okInicio = fb.fechaInicio === esperado.fechaInicio;
  const okFin = fb.fechaFin === esperado.fechaFin;
  console.log(`   [${i}] ${fb.titulo || fb.id}`);
  console.log(`       fechaInicio: guardado="${fb.fechaInicio || '(vacío)'}"  correcto="${esperado.fechaInicio}"  ${okInicio ? '✅' : '⚠️ DIFERENTE'}`);
  console.log(`       fechaFin:    guardado="${fb.fechaFin || '(vacío)'}"  correcto="${esperado.fechaFin}"  ${okFin ? '✅' : '⚠️ DIFERENTE'}`);
  if (!okInicio || !okFin) {
    fdsCorrecciones.push({ index: i, fechaInicio: esperado.fechaInicio, fechaFin: esperado.fechaFin });
  }
});

console.log('\n=== Actividades con fórmula conocida: guardado vs. correcto ===\n');
const actCorrecciones = [];
(cal.actividades || []).forEach((a, i) => {
  const rule = RELIABLE_ACTIVITY_OFFSETS[i];
  if (!rule) return; // sin fórmula (ej. "Caminata sobre fuego") — nunca se toca
  const esperado = addDaysISO(anchors[rule.from], rule.days);
  const ok = a.fecha === esperado;
  console.log(`   ${ok ? '✅' : '⚠️ '} [${i}] ${(a.actividad || '').split('\n')[0]}: guardado="${a.fecha || '(vacío)'}"  correcto="${esperado}"`);
  if (!ok) {
    actCorrecciones.push({ index: i, fecha: esperado });
  }
});

const totalCambios = fdsCorrecciones.length + actCorrecciones.length;
console.log(`\n📊 Total de campos con fecha incorrecta detectados: ${totalCambios}`);

if (totalCambios === 0) {
  console.log('✅ No hay nada que corregir — todas las fechas con fórmula conocida ya son correctas.');
  process.exit(0);
}

if (!debeCorregir) {
  console.log('\n➡️  No se modificó nada (modo solo lectura). Para aplicar estas correcciones, corre:');
  console.log('     node scripts/repararFechasCalendarioMJ_Equipo30Lima.mjs --fix');
  process.exit(0);
}

console.log('\n✏️  Aplicando correcciones (merge, solo los campos de fecha listados arriba)...');
const fdsFinal = (cal.fds || []).map((fb, i) => {
  const c = fdsCorrecciones.find(x => x.index === i);
  return c ? { ...fb, fechaInicio: c.fechaInicio, fechaFin: c.fechaFin } : fb;
});
const actividadesFinal = (cal.actividades || []).map((a, i) => {
  const c = actCorrecciones.find(x => x.index === i);
  return c ? { ...a, fecha: c.fecha } : a;
});

await ref.set({
  fds: fdsFinal,
  actividades: actividadesFinal,
  updatedAt: new Date().toISOString(),
  updatedBy: 'repararFechasCalendarioMJ_Equipo30Lima.mjs (confirmado por José, 03/09/2026)'
}, { merge: true });

console.log(`✅ Corregido: ${totalCambios} campo(s) de fecha. Ningún otro campo del documento fue tocado.`);
console.log('   Vuelve a abrir el calendario de Equipo 30 Lima en la app (o exporta el PDF) para confirmar.');
