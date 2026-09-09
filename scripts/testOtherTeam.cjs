const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://imo.crearpslglobal.com/', { waitUntil: 'networkidle2', timeout: 60000 });
    
    if (await page.$('input[name="usuario"]')) {
        await page.type('input[name="usuario"]', process.env.NODUS_GLOBAL_USER || 'CREARPSL');
        await page.type('input[name="password"]', process.env.NODUS_GLOBAL_PASS || 'CREARPSL26*');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
            page.click('button[type="submit"]')
        ]);
    }
    
    // Probar con un ID bajo o de otra sede, ej. Equipo 17, o 50
    const url = 'https://imo.crearpslglobal.com/maestria/equipo/14/PFD';
    const response = await page.goto(url, { waitUntil: 'networkidle2' });
    console.log("Status:", response.status());
    const title = await page.title();
    console.log("Title:", title);
    
    const teamName = await page.evaluate(() => {
        const span = document.querySelector('.card-header span');
        return span ? span.innerText : 'No se encontro nombre de equipo';
    });
    console.log("Nombre encontrado:", teamName);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
