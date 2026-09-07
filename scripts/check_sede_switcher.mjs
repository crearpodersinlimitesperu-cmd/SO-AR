import puppeteer from 'puppeteer';
import 'dotenv/config';

async function checkSedeSwitcher() {
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

    // Inspect header, navbar, top-right menu
    const headerInfo = await page.evaluate(() => {
      const topElements = Array.from(document.querySelectorAll('header, nav, .navbar, .topbar, .user-panel, .dropdown')).map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.innerText.trim(),
        html: el.innerHTML.slice(0, 300)
      }));
      const buttons = Array.from(document.querySelectorAll('header button, nav button, .navbar a, .dropdown-menu a')).map(b => ({
        text: b.innerText.trim(),
        href: b.href || '',
        onclick: b.getAttribute('onclick') || ''
      }));
      return { topElements, buttons };
    });

    console.log('Header/Navbar Info:');
    console.log(JSON.stringify(headerInfo, null, 2));

    // Also inspect what is inside /usuarios
    console.log('\n--- Checking /usuarios to see current user permissions and sedes ---');
    await page.goto('https://imo.crearpslglobal.com/usuarios', { waitUntil: 'networkidle2', timeout: 35000 });
    const usuariosData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr')).map(tr => {
        return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
      });
      return { rowsCount: rows.length, rows: rows.slice(0, 20) };
    });
    console.log('Usuarios data:', JSON.stringify(usuariosData, null, 2));

  } catch(e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}

checkSedeSwitcher();
