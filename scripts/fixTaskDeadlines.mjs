// scripts/fixTaskDeadlines.mjs
//
// CONTEXTO (28/08/2026): José reportó que los "Límite" mostrados en los
// checklists no eran coherentes con la tarea (ej. dos tareas de días distintos
// mostrando la misma fecha/hora límite). Investigación confirmó DOS bugs en
// src/context/ChecklistContext.jsx y src/utils/soarDates.js:
//   1. calculateAutomaticDeadline(task) se llamaba SIN el ciclo real activo,
//      así que SIEMPRE usaba el único ciclo de ejemplo hardcodeado en
//      src/data/cyclesData.js ("Equipo 30"), sin importar la sede/equipo real
//      del usuario. Ya corregido: ahora se pasa currentCycle (de CyclesContext,
//      calculado desde el calendario oficial en vivo).
//   2. La función initializeFirestore() (botón "Reiniciar Ciclo" en
//      GerenteDashboard.jsx) escribía ese deadline incorrecto de forma
//      PERMANENTE en cada documento de la colección "tasks" en Firestore. Ya
//      corregido para que ya NO guarde un deadline fijo ahí.
//
// PERO: si ese botón de "Reiniciar Ciclo" ya se usó alguna vez antes de este
// arreglo, los documentos existentes en "tasks" pueden tener guardado un campo
// "deadline" INCORRECTO y CONGELADO — y como el código de la app usa
// `task.deadline || calculateAutomaticDeadline(...)`, un deadline ya guardado
// (aunque esté mal) SIEMPRE gana y nunca se recalcula solo.
//
// Este script (de uso LOCAL, no se ejecuta automáticamente) LIMPIA ese campo
// para que la app lo vuelva a calcular en vivo con el ciclo real de cada sede.
//
// QUÉ TAREAS TOCA: solo tareas del catálogo base (cuyo id existe en
// src/data/checklistData.js) que NO estén completadas — nunca toca tareas
// personalizadas creadas a mano (esas no vienen de calculateAutomaticDeadline)
// ni el historial de tareas ya completadas.
//
// MODO SEGURO POR DEFECTO: sin --write, solo imprime qué documentos tienen
// un campo "deadline" guardado y lo borraría (dry-run). Con --write, borra el
// campo "deadline" de esos documentos (Firestore FieldValue.delete()) para que
// se recalculen solos la próxima vez que cada usuario abra su checklist.
//
// Uso:
//   node scripts/fixTaskDeadlines.mjs
//   node scripts/fixTaskDeadlines.mjs --write

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { checklistData } from '../src/data/checklistData.js';

const WRITE = process.argv.includes('--write');

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const baseIds = new Set(checklistData.map(t => t.id));
  console.log(`Catálogo base: ${baseIds.size} tareas conocidas.`);
  console.log(`Modo: ${WRITE ? 'ESCRITURA (borra el campo deadline)' : 'DRY-RUN (solo preview, no se escribe nada)'}\n`);

  const snap = await db.collection('tasks').get();
  console.log(`Total de documentos en "tasks": ${snap.size}\n`);

  let candidates = [];
  snap.forEach(docSnap => {
    const d = docSnap.data();
    if (!baseIds.has(docSnap.id)) return; // no es del catálogo base (tarea personalizada) — no se toca
    if (!d.deadline) return; // ya no tiene deadline guardado — nada que limpiar
    if (d.completed === true || d.status === 'Completada') return; // no se toca historial ya completado

    candidates.push({ id: docSnap.id, deadline: d.deadline, cyclePhase: d.cyclePhase || '(sin fase)' });
  });

  console.log(`${candidates.length} documentos con un "deadline" guardado que ${WRITE ? 'se van a limpiar' : 'SE LIMPIARÍAN si corres con --write'}:\n`);
  candidates.slice(0, 30).forEach(c => console.log(`  ${c.id} [${c.cyclePhase}]: deadline actual = "${c.deadline}"`));
  if (candidates.length > 30) console.log(`  ... y ${candidates.length - 30} más.`);

  if (candidates.length === 0) {
    console.log('\nNada que limpiar. O el bug nunca llegó a escribirse en Firestore (buena noticia), o ya se corrió este script antes.');
    process.exit(0);
  }

  if (!WRITE) {
    console.log('\nDry-run terminado. Nada fue modificado. Vuelve a correr con --write para aplicar.');
    process.exit(0);
  }

  console.log('\nLimpiando el campo "deadline" en Firestore...');
  let batch = db.batch();
  let opsInBatch = 0;
  let totalCleaned = 0;
  for (const c of candidates) {
    batch.update(db.collection('tasks').doc(c.id), { deadline: FieldValue.delete() });
    opsInBatch++;
    totalCleaned++;
    if (opsInBatch === 400) { // límite de Firestore es 500 por batch, dejamos margen
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }
  if (opsInBatch > 0) await batch.commit();

  console.log(`\nListo. ${totalCleaned} documentos limpiados. Se recalcularán solos con el ciclo real la próxima vez que cada sede abra su checklist.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Error limpiando deadlines:', err);
  process.exit(1);
});
