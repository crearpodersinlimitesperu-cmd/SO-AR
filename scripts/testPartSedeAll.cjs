const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://imo.crearpslglobal.com/', { waitUntil: 'networkidle2', timeout: 60000 });
    
    if (await page.$('input[name="usuario"]')) {
        await page.type('input[name="usuario"]', process.env.NODUS_GLOBAL_USER || 'CREARPSL');
        await page.type('input[name="password"]', process.env.NODUS_GLOBAL_PASS || 'CREARPSL26*');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
            page.click('button[type="submit"]')
        ]);
    }
    
    const data = await page.evaluate(async () => {
        // En participantessede el parametro id_sede = 0 significa todas las sedes o la actual?
        const res = await fetch('https://imo.crearpslglobal.com/participantessede/datosTabla?draw=1&start=0&length=100&id_sede=0&id_equipo=0');
        return res.json();
    });
    
    const sedes = {};
    if (data && data.data) {
        data.data.forEach(row => {
            const sede = row.sede || 'Desconocida';
            sedes[sede] = (sedes[sede] || 0) + 1;
        });
    }
    console.log("Records totales devueltos:", data.recordsTotal);
    console.log("Sedes encontradas en los primeros 100:", sedes);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
