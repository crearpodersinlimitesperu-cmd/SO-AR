import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const FOLDER_ID = '1Wd-fJMe5LCk1gC6sxochbgg3QbAufDlk';

async function main() {
  console.log("Iniciando Puppeteer para explorar Google Drive Folder:", FOLDER_ID);
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });
  const url = `https://drive.google.com/drive/folders/${FOLDER_ID}?usp=drive_link`;
  console.log("Navegando a:", url);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 6000));

    const title = await page.title();
    console.log("Título:", title);

    const files = await page.evaluate(() => {
      // Extraer nombres de archivos / elementos en la lista de Drive
      const items = Array.from(document.querySelectorAll('[data-id], [role="row"], [role="gridcell"], div[aria-label]'));
      const textList = Array.from(document.querySelectorAll('div, span, a'))
        .map(el => el.innerText?.trim())
        .filter(t => t && t.length > 3 && t.length < 120 && !t.includes('\n'));
      
      const uniqueTexts = [...new Set(textList)];
      return { title: document.title, sampleTexts: uniqueTexts.slice(0, 50) };
    });

    console.log("Resultados:", JSON.stringify(files, null, 2));
    writeFileSync('drive_folder_scan.json', JSON.stringify({ title, files }, null, 2));
  } catch (e) {
    console.error("Error explorando carpeta:", e.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
