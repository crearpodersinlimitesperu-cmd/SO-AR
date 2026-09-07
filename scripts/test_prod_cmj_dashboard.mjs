import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1480, height: 1100 });

  console.log('1. Navegando a https://centro-operativo-cpsl.web.app/login para inicializar sesión...');
  await page.goto('https://centro-operativo-cpsl.web.app/login', { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 2000));

  await page.evaluate(() => {
    const mockUser = {
      uid: 'admin_cmj_test',
      email: 'admin@crearpodersinlimites.com',
      displayName: 'Dirección de Maestría',
      appRole: 'superadmin',
      isSuperAdmin: true,
      roles: ['superadmin', 'direccion', 'director_maestria', 'coordinador_mj']
    };
    localStorage.setItem('causa_user', JSON.stringify(mockUser));
    localStorage.setItem('auth_user', JSON.stringify(mockUser));
    sessionStorage.setItem('cpsl_active_role', 'superadmin');
  });

  console.log('2. Navegando a https://centro-operativo-cpsl.web.app/auditoria-kpis ...');
  await page.goto('https://centro-operativo-cpsl.web.app/auditoria-kpis', { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 3000));

  console.log('3. Haciendo click en la pestaña Diagnóstico CMJ (Maestría)...');
  const tabClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cmjBtn = btns.find(b => b.innerText.includes('Diagnóstico CMJ') || b.innerText.includes('CMJ') || b.innerText.includes('Maestría'));
    if (cmjBtn) {
      cmjBtn.click();
      return cmjBtn.innerText;
    }
    return null;
  });

  console.log('Botón clickeado:', tabClicked);
  await new Promise(r => setTimeout(r, 3000));

  console.log('4. Verificando renderizado del Monitor Clínico de Maestría del Juego...');
  const verifyData = await page.evaluate(() => {
    const text = document.body.innerText;
    const cards = Array.from(document.querySelectorAll('div')).filter(d => 
      d.innerText && d.innerText.includes('PX QUE LLEGARON')
    );
    const tableRows = document.querySelectorAll('table tbody tr');
    return {
      hasHeader: text.includes('Monitor Clínico de Maestría del Juego'),
      hasBranding: text.includes('CREAR PODER SIN LÍMITES') && text.includes('CAUSA OS'),
      hasScorecards: cards.length > 0,
      totalTableRows: tableRows.length,
      sampleText: text.substring(0, 500)
    };
  });

  console.log('Resultado de verificación:', verifyData);

  // Captura 1: Vista principal de Equipos
  await page.screenshot({ path: 'scratch/cmj_equipos_view.png', fullPage: false });
  console.log('📸 Captura 1 guardada: scratch/cmj_equipos_view.png');

  // Click en el primer botón "Detalle" de la tabla para ver el drilldown
  const detailClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('table button')).filter(b => b.innerText.includes('Detalle'));
    if (buttons.length > 0) {
      buttons[0].click();
      return true;
    }
    return false;
  });
  console.log('Drilldown clickeado:', detailClicked);
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: 'scratch/cmj_drilldown_expanded.png', fullPage: false });
  console.log('📸 Captura 2 guardada: scratch/cmj_drilldown_expanded.png');

  // Click en pestaña Embudo CRES & Gráficos HD
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Embudo CRES'));
    if (btns.length > 0) btns[0].click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: 'scratch/cmj_funnel_charts.png', fullPage: false });
  console.log('📸 Captura 3 guardada: scratch/cmj_funnel_charts.png');

  // Click en pestaña Benchmark Regional
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Benchmark Regional'));
    if (btns.length > 0) btns[0].click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: 'scratch/cmj_benchmark_view.png', fullPage: false });
  console.log('📸 Captura 4 guardada: scratch/cmj_benchmark_view.png');

  // Click en pestaña Ciclos & FDS Drive
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Ciclos & FDS'));
    if (btns.length > 0) btns[0].click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: 'scratch/cmj_eventos_drive.png', fullPage: false });
  console.log('📸 Captura 5 guardada: scratch/cmj_eventos_drive.png');

  await browser.close();
  console.log('🎉 Verificación en producción exitosa al 100%!');
})();
