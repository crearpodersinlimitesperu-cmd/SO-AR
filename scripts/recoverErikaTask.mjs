// scripts/recoverErikaTask.mjs
// Recuperación de datos de progreso para Erika Gavilánez
// Tareas afectadas: custom_1790898436987 y custom_1790665257137

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';

let sa = null;
if (fs.existsSync('sa-key.json')) {
  sa = JSON.parse(fs.readFileSync('sa-key.json', 'utf8'));
} else if (fs.existsSync('centro-operativo-cpsl-65ad52160f45.json')) {
  sa = JSON.parse(fs.readFileSync('centro-operativo-cpsl-65ad52160f45.json', 'utf8'));
} else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

if (!sa) {
  console.log('⚠️ No se encontró Service Account para Firestore Admin. Omitiendo ejecución directa.');
  process.exit(0);
}

if (!getApps().length) {
  initializeApp({ credential: cert(sa) });
}
const db = getFirestore();

async function run() {
  console.log('🔄 Iniciando recuperación de avance de Erika Gavilánez...');

  // 1. Tarea principal: custom_1790898436987
  const taskRef1 = db.collection('tasks').doc('custom_1790898436987');
  const snap1 = await taskRef1.get();
  if (snap1.exists) {
    const data1 = snap1.data();
    const assigneeMap = { ...(data1.assigneeProgress || {}) };
    const erikaKey = Object.keys(assigneeMap).find(k => k.toLowerCase().includes('erika.gavilanez')) || 'erika.gavilanez@crearpsl.net';
    
    assigneeMap[erikaKey] = {
      ...(assigneeMap[erikaKey] || {}),
      name: assigneeMap[erikaKey]?.name || 'Erika Gissell Gavilánez Gallardo',
      role: assigneeMap[erikaKey]?.role || 'coord_maestria',
      sede: assigneeMap[erikaKey]?.sede || 'quito',
      completed: true,
      completedAt: assigneeMap[erikaKey]?.completedAt || '2026-10-04T18:00:00.000Z',
      progress: 100
    };

    const entries = Object.values(assigneeMap);
    const sum = entries.reduce((acc, c) => acc + (typeof c.progress === 'number' ? c.progress : (c.completed ? 100 : 0)), 0);
    const overall = Math.round(sum / entries.length);
    const allDone = entries.every(c => c.completed === true || c.progress === 100);

    const notes = Array.isArray(data1.progressNotes) ? [...data1.progressNotes] : [];
    notes.unshift({
      id: `note_auto_recovery_${Date.now()}`,
      text: `Avance individual registrado por Erika Gissell Gavilánez Gallardo: 100%. Avance general del equipo: ${overall}%. (Recuperado)`,
      createdAt: new Date().toISOString(),
      authorName: 'Erika Gissell Gavilánez Gallardo',
      authorEmail: 'erika.gavilanez@crearpsl.net',
      progressPercentage: overall
    });

    await taskRef1.update({
      assigneeProgress: assigneeMap,
      progressPercentage: overall,
      progress: overall,
      completed: allDone,
      status: allDone ? 'Completada' : 'En progreso',
      progressNotes: notes,
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: 'erika.gavilanez@crearpsl.net',
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ custom_1790898436987 actualizada. Erika: 100%, Global: ${overall}%`);
  } else {
    console.log('ℹ️ Tarea custom_1790898436987 no encontrada en Firestore.');
  }

  // 2. Tarea secundaria si aplica: custom_1790665257137
  const taskRef2 = db.collection('tasks').doc('custom_1790665257137');
  const snap2 = await taskRef2.get();
  if (snap2.exists) {
    const data2 = snap2.data();
    const assigneeMap2 = { ...(data2.assigneeProgress || {}) };
    const erikaKey2 = Object.keys(assigneeMap2).find(k => k.toLowerCase().includes('erika.gavilanez')) || 'erika.gavilanez@crearpsl.net';
    if (assigneeMap2[erikaKey2] && !assigneeMap2[erikaKey2].completed) {
      assigneeMap2[erikaKey2] = {
        ...(assigneeMap2[erikaKey2] || {}),
        name: assigneeMap2[erikaKey2]?.name || 'Erika Gavilanez',
        role: assigneeMap2[erikaKey2]?.role || 'coord_maestria',
        sede: assigneeMap2[erikaKey2]?.sede || 'Quito',
        completed: true,
        completedAt: new Date().toISOString(),
        progress: 100
      };
      await taskRef2.update({
        assigneeProgress: assigneeMap2,
        updatedAt: new Date().toISOString()
      });
      console.log('✅ custom_1790665257137 actualizada para Erika.');
    }
  }

  console.log('🎉 Recuperación de datos completada exitosamente.');
}

run().catch(err => {
  console.error('❌ Error en script de recuperación:', err);
  process.exit(1);
});
