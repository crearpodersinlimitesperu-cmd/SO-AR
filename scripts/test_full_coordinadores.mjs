import puppeteer from 'puppeteer';
import 'dotenv/config';

async function testFullCoordinadoresExtraction() {
  console.log("Iniciando prueba de extracción completa de coordinadores...");
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://imo.crearpslglobal.com/auth/login', { waitUntil: 'networkidle2', timeout: 35000 });
    await page.type('input[name="usuario"]', process.env.NODUS_USER || 'jsanchez');
    await page.type('input[name="password"]', process.env.NODUS_PASSWORD || '123456');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 })
    ]);

    // Go to actividadcoordinadores
    await page.goto('https://imo.crearpslglobal.com/actividadcoordinadores', { waitUntil: 'networkidle2', timeout: 35000 });

    const rawData = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.card')).filter(c => {
        return c.innerText.includes('Gestiones') && c.innerText.includes('Asignados');
      });

      return cards.map(c => {
        const fullText = c.innerText;
        const header = c.querySelector('.card-header, h5, h6')?.innerText.trim() || fullText.split('\n')[0];
        
        // Extract teams table if present
        const table = c.querySelector('table');
        let equipos = [];
        if (table) {
          const rows = Array.from(table.querySelectorAll('tbody tr'));
          equipos = rows.map(r => {
            const cells = Array.from(r.querySelectorAll('td')).map(td => td.innerText.trim());
            return {
              equipo: cells[0] || '',
              llamadas: parseInt(cells[1]) || 0,
              confirmado: parseInt(cells[2]) || 0,
              noContesta: parseInt(cells[3]) || 0,
              noInteresa: parseInt(cells[4]) || 0,
              siguiente: parseInt(cells[5]) || 0,
              porConfirmar: parseInt(cells[6]) || 0,
              devolucion: parseInt(cells[7]) || 0,
              yaAsistio: parseInt(cells[8]) || 0,
              cambioCupo: parseInt(cells[9]) || 0,
              asistieron: parseInt(cells[10]) || 0
            };
          });
        }

        return {
          header,
          fullText,
          equipos
        };
      });
    });

    console.log(`Total coordinadores extraídos: ${rawData.length}`);
    
    // Parse structured coordinators
    const parsed = rawData.map(item => {
      const lines = item.fullText.split('\n').map(l => l.trim()).filter(Boolean);
      
      // Header parse: e.g. "MARIBEL Cuenca Ciclo 1" or "JOYCE LIMA CICLO 1"
      const nameLine = lines[0];
      let nombre = nameLine;
      let sede = 'Sin Sede';
      let ciclo = 'Ciclo 1';

      if (nameLine.toLowerCase().includes('cuenca')) {
        sede = 'Cuenca';
        nombre = nameLine.replace(/cuenca.*/i, '').trim();
      } else if (nameLine.toLowerCase().includes('guayaquil') || nameLine.toLowerCase().includes('gye')) {
        sede = 'Guayaquil';
        nombre = nameLine.replace(/guayaquil.*/i, '').trim();
      } else if (nameLine.toLowerCase().includes('lima')) {
        sede = 'Lima';
        nombre = nameLine.replace(/lima.*/i, '').trim();
      } else if (nameLine.toLowerCase().includes('medellin') || nameLine.toLowerCase().includes('medellín')) {
        sede = 'Medellín';
        nombre = nameLine.replace(/medell[ií]n.*/i, '').trim();
      } else if (nameLine.toLowerCase().includes('méxico') || nameLine.toLowerCase().includes('mexico') || nameLine.toLowerCase().includes('cdmx')) {
        sede = 'México';
        nombre = nameLine.replace(/m[eé]xico.*/i, '').trim();
      } else if (nameLine.toLowerCase().includes('quito')) {
        sede = 'Quito';
        nombre = nameLine.replace(/quito.*/i, '').trim();
      }

      if (nameLine.toLowerCase().includes('ciclo 2')) {
        ciclo = 'Ciclo 2';
      }

      // Helper to find metric
      const findNumberAfter = (label) => {
        const idx = lines.findIndex(l => l.toLowerCase() === label.toLowerCase());
        if (idx > 0 && /^[0-9]+$/.test(lines[idx - 1])) {
          return parseInt(lines[idx - 1], 10);
        }
        if (idx >= 0 && idx < lines.length - 1 && /^[0-9]+$/.test(lines[idx + 1])) {
          return parseInt(lines[idx + 1], 10);
        }
        return 0;
      };

      const gestiones = findNumberAfter('Gestiones');
      const c1 = findNumberAfter('C1');
      const c2 = findNumberAfter('C2');
      const asignados = findNumberAfter('Asignados');

      // Cobertura line: e.g. "234/748 (31%)"
      const cobLine = lines.find(l => l.includes('/') && l.includes('%'));
      let coberturaPct = 0;
      let coberturaDetalle = '';
      if (cobLine) {
        coberturaDetalle = cobLine;
        const match = cobLine.match(/\((\d+)%\)/);
        if (match) coberturaPct = parseInt(match[1], 10);
      }

      // Productividad line: e.g. "114/396 (29%)"
      const prodLines = lines.filter(l => l.includes('/') && l.includes('%'));
      let productividadPct = 0;
      let productividadDetalle = '';
      if (prodLines.length > 1) {
        productividadDetalle = prodLines[1];
        const match = prodLines[1].match(/\((\d+)%\)/);
        if (match) productividadPct = parseInt(match[1], 10);
      }

      // Ultima conexion
      const ultConexionLine = lines.find(l => l.toLowerCase().includes('últ. conexión'));
      const ultConexion = ultConexionLine ? ultConexionLine.replace(/últ\. conexión:\s*/i, '') : '';

      // Ultima gestion
      const ultGestionLine = lines.find(l => l.toLowerCase().includes('últ. gestión'));
      const ultGestion = ultGestionLine ? ultGestionLine.replace(/últ\. gestión:\s*/i, '') : '';

      // Status values: Confirmado: X, No Contesta: Y, etc.
      const parseStatus = (statusLabel) => {
        const l = lines.find(line => line.toLowerCase().startsWith(statusLabel.toLowerCase() + ':'));
        if (!l) return 0;
        const parts = l.split(':');
        return parseInt(parts[1]?.trim() || '0', 10) || 0;
      };

      const confirmado = parseStatus('Confirmado');
      const noContesta = parseStatus('No Contesta');
      const siguiente = parseStatus('Siguiente');
      const noInteresa = parseStatus('No le Interesa');
      const porConfirmar = parseStatus('Por Confirmar');
      const yaAsistio = parseStatus('Ya Asistió');
      const devolucion = parseStatus('Devolución');

      return {
        id: `coord_${nombre.toLowerCase().replace(/\s+/g, '_')}_${sede.toLowerCase()}`,
        nombre,
        sede,
        ciclo,
        gestiones,
        c1,
        c2,
        asignados,
        coberturaPct,
        coberturaDetalle,
        productividadPct,
        productividadDetalle,
        ultConexion,
        ultGestion,
        estados: {
          confirmado,
          noContesta,
          siguiente,
          noInteresa,
          porConfirmar,
          yaAsistio,
          devolucion
        },
        equipos: item.equipos
      };
    });

    console.log("Muestra de 3 coordinadores estructurados:");
    console.log(JSON.stringify(parsed.slice(0, 3), null, 2));

    // Summary by sede
    const sedesSummary = {};
    parsed.forEach(c => {
      if (!sedesSummary[c.sede]) {
        sedesSummary[c.sede] = { coordinadores: 0, gestiones: 0, asignados: 0, confirmados: 0 };
      }
      sedesSummary[c.sede].coordinadores += 1;
      sedesSummary[c.sede].gestiones += c.gestiones;
      sedesSummary[c.sede].asignados += c.asignados;
      sedesSummary[c.sede].confirmados += c.estados.confirmado;
    });

    console.log("\nResumen por Sede:");
    console.table(sedesSummary);

  } catch (e) {
    console.error("Error:", e);
  } finally {
    await browser.close();
  }
}

testFullCoordinadoresExtraction();
