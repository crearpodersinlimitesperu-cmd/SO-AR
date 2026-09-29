import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { NodusManagersSheetAgent } from './agentSincronizadorSheets.mjs';

const saPath = 'C:/Users/josem/Documents/SO-AR/centro-operativo-cpsl-3d05655c949c.json';
if (!existsSync(saPath)) {
  console.error("No service account json found");
  process.exit(1);
}
const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'));

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}
const db = getFirestore();

async function run() {
  const agent = new NodusManagersSheetAgent(db);
  await agent.syncManagersFromSheet();
  process.exit(0);
}

run();
