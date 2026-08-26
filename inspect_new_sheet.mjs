import fetch from 'node-fetch';
import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const SHEET_ID = '1Qo7DIkJeS2yZcBLCV-nl5x-V_-g7Il--';

async function tryPublicExport() {
  console.log("Intentando descarga directa CSV / GVIZ via Google Visualization API...");
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    if (res.ok && text.includes('google.visualization.Query.setResponse')) {
      const jsonStr = text.replace(/^[^(]*\(/, '').replace(/\);?\s*$/, '');
      const data = JSON.parse(jsonStr);
      console.log("✅ GVIZ Data obtenido exitosamente!");
      console.log("Columnas:", data.table?.cols?.map(c => c.label));
      console.log("Total filas:", data.table?.rows?.length);
      writeFileSync('sheet_maestria_data.json', JSON.stringify(data, null, 2));
      return true;
    }
  } catch (e) {
    console.log("GVIZ falló:", e.message);
  }
  return false;
}

async function scrapeWithPuppeteer() {
  console.log("Iniciando Puppeteer para leer el Google Sheet...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?usp=drive_link`;
  console.log("Navegando a:", url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 6000));

  const title = await page.title();
  console.log("Título del documento:", title);

  const tabs = await page.evaluate(() => {
    const tabElements = document.querySelectorAll('.docs-sheet-tab-name, .grid-bottom-bar .docs-sheet-tab');
    return Array.from(tabElements).map(el => el.innerText.trim()).filter(Boolean);
  });
  console.log("📑 Pestañas encontradas:", tabs);

  const gridData = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.waffle tr'));
    if (rows.length > 0) {
      return rows.slice(0, 50).map(tr => Array.from(tr.querySelectorAll('td, th')).map(c => c.innerText.trim()));
    }
    return [];
  });

  console.log("Filas capturadas de la tabla:", gridData.length);
  if (gridData.length > 0) {
    console.log("Muestra de primeras 10 filas:", gridData.slice(0, 10));
    writeFileSync('sheet_maestria_grid.json', JSON.stringify({ title, tabs, gridData }, null, 2));
  }

  await browser.close();
}

async function main() {
  const gvizOk = await tryPublicExport();
  if (!gvizOk) {
    await scrapeWithPuppeteer();
  }
}

main().catch(console.error);
