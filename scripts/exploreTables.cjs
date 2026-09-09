const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
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
    
    console.log("Explorando /participantes...");
    await page.goto('https://imo.crearpslglobal.com/participantes', { waitUntil: 'networkidle2' });
    const partHeaders = await page.evaluate(() => Array.from(document.querySelectorAll('table thead th')).map(th => th.innerText.trim()));
    console.log("Headers en /participantes:", partHeaders);

    console.log("Explorando /seguimiento...");
    await page.goto('https://imo.crearpslglobal.com/seguimiento', { waitUntil: 'networkidle2' });
    const segHeaders = await page.evaluate(() => Array.from(document.querySelectorAll('table thead th')).map(th => th.innerText.trim()));
    console.log("Headers en /seguimiento:", segHeaders);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
