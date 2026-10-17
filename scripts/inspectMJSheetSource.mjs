import { google } from 'googleapis';
import * as XLSX from 'xlsx';

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

export function summarizeWorkbookStructure(workbook) {
  return summarizeSheetStructure(workbook.SheetNames.map((name, index) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '', raw: false });
    return { properties: { sheetId: index, gridProperties: { rowCount: rows.length } },
      data: [{ rowData: rows.map(row => ({ values: row.map(value => ({ formattedValue: value })) })) }] };
  }));
}

async function main() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Falta la cuenta de servicio configurada.');
  const credentials = JSON.parse(raw);
  console.log(JSON.stringify({
    configuredIdentityMatchesSharedAccount: credentials.client_email ===
      'causa-drive-sync@centro-operativo-cpsl.iam.gserviceaccount.com'
  }));
  const auth = new google.auth.GoogleAuth({
    credentials, scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly'
    ]
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '10JVeVpdyMpA25rU6CwMIyoa3-dO2EUt9';
  let metadata;
  try {
    metadata = await sheets.spreadsheets.get({
      spreadsheetId, fields: 'sheets(properties(sheetId,title))'
    });
  } catch (error) {
    if (error.response?.status !== 400) throw error;
    const drive = google.drive({ version: 'v3', auth });
    const file = await drive.files.get({ fileId: spreadsheetId, fields: 'mimeType,size', supportsAllDrives: true });
    if (file.data.mimeType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        !Number.isFinite(Number(file.data.size)) || Number(file.data.size) > 10 * 1024 * 1024) throw error;
    const response = await drive.files.get({ fileId: spreadsheetId, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' });
    const workbook = XLSX.read(Buffer.from(response.data), { type: 'buffer', sheetRows: 20 });
    console.log(JSON.stringify({ queriedAt: new Date().toISOString(), format: 'xlsx',
      requestedGoogleGidApplicable: false, sheets: summarizeWorkbookStructure(workbook) }, null, 2));
    return;
  }
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
