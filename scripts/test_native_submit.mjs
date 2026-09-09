import puppeteer from 'puppeteer';
import 'dotenv/config';

async function testNativeSubmit() {
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
    
    // Select Super Administrador
    await page.select('select[name="id_rol"]', '1');

    console.log('Calling form.submit() via evaluate...');
    await Promise.all([
      page.evaluate(() => document.querySelector('form').submit()),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 })
    ]);

    console.log('Navigated to URL:', page.url());
    const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 400));
    console.log('Body snippet:', bodySnippet);

  } catch(e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}
testNativeSubmit();
