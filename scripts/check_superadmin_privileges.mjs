import puppeteer from 'puppeteer';
import 'dotenv/config';

async function checkSuperAdminPrivileges() {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  try {
    // Logout first to clear any old session
    await page.goto('https://imo.crearpslglobal.com/auth/logout', { waitUntil: 'networkidle2', timeout: 35000 }).catch(() => {});
    
    // Login anew
    await page.goto('https://imo.crearpslglobal.com/auth/login', { waitUntil: 'networkidle2', timeout: 35000 });
    await page.type('input[name="usuario"]', process.env.NODUS_GLOBAL_USER || 'CREARPSL');
    await page.type('input[name="password"]', process.env.NODUS_GLOBAL_PASS || 'CREARPSL26*');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 })
    ]);

    console.log('Logged in! URL:', page.url());

    // Check /dashboard
    const dashInfo = await page.evaluate(() => {
      const topSelects = Array.from(document.querySelectorAll('select')).map(s => ({
        name: s.name || s.id,
        options: Array.from(s.options).map(o => o.text.trim())
      }));
      return { topSelects, text: document.body.innerText.slice(0, 500) };
    });
    console.log('Dashboard Info:', JSON.stringify(dashInfo, null, 2));

    // Check /actividadcoordinadores
    await page.goto('https://imo.crearpslglobal.com/actividadcoordinadores', { waitUntil: 'networkidle2', timeout: 35000 });
    const coordInfo = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select')).map(s => ({
        name: s.name || s.id,
        options: Array.from(s.options).map(o => ({ value: o.value, text: o.text.trim(), selected: o.selected }))
      }));
      const cards = Array.from(document.querySelectorAll('.card')).map(c => c.innerText.trim()).filter(Boolean);
      return { selects, cardsCount: cards.length, sampleCard: cards[1]?.slice(0, 300) };
    });
    console.log('Actividad Coordinadores Info:', JSON.stringify(coordInfo, null, 2));

    // Check /reporte
    await page.goto('https://imo.crearpslglobal.com/reporte', { waitUntil: 'networkidle2', timeout: 35000 });
    const reporteInfo = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select')).map(s => ({
        name: s.name || s.id,
        options: Array.from(s.options).map(o => ({ value: o.value, text: o.text.trim() }))
      }));
      return selects;
    });
    console.log('Reporte Selects:', JSON.stringify(reporteInfo, null, 2));

    // Check /sedes
    await page.goto('https://imo.crearpslglobal.com/sedes', { waitUntil: 'networkidle2', timeout: 35000 });
    const sedesList = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('table tbody tr')).map(tr => {
        return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
      });
    });
    console.log('Sedes List:', JSON.stringify(sedesList, null, 2));

  } catch(e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}
checkSuperAdminPrivileges();
