import puppeteer from 'puppeteer';
import 'dotenv/config';

async function checkSedesAndC1() {
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
    
    // 1. Visit /sedes
    console.log('--- Checking /sedes ---');
    await page.goto('https://imo.crearpslglobal.com/sedes', { waitUntil: 'networkidle2', timeout: 35000 });
    const sedesData = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('table th')).map(th => th.innerText.trim());
      const rows = Array.from(document.querySelectorAll('table tbody tr')).map(tr => {
        return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
      });
      return { headers, rows };
    });
    console.log('SEDES DATA:', JSON.stringify(sedesData, null, 2));

    // 2. Visit /entrenamientos
    console.log('\n--- Checking /entrenamientos ---');
    await page.goto('https://imo.crearpslglobal.com/entrenamientos', { waitUntil: 'networkidle2', timeout: 35000 });
    const entrenamientosData = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('table th')).map(th => th.innerText.trim());
      const rows = Array.from(document.querySelectorAll('table tbody tr')).map(tr => {
        return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
      });
      return { headers, rows: rows.slice(0, 15) };
    });
    console.log('ENTRENAMIENTOS DATA:', JSON.stringify(entrenamientosData, null, 2));

    // 3. Visit /equipos
    console.log('\n--- Checking /equipos ---');
    await page.goto('https://imo.crearpslglobal.com/equipos', { waitUntil: 'networkidle2', timeout: 35000 });
    const equiposData = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('table th')).map(th => th.innerText.trim());
      const rows = Array.from(document.querySelectorAll('table tbody tr')).map(tr => {
        return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
      });
      return { headers, rowsCount: rows.length, rows: rows.slice(0, 10) };
    });
    console.log('EQUIPOS DATA:', JSON.stringify(equiposData, null, 2));

    // 4. Visit /gestionc1 and /gestionc2
    console.log('\n--- Checking /gestionc1 ---');
    await page.goto('https://imo.crearpslglobal.com/gestionc1', { waitUntil: 'networkidle2', timeout: 35000 });
    const gestionC1 = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select')).map(s => ({
        name: s.name || s.id,
        options: Array.from(s.options).map(o => o.text.trim())
      }));
      const headers = Array.from(document.querySelectorAll('table th')).map(th => th.innerText.trim());
      const rowsCount = document.querySelectorAll('table tbody tr').length;
      return { selects, headers, rowsCount };
    });
    console.log('GESTION C1 DATA:', JSON.stringify(gestionC1, null, 2));

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

checkSedesAndC1();
