import 'dotenv/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { USERS_TO_IMPORT } from '../src/data/usersToImport.js';

const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!raw) throw new Error('Falta la credencial de servicio; no se modificó ningún perfil.');
const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(raw)) });
const db = getFirestore(app);
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const aliases = {
  'fer mendoza': 'Haydin Fernando Mendoza Clavijo',
  'haydin fernando mendoza clavijo': 'Haydin Fernando Mendoza Clavijo',
  'josue vera': 'Marcos Josué Vera Avilés',
  'marcos josue vera aviles': 'Marcos Josué Vera Avilés',
  'diego bravo': 'Diego David Bravo Figueroa',
  'diego david bravo figueroa': 'Diego David Bravo Figueroa',
  'alonso solares': 'Alonso Solares Salazar',
  'alonso solares salazar': 'Alonso Solares Salazar',
  'mauricio ramirez': 'Mauricio Ramírez Silva',
  'mauricio ramirez silva': 'Mauricio Ramírez Silva',
};
const candidateName = names => {
  const explicit = names.map(normalize).map(name => aliases[name]).find(Boolean);
  return explicit || names.sort((a, b) => b.length - a.length)[0] || '';
};
const records = [];
for (const collectionName of ['users', 'qt_directory']) {
  const snapshot = await db.collection(collectionName).get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const emails = [data.email, data.corporateEmail, data.correo, ...(Array.isArray(data.emails) ? data.emails : [])]
      .map(value => String(value || '').trim().toLowerCase()).filter(Boolean);
    records.push({ collection: collectionName, id: doc.id, name: data.name || data.displayName || data.fullName || '', emails, roles: [...new Set([data.role, data.appRole, ...(Array.isArray(data.roles) ? data.roles : [])].filter(Boolean))], sedes: [...new Set([data.sede, data.headquarters].filter(Boolean))] });
  });
}
for (const user of USERS_TO_IMPORT) {
  const emails = [user.email, user.corporateEmail, ...(Array.isArray(user.emails) ? user.emails : [])].map(value => String(value || '').trim().toLowerCase()).filter(Boolean);
  records.push({ collection: 'usersData', id: user.id || user.email, name: user.name || '', emails, roles: [...new Set([user.role, ...(Array.isArray(user.roles) ? user.roles : [])].filter(Boolean))], sedes: [...new Set([user.sede].filter(Boolean))] });
}
const grouped = new Map();
records.forEach(record => record.emails.forEach(email => {
  if (!grouped.has(email)) grouped.set(email, []);
  grouped.get(email).push(record);
}));
const proposals = [...grouped.entries()].map(([email, members]) => {
  const names = [...new Set(members.map(member => member.name).filter(Boolean))];
  const roles = [...new Set(members.flatMap(member => member.roles))];
  const sedes = [...new Set(members.flatMap(member => member.sedes))];
  const candidate = candidateName(names);
  const requiresConfirmation = names.some(name => normalize(name) !== normalize(candidate));
  return { email, candidateName: candidate, aliases: names.filter(name => normalize(name) !== normalize(candidate)), roles, sedes, records: members.map(({ collection, id, name }) => ({ collection, id, name })), confidence: names.length === 1 ? 'exacta' : aliases[normalize(candidate)] ? 'alta' : 'revisar', requiresConfirmation };
}).filter(item => item.records.length > 1 || item.aliases.length > 0)
  .sort((a, b) => b.records.length - a.records.length || a.candidateName.localeCompare(b.candidateName, 'es'));

const report = { generatedAt: FieldValue.serverTimestamp(), mode: 'solo_propuesta', sourceCollections: ['users', 'qt_directory', 'usersData'], totalRecordsReviewed: records.length, proposals, instructions: 'No fusionar ni borrar. Aplicar únicamente equivalencias confirmadas por un administrador, preservando roles y sedes en arrays.' };
await db.collection('identity_reconciliation_reports').doc('latest').set(report);
await db.collection('identity_reconciliation_reports').doc(`audit_${Date.now()}`).set(report);
console.log(JSON.stringify({ mode: report.mode, reviewed: records.length, proposals: proposals.length, requiresConfirmation: proposals.filter(item => item.requiresConfirmation).length }, null, 2));
