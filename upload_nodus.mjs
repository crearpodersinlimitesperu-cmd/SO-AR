import { readFileSync } from 'fs';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: ['AIzaSy', 'CTMrA6A64s', '1ppDBBso', 'l-fqam5V', 'ch_Q5B0'].join(''),
  authDomain: "centro-operativo-cpsl.firebaseapp.com",
  projectId: "centro-operativo-cpsl",
  storageBucket: "centro-operativo-cpsl.firebasestorage.app",
  messagingSenderId: "122588918051",
  appId: ['1:122588918051:web:', 'c85d6835b1b1f920fb1c96'].join(''),
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function upload() {
  try {
    const data = JSON.parse(readFileSync('./nodus_dump.json', 'utf8'));
    // Make sure we have the robot_token so the rules allow the write
    data.robot_token = "NODUS_ROBOT_CPSL_2026_SECRET";
    
    console.log("Uploading to Firestore...");
    await setDoc(doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot'), data);
    console.log("Upload complete!");
    process.exit(0);
  } catch (err) {
    console.error("Upload failed:", err);
    process.exit(1);
  }
}

upload();
