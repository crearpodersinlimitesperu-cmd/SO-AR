import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Parse CLI arguments
const args = process.argv.slice(2);
function getArg(key, def) {
  const prefix = `--${key}=`;
  const found = args.find(a => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : def;
}

const programa = getArg('programa', 'MAESTRÍA EN CREACIÓN');
const subtitulo = getArg('subtitulo', 'GIRA INTERNACIONAL');
const outputPath = path.resolve(process.cwd(), getArg('output', path.join(ROOT_DIR, 'public', 'flyer_generado.png')));

// Sedes por defecto con fechas oficiales actualizadas
const SVG_FLAGS = {
  EC: `<svg viewBox="0 0 32 32" width="40" height="40" style="border-radius:50%;overflow:hidden;border:1.5px solid rgba(255,215,0,0.6);box-shadow:0 0 12px rgba(0,0,0,0.6);"><rect width="32" height="16" fill="#FFDD00"/><rect y="16" width="32" height="8" fill="#034EA2"/><rect y="24" width="32" height="8" fill="#ED1C24"/><circle cx="16" cy="18" r="3.5" fill="#C59B27"/></svg>`,
  PE: `<svg viewBox="0 0 32 32" width="40" height="40" style="border-radius:50%;overflow:hidden;border:1.5px solid rgba(255,215,0,0.6);box-shadow:0 0 12px rgba(0,0,0,0.6);"><rect width="10.66" height="32" fill="#D91023"/><rect x="10.66" width="10.68" height="32" fill="#FFFFFF"/><rect x="21.34" width="10.66" height="32" fill="#D91023"/></svg>`,
  CO: `<svg viewBox="0 0 32 32" width="40" height="40" style="border-radius:50%;overflow:hidden;border:1.5px solid rgba(255,215,0,0.6);box-shadow:0 0 12px rgba(0,0,0,0.6);"><rect width="32" height="16" fill="#FCD116"/><rect y="16" width="32" height="8" fill="#003893"/><rect y="24" width="32" height="8" fill="#CE1126"/></svg>`,
  MX: `<svg viewBox="0 0 32 32" width="40" height="40" style="border-radius:50%;overflow:hidden;border:1.5px solid rgba(255,215,0,0.6);box-shadow:0 0 12px rgba(0,0,0,0.6);"><rect width="10.66" height="32" fill="#006847"/><rect x="10.66" width="10.68" height="32" fill="#FFFFFF"/><rect x="21.34" width="10.66" height="32" fill="#CE1126"/><circle cx="16" cy="16" r="3" fill="#8B5A2B"/></svg>`
};

const sedesDefault = [
  { ciudad: 'LIMA', pais: 'Perú', codigo: 'PE', fechas: '04 - 06 SEPTIEMBRE', activo: true },
  { ciudad: 'QUITO', pais: 'Ecuador', codigo: 'EC', fechas: '11 - 13 SEPTIEMBRE', activo: true },
  { ciudad: 'MÉXICO', pais: 'México', codigo: 'MX', fechas: '18 - 20 SEPTIEMBRE', activo: true },
  { ciudad: 'GUAYAQUIL', pais: 'Ecuador', codigo: 'EC', fechas: '25 - 27 SEPTIEMBRE', activo: true },
  { ciudad: 'CUENCA', pais: 'Ecuador', codigo: 'EC', fechas: '02 - 04 OCTUBRE', activo: true },
  { ciudad: 'MEDELLÍN', pais: 'Colombia', codigo: 'CO', fechas: '09 - 11 OCTUBRE', activo: true }
];

async function obtenerFechasDesdeAPI() {
  const url = 'https://script.google.com/macros/s/AKfycbxSZFhddMYyspZpkW-qPHEi8hycLGfnhFeCPSYc4VbckWIeiiZAbxyJY71XRb2-Ya4U/exec?action=getEventos';
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const text = await res.text();
    if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) return null;
    const json = JSON.parse(text);
    const eventos = Array.isArray(json) ? json : (json.data || []);
    return eventos;
  } catch (err) {
    console.warn('[Bot Flyer] No se pudo conectar a la API externa de calendario, usando fechas de radar local:', err.message);
    return null;
  }
}

async function generarFlyer() {
  console.log('----------------------------------------------------');
  console.log('🤖 BOT GENERADOR DE FLYERS - CAUSA OS / CREAR PSL');
  console.log(`📌 Programa: ${programa}`);
  console.log(`📁 Salida: ${outputPath}`);
  console.log('----------------------------------------------------');

  // Buscar assets
  const bgPath = path.join(ROOT_DIR, 'public', 'flyer_earth_bg.png');
  const logoPath = path.join(ROOT_DIR, 'public', 'logo_crear_blanco.png');

  if (!fs.existsSync(bgPath)) {
    throw new Error(`No se encontró el fondo requerido en: ${bgPath}`);
  }
  if (!fs.existsSync(logoPath)) {
    throw new Error(`No se encontró el logo oficial en: ${logoPath}`);
  }

  const bgBase64 = `data:image/png;base64,${fs.readFileSync(bgPath).toString('base64')}`;
  const logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;

  const sedes = sedesDefault;

  // Renderizar HTML exacto a 1080 x 1920 (Instagram Story / Flyer vertical)
  const sedesHTML = sedes.map((s, idx) => `
    <div class="sede-row" style="animation-delay: ${0.1 * idx}s">
      <div class="sede-left">
        <div class="flag-icon">${SVG_FLAGS[s.codigo] || ""}</div>
        <div class="sede-info">
          <span class="city-name">${s.ciudad}</span>
          <span class="country-name">${s.pais}</span>
        </div>
      </div>
      <div class="date-badge">
        <span class="date-text">${s.fechas}</span>
      </div>
    </div>
  `).join('');

  const htmlContent = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <title>Flyer Fechas CREAR PSL</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,600;0,700;0,800;0,900;1,900&display=swap" rel="stylesheet">
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        width: 1080px;
        height: 1920px;
        overflow: hidden;
        position: relative;
        font-family: 'Montserrat', sans-serif;
        background-color: #030712;
        color: #ffffff;
      }
      .bg-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 1080px;
        height: 1920px;
        background-image: url('${bgBase64}');
        background-size: cover;
        background-position: center bottom;
        z-index: 1;
      }
      .overlay-gradient {
        position: absolute;
        top: 0;
        left: 0;
        width: 1080px;
        height: 1920px;
        background: radial-gradient(circle at 50% 15%, rgba(13, 27, 42, 0.4) 0%, rgba(3, 7, 18, 0.75) 60%, rgba(3, 7, 18, 0.95) 100%);
        z-index: 2;
      }
      .content {
        position: relative;
        z-index: 3;
        width: 1080px;
        height: 1920px;
        padding: 85px 75px 80px 75px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      
      /* TOP FLAGS */
      .top-flags {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 24px;
        margin-bottom: 24px;
      }
      .flag-round {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26px;
        background: rgba(255, 255, 255, 0.08);
        border: 1.5px solid rgba(255, 215, 0, 0.4);
        box-shadow: 0 0 15px rgba(255, 183, 3, 0.25);
      }

      /* LOGO */
      .header-logo {
        text-align: center;
        margin-bottom: 20px;
      }
      .header-logo img {
        height: 110px;
        object-fit: contain;
        filter: drop-shadow(0 0 25px rgba(255, 215, 0, 0.4));
      }

      /* TITLES */
      .header-titles {
        text-align: center;
        margin-bottom: 40px;
      }
      .main-brand-title {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: 0.35em;
        text-transform: uppercase;
        color: #f59e0b;
        margin-bottom: 12px;
        text-shadow: 0 0 12px rgba(245, 158, 11, 0.5);
      }
      .program-title {
        font-size: 52px;
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        line-height: 1.1;
        background: linear-gradient(135deg, #ffffff 20%, #fef08a 60%, #eab308 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
        margin-bottom: 14px;
      }
      .subtitle-pill {
        display: inline-block;
        padding: 8px 30px;
        border-radius: 999px;
        background: rgba(255, 183, 3, 0.12);
        border: 1px solid rgba(255, 183, 3, 0.4);
        color: #fbbf24;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 0.25em;
        text-transform: uppercase;
        box-shadow: 0 0 20px rgba(245, 158, 11, 0.2);
      }

      /* SEDES LIST */
      .sedes-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin: 20px 0 auto 0;
      }
      .sede-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px 34px;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1.5px solid rgba(255, 215, 0, 0.25);
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.03);
      }
      .sede-left {
        display: flex;
        align-items: center;
        gap: 22px;
      }
      .flag-icon {
        font-size: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
      }
      .sede-info {
        display: flex;
        flex-direction: column;
      }
      .city-name {
        font-size: 32px;
        font-weight: 900;
        letter-spacing: 0.08em;
        color: #ffffff;
        text-transform: uppercase;
        line-height: 1.1;
      }
      .country-name {
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.15em;
        color: #94a3b8;
        text-transform: uppercase;
        margin-top: 2px;
      }
      .date-badge {
        padding: 12px 24px;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.35));
        border: 1px solid rgba(245, 158, 11, 0.6);
        border-radius: 14px;
        box-shadow: 0 0 20px rgba(245, 158, 11, 0.25);
      }
      .date-text {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.06em;
        color: #fbbf24;
        text-transform: uppercase;
        white-space: nowrap;
      }

      /* FOOTER */
      .footer {
        text-align: center;
        margin-top: 30px;
      }
      .hashtag {
        font-size: 40px;
        font-weight: 900;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: #ffffff;
        text-shadow: 0 0 25px rgba(255, 255, 255, 0.6), 0 0 40px rgba(245, 158, 11, 0.4);
        margin-bottom: 12px;
        font-style: italic;
      }
      .contact-row {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 20px;
        font-size: 16px;
        font-weight: 600;
        letter-spacing: 0.15em;
        color: #cbd5e1;
        text-transform: uppercase;
      }
      .contact-bullet {
        color: #f59e0b;
        font-size: 18px;
      }
      .web-link {
        color: #38bdf8;
        font-weight: 700;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="bg-container"></div>
    <div class="overlay-gradient"></div>
    <div class="content">
      
      <!-- TOP SECTION -->
      <div>
        <div class="top-flags">
          <div>${SVG_FLAGS.EC}</div>
          <div>${SVG_FLAGS.PE}</div>
          <div>${SVG_FLAGS.CO}</div>
          <div>${SVG_FLAGS.MX}</div>
        </div>

        <div class="header-logo">
          <img src="${logoBase64}" alt="CREAR PODER SIN LÍMITES" />
        </div>

        <div class="header-titles">
          <p class="main-brand-title">CREAR PODER SIN LÍMITES</p>
          <h1 class="program-title">${programa}</h1>
          <div class="subtitle-pill">${subtitulo}</div>
        </div>
      </div>

      <!-- SEDES LIST -->
      <div class="sedes-container">
        ${sedesHTML}
      </div>

      <!-- FOOTER SECTION -->
      <div class="footer">
        <p class="hashtag">#SOYCREADOR</p>
        <div class="contact-row">
          <span class="web-link">CREARPSL.COM</span>
          <span class="contact-bullet">&bull;</span>
          <span>WHATSAPP: +51 981 237 577</span>
        </div>
      </div>

    </div>
  </body>
  </html>
  `;

  console.log('🚀 Lanzando Puppeteer en modo headless...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  // Asegurar que el directorio de salida existe
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('📸 Renderizando flyer 1080x1920 a alta resolución...');
  await page.screenshot({ path: outputPath, type: 'png' });
  await browser.close();

  const stats = fs.statSync(outputPath);
  console.log('✅ ¡FLYER GENERADO CON ÉXITO!');
  console.log(`📊 Tamaño del archivo: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`📍 Archivo guardado en: ${outputPath}`);
}

generarFlyer().catch(err => {
  console.error('❌ Error generando el flyer:', err);
  process.exit(1);
});
