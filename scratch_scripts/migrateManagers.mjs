/**
 * migrateManagers.mjs - Sube los 690 managers a Firestore
 * Uso: node migrateManagers.mjs EMAIL PASSWORD
 */
import { readFileSync } from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCTMrA6A64s1ppDBBsol-fqam5Vch_Q5B0",
  authDomain: "centro-operativo-cpsl.firebaseapp.com",
  projectId: "centro-operativo-cpsl",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Leer y parsear el backup
const raw = readFileSync("./backup/pre-repair-2026-08-21-15-08/src/data/managersData.js", "utf8");
const startIdx = raw.indexOf("export const INITIAL_MANAGERS = [") + "export const INITIAL_MANAGERS = ".length;
let depth = 0, endIdx = startIdx;
for (let i = startIdx; i < raw.length; i++) {
  if (raw[i] === "[") depth++;
  else if (raw[i] === "]") { depth--; if (depth === 0) { endIdx = i + 1; break; } }
}
const managers = eval(raw.substring(startIdx, endIdx));
console.log(`Managers cargados: ${managers.length}`);

// Login
const [,, email, password] = process.argv;
if (!email || !password) {
  console.error("Uso: node migrateManagers.mjs EMAIL PASSWORD");
  process.exit(1);
}

console.log(`Autenticando como ${email}...`);
const cred = await signInWithEmailAndPassword(auth, email, password);
console.log("Login exitoso:", cred.user.email);

// Subir en lotes de 400
const BATCH_SIZE = 400;
let uploaded = 0;

for (let i = 0; i < managers.length; i += BATCH_SIZE) {
  const chunk = managers.slice(i, i + BATCH_SIZE);
  const batch = writeBatch(db);
  for (const m of chunk) {
    const id = String(m.id || `m_${Date.now()}`);
    batch.set(doc(db, "managers_directory", id), m);
  }
  await batch.commit();
  uploaded += chunk.length;
  console.log(`Lote ${Math.ceil((i+1)/BATCH_SIZE)}: ${uploaded}/${managers.length} subidos`);
}

console.log(`\n MIGRACION COMPLETA: ${uploaded} managers en Firestore`);
process.exit(0);
