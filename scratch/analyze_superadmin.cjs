const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

function normalize(str) {
  if(!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ');
}

async function analyzeSuperAdminDuplicates() {
  const usersRef = db.collection('users');
  const snap = await usersRef.get();
  const users = [];
  snap.forEach(doc => {
    users.push({ id: doc.id, ...doc.data() });
  });

  const nameGroups = {};
  users.forEach(u => {
    const n = normalize(u.name || u.displayName || '');
    if (n) {
      if(!nameGroups[n]) nameGroups[n] = [];
      nameGroups[n].push(u);
    }
  });

  console.log("--- POSIBLES DUPLICADOS POR NOMBRE ---");
  for (const [name, list] of Object.entries(nameGroups)) {
    if (list.length > 1) {
      console.log(`\nNombre: ${name}`);
      list.forEach(u => console.log(` - ID: ${u.id} | Email: ${u.email} | Rol: ${u.appRole || u.role} | Roles: ${u.roles}`));
    }
  }

  // Verificar roles "basura" (minúsculas, custom)
  console.log("\n--- ROLES NO CANONICOS EN DB ---");
  const uniqueRoles = new Set();
  users.forEach(u => {
    if(u.appRole) uniqueRoles.add(u.appRole);
    if(u.role) uniqueRoles.add(u.role);
    if(u.roles) u.roles.forEach(r => uniqueRoles.add(r));
  });
  console.log(Array.from(uniqueRoles).sort());
}

analyzeSuperAdminDuplicates();
