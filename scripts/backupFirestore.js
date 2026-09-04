import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

let db;
let projectId = 'centro-operativo-cpsl';
const saPath = './centro-operativo-cpsl-65ad52160f45.json';

if (fs.existsSync(saPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    projectId = serviceAccount.project_id || projectId;
    if (!getApps().length) {
      initializeApp({ credential: cert(serviceAccount) });
    }
    db = getFirestore();
    console.log(`🔐 Autenticado con Service Account en proyecto: ${projectId}`);
  } catch (e) {
    console.warn("⚠️ Error leyendo Service Account:", e.message);
  }
}

if (!db) {
  if (!getApps().length) {
    initializeApp();
  }
  db = getFirestore();
}

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
  'mail',
  'qt_directory',
  'managers_directory',
  'staff_directory',
  'mj_calendars'
];

async function runBackup() {
  console.log("=================================================");
  console.log("🛡️ INICIANDO AUTO-RESPALDO INMUTABLE DE FIRESTORE");
  console.log(`📌 Proyecto: ${projectId}`);
  console.log(`⏰ Fecha/Hora: ${new Date().toISOString()}`);
  console.log("=================================================");

  const backupData = {
    version: "2.8.0",
    createdAt: new Date().toISOString(),
    projectId: projectId,
    collections: {},
    counts: {}
  };

  let totalDocs = 0;

  for (const collName of COLLECTIONS_TO_BACKUP) {
    try {
      console.log(`📦 Exportando colección: [${collName}]...`);
      const snapshot = await db.collection(collName).get();
      
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
