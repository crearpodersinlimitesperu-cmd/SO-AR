/**
 * restoreCrmSync.mjs
 * Restaura colecciones respaldadas por backupBeforeCrmSync.mjs.
 * Uso:
 *   node scripts/restoreCrmSync.mjs <path-al-backup.json>
 *   node scripts/restoreCrmSync.mjs   <- usa el backup mas reciente automaticamente
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

// Maximo seguro: 490 ops por batch (limite real de Firestore es 500)
const BATCH_SIZE = 490;

function findLatestBackup() {
  const backupsDir = path.resolve('./scripts/backups');
  if (!fs.existsSync(backupsDir)) {
    console.error(`❌ No existe la carpeta de backups: ${backupsDir}`);
    process.exit(1);
  }
  const files = fs
    .readdirSync(backupsDir)
    .filter((f) => f.startsWith('crm-sync-backup-') && f.endsWith('.json'))
    .sort()
    .reverse();
  if (files.length === 0) {
    console.error('❌ No se encontro ningun archivo crm-sync-backup-*.json en scripts/backups/');
    process.exit(1);
  }
  const latest = path.join(backupsDir, files[0]);
  console.log(`🔍 Backup mas reciente encontrado automaticamente:\n   ${latest}\n`);
  return latest;
}

async function restoreCollection(collectionName, docs) {
  const docEntries = Object.entries(docs);
  const total = docEntries.length;
  if (total === 0) {
    console.log(`  ⏭️  "${collectionName}": 0 docs - nada que restaurar.`);
    return 0;
  }
  let restored = 0;
  let batchIndex = 0;
  while (batchIndex < total) {
    const chunk = docEntries.slice(batchIndex, batchIndex + BATCH_SIZE);
    const batch = db.batch();
    for (const [docId, data] of chunk) {
      const ref = db.collection(collectionName).doc(docId);
      batch.set(ref, data);  // merge:false por defecto -> restauracion exacta
    }
    await batch.commit();
    restored += chunk.length;
    batchIndex += BATCH_SIZE;
    if (total > BATCH_SIZE) {
      console.log(`    Lote confirmado: ${Math.min(batchIndex, total)}/${total} docs en "${collectionName}"`);
    }
  }
  return restored;
}

async function main() {
  console.log('=== 🔄 Restauracion CRM Sync Backup ===');
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const argPath = process.argv[2];
  let backupPath;
  if (argPath) {
    backupPath = path.resolve(argPath);
    if (!fs.existsSync(backupPath)) {
      console.error(`❌ Archivo no encontrado: ${backupPath}`);
      process.exit(1);
    }
    console.log(`📂 Usando backup especificado:\n   ${backupPath}\n`);
  } else {
    backupPath = findLatestBackup();
  }

  let backup;
  try {
    backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  } catch (err) {
    console.error(`❌ Error al leer el archivo de backup: ${err.message}`);
    process.exit(1);
  }

  const meta = backup._meta || {};
  console.log(`ℹ️  Backup creado el: ${meta.createdAt || "desconocido"}`);
  console.log(`ℹ️  Colecciones en el backup: ${(meta.collections || []).join(", ")}\n`);

  const collectionNames = Object.keys(backup).filter((k) => k !== '_meta');
  if (collectionNames.length === 0) {
    console.warn('⚠️  El backup no contiene colecciones. Nada que restaurar.');
    process.exit(0);
  }

  const results = {};
  for (const collectionName of collectionNames) {
    process.stdout.write(`  Restaurando "${collectionName}"... `);
    const docs = backup[collectionName];
    const count = await restoreCollection(collectionName, docs);
    results[collectionName] = count;
    if (count > 0) console.log(`✅ ${count} docs restaurados`);
  }

  console.log('\n=== ✅ Restauracion completada. Colecciones:');
  const parts = Object.entries(results).map(([col, n]) => `${col} (${n} docs)`);
  console.log(`  ${parts.join(", ")}`);
}

main().catch((err) => {
  console.error('❌ Error durante la restauracion:', err);
  process.exit(1);
});
