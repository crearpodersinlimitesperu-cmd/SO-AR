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
    
    console.log("Intentando cambiar a Sede 3 (Guayaquil)...");
    const response = await page.goto('https://imo.crearpslglobal.com/auth/setSede/3', { waitUntil: 'networkidle2' });
    console.log("Status:", response.status());
    
    // Ver dashboard despues del cambio
    await page.goto('https://imo.crearpslglobal.com/', { waitUntil: 'networkidle2' });
    const currentSede = await page.evaluate(() => {
        const el = document.querySelector('.bg-light.d-flex span.fw-semibold');
        return el ? el.innerText : null;
    });
    console.log("Sede actual en dashboard:", currentSede);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
