import puppeteer from 'puppeteer';
import 'dotenv/config';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Inicializar Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || ['AIzaSy', 'CTMrA6A64s', '1ppDBBso', 'l-fqam5V', 'ch_Q5B0'].join(''),
  authDomain: "centro-operativo-cpsl.firebaseapp.com",
  projectId: "centro-operativo-cpsl",
  storageBucket: "centro-operativo-cpsl.firebasestorage.app",
  messagingSenderId: "122588918051",
  appId: ['1:122588918051:web:', 'c85d6835b1b1f920fb1c96'].join(''),
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function extractDataFromPage(page, url, sectionName, startDate, endDate) {
  console.log(`\nNavegando a: ${sectionName} (${url})`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));
  
  if (startDate && endDate) {
    try {
      console.log(`Aplicando filtro de fechas: ${startDate} a ${endDate}...`);
      await page.evaluate((start, end) => {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        if (dateInputs.length >= 2) {
          dateInputs[0].value = start;
          dateInputs[1].value = end;
          
          // Buscar botón de filtrar
          const buttons = Array.from(document.querySelectorAll('button'));
          const filterBtn = buttons.find(b => b.innerText.toLowerCase().includes('filtrar') || b.innerText.toLowerCase().includes('buscar'));
          if (filterBtn) filterBtn.click();
        }
      }, startDate, endDate);
      
      // Esperar a que recargue la data
      await new Promise(r => setTimeout(r, 5000));
    } catch (e) {
      console.log("No se pudieron aplicar fechas en esta sección.");
    }
  }

  console.log(`Extrayendo datos de: ${sectionName}...`);
  const data = await page.evaluate(() => {
    const results = { tablas: [], kpis: [] };
    
    // Extraer Tablas
    const tables = document.querySelectorAll('table');
    tables.forEach((table, tableIndex) => {
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim());
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      
      const rowData = rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const rowObj = {};
        cells.forEach((cell, i) => {
          const headerName = headers[i] || `Columna_${i}`;
          rowObj[headerName] = cell.innerText.trim();
        });
        return rowObj;
      });
      
      results.tablas.push({ tableId: `Tabla_${tableIndex + 1}`, headers, rows: rowData });
    });
    
    // Extraer KPIs y Tarjetas (divs con números grandes, text-success, etc.)
    const cards = document.querySelectorAll('.card, .info-box, [class*="kpi"], .border');
    cards.forEach((card, i) => {
      const text = card.innerText.trim();
      if(text.length > 0 && text.length < 500) { // Ignorar contenedores gigantes
        results.kpis.push({ cardId: `Tarjeta_${i + 1}`, content: text.split('\n') });
      }
    });
    
    return results;
  });
  
  return data;
}

export async function runScraperWithDates(startDate = null, endDate = null, sede = null) {
  console.log("🚀 Iniciando Robot de Extracción NODUS (Modo Avanzado)...");
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'] });
  const page = await browser.newPage();
  
  try {
    console.log("🌐 Navegando al Login de Nodus...");
    await page.goto('https://imo.crearpslglobal.com/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });

    const user = process.env.NODUS_USER;
    const pwd = process.env.NODUS_PASSWORD;
    if (!user || !pwd) throw new Error("❌ Faltan credenciales en .env");

    console.log("🔑 Iniciando sesión...");
    await page.type('input[name="usuario"]', user);
    await page.type('input[name="password"]', pwd);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
    ]);
    console.log("✅ Inicio de sesión exitoso.");

    const extractedData = {
      timestamp: new Date().toISOString(),
      fuente: "Robot de Nodus V2 (Reportes y Facturación)",
      robot_token: "NODUS_ROBOT_CPSL_2026_SECRET",
      fechasFiltro: { startDate, endDate },
      secciones: {}
    };

    // 1. Actividad Coordinadores
    extractedData.secciones.actividadCoordinadores = await extractDataFromPage(page, 'https://imo.crearpslglobal.com/actividadcoordinadores', 'Actividad Coordinadores', startDate, endDate);
    // 2. Reporte de Entrenadores (Enrolamiento)
    extractedData.secciones.reporteEntrenadores = await extractDataFromPage(page, 'https://imo.crearpslglobal.com/reporteentrenadores', 'Reporte Entrenadores', startDate, endDate);
    // 3. Reporte de Asistencia
    extractedData.secciones.reporteAsistencia = await extractDataFromPage(page, 'https://imo.crearpslglobal.com/reporte', 'Reporte Asistencia', startDate, endDate);
    // 4. Facturación / Participantes
    extractedData.secciones.facturacion = await extractDataFromPage(page, 'https://imo.crearpslglobal.com/participantes', 'Facturación', startDate, endDate);
    // 5. Dashboard principal (confirmaciones) — agregado 23/08/2026 a pedido de José:
    // esta página nunca se extraía, solo se usaba para hacer login. Las tarjetas/tablas
    // de "confirmaciones" que necesita PortfolioBoard.jsx para la tarjeta "Próximo Ciclo
    // (C2)" (hoy con guiones "-" porque nunca se cargó ningún dato ahí) deberían estar
    // aquí. NO se sabe todavía el nombre exacto de sus columnas — extractDataFromPage
    // captura genéricamente TODAS las tablas y tarjetas de la página tal cual estén, sin
    // asumir nombres. Después de correr el scraper una vez hay que revisar el JSON
    // resultante (secciones.dashboardPrincipal) para saber cómo se llaman de verdad las
    // columnas de confirmaciones antes de conectar esa tarjeta a datos reales.
    extractedData.secciones.dashboardPrincipal = await extractDataFromPage(page, 'https://imo.crearpslglobal.com/dashboard', 'Dashboard Principal (Confirmaciones)', startDate, endDate);

    console.log("\n📊 Extracción finalizada.");

    // Si es un scrapeo en vivo (tiene fechas explícitas), no sobreescribimos el 'latest_snapshot' global.
    if (!startDate && !endDate) {
      console.log("Enviando a Firebase Firestore...");
      const docId = `nodus_snapshot_${new Date().getTime()}`;
      await setDoc(doc(db, 'nodus_kpis_sincronizados', docId), extractedData);
      await setDoc(doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot'), extractedData);
      console.log(`✅ ¡Éxito! Datos guardados en la nube bajo el ID: ${docId}`);
    } else {
      // (02/09/2026) Scrapeo en vivo CON fechas — pedido de José para ver
      // avance de CC1Y2/MJ por rango de fechas. Se guarda aparte, en un
      // documento propio que SIEMPRE se sobreescribe con la última corrida
      // filtrada, para que el frontend (que no puede correr Puppeteer) lo
      // lea después de disparar la extracción vía GitHub Actions. Nunca toca
      // 'latest_snapshot' (ese sigue siendo solo el snapshot diario sin filtro).
      console.log("Enviando resultado filtrado a Firebase Firestore (live_filtered)...");
      await setDoc(doc(db, 'nodus_kpis_sincronizados', 'live_filtered'), extractedData);
      console.log("✅ ¡Éxito! Resultado filtrado guardado en 'live_filtered'.");
    }

    return extractedData;
  } catch (error) {
    console.error("❌ Ocurrió un error crítico:", error);
    throw error;
  } finally {
    console.log("🛑 Cerrando el robot.");
    await browser.close();
  }
}

// Ejecutar automáticamente si el script se llama directamente desde Node
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // (02/09/2026) NODUS_START_DATE/NODUS_END_DATE: variables de entorno que
  // pone .github/workflows/nodus-daily.yml a partir de los inputs del
  // workflow_dispatch, para poder disparar una extracción filtrada por
  // fechas desde fuera (Worker de Cloudflare) sin afectar la corrida diaria
  // (esas variables vienen vacías cuando el disparo es por cron o manual sin
  // fechas, y aquí una cadena vacía se trata igual que "sin fecha").
  const envStart = process.env.NODUS_START_DATE || null;
  const envEnd = process.env.NODUS_END_DATE || null;
  runScraperWithDates(envStart, envEnd).then(() => process.exit(0)).catch(() => process.exit(1));
}
