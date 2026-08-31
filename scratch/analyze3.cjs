const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function main() {
  const usersSnapshot = await db.collection('users').get();
  const users = [];
  usersSnapshot.forEach(doc => {
    users.push({ id: doc.id, ...doc.data() });
  });

  console.log("=== USUARIOS CON ROLES MULTIPLES O NOMBRES SIMILARES EN 'USERS' ===");
  const found = new Set();
  
  users.forEach(u => {
      let hasMulti = false;
      if (u.roles && Array.isArray(u.roles) && u.roles.length > 1) {
          hasMulti = true;
      }
      if (u.appRole && u.roles && u.roles.includes && !u.roles.includes(u.appRole)) {
          // just checking
      }
      
      if (hasMulti) {
          console.log('\nRoles mltiples:');
          console.log(' - Nombre:', u.name || u.displayName);
          console.log(' - Email:', u.email);
          console.log(' - appRole (principal):', u.appRole);
          console.log(' - roles (array):', u.roles);
      }
  });
  
  // Similar names in users
  function getNormalizedParts(name) {
    if (!name) return [];
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().split(/\s+/);
  }

  function areNamesSimilar(name1, name2) {
    const parts1 = getNormalizedParts(name1);
    const parts2 = getNormalizedParts(name2);
    let matches = 0;
    for (const p of parts1) {
        if (p.length > 2 && parts2.includes(p)) matches++;
    }
    return matches >= 2;
  }
  
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const p1 = users[i];
      const p2 = users[j];
      
      const n1 = p1.name || p1.displayName || p1.email;
      const n2 = p2.name || p2.displayName || p2.email;
      
      if (areNamesSimilar(n1, n2)) {
          const key = [n1, n2].sort().join(' | ');
          if (!found.has(key)) {
              found.add(key);
              console.log('\nSimilares en USERS:');
              console.log(' -', n1, '| Email:', p1.email, '| appRole:', p1.appRole);
              console.log(' -', n2, '| Email:', p2.email, '| appRole:', p2.appRole);
          }
      }
    }
  }

}
main();
