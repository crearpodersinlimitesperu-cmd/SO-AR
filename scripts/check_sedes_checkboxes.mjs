import puppeteer from 'puppeteer';
import 'dotenv/config';

async function checkSedesCheckboxes() {
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
    
    await page.goto('https://imo.crearpslglobal.com/usuarios/edit/594', { waitUntil: 'networkidle2', timeout: 35000 });
    const sedesCheckboxes = await page.evaluate(() => {
      const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]')).map(cb => ({
        name: cb.name,
        value: cb.value,
        checked: cb.checked,
        label: cb.parentElement ? cb.parentElement.innerText.trim() : ''
      }));
      return cbs;
    });
    console.log('Sedes Checkboxes:', JSON.stringify(sedesCheckboxes, null, 2));

  } catch(e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}
checkSedesCheckboxes();
