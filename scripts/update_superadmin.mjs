import puppeteer from 'puppeteer';
import 'dotenv/config';

async function updateToSuperAdmin() {
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
    
    // Select Super Administrador (id_rol = "1")
    await page.select('select[name="id_rol"]', '1');
    
    // Select Sin sede (id_sede = "")
    await page.select('select[name="id_sede"]', '');

    console.log('Submitting form to upgrade to Super Administrador...');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 })
    ]);

    console.log('Post-submit URL:', page.url());
    
    // Check /usuarios again
    await page.goto('https://imo.crearpslglobal.com/usuarios', { waitUntil: 'networkidle2', timeout: 35000 });
    const usersCount = await page.evaluate(() => {
      return document.querySelectorAll('table tbody tr').length;
    });
    console.log('Total users visible in /usuarios now:', usersCount);

    // Check /dashboard to see what sede or stats appear now
    await page.goto('https://imo.crearpslglobal.com/dashboard', { waitUntil: 'networkidle2', timeout: 35000 });
    const dashInfo = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select')).map(s => ({
        name: s.name || s.id,
        options: Array.from(s.options).map(o => o.text.trim())
      }));
      const text = document.body.innerText.slice(0, 500);
      return { selects, text };
    });
    console.log('Dashboard Info after SuperAdmin:', JSON.stringify(dashInfo, null, 2));

  } catch(e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}
updateToSuperAdmin();
