import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const folders = [
  { id: '1i60YXyxRrFP1LxmXUVuHK5eRyeUBzR0r', name: 'Carpeta 1 (1i60YXyxRrFP1LxmXUVuHK5eRyeUBzR0r)' },
  { id: '1oi7mUG619dQ2ZVzHzUyO5Xkwti-jgDFl', name: 'Carpeta 2 (1oi7mUG619dQ2ZVzHzUyO5Xkwti-jgDFl)' }
];

async function inspectFolder(browser, folder) {
  console.log(`\n======================================================`);
  console.log(`Explorando ${folder.name}: https://drive.google.com/drive/folders/${folder.id}`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });
  const url = `https://drive.google.com/drive/folders/${folder.id}?usp=sharing`;
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 8000));

    const pageTitle = await page.title();
    console.log("Título de página:", pageTitle);

    const data = await page.evaluate(() => {
      const fileNodes = Array.from(document.querySelectorAll('[data-target="doc"], [data-id], [role="row"], div[aria-label]'))
        .map(el => {
          return {
            ariaLabel: el.getAttribute('aria-label'),
            text: el.innerText?.trim()?.replace(/\s+/g, ' '),
            role: el.getAttribute('role'),
            dataId: el.getAttribute('data-id')
          };
        })
        .filter(x => x.ariaLabel || (x.text && x.text.length > 2));

      const allText = document.body.innerText;
      
      const elementsWithText = Array.from(document.querySelectorAll('*'))
        .map(el => el.innerText?.trim())
        .filter(t => t && t.length > 2 && t.length < 200 && !t.includes('\n'));

      const uniqueTexts = [...new Set(elementsWithText)];
      return { 
        allTextSnippet: allText.slice(0, 3000), 
        uniqueTexts: uniqueTexts.slice(0, 100),
        fileNodes: fileNodes.slice(0, 60)
      };
    });

    console.log("\n--- TEXTOS EXTRAÍDOS ---");
    console.log(data.uniqueTexts.filter(t => !t.includes('Google') && !t.includes('Drive') && !t.includes('Iniciar sesión')).slice(0, 40));

    const screenshotPath = `drive_folder_${folder.id}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`Captura guardada en ${screenshotPath}`);

    return { folder, pageTitle, data };
  } catch (err) {
    console.error(`Error en ${folder.name}:`, err.message);
    return { folder, error: err.message };
  } finally {
    await page.close();
  }
}

async function main() {
  console.log("Iniciando Puppeteer para escanear carpetas de vuelos...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000']
  });

  const results = [];
  for (const f of folders) {
    const res = await inspectFolder(browser, f);
    results.push(res);
  }

  await browser.close();
  writeFileSync('inspect_vuelos_folders_result.json', JSON.stringify(results, null, 2));
  console.log("\nProceso finalizado. Guardado en inspect_vuelos_folders_result.json");
}

main().catch(console.error);
