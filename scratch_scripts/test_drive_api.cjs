const { google } = require('googleapis');
const path = require('path');

const KEYFILEPATH = path.join(__dirname, 'centro-operativo-cpsl-65ad52160f45.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

async function listFiles() {
  try {
    const folderId = '1Wd-fJMe5LCk1gC6sxochbgg3QbAufDlk'; // ID from the URL
    const res = await drive.files.list({
      q: `'${folderId}' in parents`,
      fields: 'files(id, name, mimeType)',
    });
    const files = res.data.files;
    if (files.length === 0) {
      console.log('No files found.');
    } else {
      console.log('Files:');
      files.map((file) => {
        console.log(`${file.name} (${file.mimeType}) - ${file.id}`);
      });
    }
  } catch (err) {
    console.error('Error fetching files:', err);
  }
}

listFiles();
