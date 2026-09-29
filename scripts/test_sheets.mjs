import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function testSheet() {
  const credentialsPath = 'C:/Users/josem/Documents/SO-AR/centro-operativo-cpsl-3d05655c949c.json';
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1KF58QXAiIk4KP_9G2aiAM3ERVoptcqKlIraszNKq2Ow';

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A1:L20', // just fetch the first 20 rows to verify
    });
    console.log('SUCCESS!');
    console.log('Headers:', response.data.values[0]);
    console.log('Row 2:', response.data.values[1]);
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

testSheet();
