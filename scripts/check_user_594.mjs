import puppeteer from 'puppeteer';
import 'dotenv/config';

async function checkUserRol() {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://imo.crearpslglobal.com/dashboard', { waitUntil: 'networkidle2', timeout: 35000 });
    const userInput = await page.$('input[name="usuario"]');
    if (userInput) {
      await page.type('input[name="usuario"]', process.env.NODUS_GLOBAL_USER || 'CREARPSL');
      await page.type('input[name="password"]', process.env.NODUS_GLOBAL_PASS || 'CREARPSL26*');
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 })
      ]);
    }
    
    await page.goto('https://imo.crearpslglobal.com/usuarios', { waitUntil: 'networkidle2', timeout: 35000 });
    const row594 = await page.evaluate(() => {
      const row = Array.from(document.querySelectorAll('table tbody tr')).find(tr => tr.innerText.includes('594'));
      return row ? row.innerText.trim().replace(/\t+/g, ' | ') : 'not found';
    });
    console.log('User 594 row:', row594);

  } catch(e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}
checkUserRol();
