// scripts/escanearHorarioViernesTodos.mjs
//
// CONTEXTO (04/09/2026): José confirmó que en el calendario de Maestría del
// Juego, los 3 viernes (Creación, Relación y Gratitud) deben decir:
//     "Viernes: 5 pm mesa de registro. 6 pm inicia el entrenamiento – 11 pm aprox."
// La plantilla del código (DEFAULT_FDS en src/pages/CalendarioMJ.jsx) ya fue
// corregida para calendarios NUEVOS. Antes decía:
//   - Creación:            "Viernes: 5 pm registro – 11 pm aprox."
//   - Relación y Gratitud: "Viernes: 6 pm registro – 11 pm aprox."
//
// Igual que pasó con "Entrega de futuros imposibles", ese cambio de
// plantilla SOLO afecta calendarios que se creen desde ahora — los ya
// guardados en Firestore (mj_calendars/{docId}.fds[i].horario) tienen su
// propio texto ya guardado, que no se actualiza solo.
//
// Este script es SOLO DIAGNÓSTICO: escanea TODA la colección mj_calendars y,
// para cada documento, revisa el campo "horario" de sus 3 bloques (fds[0]
// creación, fds[1] relación, fds[2] gratitud), reportando cuáles todavía
// tienen el texto viejo conocido ("5 pm registro" o "6 pm registro", sin la
// distinción de "mesa de registro" / "inicia el entrenamiento").
//
// MODO SEGURO: 100% solo lectura. No modifica ni corrige nada.
//
// Uso:
//   node scripts/escanearHorarioViernesTodos.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Textos viejos EXACTOS conocidos (los que traía la plantilla antes de esta
// corrección) — si el "horario" guardado empieza con cualquiera de estos
// fragmentos de la línea de Viernes, se marca como candidato a corregir.
const FRAGMENTOS_VIEJOS = [
  'Viernes: 5 pm registro',
  'Viernes: 6 pm registro'
];

const FRAGMENTO_NUEVO = 'Viernes: 5 pm mesa de registro. 6 pm inicia el entrenamiento';

console.log('\n🔎 Escaneando TODA la colección mj_calendars por el horario viejo de "Viernes"...\n');

const snap = await db.collection('mj_calendars').get();
console.log(`Total de documentos en mj_calendars: ${snap.size}\n`);

let yaCorrectos = 0;
let conTextoViejo = 0;
let conTextoDistinto = 0;

snap.forEach(docSnap => {
  const cal = docSnap.data();
  const fds = cal.fds || [];
  const hallazgos = [];

  fds.forEach((bloque, i) => {
    const horario = bloque?.horario || '';
    const lineaViernes = horario.split('\n')[0] || '';

    if (lineaViernes.startsWith(FRAGMENTO_NUEVO)) {
      return; // ya tiene el texto correcto — no se reporta
    }

    const coincideConViejo = FRAGMENTOS_VIEJOS.some(f => lineaViernes.startsWith(f));
    hallazgos.push({ index: i, id: bloque?.id, titulo: bloque?.titulo, lineaViernes, coincideConViejo });
  });

  if (hallazgos.length > 0) {
    const algunoViejoConocido = hallazgos.some(h => h.coincideConViejo);
    const algunoDistinto = hallazgos.some(h => !h.coincideConViejo);
    if (algunoViejoConocido) conTextoViejo++;
    if (algunoDistinto) conTextoDistinto++;

    console.log(`⚠️  mj_calendars/${docSnap.id}  (sede: "${cal.sede}", equipoNumero: "${cal.equipoNumero}", equipoNombre: "${cal.equipoNombre}")`);
    hallazgos.forEach(h => {
      const marca = h.coincideConViejo ? '(texto viejo conocido — corrección automática segura con --fix)' : '(texto DIFERENTE — probablemente editado a mano, revisar antes de tocar)';
      console.log(`      fds[${h.index}] "${h.titulo}": "${h.lineaViernes}"  ${marca}`);
    });
    console.log('');
  } else {
    yaCorrectos++;
  }
});

console.log('========================================================');
console.log('📊 Resumen');
console.log('========================================================');
console.log(`Calendarios ya con el texto correcto en los 3 bloques: ${yaCorrectos}`);
console.log(`Calendarios con al menos un bloque en texto viejo conocido: ${conTextoViejo}`);
console.log(`Calendarios con al menos un bloque en texto distinto (posible edición manual): ${conTextoDistinto}`);
console.log('\n➡️  Solo lectura. Nada fue modificado.');
if (conTextoViejo > 0 || conTextoDistinto > 0) {
  console.log('   Si confirmas, preparo un script de corrección (solo lectura por defecto, --fix para corregir,');
  console.log('   igual que se hizo con "Entrega de futuros imposibles") que SOLO toque fds[i].horario cuando el');
  console.log('   texto coincida EXACTO con el texto viejo conocido, sin tocar fechas ni ninguna otra actividad.');
}
