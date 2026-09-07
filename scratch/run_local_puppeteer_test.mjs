import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080 });

  console.log('Navegando a http://localhost:5174/test_cmj.html ...');
  await page.goto('http://localhost:5174/test_cmj.html', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Captura de la vista principal de Equipos (CRES)
  console.log('Capturando vista principal de Equipos...');
  await page.screenshot({ path: 'C:/Users/josem/.gemini/antigravity/brain/2e7cc302-123f-4356-b499-5581d3a96ebc/cmj_equipos_tab.png' });
  console.log('📸 Guardado: cmj_equipos_tab.png');

  // 2. Expandir el primer equipo para ver el drill-down clínico
  console.log('Expandiendo drill-down del primer equipo...');
  await page.evaluate(() => {
    const detailBtns = Array.from(document.querySelectorAll('table button')).filter(b => b.innerText.includes('Detalle'));
    if (detailBtns.length > 0) detailBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'C:/Users/josem/.gemini/antigravity/brain/2e7cc302-123f-4356-b499-5581d3a96ebc/cmj_drilldown_expanded.png' });
  console.log('📸 Guardado: cmj_drilldown_expanded.png');

  // 3. Cambiar a pestaña Embudo CRES & Gráficos HD
  console.log('Navegando a pestaña Embudo CRES & Gráficos HD...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Embudo CRES'));
    if (btns.length > 0) btns[0].click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'C:/Users/josem/.gemini/antigravity/brain/2e7cc302-123f-4356-b499-5581d3a96ebc/cmj_funnel_charts.png' });
  console.log('📸 Guardado: cmj_funnel_charts.png');

  // 4. Cambiar a pestaña Benchmark Regional
  console.log('Navegando a pestaña Benchmark Regional...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Benchmark Regional'));
    if (btns.length > 0) btns[0].click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'C:/Users/josem/.gemini/antigravity/brain/2e7cc302-123f-4356-b499-5581d3a96ebc/cmj_benchmark_view.png' });
  console.log('📸 Guardado: cmj_benchmark_view.png');

  // 5. Cambiar a pestaña Ciclos & FDS Drive
  console.log('Navegando a pestaña Ciclos & FDS Drive...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Ciclos & FDS'));
    if (btns.length > 0) btns[0].click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'C:/Users/josem/.gemini/antigravity/brain/2e7cc302-123f-4356-b499-5581d3a96ebc/cmj_eventos_drive.png' });
  console.log('📸 Guardado: cmj_eventos_drive.png');

  await browser.close();
  console.log('✅ Todas las capturas fueron tomadas exitosamente!');
})();
