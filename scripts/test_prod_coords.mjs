import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navegando a https://centro-operativo-cpsl.web.app/auditoria-kpis ...');
  await page.goto('https://centro-operativo-cpsl.web.app/auditoria-kpis', { waitUntil: 'networkidle2', timeout: 35000 });

  await page.waitForSelector('.nodus-table tbody tr.nodus-coord-row', { timeout: 15000 });

  const rows = await page.evaluate(() => {
    const trs = Array.from(document.querySelectorAll('.nodus-table tbody tr.nodus-coord-row'));
    return trs.map(tr => {
      const nameEl = tr.querySelector('.nodus-coord-name');
      const sedeEl = tr.querySelector('.nodus-badge-sede');
      const gestionesEl = tr.querySelectorAll('td')[2];
      const c1c2El = tr.querySelectorAll('td')[3];
      return {
        name: nameEl ? nameEl.textContent.trim() : 'Unknown',
        sede: sedeEl ? sedeEl.textContent.trim() : 'Unknown',
        gestiones: gestionesEl ? gestionesEl.textContent.trim() : '0',
        c1c2: c1c2El ? c1c2El.textContent.trim() : '0'
      };
    });
  });

  console.log('Total coordinadores en producción:', rows.length);
  console.log('Listado:');
  rows.forEach((r, idx) => {
    console.log('  ' + (idx + 1) + '. ' + r.name + ' (' + r.sede + ') - Gestiones: ' + r.gestiones + ' [C1/C2: ' + r.c1c2 + ']');
  });

  const excludedNames = ['kerlie', 'contab', 'linid', 'mauricio', 'sebastian', 'karol', 'erika', 'entrena'];
  const foundExcluded = rows.filter(r => excludedNames.some(ex => r.name.toLowerCase().includes(ex)));

  if (foundExcluded.length > 0) {
    console.error('❌ ALERTA: Se encontraron excluidos:', foundExcluded);
  } else {
    console.log('✅ ÉXITO TOTAL: Ninguno de los 8 no-coordinadores aparece en la tabla!');
  }

  // Tomar captura de pantalla de la tabla en producción
  await page.screenshot({ path: 'scratch/production_clean_coordinadores.png', fullPage: false });
  console.log('📸 Captura de pantalla guardada en scratch/production_clean_coordinadores.png');

  await browser.close();
})();
