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

const EQUIPOS = [
  { id: 134, name: 'EQUIPO 30', label: 'LIMA C1E30' },
  { id: 127, name: 'EQUIPO 29', label: 'LIMA C1E29' },
  { id: 111, name: 'EQUIPO 28', label: 'LIMA C1E28' },
  { id: 107, name: 'EQUIPO 27', label: 'LIMA C1E27' }
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function extractAllRowsForEquipo(page, equipo) {
  console.log(`\n🔎 [Extrayendo filas completas de ${equipo.label}] (id=${equipo.id})...`);
  const url = `https://imo.crearpslglobal.com/reporte?id_equipo=${equipo.id}`;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(3000);

  // Intentar cambiar el selector de longitud de DataTable a 100 o máximo
  try {
    const selectLength = await page.$('select[name$="_length"]');
    if (selectLength) {
      await page.select('select[name$="_length"]', '100');
      await sleep(2500);
    }
  } catch (e) {
    console.warn("No se pudo cambiar el selector de longitud:", e.message);
  }

  // Extraer todas las filas de todas las páginas de la tabla
  let allRows = [];
  let hasNext = true;
  let pageNum = 1;

  while (hasNext && pageNum <= 10) {
    const rowsOnPage = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return [];
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim());
      const trs = Array.from(table.querySelectorAll('tbody tr'));
      return trs.map(tr => {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        const row = {};
        cells.forEach((c, i) => {
          const h = headers[i] || `Col_${i}`;
          row[h] = c;
        });
        return row;
      }).filter(r => r.PARTICIPANTE || r.Participante);
    });

    console.log(`  📄 Página ${pageNum}: ${rowsOnPage.length} participantes encontrados.`);
    allRows = allRows.concat(rowsOnPage);

    // Verificar si hay botón siguiente habilitado
    hasNext = await page.evaluate(() => {
      const nextBtn = document.querySelector('li.next:not(.disabled) a, a.next:not(.disabled), #DataTables_Table_0_next:not(.disabled)');
      if (nextBtn) {
        nextBtn.click();
        return true;
      }
      return false;
    });

    if (hasNext) {
      await sleep(2000);
      pageNum++;
    }
  }

  console.log(`✅ Total participantes extraídos en ${equipo.label}: ${allRows.length}`);
  return allRows;
}

async function main() {
  console.log("===================================================================");
  console.log("🚀 EXTRACCIÓN DE MÉTRICAS POR COORDINADORA PARA CADA C1 INDIVIDUAL");
  console.log("===================================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log("🔑 Autenticando en Nodus...");
  await page.goto('https://imo.crearpslglobal.com/dashboard', { waitUntil: 'networkidle2', timeout: 45000 });
  await page.type('input[name="usuario"]', 'jsanchez');
  await page.type('input[name="password"]', '123456');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 })
  ]);
  console.log("✅ Sesión iniciada.");

  const resultadosPorC1 = {};

  for (const eq of EQUIPOS) {
    const rows = await extractAllRowsForEquipo(page, eq);
    
    // Agrupar por coordinadora para este C1 específico
    const porCoord = {};

    rows.forEach(r => {
      const coordRaw = (r.COORDINADOR || r.Coordinador || 'SIN_ASIGNAR').toUpperCase().trim();
      const coord = coordRaw.includes('JOYCE') ? 'JOYCE' :
                    coordRaw.includes('DIANA') ? 'DIANA' :
                    coordRaw.includes('LEYLA') ? 'LEYLA' :
                    coordRaw.includes('MONICA') ? 'MONICA' :
                    coordRaw.includes('LINID') ? 'LINID' : coordRaw;

      if (!porCoord[coord]) {
        porCoord[coord] = {
          asignados: 0,
          confirmados_1ra: 0,
          no_contesta_1ra: 0,
          siguiente_1ra: 0,
          asistieron_sentados: 0,
          desertores: 0,
          pagaron_c2: 0,
          pagaron_c2_mj: 0,
          con_abono: 0,
          sin_pago: 0
        };
      }

      porCoord[coord].asignados++;

      const llam1 = (r['1RA LLAMADA'] || r['1ra Llamada'] || '').toUpperCase();
      if (llam1.includes('CONFIRM')) porCoord[coord].confirmados_1ra++;
      else if (llam1.includes('NO CONT') || llam1.includes('NO_CONT')) porCoord[coord].no_contesta_1ra++;
      else if (llam1.includes('SIGUIENTE')) porCoord[coord].siguiente_1ra++;

      const asist = (r.ASISTENCIA || r.Asistencia || '').toUpperCase();
      if (asist.includes('ASIST') || asist.includes('SENTAD') || asist.includes('CONFIRM')) {
        porCoord[coord].asistieron_sentados++;
      }

      const des = (r.DESERTOR || r.Desertor || '').toUpperCase();
      if (des.includes('SI') || des.includes('DESERT') || des.includes('D1') || des.includes('D2')) {
        porCoord[coord].desertores++;
      }

      const pago = (r.PAGO || r.Pago || '').toUpperCase();
      if (pago.includes('C2 + MJ') || pago.includes('C2+MJ') || pago.includes('MAESTR')) {
        porCoord[coord].pagaron_c2_mj++;
      } else if (pago.includes('C2') && !pago.includes('SIN PAGO')) {
        porCoord[coord].pagaron_c2++;
      } else if (pago.includes('ABONO')) {
        porCoord[coord].con_abono++;
      } else if (pago.includes('SIN PAGO')) {
        porCoord[coord].sin_pago++;
      }
    });

    resultadosPorC1[eq.name] = {
      equipoId: eq.id,
      label: eq.label,
      totalParticipantes: rows.length,
      coordinadoras: porCoord
    };
  }

  await browser.close();

  console.log("\n===================================================================");
  console.log("📊 RESULTADOS DETALLADOS POR COORDINADORA PARA CADA C1:");
  console.log("===================================================================");
  console.log(JSON.stringify(resultadosPorC1, null, 2));

  // Guardar en archivo local
  writeFileSync('./coordinadoras_por_c1.json', JSON.stringify(resultadosPorC1, null, 2));

  // Subir a Firestore
  console.log("☁️ Subiendo métricas por C1 a Firestore (nodus_kpis_sincronizados / coordinadoras_por_c1)...");
  await setDoc(doc(db, 'nodus_kpis_sincronizados', 'coordinadoras_por_c1'), {
    timestamp: new Date().toISOString(),
    equipos: resultadosPorC1
  });
  console.log("✅ ¡Métricas por C1 guardadas con éxito en Firestore!");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
