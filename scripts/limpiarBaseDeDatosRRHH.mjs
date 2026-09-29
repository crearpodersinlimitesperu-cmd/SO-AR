import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { NodusIdentityAgent } from './nodusIdentityAgent.mjs';
import fs from 'fs';

// Inicializar Firebase
const serviceAccountPath = './centro-operativo-cpsl-3d05655c949c.json';
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} else {
  console.error("No se encontró serviceAccountKey.json");
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();
const identitySentinel = new NodusIdentityAgent();

async function purgeFakes() {
  console.log("Iniciando purga de identidades falsas/antiguas en Firestore...");
  const roster = await identitySentinel.fetchMasterRoster();
  if (!roster || roster.length === 0) {
    console.error("No se pudo cargar la sabana maestra.");
    process.exit(1);
  }

  const collectionsToClean = ['nodus_coordinadores_c1c2', 'nodus_coordinadores_mj'];
  let deletedCount = 0;

  for (const collName of collectionsToClean) {
    console.log(`\nRevisando colección: ${collName}`);
    const snapshot = await db.collection(collName).get();
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const name = data.nombre || data.nombreNodus || doc.id;
      
      const nodusNameNorm = identitySentinel.normalizeString(name);
      let match = null;

      for (const r of roster) {
        const fullNorm = identitySentinel.normalizeString(r.fullNombre);
        const prefNorm = identitySentinel.normalizeString(r.preferido);

        if (fullNorm.includes(nodusNameNorm) || nodusNameNorm.includes(fullNorm) ||
            prefNorm.includes(nodusNameNorm) || nodusNameNorm.includes(prefNorm)) {
          match = r; break;
        }
        const nodusParts = nodusNameNorm.split(' ');
        if (nodusParts.length >= 2) {
          if (fullNorm.includes(nodusParts[0]) && fullNorm.includes(nodusParts[1])) {
            match = r; break;
          }
        }
      }

      if (!match || match.renuncio) {
        console.log(`🗑️ ELIMINANDO (No en roster o Renunció): ${name} (ID: ${doc.id})`);
        await db.collection(collName).doc(doc.id).delete();
        deletedCount++;
      } else {
        // Actualizar al nombre oficial preferido si es distinto
        if (data.nombre !== match.preferido) {
           console.log(`✨ ACTUALIZANDO NOMBRE OFICIAL: ${data.nombre} -> ${match.preferido}`);
           await db.collection(collName).doc(doc.id).update({
             nombre: match.preferido,
             nombreOriginalNodus: data.nombre
           });
        }
      }
    }
  }
  
  // Limpiar también latest HR sentinel cache
  try {
    const hrLatest = await db.collection('nodus_hr_sentinel').doc('latest').get();
    if (hrLatest.exists) {
      console.log("\nRevisando nodus_hr_sentinel/latest...");
      const hrData = hrLatest.data();
      let changed = false;

      const filterList = (list) => {
        return list.filter(item => {
           const nodusNameNorm = identitySentinel.normalizeString(item.nombre || '');
           let match = null;
           for (const r of roster) {
              const fullNorm = identitySentinel.normalizeString(r.fullNombre);
              const prefNorm = identitySentinel.normalizeString(r.preferido);
              if (fullNorm.includes(nodusNameNorm) || nodusNameNorm.includes(fullNorm) ||
                  prefNorm.includes(nodusNameNorm) || nodusNameNorm.includes(prefNorm)) {
                match = r; break;
              }
              const nodusParts = nodusNameNorm.split(' ');
              if (nodusParts.length >= 2) {
                if (fullNorm.includes(nodusParts[0]) && fullNorm.includes(nodusParts[1])) {
                  match = r; break;
                }
              }
           }
           if (!match || match.renuncio) {
             changed = true;
             return false;
           }
           if (item.nombre !== match.preferido) {
              item.nombre = match.preferido;
              changed = true;
           }
           return true;
        });
      };

      if (hrData.desempenoOptimo) hrData.desempenoOptimo = filterList(hrData.desempenoOptimo);
      if (hrData.enAlertaMedia) hrData.enAlertaMedia = filterList(hrData.enAlertaMedia);
      if (hrData.enAlertaCritica) hrData.enAlertaCritica = filterList(hrData.enAlertaCritica);

      if (changed) {
        await db.collection('nodus_hr_sentinel').doc('latest').update({
          desempenoOptimo: hrData.desempenoOptimo,
          enAlertaMedia: hrData.enAlertaMedia,
          enAlertaCritica: hrData.enAlertaCritica
        });
        console.log("✨ HR Sentinel latest actualizado (purgado).");
      }
    }
  } catch (err) {
    console.error("Error actualizando hr sentinel cache:", err.message);
  }

  console.log(`\n✅ Purga completada. Registros eliminados: ${deletedCount}`);
  process.exit(0);
}

purgeFakes();
