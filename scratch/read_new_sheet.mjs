import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';

const spreadsheetId = '1ChB2pqn7pJDhamCFq6fRKL5QGbY6uQnC';
const credentialsPath = 'C:/Users/josem/Documents/SO-AR/centro-operativo-cpsl-3d05655c949c.json';

async function readSheet() {
    if (!existsSync(credentialsPath)) {
        console.error("Credentials not found");
        return;
    }
    
    const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    try {
        // Obtenemos los nombres de las hojas primero
        const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
        console.log("Sheet names:");
        sheetMetadata.data.sheets.forEach(s => console.log(" - " + s.properties.title));
        
        // Asumiendo que leemos la primera hoja, columnas A a Z
        const firstSheet = sheetMetadata.data.sheets[0].properties.title;
        console.log(`\nLeyendo primera hoja: ${firstSheet}`);
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: `${firstSheet}!A1:Z5`,
        });
        
        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log("No data found.");
        } else {
            console.log("Encabezados:");
            console.log(rows[0]);
            console.log("Primera fila de datos:");
            if (rows.length > 1) {
                console.log(rows[1]);
            }
        }
    } catch (e) {
        console.error("Error leyendo Sheet:", e.message);
    }
}

readSheet();
