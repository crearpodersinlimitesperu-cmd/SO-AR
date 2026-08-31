// scripts/exportUsersList.mjs
//
// CONTEXTO (28/08/2026): José pidió una lista en Excel de los usuarios de la
// app. Ya existía export_users.mjs (raíz del repo), pero su export
// (usuarios_exportados.json, generado 26/08/2026) tiene un problema real:
// los 108 registros salieron TODOS con email = "Sin correo" — porque ese
// script solo mira el campo `email`, y aparentemente hay documentos en la
// colección "users" (roles administrativos/financieros como "jefa
// financiera", "contador lima", "asistente impuestos quito" — no son los
// roles operativos de checklistData.js) que no tienen ese campo poblado o
// usan otro nombre. No se puede confirmar el motivo exacto sin volver a
// exportar — no se inventa aquí.
//
// Este script reemplaza a export_users.mjs: revisa varios nombres de campo
// posibles para email y teléfono/WhatsApp (mismo patrón defensivo que ya se
// usa en src/services/userService.js), incluye más columnas útiles, y NUNCA
// lee ni exporta ningún campo de tipo contraseña (ninguna colección de
// Firestore debería tener eso, pero se excluye explícitamente por si acaso).
//
// MODO SEGURO: es de solo lectura, no escribe nada en Firestore. Solo genera
// un archivo local usuarios_exportados.json en la raíz del repo.
//
// Uso:
//   node scripts/exportUsersList.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const EMAIL_FIELDS = ['email', 'correo', 'corporateEmail', 'personalEmail', 'correoElectronico', 'mail'];
const PHONE_FIELDS = ['whatsapp', 'whatsappUrl', 'cleanPhone', 'phone', 'telefono', 'celular'];
const FORBIDDEN_FIELDS = ['password', 'contraseña', 'contrasena', 'contraseñaTemporal', 'temporaryPassword'];

function firstNonEmpty(data, fields) {
  for (const f of fields) {
    if (data[f] && String(data[f]).trim()) return String(data[f]).trim();
  }
  return '';
}

async function run() {
  const snap = await db.collection('users').get();
  console.log(`Total de documentos en "users": ${snap.size}`);

  const users = [];
  let sinEmail = 0;
  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    // No se lee ni exporta ningún campo de contraseña, por si existiera.
    for (const f of FORBIDDEN_FIELDS) delete d[f];

    const email = firstNonEmpty(d, EMAIL_FIELDS);
    if (!email) sinEmail++;

    users.push({
      id: docSnap.id,
      nombre: d.name || d.displayName || '(sin nombre)',
      email: email || '(sin correo)',
      rol: d.role || d.appRole || '(sin rol)',
      sede: d.sede || '(sin sede)',
      contacto: firstNonEmpty(d, PHONE_FIELDS) || '(sin contacto)',
      superAdmin: d.isSuperAdmin ? 'Sí' : 'No',
      cumpleanos: d.cumpleanos || d.birthDate || ''
    });
  }

  writeFileSync('usuarios_exportados.json', JSON.stringify(users, null, 2));
  console.log(`Exportados ${users.length} usuarios a usuarios_exportados.json`);
  console.log(`Sin correo detectado: ${sinEmail} de ${users.length}`);
  if (sinEmail > 0) {
    console.log('(Esos quedaron como "(sin correo)" — no se inventó ningún valor.)');
  }
  process.exit(0);
}

run().catch(err => {
  console.error('Error exportando usuarios:', err);
  process.exit(1);
});
