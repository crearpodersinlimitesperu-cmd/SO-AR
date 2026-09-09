const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://imo.crearpslglobal.com/', { waitUntil: 'networkidle2', timeout: 60000 });
    
    if (await page.$('input[name="usuario"]')) {
        await page.type('input[name="usuario"]', 'CREARPSL');
        await page.type('input[name="password"]', 'CREARPSL26*');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
            page.click('button[type="submit"]')
        ]);
    }
    
    // Go to Maestria and check which teams are visible
    await page.goto('https://imo.crearpslglobal.com/maestria', { waitUntil: 'networkidle2', timeout: 60000 });
    
    const equiposActivos = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('.card-header span'));
        return els.map(el => el.innerText);
    });
    console.log("Equipos visibles en /maestria para SuperAdmin:", equiposActivos);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
