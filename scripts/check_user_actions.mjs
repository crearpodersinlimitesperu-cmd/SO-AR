import puppeteer from 'puppeteer';
import 'dotenv/config';

async function checkUserActions() {
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
    const actions = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr')).map(tr => {
        const btns = Array.from(tr.querySelectorAll('button, a')).map(b => ({
          text: b.innerText.trim() || b.title || b.getAttribute('aria-label'),
          href: b.href || '',
          onclick: b.getAttribute('onclick') || '',
          html: b.outerHTML
        }));
        return {
          user: tr.querySelectorAll('td')[1]?.innerText.trim(),
          btns
        };
      });
      const topBtns = Array.from(document.querySelectorAll('.card-header button, .card-header a, .page-header button, .page-header a')).map(b => b.innerText.trim() || b.title);
      return { topBtns, rows: rows.slice(0, 5) };
    });
    console.log('User actions:', JSON.stringify(actions, null, 2));

  } catch(e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}
checkUserActions();
