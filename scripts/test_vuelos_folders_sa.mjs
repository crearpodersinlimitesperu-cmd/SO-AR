import { google } from 'googleapis';
import { writeFileSync } from 'fs';

const keyPath = "C:\\Users\\josem\\Downloads\\SO-AR\\centro-operativo-cpsl-65ad52160f45.json";

const auth = new google.auth.GoogleAuth({
  keyFile: keyPath,
  scopes: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly'
  ]
});

const drive = google.drive({ version: 'v3', auth });

const folders = [
  { id: '1i60YXyxRrFP1LxmXUVuHK5eRyeUBzR0r', label: 'Carpeta 1' },
  { id: '1oi7mUG619dQ2ZVzHzUyO5Xkwti-jgDFl', label: 'Carpeta 2' }
];

async function scan() {
  console.log("Iniciando escaneo con GoogleAuth...");
  const credentials = await auth.getCredentials();
  console.log("Service Account email:", credentials.client_email);

  const results = [];

  for (const f of folders) {
    console.log(`\n======================================================`);
    console.log(`Buscando carpeta ${f.label} (${f.id})...`);
    
    try {
      const meta = await drive.files.get({
        fileId: f.id,
        fields: 'id, name, mimeType, description, owners, capabilities, shared'
      });
      console.log("Carpeta encontrada:", meta.data.name, "(id:", meta.data.id, ")");

      const listRes = await drive.files.list({
        q: `'${f.id}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, description)',
        pageSize: 100
      });

      const files = listRes.data.files || [];
      console.log(`Total archivos encontrados en ${f.label}: ${files.length}`);
      files.forEach((file, idx) => {
        console.log(`  ${idx + 1}. [${file.mimeType}] ${file.name} (ID: ${file.id}, ${file.size || 'N/A'} bytes)`);
      });

      results.push({ folder: f, metadata: meta.data, files });
    } catch (err) {
      console.error(`Error accediendo a ${f.label} (${f.id}):`, err.message);
      if (err.errors) console.error("Detalles:", err.errors);
      results.push({ folder: f, error: err.message, details: err.errors });
    }
  }

  writeFileSync('vuelos_drive_scan_result.json', JSON.stringify(results, null, 2));
  console.log("\nResultados guardados en vuelos_drive_scan_result.json");
}

scan().catch(console.error);
