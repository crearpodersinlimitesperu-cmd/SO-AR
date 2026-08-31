const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function main() {
  const managersSnapshot = await db.collection('managers_directory').get();
  const managers = [];
  managersSnapshot.forEach(doc => {
    managers.push({ id: doc.id, ...doc.data() });
  });

  const names = {};
  managers.forEach(m => {
    const name = m.nombre ? m.nombre.trim().toLowerCase() : '';
    if (!names[name]) names[name] = [];
    names[name].push(m);
  });

  console.log("=== DUPLICADOS EN CENTRO DE MANAGERS ===");
  let hasDupes = false;
  for (const [name, list] of Object.entries(names)) {
    if (list.length > 1) {
      hasDupes = true;
      console.log('Duplicado:', name);
      list.forEach(m => console.log(' -> ID:', m.id, '| Equipo:', m.equipo, '| Rol:', m.rol, '| Sede:', m.sede));
    }
  }
  if(!hasDupes) console.log("No hay duplicados exactos en Centro de Managers.");

  const qtSnapshot = await db.collection('qt_directory').get();
  const qtMembers = [];
  qtSnapshot.forEach(doc => {
    qtMembers.push({ id: doc.id, ...doc.data() });
  });

  const qtNames = {};
  qtMembers.forEach(m => {
    const name = m.nombre ? m.nombre.trim().toLowerCase() : '';
    if (!qtNames[name]) qtNames[name] = [];
    qtNames[name].push(m);
  });

  console.log("\n=== DUPLICADOS EN DIRECTORIO QT ===");
  hasDupes = false;
  for (const [name, list] of Object.entries(qtNames)) {
    if (list.length > 1) {
      hasDupes = true;
      console.log('Duplicado:', name);
      list.forEach(m => console.log(' -> ID:', m.id, '| Sede:', m.sede, '| Rol:', m.rol));
    }
  }
  if(!hasDupes) console.log("No hay duplicados exactos en Directorio QT.");
}
main();
