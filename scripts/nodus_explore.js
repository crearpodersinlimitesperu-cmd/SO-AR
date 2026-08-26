import puppeteer from 'puppeteer';
import 'dotenv/config';
import fs from 'fs';

async function exploreNodus() {
  console.log("Iniciando exploración de Nodus...");
  const browser = await puppeteer.launch({ headless: "new", defaultViewport: { width: 1920, height: 1080 } });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://imo.crearpslglobal.com/dashboard', { waitUntil: 'networkidle2' });

    const user = process.env.NODUS_USER;
    const pwd = process.env.NODUS_PASSWORD;

    await page.type('input[name="usuario"]', user);
    await page.type('input[name="password"]', pwd);
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);

    console.log("Inicio de sesión exitoso. Tomando captura de pantalla...");
    
    await new Promise(r => setTimeout(r, 5000));
    
    await page.screenshot({ path: 'nodus_dashboard.png', fullPage: true });

    console.log("Extrayendo estructura HTML del menú lateral y de los KPIs...");
    const htmlStructure = await page.evaluate(() => {
      const menu = document.querySelector('nav, .sidebar, .menu, aside') ? document.querySelector('nav, .sidebar, .menu, aside').outerHTML : "No se encontró menú";
      const content = document.querySelector('main, .content, #content, .container-fluid, .dashboard') ? document.querySelector('main, .content, #content, .container-fluid, .dashboard').outerHTML : "No se encontró contenido principal";
      return { menu, content };
    });

    fs.writeFileSync('nodus_dom.json', JSON.stringify(htmlStructure, null, 2));
    
    console.log("Exploración finalizada.");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
}

exploreNodus();
