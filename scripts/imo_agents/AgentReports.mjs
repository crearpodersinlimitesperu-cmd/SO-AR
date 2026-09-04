import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AgentReports {
  constructor() {
    this.name = 'AgentReports';
  }

  async login(page) {
    console.log(`[${this.name}] Iniciando sesión en Nodus IMO...`);
    await page.goto(CONFIG.IMO_URL, { waitUntil: 'networkidle2' });
    
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
    } else {
      throw new Error('No se encontraron campos de login.');
    }
  }

  async extractReports() {
    console.log(`[${this.name}] Iniciando búsqueda y descarga de reportes...`);
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    try {
      await this.login(page);
      
      // Simulando navegación a la sección de reportes
      console.log(`[${this.name}] Navegando al módulo de Reportes Consolidados...`);
      
      const reportsDir = path.resolve(__dirname, CONFIG.PATHS.reportsDir);
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Simulando la interceptación de tablas de reportes y conversión a CSV/JSON
      const reportName = `reporte_consolidado_${Date.now()}.json`;
      const outPath = path.join(reportsDir, reportName);
      
      const dummyReport = [
        { coordinador: 'Diana M.', equipo: 'EQUIPO 27', etapa: 'C1', asignados: 178 },
        { coordinador: 'Joyce M.', equipo: 'EQUIPO 28', etapa: 'C1', asignados: 111 }
      ];

      fs.writeFileSync(outPath, JSON.stringify(dummyReport, null, 2));
      console.log(`[${this.name}] Reporte exportado exitosamente: ${outPath}`);
      return true;

    } catch (e) {
      console.error(`[${this.name}] Error:`, e.message);
      return false;
    } finally {
      await browser.close();
    }
  }
}
