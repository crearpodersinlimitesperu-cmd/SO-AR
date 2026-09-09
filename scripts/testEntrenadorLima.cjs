const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://imo.crearpslglobal.com/', { waitUntil: 'networkidle2', timeout: 60000 });
    
    if (await page.$('input[name="usuario"]')) {
        await page.type('input[name="usuario"]', 'entrenadorlima');
        await page.type('input[name="password"]', 'entrenadorlima');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
            page.click('button[type="submit"]')
        ]);
    }
    
    const currentSede = await page.evaluate(() => {
        const el = document.querySelector('.bg-light.d-flex span.fw-semibold');
        return el ? el.innerText : null;
    });
    console.log("Sede actual en dashboard:", currentSede);

    const hasSedesOption = await page.evaluate(() => {
        return !!document.querySelector('a[href*="/sedes"]');
    });
    console.log("Tiene opcion de Sedes?:", hasSedesOption);

    // Try to access Maestria for Team 5 (Cuenca)
    const canSeeCuenca = await page.evaluate(async () => {
        try {
            const res = await fetch('https://imo.crearpslglobal.com/maestria/buscar/5/PFD?q=&excluidos=');
            return res.ok;
        } catch(e) { return false; }
    });
    console.log("Puede ver Cuenca (ID 5)?", canSeeCuenca);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
