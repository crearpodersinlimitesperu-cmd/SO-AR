import puppeteer from 'puppeteer';
import 'dotenv/config';

async function inspectForm() {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://imo.crearpslglobal.com/dashboard', { waitUntil: 'networkidle2', timeout: 35000 });
    const userInput = await page.$('input[name="usuario"]');
    if (userInput) {
      await page.type('input[name="usuario"]', process.env.NODUS_USER || 'jsanchez');
      await page.type('input[name="password"]', process.env.NODUS_PASSWORD || '123456');
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 })
      ]);
    }
    
    await page.goto('https://imo.crearpslglobal.com/usuarios/edit/594', { waitUntil: 'networkidle2', timeout: 35000 });
    const formInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      return {
        action: form ? form.action : null,
        method: form ? form.method : null,
        innerHTML: form ? form.innerHTML : null
      };
    });
    console.log('Action:', formInfo.action, 'Method:', formInfo.method);
    console.log('Form HTML snippet:', formInfo.innerHTML?.slice(0, 1000));
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}
inspectForm();
