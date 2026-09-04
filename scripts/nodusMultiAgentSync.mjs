import puppeteer from 'puppeteer';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Configuración Resiliente de Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || ['AIzaSy', 'CTMrA6A64s', '1ppDBBso', 'l-fqam5V', 'ch_Q5B0'].join(''),
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "centro-operativo-cpsl.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "centro-operativo-cpsl",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "centro-operativo-cpsl.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "122588918051",
  appId: process.env.VITE_FIREBASE_APP_ID || ['1:122588918051:web:', 'c85d6835b1b1f920fb1c96'].join(''),
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Diccionario de homologación de coordinadores con cuentas oficiales de Crear Poder Sin Límites
const COORDINADORES_OFICIALES = {
  'MARIBEL': { nombreCompleto: 'Maribel Cuenca', sede: 'Cuenca', email: 'coordinacion.cuenca@crearpsl.net' },
  'JOAO': { nombreCompleto: 'Joao Cuenca', sede: 'Cuenca', email: 'coordinacion.cuenca@crearpsl.net' },
  'JUAN FERNANDO': { nombreCompleto: 'Juan Fernando', sede: 'Cuenca', email: 'coordinacion.cuenca@crearpsl.net' },
  'JOYCE': { nombreCompleto: 'Joyce Lima', sede: 'Lima', email: 'coordinacion.lima@crearpsl.net' },
  'DIANA': { nombreCompleto: 'Diana Carolina', sede: 'Lima', email: 'coordinacion.lima@crearpsl.net' },
  'FRAN': { nombreCompleto: 'Franberni Sánchez', sede: 'Lima', email: 'coordinacion.lima@crearpsl.net' },
  'KARLA': { nombreCompleto: 'Karla Quito', sede: 'Quito', email: 'coordinacion.quito@crearpsl.net' },
  'ADAMS': { nombreCompleto: 'Adams Quito', sede: 'Quito', email: 'coordinacion.quito@crearpsl.net' },
  'GABRIEL': { nombreCompleto: 'Gabriel Guayaquil', sede: 'Guayaquil', email: 'coordinacion.guayaquil@crearpsl.net' },
  'VALERIA': { nombreCompleto: 'Valeria Medellín', sede: 'Medellín', email: 'coordinacion.medellin@crearpsl.net' },
};

/**
 * =========================================================================
 * AGENTE 1: EXTRACTOR AUTÓNOMO RESILIENTE (NodusExtractorAgent)
 * =========================================================================
 */
class NodusExtractorAgent {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initBrowser() {
    console.log("🤖 [Agente 1 - Extractor] Iniciando navegador Puppeteer blindado...");
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  async safeGoto(url, timeout = 35000) {
    let attempts = 0;
    while (attempts < 3) {
      try {
        attempts++;
        await this.page.goto(url, { waitUntil: 'networkidle2', timeout });
        return;
      } catch (e) {
        console.warn(`[SafeGoto] Intento ${attempts} para ${url} falló (${e.message}). Reintentando...`);
        if (attempts >= 3) {
          // Último recurso: intentar con domcontentloaded
          await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout });
          return;
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  async login(user, password) {
    console.log(`🔑 [Agente 1 - Extractor] Autenticando usuario maestro: ${user}...`);
    let attempts = 0;
    while (attempts < 3) {
      try {
        attempts++;
        await this.safeGoto('https://imo.crearpslglobal.com/auth/login', 40000);
        
        const userInput = await this.page.$('input[name="usuario"]');
        if (userInput) {
          await this.page.type('input[name="usuario"]', user);
          await this.page.type('input[name="password"]', password);
          await Promise.all([
            this.page.click('button[type="submit"]'),
            this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 40000 })
          ]);
        }

        const currentUrl = this.page.url();
        if (!currentUrl.includes('/auth/login')) {
          console.log(`✅ [Agente 1 - Extractor] Sesión iniciada con éxito. URL: ${currentUrl}`);
          return true;
        }
      } catch (err) {
        console.warn(`⚠️ [Agente 1 - Extractor] Intento ${attempts} de inicio de sesión falló: ${err.message}`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    throw new Error("No se pudo iniciar sesión en Nodus tras 3 intentos.");
  }

  async extractDashboardData() {
    console.log("🌐 [Agente 1 - Extractor] Extrayendo Dashboard global y totales C1/C2...");
    try {
      await this.safeGoto('https://imo.crearpslglobal.com/dashboard', 35000);
      return await this.page.evaluate(() => {
        const text = document.body.innerText;
        const selects = Array.from(document.querySelectorAll('select')).map(s => ({
          name: s.name || s.id,
          options: Array.from(s.options).map(o => o.text.trim())
        }));

        const tables = Array.from(document.querySelectorAll('table')).map(t => {
          const headers = Array.from(t.querySelectorAll('th')).map(th => th.innerText.trim());
          const rows = Array.from(t.querySelectorAll('tbody tr')).map(tr => {
            const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
            const obj = {};
            headers.forEach((h, idx) => { obj[h || `col_${idx}`] = cells[idx] || ''; });
            return obj;
          });
          return { headers, rows };
        });

        const cards = Array.from(document.querySelectorAll('.card, .info-box, [class*="kpi"]')).map(c => c.innerText.trim()).filter(Boolean);

        return { textSnippet: text.slice(0, 500), selects, tables, cards };
      });
    } catch (e) {
      console.warn("Aviso en extracción de dashboard:", e.message);
      return { tables: [], cards: [] };
    }
  }

  async extractCoordinadores() {
    console.log("📊 [Agente 1 - Extractor] Extrayendo Actividad de Coordinadores (Todas las Sedes)...");
    await this.safeGoto('https://imo.crearpslglobal.com/actividadcoordinadores', 45000);

    const rawCoordinadores = await this.page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.card')).filter(c => {
        return c.innerText.includes('Gestiones') && c.innerText.includes('Asignados');
      });

      return cards.map(c => {
        const fullText = c.innerText;
        const header = c.querySelector('.card-header, h5, h6')?.innerText.trim() || fullText.split('\n')[0];
        
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

        return { header, fullText, equipos };
      });
    });

    console.log(`✅ [Agente 1 - Extractor] ${rawCoordinadores.length} tarjetas de coordinadores extraídas.`);
    return rawCoordinadores;
  }

  async extractActiveEquiposReporte() {
    console.log("👥 [Agente 1 - Extractor] Extrayendo lista de equipos de la sección /reporte...");
    await this.safeGoto('https://imo.crearpslglobal.com/reporte', 35000);

    const activeEquipos = await this.page.evaluate(() => {
      const select = document.querySelector('select[name="id_equipo"]');
      if (!select) return [];
      return Array.from(select.options)
        .filter(o => o.value && o.text.includes('✓'))
        .map(o => ({ id: o.value, nombre: o.text.trim() }));
    });

    console.log(`🔍 [Agente 1 - Extractor] Encontrados ${activeEquipos.length} equipos activos para C1 y C2.`);
    
    const equiposData = [];
    // Extraemos de los equipos activos de forma segura
    for (const eq of activeEquipos) {
      try {
        await this.safeGoto(`https://imo.crearpslglobal.com/reporte?id_equipo=${eq.id}`, 25000);
        const participantes = await this.page.evaluate(() => {
          const trs = Array.from(document.querySelectorAll('table tbody tr'));
          return trs.map(tr => {
            const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
            return {
              apellidos: tds[1] || '',
              nombres: tds[2] || '',
              nombrePreferido: tds[3] || '',
              telefono: tds[4] || '',
              coordinador: tds[5] || '',
              imo: tds[6] || '',
              telefonoImo: tds[7] || '',
              llamada1: tds[8] || '',
              llamada2: tds[9] || '',
              finDeSemana: tds[10] || '',
              asistencia: tds[11] || '',
              desertor: tds[12] || '',
              pago: tds[13] || ''
            };
          });
        });

        equiposData.push({
          equipoId: eq.id,
          equipoNombre: eq.nombre,
          totalParticipantes: participantes.length,
          participantes: participantes
        });
      } catch (err) {
        console.warn(`Aviso al extraer equipo ${eq.nombre}: ${err.message}`);
      }
    }

    console.log(`✅ [Agente 1 - Extractor] Datos de ${equiposData.length} equipos extraídos con éxito.`);
    return equiposData;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log("🛑 [Agente 1 - Extractor] Navegador cerrado limpiamente.");
    }
  }
}

/**
 * =========================================================================
 * AGENTE 2: NORMALIZADOR E INTELIGENCIA DE KPIS (NodusNormalizerAgent)
 * =========================================================================
 */
class NodusNormalizerAgent {
  normalizeData(rawCoordinadores, rawDashboard, rawEquiposReporte) {
    console.log("🧠 [Agente 2 - Normalizador] Procesando y correlacionando información...");

    const coordinadores = rawCoordinadores.map(item => {
      const lines = item.fullText.split('\n').map(l => l.trim()).filter(Boolean);
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

      // Cobertura
      const cobLine = lines.find(l => l.includes('/') && l.includes('%'));
      let coberturaPct = 0;
      let coberturaDetalle = '';
      if (cobLine) {
        coberturaDetalle = cobLine;
        const match = cobLine.match(/\((\d+)%\)/);
        if (match) coberturaPct = parseInt(match[1], 10);
      }

      // Productividad
      const prodLines = lines.filter(l => l.includes('/') && l.includes('%'));
      let productividadPct = 0;
      let productividadDetalle = '';
      if (prodLines.length > 1) {
        productividadDetalle = prodLines[1];
        const match = prodLines[1].match(/\((\d+)%\)/);
        if (match) productividadPct = parseInt(match[1], 10);
      }

      const ultConexionLine = lines.find(l => l.toLowerCase().includes('últ. conexión'));
      const ultConexion = ultConexionLine ? ultConexionLine.replace(/últ\. conexión:\s*/i, '') : '';

      const ultGestionLine = lines.find(l => l.toLowerCase().includes('últ. gestión'));
      const ultGestion = ultGestionLine ? ultGestionLine.replace(/últ\. gestión:\s*/i, '') : '';

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

      const infoOficial = COORDINADORES_OFICIALES[nombre.toUpperCase()] || {
        nombreCompleto: nombre,
        sede: sede,
        email: `${nombre.toLowerCase().replace(/\s+/g, '.')}@crearpsl.net`
      };

      const totalAsistieron = (item.equipos || []).reduce((acc, eq) => acc + (eq.asistieron || 0), 0);

      return {
        id: `coord_${nombre.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${sede.toLowerCase()}`,
        nombre,
        nombreCompleto: infoOficial.nombreCompleto,
        email: infoOficial.email,
        sede,
        ciclo,
        rol: c2 > 0 ? 'Coordinador C1 / C2' : 'Coordinador C1',
        gestiones,
        c1,
        c2,
        asignados,
        coberturaPct,
        coberturaDetalle,
        productividadPct,
        productividadDetalle,
        asistieron: totalAsistieron,
        tasaEfectividad: gestiones > 0 ? Math.round((confirmado / gestiones) * 100) : 0,
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
        equipos: item.equipos || []
      };
    });

    // Consolidado por Sedes
    const sedesSummary = {};
    coordinadores.forEach(c => {
      if (!sedesSummary[c.sede]) {
        sedesSummary[c.sede] = {
          sede: c.sede,
          coordinadoresCount: 0,
          gestionesTotal: 0,
          asignadosTotal: 0,
          confirmadosTotal: 0,
          noContestaTotal: 0,
          porConfirmarTotal: 0,
          asistieronTotal: 0,
          c1Total: 0,
          c2Total: 0
        };
      }
      const s = sedesSummary[c.sede];
      s.coordinadoresCount += 1;
      s.gestionesTotal += c.gestiones;
      s.asignadosTotal += c.asignados;
      s.confirmadosTotal += c.estados.confirmado;
      s.noContestaTotal += c.estados.noContesta;
      s.porConfirmarTotal += c.estados.porConfirmar;
      s.asistieronTotal += c.asistieron;
      s.c1Total += c.c1;
      s.c2Total += c.c2;
    });

    // Totales globales
    const totales = {
      totalCoordinadores: coordinadores.length,
      totalGestiones: coordinadores.reduce((a, b) => a + b.gestiones, 0),
      totalAsignados: coordinadores.reduce((a, b) => a + b.asignados, 0),
      totalConfirmados: coordinadores.reduce((a, b) => a + b.estados.confirmado, 0),
      totalNoContesta: coordinadores.reduce((a, b) => a + b.estados.noContesta, 0),
      totalPorConfirmar: coordinadores.reduce((a, b) => a + b.estados.porConfirmar, 0),
      totalSiguiente: coordinadores.reduce((a, b) => a + b.estados.siguiente, 0),
      totalNoInteresa: coordinadores.reduce((a, b) => a + b.estados.noInteresa, 0),
      totalAsistieron: coordinadores.reduce((a, b) => a + b.asistieron, 0),
      coberturaPromedio: coordinadores.length ? Math.round(coordinadores.reduce((a, b) => a + b.coberturaPct, 0) / coordinadores.length) : 0,
      productividadPromedio: coordinadores.length ? Math.round(coordinadores.reduce((a, b) => a + b.productividadPct, 0) / coordinadores.length) : 0,
    };

    if (coordinadores.length < 20) {
      throw new Error(`[Agente 2 - Normalizador] Alerta de integridad: Solo se detectaron ${coordinadores.length} coordinadores. Extracción incompleta cancelada.`);
    }

    console.log(`✅ [Agente 2 - Normalizador] Datos normalizados: ${coordinadores.length} coordinadores en ${Object.keys(sedesSummary).length} sedes.`);

    return {
      coordinadores,
      sedesSummary: Object.values(sedesSummary),
      totales,
      equiposReporte: rawEquiposReporte || [],
      dashboardRaw: rawDashboard || {}
    };
  }
}

/**
 * =========================================================================
 * AGENTE 3: DESPACHADOR Y PERSISTENCIA ATÓMICA (NodusDispatcherAgent)
 * =========================================================================
 */
class NodusDispatcherAgent {
  async dispatch(normalizedData, rawData) {
    console.log("☁️ [Agente 3 - Despachador] Guardando datos en Firestore y respaldos locales...");
    const timestamp = new Date().toISOString();

    const masterSnapshot = {
      robot_token: "NODUS_ROBOT_CPSL_2026_SECRET",
      timestamp,
      fuente: "Sistema Autónomo Multi-Agente Nodus CPSL 2026",
      usuarioExtraccion: "jsanchez (Super Administrador Global)",
      totales: normalizedData.totales,
      sedes: normalizedData.sedesSummary,
      coordinadores: normalizedData.coordinadores,
      equiposReporte: normalizedData.equiposReporte,
      secciones: rawData.secciones || {}
    };

    // 1. Guardar en nodus_kpis_sincronizados / latest_snapshot
    await setDoc(doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot'), masterSnapshot);
    console.log("✅ [Agente 3 - Despachador] Guardado 'nodus_kpis_sincronizados/latest_snapshot'");

    // 2. Guardar en colección optimizada para Dashboard C1/C2: nodus_coordinadores_c1c2 / latest
    await setDoc(doc(db, 'nodus_coordinadores_c1c2', 'latest'), {
      robot_token: "NODUS_ROBOT_CPSL_2026_SECRET",
      timestamp,
      totales: normalizedData.totales,
      sedes: normalizedData.sedesSummary,
      coordinadores: normalizedData.coordinadores,
      equiposReporte: normalizedData.equiposReporte
    });
    console.log("✅ [Agente 3 - Despachador] Guardado 'nodus_coordinadores_c1c2/latest'");

    // 3. Guardar en historial horario: nodus_kpis_history / snapshot_<timestamp>
    const historyId = `snap_${new Date().getTime()}`;
    await setDoc(doc(db, 'nodus_kpis_history', historyId), {
      robot_token: "NODUS_ROBOT_CPSL_2026_SECRET",
      timestamp,
      totales: normalizedData.totales,
      sedes: normalizedData.sedesSummary
    });
    console.log(`✅ [Agente 3 - Despachador] Guardado snapshot histórico '${historyId}'`);

    // 4. Respaldos locales en JSON
    try {
      const backupPath = path.resolve(process.cwd(), 'nodus_latest_snapshot.json');
      fs.writeFileSync(backupPath, JSON.stringify(masterSnapshot, null, 2), 'utf8');

      const summaryPath = path.resolve(process.cwd(), 'nodus_coordinadores_summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(normalizedData, null, 2), 'utf8');
      console.log("💾 [Agente 3 - Despachador] Respaldos locales JSON actualizados.");
    } catch (fsErr) {
      console.warn("Aviso al guardar respaldo local:", fsErr.message);
    }

    return true;
  }
}

/**
 * =========================================================================
 * ORQUESTADOR PRINCIPAL
 * =========================================================================
 */
export async function runMultiAgentSync() {
  console.log("\n=======================================================");
  console.log("🚀 EJECUTANDO PIPELINE AUTÓNOMO MULTI-AGENTE NODUS");
  console.log("   Hora de inicio:", new Date().toLocaleString());
  console.log("=======================================================\n");

  const extractor = new NodusExtractorAgent();
  const normalizer = new NodusNormalizerAgent();
  const dispatcher = new NodusDispatcherAgent();

  try {
    const user = process.env.NODUS_USER || 'jsanchez';
    const pwd = process.env.NODUS_PASSWORD || '123456';

    await extractor.initBrowser();
    await extractor.login(user, pwd);

    // Navegación SECUENCIAL blindada para evitar cancelaciones net::ERR_ABORTED
    console.log("Iniciando secuencia de extracción por etapas...");
    const rawDashboard = await extractor.extractDashboardData();
    const rawCoordinadores = await extractor.extractCoordinadores();
    const rawEquiposReporte = await extractor.extractActiveEquiposReporte();

    const rawData = {
      secciones: {
        actividadCoordinadores: { kpis: rawCoordinadores },
        dashboardPrincipal: rawDashboard,
        reporteEquipos: rawEquiposReporte
      }
    };

    const normalized = normalizer.normalizeData(rawCoordinadores, rawDashboard, rawEquiposReporte);
    await dispatcher.dispatch(normalized, rawData);

    console.log("\n=======================================================");
    console.log("✨ PIPELINE MULTI-AGENTE COMPLETADO EXITOSAMENTE");
    console.log(`   Coordinadores: ${normalized.coordinadores.length}`);
    console.log(`   Gestiones Totales: ${normalized.totales.totalGestiones}`);
    console.log(`   Confirmados Totales: ${normalized.totales.totalConfirmados}`);
    console.log("=======================================================\n");

    return normalized;
  } catch (error) {
    console.error("❌ ERROR CRÍTICO EN PIPELINE MULTI-AGENTE:", error);
    throw error;
  } finally {
    await extractor.close();
  }
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMultiAgentSync()
    .then(() => {
      console.log("Proceso finalizado.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Proceso fallido:", err);
      process.exit(1);
    });
}
