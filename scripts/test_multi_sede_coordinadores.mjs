import puppeteer from 'puppeteer';
import 'dotenv/config';

async function testAllSedesCoordinadores() {
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

    const sedesList = [
      { id: 2, name: 'QUITO CICLO 2' },
      { id: 3, name: 'GUAYAQUIL CICLO 1' },
      { id: 5, name: 'CUENCA CICLO 1' },
      { id: 7, name: 'LIMA CICLO 1' },
      { id: 11, name: 'MÉXICO CICLO 1' },
      { id: 13, name: 'MEDELLÍN CICLO 1' }
    ];

    for (const sede of sedesList) {
      console.log(`\n========================================`);
      console.log(`Checking Sede: ${sede.name} (id_sede=${sede.id})`);
      const targetUrl = `https://imo.crearpslglobal.com/actividadcoordinadores?id_sede=${sede.id}`;
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 35000 });
      
      const res = await page.evaluate(() => {
        const titleEl = document.querySelector('h1, h2, h3, .card-title, .page-title');
        const cards = Array.from(document.querySelectorAll('.card, .info-box, [class*="kpi"]')).map(c => c.innerText.trim()).filter(t => t.length > 0 && t.length < 800);
        return {
          currentUrl: window.location.href,
          title: titleEl ? titleEl.innerText.trim() : '',
          cardsCount: cards.length,
          sampleCards: cards.slice(0, 4)
        };
      });

      console.log(`Result: URL=${res.currentUrl}, cards=${res.cardsCount}`);
      if (res.sampleCards.length > 0) {
        console.log(`Sample card 1:\n${res.sampleCards[0].slice(0, 150)}...`);
        if (res.sampleCards.length > 1) {
          console.log(`Sample card 2:\n${res.sampleCards[1].slice(0, 150)}...`);
        }
      }
    }
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}

testAllSedesCoordinadores();
