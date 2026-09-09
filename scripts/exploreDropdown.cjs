const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://imo.crearpslglobal.com/', { waitUntil: 'networkidle2' });
    
    await page.type('input[name="usuario"]', process.env.NODUS_GLOBAL_USER || 'CREARPSL');
    await page.type('input[name="password"]', process.env.NODUS_GLOBAL_PASS || 'CREARPSL26*');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    await page.goto('https://imo.crearpslglobal.com/reporte', { waitUntil: 'networkidle2' });
    const options = await page.evaluate(() => {
      const select = document.querySelector('select[name="id_equipo"]');
      if (!select) return [];
      return Array.from(select.options).map(o => ({ value: o.value, text: o.text }));
    });
    console.log("Opciones en /reporte:", JSON.stringify(options, null, 2));
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
