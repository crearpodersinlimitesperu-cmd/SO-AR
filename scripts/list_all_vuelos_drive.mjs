import { google } from 'googleapis';
import { writeFileSync } from 'fs';

const keyPath = "C:\\Users\\josem\\Downloads\\SO-AR\\centro-operativo-cpsl-65ad52160f45.json";

const auth = new google.auth.GoogleAuth({
  keyFile: keyPath,
  scopes: ['https://www.googleapis.com/auth/drive.readonly']
});

const drive = google.drive({ version: 'v3', auth });

const folders = [
  { id: '1i60YXyxRrFP1LxmXUVuHK5eRyeUBzR0r', label: 'Carpeta Facturas y Pasajes' },
  { id: '1oi7mUG619dQ2ZVzHzUyO5Xkwti-jgDFl', label: 'Carpeta Vuelos Entrenadores' }
];

async function listFolderRecursive(folderId, folderName, depth = 0) {
  let allFiles = [];
  try {
    let pageToken = null;
    do {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives',
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, description)',
        pageSize: 100,
        pageToken
      });

      const files = res.data.files || [];
      for (const f of files) {
        console.log(`${'  '.repeat(depth)}📄 [${f.mimeType}] ${f.name} (id: ${f.id})`);
        if (f.mimeType === 'application/vnd.google-apps.folder') {
          const subFiles = await listFolderRecursive(f.id, f.name, depth + 1);
          allFiles.push({ ...f, isFolder: true, children: subFiles });
        } else {
          allFiles.push({ ...f, parentFolder: folderName });
        }
      }
      pageToken = res.data.nextPageToken;
    } while (pageToken);
  } catch (err) {
    console.error(`Error listando ${folderName}:`, err.message);
  }
  return allFiles;
}

async function main() {
  const fullScan = [];
  for (const f of folders) {
    console.log(`\n======================================================`);
    console.log(`Explorando ${f.label} (${f.id})...`);
    const files = await listFolderRecursive(f.id, f.label);
    fullScan.push({ folderId: f.id, folderLabel: f.label, files });
  }

  writeFileSync('vuelos_drive_full_manifest.json', JSON.stringify(fullScan, null, 2));
  console.log("\n✅ Manifiesto completo guardado en vuelos_drive_full_manifest.json");
}

main().catch(console.error);
