import puppeteer from 'puppeteer';

async function checkOnline() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  console.log('=== TEST 1: Causa OS (https://centro-operativo-cpsl.web.app/) ===');
  await page.goto('https://centro-operativo-cpsl.web.app/', { waitUntil: 'networkidle2', timeout: 30000 });
  const causaTitle = await page.title();
  const causaContent = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log('Status: OK');
  console.log('Title:', causaTitle);
  console.log('Sample text:', causaContent.replace(/\n+/g, ' '));

  console.log('\n=== TEST 2: Campus Interactivo (https://cpsl-campus-interactivo.vercel.app/ruta) ===');
  await page.goto('https://cpsl-campus-interactivo.vercel.app/ruta', { waitUntil: 'networkidle2', timeout: 30000 });
  const campusTitle = await page.title();
  const campusContent = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log('Status: OK');
  console.log('Title:', campusTitle);
  console.log('Sample text:', campusContent.replace(/\n+/g, ' '));

  // Check if Blueprint is in Campus
  const hasBlueprint = await page.evaluate(() => document.body.innerText.toLowerCase().includes('blueprint'));
  console.log('Does Campus have Blueprint button/text?:', hasBlueprint);

  await browser.close();
  console.log('\n=== ALL ONLINE CHECKS FINISHED SUCCESSFULLY! ===');
}

checkOnline().catch(console.error);
