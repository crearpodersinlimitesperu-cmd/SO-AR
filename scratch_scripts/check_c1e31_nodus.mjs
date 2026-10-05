import puppeteer from 'puppeteer';

async function checkNodus() {
  console.log('🚀 Conectando a Nodus en vivo para C1E31 Lima...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    await page.goto('https://imo.crearpslglobal.com/dashboard', { waitUntil: 'networkidle2', timeout: 35000 });
    await page.type('input[name="usuario"]', 'jsanchez');
    await page.type('input[name="password"]', '123456');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 })
    ]);
    console.log('✅ Sesión iniciada con éxito en Nodus.');

    // 1. Revisar /capitulo1
    console.log('\n🔍 Consultando /capitulo1...');
    await page.goto('https://imo.crearpslglobal.com/capitulo1', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    const cap1Data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr')).map(tr => 
        Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
      );
      const headers = Array.from(document.querySelectorAll('th')).map(th => th.innerText.trim());
      const badges = Array.from(document.querySelectorAll('.card, .info-box, .badge, .small-box, [class*="stat"]')).map(el => el.innerText.trim());
      return { headers, rowsCount: rows.length, sample: rows.slice(0, 25), badges: badges.slice(0, 15) };
    });
    console.log('Capitulo 1 Table Headers:', cap1Data.headers.join(' | '));
    console.log('Capitulo 1 Total Filas:', cap1Data.rowsCount);
    console.log('Badges:', cap1Data.badges.join(' | '));
    console.log('Filas Capitulo 1:');
    cap1Data.sample.forEach(r => console.log('  ', r.join(' | ')));

    // 2. Revisar /mesaregistro
    console.log('\n🔍 Consultando /mesaregistro...');
    await page.goto('https://imo.crearpslglobal.com/mesaregistro', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    const mesaData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr')).map(tr => 
        Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
      );
      const headers = Array.from(document.querySelectorAll('th')).map(th => th.innerText.trim());
      const badges = Array.from(document.querySelectorAll('.card, .info-box, .badge, .small-box, [class*="stat"]')).map(el => el.innerText.trim());
      return { headers, rowsCount: rows.length, sample: rows.slice(0, 25), badges: badges.slice(0, 15) };
    });
    console.log('\nMesa Registro Headers:', mesaData.headers.join(' | '));
    console.log('Mesa Registro Total Filas:', mesaData.rowsCount);
    console.log('Badges Mesa Registro:', mesaData.badges.join(' | '));
    console.log('Filas Mesa Registro:');
    mesaData.sample.forEach(r => console.log('  ', r.join(' | ')));

    // 3. Revisar /reporte
    console.log('\n🔍 Consultando /reporte...');
    await page.goto('https://imo.crearpslglobal.com/reporte', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    const reporteData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr')).map(tr => 
        Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
      );
      const headers = Array.from(document.querySelectorAll('th')).map(th => th.innerText.trim());
      return { headers, rowsCount: rows.length, sample: rows.slice(0, 25) };
    });
    console.log('\nReporte Asistencia Headers:', reporteData.headers.join(' | '));
    console.log('Reporte Asistencia Total Filas:', reporteData.rowsCount);
    console.log('Filas Reporte Asistencia:');
    reporteData.sample.forEach(r => console.log('  ', r.join(' | ')));

  } catch (err) {
    console.error('❌ Error en rastreo:', err.message);
  } finally {
    await browser.close();
  }
}

checkNodus();
