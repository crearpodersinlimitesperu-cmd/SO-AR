import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCTMrA6A64s1ppDBBsol-fqam5Vch_Q5B0",
  authDomain: "centro-operativo-cpsl.firebaseapp.com",
  projectId: "centro-operativo-cpsl",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanTasks() {
  try {
    const qs = await getDocs(collection(db, "tasks"));
    console.log(`Total tasks found: ${qs.size}`);
    
    let count = 0;
    const batch = writeBatch(db);
    
    qs.forEach((d) => {
      const data = d.data();
      const email = (data.assignedToEmail || '').toLowerCase();
      const emails = (data.assignedToEmails || []).map(e => e.toLowerCase());
      const role = data.role;
      
      const isFerOrPaul = 
        email === 'fer.aragon@crearpsl.net' || 
        email === 'paul.sosa@crearpsl.net' ||
        emails.includes('fer.aragon@crearpsl.net') ||
        emails.includes('paul.sosa@crearpsl.net');

      // Si tienen tareas asignadas o generadas con roles gerencia/direccion y cayeron en ellos
      if (isFerOrPaul) {
        batch.delete(doc(db, "tasks", d.id));
        count++;
        console.log(`Deleting task ${d.id} assigned to ${email || emails.join(',')}`);
      }
    });

    if (count > 0) {
      // await batch.commit();
      console.log(`Would delete ${count} tasks. (Dry run)`);
    } else {
      console.log("No tasks found assigned to Fer or Paul.");
    }
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
cleanTasks();
