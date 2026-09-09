import puppeteer from 'puppeteer';
import 'dotenv/config';

async function testNodus() {
  const user = process.env.NODUS_GLOBAL_USER || 'CREARPSL';
  const pwd = process.env.NODUS_GLOBAL_PASS || 'CREARPSL26*';
  console.log('Testing Nodus login with user:', user);
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://imo.crearpslglobal.com/dashboard', { waitUntil: 'networkidle2', timeout: 35000 });
    console.log('Page loaded, URL:', page.url());
    
    const userInput = await page.$('input[name="usuario"]');
    if (userInput) {
      await page.type('input[name="usuario"]', user);
      await page.type('input[name="password"]', pwd);
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 })
      ]);
    }
    console.log('After login, URL:', page.url());
    
    // Check sedes and permissions
    const info = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select')).map(s => ({
        name: s.name || s.id,
        options: Array.from(s.options).map(o => o.text.trim())
      }));
      const navLinks = Array.from(document.querySelectorAll('aside a, nav a, .sidebar a, .menu a')).map(a => ({
        text: a.innerText.trim(),
        href: a.href
      })).filter(l => l.text);
      
      return { selects, navLinks };
    });
    console.log('Selects on dashboard:', JSON.stringify(info.selects, null, 2));
    console.log('Navigation links found:', info.navLinks.length);
    console.log('Nav sample:', JSON.stringify(info.navLinks.slice(0, 20), null, 2));

    // Now test navigating to actividadcoordinadores
    console.log('\nNavigating to actividadcoordinadores...');
    await page.goto('https://imo.crearpslglobal.com/actividadcoordinadores', { waitUntil: 'networkidle2', timeout: 35000 });
    const coordInfo = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select')).map(s => ({
        name: s.name || s.id,
        options: Array.from(s.options).map(o => o.text.trim())
      }));
      const cards = Array.from(document.querySelectorAll('.card, .info-box, [class*="kpi"]')).map(c => c.innerText.trim()).filter(t => t.length > 0 && t.length < 500);
      return { selects, cardCount: cards.length, sampleCards: cards.slice(0, 3) };
    });
    console.log('Actividad Coordinadores info:', JSON.stringify(coordInfo, null, 2));

    // Now test navigating to reporte
    console.log('\nNavigating to reporte...');
    await page.goto('https://imo.crearpslglobal.com/reporte', { waitUntil: 'networkidle2', timeout: 35000 });
    const reporteInfo = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select')).map(s => ({
        name: s.name || s.id,
        options: Array.from(s.options).map(o => o.text.trim())
      }));
      return { selects, tablesCount: document.querySelectorAll('table').length };
    });
    console.log('Reporte info:', JSON.stringify(reporteInfo, null, 2));

    // Now test navigating to capitulo1
    console.log('\nNavigating to capitulo1...');
    await page.goto('https://imo.crearpslglobal.com/capitulo1', { waitUntil: 'networkidle2', timeout: 35000 });
    const c1Info = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select')).map(s => ({
        name: s.name || s.id,
        options: Array.from(s.options).map(o => o.text.trim())
      }));
      return { selects, tablesCount: document.querySelectorAll('table').length };
    });
    console.log('Capitulo1 info:', JSON.stringify(c1Info, null, 2));

    // Now test navigating to capitulo2
    console.log('\nNavigating to capitulo2...');
    await page.goto('https://imo.crearpslglobal.com/capitulo2', { waitUntil: 'networkidle2', timeout: 35000 });
    const c2Info = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select')).map(s => ({
        name: s.name || s.id,
        options: Array.from(s.options).map(o => o.text.trim())
      }));
      return { selects, tablesCount: document.querySelectorAll('table').length };
    });
    console.log('Capitulo2 info:', JSON.stringify(c2Info, null, 2));

  } catch (err) {
    console.error('Error during testNodus:', err);
  } finally {
    await browser.close();
  }
}

testNodus();
