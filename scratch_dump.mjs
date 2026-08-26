import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCTMrA6A64s1ppDBBsol-fqam5Vch_Q5B0",
  authDomain: "centro-operativo-cpsl.firebaseapp.com",
  projectId: "centro-operativo-cpsl",
  storageBucket: "centro-operativo-cpsl.firebasestorage.app",
  messagingSenderId: "122588918051",
  appId: "1:122588918051:web:c85d6835b1b1f920fb1c96"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function dumpNodus() {
  const docRef = doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    console.log("=== TIMESTAMP ===");
    console.log(data.timestamp);
    console.log("\n=== SECCIONES KEYS ===");
    console.log(Object.keys(data.secciones || {}));
    
    if (data.secciones?.actividadCoordinadores?.kpis) {
      const kpis = data.secciones.actividadCoordinadores.kpis;
      console.log(`\n=== TOTAL KPI CARDS: ${kpis.length} ===`);
      kpis.forEach((kpi, i) => {
        console.log(`\n--- KPI CARD ${i} ---`);
        console.log("content:", JSON.stringify(kpi.content, null, 2));
      });
    } else {
      console.log("\n=== NO actividadCoordinadores.kpis found ===");
      console.log("Available sections:", JSON.stringify(Object.keys(data.secciones || {})));
      // Dump first 3000 chars of secciones to understand structure
      const secStr = JSON.stringify(data.secciones, null, 2);
      console.log("\n=== SECCIONES SAMPLE (first 5000 chars) ===");
      console.log(secStr.substring(0, 5000));
    }
  } else {
    console.log("No document found!");
  }
  process.exit(0);
}

dumpNodus();
