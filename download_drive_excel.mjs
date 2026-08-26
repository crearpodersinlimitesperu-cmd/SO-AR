import fetch from 'node-fetch';
import { writeFileSync } from 'fs';

const FILE_ID = '1Qo7DIkJeS2yZcBLCV-nl5x-V_-g7Il--';

async function main() {
  console.log("Intentando descargar el archivo directo de Google Drive...");
  
  const urls = [
    `https://docs.google.com/spreadsheets/d/${FILE_ID}/export?format=xlsx`,
    `https://docs.google.com/spreadsheets/d/${FILE_ID}/export?format=csv`,
    `https://drive.google.com/uc?export=download&id=${FILE_ID}`
  ];

  for (const url of urls) {
    console.log("\nProbando URL:", url);
    try {
      const res = await fetch(url, { redirect: 'follow' });
      const contentType = res.headers.get('content-type') || '';
      console.log("Status:", res.status, "Content-Type:", contentType);

      if (res.ok) {
        const buffer = await res.buffer();
        console.log("Tamaño descargado:", buffer.length, "bytes");

        if (contentType.includes('spreadsheet') || contentType.includes('excel') || contentType.includes('octet-stream') || buffer.length > 5000) {
          if (contentType.includes('html') && buffer.toString('utf8').includes('ServiceLogin')) {
            console.log("⚠️ Requiere inicio de sesión (Privado en Drive).");
          } else {
            console.log("✅ Descargado archivo!");
            writeFileSync('downloaded_maestria_file.bin', buffer);
            if (url.includes('xlsx')) writeFileSync('maestria.xlsx', buffer);
            return;
          }
        } else {
          console.log("Respuesta corta / HTML:", buffer.toString('utf8').slice(0, 300));
        }
      }
    } catch (e) {
      console.log("Error:", e.message);
    }
  }
}

main().catch(console.error);
