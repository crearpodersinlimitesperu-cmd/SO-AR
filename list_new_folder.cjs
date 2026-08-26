const { google } = require('googleapis');
const fs = require('fs');

async function listFolder() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'centro-operativo-cpsl-65ad52160f45.json',
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });

  const drive = google.drive({ version: 'v3', auth });
  const folderId = '1bg_CH-Q9WPnhyqsFjit5j7eUmcGpOQle';

  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents`,
      fields: 'files(id, name, mimeType)',
    });
    console.log(JSON.stringify(res.data.files, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

listFolder();
