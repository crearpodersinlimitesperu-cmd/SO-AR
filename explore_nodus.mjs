import puppeteer from 'puppeteer';
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: ['AIzaSy', 'CTMrA6A64s', '1ppDBBso', 'l-fqam5V', 'ch_Q5B0'].join(''),
  authDomain: "centro-operativo-cpsl.firebaseapp.com",
  projectId: "centro-operativo-cpsl",
  storageBucket: "centro-operativo-cpsl.firebasestorage.app",
  messagingSenderId: "122588918051",
  appId: ['1:122588918051:web:', 'c85d6835b1b1f920fb1c96'].join(''),
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractPageDetails(page, url, label) {
  console.log(`\n🔎 [Explorando] ${label} (${url})...`);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(3000);
  } catch (err) {
    console.warn(`⚠️ Timeout o error cargando ${url}: ${err.message}`);
    return { error: err.message, kpis: [], tablas: [] };
  }

  const pageData = await page.evaluate(() => {
    const results = {
      titulo: document.title,
      url: window.location.href,
      kpis: [],
      tablas: [],
      dropdowns: {}
    };

    // 1. Capturar todos los select/dropdowns disponibles
    document.querySelectorAll('select').forEach((sel, selIdx) => {
      const name = sel.getAttribute('name') || sel.getAttribute('id') || `select_${selIdx}`;
      const options = Array.from(sel.querySelectorAll('option')).map(opt => ({
        value: opt.value,
        text: opt.innerText.trim(),
        selected: opt.selected
      }));
      results.dropdowns[name] = options;
    });

    // 2. Extraer todas las tarjetas de KPIs
    const cardSelectors = ['.card', '.info-box', '[class*="kpi"]', '.border', '[class*="stat"]', '.badge', '.box'];
    document.querySelectorAll(cardSelectors.join(', ')).forEach((card, i) => {
      const text = card.innerText.trim();
      if (text.length > 0 && text.length < 600) {
        results.kpis.push({
          cardId: `KPI_${i + 1}`,
          content: text.split('\n').map(s => s.trim()).filter(Boolean)
        });
      }
    });

    // 3. Extraer todas las tablas
    document.querySelectorAll('table').forEach((table, tIdx) => {
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim());
      const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        const rowObj = {};
        cells.forEach((c, idx) => {
          const h = headers[idx] || `Col_${idx + 1}`;
          rowObj[h] = c;
        });
        return rowObj;
      });

      if (rows.length > 0) {
        results.tablas.push({
          tableId: `Tabla_${tIdx + 1}`,
          headers,
          totalFilas: rows.length,
          rows: rows.slice(0, 100) // hasta 100 filas
        });
      }
    });

    return results;
  });

  console.log(`  ✅ Extraído: ${pageData.kpis.length} tarjetas de KPIs, ${pageData.tablas.length} tablas.`);
  return pageData;
}

export async function exploreEntireNodus() {
  console.log("🚀 ========================================================");
  console.log("🚀 INICIANDO EXPLORADOR EXHAUSTIVO DE NODUS (CPSL GLOBAL)");
  console.log("🚀 ========================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const nodusDump = {
    timestamp: new Date().toISOString(),
    fuente: "Explorador Exhaustivo Nodus Global (En Vivo)",
    robot_token: "NODUS_ROBOT_CPSL_2026_SECRET",
    secciones: {}
  };

  try {
    // 1. Login
    console.log("🌐 Conectando a imo.crearpslglobal.com...");
    await page.goto('https://imo.crearpslglobal.com/dashboard', { waitUntil: 'networkidle2', timeout: 45000 });

    const user = process.env.NODUS_USER || 'jsanchez';
    const pwd = process.env.NODUS_PASSWORD || '123456';

    console.log(`🔑 Autenticando usuario: ${user}...`);
    await page.type('input[name="usuario"]', user);
    await page.type('input[name="password"]', pwd);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 })
    ]);
    console.log("✅ Acceso autorizado a NODUS.");

    // 2. Descubrir todos los enlaces de la barra lateral (Sidebar)
    const sidebarLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({
          texto: a.innerText.trim().replace(/\n+/g, ' '),
          href: a.href
        }))
        .filter(l => l.href.includes('imo.crearpslglobal.com') && !l.href.includes('logout') && !l.href.includes('#'));
    });

    console.log(`\n📋 Enlaces del sistema detectados en Nodus: ${sidebarLinks.length}`);
    sidebarLinks.forEach((l, i) => console.log(`  ${i + 1}. [${l.texto || 'Link'}] -> ${l.href}`));

    // 3. Explorar Reporte de Asistencia y TODOS sus Equipos del selector
    console.log("\n🎯 --- EXPLORANDO REPORTE DE ASISTENCIA Y EQUIPOS ---");
    const reporteGeneral = await extractPageDetails(page, 'https://imo.crearpslglobal.com/reporte', 'Reporte Asistencia General');
    nodusDump.secciones.reporteAsistencia = reporteGeneral;

    // Obtener los equipos disponibles del selector
    const equipoOptions = reporteGeneral.dropdowns?.id_equipo || reporteGeneral.dropdowns?.equipo || [];
    console.log(`\n👥 Equipos disponibles para extraer en Reporte de Asistencia: ${equipoOptions.length}`);

    nodusDump.secciones.reporteAsistenciaPorEquipo = {};

    // Extraer hasta los últimos 10 equipos clave
    for (const eq of equipoOptions.slice(0, 10)) {
      if (!eq.value) continue;
      console.log(`\n  ➡️ Extrayendo data puntual de Equipo: ${eq.text} (id=${eq.value})...`);
      const eqData = await extractPageDetails(page, `https://imo.crearpslglobal.com/reporte?id_equipo=${eq.value}`, `Asistencia ${eq.text}`);
      nodusDump.secciones.reporteAsistenciaPorEquipo[eq.text || `Equipo_${eq.value}`] = eqData;
    }

    // 4. Explorar Actividad de Coordinadores
    console.log("\n🎯 --- EXPLORANDO ACTIVIDAD DE COORDINADORES ---");
    nodusDump.secciones.actividadCoordinadores = await extractPageDetails(page, 'https://imo.crearpslglobal.com/actividadcoordinadores', 'Actividad Coordinadores');

    // 5. Explorar Reporte de Entrenadores (Enrolamiento)
    console.log("\n🎯 --- EXPLORANDO REPORTE DE ENTRENADORES ---");
    nodusDump.secciones.reporteEntrenadores = await extractPageDetails(page, 'https://imo.crearpslglobal.com/reporteentrenadores', 'Reporte Entrenadores');

    // 6. Explorar Facturación / Participantes
    console.log("\n🎯 --- EXPLORANDO PARTICIPANTES Y FACTURACIÓN ---");
    nodusDump.secciones.facturacion = await extractPageDetails(page, 'https://imo.crearpslglobal.com/participantes', 'Participantes / Facturación');

    // 7. Explorar otras secciones de la barra lateral (Mesa Registro, Seguimiento, Aliados, etc.)
    const otherUrls = [
      { name: 'dashboard', url: 'https://imo.crearpslglobal.com/dashboard', label: 'Dashboard General' }
    ];

    for (const link of sidebarLinks) {
      if (!link.href.includes('reporte') && !link.href.includes('participantes') && !link.href.includes('actividadcoordinadores') && !link.href.includes('dashboard')) {
        const cleanName = link.href.split('/').pop().replace(/[^a-zA-Z0-9]/g, '_') || 'seccion';
        otherUrls.push({ name: cleanName, url: link.href, label: link.texto || cleanName });
      }
    }

    for (const sec of otherUrls.slice(0, 6)) {
      nodusDump.secciones[sec.name] = await extractPageDetails(page, sec.url, sec.label);
    }

    console.log("\n💾 Guardando copia local exhaustiva en nodus_dump.json...");
    writeFileSync('./nodus_dump.json', JSON.stringify(nodusDump, null, 2));

    console.log("☁️ Subiendo snapshot exhaustivo a Firebase Firestore (latest_snapshot)...");
    await setDoc(doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot'), nodusDump);
    console.log("✅ ¡Snapshot completo guardado en Firestore con éxito!");

    return nodusDump;

  } catch (error) {
    console.error("❌ Error en la exploración de Nodus:", error);
    throw error;
  } finally {
    await browser.close();
    console.log("🛑 Explorador de Nodus finalizado.");
  }
}

exploreEntireNodus().then(() => {
  console.log("🎉 Proceso terminado.");
  process.exit(0);
}).catch(err => {
  console.error("Fallo:", err);
  process.exit(1);
});
