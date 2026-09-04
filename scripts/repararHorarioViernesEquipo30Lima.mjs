// scripts/repararHorarioViernesEquipo30Lima.mjs
//
// CONTEXTO (04/09/2026): escanearHorarioViernesTodos.mjs confirmó que
// mj_calendars/LIMA-EQ-30 es el ÚNICO calendario ya guardado con el horario
// viejo de "Viernes" en sus 3 bloques (fds[0] Creación, fds[1] Relación,
// fds[2] Gratitud). José confirmó el texto nuevo correcto: "Viernes: 5 pm
// mesa de registro. 6 pm inicia el entrenamiento – 11 pm aprox." — ya
// aplicado a la plantilla del código (DEFAULT_FDS en CalendarioMJ.jsx) para
// calendarios nuevos. Este script corrige el documento YA GUARDADO.
//
// Mismo patrón que repararTextoFuturosImposiblesEquipo30Lima.mjs: por
// defecto SOLO LEE y compara; con --fix corrige, y SOLO si el texto guardado
// coincide EXACTO con el texto viejo conocido (para nunca pisar una edición
// manual sin que un humano la revise). Solo toca el campo "horario" de cada
// bloque — no toca fechaInicio, fechaFin, título ni ninguna actividad.
//
// Uso:
//   node scripts/repararHorarioViernesEquipo30Lima.mjs            (solo diagnóstico)
//   node scripts/repararHorarioViernesEquipo30Lima.mjs --fix       (diagnóstico + corrige)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const debeCorregir = process.argv.includes('--fix');
const DOC_ID = 'LIMA-EQ-30';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Textos viejos EXACTOS conocidos (confirmados por escanearHorarioViernesTodos.mjs)
const TEXTOS_VIEJOS = [
  'Viernes: 5 pm registro – 11 pm aprox.\n(asistencia obligatoria todo el fin de semana, sin negociación de tiempo)\nSábado: 8 am – 10 pm aprox.\nDomingo: 9 am – 9 pm aprox.',
  'Viernes: 6 pm registro – 11 pm aprox.\n(asistencia obligatoria todo el fin de semana, sin negociación de tiempo)\nSábado: 8 am – 10 pm aprox.\nDomingo: 9 am – 9 pm aprox.',
  'Viernes: 6 pm registro – 11 pm aprox.\n(asistencia obligatoria todo el fin de semana, sin negociación de tiempo)\nSábado: 8 am – 10 pm aprox.\nDomingo: 8 am – 9 pm aprox.',
  'Viernes: 5 pm registro – 11 pm aprox.\n(asistencia obligatoria todo el fin de semana, sin negociación de tiempo)\nSábado: 8 am – 10 pm aprox.\nDomingo: 8 am – 9 pm aprox.'
];

// Textos correctos EXACTOS — copiados de DEFAULT_FDS en CalendarioMJ.jsx (mismo orden: creación, relación, gratitud).
const TEXTOS_CORRECTOS = [
  'Viernes: 5 pm mesa de registro. 6 pm inicia el entrenamiento – 11 pm aprox.\n(asistencia obligatoria todo el fin de semana, sin negociación de tiempo)\nSábado: 8 am – 10 pm aprox.\nDomingo: 9 am – 9 pm aprox.',
  'Viernes: 5 pm mesa de registro. 6 pm inicia el entrenamiento – 11 pm aprox.\n(asistencia obligatoria todo el fin de semana, sin negociación de tiempo)\nSábado: 8 am – 10 pm aprox.\nDomingo: 9 am – 9 pm aprox.',
  'Viernes: 5 pm mesa de registro. 6 pm inicia el entrenamiento – 11 pm aprox.\n(asistencia obligatoria todo el fin de semana, sin negociación de tiempo)\nSábado: 8 am – 10 pm aprox.\nDomingo: 8 am – 9 pm aprox.'
];

console.log(`\n🔎 Leyendo mj_calendars/${DOC_ID}...\n`);
const ref = db.collection('mj_calendars').doc(DOC_ID);
const snap = await ref.get();

if (!snap.exists) {
  console.error(`❌ No existe mj_calendars/${DOC_ID}. Nada que reparar.`);
  process.exit(1);
}

const cal = snap.data();
const fds = cal.fds || [];
let algoParaCorregir = false;
let algoNoCoincide = false;

fds.forEach((bloque, i) => {
  const guardado = bloque?.horario || '';
  const correcto = TEXTOS_CORRECTOS[i];
  console.log(`[fds ${i}] "${bloque?.titulo}"`);
  if (guardado === correcto) {
    console.log('   ✅ Ya tiene el texto correcto.\n');
    return;
  }
  const coincideConViejo = TEXTOS_VIEJOS.includes(guardado);
  console.log(`   Guardado actualmente: "${guardado.split('\n')[0]}..."`);
  if (coincideConViejo) {
    console.log('   ⚠️  Coincide con el texto viejo conocido — corrección automática segura con --fix.\n');
    algoParaCorregir = true;
  } else {
    console.log('   ⚠️  Texto DIFERENTE (posible edición manual) — --fix NO lo va a tocar.\n');
    algoNoCoincide = true;
  }
});

if (!algoParaCorregir) {
  console.log('➡️  No hay ningún bloque con el texto viejo conocido exacto para corregir automáticamente.');
  if (algoNoCoincide) {
    console.log('   Hay bloques con texto distinto — revisa manualmente si necesitan cambiarse.');
  }
  process.exit(0);
}

if (!debeCorregir) {
  console.log('➡️  No se modificó nada (modo solo lectura). Para aplicar la corrección, corre:');
  console.log('     node scripts/repararHorarioViernesEquipo30Lima.mjs --fix');
  process.exit(0);
}

console.log('✏️  Aplicando corrección (merge, solo fds[i].horario cuando coincide EXACTO con el texto viejo — ningún otro campo se toca)...');
const fdsFinal = fds.map((bloque, i) => {
  const guardado = bloque?.horario || '';
  if (TEXTOS_VIEJOS.includes(guardado)) {
    return { ...bloque, horario: TEXTOS_CORRECTOS[i] };
  }
  return bloque;
});

await ref.set({
  fds: fdsFinal,
  updatedAt: new Date().toISOString(),
  updatedBy: 'repararHorarioViernesEquipo30Lima.mjs (confirmado por José, 04/09/2026)'
}, { merge: true });

console.log('✅ Corregido. Ningún otro campo del documento fue tocado.');
console.log('   Vuelve a abrir el calendario de Equipo 30 Lima en la app (o exporta el PDF) para confirmar.');
