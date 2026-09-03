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

const programa = getArg('programa', 'CAPÍTULO UNO');
const outline = getArg('outline', programa.replace(/CAPÍTULO\s*/i, '').trim() || 'UNO');
const eyebrow = getArg('eyebrow', 'FECHAS');
const hashtag = getArg('hashtag', '#SOYCREADOR');
const outputPath = path.resolve(process.cwd(), getArg('output', path.join(ROOT_DIR, 'public', 'flyer_generado.png')));

// Sedes por defecto exactas al flyer oficial original
let sedes = [
  { ciudad: 'México', fechas: '18, 19 y 20 de septiembre' },
  { ciudad: 'Lima', fechas: '18, 19 y 20 de septiembre' },
  { ciudad: 'Quito', fechas: '25, 26 y 27 de septiembre' },
  { ciudad: 'Guayaquil', fechas: '9, 10 y 11 de octubre' },
  { ciudad: 'Cuenca', fechas: '16, 17 y 18 de octubre' },
  { ciudad: 'Medellín', fechas: '16, 17 y 18 de octubre' }
];

const sedesArg = getArg('fechas', null);
if (sedesArg) {
  try {
    sedes = JSON.parse(sedesArg);
  } catch (e) {
    console.warn('No se pudo parsear el argumento --fechas como JSON, usando sedes por defecto.');
  }
}

function toBase64(filePath, mime = 'image/png') {
  const buf = fs.readFileSync(filePath);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

const bgPath = path.join(ROOT_DIR, 'public', 'flyer_earth_bg_1080.png');
const logoPath = path.join(ROOT_DIR, 'public', 'logo_crear_blanco.png');
const flagsPath = path.join(ROOT_DIR, 'public', 'flags_badges_hd.png');

const bgDataUri = toBase64(bgPath);
const logoDataUri = toBase64(logoPath);
const flagsDataUri = toBase64(flagsPath);

// Generar bloques de sedes
const sedesHtml = sedes.map(s => `
  <div class="city-block">
    <div class="city-name">${s.ciudad}</div>
    <div class="city-dates">${s.fechas}</div>
  </div>
`).join('');

const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 1080px;
      height: 1920px;
      margin: 0;
      padding: 0;
      background-color: #010308;
      background-image: url('${bgDataUri}');
      background-size: 1080px 1920px;
      background-repeat: no-repeat;
      background-position: center bottom;
      font-family: 'Montserrat', sans-serif;
      color: #ffffff;
      overflow: hidden;
      position: relative;
    }

    /* TOP LOGO OFICIAL */
    .logo-container {
      position: absolute;
      top: 90px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
    }
    .logo-img {
      width: 190px;
      height: auto;
      object-fit: contain;
    }

    /* FECHAS EYEBROW */
    .fechas-eyebrow {
      position: absolute;
      top: 440px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 22px;
      font-weight: 300;
      letter-spacing: 0.42em;
      padding-left: 0.42em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.82);
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    }

    /* TITULO DEL CAPITULO / PROGRAMA + WATERMARK */
    .headline-container {
      position: absolute;
      top: 515px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 150px;
    }
    .outline-watermark {
      position: absolute;
      font-size: 168px;
      font-weight: 800;
      letter-spacing: 0.18em;
      padding-left: 0.18em;
      color: transparent;
      -webkit-text-stroke: 1.2px rgba(255, 255, 255, 0.12);
      user-select: none;
      pointer-events: none;
      white-space: nowrap;
    }
    .main-title {
      position: relative;
      font-size: 49px;
      font-weight: 800;
      letter-spacing: 0.20em;
      padding-left: 0.20em;
      text-transform: uppercase;
      color: #ffffff;
      white-space: nowrap;
      text-shadow: 
        0 0 15px rgba(255, 240, 200, 0.85),
        0 0 32px rgba(245, 180, 70, 0.4),
        0 3px 6px rgba(0, 0, 0, 0.9);
    }

    /* LISTADO FLOTANTE DE CIUDADES Y FECHAS */
    .cities-container {
      position: absolute;
      top: 726px;
      left: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 46px;
    }
    .city-block {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 7px;
    }
    .city-name {
      font-size: 41px;
      font-weight: 700;
      color: #f29e2e;
      letter-spacing: 0.04em;
      text-shadow: 
        0 0 16px rgba(242, 164, 59, 0.45),
        0 2px 6px rgba(0, 0, 0, 0.85);
    }
    .city-dates {
      font-size: 30px;
      font-weight: 300;
      color: #ffffff;
      letter-spacing: 0.02em;
      text-shadow: 
        0 0 12px rgba(255, 255, 255, 0.35),
        0 2px 6px rgba(0, 0, 0, 0.9);
    }

    /* BANDERAS METÁLICAS CIRCULARES OFICIALES */
    .flags-container {
      position: absolute;
      top: 1685px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
    }
    .flags-badges-img {
      width: 445px;
      height: auto;
      object-fit: contain;
      filter: drop-shadow(0 4px 18px rgba(0, 0, 0, 0.9));
    }

    /* HASHTAG */
    .hashtag-container {
      position: absolute;
      top: 1800px;
      left: 0;
      right: 0;
      text-align: center;
    }
    .hashtag {
      font-size: 21px;
      font-weight: 400;
      letter-spacing: 0.38em;
      padding-left: 0.38em;
      color: rgba(255, 255, 255, 0.92);
      text-shadow: 0 0 15px rgba(255, 255, 255, 0.45);
    }
  </style>
</head>
<body>

  <div class="logo-container">
    <img src="${logoDataUri}" class="logo-img" alt="CREAR" />
  </div>

  <div class="fechas-eyebrow">${eyebrow}</div>

  <div class="headline-container">
    <div class="outline-watermark">${outline}</div>
    <div class="main-title">${programa}</div>
  </div>

  <div class="cities-container">
    ${sedesHtml}
  </div>

  <div class="flags-container">
    <img src="${flagsDataUri}" class="flags-badges-img" alt="Banderas" />
  </div>

  <div class="hashtag-container">
    <div class="hashtag">${hashtag}</div>
  </div>

</body>
</html>
`;

async function main() {
  console.log(`Generando flyer de alta fidelidad: "${programa}"...`);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');

  // Asegurar directorio destino
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await page.screenshot({ path: outputPath, type: 'png' });
  await browser.close();
  console.log(`Flyer oficial generado con fidelidad 100%: ${outputPath}`);
}

main().catch(err => {
  console.error('Error generando flyer:', err);
  process.exit(1);
});
