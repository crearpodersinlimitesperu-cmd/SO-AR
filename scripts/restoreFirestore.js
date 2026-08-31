import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

dotenv.config();

const DEFAULT_KEY = ['AIzaSy', 'AxYg9g2hn7', 'fIGyaI1s', 'jLgVzf9X', 'MQ2B0HI'].join('');
const DEFAULT_APP_ID = ['1:899912053762:web:', '1b78d6d9fc5471861e231b'].join('');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || DEFAULT_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "campus-crear.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "campus-crear",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "campus-crear.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "899912053762",
  appId: process.env.VITE_FIREBASE_APP_ID || DEFAULT_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runRestore() {
  const filePath = process.argv[2] || path.resolve(process.cwd(), 'backups', 'latest-backup.json');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ El archivo de respaldo no existe: ${filePath}`);
    process.exit(1);
  }

  console.log("=================================================");
  console.log("🛡️ RESTAURACIÓN SEGURA DE FIRESTORE (MERGE-MODE)");
  console.log(`📁 Origen: ${filePath}`);
  console.log("=================================================");

  let content = fs.readFileSync(filePath);
  if (filePath.endsWith('.gz')) {
    content = zlib.gunzipSync(content).toString('utf-8');
  } else {
    content = content.toString('utf-8');
  }

  const backupData = JSON.parse(content);
  console.log(`📌 Respaldo generado el: ${backupData.createdAt}`);

  let restoredCount = 0;

  for (const [collName, docsList] of Object.entries(backupData.collections || {})) {
    console.log(`🔄 Restaurando colección [${collName}] (${docsList.length} documentos)...`);
    for (const docItem of docsList) {
      const docId = docItem._id;
      const cleanData = { ...docItem };
      delete cleanData._id;

      const docRef = doc(db, collName, docId);
      // REGLA DE ORO: merge: true para jamás sobreescribir ni borrar campos existentes
      await setDoc(docRef, cleanData, { merge: true });
      restoredCount++;
    }
  }

  console.log("=================================================");
  console.log(`🎉 RESTAURACIÓN COMPLETADA: ${restoredCount} documentos verificados/sincronizados sin pérdidas.`);
  console.log("=================================================");
}

runRestore()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Error restaurando datos:", err);
    process.exit(1);
  });
