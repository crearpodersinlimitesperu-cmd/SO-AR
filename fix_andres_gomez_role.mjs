// fix_andres_gomez_role.mjs
// ACCIÓN QUE SÍ ESCRIBE EN FIRESTORE — ejecútalo solo si ya corriste
// audit_roster.mjs y confirmaste, en audit_roster_report.json -> andresGomezRole,
// que su documento real en "users" y/o "qt_directory" NO tiene role: "director_maestria".
//
// Qué hace: en cada colección donde exista un documento de Andrés Gómez
// (andres.gomez@crearpsl.net), fuerza role = "director_maestria" y
// roles = ["director_maestria"] (agregando "entrenador" si ya lo tenía, porque
// permissions.js lo trata como entrenador dual). NO toca ningún otro campo.
//
// Uso: node fix_andres_gomez_role.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const TARGET_EMAIL = 'andres.gomez@crearpsl.net';
const normEmail = (e) => (e || '').toString().trim().toLowerCase();

async function fixInCollection(collectionName) {
  const snap = await db.collection(collectionName).get();
  let updated = 0;
  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    const matches = normEmail(d.email) === TARGET_EMAIL || (Array.isArray(d.emails) && d.emails.some(e => normEmail(e) === TARGET_EMAIL));
    if (!matches) continue;

    const currentRoles = Array.isArray(d.roles) ? d.roles : (d.role ? [d.role] : []);
    const newRoles = Array.from(new Set(['director_maestria', ...currentRoles.filter(r => r !== 'coord_maestria' && r !== 'coordinador_mj')]));

    if (d.role === 'director_maestria' && JSON.stringify((d.roles || []).slice().sort()) === JSON.stringify(newRoles.slice().sort())) {
      console.log(`[${collectionName}] ${docSnap.id}: ya estaba correcto, no se modifica.`);
      continue;
    }

    console.log(`[${collectionName}] ${docSnap.id}: role "${d.role}" -> "director_maestria", roles ${JSON.stringify(d.roles || [])} -> ${JSON.stringify(newRoles)}`);
    await docSnap.ref.update({ role: 'director_maestria', roles: newRoles });
    updated++;
  }
  return updated;
}

async function run() {
  const collections = ['users', 'qt_directory'];
  let total = 0;
  for (const col of collections) {
    total += await fixInCollection(col);
  }
  console.log(`\nListo. Documentos actualizados: ${total}.`);
  console.log('IMPORTANTE: esto NO toca "staff_directory" (el roster maestro) — si ahí también está mal, corrígelo aparte.');
  process.exit(0);
}

run().catch(err => {
  console.error('Error aplicando la corrección:', err);
  process.exit(1);
});
