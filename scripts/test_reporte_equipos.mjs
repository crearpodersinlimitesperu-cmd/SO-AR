import puppeteer from 'puppeteer';
import 'dotenv/config';

async function testReporteEquipos() {
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

    await page.goto('https://imo.crearpslglobal.com/reporte', { waitUntil: 'networkidle2', timeout: 35000 });

    const activeEquipos = await page.evaluate(() => {
      const select = document.querySelector('select[name="id_equipo"]');
      if (!select) return [];
      return Array.from(select.options)
        .filter(o => o.value && o.text.includes('✓'))
        .map(o => ({ value: o.value, text: o.text.trim() }));
    });

    console.log(`Encontrados ${activeEquipos.length} equipos activos (con ✓):`);
    console.log(activeEquipos.slice(0, 10));

    // Test extracting 2 teams
    const testTeams = activeEquipos.slice(0, 2);
    for (const team of testTeams) {
      console.log(`\nConsultando equipo ${team.text} (id: ${team.value})...`);
      await page.goto(`https://imo.crearpslglobal.com/reporte?id_equipo=${team.value}`, { waitUntil: 'networkidle2', timeout: 35000 });
      
      const rows = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('table tbody tr'));
        return trs.map(tr => {
          const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
          return {
            apellidos: tds[1] || '',
            nombres: tds[2] || '',
            nombrePreferido: tds[3] || '',
            telefono: tds[4] || '',
            coordinador: tds[5] || '',
            imo: tds[6] || '',
            llamada1: tds[8] || '',
            llamada2: tds[9] || '',
            asistencia: tds[11] || '',
            pago: tds[13] || ''
          };
        });
      });

      console.log(`Equipo ${team.text}: ${rows.length} participantes extraídos.`);
      if (rows.length > 0) {
        console.log('Muestra de 1 participante:', rows[0]);
      }
    }

  } catch (e) {
    console.error("Error:", e);
  } finally {
    await browser.close();
  }
}

testReporteEquipos();
