import puppeteer from 'puppeteer';
import 'dotenv/config';

async function checkSubmitBtn() {
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
    const submitInfo = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"], form button, .btn-primary')).map(b => ({
        tag: b.tagName,
        type: b.type,
        text: b.innerText.trim(),
        html: b.outerHTML
      }));
      return btns;
    });
    console.log('Submit Buttons:', JSON.stringify(submitInfo, null, 2));

  } catch(e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}
checkSubmitBtn();
