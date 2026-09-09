import puppeteer from 'puppeteer';
import 'dotenv/config';

async function checkUserEdit() {
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
    const formFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
        name: el.name || el.id,
        type: el.type || el.tagName,
        value: el.value,
        options: el.tagName === 'SELECT' ? Array.from(el.options).map(o => ({ value: o.value, text: o.text, selected: o.selected })) : null
      }));
      return inputs;
    });
    console.log('User 594 Edit Form Fields:', JSON.stringify(formFields, null, 2));

  } catch(e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}
checkUserEdit();
