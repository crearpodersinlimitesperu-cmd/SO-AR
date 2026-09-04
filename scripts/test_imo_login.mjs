import puppeteer from 'puppeteer';
import fs from 'fs';

const CREDENTIALS = {
  url: 'https://imo.crearpslglobal.com/',
  user: 'CREARPSL',
  pass: 'CREARPSL26*'
};

async function testLogin() {
  console.log('Iniciando navegador...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log(`Navegando a ${CREDENTIALS.url}...`);
    await page.goto(CREDENTIALS.url, { waitUntil: 'networkidle2' });
    
    await page.screenshot({ path: 'scratch/imo_login_page.png' });
    console.log('Screenshot de login guardado.');

    // Intentar buscar los campos de login genéricos
    const userField = await page.$('input[type="text"], input[name="username"], input[name="login"], input[id="usuario"]');
    const passField = await page.$('input[type="password"], input[name="password"], input[name="clave"]');
    
    if (userField && passField) {
      console.log('Campos encontrados. Ingresando credenciales...');
      await userField.type(CREDENTIALS.user);
      await passField.type(CREDENTIALS.pass);
      
      const loginBtn = await page.$('button[type="submit"], input[type="submit"], button.btn, .login-btn');
      if (loginBtn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
          loginBtn.click()
        ]);
        console.log('Click en login realizado.');
        await page.screenshot({ path: 'scratch/imo_dashboard.png' });
        console.log('Screenshot del dashboard guardado.');
      }
    } else {
      console.log('No se encontraron los campos de login.');
    }

    const html = await page.content();
    fs.writeFileSync('scratch/imo_dom.html', html);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}

testLogin();
