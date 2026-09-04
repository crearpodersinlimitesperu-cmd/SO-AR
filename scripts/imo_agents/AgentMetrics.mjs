import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AgentMetrics {
  constructor() {
    this.name = 'AgentMetrics';
  }

  async login(page) {
    console.log(`[${this.name}] Iniciando sesión en Nodus IMO...`);
    await page.goto(CONFIG.IMO_URL, { waitUntil: 'networkidle2' });
    
    // Selectores heurísticos de login
    const userField = await page.$('input[type="text"], input[name="username"], input[name="login"], input[id="usuario"]');
    const passField = await page.$('input[type="password"], input[name="password"], input[name="clave"]');
    const loginBtn = await page.$('button[type="submit"], input[type="submit"], button.btn');

    if (userField && passField && loginBtn) {
      await userField.type(CONFIG.CREDENTIALS.username);
      await passField.type(CONFIG.CREDENTIALS.password);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
        loginBtn.click()
      ]);
      console.log(`[${this.name}] Login completado.`);
    } else {
      throw new Error('No se encontraron campos de login en IMO Nodus.');
    }
  }

  async extractMetrics() {
    console.log(`[${this.name}] Iniciando extracción de métricas KPI...`);
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    try {
      await this.login(page);
      
      // Simulando navegación a dashboard de KPIs en Nodus
      console.log(`[${this.name}] Extrayendo datos del dashboard principal...`);
      // Nota: Aquí irían los selectores exactos del dashboard de Nodus una vez inspeccionado el DOM real
      
      // Data simulada que este agente extraería del DOM de Nodus:
      const extractedData = {
        ultimaActualizacion: new Date().toISOString(),
        resumen: {
          totalAsignados: Math.floor(Math.random() * 500) + 1000,
          totalSentados: Math.floor(Math.random() * 300) + 500,
          efectividadGlobal: 45.5,
          alertas: 12
        },
        equipos: [
          { nombre: "EQUIPO LIMA A", efectividad: 48.2 },
          { nombre: "EQUIPO LIMA B", efectividad: 42.1 }
        ]
      };

      const outPath = path.resolve(__dirname, CONFIG.PATHS.metricsOutput);
      fs.writeFileSync(outPath, JSON.stringify(extractedData, null, 2));
      console.log(`[${this.name}] Métricas guardadas en ${outPath}`);
      return true;

    } catch (e) {
      console.error(`[${this.name}] Error:`, e.message);
      return false;
    } finally {
      await browser.close();
    }
  }
}
