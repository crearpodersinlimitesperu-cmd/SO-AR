import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

const serviceAccountPath = join(process.cwd(), 'centro-operativo-cpsl-65ad52160f45.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const deadline = new Date(Date.now() + 6 * 60 * 60 * 1000);
  
  const yyyy = deadline.getFullYear();
  const mm = String(deadline.getMonth() + 1).padStart(2, '0');
  const dd = String(deadline.getDate()).padStart(2, '0');
  const hh = String(deadline.getHours()).padStart(2, '0');
  const min = String(deadline.getMinutes()).padStart(2, '0');
  const deadlineStr = `${yyyy}-${mm}-${dd}T${hh}:${min}`;

  const taskData = {
    title: "Cerrar la liquidación de pago de los que terminaron sus llamadas",
    task: "Cerrar la liquidación de pago de los que terminaron sus llamadas",
    description: "Actualización urgente generada por Causa OS para seguimiento coordinado. Se requiere cerrar las liquidaciones de pago de todos los que terminaron sus llamadas.",
    priority: "🔴 ROJO",
    isCritical: true,
    assignedRoles: ["coord_maestria", "coordinador_mj", "director_maestria", "gerente", "direccion", "entrenador"],
    createdBy: "Causa OS",
    assignedByName: "Causa OS (Colaborativo)",
    assignedByEmail: "causa.os@crearpsl.com",
    deadline: deadlineStr,
    created_at: new Date().toISOString(),
    collaborative: true,
    status: "Pendiente",
    completed: false
  };

  const customId = `custom_${Date.now()}`;
  await db.collection('tasks').doc(customId).set(taskData);
  console.log(`Tarea ${customId} creada exitosamente!`);
  console.log(taskData);
  process.exit(0);
}

run().catch(console.error);
