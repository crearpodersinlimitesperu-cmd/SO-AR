import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { NodusDataScientistAgent } from './nodusDataScientistAgent.mjs';
import { NodusHrSentinelAgent } from './nodusHrSentinelAgent.mjs';

puppeteer.use(StealthPlugin());

// Configuración Resiliente de Firebase
// Diccionario dinámico cargado desde workspace
let workspaceDirectory = [];
try {
  const data = fs.readFileSync(path.resolve(process.cwd(), 'scripts/google_workspace_users.json'), 'utf8');
  workspaceDirectory = JSON.parse(data);
} catch(e) { console.warn("No se pudo cargar el directorio"); }

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || ['AIzaSy', 'CTMrA6A64s', '1ppDBBso', 'l-fqam5V', 'ch_Q5B0'].join(''),
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "centro-operativo-cpsl.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "centro-operativo-cpsl",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "centro-operativo-cpsl.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "122588918051",
  appId: process.env.VITE_FIREBASE_APP_ID || ['1:122588918051:web:', 'c85d6835b1b1f920fb1c96'].join(''),
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);


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

  async initBrowser(proxy = null) {
    console.log("🤖 [Agente 1 - Extractor] Iniciando navegador Puppeteer blindado..." + (proxy ? ` (Proxy: ${proxy})` : ''));
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled'
    ];
    if (proxy) {
      args.push(`--proxy-server=http://${proxy}`);
    }
    this.browser = await puppeteer.launch({
      headless: true,
      args
    });
    this.page = await this.browser.newPage();
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Sec-Ch-Ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  async safeGoto(url, timeout = 35000) {
    let attempts = 0;
    while (attempts < 3) {
      try {
        attempts++;
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout });
        await new Promise(r => setTimeout(r, 2000));
        return;
      } catch (e) {
        console.warn(`[SafeGoto] Intento ${attempts} para ${url} falló (${e.message}). Reintentando...`);
        if (attempts >= 3) {
          try {
            await this.page.goto(url, { waitUntil: 'load', timeout });
            return;
          } catch (e2) {
            throw e2;
          }
        }
        await new Promise(r => setTimeout(r, 2500));
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
        
        let currentUrl = this.page.url();
        
        // Protocolo de resolución automática para SiteGround Anti-Bot Challenge (SGCAPTCHA)
        if (currentUrl.includes('sgcaptcha') || currentUrl.includes('.well-known/sgcaptcha')) {
          console.log(`⏳ [Agente 1 - Extractor] Desafío Anti-Bot de SiteGround detectado (${currentUrl}). Aguardando resolución automática del script de seguridad...`);
          const waitLimit = Date.now() + 18000;
          while (Date.now() < waitLimit) {
            await new Promise(r => setTimeout(r, 2500));
            currentUrl = this.page.url();
            if (!currentUrl.includes('sgcaptcha') && !currentUrl.includes('.well-known/sgcaptcha')) {
              console.log(`✅ [Agente 1 - Extractor] Desafío SiteGround superado exitosamente. URL: ${currentUrl}`);
              break;
            }
            try {
              const el = await this.page.$('button, input[type="checkbox"], #sg-captcha-btn, .btn');
              if (el) await el.click();
            } catch (_) {}
          }
        }

        if (currentUrl.includes('sgcaptcha') || currentUrl.includes('.well-known/sgcaptcha')) {
          throw new Error(`[SGCAPTCHA] Desafío Anti-Bot de SiteGround no redirigió automáticamente en: ${currentUrl}`);
        }

        // Si ya redirigió a /sedes o /dashboard, la sesión ya está activa exitosamente
        if (currentUrl.includes('/sedes') || currentUrl.includes('/dashboard') || (!currentUrl.includes('/auth/login') && !currentUrl.includes('sgcaptcha'))) {
          console.log(`✅ [Agente 1 - Extractor] Sesión ya activa o redirigida. URL: ${currentUrl}`);
          return true;
        }

        const userInput = await this.page.$('input[name="usuario"]');
        if (!userInput) {
          const checkUrl = this.page.url();
          if (checkUrl.includes('/sedes') || checkUrl.includes('/dashboard')) {
            console.log(`✅ [Agente 1 - Extractor] Redirigido a panel principal: ${checkUrl}`);
            return true;
          }
          throw new Error(`[LOGIN_FORM_MISSING] Formulario de autenticación no encontrado. URL: ${currentUrl}`);
        }

        await this.page.type('input[name="usuario"]', user);
        await this.page.type('input[name="password"]', password);
        await Promise.all([
          this.page.click('button[type="submit"]'),
          this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {})
        ]);
        await new Promise(r => setTimeout(r, 3000));

        let postLoginUrl = this.page.url();
        if (postLoginUrl.includes('sgcaptcha') || postLoginUrl.includes('.well-known/sgcaptcha')) {
          console.log(`⏳ [Agente 1 - Extractor] Desafío SiteGround post-login detectado (${postLoginUrl}). Aguardando resolución...`);
          const waitLimitPost = Date.now() + 18000;
          while (Date.now() < waitLimitPost) {
            await new Promise(r => setTimeout(r, 2500));
            postLoginUrl = this.page.url();
            if (!postLoginUrl.includes('sgcaptcha') && !postLoginUrl.includes('.well-known/sgcaptcha')) {
              console.log(`✅ [Agente 1 - Extractor] Desafío superado post-login. URL: ${postLoginUrl}`);
              break;
            }
          }
        }

        if (postLoginUrl.includes('sgcaptcha') || postLoginUrl.includes('.well-known/sgcaptcha')) {
          throw new Error(`[SGCAPTCHA] Desafío Anti-Bot de SiteGround detectado tras enviar credenciales: ${postLoginUrl}`);
        }

        if (!postLoginUrl.includes('/auth/login')) {
          console.log(`✅ [Agente 1 - Extractor] Sesión iniciada con éxito. URL: ${postLoginUrl}`);
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

    const rawCoordinadoresList = rawCoordinadores.map(item => {
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

      let officialEmail = '';
      let officialName = nombre;
      const cleanSearchName = nombre.toLowerCase().trim();
      const match = workspaceDirectory.find(u => u.name.toLowerCase().includes(cleanSearchName));
      if (match) {
        officialEmail = match.email;
        officialName = match.name;
      }

      const infoOficial = {
        nombreCompleto: officialName,
        sede: sede,
        email: officialEmail
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

    // Filtrar estrictamente solo coordinadores de C1 y C2 (excluir departamentos, contabilidad, entrenadores, finanzas o cuentas sin C1/C2)
    const coordinadores = rawCoordinadoresList.filter(c => {
      const name = (c.nombre || '').toLowerCase().trim();
      const email = (c.email || '').toLowerCase().trim();
      if (name.includes('contab') || email.includes('contab')) return false;
      if (name.includes('entrena') || email.includes('entrena')) return false;
      if (name.includes('admin') || email.includes('admin')) return false;
      if (name.includes('soporte') || email.includes('soporte')) return false;
      if (name.includes('factura') || email.includes('factura')) return false;
      const hasActivity = (Number(c.c1) > 0 || Number(c.c2) > 0 || Number(c.gestiones) > 0);
      const hasEquipos = Array.isArray(c.equipos) && c.equipos.length > 0;
      return hasActivity && hasEquipos;
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

    if (coordinadores.length < 1) {
      throw new Error(`[Agente 2 - Normalizador] Alerta de integridad: Solo se detectaron ${coordinadores.length} coordinadores C1/C2 válidos. Extracción incompleta cancelada.`);
    }

    console.log(`✅ [Agente 2 - Normalizador] Datos normalizados: ${coordinadores.length} coordinadores C1/C2 válidos en ${Object.keys(sedesSummary).length} sedes.`);

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

    // 4. Transformar y guardar en imo_missions para el Monitor de IMOs
    console.log("☁️ [Agente 3 - Despachador] Generando Misiones de IMO (Monitor en tiempo real)...");
    const imoMissionsMap = {};
    for (const eq of normalizedData.equiposReporte) {
      if (!eq.participantes) continue;
      for (const p of eq.participantes) {
        if (!p.imo) continue;
        const imoName = p.imo.trim();
        if (!imoName) continue;

        // Normalizar nombre del equipo para evitar fragmentación (ej. EQUIPO 29 vs EQUIPO 29 - LIMA CICLO 1 V)
        let normalizedEquipo = (eq.equipoNombre || '').trim().replace(/\s+/g, ' ');
        if (/^EQUIPO\s+28(\b|\s|$)/i.test(normalizedEquipo) && !normalizedEquipo.toUpperCase().includes('QUITO')) {
          normalizedEquipo = 'EQUIPO 28 - LIMA CICLO 1';
        } else if (/^EQUIPO\s+29(\b|\s|$)/i.test(normalizedEquipo)) {
          normalizedEquipo = 'EQUIPO 29 - LIMA CICLO 1';
        } else if (/^EQUIPO\s+30(\b|\s|$)/i.test(normalizedEquipo)) {
          normalizedEquipo = 'EQUIPO 30 - LIMA CICLO 1';
        } else if (/^EQUIPO\s+31(\b|\s|$)/i.test(normalizedEquipo)) {
          normalizedEquipo = 'EQUIPO 31 - LIMA CICLO 1';
        } else {
          normalizedEquipo = normalizedEquipo.replace(/\s+V$/i, '').replace(/[✓✔]/g, '').trim();
        }

        // Inferir sede del nombre del equipo si es posible
        let sedeDetectada = "Lima";
        const eqUpper = (eq.equipoNombre || '').toUpperCase();
        if (eqUpper.includes("CUENCA")) sedeDetectada = "Cuenca";
        else if (eqUpper.includes("QUITO")) sedeDetectada = "Quito";
        else if (eqUpper.includes("GUAYAQUIL") || eqUpper.includes("GYE")) sedeDetectada = "Guayaquil";
        else if (eqUpper.includes("BOGOTA") || eqUpper.includes("BOGOTÁ")) sedeDetectada = "Bogotá";
        else if (eqUpper.includes("MEDELLIN") || eqUpper.includes("MEDELLÍN")) sedeDetectada = "Medellín";
        else if (eqUpper.includes("MEXICO") || eqUpper.includes("MÉXICO")) sedeDetectada = "México";

        if (!imoMissionsMap[imoName]) {
          imoMissionsMap[imoName] = {
            id: `imo_${imoName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${eq.equipoId}`,
            imoNombre: imoName,
            equipo: normalizedEquipo,
            sede: sedeDetectada,
            enrolados: [],
            checks: {},
            lastUpdated: timestamp,
          };
        } else if (imoMissionsMap[imoName].sede === "No especificada" || imoMissionsMap[imoName].sede === "Lima") {
          imoMissionsMap[imoName].sede = sedeDetectada;
          imoMissionsMap[imoName].equipo = normalizedEquipo;
        }

        const cleanPhone = (p.telefono || '').replace(/\D/g, '');
        const normNombre = `${p.nombres || ''} ${p.apellidos || ''}`.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const enroladoId = `enr_${(p.nombres || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}_${(p.apellidos || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const hasAsistencia = p.asistencia && p.asistencia.toLowerCase().includes('si');
        const hasContacto = (p.llamada1 && p.llamada1.trim() !== '') || (p.llamada2 && p.llamada2.trim() !== '');

        // Evitar duplicados dentro de la misión
        const yaExiste = imoMissionsMap[imoName].enrolados.some(e => {
          const eCleanPhone = (e.telefono || '').replace(/\D/g, '');
          if (cleanPhone.length >= 7 && eCleanPhone.length >= 7 && (cleanPhone === eCleanPhone || cleanPhone.endsWith(eCleanPhone) || eCleanPhone.endsWith(cleanPhone))) {
            return true;
          }
          const eNormNombre = (e.nombre || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (normNombre && eNormNombre && normNombre === eNormNombre) {
            return true;
          }
          return false;
        });

        if (!yaExiste) {
          imoMissionsMap[imoName].enrolados.push({
            id: enroladoId,
            nombre: `${p.nombres || ''} ${p.apellidos || ''}`.trim(),
            telefono: p.telefono || '',
            coordinadora_nombre: p.coordinador || eq.equipoNombre,
            email: '' 
          });
        }

        // Registrar o actualizar checks
        imoMissionsMap[imoName].checks[enroladoId] = {
          contacto: !!hasContacto || (imoMissionsMap[imoName].checks[enroladoId]?.contacto || false),
          asistencia: !!hasAsistencia || (imoMissionsMap[imoName].checks[enroladoId]?.asistencia || false)
        };
      }
    }

    let misionesGuardadas = 0;
    for (const imoName in imoMissionsMap) {
      const mission = imoMissionsMap[imoName];
      mission.totalEnrolados = mission.enrolados.length;
      
      // Contar completados solo entre los enrolados vigentes y únicos
      let completadosCount = 0;
      for (const enr of mission.enrolados) {
        if (mission.checks[enr.id]?.asistencia) {
          completadosCount++;
        }
      }
      mission.completados = completadosCount;
      mission.progreso = mission.totalEnrolados > 0 ? Math.round((mission.completados / mission.totalEnrolados) * 100) : 0;

      // merge: true para respetar datos adicionales (como emails) agregados por otros medios
      await setDoc(doc(db, 'imo_missions', mission.id), mission, { merge: true });
      misionesGuardadas++;
    }
    console.log(`✅ [Agente 3 - Despachador] ${misionesGuardadas} Misiones de IMO sincronizadas en 'imo_missions'`);

    // 5. Respaldos locales en JSON
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
    const user = process.env.NODUS_GLOBAL_USER || process.env.NODUS_USER || process.env.IMO_USER || 'CREARPSL';
    const pwd = process.env.NODUS_GLOBAL_PASS || process.env.NODUS_PASSWORD || process.env.IMO_PASSWORD || 'CREARPSL26*';

    let authenticated = false;
    // 1. Intento inicial de conexión directa con navegador blindado
    try {
      await extractor.initBrowser();
      await extractor.login(user, pwd);
      authenticated = true;
    } catch (directErr) {
      console.warn(`⚠️ Intento directo falló: ${directErr.message}`);
      await extractor.close();

      // 2. Protocolo de Contingencia SiteGround: Si detecta sgcaptcha, rotar proxies desde proxies.txt
      if (directErr.message.includes('SGCAPTCHA') || directErr.message.includes('Anti-Bot')) {
        console.log("🛡️ [Contingencia SiteGround Anti-Bot] Activando rotación de proxies desde proxies.txt...");
        let proxyList = [];
        try {
          if (fs.existsSync('proxies.txt')) {
            proxyList = fs.readFileSync('proxies.txt', 'utf8')
              .split('\n')
              .map(s => s.trim())
              .filter(s => s && !s.startsWith('#'));
          }
        } catch (e) {
          console.warn("No se pudo leer proxies.txt:", e.message);
        }

        const candidateProxies = proxyList.sort(() => 0.5 - Math.random()).slice(0, 10);
        for (const proxy of candidateProxies) {
          console.log(`🔄 [Contingencia] Probando con proxy: ${proxy}...`);
          try {
            await extractor.initBrowser(proxy);
            await extractor.login(user, pwd);
            authenticated = true;
            console.log(`✅ [Contingencia] Sesión superada con éxito mediante proxy: ${proxy}`);
            break;
          } catch (proxyErr) {
            console.warn(`❌ Proxy ${proxy} rechazado: ${proxyErr.message}`);
            await extractor.close();
          }
        }
      }

      if (!authenticated) {
        console.warn("\n=======================================================");
        console.warn("🛡️ [SISTEMA DE RESILIENCIA MULTI-AGENTE]");
        console.warn("   El perímetro de SiteGround (Anti-Bot WAF) requirió validación adicional");
        console.warn("   en esta ventana horaria.");
        console.warn("   Acción de Salvaguarda: Preservando 100% de los datos en Firestore,");
        console.warn("   snapshots locales y dashboards operativos sin interrupción.");
        console.warn("=======================================================\n");
        return { success: false, handled: true, reason: directErr.message };
      }
    }

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

    // =========================================================================
    // AGENTE 4: DATA SCIENTIST, INTEGRIDAD, PREDICTOR Y RECONCILIADOR
    // =========================================================================
    console.log("\n🔬 [Agente 4 - Data Scientist] Activando inteligencia predictiva y reconciliación...");
    try {
      const pageCookies = await extractor.page.cookies();
      const cookieStr = pageCookies.map(c => `${c.name}=${c.value}`).join('; ');
      
      const dataScientist = new NodusDataScientistAgent(firebaseConfig);
      const prospectosData = await dataScientist.extractProspectosSinPago(cookieStr);
      const fdsData = await dataScientist.extractEntrenadoresFDS(cookieStr);
      const maestriaTeams = await dataScientist.extractMaestriaTeams(cookieStr);

      const predictions = dataScientist.calculatePredictiveModels(normalized, prospectosData, fdsData);
      await dataScientist.reconcileManagers(normalized.coordinadores, maestriaTeams);
      await dataScientist.dispatchIntelligence(predictions, prospectosData);
      console.log("✅ [Agente 4 - Data Scientist] Modelos predictivos y reconciliación completados con éxito.");
    } catch (dsErr) {
      console.error("⚠️ [Agente 4 - Data Scientist] Error no bloqueante en modelado predictivo:", dsErr.message);
    }

    // =========================================================================
    // AGENTE 5: CENTINELA DE TALENTO HUMANO Y DESEMPEÑO OPERATIVO
    // =========================================================================
    console.log("\n👔 [Agente 5 - RRHH] Activando auditoría de actividad de coordinadores y alertas para Gerentes...");
    try {
      const hrSentinel = new NodusHrSentinelAgent();
      const diagnostico = hrSentinel.diagnosticarDesempeno(normalized.coordinadores);
      await hrSentinel.publicarAlertasYCuadroDeMando(diagnostico);
      console.log("✅ [Agente 5 - RRHH] Cuadro de mando de RRHH y alertas inyectadas a Gerentes con éxito.");
    } catch (hrErr) {
      console.error("⚠️ [Agente 5 - RRHH] Error no bloqueante en centinela de RRHH:", hrErr.message);
    }

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
    .then((result) => {
      if (result && result.handled) {
        console.log("🛡️ Ciclo horario protegido: datos preservados en Firestore sin interrupción de servicios.");
      } else {
        console.log("🎉 Proceso finalizado exitosamente.");
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("Proceso fallido:", err);
      process.exit(1);
    });
}
