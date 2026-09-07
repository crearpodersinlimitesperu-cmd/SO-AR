import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100 });

  console.log('Navigating to https://centro-operativo-cpsl.web.app/auditoria-kpis ...');
  await page.goto('https://centro-operativo-cpsl.web.app/auditoria-kpis', { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 4000));

  let url = page.url();
  console.log('Current URL:', url);

  if (url.includes('login') || url.includes('#/login')) {
    console.log('Setting auth state...');
    await page.evaluate(() => {
      const mockUser = {
        uid: 'prod_admin_test',
        email: 'admin@crearpodersinlimites.com',
        displayName: 'Administrador Global',
        rol: 'superadmin',
        superadmin: true
      };
      localStorage.setItem('causa_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
    });
    await page.goto('https://centro-operativo-cpsl.web.app/auditoria-kpis', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 4000));
  }

  // Click Coordinadores tab if not selected
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const coordBtn = btns.find(b => b.innerText.includes('Coordinadores C1 & C2'));
    if (coordBtn) coordBtn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  // Check initial counts
  const initialInfo = await page.evaluate(() => {
    const scorecards = Array.from(document.querySelectorAll('.nodus-card-value')).map(el => el.innerText);
    const tableRows = Array.from(document.querySelectorAll('.nodus-tr')).length;
    return { scorecards, tableRows };
  });
  console.log('Initial dashboard info:', initialInfo);

  // Apply filter: Equipo 23
  console.log('Selecting EQUIPO 23...');
  const selectResult = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('.nodus-select'));
    if (selects.length >= 2) {
      const eqSelect = selects[1];
      const opt = Array.from(eqSelect.options).find(o => o.value === 'EQUIPO 23');
      if (opt) {
        eqSelect.value = 'EQUIPO 23';
        eqSelect.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true };
      }
      return { success: false, options: Array.from(eqSelect.options).map(o => o.value).slice(0, 5) };
    }
    return { success: false, reason: 'Selects count: ' + selects.length };
  });
  console.log('Select result:', selectResult);

  await new Promise(r => setTimeout(r, 2000));

  // Check filtered state
  const filteredInfo = await page.evaluate(() => {
    const activeChip = document.querySelector('.nodus-filter-chip')?.innerText;
    const scorecards = Array.from(document.querySelectorAll('.nodus-card-value')).map(el => el.innerText);
    const tableRows = Array.from(document.querySelectorAll('.nodus-tr')).length;
    
    // First row details
    const firstRowCols = Array.from(document.querySelectorAll('.nodus-tr:first-child .nodus-td')).map(td => td.innerText.replace(/\n+/g, ' '));

    // Expand the first row
    const expandBtn = document.querySelector('.nodus-btn-expand');
    if (expandBtn) expandBtn.click();

    return { activeChip, scorecards, tableRows, firstRowCols };
  });
  console.log('Filtered info:', filteredInfo);

  await new Promise(r => setTimeout(r, 1000));

  // Check subtable content
  const subtableInfo = await page.evaluate(() => {
    const subRows = Array.from(document.querySelectorAll('.nodus-nested-table tbody tr')).map(tr => {
      const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText);
      return cells.slice(0, 3).join(' | ');
    });
    return { subRowsCount: subRows.length, subRows };
  });
  console.log('Subtable info (MUST BE ONLY EQUIPO 23):', subtableInfo);

  await page.screenshot({ path: 'scratch/production_filtered_equipo23.png' });
  console.log('Saved screenshot to scratch/production_filtered_equipo23.png');

  await browser.close();
})();
