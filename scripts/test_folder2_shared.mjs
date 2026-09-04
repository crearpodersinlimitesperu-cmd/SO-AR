import { google } from 'googleapis';

const keyPath = "C:\\Users\\josem\\Downloads\\SO-AR\\centro-operativo-cpsl-65ad52160f45.json";

const auth = new google.auth.GoogleAuth({
  keyFile: keyPath,
  scopes: ['https://www.googleapis.com/auth/drive.readonly']
});

const drive = google.drive({ version: 'v3', auth });

async function testFolder2() {
  const folderId = '1oi7mUG619dQ2ZVzHzUyO5Xkwti-jgDFl';
  console.log("Probando carpeta 2 con supportsAllDrives...");

  try {
    const res = await drive.files.get({
      fileId: folderId,
      supportsAllDrives: true,
      fields: 'id, name, mimeType, capabilities, driveId'
    });
    console.log("Éxito con supportsAllDrives:", res.data);
  } catch (err) {
    console.log("Fallo con get:", err.message);
  }

  // Probar list
  try {
    const listRes = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, name, mimeType, size)'
    });
    console.log("Archivos encontrados:", listRes.data.files?.length || 0);
  } catch (err) {
    console.log("Fallo con list:", err.message);
  }
}

testFolder2();
