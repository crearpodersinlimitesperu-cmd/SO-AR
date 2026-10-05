const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

const KEYFILEPATH = path.join(__dirname, 'centro-operativo-cpsl-65ad52160f45.json');
const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly'
];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

const FOLDER_ID = '1Wd-fJMe5LCk1gC6sxochbgg3QbAufDlk';
const OUTPUT_DIR = path.join(__dirname, 'src', 'data', 'reportes_drive');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function downloadFile(fileId, fileName, mimeType) {
  const destPath = path.join(OUTPUT_DIR, fileName);
  const destStream = fs.createWriteStream(destPath);

  console.log(`Downloading ${fileName}...`);
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    // Export Google Sheet to Excel
    const res = await drive.files.export({
      fileId: fileId,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }, { responseType: 'stream' });
    return new Promise((resolve, reject) => {
      res.data.pipe(destStream)
        .on('finish', () => resolve(destPath))
        .on('error', reject);
    });
  } else {
    // Download regular file
    const res = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, { responseType: 'stream' });
    return new Promise((resolve, reject) => {
      res.data.pipe(destStream)
        .on('finish', () => resolve(destPath))
        .on('error', reject);
    });
  }
}

async function processExcelToJSON(filePath, fileName) {
  console.log(`Converting ${fileName} to JSON...`);
  const workbook = xlsx.readFile(filePath);
  const result = {};

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    result[sheetName] = data;
  }

  const jsonName = fileName.replace(/\.xlsx?$/, '.json');
  const jsonPath = path.join(OUTPUT_DIR, jsonName);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  console.log(`✅ Saved ${jsonName}`);
}

async function main() {
  try {
    const res = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType)',
    });
    
    const files = res.data.files;
    console.log(`Found ${files.length} files in Drive.`);
    
    const indexData = [];

    for (const file of files) {
      if (file.mimeType.includes('spreadsheet') || file.name.endsWith('.xlsx')) {
        let saveName = file.name;
        if (!saveName.endsWith('.xlsx')) saveName += '.xlsx';
        
        const downloadedPath = await downloadFile(file.id, saveName, file.mimeType);
        await processExcelToJSON(downloadedPath, saveName);
        
        indexData.push({
          id: file.id,
          name: file.name,
          jsonFile: saveName.replace(/\.xlsx?$/, '.json')
        });
        
        // Clean up the temporary xlsx file to keep things clean
        fs.unlinkSync(downloadedPath);
      } else {
        console.log(`Skipping unsupported file type: ${file.name} (${file.mimeType})`);
      }
    }
    
    // Save an index file
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'index.json'), 
      JSON.stringify(indexData, null, 2)
    );
    console.log('🎉 All files downloaded and converted to JSON successfully in src/data/reportes_drive/');

  } catch (err) {
    console.error('Error:', err);
  }
}

main();
