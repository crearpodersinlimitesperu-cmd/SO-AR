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
    
    // Buscar selector de sedes en la UI
    const selects = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('select')).map(s => ({
        name: s.name,
        id: s.id,
        options: Array.from(s.options).map(o => o.innerText.trim())
      }));
    });
    console.log("Selects en el dashboard:", JSON.stringify(selects, null, 2));

    const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.innerText.trim()));
    console.log("Links:", links.filter(l => l.includes('SEDE') || l.includes('Lima') || l.includes('Arequipa')));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
