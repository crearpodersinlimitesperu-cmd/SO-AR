/**
 * backupBeforeCrmSync.mjs
 * Respaldo seguro de las colecciones que el CRM puede modificar.
 * Uso: node scripts/backupBeforeCrmSync.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const KEY_FILE = './centro-operativo-cpsl-65ad52160f45.json';

if (!fs.existsSync(KEY_FILE)) {
  console.error(`❌ No se encontro el archivo de credenciales: ${KEY_FILE}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// Colecciones que el CRM puede modificar.
// Las marcadas optional:true se omiten silenciosamente si no existen.
const COLLECTIONS_TO_BACKUP = [
  { name: 'managers_directory',         optional: false },
  { name: 'participants',               optional: true  },
  { name: 'nodus_coordinadores_c1c2',   optional: true  },
  { name: 'kpis_entrenadores_llamadas', optional: false },
];

async function collectionExists(collectionName) {
  const snap = await db.collection(collectionName).limit(1).get();
  return !snap.empty;
}

async function backupCollection(collectionName) {
  const snap = await db.collection(collectionName).get();
  const docs = {};
  snap.forEach((doc) => {
    docs[doc.id] = doc.data();
  });
  return docs;
}

async function main() {
  console.log('=== 🔒 Backup antes de CRM Sync ===');
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const backupsDir = path.resolve('./scripts/backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
    console.log(`📁 Carpeta creada: ${backupsDir}`);
  }

  const backup = {
    _meta: {
      createdAt: new Date().toISOString(),
      purpose: 'backup-before-crm-sync',
      collections: [],
    },
  };

  const summary = {};

  for (const { name, optional } of COLLECTIONS_TO_BACKUP) {
    process.stdout.write(`  Respaldando "${name}"... `);

    const exists = await collectionExists(name);

    if (!exists && optional) {
      console.log('⏭️  (coleccion no encontrada, skip silencioso)');
      continue;
    }
    if (!exists && !optional) {
      console.log('⚠️  (coleccion vacia o inexistente, registrando 0 docs)');
      backup[name] = {};
      summary[name] = 0;
      backup._meta.collections.push(name);
      continue;
    }

    const docs = await backupCollection(name);
    const count = Object.keys(docs).length;
    backup[name] = docs;
    summary[name] = count;
    backup._meta.collections.push(name);
    console.log(`✅ ${count} docs`);
  }

  const isoRaw = new Date().toISOString();
  const tsClean = isoRaw
    .replace(/\.\d+Z$/, '')
    .replace(/:/g, '-')
    .replace(/\./g, '-');

  const fileName = `crm-sync-backup-${tsClean}.json`;
  const filePath = path.join(backupsDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf8');

  console.log('\n=== 📊 Resumen del backup ===');
  for (const [col, count] of Object.entries(summary)) {
    console.log(`  • ${col}: ${count} documentos`);
  }
  const totalDocs = Object.values(summary).reduce((a, b) => a + b, 0);
  console.log(`  TOTAL: ${totalDocs} documentos`);
  console.log(`\n✅ Backup guardado en:\n   ${filePath}`);
}

main().catch((err) => {
  console.error('❌ Error durante el backup:', err);
  process.exit(1);
});
