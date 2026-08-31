import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

dotenv.config({ path: 'c:/Users/josem/Downloads/cpsl-base-template/.env' });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Read usersToImport.js as raw text and extract the array
const raw = readFileSync('c:/Users/josem/Downloads/cpsl-base-template/src/data/usersToImport.js', 'utf-8');
const jsonText = raw.replace('export const USERS_TO_IMPORT =', '').trim().replace(/;$/, '');
const users = JSON.parse(jsonText);

const normalizeRole = (role) => {
  if (!role) return 'miembro';
  const r = role.toLowerCase().trim();
  if (r.includes('coordinador') && (r.includes('c1') || r.includes('c2') || r.includes('cap'))) return 'coord_c1';
  if (r.includes('coordinador') && (r.includes('maestr') || r.includes('mj'))) return 'coord_maestria';
  if (r.includes('gerente')) return 'gerente';
  if (r === 'qt') return 'qt';
  if (r === 'capitan' || r.includes('capit')) return 'capitan';
  if (r.includes('ceo') || r.includes('cco') || r.includes('socio')) return 'direccion';
  return r;
};

const normalizeSede = (sede) => {
  if (!sede) return 'Sede Global';
  const s = sede.trim();
  if (s === 'MED' || s.toLowerCase().includes('medell')) return 'Medellín';
  if (s === 'LIM' || s.toLowerCase().includes('lima')) return 'Lima';
  if (s === 'CUE' || s.toLowerCase().includes('cuenca')) return 'Cuenca';
  if (s === 'GYE' || s.toLowerCase().includes('guayaquil')) return 'Guayaquil';
  if (s === 'MEX' || s.toLowerCase().includes('mex')) return 'México';
  if (s === 'UIO-C1') return 'Quito Ciclo 1';
  if (s === 'UIO-C2') return 'Quito Ciclo 2';
  if (s === 'UIO' || s.toLowerCase().includes('quito')) return 'Quito Ciclo 1';
  if (s === 'INT' || s.toLowerCase().includes('intern')) return 'Internacional';
  if (s.toLowerCase().includes('global')) return 'Sede Global';
  return s;
};

async function syncAllUsers() {
  console.log(`\n🚀 Iniciando sincronización de ${users.length} usuarios a Firestore...`);
  let created = 0, updated = 0, errors = 0;

  for (const user of users) {
    try {
      const uid = user.id || user.emails[0].split('@')[0].replace(/[^a-z0-9]/gi, '_');
      const userRef = doc(db, 'users', uid);
      const existing = await getDoc(userRef);
      
      const userData = {
        id: uid,
        name: user.name,
        role: normalizeRole(user.role),
        sede: normalizeSede(user.sede),
        emails: user.emails.map(e => e.toLowerCase().trim()),
        updatedAt: new Date().toISOString(),
        source: 'bootstrapSync'
      };

      if (existing.exists()) {
        await setDoc(userRef, userData, { merge: true });
        updated++;
      } else {
        await setDoc(userRef, userData);
        created++;
      }
    } catch (e) {
      console.error(`  ❌ Error con ${user.name}: ${e.message}`);
      errors++;
    }
  }
  console.log(`  ✅ Creados: ${created} | Actualizados: ${updated} | Errores: ${errors}`);
}

async function createSuperAdmin() {
  console.log('\n👑 Creando documento SuperAdmin en Firestore...');
  const email = 'jose.sanchez@crearpsl.net';
  const uid = 'jose_sanchez_crearpsl';
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    id: uid,
    name: 'José Sánchez',
    role: 'direccion',
    sede: 'Sede Global',
    emails: [email, 'jose.sanchez@crearpls.com'],
    isSuperAdmin: true,
    updatedAt: new Date().toISOString(),
    source: 'bootstrapSync'
  }, { merge: true });
  console.log(`  ✅ SuperAdmin (${email}) creado/actualizado en Firestore`);
}

(async () => {
  await syncAllUsers();
  await createSuperAdmin();
  console.log('\n✅ Sincronización completa. Cerrando...');
  process.exit(0);
})();
