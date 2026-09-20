import puppeteer from 'puppeteer';
import fs from 'fs';

async function verifyAllSources() {
  console.log('===================================================================');
  console.log('🔍 VERIFICACIÓN PROFUNDA EN NODUS Y TODAS LAS FUENTES — C1E31 LIMA');
  console.log('===================================================================');

  // 1. VERIFICAR ARCHIVOS LOCALES Y DRIVE DUMPS
  console.log('\n--- 1. VERIFICANDO FUENTES LOCALES Y DRIVE DUMPS ---');
  
  const driveDir = './src/data/reportes_drive';
  if (fs.existsSync(driveDir)) {
    const driveFiles = fs.readdirSync(driveDir);
    console.log('Ficheros en reportes_drive:', driveFiles);
    driveFiles.forEach(f => {
      if (f.endsWith('.json')) {
        const content = fs.readFileSync(`${driveDir}/${f}`, 'utf8');
        if (content.includes('E31') || content.includes('EQUIPO 31') || content.includes('18/09/2026')) {
          console.log(`  -> Mención encontrada en ${f}`);
        }
      }
    });
  }

  // 2. CONECTAR A NODUS EN VIVO Y NAVEGAR POR TODAS LAS PÁGINAS DE MESA REGISTRO
  console.log('\n--- 2. CONECTANDO A NODUS EN VIVO (PAGINACIÓN COMPLETA) ---');
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
    console.log('✅ Sesión iniciada en Nodus.');

    // Ir a Mesa Registro
    await page.goto('https://imo.crearpslglobal.com/mesaregistro', { waitUntil: 'networkidle2', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));

    // Si hay un selector de cantidad de registros por página (ej: 100 o 'Todos'), cambiarlo
    const changedSelect = await page.evaluate(() => {
      const selectLength = document.querySelector('select[name*="length"], select[name*="table_length"]');
      if (selectLength) {
        selectLength.value = '100';
        selectLength.dispatchEvent(new Event('change'));
        return true;
      }
      return false;
    });

    if (changedSelect) {
      console.log('✅ Se cambió la vista a 100 registros por página.');
      await new Promise(r => setTimeout(r, 2500));
    }

    // Extraer todos los registros visibles en Mesa de Registro
    const mesaRegistros = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr')).map((tr, idx) => {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        return { idx: idx + 1, raw: cells.join(' | ') };
      });
      const summaryText = document.body.innerText;
      return { totalFilas: rows.length, rows, summaryText: summaryText.slice(0, 800) };
    });

    console.log(`📊 Total Registros Extraídos de Mesa Registro: ${mesaRegistros.totalFilas}`);
    console.log('\n--- MUESTRA DE REGISTROS DE MESA DE REGISTRO EN VIVO ---');
    mesaRegistros.rows.slice(0, 30).forEach(r => console.log(`  ${r.idx}. ${r.raw}`));

    // Contar cuántos son del 18/09/2026 y E31
    const registrosE31_18Sep = mesaRegistros.rows.filter(r => 
      r.raw.includes('18/09/2026') || r.raw.includes('EQUIPO 31')
    );
    console.log(`\n📌 Total Registros de E31 / 18-Sep Identificados en Nodus: ${registrosE31_18Sep.length}`);

    // Ir a /participantessede o /participantes
    console.log('\n--- 3. CONSULTANDO /participantessede ---');
    await page.goto('https://imo.crearpslglobal.com/participantessede', { waitUntil: 'networkidle2', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));

    const participantesSedeData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr')).map(tr => 
        Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim()).join(' | ')
      );
      const headers = Array.from(document.querySelectorAll('th')).map(th => th.innerText.trim());
      return { headers: headers.join(' | '), count: rows.length, sample: rows.slice(0, 15) };
    });
    console.log('Headers Participantes Sede:', participantesSedeData.headers);
    console.log(`Total Participantes Sede: ${participantesSedeData.count}`);

  } catch (err) {
    console.error('❌ Error durante verificación profunda:', err.message);
  } finally {
    await browser.close();
    console.log('\n🏁 Verificación finalizada.');
  }
}

verifyAllSources();
