const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

const KEYFILEPATH = path.join(__dirname, 'centro-operativo-cpsl-65ad52160f45.json');
const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: ['https://www.googleapis.com/auth/drive.readonly']
});

const drive = google.drive({ version: 'v3', auth });
const FILE_ID = '1Qo7DIkJeS2yZcBLCV-nl5x-V_-g7Il--';
const OUTPUT_DIR = path.join(__dirname, 'src', 'data', 'reportes_drive');

async function main() {
  try {
    const fileMetadata = await drive.files.get({
      fileId: FILE_ID,
      fields: 'name, mimeType'
    });
    
    console.log(`File: ${fileMetadata.data.name} (${fileMetadata.data.mimeType})`);
    const saveName = 'MJ_SEDES_NUEVO.xlsx';
    const destPath = path.join(OUTPUT_DIR, saveName);
    const destStream = fs.createWriteStream(destPath);
    
    if (fileMetadata.data.mimeType === 'application/vnd.google-apps.spreadsheet') {
      const res = await drive.files.export({
        fileId: FILE_ID,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }, { responseType: 'stream' });
      await new Promise((resolve, reject) => {
        res.data.pipe(destStream).on('finish', resolve).on('error', reject);
      });
    } else {
      const res = await drive.files.get({
        fileId: FILE_ID,
        alt: 'media'
      }, { responseType: 'stream' });
      await new Promise((resolve, reject) => {
        res.data.pipe(destStream).on('finish', resolve).on('error', reject);
      });
    }
    
    console.log(`Downloaded to ${destPath}`);
    
    const workbook = xlsx.readFile(destPath);
    const result = {};
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      result[sheetName] = xlsx.utils.sheet_to_json(sheet);
    }
    
    const jsonPath = path.join(OUTPUT_DIR, 'MJ_SEDES_NUEVO.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`Converted and saved to ${jsonPath}`);
    
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
