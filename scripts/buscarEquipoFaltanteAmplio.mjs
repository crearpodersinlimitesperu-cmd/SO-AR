// scripts/buscarEquipoFaltanteAmplio.mjs
//
// CONTEXTO (02/09/2026): buscarEquipoFaltante.mjs ya buscó el Equipo 35 de
// Guayaquil en managers_directory y llamadas_grupales_historial (las dos
// colecciones más obvias) y no encontró nada — "no hay ningún rastro". Antes
// de pedirle a José más contexto (dónde lo vio, quién es el manager, fecha
// aproximada), esta versión amplía la búsqueda de solo lectura a TODAS las
// demás colecciones de la plataforma que podrían mencionar un número de
// equipo: goals, kpi_reports, tasks, notas_seguimiento, reports, audit_logs,
// sync_history. Si el 35/GYE aparece en cualquiera de ellas, es evidencia de
// que el equipo sí existió (o de dónde salió la referencia), sin necesitar
// que José ubique la pantalla exacta. Si tampoco aparece en ninguna, sí
// queda como DATO FALTANTE genuino que requiere su contexto adicional.
//
// MODO SEGURO: solo lectura. No escribe, no actualiza, no borra nada.
//
// Uso:
//   node scripts/buscarEquipoFaltanteAmplio.mjs [numEquipo] [sedeParcial]
//   node scripts/buscarEquipoFaltanteAmplio.mjs 35 Guayaquil   (por defecto)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const numEquipoBuscado = process.argv[2] || '35';
const sedeParcial = (process.argv[3] || 'Guayaquil').toLowerCase();
const sedeCodigos = ['gye', 'guayaquil'];

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const COLECCIONES = [
  'goals', 'kpi_reports', 'tasks', 'notas_seguimiento',
  'reports', 'audit_logs', 'sync_history'
];

function contieneEquipoYSede(obj) {
  const json = JSON.stringify(obj).toLowerCase();
  const mencionaEquipo = json.includes(`equipo ${numEquipoBuscado}`) ||
                         json.includes(`equipo${numEquipoBuscado}`) ||
                         json.includes(`"numequipo":${numEquipoBuscado}`) ||
                         json.includes(`"numequipo":"${numEquipoBuscado}"`) ||
                         json.includes(`"equipo":${numEquipoBuscado}`) ||
                         json.includes(`"equipo":"${numEquipoBuscado}"`);
  const mencionaSede = sedeCodigos.some(c => json.includes(c)) || json.includes(sedeParcial);
  return { mencionaEquipo, mencionaSede };
}

console.log(`\n🔎 Búsqueda amplia de solo lectura: Equipo ${numEquipoBuscado} / sede ~"${sedeParcial}" en ${COLECCIONES.length} colecciones adicionales...\n`);

let totalHallazgos = 0;

for (const nombreColeccion of COLECCIONES) {
  try {
    const snap = await db.collection(nombreColeccion).get();
    let hallazgosEnColeccion = 0;
    snap.forEach(doc => {
      const data = doc.data();
      const { mencionaEquipo, mencionaSede } = contieneEquipoYSede(data);
      if (mencionaEquipo) {
        hallazgosEnColeccion++;
        totalHallazgos++;
        console.log(`  📄 ${nombreColeccion}/${doc.id}  (menciona sede "${sedeParcial}": ${mencionaSede ? 'SÍ' : 'no'})`);
      }
    });
    console.log(`  → ${nombreColeccion}: ${snap.size} documentos revisados, ${hallazgosEnColeccion} con posible mención de Equipo ${numEquipoBuscado}.`);
  } catch (e) {
    console.log(`  ⚠️  ${nombreColeccion}: no se pudo leer (${e.message}).`);
  }
}

console.log(`\n=========================================`);
if (totalHallazgos === 0) {
  console.log(`❌ Sin ningún rastro de "Equipo ${numEquipoBuscado}" en ninguna de las ${COLECCIONES.length} colecciones adicionales`);
  console.log(`   (sumado a que tampoco apareció en managers_directory ni llamadas_grupales_historial).`);
  console.log(`   DATO FALTANTE CONFIRMADO: no hay evidencia en toda la base de que este equipo exista.`);
  console.log(`   Para seguir, necesito de José: en qué pantalla lo vio, nombre del manager/capitán, o fecha aproximada.`);
} else {
  console.log(`✅ Se encontraron ${totalHallazgos} documento(s) con posible mención del Equipo ${numEquipoBuscado}. Revisa el detalle arriba.`);
}
