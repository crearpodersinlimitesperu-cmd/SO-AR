import 'dotenv/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!raw) throw new Error('Falta la credencial de servicio; no se cambió ninguna identidad.');
const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(raw)) });
const db = getFirestore(app);
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const confirmations = [
  { id: 'person_haydin_fernando_mendoza_clavijo', canonicalName: 'Haydin Fernando Mendoza Clavijo', aliases: ['Fer Mendoza', 'Haydin Fernando Mendoza Clavijo'] },
  { id: 'person_marcos_josue_vera_aviles', canonicalName: 'Marcos Josué Vera Avilés', aliases: ['Josue Vera', 'Josué Vera', 'Marcos Josué Vera Avilés'] },
  { id: 'person_edison_paul_sosa_carrera', canonicalName: 'Edison Paul Sosa Carrera', aliases: ['Paul Sosa', 'Edison Paul Sosa', 'Edison Paul Sosa Carrera'] },
];
const report = [];
for (const confirmation of confirmations) {
  const aliases = new Set(confirmation.aliases.map(normalize));
  const matches = [];
  const roles = new Set(); const sedes = new Set(); const emails = new Set();
  for (const collectionName of ['users', 'qt_directory']) {
    const snapshot = await db.collection(collectionName).get();
    snapshot.forEach(doc => {
      const data = doc.data();
      const name = data.name || data.displayName || data.fullName || '';
      if (!aliases.has(normalize(name))) return;
      matches.push({ collectionName, ref: doc.ref, name });
      [data.role, data.appRole, ...(Array.isArray(data.roles) ? data.roles : [])].filter(Boolean).forEach(role => roles.add(role));
      [data.sede, data.headquarters].filter(Boolean).forEach(sede => sedes.add(sede));
      [data.email, data.corporateEmail, data.correo, ...(Array.isArray(data.emails) ? data.emails : [])].filter(Boolean).forEach(email => emails.add(String(email).toLowerCase()));
    });
  }
  const canonicalRef = db.collection('identity_canonicals').doc(confirmation.id);
  const batch = db.batch();
  batch.set(canonicalRef, { canonicalName: confirmation.canonicalName, aliases: confirmation.aliases, roles: [...roles], sedes: [...sedes], emails: [...emails], linkedDocuments: matches.map(match => ({ collection: match.collectionName, id: match.ref.id, observedName: match.name })), confirmationSource: 'Aprobación explícita del usuario', confirmedAt: FieldValue.serverTimestamp(), status: 'confirmed' }, { merge: true });
  matches.forEach(match => batch.set(match.ref, { canonicalPersonId: confirmation.id, canonicalName: confirmation.canonicalName, identityAliases: confirmation.aliases, identityStatus: 'confirmed', identityConfirmedAt: FieldValue.serverTimestamp() }, { merge: true }));
  await batch.commit();
  report.push({ canonicalName: confirmation.canonicalName, linkedRecords: matches.length, roles: [...roles], sedes: [...sedes] });
}
await db.collection('identity_reconciliation_reports').doc(`confirmed_${Date.now()}`).set({ action: 'aplicar_confirmaciones', confirmedAt: FieldValue.serverTimestamp(), report, reversible: true, note: 'No se eliminó ni se fusionó físicamente ningún documento; se estableció una identidad canónica y alias.' });
console.log(JSON.stringify(report, null, 2));
