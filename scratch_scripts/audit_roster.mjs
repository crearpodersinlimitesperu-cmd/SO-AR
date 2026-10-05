// audit_roster.mjs
// Script de SOLO LECTURA (no modifica nada) para auditar:
//  1) Duplicados de usuarios entre las colecciones "users" y "qt_directory".
//  2) Personas de "staff_directory" (roster maestro) que aún no tienen ningún
//     registro de conexión real en "user_profiles" (nunca han iniciado sesión).
//  3) Estado de habilitación en Firebase Authentication de cada persona marcada
//     STATUS = DESERTOR en "staff_directory" (para saber si de verdad ya no
//     pueden entrar a la plataforma).
//  4. El rol actualmente guardado en Firestore para Andrés Gómez, para confirmar
//     si sigue desincronizado respecto al que debería ser (director_maestria).
//
// Uso: node audit_roster.mjs
// Requiere el mismo archivo de credenciales que export_users.mjs / check_auth.mjs
// (./centro-operativo-cpsl-65ad52160f45.json) y conexión a internet real.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync, writeFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const auth = getAuth();

const normEmail = (e) => (e || '').toString().trim().toLowerCase();

async function run() {
  const report = {
    generatedAt: new Date().toISOString(),
    duplicates: [],
    staffWithoutConnection: [],
    desertoresAuthStatus: [],
    andresGomezRole: null,
    totals: {}
  };

  // --- 1. Cargar las 3 fuentes que usa getAllCompanyUsers() en la app ---
  const usersSnap = await db.collection('users').get();
  const qtSnap = await db.collection('qt_directory').get();
  const staffSnap = await db.collection('staff_directory').get();
  const profilesSnap = await db.collection('user_profiles').get();

  const usersDocs = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const qtDocs = qtSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const staffDocs = staffSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  report.totals = {
    users: usersDocs.length,
    qt_directory: qtDocs.length,
    staff_directory: staffDocs.length,
    user_profiles: profilesSnap.size
  };

  // --- 2. Detectar duplicados reales: mismo email normalizado apareciendo
  //         más de una vez entre "users" + "qt_directory" ---
  const emailIndex = new Map(); // normEmail -> [{source, id, name, role}]
  const registerDoc = (doc, source) => {
    const keys = new Set();
    const primary = normEmail(doc.email);
    if (primary) keys.add(primary);
    (Array.isArray(doc.emails) ? doc.emails : []).forEach(e => {
      const k = normEmail(e);
      if (k) keys.add(k);
    });
    if (keys.size === 0) return; // sin email: no se puede cruzar, se reporta aparte
    keys.forEach(k => {
      if (!emailIndex.has(k)) emailIndex.set(k, []);
      emailIndex.get(k).push({ source, id: doc.id, name: doc.name || doc.displayName || 'Sin nombre', role: doc.role || 'Sin rol' });
    });
  };
  usersDocs.forEach(d => registerDoc(d, 'users'));
  qtDocs.forEach(d => registerDoc(d, 'qt_directory'));

  for (const [email, entries] of emailIndex.entries()) {
    // Si el mismo email aparece en más de un doc distinto (o más de un doc del mismo id repetido), es duplicado
    const uniqueIds = new Set(entries.map(e => `${e.source}:${e.id}`));
    if (uniqueIds.size > 1) {
      report.duplicates.push({ email, entries });
    }
  }

  const usersWithoutEmail = usersDocs.filter(d => !normEmail(d.email) && !(Array.isArray(d.emails) && d.emails.some(normEmail)));
  report.totals.usersDocsWithoutEmail = usersWithoutEmail.length;
  report.usersDocsWithoutEmailSample = usersWithoutEmail.slice(0, 10).map(d => ({ id: d.id, name: d.name || d.displayName || null, role: d.role || null }));

  // --- 3. Cruzar staff_directory contra user_profiles (última conexión real) ---
  const profileEmails = new Set(profilesSnap.docs.map(d => normEmail(d.id)));
  for (const person of staffDocs) {
    const candidateEmails = new Set();
    if (person.email) candidateEmails.add(normEmail(person.email));
    if (person['Email CREARPSL.NET']) candidateEmails.add(normEmail(person['Email CREARPSL.NET']));
    if (Array.isArray(person.emails)) person.emails.forEach(e => candidateEmails.add(normEmail(e)));

    const hasConnected = [...candidateEmails].some(e => profileEmails.has(e));
    if (!hasConnected && candidateEmails.size > 0) {
      report.staffWithoutConnection.push({
        nombre: person.Nombre || person.name || person.id,
        emails: [...candidateEmails],
        status: person.STATUS || null
      });
    }
  }

  // --- 4. Estado real en Firebase Auth de cada DESERTOR marcado en staff_directory ---
  const desertores = staffDocs.filter(p => (p.STATUS || '').toString().toUpperCase() === 'DESERTOR');
  for (const d of desertores) {
    const candidateEmails = new Set();
    if (d.email) candidateEmails.add(normEmail(d.email));
    if (d['Email CREARPSL.NET']) candidateEmails.add(normEmail(d['Email CREARPSL.NET']));
    let authInfo = null;
    for (const email of candidateEmails) {
      try {
        const userRecord = await auth.getUserByEmail(email);
        authInfo = { email, uid: userRecord.uid, disabled: userRecord.disabled };
        break;
      } catch (e) {
        // no existe con ese email, seguir probando el siguiente
      }
    }
    report.desertoresAuthStatus.push({
      nombre: d.Nombre || d.name || d.id,
      emailsRevisados: [...candidateEmails],
      firebaseAuth: authInfo || 'NO ENCONTRADO (no tiene cuenta de Firebase Auth con esos correos)'
    });
  }

  // --- 5. Estado actual del rol de Andrés Gómez en Firestore ---
  const andresDocs = [...usersDocs, ...qtDocs, ...staffDocs].filter(d => normEmail(d.email) === 'andres.gomez@crearpsl.net' || (Array.isArray(d.emails) && d.emails.some(e => normEmail(e) === 'andres.gomez@crearpsl.net')));
  report.andresGomezRole = andresDocs.map(d => ({ coleccion: d.id ? undefined : undefined, id: d.id, role: d.role, roles: d.roles || null }));

  writeFileSync('audit_roster_report.json', JSON.stringify(report, null, 2));
  console.log('=== RESUMEN ===');
  console.log('Totales:', report.totals);
  console.log('Duplicados detectados (mismo email en users/qt_directory):', report.duplicates.length);
  console.log('Docs de "users" sin email (no se pueden cruzar):', report.totals.usersDocsWithoutEmail);
  console.log('Personas de staff_directory sin ninguna conexión registrada:', report.staffWithoutConnection.length);
  console.log('Registros DESERTOR encontrados:', desertores.length, '-> ver detalle de Firebase Auth en audit_roster_report.json');
  console.log('Registros de Andrés Gómez encontrados (revisa el campo role/roles de cada uno):', JSON.stringify(report.andresGomezRole, null, 2));
  console.log('\nReporte completo guardado en audit_roster_report.json');
  process.exit(0);
}

run().catch(err => {
  console.error('Error ejecutando la auditoría:', err);
  process.exit(1);
});
