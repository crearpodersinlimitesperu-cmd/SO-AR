const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log("Navegando a Nodus...");
    await page.goto('https://imo.crearpslglobal.com/', { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log("Completando login...");
    await page.type('input[name="usuario"]', process.env.NODUS_GLOBAL_USER || 'CREARPSL');
    await page.type('input[name="password"]', process.env.NODUS_GLOBAL_PASS || 'CREARPSL26*');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log("Login exitoso. Extrayendo menú...");
    
    const menuLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      return links.map(l => ({ text: l.innerText.trim(), href: l.href })).filter(l => l.text);
    });
    
    console.log(JSON.stringify(menuLinks, null, 2));
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
