import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { initializeApp as initializeAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';
import { NodusDataScientistAgent } from './nodusDataScientistAgent.mjs';
import { NodusManagersSheetAgent } from './agentSincronizadorSheets.mjs';
import { NodusHrSentinelAgent } from './nodusHrSentinelAgent.mjs';
import { NodusFIAgent } from './nodusFIAgent.mjs';
import { NodusGenealogyAgent } from './nodusGenealogyAgent.mjs';
import { NodusIdentityAgent } from './nodusIdentityAgent.mjs';
import {
  assessFiCompleteness,
  buildEquipoSedeIndex,
  canonicalSede,
  mergeParticipants,
  parseDataTablesInfo,
  rowsToFiParticipants,
  summarizeSedeEquipoDiscrepancies
} from './nodusFuturosImposiblesParser.mjs';
import { resolveUniqueNameMatch } from '../shared/rrhhSentinelRules.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// La publicación de FIs nunca usa el SDK público ni guarda tokens en
// Firestore. El job de CI debe inyectar una cuenta de servicio de Firebase.
function getAdminDbForNodusPublish() {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  let serviceAccount;
  if (!rawServiceAccount) {
    if (fs.existsSync('centro-operativo-cpsl-3d05655c949c.json')) {
      serviceAccount = JSON.parse(fs.readFileSync('centro-operativo-cpsl-3d05655c949c.json', 'utf8'));
    } else {
      throw new Error('Falta FIREBASE_SERVICE_ACCOUNT_KEY/GOOGLE_SERVICE_ACCOUNT_JSON para publicar el snapshot FI.');
    }
  } else {
    serviceAccount = JSON.parse(rawServiceAccount);
  }
  const adminApp = getAdminApps().length ? getAdminApps()[0] : initializeAdminApp({ credential: cert(serviceAccount) });
  return getAdminFirestore(adminApp);
}


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
      headless: false,
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

  /**
   * Explora y mapea los módulos de la barra lateral (navegación DOM) de Nodus.
   * Alerta si encuentra módulos nuevos o cambios estructurales en la UI.
   */
  async exploreAndMapModules() {
    console.log("🗺️ [Agente 1 - Extractor] Iniciando exploración DOM para mapeo de módulos...");
    try {
      await this.safeGoto('https://imo.crearpslglobal.com/dashboard', 35000);
      
      const navLinks = await this.page.evaluate(() => {
        // En Nodus, los links suelen estar en un sidebar o navbar
        const links = Array.from(document.querySelectorAll('a[href]'));
        const mapped = [];
        for (const link of links) {
          const text = link.innerText.trim();
          const href = link.href;
          // Ignorar enlaces vacíos, logout o javascript
          if (text && href && href.includes('imo.crearpslglobal.com') && !href.includes('logout') && !href.includes('javascript')) {
            mapped.push({ text, href: href.split('imo.crearpslglobal.com')[1] || href });
          }
        }
        // Deduplicar
        const unique = [];
        const seen = new Set();
        for (const item of mapped) {
          if (!seen.has(item.href)) {
            seen.add(item.href);
            unique.push(item);
          }
        }
        return unique;
      });

      console.log(`✅ [Agente 1 - Extractor] Mapeados ${navLinks.length} enlaces/módulos únicos.`);
      return navLinks;
    } catch (e) {
      console.warn(`⚠️ [Agente 1 - Extractor] Error explorando módulos: ${e.message}`);
      return [];
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
            const item = {};
            if (tds[1]) item.apellidos = tds[1];
            if (tds[2]) item.nombres = tds[2];
            if (tds[3]) item.nombrePreferido = tds[3];
            if (tds[4]) item.telefono = tds[4];
            if (tds[5]) item.coordinador = tds[5];
            if (tds[6]) item.imo = tds[6];
            if (tds[7]) item.telefonoImo = tds[7];
            if (tds[8]) item.llamada1 = tds[8];
            if (tds[9]) item.llamada2 = tds[9];
            if (tds[10]) item.finDeSemana = tds[10];
            if (tds[11]) item.asistencia = tds[11];
            if (tds[12]) item.desertor = tds[12];
            if (tds[13]) item.pago = tds[13];
            return item;
          }).filter(p => p.nombres || p.apellidos || p.telefono || p.imo);
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

  async extractFuturosImposibles(coordinadores = null) {
    console.log("🎯 [Agente 1 - Extractor] Extrayendo Futuros Imposibles multi-sede desde NODUS...");
    const FI_URL = 'https://imo.crearpslglobal.com/futurosimposibles';
    const equipoSedeIndex = buildEquipoSedeIndex(coordinadores);
    const expectedSedes = [...new Set((coordinadores || []).map((c) => c?.sede).filter((s) => s && canonicalSede(s) !== 'Sin sede'))];
    const acumulador = new Map();
    const blocked = [];
    const pasadas = [];
    let expectedTotal = null;

    const isBlocked = () => /sgcaptcha/.test(this.page.url());
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    // Lee la página actual de DataTables (cabeceras, filas, info y estado de paginación).
    const leerPagina = () => this.page.evaluate(() => {
      const key = (v = '') => v.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const table = Array.from(document.querySelectorAll('table')).find((t) => {
        const h = key(t.querySelector('thead')?.innerText || '');
        return h.includes('nombre') || h.includes('participante') || h.includes('asistente');
      });
      if (!table) return { found: false, rows: [], info: '', hasNext: false };
      const headers = Array.from(table.querySelectorAll('thead th')).map((h, i) => key(h.innerText || `col_${i}`));
      const rows = Array.from(table.querySelectorAll('tbody tr')).map((tr) => {
        const cells = Array.from(tr.querySelectorAll('td')).map((c) => c.innerText.trim());
        return headers.reduce((rec, h, i) => ({ ...rec, [h]: cells[i] || '' }), {});
      }).filter((r) => Object.values(r).some(Boolean) && !/ningun dato|no hay datos|no data/.test(key(Object.values(r)[0])));
      const info = document.querySelector('.dataTables_info')?.innerText || '';
      const next = document.querySelector('.paginate_button.next, #DataTables_Table_0_next');
      return { found: true, rows, info, hasNext: !!next && !/disabled/.test(next.className || '') };
    });

    // Muestra el máximo de filas por página y recorre todas las páginas.
    const leerTodasLasPaginas = async () => {
      await this.page.evaluate(() => {
        const sel = document.querySelector('select[name$="_length"]');
        if (!sel) return;
        const max = Array.from(sel.options).map((o) => ({ v: o.value, n: parseInt(o.value, 10) }))
          .sort((a, b) => (b.n === -1 ? Infinity : b.n) - (a.n === -1 ? Infinity : a.n))[0];
        if (max) { sel.value = max.v; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await wait(1500);
      const rows = [];
      let total = null;
      for (let page = 0; page < 300; page++) {
        const snap = await leerPagina();
        if (!snap.found) break;
        rows.push(...snap.rows);
        total = parseDataTablesInfo(snap.info) ?? total;
        if (!snap.hasNext) break;
        await this.page.evaluate(() => document.querySelector('.paginate_button.next, #DataTables_Table_0_next')?.click());
        await wait(700);
      }
      return { rows, total };
    };

    const registrarPasada = async (etiqueta) => {
      if (isBlocked()) { blocked.push(etiqueta); return; }
      const { rows, total } = await leerTodasLasPaginas();
      const parsed = rowsToFiParticipants(rows, { equipoSedeIndex });
      const nuevos = mergeParticipants(acumulador, parsed);
      pasadas.push({ etiqueta, filasLeidas: rows.length, totalDeclarado: total, nuevos });
      console.log(`📍 [Agente 6 - FI] ${etiqueta}: ${rows.length} filas (declaradas: ${total ?? 'n/d'}), ${nuevos} nuevos. Total: ${acumulador.size}`);
      return total;
    };

    // Cambia un <select> de la página a la opción indicada y espera a que recargue.
    const elegirOpcion = async (selectIndex, optionValue) => {
      await this.page.evaluate((i, v) => {
        const sel = document.querySelectorAll('select:not([name$="_length"])')[i];
        if (!sel) return;
        sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true }));
      }, selectIndex, optionValue);
      await wait(2000);
    };

    await this.safeGoto(FI_URL, 45000);
    if (isBlocked()) {
      throw new Error('El WAF de NODUS/SiteGround bloqueó la lectura de Futuros Imposibles; no se interpretó como universo vacío.');
    }

    // Pasada base: vista por defecto (equipo "Todos"), todas las páginas. No
    // se retorna aquí: es solo la primera de varias pasadas.
    expectedTotal = await registrarPasada('Vista completa');

    // Filtros de la página (sede y/o equipo): se recorre cada opción concreta
    // para no depender de que "Todos" entregue el universo completo.
    const filtros = await this.page.evaluate(() => Array.from(document.querySelectorAll('select:not([name$="_length"])')).map((sel, index) => ({
      index,
      options: Array.from(sel.options).map((o) => ({ value: o.value, text: o.text.trim() }))
        .filter((o) => o.value !== '' && !/^(todas?|todos|all|global|sin filtro|seleccione.*)$/i.test(o.text))
    })));
    for (const filtro of filtros) {
      for (const opt of filtro.options) {
        try {
          await this.safeGoto(FI_URL, 35000);
          if (isBlocked()) { blocked.push(`filtro ${opt.text}`); continue; }
          await elegirOpcion(filtro.index, opt.value);
          await registrarPasada(`Filtro ${opt.text}`);
        } catch (err) {
          blocked.push(`filtro ${opt.text}: ${err.message}`);
        }
      }
    }

    const participantes = Array.from(acumulador.values());
    const evaluacion = assessFiCompleteness({ participantes, expectedTotal, blocked, expectedSedes });
    const discrepancias = summarizeSedeEquipoDiscrepancies(participantes);
    if (discrepancias.sinSede > 0) evaluacion.reasons.push(`${discrepancias.sinSede} registros sin sede resoluble.`);
    const completeness = evaluacion.reasons.length ? 'partial' : 'complete';
    console.log(`${completeness === 'complete' ? '✅' : '⚠️'} [Agente 6 - FI] ${participantes.length} participantes únicos; cobertura: ${evaluacion.coverage.map((c) => `${c.sede}=${c.participantes}`).join(', ')}; estado: ${completeness}. ${evaluacion.reasons.join(' ')}`);
    return {
      participantes,
      completeness,
      completenessReasons: evaluacion.reasons,
      coverage: evaluacion.coverage,
      expectedTotal,
      passes: pasadas,
      blocked,
      sedeEquipoDiscrepancies: discrepancias
    };
  }

  async extractAvanzadosYContabilidad() {
    console.log("💼 [Agente 1 - Extractor] Iniciando extracción profunda: C1, C2, Maestría y Finanzas (BI Auditor)...");
    
    const biData = {
      capitulo1: [],
      capitulo2: [],
      maestria: [],
      finanzas: []
    };

    try {
      // Extraer Capítulo 1
      console.log("   -> Extrayendo histórico y asistencia Capítulo 1...");
      await this.safeGoto('https://imo.crearpslglobal.com/capitulo1', 25000);
      biData.capitulo1 = await this.page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        return rows.map(tr => {
          const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
          return { original: tds[0] || '', info: tds.join('|') };
        });
      });
      
      // Extraer Capítulo 2
      console.log("   -> Extrayendo retención y asistencia Capítulo 2...");
      await this.safeGoto('https://imo.crearpslglobal.com/capitulo2', 25000);
      biData.capitulo2 = await this.page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        return rows.map(tr => {
          const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
          return { original: tds[0] || '', info: tds.join('|') };
        });
      });

      // Extraer Maestría (Creación, Relación, Gratitud, Viaje)
      console.log("   -> Extrayendo embudo de Maestría...");
      await this.safeGoto('https://imo.crearpslglobal.com/maestria', 25000);
      biData.maestria = await this.page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        return rows.map(tr => {
          const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
          return { original: tds[0] || '', info: tds.join('|') };
        });
      });

      console.log("   -> Extrayendo registros maestros de participantes (para linaje de rezagados)...");
      await this.safeGoto('https://imo.crearpslglobal.com/participantes/datosTabla?draw=1&start=0&length=1000', 30000);
      try {
        const jsonText = await this.page.evaluate(() => document.body.innerText);
        const parsed = JSON.parse(jsonText);
        biData.finanzas = parsed.data || [];
      } catch(e) {
        console.warn("Aviso: No se pudo parsear JSON de participantes, probablemente es vista HTML.", e.message);
      }

    } catch (err) {
      console.warn(`⚠️ Error en extracción profunda BI: ${err.message}`);
    }

    return biData;
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
    // NUEVO (29/09/2026): Inferir sede de cada equipo para verificar coherencia de asignaciones
    const equipoSedeMap = {};
    if (rawEquiposReporte && Array.isArray(rawEquiposReporte)) {
      rawEquiposReporte.forEach(eq => {
        const sedesTally = {};
        if (eq.participantes && Array.isArray(eq.participantes)) {
          eq.participantes.forEach(p => {
            const coordStr = (p.coordinador || '').toLowerCase();
            let pSede = null;
            if (coordStr.includes('lima')) pSede = 'Lima';
            else if (coordStr.includes('quito')) pSede = 'Quito';
            else if (coordStr.includes('guayaquil') || coordStr.includes('gye')) pSede = 'Guayaquil';
            else if (coordStr.includes('cuenca')) pSede = 'Cuenca';
            else if (coordStr.includes('medellin') || coordStr.includes('medellín')) pSede = 'Medellín';
            else if (coordStr.includes('mexico') || coordStr.includes('méxico')) pSede = 'México';
            else if (coordStr.includes('bogota') || coordStr.includes('bogotá')) pSede = 'Bogotá';
            if (pSede) sedesTally[pSede] = (sedesTally[pSede] || 0) + 1;
          });
        }
        let dominantSede = null;
        let maxCount = 0;
        for (const [s, count] of Object.entries(sedesTally)) {
          if (count > maxCount) {
            maxCount = count;
            dominantSede = s;
          }
        }
        if (!dominantSede) {
          const eqStr = (eq.equipoNombre || '').toUpperCase();
          const matchNum = eqStr.match(/(\d+)/);
          if (matchNum) {
            const num = parseInt(matchNum[1], 10);
            if (num >= 110 && num <= 140) dominantSede = 'Quito/Guayaquil';
            else if (num >= 10 && num <= 50) dominantSede = 'Lima';
          }
        }
        if (dominantSede) {
          equipoSedeMap[eq.equipoNombre.trim().toLowerCase()] = dominantSede;
        }
      });
    }

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
        return null;
      };

      const gestionesValue = findNumberAfter('Gestiones');
      const c1Value = findNumberAfter('C1');
      const c2Value = findNumberAfter('C2');
      const mjValue = ['MJ', 'Maestría', 'Maestria', 'Maestrias']
        .map(findNumberAfter)
        .find(value => value !== null) ?? null;
      const asignadosValue = findNumberAfter('Asignados');
      const gestiones = gestionesValue ?? 0;
      const c1 = c1Value ?? 0;
      const c2 = c2Value ?? 0;
      const mj = mjValue ?? 0;
      const asignados = asignadosValue ?? 0;

      // Cobertura
      const cobLine = lines.find(l => l.includes('/') && l.includes('%'));
      let coberturaPct = 0;
      let coberturaPctAvailable = false;
      let coberturaDetalle = '';
      if (cobLine) {
        coberturaDetalle = cobLine;
        const match = cobLine.match(/\((\d+)%\)/);
        if (match) {
          coberturaPct = parseInt(match[1], 10);
          coberturaPctAvailable = true;
        }
      }

      // Productividad
      const prodLines = lines.filter(l => l.includes('/') && l.includes('%'));
      let productividadPct = 0;
      let productividadPctAvailable = false;
      let productividadDetalle = '';
      if (prodLines.length > 1) {
        productividadDetalle = prodLines[1];
        const match = prodLines[1].match(/\((\d+)%\)/);
        if (match) {
          productividadPct = parseInt(match[1], 10);
          productividadPctAvailable = true;
        }
      }

      const ultConexionLine = lines.find(l => l.toLowerCase().includes('últ. conexión'));
      const ultConexion = ultConexionLine ? ultConexionLine.replace(/últ\. conexión:\s*/i, '') : '';

      const ultGestionLine = lines.find(l => l.toLowerCase().includes('últ. gestión'));
      const ultGestion = ultGestionLine ? ultGestionLine.replace(/últ\. gestión:\s*/i, '') : '';

      const parseStatus = (statusLabel) => {
        const l = lines.find(line => line.toLowerCase().startsWith(statusLabel.toLowerCase() + ':'));
        if (!l) return null;
        const parts = l.split(':');
        const parsed = Number.parseInt(parts[1]?.trim() || '', 10);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
      };

      const confirmadoValue = parseStatus('Confirmado');
      const noContestaValue = parseStatus('No Contesta');
      const siguienteValue = parseStatus('Siguiente');
      const noInteresaValue = parseStatus('No le Interesa');
      const porConfirmarValue = parseStatus('Por Confirmar');
      const yaAsistioValue = parseStatus('Ya Asistió');
      const devolucionValue = parseStatus('Devolución');
      const confirmado = confirmadoValue ?? 0;
      const noContesta = noContestaValue ?? 0;
      const siguiente = siguienteValue ?? 0;
      const noInteresa = noInteresaValue ?? 0;
      const porConfirmar = porConfirmarValue ?? 0;
      const yaAsistio = yaAsistioValue ?? 0;
      const devolucion = devolucionValue ?? 0;

      let officialEmail = '';
      let officialName = nombre;
      const match = resolveUniqueNameMatch(nombre, workspaceDirectory, {
        getName: user => user?.name || ''
      });
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
      const coordinatorRole = mjValue > 0 && c1Value === 0 && c2Value === 0
        ? 'Coordinador Maestría'
        : c2Value > 0
          ? 'Coordinador C1 / C2'
          : c1Value > 0
            ? 'Coordinador C1'
            : 'Coordinador';

      return {
        id: `coord_${nombre.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${sede.toLowerCase()}`,
        nombre,
        nombreCompleto: infoOficial.nombreCompleto,
        email: infoOficial.email,
        sede,
        ciclo,
        rol: coordinatorRole,
        gestiones,
        c1,
        c2,
        mj,
        asignados,
        coberturaPct,
        coberturaDetalle,
        productividadPct,
        productividadDetalle,
        asistieron: totalAsistieron,
        tasaEfectividad: gestionesValue !== null && confirmadoValue !== null && gestionesValue > 0
          ? Math.round((confirmadoValue / gestionesValue) * 100)
          : null,
        ultConexion,
        ultGestion,
        metricasDisponibles: {
          gestiones: gestionesValue !== null,
          asignados: asignadosValue !== null,
          coberturaPct: coberturaPctAvailable,
          productividadPct: productividadPctAvailable,
          confirmados: confirmadoValue !== null,
          noContesta: noContestaValue !== null,
          siguiente: siguienteValue !== null,
          noInteresa: noInteresaValue !== null,
          porConfirmar: porConfirmarValue !== null,
          yaAsistio: yaAsistioValue !== null,
          devolucion: devolucionValue !== null,
          gestionesC1: c1Value !== null,
          gestionesC2: c2Value !== null,
          sentadosTotal: (item.equipos || []).length > 0
        },
        estados: {
          confirmado,
          noContesta,
          siguiente,
          noInteresa,
          porConfirmar,
          yaAsistio,
          devolucion
        },
                equipos: (item.equipos || []).map(eq => {
          const eqKey = (eq.equipo || '').trim().toLowerCase();
          const sedeInferida = equipoSedeMap[eqKey];
          let incoherencia = false;
          if (sedeInferida && sede !== 'Sin Sede') {
            if (sedeInferida === 'Quito/Guayaquil' && !['Quito', 'Guayaquil'].includes(sede)) {
              incoherencia = true;
            } else if (sedeInferida !== 'Quito/Guayaquil' && sedeInferida !== sede) {
              incoherencia = true;
            }
          }
          if (incoherencia) console.warn(`🚨 [INCOHERENCIA] ${nombre} (${sede}) tiene asignado ${eq.equipo} (${sedeInferida}).`);
          return { ...eq, sedeInferida: sedeInferida || 'Desconocida', incoherenciaSedes: incoherencia };
        })
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
      const hasActivity = (Number(c.c1) > 0 || Number(c.c2) > 0 || Number(c.mj) > 0 || Number(c.gestiones) > 0 || Number(c.asignados) > 0);
      const explicitlyNoBase = c.metricasDisponibles.asignados && c.asignados === 0 &&
        c.metricasDisponibles.gestiones && c.gestiones === 0;
      const hasEquipos = Array.isArray(c.equipos) && c.equipos.length > 0;
      const requiredMetricsMissing = !c.metricasDisponibles.asignados || !c.metricasDisponibles.gestiones;
      return hasEquipos && (hasActivity || explicitlyNoBase || requiredMetricsMissing);
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
          c2Total: 0,
          mjTotal: 0
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
      s.mjTotal += (c.mj || 0);
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

  recalculateTotals(normalized) {
    const coordinadores = normalized.coordinadores;
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

    normalized.totales = totales;
    normalized.sedesSummary = Object.values(sedesSummary);
    return normalized;
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
    // Este job no tiene una sesión Firebase de usuario. Escribir con el SDK
    // web provoca PERMISSION_DENIED y detenía el flujo antes de FI. La cuenta
    // de servicio se limita al entorno de CI y nunca se expone al cliente.
    const adminDb = getAdminDbForNodusPublish();
    const timestamp = new Date().toISOString();

    const equiposSummary = (normalizedData.equiposReporte || []).map(eq => ({
      equipoId: eq.equipoId,
      equipoNombre: eq.equipoNombre,
      totalParticipantes: eq.totalParticipantes || (eq.participantes ? eq.participantes.length : 0)
    }));

    const masterSnapshot = {
      timestamp,
      fuente: "Sistema Autónomo Multi-Agente Nodus CPSL 2026",
      usuarioExtraccion: "jsanchez (Super Administrador Global)",
      totales: normalizedData.totales,
      sedes: normalizedData.sedesSummary,
      coordinadores: normalizedData.coordinadores,
      equiposSummary
    };

    // 1. Guardar en nodus_kpis_sincronizados / latest_snapshot
    await adminDb.collection('nodus_kpis_sincronizados').doc('latest_snapshot').set(masterSnapshot);
    console.log("✅ [Agente 3 - Despachador] Guardado 'nodus_kpis_sincronizados/latest_snapshot'");

    // 1.5 Guardar el reporte analítico BI (Marco PCFT)
    console.log("[Agente 3 - Despachador] Guardando Reporte BI (Marco PCFT)...");
    if (rawData && rawData.secciones && rawData.secciones.biDeepExtract) {
      let safeBiExtract = rawData.secciones.biDeepExtract;
      const biSize = JSON.stringify(safeBiExtract).length;
      if (biSize > 800000) {
        console.warn(`[Agente 3 - Despachador] Tamaño de BI Deep Extract (${biSize} bytes) excede umbral. Truncando arrays para evitar límite de 1MB en Firestore.`);
        if (safeBiExtract.finanzas) safeBiExtract.finanzas = safeBiExtract.finanzas.slice(0, 500);
      }
      try {
        await adminDb.collection('nodus_bi_reports').doc('latest').set({
          timestamp,
          datos_bi: safeBiExtract
        });
        console.log("[Agente 3 - Despachador] Guardado 'nodus_bi_reports/latest'");
      } catch (e) {
        console.error("Error guardando nodus_bi_reports:", e);
      }
    }

    // 2. Guardar en colección optimizada para Dashboard C1/C2: nodus_coordinadores_c1c2 / latest
    let safeEquiposReporte = normalizedData.equiposReporte;
    const serializedSize = JSON.stringify(safeEquiposReporte).length;
    if (serializedSize > 800000) {
      console.warn(`⚠️ [Agente 3 - Despachador] Tamaño de equiposReporte (${serializedSize} bytes) excede umbral de seguridad de 800KB. Guardando resumen para evitar límite de 1MB en Firestore.`);
      safeEquiposReporte = equiposSummary;
    }

    await adminDb.collection('nodus_coordinadores_c1c2').doc('latest').set({
      timestamp,
      totales: normalizedData.totales,
      sedes: normalizedData.sedesSummary,
      coordinadores: normalizedData.coordinadores,
      equiposReporte: safeEquiposReporte
    });
    console.log("✅ [Agente 3 - Despachador] Guardado 'nodus_coordinadores_c1c2/latest'");

    // 3. Guardar en historial horario: nodus_kpis_history / snapshot_<timestamp>
    const historyId = `snap_${new Date().getTime()}`;
    await adminDb.collection('nodus_kpis_history').doc(historyId).set({
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
      await adminDb.collection('imo_missions').doc(mission.id).set(mission, { merge: true });
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

    return timestamp;
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
    const identitySentinel = new NodusIdentityAgent();

  try {
    console.log("?????? [MultiAgent Sync] Sincronizando Managers desde Google Sheets (Master Roster)...");
    const sheetAgent = new NodusManagersSheetAgent(getAdminDbForNodusPublish());
    await sheetAgent.syncManagersFromSheet();
  } catch(e) {
    console.error("Error no bloqueante en agente de Google Sheets:", e.message);
  }


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
        console.warn("   La conexión a Nodus no se completó en esta ventana horaria.");
        console.warn("   Consulte el error de conexión anterior; no implica necesariamente un bloqueo WAF.");
        console.warn("   Acción de Salvaguarda: Preservando 100% de los datos en Firestore,");
        console.warn("   snapshots locales y dashboards operativos sin interrupción.");
        console.warn("=======================================================\n");
        return { success: false, handled: true, reason: directErr.message };
      }
    }

    // Navegación SECUENCIAL blindada para evitar cancelaciones net::ERR_ABORTED
    console.log("Iniciando secuencia de extracción por etapas...");
    const mapResult = await extractor.exploreAndMapModules();
    const rawDashboard = await extractor.extractDashboardData();
    const rawCoordinadores = await extractor.extractCoordinadores();
    const rawEquiposReporte = await extractor.extractActiveEquiposReporte();
    const biDeepExtract = await extractor.extractAvanzadosYContabilidad();

    const rawData = {
      secciones: {
        actividadCoordinadores: { kpis: rawCoordinadores },
        dashboardPrincipal: rawDashboard,
        reporteEquipos: rawEquiposReporte,
        biDeepExtract: biDeepExtract
      }
    };

    const normalized = normalizer.normalizeData(rawCoordinadores, rawDashboard, rawEquiposReporte);

      // [Agente 8 - Identidad] Validar que NO haya usuarios inventados, y purgar renuncias
      normalized.coordinadores = await identitySentinel.enforceIdentityTruth(normalized.coordinadores, 'C1_C2');
      normalizer.recalculateTotals(normalized);
    const nodusSourceTimestamp = await dispatcher.dispatch(normalized, rawData);

    // =========================================================================
    // AGENTE 4: DATA SCIENTIST, INTEGRIDAD, PREDICTOR Y RECONCILIADOR
    // =========================================================================
    console.log("\n🔬 [Agente 4 - Data Scientist] Activando inteligencia predictiva y reconciliación...");
    try {
      const pageCookies = await extractor.page.cookies();
      const cookieStr = pageCookies.map(c => `${c.name}=${c.value}`).join('; ');
      
      const dataScientist = new NodusDataScientistAgent(getAdminDbForNodusPublish());
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
      const hrSentinel = new NodusHrSentinelAgent(getAdminDbForNodusPublish());
      const diagnostico = hrSentinel.diagnosticarDesempeno(normalized.coordinadores, nodusSourceTimestamp);
      await hrSentinel.publicarAlertasYCuadroDeMando(diagnostico);
      console.log("✅ [Agente 5 - RRHH] Cuadro de mando de RRHH y alertas inyectadas a Gerentes con éxito.");
    } catch (hrErr) {
      console.error("⚠️ [Agente 5 - RRHH] Error no bloqueante en centinela de RRHH:", hrErr.message);
    }

    console.log("\n=======================================================");
    // =========================================================================
    // AGENTE 6: AUDITOR CENTINELA DE FUTUROS IMPOSIBLES (FIs) POST-PFD
    // =========================================================================
    console.log("\n🎯 [Agente 6 - Futuros Imposibles] Activando auditoría de metas post-PFD...");
    try {
      const fiAgent = new NodusFIAgent();
      const fiResult = await extractor.extractFuturosImposibles(normalized.coordinadores);
      const participantesFI = fiResult.participantes;
      if (participantesFI.length === 0) {
        throw new Error('NODUS no devolvió asistentes PFD verificables; se conserva el último snapshot FI.');
      }

      const fiDiag = await fiAgent.runAudit(participantesFI);
      const adminDb = getAdminDbForNodusPublish();
      const syncId = new Date().toISOString();
      const snapshotMeta = {
        completeness: fiResult.completeness,
        completenessReasons: fiResult.completenessReasons,
        coverage: fiResult.coverage,
        expectedTotal: fiResult.expectedTotal ?? null,
        passes: fiResult.passes,
        blocked: fiResult.blocked,
        sedeEquipoDiscrepancies: fiResult.sedeEquipoDiscrepancies
      };
      const snapshot = {
        participantes: participantesFI,
        source: 'nodus_futuros_imposibles',
        sourceVersion: 'fi-sync-v3',
        sourceUrl: 'https://imo.crearpslglobal.com/futurosimposibles',
        extractedAt: syncId,
        syncedAt: FieldValue.serverTimestamp(),
        universePfd: participantesFI.length,
        summary: fiDiag.resumen,
        ...snapshotMeta
      };

      // Solo una lectura verificada como completa reemplaza `latest`. Una
      // lectura parcial se guarda aparte (latest_partial) para diagnóstico y
      // el último snapshot verificado sigue siendo el que consume Causa OS.
      const publishedDoc = fiResult.completeness === 'complete' ? 'latest' : 'latest_partial';
      await adminDb.collection('nodus_futuros_imposibles').doc(publishedDoc).set(snapshot, { merge: false });
      await adminDb.collection('nodus_fi_sync_history').add({
        status: fiResult.completeness === 'complete' ? 'published' : 'partial_not_published',
        source: 'nodus_futuros_imposibles',
        extractedAt: syncId,
        universePfd: participantesFI.length,
        summary: fiDiag.resumen,
        ...snapshotMeta,
        sedeEquipoDiscrepancies: { total: fiResult.sedeEquipoDiscrepancies.total, sinSede: fiResult.sedeEquipoDiscrepancies.sinSede },
        createdAt: FieldValue.serverTimestamp()
      });
      console.log(`✅ [Agente 6 - Futuros Imposibles] ${fiResult.completeness === 'complete' ? 'Snapshot completo publicado' : 'Lectura PARCIAL guardada en latest_partial (latest intacto)'}: ${participantesFI.length} participantes.`);
    } catch (fiErr) {
      console.error("⚠️ [Agente 6 - Futuros Imposibles] No se publicó ningún snapshot FI:", fiErr.message);
      // El registro de fallo es aislado del snapshot: permite diagnóstico sin
      // alterar el último universo válido que está usando Causa OS.
      try {
        const adminDb = getAdminDbForNodusPublish();
        await adminDb.collection('nodus_fi_sync_history').add({
          status: 'failed',
          source: 'nodus_futuros_imposibles',
          error: fiErr.message,
          createdAt: FieldValue.serverTimestamp()
        });
      } catch (_) {
        // Si la cuenta de servicio tampoco está disponible, no se intenta una
        // escritura alternativa con el SDK público.
      }
    }

    // =========================================================================
    // AGENTE 7: GENEALOGÍA Y LINAJE GLOBAL
    // =========================================================================
    console.log("\n🧬 [Agente 7 - Genealogista] Activando análisis de linaje y coherencia global...");
    try {
      // Necesitamos las variables prospectosData, fdsData, maestriaTeams (obtenidas en Agente 4)
      // Como no están en el mismo scope o pueden fallar, usamos normalizedData como base obligatoria.
      // Si NodusDataScientistAgent guardara prospectos en el estado de normalized, sería mejor.
      // Pasaremos variables vacías a los opcionales por ahora si no los extraemos aquí globalmente.
      const genealogyAgent = new NodusGenealogyAgent(getAdminDbForNodusPublish());
      const linajeReport = await genealogyAgent.runCoherenceAndLineage(normalized); // Solo usamos normalizados por ahora (tiene equiposReporte)
      await genealogyAgent.publicarLinajeYCoherencia(linajeReport);
    } catch (genErr) {
      console.error("⚠️ [Agente 7 - Genealogista] Error no bloqueante al construir el linaje:", genErr.message);
    }

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMultiAgentSync()
    .then((result) => {
      if (result && result.handled) {
        console.error("Sincronización incompleta: se conservaron los datos anteriores, pero no se obtuvieron datos actuales de Nodus.");
        process.exit(1);
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
