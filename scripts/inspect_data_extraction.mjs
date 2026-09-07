import puppeteer from 'puppeteer';
import 'dotenv/config';

async function inspectDataExtraction() {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://imo.crearpslglobal.com/auth/login', { waitUntil: 'networkidle2', timeout: 35000 });
    await page.type('input[name="usuario"]', process.env.NODUS_USER || 'jsanchez');
    await page.type('input[name="password"]', process.env.NODUS_PASSWORD || '123456');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 })
    ]);

    // 1. Inspect Actividad Coordinadores (Todas las sedes)
    await page.goto('https://imo.crearpslglobal.com/actividadcoordinadores', { waitUntil: 'networkidle2', timeout: 35000 });
    const coordinadores = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.card')).filter(c => {
        return c.querySelector('.card-header, h5, h6') && c.innerText.includes('Gestiones');
      });

      return cards.map(c => {
        const header = c.querySelector('.card-header, h5, h6')?.innerText.trim() || '';
        const text = c.innerText;
        return {
          header,
          rawText: text
        };
      });
    });

    console.log(`Extracted ${coordinadores.length} coordinadores cards!`);
    console.log('Sample Coordinador 1:', coordinadores[0]);
    console.log('Sample Coordinador 2:', coordinadores[1]);

    // 2. Inspect Reporte Asistencia with an active equipo (e.g. Equipo 28 Lima, id 111, or Equipo 120 Quito, id 108)
    await page.goto('https://imo.crearpslglobal.com/reporte?id_equipo=111', { waitUntil: 'networkidle2', timeout: 35000 });
    const reporteDetails = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table')).map(t => {
        const headers = Array.from(t.querySelectorAll('thead th')).map(th => th.innerText.trim());
        const rows = Array.from(t.querySelectorAll('tbody tr')).map(tr => 
          Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
        );
        return { headers, rowCount: rows.length, sampleRows: rows.slice(0, 3) };
      });

      const cards = Array.from(document.querySelectorAll('.card, .info-box, [class*="kpi"]')).map(c => c.innerText.trim()).filter(t => t.length > 0 && t.length < 500);

      return { tables, cardsCount: cards.length, sampleCards: cards.slice(0, 5) };
    });

    console.log('Reporte Equipo 111 Details:');
    console.log(JSON.stringify(reporteDetails, null, 2));

  } catch(e) {
    console.error('Error in inspectDataExtraction:', e);
  } finally {
    await browser.close();
  }
}

inspectDataExtraction();
