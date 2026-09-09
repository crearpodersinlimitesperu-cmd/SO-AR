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
    
    const results = await page.evaluate(async () => {
        let activeTeams = [];
        for (let id = 110; id <= 135; id++) {
            try {
                const res = await fetch(`https://imo.crearpslglobal.com/maestria/buscar/${id}/PFD?q=&excluidos=`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        activeTeams.push({ id, count: data.length });
                    }
                }
            } catch (e) {}
        }
        return activeTeams;
    });
    
    console.log("Equipos encontrados (110-135):", results);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
})();
