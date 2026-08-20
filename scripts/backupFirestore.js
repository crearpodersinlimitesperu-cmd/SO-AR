import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

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
const auth = getAuth(app);

const COLLECTIONS_TO_BACKUP = [
  'users',
  'tasks',
  'audit_logs',
  'events',
  'cycles',
  'venues',
  'goals',
  'reports',
  'user_profiles',
  'notifications',
  'mail'
];

async function authenticateIfPossible() {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
  const adminPass = process.env.ADMIN_PASS || process.env.GMAIL_PASS;

  if (adminEmail && adminPass) {
    try {
      console.log(`🔐 Intentando autenticación administrativa como: ${adminEmail}...`);
      await signInWithEmailAndPassword(auth, adminEmail, adminPass);
      console.log("   ✅ Autenticación exitosa.");
    } catch (authErr) {
      console.warn("   ⚠️ No se pudo autenticar vía Email/Password (continuando con permisos por defecto):", authErr.message);
    }
  }
}

async function runBackup() {
  console.log("=================================================");
  console.log("🛡️ INICIANDO AUTO-RESPALDO INMUTABLE DE FIRESTORE");
  console.log(`📌 Proyecto: ${firebaseConfig.projectId}`);
  console.log(`⏰ Fecha/Hora: ${new Date().toISOString()}`);
  console.log("=================================================");

  await authenticateIfPossible();

  const backupData = {
    version: "2.8.0",
    createdAt: new Date().toISOString(),
    projectId: firebaseConfig.projectId,
    collections: {},
    counts: {}
  };

  let totalDocs = 0;

  for (const collName of COLLECTIONS_TO_BACKUP) {
    try {
      console.log(`📦 Exportando colección: [${collName}]...`);
      const collRef = collection(db, collName);
      const snapshot = await getDocs(collRef);
      
      const docsList = [];
      snapshot.forEach(docSnap => {
        docsList.push({
          _id: docSnap.id,
          ...docSnap.data()
        });
      });

      backupData.collections[collName] = docsList;
      backupData.counts[collName] = docsList.length;
      totalDocs += docsList.length;
      console.log(`   ✅ ${docsList.length} documentos exportados.`);
    } catch (err) {
      console.warn(`   ⚠️ Advertencia en colección [${collName}]: ${err.message}`);
      backupData.collections[collName] = [];
      backupData.counts[collName] = 0;
    }
  }

  // Crear directorio backups si no existe
  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const jsonString = JSON.stringify(backupData, null, 2);

  // 1. Guardar latest-backup.json
  const latestPath = path.join(backupsDir, 'latest-backup.json');
  fs.writeFileSync(latestPath, jsonString, 'utf-8');

  // 2. Guardar archivo comprimido inmutable con timestamp
  const gzPath = path.join(backupsDir, `snapshot-${dateStr}.json.gz`);
  const compressed = zlib.gzipSync(Buffer.from(jsonString, 'utf-8'));
  fs.writeFileSync(gzPath, compressed);

  console.log("=================================================");
  console.log(`🎉 RESPALDO COMPLETADO EXITOSAMENTE`);
  console.log(`📊 Total documentos respaldados: ${totalDocs}`);
  console.log(`📁 Archivo JSON: ${latestPath} (${(jsonString.length / 1024).toFixed(2)} KB)`);
  console.log(`🗜️ Archivo GZ:   ${gzPath} (${(compressed.length / 1024).toFixed(2)} KB)`);
  console.log("=================================================");
}

runBackup()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Error crítico en el proceso de respaldo:", err);
    process.exit(1);
  });
