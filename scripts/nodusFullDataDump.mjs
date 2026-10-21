import puppeteer from 'puppeteer';
import * as xlsx from 'xlsx';
import fs from 'fs';

// Configuración de entorno
const USERNAME = process.env.NODUS_USER;
const PASSWORD = process.env.NODUS_PASSWORD;

// Retardo aleatorio humano
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runDataDump() {
  console.log("🚀 [Data Dump] Iniciando extracción masiva de NODUS...");
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: true
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

  try {
    console.log("🔐 [Data Dump] Autenticando en NODUS...");
    await page.goto('https://imo.crearpslglobal.com/login', { waitUntil: 'networkidle2', timeout: 60000 });
    
    await page.waitForSelector('#usuario', { timeout: 10000 });
    await page.type('#usuario', USERNAME, { delay: 50 });
    await page.type('#password', PASSWORD, { delay: 50 });
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
    console.log("✅ [Data Dump] Autenticación exitosa.");
    
    // Extraer todo el histórico de participantes (Un millón de registros como límite alto)
    console.log("⏳ [Data Dump] Extrayendo base de datos completa (esto puede tardar unos minutos)...");
    const jsonUrl = 'https://imo.crearpslglobal.com/participantes/datosTabla?draw=1&start=0&length=500000';
    await page.goto(jsonUrl, { waitUntil: 'networkidle0', timeout: 120000 });
    
    const jsonText = await page.evaluate(() => document.body.innerText);
    const parsed = JSON.parse(jsonText);
    const data = parsed.data || [];
    
    console.log(`📥 [Data Dump] ¡Éxito! Se han descargado ${data.length} registros históricos.`);

    console.log("⚙️ [Data Dump] Procesando datos en formato PCFT...");
    const tab1 = []; // Base Maestra
    const tab2 = []; // Trazabilidad
    const tab3 = []; // Finanzas
    
    for (const row of data) {
      // row es un array si es datatable raw, o un objeto. En NODUS DataTables suele ser un array de celdas.
      // Dependiendo de cómo lo devuelva el servidor. Si es array:
      let c_id = "", c_nombres = "", c_apellidos = "", c_celular = "", c_correo = "";
      let c_sede = "", c_equipo = "", c_enrolador = "", c_pagos = "", c_estado = "";
      
      if (Array.isArray(row)) {
        c_id = row[0] || '';
        c_nombres = row[1] || '';
        c_apellidos = row[2] || '';
        c_celular = row[3] || '';
        c_correo = row[4] || '';
        c_sede = row[5] || '';
        c_equipo = row[6] || '';
        c_enrolador = row[7] || '';
        c_pagos = row[8] || '';
        c_estado = row[9] || '';
      } else {
        c_id = row.id || row.Id || '';
        c_nombres = row.nombres || row.Nombres || row.participante || '';
        c_apellidos = row.apellidos || row.Apellidos || '';
        c_celular = row.celular || row.Celular || '';
        c_correo = row.correo || row.Correo || '';
        c_sede = row.sede || row.Sede || '';
        c_equipo = row.equipo || row.Equipo || '';
        c_enrolador = row.enrolador || row.Enrolador || '';
        c_pagos = row.pagos || row.Pagos || '';
        c_estado = row.estado || row.Estado || '';
      }
      
      tab1.push({
        "ID": c_id,
        "Participante": (c_nombres + ' ' + c_apellidos).trim(),
        "Sede": c_sede,
        "Equipo Asignado": c_equipo,
        "Celular": c_celular,
        "Correo": c_correo,
        "Estado/Pagos": c_estado
      });

      tab2.push({
        "ID": c_id,
        "Participante": (c_nombres + ' ' + c_apellidos).trim(),
        "Equipo Origen (Enrolador)": c_enrolador,
        "Equipo Destino (Sentado)": c_equipo,
        "Identificador de Fuga/Rezagado": (c_enrolador && c_equipo && c_enrolador !== c_equipo) ? "SÍ - REASIGNADO" : "NO"
      });

      tab3.push({
        "ID": c_id,
        "Participante": (c_nombres + ' ' + c_apellidos).trim(),
        "Sede": c_sede,
        "Registro de Pago / Contabilidad": c_pagos,
        "Estado Global": c_estado
      });
    }

    console.log("📊 [Data Dump] Creando archivo Excel Maestro...");
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(tab1), "Base_Maestra_Asistencia");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(tab2), "Trazabilidad_Enrolamiento");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(tab3), "Consolidado_Financiero");

    xlsx.writeFile(wb, 'Dump_Maestro_Nodus.xlsx');
    console.log("✅ [Data Dump] Archivo 'Dump_Maestro_Nodus.xlsx' generado correctamente.");

  } catch (err) {
    console.error("❌ [Data Dump] Error durante la extracción masiva:", err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

runDataDump();
