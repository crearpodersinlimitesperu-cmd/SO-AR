import xlsx from 'xlsx';
import { resolve } from 'path';

const filePath = 'c:\\Users\\josem\\Downloads\\Hojas de Cálculo\\LLAMADOS MANAGERS.xlsx';

try {
  console.log("Leyendo archivo local:", filePath);
  const wb = xlsx.readFile(filePath);
  console.log("📑 Pestañas (Sheets) en LLAMADOS MANAGERS.xlsx:", wb.SheetNames);

  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
    console.log(`\n======================================================`);
    console.log(`Pestaña: ${sheetName} | Total Filas: ${data.length}`);
    console.log(`======================================================`);
    if (data.length > 0) {
      console.log("Headers / Fila 1:", data[0]);
      if (data.length > 1) console.log("Fila 2:", data[1]);
      if (data.length > 2) console.log("Fila 3:", data[2]);
    }
  });
} catch (e) {
  console.error("Error leyendo Excel:", e.message);
}
