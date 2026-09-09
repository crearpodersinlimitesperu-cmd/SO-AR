import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

async function runSpider() {
    console.log("Iniciando Spider Autónomo de Nodus (Sede Lima)...");
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    try {
        await page.goto('https://imo.crearpslglobal.com/', { waitUntil: 'networkidle2', timeout: 60000 });
        
        if (await page.$('input[name="usuario"]')) {
            console.log("Iniciando sesión...");
            await page.type('input[name="usuario"]', process.env.NODUS_GLOBAL_USER || 'CREARPSL');
            await page.type('input[name="password"]', process.env.NODUS_GLOBAL_PASS || 'CREARPSL26*');
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
                page.click('button[type="submit"]')
            ]);
        }

        console.log("Accediendo al Módulo de Maestría...");
        await page.goto('https://imo.crearpslglobal.com/maestria', { waitUntil: 'networkidle2', timeout: 60000 });
        
        const equiposActivos = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="/maestria/equipo/"]'));
            const equipos = new Set();
            links.forEach(a => {
                const parts = a.href.split('/');
                const idIndex = parts.indexOf('equipo') + 1;
                if (idIndex > 0 && idIndex < parts.length) {
                    equipos.add(parts[idIndex]);
                }
            });
            return Array.from(equipos);
        });
        
        console.log(`Se encontraron ${equiposActivos.length} equipos activos en Lima:`, equiposActivos);
        
        const resultadosMaestria = {};
        
        for (const idEquipo of equiposActivos) {
            console.log(`Explorando Equipo ID: ${idEquipo}...`);
            resultadosMaestria[idEquipo] = {};
            
            const etapas = ['PFD', 'SFD', 'TFD'];
            for (const etapa of etapas) {
                console.log(` -> Extrayendo etapa: ${etapa}`);
                await page.goto(`https://imo.crearpslglobal.com/maestria/equipo/${idEquipo}/${etapa}`, { waitUntil: 'networkidle2' });
                
                const datosEtapa = await page.evaluate(() => {
                    const extractTable = (tbodyId) => {
                        const tbody = document.getElementById(tbodyId);
                        if (!tbody) return [];
                        const rows = Array.from(tbody.querySelectorAll('tr'));
                        return rows.map(tr => {
                            const idInp = tr.querySelector('input[name="id_participante[]"]');
                            const strong = tr.querySelector('strong');
                            const enrolInp = tr.querySelector('input[name="conteo_enrolados[]"]');
                            return {
                                id: idInp ? idInp.value : null,
                                nombre: strong ? strong.innerText.trim() : null,
                                enrolados: enrolInp ? parseInt(enrolInp.value, 10) : 0
                            };
                        }).filter(item => item.id !== null);
                    };
                    return {
                        participantes: extractTable('tbodyPx'),
                        staff: extractTable('tbodyCapMgr'),
                        desertores: extractTable('tbodyDesertores')
                    };
                });
                
                resultadosMaestria[idEquipo][etapa] = datosEtapa;
            }
        }
        
        fs.writeFileSync('spider_maestria_lima.json', JSON.stringify(resultadosMaestria, null, 2));
        console.log("Spider completado con éxito.");

    } catch (err) {
        console.error("Error en Spider:", err);
    } finally {
        await browser.close();
    }
}

runSpider();
