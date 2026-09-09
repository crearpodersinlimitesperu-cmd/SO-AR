const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://imo.crearpslglobal.com/', { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Check login
    if (await page.$('input[name="usuario"]')) {
        await page.type('input[name="usuario"]', process.env.NODUS_GLOBAL_USER || 'CREARPSL');
        await page.type('input[name="password"]', process.env.NODUS_GLOBAL_PASS || 'CREARPSL26*');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
            page.click('button[type="submit"]')
        ]);
    }
    
    // Fetch JSON API from within the page context to keep session cookies
    const data = await page.evaluate(async () => {
        const res = await fetch('https://imo.crearpslglobal.com/maestria/buscar/111/TFD?q=&excluidos=');
        return res.json();
    });
    
    console.log(JSON.stringify(data, null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
