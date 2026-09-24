/**
 * Agente automático de control de pólizas de entrenadores.
 *
 * Lee exclusivamente la carpeta oficial de Drive. No descarga a equipos de
 * usuarios, no modifica archivos de Drive y nunca combina identidades por
 * coincidencias parciales. Publica el resultado y su evidencia en Firestore.
 *
 * Requiere que la carpeta esté compartida con la cuenta de servicio definida
 * en GOOGLE_SERVICE_ACCOUNT_JSON (solo permiso lector).
 */
import { google } from 'googleapis';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const FOLDER_ID = '1XDkAtrhZcPbInZLQbpQ4DwlQijMLxGbq';
const DAY_MS = 24 * 60 * 60 * 1000;

const normal = (value = '') => String(value).toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const nameTokens = (value = '') => normal(value).split(' ')
  .filter(token => token.length > 2 && !['del', 'las', 'los', 'para', 'con'].includes(token));

function getDb() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_JSON para el agente de pólizas.');
  const serviceAccount = JSON.parse(raw);
  const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
  return getFirestore(app);
}

function getDrive() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_JSON para consultar Drive.');
  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
  return google.drive({ version: 'v3', auth });
}

function fullNameMatch(coach, fileName) {
  const tokens = nameTokens(coach.name);
  const source = normal(fileName);
  const matched = tokens.filter(token => source.includes(token));
  // Dos tokens no bastan para nombres ambiguos: se exige todo el nombre útil
  // o tres términos significativos. Esto mantiene separados Andrés Gómez e
  // Andrés Idrobo, por ejemplo.
  const full = tokens.length > 0 && matched.length === tokens.length;
  const high = full || (tokens.length >= 3 && matched.length >= 3);
  return { high, matched: matched.length, expected: tokens.length };
}

function parseDate(value) {
  const match = String(value).match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : iso;
}

function extractExpiryFromPdf(buffer) {
  // PDFs con texto seleccionable mantienen muchas cadenas en sus streams. No
  // pretendemos hacer OCR de escaneos: si no hay texto o contexto de vigencia,
  // se deja pendiente para revisión humana en vez de adivinar una fecha.
  const text = Buffer.from(buffer).toString('latin1').replace(/\0/g, ' ');
  const context = /(?:vigencia|vigente|vence|vencimiento|validez|valido hasta|válido hasta)[^\r\n]{0,120}/gi;
  for (const fragment of text.match(context) || []) {
    const date = parseDate(fragment);
    if (date) return { validUntil: date, evidence: fragment.slice(0, 180).replace(/\s+/g, ' ') };
  }
  return null;
}

function toIsoToday() {
  return new Date().toISOString().slice(0, 10);
}

export async function runTrainerPolicyAudit() {
  const db = getDb();
  const drive = getDrive();
  const scannedAt = new Date().toISOString();
  const users = await db.collection('users').get();
  const coaches = users.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(user => user.isActive !== false && user.status !== 'inactive')
    .filter(user => [user.role, ...(Array.isArray(user.roles) ? user.roles : [])].some(role => /entrenador|coach/i.test(String(role))))
    .map(user => ({ name: user.name || user.displayName || user.email, email: String(user.email || user.correo || user.id || '').toLowerCase(), sede: user.sede || 'Global' }))
    .filter(coach => coach.name && coach.email);
  const existingReviewSnap = await db.collection('trainer_policy_reviews').get();
  const existingReviews = new Map(existingReviewSnap.docs.map(doc => [String(doc.data().coachEmail || '').toLowerCase(), doc.data()]));

  const listed = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink)',
    orderBy: 'modifiedTime desc', pageSize: 250,
    supportsAllDrives: true, includeItemsFromAllDrives: true
  });
  const files = (listed.data.files || []).filter(file => file.mimeType === 'application/pdf');
  const ambiguous = new Set();
  const candidates = new Map();
  for (const file of files) {
    const matches = coaches.filter(coach => fullNameMatch(coach, file.name).high);
    if (matches.length === 1) candidates.set(matches[0].email, { coach: matches[0], file });
    if (matches.length > 1) matches.forEach(coach => ambiguous.add(coach.email));
  }

  const batch = db.batch();
  let automatic = 0;
  let pending = 0;
  for (const coach of coaches) {
    const candidate = candidates.get(coach.email);
    const existing = existingReviews.get(coach.email);
    const reviewRef = db.collection('trainer_policy_reviews').doc(coach.email.replace(/[^a-z0-9@._-]/gi, '_'));
    const auditRef = db.collection('trainer_policy_audit').doc();
    if (!candidate || ambiguous.has(coach.email)) {
      // Un fallo de lectura, un archivo renombrado o un homónimo jamás revoca
      // una póliza previamente verificada. Solo deja constancia del escaneo.
      batch.set(reviewRef, {
        trainerName: coach.name, coachEmail: coach.email, sede: coach.sede,
        lastAutomatedScanAt: scannedAt, scanSource: 'drive_readonly_agent',
        discoveryStatus: ambiguous.has(coach.email) ? 'ambiguous_identity' : 'no_precise_file_match',
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      continue;
    }

    const { file } = candidate;
    let expiry = null;
    try {
      const media = await drive.files.get({ fileId: file.id, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' });
      expiry = extractExpiryFromPdf(media.data);
    } catch (error) {
      console.warn(`No se pudo leer el PDF ${file.name}: ${error.message}`);
    }
    const base = {
      trainerName: coach.name, coachEmail: coach.email, sede: coach.sede,
      file, verifiedFileId: file.id, lastAutomatedScanAt: scannedAt,
      scanSource: 'drive_readonly_agent', updatedAt: FieldValue.serverTimestamp()
    };
    if (expiry) {
      const manualDateConflict = existing?.verificationMethod && existing.verificationMethod !== 'pdf_text_automatic'
        && existing?.validUntil && existing.validUntil !== expiry.validUntil;
      if (manualDateConflict) {
        batch.set(reviewRef, { ...base, requiresRevalidation: true, discoveryStatus: 'date_conflict_with_manual_review' }, { merge: true });
        batch.set(auditRef, {
          action: 'POLICY_AUTO_DATE_CONFLICT', trainerName: coach.name, coachEmail: coach.email,
          fileId: file.id, fileName: file.name, detectedValidUntil: expiry.validUntil,
          existingValidUntil: existing.validUntil, occurredAt: scannedAt,
          actorName: 'Agente automático de pólizas', immutable: true
        });
        pending += 1;
        continue;
      }
      const verificationStatus = expiry.validUntil >= toIsoToday() ? 'vigente' : 'vencida';
      batch.set(reviewRef, {
        ...base, validUntil: expiry.validUntil, verificationStatus,
        verificationMethod: 'pdf_text_automatic', requiresRevalidation: false,
        verifiedAt: scannedAt, verifiedBy: 'Agente automático de pólizas'
      }, { merge: true });
      batch.set(auditRef, {
        action: verificationStatus === 'vigente' ? 'POLICY_AUTO_VERIFIED_VALID' : 'POLICY_AUTO_VERIFIED_EXPIRED',
        trainerName: coach.name, coachEmail: coach.email, fileId: file.id, fileName: file.name,
        validUntil: expiry.validUntil, evidence: expiry.evidence, occurredAt: scannedAt,
        actorName: 'Agente automático de pólizas', immutable: true
      });
      automatic += 1;
    } else {
      const keepVerified = existing?.verificationStatus === 'vigente' && existing?.validUntil >= toIsoToday()
        && existing?.verifiedFileId === file.id;
      if (keepVerified) {
        batch.set(reviewRef, { ...base, discoveryStatus: 'pdf_text_not_available_preserved_manual_review' }, { merge: true });
        continue;
      }
      batch.set(reviewRef, {
        ...base, verificationStatus: 'pendiente_fecha', requiresRevalidation: true,
        verificationMethod: 'file_match_without_machine_readable_expiry'
      }, { merge: true });
      batch.set(auditRef, {
        action: 'POLICY_AUTO_NEEDS_REVIEW', trainerName: coach.name, coachEmail: coach.email,
        fileId: file.id, fileName: file.name, occurredAt: scannedAt,
        actorName: 'Agente automático de pólizas', immutable: true
      });
      pending += 1;
    }
  }
  await batch.commit();
  const report = { scannedAt, coaches: coaches.length, files: files.length, automatic, pending, ambiguous: ambiguous.size };
  await db.collection('trainer_policy_agent_runs').add({ ...report, status: 'success', createdAt: FieldValue.serverTimestamp() });
  console.log(`Pólizas auditadas: ${automatic} con vigencia automática, ${pending} para revisión, ${ambiguous.size} identidades ambiguas.`);
  return report;
}

if (process.argv[1]?.endsWith('trainerPolicyAuditAgent.mjs')) {
  runTrainerPolicyAudit().catch(async error => {
    console.error(`Agente de pólizas falló: ${error.message}`);
    process.exitCode = 1;
  });
}
