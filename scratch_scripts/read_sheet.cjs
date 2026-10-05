const { google } = require('googleapis');
const fs = require('fs');

async function getSheet() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'centro-operativo-cpsl-65ad52160f45.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: '1gt7kJblS5sULWDAZ_Gg1aQMIJTmkOIK2snaM-nnNdfI',
      range: 'Sheet1!A1:H20', // Adjust range if needed, assuming first sheet is named Sheet1 or just 'A1:H20'
    });
    console.log(JSON.stringify(res.data.values, null, 2));
  } catch (err) {
    try {
        const res2 = await sheets.spreadsheets.values.get({
            spreadsheetId: '1gt7kJblS5sULWDAZ_Gg1aQMIJTmkOIK2snaM-nnNdfI',
            range: 'A1:H20', // Fallback to no sheet name
        });
        console.log(JSON.stringify(res2.data.values, null, 2));
    } catch (e2) {
        console.error('Error fetching sheet:', e2.message);
    }
  }
}

getSheet();
