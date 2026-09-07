import puppeteer from 'puppeteer';
import 'dotenv/config';

async function checkCoordReport() {
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
    
    await page.goto('https://imo.crearpslglobal.com/actividadcoordinadores', { waitUntil: 'networkidle2', timeout: 35000 });
    const actionLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a, button')).map(el => ({
        tag: el.tagName,
        text: el.innerText.trim(),
        href: el.href || '',
        onclick: el.getAttribute('onclick') || ''
      })).filter(x => x.text.includes('Reporte') || x.text.includes('Exportar') || x.text.includes('Participante'));
    });
    console.log('Action buttons/links:', JSON.stringify(actionLinks, null, 2));

    for (const item of actionLinks) {
      if (item.href && item.href.startsWith('http')) {
        console.log('\n--- Inspecting link:', item.text, '->', item.href);
        await page.goto(item.href, { waitUntil: 'networkidle2', timeout: 35000 });
        const reportContent = await page.evaluate(() => {
          const headers = Array.from(document.querySelectorAll('table th')).map(th => th.innerText.trim());
          const rows = Array.from(document.querySelectorAll('table tbody tr')).map(tr => {
            return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
          });
          const selects = Array.from(document.querySelectorAll('select')).map(s => ({
            name: s.name || s.id,
            options: Array.from(s.options).map(o => o.text.trim())
          }));
          return { url: window.location.href, headers, rowCount: rows.length, sampleRow: rows[0] || null, selects };
        });
        console.log('Content:', JSON.stringify(reportContent, null, 2));
      }
    }
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}
checkCoordReport();
