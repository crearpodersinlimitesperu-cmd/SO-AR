// Compara la carpeta de pasaportes de entrenadores en Drive con public/cartas/entrenadores-documentos.json.
import { readFileSync } from 'node:fs';
import { google } from 'googleapis';

const FOLDER_ID = '1Q2NSa-2w2b7L0MGPrIcy-HZX_fUsnmzc';
const registry = JSON.parse(readFileSync(new URL('../public/cartas/entrenadores-documentos.json', import.meta.url), 'utf8'));
const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const auth = new google.auth.GoogleAuth({
  ...(raw ? { credentials: JSON.parse(raw) } : {}),
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });

const files = [];
let pageToken;
do {
  const { data } = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and trashed=false and mimeType contains 'image/'`,
    fields: 'nextPageToken, files(name)', pageSize: 200, pageToken,
    supportsAllDrives: true, includeItemsFromAllDrives: true,
  });
  files.push(...data.files.map(file => file.name));
  pageToken = data.nextPageToken;
} while (pageToken);

const known = new Set(registry.entrenadores.map(trainer => trainer.archivo));
const missing = files.filter(name => !known.has(name));
const removed = [...known].filter(name => !files.includes(name));
console.log(`Drive: ${files.length} documentos · Registro: ${known.size}`);
missing.forEach(name => console.log(`[NUEVO EN DRIVE] ${name} — agregar nombre legal, nacionalidad y tipo de documento al registro.`));
removed.forEach(name => console.log(`[YA NO ESTÁ EN DRIVE] ${name}`));
if (missing.length || removed.length) process.exit(1);
console.log('Registro de entrenadores coherente con Drive.');
