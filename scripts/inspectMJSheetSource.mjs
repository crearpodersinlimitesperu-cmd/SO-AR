import { google } from 'googleapis';

export function summarizeSheetStructure(sheets) {
  return sheets.map(sheet => ({
    sheetId: sheet.properties.sheetId,
    rows: sheet.properties.gridProperties?.rowCount ?? null,
    columns: sheet.properties.gridProperties?.columnCount ?? null,
    markers: (sheet.data || []).flatMap(grid => (grid.rowData || []).flatMap((row, r) =>
      (row.values || []).flatMap((cell, c) => {
        const text = String(cell.formattedValue || '').trim().toUpperCase();
        const label = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const known = /^(PRIMER|SEGUNDO|TERCER)\s+(FDS|FIN DE SEMANA)|^(CREACION|RELACION|GRATITUD|FECHA|SEDE|EQUIPO|INICIO|FIN)$/;
        if (!known.test(label)) return [];
        return [{ row: r + (grid.startRow || 0) + 1, column: c + (grid.startColumn || 0) + 1, label }];
      })
    ))
  }));
}

async function main() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Falta la cuenta de servicio configurada.');
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(raw), scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '10JVeVpdyMpA25rU6CwMIyoa3-dO2EUt9';
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId, fields: 'sheets(properties(sheetId,title))'
  });
  const target = metadata.data.sheets?.find(sheet => sheet.properties.sheetId === 1960233176);
  if (!target) throw new Error('No existe la pestaña solicitada.');
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(sheetId,title,gridProperties),data(startRow,startColumn,rowData(values(formattedValue))))',
    includeGridData: true,
    ranges: [`'${target.properties.title.replace(/'/g, "''")}'!A1:P20`]
  });
  // Report structure/known labels only, never personal cells or credentials.
  console.log(JSON.stringify({ queriedAt: new Date().toISOString(),
    sheets: summarizeSheetStructure(response.data.sheets || []) }, null, 2));
}

if (process.argv[1]?.endsWith('inspectMJSheetSource.mjs')) {
  main().catch(error => {
    console.error(`No se pudo leer la hoja con la cuenta de servicio. HTTP ${error.response?.status || 'no disponible'}. No se modificó ningún dato.`);
    process.exitCode = 1;
  });
}
