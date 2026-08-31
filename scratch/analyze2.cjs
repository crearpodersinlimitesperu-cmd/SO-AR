const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

function getNormalizedParts(name) {
    if (!name) return [];
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().split(/\s+/);
}

function areNamesSimilar(name1, name2) {
    const parts1 = getNormalizedParts(name1);
    const parts2 = getNormalizedParts(name2);
    
    // Si tienen al menos 2 partes iguales
    let matches = 0;
    for (const p of parts1) {
        if (p.length > 2 && parts2.includes(p)) matches++;
    }
    return matches >= 2;
}

async function main() {
  const managersSnapshot = await db.collection('managers_directory').get();
  const managers = [];
  managersSnapshot.forEach(doc => {
    managers.push({ id: doc.id, ...doc.data() });
  });
  
  const qtSnapshot = await db.collection('qt_directory').get();
  const qtMembers = [];
  qtSnapshot.forEach(doc => {
    qtMembers.push({ id: doc.id, ...doc.data() });
  });

  const allPeople = [...managers, ...qtMembers];

  console.log("=== POSIBLES DUPLICADOS / NOMBRES SIMILARES ===");
  const found = new Set();
  
  for (let i = 0; i < allPeople.length; i++) {
    for (let j = i + 1; j < allPeople.length; j++) {
      const p1 = allPeople[i];
      const p2 = allPeople[j];
      
      if (p1.id === p2.id) continue;
      
      if (areNamesSimilar(p1.nombre, p2.nombre)) {
          const key = [p1.nombre, p2.nombre].sort().join(' | ');
          if (!found.has(key)) {
              found.add(key);
              console.log('\nSimilares:');
              console.log(' -', p1.nombre, '| Rol:', p1.rol, '| Sede:', p1.sede, '| ID:', p1.id);
              console.log(' -', p2.nombre, '| Rol:', p2.rol, '| Sede:', p2.sede, '| ID:', p2.id);
          }
      }
    }
  }
}
main();
