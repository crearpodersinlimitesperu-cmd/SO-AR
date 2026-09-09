import puppeteer from 'puppeteer';
import 'dotenv/config';

async function testSubmit() {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  try {
    page.on('dialog', async dialog => {
      console.log('Dialog opened:', dialog.message());
      await dialog.accept();
    });

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
    
    // Check if id_rol can be changed to 1
    await page.select('select[name="id_rol"]', '1');
    
    console.log('Clicking button...');
    const navPromise = page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(e => 'No nav: ' + e.message);
    await page.click('button[type="submit"]');
    const res = await navPromise;
    console.log('Nav result:', res);
    console.log('Current URL:', page.url());

    const alertMsg = await page.evaluate(() => {
      const alert = document.querySelector('.alert, .toast, .swal2-title, .modal-body');
      return alert ? alert.innerText.trim() : null;
    });
    console.log('Alert/Message:', alertMsg);

  } catch(e) {
    console.error('Error in testSubmit:', e);
  } finally {
    await browser.close();
  }
}
testSubmit();
