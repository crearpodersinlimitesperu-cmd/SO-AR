import puppeteer from 'puppeteer';
import 'dotenv/config';

async function checkFormHandlers() {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  try {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
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
    const pageScripts = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerText.trim()).filter(Boolean);
      const form = document.querySelector('form');
      return {
        formOnSubmit: form ? form.getAttribute('onsubmit') : null,
        scripts: scripts.slice(-5)
      };
    });
    console.log('Form OnSubmit:', pageScripts.formOnSubmit);
    console.log('Scripts:', pageScripts.scripts);

  } catch(e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}
checkFormHandlers();
