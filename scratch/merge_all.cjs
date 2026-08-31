const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('../centro-operativo-cpsl-65ad52160f45.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

function normalize(name) {
  if (!name) return 'sin_nombre_' + Math.random();
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ');
}

async function mergeAll() {
  console.log("Iniciando fusin de usuarios duplicados exactos...");
  const snap = await db.collection('users').get();
  const users = [];
  snap.forEach(d => users.push({ id: d.id, ...d.data() }));

  const groups = {};
  users.forEach(u => {
    const n = normalize(u.name || u.displayName);
    if (!groups[n]) groups[n] = [];
    groups[n].push(u);
  });

  let mergedCount = 0;

  for (const [name, list] of Object.entries(groups)) {
    if (list.length > 1 && !name.includes('sin_nombre')) {
      console.log(`\nFusionando ${list.length} perfiles para: ${name}`);
      
      list.sort((a, b) => {
         let scoreA = (a.appRole ? 10 : 0) + (a.roles ? a.roles.length : 0) + (a.id.startsWith('qt_') ? 0 : 5);
         let scoreB = (b.appRole ? 10 : 0) + (b.roles ? b.roles.length : 0) + (b.id.startsWith('qt_') ? 0 : 5);
         return scoreB - scoreA;
      });

      const primary = list[0];
      const secondaries = list.slice(1);

      const combinedRoles = new Set(primary.roles || []);
      if (primary.appRole) combinedRoles.add(primary.appRole);
      if (primary.role) combinedRoles.add(primary.role);

      const combinedEmails = new Set(primary.emails || []);
      if (primary.email) combinedEmails.add(primary.email);

      let isSuperAdmin = primary.isSuperAdmin || false;
      let isDireccion = primary.isDireccion || false;
      let isGerente = primary.isGerente || false;

      for (const sec of secondaries) {
          if (sec.roles) sec.roles.forEach(r => combinedRoles.add(r));
          if (sec.appRole) combinedRoles.add(sec.appRole);
          if (sec.role) combinedRoles.add(sec.role);

          if (sec.emails) sec.emails.forEach(e => combinedEmails.add(e));
          if (sec.email) combinedEmails.add(sec.email);

          if (sec.isSuperAdmin) isSuperAdmin = true;
          if (sec.isDireccion) isDireccion = true;
          if (sec.isGerente) isGerente = true;
      }

      combinedRoles.delete(undefined);
      combinedRoles.delete(null);
      combinedEmails.delete(undefined);
      combinedEmails.delete(null);

      let finalAppRole = primary.appRole || primary.role;
      if (!finalAppRole && combinedRoles.size > 0) {
          finalAppRole = Array.from(combinedRoles)[0];
      }

      await db.collection('users').doc(primary.id).update({
          roles: Array.from(combinedRoles),
          emails: Array.from(combinedEmails),
          appRole: finalAppRole,
          isSuperAdmin,
          isDireccion,
          isGerente,
          updatedAt: FieldValue.serverTimestamp(),
          _mergedAutomated: true
      });

      for (const sec of secondaries) {
          await db.collection('users').doc(sec.id).delete();
          console.log(`  -> Eliminado perfil secundario: ${sec.id}`);
      }
      console.log(`  -> Consolidado en: ${primary.id} | Roles:`, Array.from(combinedRoles));
      mergedCount++;
    }
  }

  // Fusin manual Jose Luis Sanchez
  const jose1 = users.find(u => u.id === 'y6W1fNlH73R0BwG6P44jHkM865X2'); // asumiendo que es una cuenta auth
  // Si encontramos otras variantes, podemos fusionarlas igual, pero vamos a basarnos en el correo para mǭxima seguridad
  
  const byEmail = {};
  users.forEach(u => {
      if(u.email) {
          if(!byEmail[u.email]) byEmail[u.email] = [];
          byEmail[u.email].push(u);
      }
  });

  for (const [email, list] of Object.entries(byEmail)) {
      if (list.length > 1) {
          // filtrando los que ya fueron fusionados por nombre
          const alive = [];
          for(const u of list) {
             const doc = await db.collection('users').doc(u.id).get();
             if(doc.exists) alive.push({id: doc.id, ...doc.data()});
          }
          
          if(alive.length > 1) {
              console.log(`\nFusionando por EMAIL compartido: ${email}`);
              alive.sort((a, b) => (b.isSuperAdmin ? 1 : 0) - (a.isSuperAdmin ? 1 : 0));
              const primary = alive[0];
              const secondaries = alive.slice(1);
              
              const combinedRoles = new Set(primary.roles || []);
              if (primary.appRole) combinedRoles.add(primary.appRole);
              for (const sec of secondaries) {
                  if (sec.roles) sec.roles.forEach(r => combinedRoles.add(r));
                  if (sec.appRole) combinedRoles.add(sec.appRole);
              }
              combinedRoles.delete(undefined);
              
              await db.collection('users').doc(primary.id).update({
                  roles: Array.from(combinedRoles),
                  updatedAt: FieldValue.serverTimestamp(),
                  _mergedAutomated: true
              });
              
              for (const sec of secondaries) {
                  await db.collection('users').doc(sec.id).delete();
                  console.log(`  -> Eliminado perfil secundario por email: ${sec.id}`);
              }
              console.log(`  -> Consolidado en: ${primary.id} | Roles:`, Array.from(combinedRoles));
          }
      }
  }

  console.log(`\nCompletado. Total de grupos fusionados por nombre exacto: ${mergedCount}`);
}

mergeAll();
