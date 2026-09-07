import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin (assuming credentials are set or using default)
const serviceAccountPath = join(__dirname, '..', 'firebase-service-account.json');
try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  // Fallback to application default credentials if file doesn't exist
  admin.initializeApp();
}

const db = admin.firestore();

// We need a lightweight version of cyclesData since this is Node and we can't easily import the React module if it uses JSX or something, but it's just JS so we can read it.
const cyclesDataPath = join(__dirname, '..', 'src', 'data', 'cyclesData.js');
let cyclesData = [];
try {
  const fileContent = readFileSync(cyclesDataPath, 'utf8');
  // quick regex extract
  const match = fileContent.match(/export const cyclesData = (\[.*?\]);/s);
  if (match) {
    cyclesData = JSON.parse(match[1]);
  }
} catch (e) {
  console.error("No se pudo cargar cyclesData", e);
}

const runDaemon = async () => {
  console.log("Iniciando Recurring Tasks Daemon...");
  const now = new Date();
  
  const snapshot = await db.collection('recurring_tasks_templates').where('active', '==', true).get();
  console.log(`Encontradas ${snapshot.size} plantillas recurrentes activas.`);

  for (const doc of snapshot.docs) {
    const template = doc.data();
    const recurrence = template.recurrence;
    if (!recurrence) continue;

    // Check upcoming cycles
    for (const cycle of cyclesData) {
      let targetDateStr = null;

      if (recurrence.cycle === 'C1' || recurrence.cycle === 'TODOS') {
        if (recurrence.phase === 'PRE') targetDateStr = cycle.c1_start;
        else if (recurrence.phase === 'DURING') targetDateStr = cycle.c1_start; // simplify
        else if (recurrence.phase === 'POST') targetDateStr = cycle.c1_end;
      }
      if (!targetDateStr && (recurrence.cycle === 'C2' || recurrence.cycle === 'TODOS')) {
        if (recurrence.phase === 'PRE') targetDateStr = cycle.c2_start;
        else if (recurrence.phase === 'DURING') targetDateStr = cycle.c2_start;
        else if (recurrence.phase === 'POST') targetDateStr = cycle.c2_end;
      }
      if (!targetDateStr && (recurrence.cycle === 'MJ' || recurrence.cycle === 'TODOS')) {
        if (recurrence.phase === 'PRE') targetDateStr = cycle.maestria_start;
        else if (recurrence.phase === 'DURING') targetDateStr = cycle.maestria_start;
        else if (recurrence.phase === 'POST') targetDateStr = cycle.maestria_end;
      }

      if (!targetDateStr) continue;

      const targetDate = new Date(targetDateStr);
      const diffDays = (targetDate.getTime() - now.getTime()) / (1000 * 3600 * 24);

      // Si la fecha objetivo está dentro del rango "daysBefore" a 0 días...
      if (diffDays <= recurrence.daysBefore && diffDays >= 0) {
        // Crear la tarea si no existe
        const generatedTaskId = `${doc.id}_${cycle.id}_${recurrence.phase}`;
        const existingTask = await db.collection('tasks').doc(generatedTaskId).get();
        
        if (!existingTask.exists) {
          console.log(`Generando tarea para plantilla ${template.task} para el ciclo ${cycle.name}`);
          
          const { recurrence: _, active: __, id: ___, ...taskData } = template;
          
          await db.collection('tasks').doc(generatedTaskId).set({
            ...taskData,
            id: generatedTaskId,
            templateId: doc.id,
            cycleId: cycle.id,
            completed: false,
            status: 'Pendiente',
            created_at: new Date().toISOString(),
            deadline: targetDateStr + " 18:00" // as fallback
          });

          // AQUI IRIA LA NOTIFICACIÓN POR EMAIL O IN-APP
          // Se puede integrar con sendEmail de tu mailerDaemon
        }
      }
    }
  }
  
  console.log("Recurring Tasks Daemon finalizado.");
};

runDaemon().catch(console.error);
