import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import 'dotenv/config';

puppeteer.use(StealthPlugin());

async function runSpider() {
    console.log("Iniciando Spider Autónomo GLOBAL de Nodus...");
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    try {
        await page.goto('https://imo.crearpslglobal.com/', { waitUntil: 'networkidle2', timeout: 60000 });
        
        if (await page.$('input[name="usuario"]')) {
            console.log("Iniciando sesión Global...");
            await page.type('input[name="usuario"]', process.env.NODUS_GLOBAL_USER || 'CREARPSL');
            await page.type('input[name="password"]', process.env.NODUS_GLOBAL_PASS || 'CREARPSL26*');
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
                page.click('button[type="submit"]')
            ]);
        }

        console.log("Accediendo al Módulo de Maestría Global...");
        await page.goto('https://imo.crearpslglobal.com/maestria', { waitUntil: 'networkidle2', timeout: 60000 });
        
        const equiposActivos = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="/maestria/equipo/"]'));
            const equiposMap = {};
            links.forEach(a => {
                const parts = a.href.split('/');
                const idIndex = parts.indexOf('equipo') + 1;
                if (idIndex > 0 && idIndex < parts.length) {
                    const id = parts[idIndex];
                    if (!equiposMap[id]) {
                        equiposMap[id] = a.innerText.trim();
                    }
                }
            });
            return Object.keys(equiposMap).map(id => ({ id, nombreCorto: equiposMap[id] }));
        });
        
        console.log(`Se encontraron ${equiposActivos.length} equipos activos a nivel global:`, equiposActivos);
        
        const resultadosMaestria = {};
        
        for (const equipoObj of equiposActivos) {
            const idEquipo = equipoObj.id;
            const nombreNodus = equipoObj.nombreCorto;
            console.log(`Explorando Equipo ID: ${idEquipo}...`);
            resultadosMaestria[idEquipo] = { nombreNodus };
            
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
        
        fs.writeFileSync('spider_maestria_global.json', JSON.stringify(resultadosMaestria, null, 2));
        console.log("Spider GLOBAL completado con éxito.");

    } catch (err) {
        console.error("Error en Spider GLOBAL:", err);
    } finally {
        await browser.close();
    }
}

runSpider();
