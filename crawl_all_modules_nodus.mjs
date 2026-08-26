import puppeteer from 'puppeteer';
import 'dotenv/config';
import { writeFileSync } from 'fs';
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

const MODULES_TO_CRAWL = [
  { key: 'dashboard', url: 'https://imo.crearpslglobal.com/dashboard', name: 'Dashboard Principal' },
  { key: 'usuarios', url: 'https://imo.crearpslglobal.com/usuarios', name: 'Usuarios' },
  { key: 'roles', url: 'https://imo.crearpslglobal.com/roles', name: 'Roles' },
  { key: 'permisos', url: 'https://imo.crearpslglobal.com/permisos', name: 'Permisos' },
  { key: 'sedes', url: 'https://imo.crearpslglobal.com/sedes', name: 'Sedes' },
  { key: 'entrenamientos', url: 'https://imo.crearpslglobal.com/entrenamientos', name: 'Entrenamientos' },
  { key: 'entrenadores', url: 'https://imo.crearpslglobal.com/entrenadores', name: 'Entrenadores' },
  { key: 'configuracion', url: 'https://imo.crearpslglobal.com/configuracion', name: 'Configuración' },
  { key: 'cronograma', url: 'https://imo.crearpslglobal.com/cronograma', name: 'Cronograma' },
  { key: 'saltoscuanticos', url: 'https://imo.crearpslglobal.com/saltoscuanticos', name: 'Saltos Cuánticos' },
  { key: 'equipos', url: 'https://imo.crearpslglobal.com/equipos', name: 'Equipos' },
  { key: 'maestria', url: 'https://imo.crearpslglobal.com/maestria', name: 'Maestría' },
  { key: 'participantessede', url: 'https://imo.crearpslglobal.com/participantessede', name: 'Participantes Sede' },
  { key: 'registro', url: 'https://imo.crearpslglobal.com/registro', name: 'Links Registro' },
  { key: 'futurosimposibles', url: 'https://imo.crearpslglobal.com/futurosimposibles', name: 'Futuros Imposibles' },
  { key: 'reporterezagados', url: 'https://imo.crearpslglobal.com/reporterezagados', name: 'Reporte Rezagados' },
  { key: 'capitulo1', url: 'https://imo.crearpslglobal.com/capitulo1', name: 'Capítulo 1' },
  { key: 'gestionc1', url: 'https://imo.crearpslglobal.com/gestionc1', name: 'Gestión C1' },
  { key: 'capitulo2', url: 'https://imo.crearpslglobal.com/capitulo2', name: 'Capítulo 2' },
  { key: 'gestionc2', url: 'https://imo.crearpslglobal.com/gestionc2', name: 'Gestión C2' },
  { key: 'saltocuantico', url: 'https://imo.crearpslglobal.com/saltocuantico', name: 'Salto Cuántico' },
  { key: 'entrenamientocomplementario', url: 'https://imo.crearpslglobal.com/entrenamientocomplementario', name: 'Entrenamiento Complementario' },
  { key: 'asignacionllamadas', url: 'https://imo.crearpslglobal.com/asignacionllamadas', name: 'Asignación de Llamadas' },
  { key: 'aliados', url: 'https://imo.crearpslglobal.com/aliados', name: 'Aliados' },
  { key: 'participantes', url: 'https://imo.crearpslglobal.com/participantes', name: 'Facturación / Participantes' },
  { key: 'conciliacion', url: 'https://imo.crearpslglobal.com/conciliacion', name: 'Conciliación Bancaria' },
  { key: 'facturas', url: 'https://imo.crearpslglobal.com/facturas', name: 'Facturas' },
  { key: 'cierrecaja', url: 'https://imo.crearpslglobal.com/cierrecaja', name: 'Cierre de Caja' },
  { key: 'mesaregistro', url: 'https://imo.crearpslglobal.com/mesaregistro', name: 'Mesa Registro' },
  { key: 'certificados', url: 'https://imo.crearpslglobal.com/certificados', name: 'Certificados' },
  { key: 'reporte', url: 'https://imo.crearpslglobal.com/reporte', name: 'Reporte Asistencia' },
  { key: 'actividadcoordinadores', url: 'https://imo.crearpslglobal.com/actividadcoordinadores', name: 'Actividad Coordinadores' },
  { key: 'reporteentrenadores', url: 'https://imo.crearpslglobal.com/reporteentrenadores', name: 'Reporte Entrenadores' },
  { key: 'enrolamiento', url: 'https://imo.crearpslglobal.com/enrolamiento', name: 'Enrolamiento' },
  { key: 'reporteprospectossinpago', url: 'https://imo.crearpslglobal.com/reporteprospectossinpago', name: 'Prospectos sin Pago' }
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log("===================================================================");
  console.log("🚀 RASTREO EXHAUSTIVO DE TODOS LOS MÓDULOS DE NODUS (35+ MÓDULOS)");
  console.log("===================================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log("🔑 Iniciando sesión en Nodus...");
  await page.goto('https://imo.crearpslglobal.com/dashboard', { waitUntil: 'networkidle2', timeout: 45000 });
  await page.type('input[name="usuario"]', 'jsanchez');
  await page.type('input[name="password"]', '123456');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 })
  ]);
  console.log("✅ Sesión activa.");

  const inventory = {
    timestamp: new Date().toISOString(),
    totalModulos: MODULES_TO_CRAWL.length,
    modulos: {}
  };

  for (let i = 0; i < MODULES_TO_CRAWL.length; i++) {
    const mod = MODULES_TO_CRAWL[i];
    console.log(`\n[${i + 1}/${MODULES_TO_CRAWL.length}] Explorando módulo: ${mod.name} (${mod.url})...`);

    try {
      await page.goto(mod.url, { waitUntil: 'networkidle2', timeout: 35000 });
      await sleep(2500);

      const modData = await page.evaluate((modName) => {
        const bodyText = document.body.innerText;
        
        // Tablas
        const tablas = [];
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
            tablas.push({
              headers,
              totalFilas: rows.length,
              muestra: rows.slice(0, 10)
            });
          }
        });

        // KPIs / Badges / Estadísticas
        const kpiElements = Array.from(document.querySelectorAll('.card, .info-box, [class*="kpi"], .badge, [class*="stat"], .small-box, .box'));
        const kpis = kpiElements
          .map(el => el.innerText.trim())
          .filter(t => t.length > 0 && t.length < 400)
          .slice(0, 30);

        // Selects / Filtros disponibles
        const filtros = {};
        document.querySelectorAll('select').forEach((sel, sIdx) => {
          const name = sel.getAttribute('name') || sel.getAttribute('id') || `filtro_${sIdx}`;
          const options = Array.from(sel.querySelectorAll('option')).map(o => o.innerText.trim()).filter(Boolean);
          filtros[name] = options.slice(0, 20);
        });

        // Botones / Acciones disponibles
        const botones = Array.from(document.querySelectorAll('button, a.btn, input[type="button"], input[type="submit"]'))
          .map(b => b.innerText.trim().replace(/\n+/g, ' '))
          .filter(b => b.length > 0 && b.length < 50)
          .slice(0, 20);

        return {
          titulo: document.title,
          url: window.location.href,
          kpisCount: kpis.length,
          kpis: kpis.slice(0, 15),
          tablasCount: tablas.length,
          tablas: tablas,
          filtros: filtros,
          botones: Array.from(new Set(botones)),
          resumenTexto: bodyText.slice(0, 800)
        };
      }, mod.name);

      inventory.modulos[mod.key] = {
        nombre: mod.name,
        url: mod.url,
        status: 'OK',
        ...modData
      };

      console.log(`  ✅ ${mod.name}: ${modData.tablasCount} tablas, ${modData.kpisCount} KPIs, ${Object.keys(modData.filtros).length} filtros.`);

    } catch (err) {
      console.warn(`  ⚠️ Error o timeout en ${mod.name}: ${err.message}`);
      inventory.modulos[mod.key] = {
        nombre: mod.name,
        url: mod.url,
        status: 'TIMEOUT_O_ERROR',
        error: err.message
      };
    }
  }

  await browser.close();

  console.log("\n💾 Guardando inventario completo en nodus_full_inventory.json...");
  writeFileSync('./nodus_full_inventory.json', JSON.stringify(inventory, null, 2));

  // También actualizar nodus_dump.json y Firestore
  const currentDump = {
    timestamp: new Date().toISOString(),
    fuente: "Inventario Exhaustivo de Todos los Módulos de Nodus",
    robot_token: "NODUS_ROBOT_CPSL_2026_SECRET",
    inventarioModulos: inventory.modulos
  };

  console.log("☁️ Subiendo inventario completo a Firestore (latest_snapshot / nodus_full_inventory)...");
  await setDoc(doc(db, 'nodus_kpis_sincronizados', 'nodus_full_inventory'), currentDump);
  console.log("✅ ¡Inventario de 35+ módulos guardado en Firestore!");

  console.log("\n🎉 RASTREO EXHAUSTIVO FINALIZADO.");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
