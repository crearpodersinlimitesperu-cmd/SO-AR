import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

test('1. geoLocator.js provee redundancia triple de IP y Geolocalización forense', () => {
  const geoCode = fs.readFileSync(path.join(repoRoot, 'src/utils/geoLocator.js'), 'utf8');
  assert.ok(geoCode.includes('getClientGeoLocation'), 'Debe exportar getClientGeoLocation');
  assert.ok(geoCode.includes('https://ipwho.is/'), 'Debe consultar ipwho.is como proveedor primario');
  assert.ok(geoCode.includes('https://get.geojs.io/v1/ip/geo.json'), 'Debe consultar geojs.io como respaldo secundario');
  assert.ok(geoCode.includes('https://api.ipify.org?format=json'), 'Debe consultar ipify.org como respaldo terciario');
  assert.ok(geoCode.includes('coordinates'), 'Debe incluir coordenadas geográficas');
});

test('2. ContratoMaestriaLima.jsx: sin botones ni jerga de oficina interna, vigencia durante y después de Maestría (comunidad y ley peruana), alto contraste y anti-duplicados', () => {
  const code = fs.readFileSync(path.join(repoRoot, 'src/pages/ContratoMaestriaLima.jsx'), 'utf8');
  assert.ok(code.includes('Creación Cuántica E.I.R.L.'), 'Debe identificar a Creación Cuántica E.I.R.L.');
  assert.ok(code.includes('20612592811'), 'Debe mostrar RUC 20612592811');
  assert.ok(!code.includes('Panel Oficina Lima'), 'NO debe exponer botón de Panel Oficina Lima al cliente externo');
  assert.ok(!code.includes('/monitor-maestria-lima'), 'NO debe enlazar al monitor interno desde la landing pública');
  assert.ok(!code.includes('NODUS'), 'NO debe mencionar jerga interna NODUS a clientes externos');
  assert.ok(
    code.includes('durante todo el programa de Maestría del Juego, después de Maestría como personas integrantes de la comunidad CREAR y por todo el tiempo que la legislación peruana lo considere vigente'),
    'Debe establecer la vigencia durante toda Maestría, después como parte de la comunidad y por el tiempo que la ley peruana lo considere vigente'
  );
  assert.ok(code.includes('.maestria-contract-root'), 'Debe incluir estilos de alto contraste aislados');
  assert.ok(code.includes('getDocs(collection(db, \'contratos_maestria_lima\'))'), 'Debe verificar anti-duplicados antes de registrar');
  assert.ok(code.includes('duplicateNotice'), 'Debe mostrar aviso cuando la persona intenta registrarse dos veces');
});

test('3. MonitorMaestriaLima.jsx y MonitorAcreditacionFuegoLima.jsx permiten eliminar registros con datos errados y solo son accesibles dentro de Causa OS vía RoleRoute', () => {
  const monitorMaestria = fs.readFileSync(path.join(repoRoot, 'src/pages/MonitorMaestriaLima.jsx'), 'utf8');
  assert.ok(monitorMaestria.includes('deleteDoc'), 'MonitorMaestriaLima debe importar deleteDoc');
  assert.ok(monitorMaestria.includes('handleDeleteRecord'), 'MonitorMaestriaLima debe permitir eliminar registros mal ingresados');
  assert.ok(monitorMaestria.includes('Eliminar Registro'), 'MonitorMaestriaLima debe mostrar botón Eliminar Registro');

  const monitorFuego = fs.readFileSync(path.join(repoRoot, 'src/pages/MonitorAcreditacionFuegoLima.jsx'), 'utf8');
  assert.ok(monitorFuego.includes('deleteDoc'), 'MonitorAcreditacionFuegoLima debe importar deleteDoc');
  assert.ok(monitorFuego.includes('handleDeleteFirewalkRecord'), 'MonitorAcreditacionFuegoLima debe permitir eliminar registros mal ingresados');
  assert.ok(monitorFuego.includes('Eliminar Registro'), 'MonitorAcreditacionFuegoLima debe mostrar botón Eliminar Registro');

  const appCode = fs.readFileSync(path.join(repoRoot, 'src/App.jsx'), 'utf8');
  assert.ok(
    appCode.includes('<Route path="/monitor-maestria-lima" element={\n            <RoleRoute') &&
    appCode.includes('<Route path="/monitor-fuego-lima" element={\n            <RoleRoute'),
    'Ambos monitores deben estar protegidos dentro de Causa OS con RoleRoute'
  );
  assert.ok(
    appCode.includes("'contabilidad'") && appCode.includes("'oficina'") && appCode.includes("'gerente'") && appCode.includes("'coordinador_mj'"),
    'RoleRoute de los monitores debe autorizar a Oficina de Lima, Gerente, Coordinadores y Contabilidad Local'
  );
  assert.ok(!fs.existsSync(path.join(repoRoot, 'public/monitor-fuego-lima')), 'No debe existir carpeta estática pública public/monitor-fuego-lima que salte RoleRoute');
});

test('4. Caminata sobre Fuego y Onboarding Legal registran IP y Geolocalización, previenen duplicados y envían imagen por correo inmediatamente', () => {
  const fireCode = fs.readFileSync(path.join(repoRoot, 'src/pages/ContratoCaminataFuego.jsx'), 'utf8');
  assert.ok(fireCode.includes('getClientGeoLocation'), 'ContratoCaminataFuego debe capturar IP y Geolocalización');
  assert.ok(fireCode.includes('sendFirewalkConfirmationEmail'), 'ContratoCaminataFuego debe enviar el pase por correo de inmediato');
  assert.ok(fireCode.includes("getDocs(collection(db, 'contratos_caminata_fuego'))"), 'ContratoCaminataFuego debe prevenir doble registro');
  assert.ok(!fireCode.includes('NODUS'), 'ContratoCaminataFuego no debe exponer jerga interna NODUS');

  const legalService = fs.readFileSync(path.join(repoRoot, 'src/services/legalSignatureService.js'), 'utf8');
  assert.ok(legalService.includes('getClientGeoLocation'), 'legalSignatureService debe capturar IP y Geolocalización en todas las firmas');
  assert.ok(legalService.includes('geo_location'), 'legalSignatureService debe persistir geo_location en Firestore');
});

test('5. Pases de Maestría y Caminata sobre Fuego se comprimen bajo el límite de 1 MiB de Firestore para despacho y reenvío inmediato', async () => {
  const { default: puppeteer } = await import('puppeteer');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');

    const passModuleCode = fs.readFileSync(path.join(repoRoot, 'src/utils/maestriaPass.js'), 'utf8')
      .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
      .replace(/export async function generateMaestriaPassCanvas/g, 'window.generateMaestriaPassCanvas = async function')
      .replace(/export async function preparePassEmailAttachment/g, 'window.preparePassEmailAttachment = async function')
      .replace(/export function buildMaestriaEmailHtml/g, 'window.buildMaestriaEmailHtml = function')
      .replace(/export async function sendMaestriaConfirmationEmail/g, 'window.sendMaestriaConfirmationEmail = async function')
      .replace(/export async function generateFirewalkPassCanvas/g, 'window.generateFirewalkPassCanvas = async function')
      .replace(/export function buildFirewalkEmailHtml/g, 'window.buildFirewalkEmailHtml = function')
      .replace(/export async function sendFirewalkConfirmationEmail/g, 'window.sendFirewalkConfirmationEmail = async function');

    await page.evaluate(passModuleCode);

    const metrics = await page.evaluate(async () => {
      const mjPng = await window.generateMaestriaPassCanvas({
        nombre: 'José Sánchez',
        doc: 'CE: 008362020',
        rol: 'Participante',
        equipo: 'Otra Cohorte / Rezagado Autorizado',
        sede: 'Lima',
        fecha: '11/11/2026, 4:29:10 p. m.',
        codigo: 'CQ-MJ-CUTW6-0652',
        ip: '2001:1388:80d:6b8f:c86d:40d2:c8e5:c4a7',
        geoLocation: 'Lima, Lima, Peru 🇵🇪',
        coordinates: '-12.043176, -77.028242'
      });
      const mjAtt = await window.preparePassEmailAttachment(
        mjPng,
        'PASE_VALIDACION_MAESTRIA_LIMA',
        'CQ-MJ-CUTW6-0652',
        'pase_maestria_oficial'
      );

      const fwPng = await window.generateFirewalkPassCanvas({
        nombre: 'José Sánchez',
        documento: 'CE: 008362020',
        rolActividad: 'Participante',
        lugar: 'Lima - Casona Blanca (Huachipa)',
        fecha: '11/11/2026, 4:29:10 p. m.',
        codigo: 'CQ-FIRE-TEST-0652',
        ip: '2001:1388:80d:6b8f:c86d:40d2:c8e5:c4a7',
        geoLocation: 'Lima, Lima, Peru 🇵🇪',
        coordinates: '-12.043176, -77.028242'
      });
      const fwAtt = await window.preparePassEmailAttachment(
        fwPng,
        'PASE_VALIDACION_CAMINATA_FUEGO',
        'CQ-FIRE-TEST-0652',
        'pase_fuego_oficial'
      );

      return {
        mjAttExists: Boolean(mjAtt),
        mjContentType: mjAtt?.contentType,
        mjFilename: mjAtt?.filename,
        mjContentBytes: mjAtt?.content?.length || 0,
        fwAttExists: Boolean(fwAtt),
        fwContentType: fwAtt?.contentType,
        fwFilename: fwAtt?.filename,
        fwContentBytes: fwAtt?.content?.length || 0
      };
    });

    assert.equal(metrics.mjAttExists, true, 'El adjunto de Maestría debe generarse');
    assert.equal(metrics.mjContentType, 'image/jpeg', 'El adjunto de Maestría debe comprimirse en image/jpeg');
    assert.ok(metrics.mjFilename.startsWith('PASE_VALIDACION_MAESTRIA_LIMA_'), 'El pase debe diferenciarse explícitamente del contrato como PASE_VALIDACION_MAESTRIA_LIMA');
    assert.ok(metrics.mjContentBytes > 20000 && metrics.mjContentBytes < 500000, `Adjunto Maestría fuera de rango seguro (<500KB): ${metrics.mjContentBytes}`);

    assert.equal(metrics.fwAttExists, true, 'El adjunto de Caminata sobre Fuego debe generarse');
    assert.equal(metrics.fwContentType, 'image/jpeg', 'El adjunto de Caminata sobre Fuego debe comprimirse en image/jpeg');
    assert.ok(metrics.fwFilename.startsWith('PASE_VALIDACION_CAMINATA_FUEGO_'), 'El pase debe diferenciarse explícitamente del contrato como PASE_VALIDACION_CAMINATA_FUEGO');
    assert.ok(metrics.fwContentBytes > 20000 && metrics.fwContentBytes < 500000, `Adjunto Fuego fuera de rango seguro (<500KB): ${metrics.fwContentBytes}`);
  } finally {
    await browser.close();
  }
});

test('6. Contrato Legal Íntegro en PDF A4 multipágina se genera por separado del Pase de Validación y contiene el 100% de las cláusulas', async () => {
  const {
    buildMaestriaContractPdfAttachment,
    buildFirewalkContractPdfAttachment,
    MAESTRIA_CONTRACT_SECTIONS,
    FIREWALK_CONTRACT_SECTIONS,
    renderContractSectionsHtml
  } = await import('../src/utils/contractPdfGenerator.js');
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const mjPdfAtt = buildMaestriaContractPdfAttachment({
    nombre: 'José Sánchez',
    doc: 'CE: 008362020',
    email: 'jose.sanchez@crearpsl.net',
    telefono: '+51919563284',
    rol: 'Participante',
    equipo: 'Otra Cohorte / Rezagado Autorizado',
    sede: 'Lima',
    fecha: '11/11/2026, 4:29:10 p. m.',
    codigo: 'CQ-MJ-CUTW6-0652',
    ip: '2001:1388:80d:6b8f:c86d:40d2:c8e5:c4a7',
    geoLocation: 'Lima, Lima, Peru 🇵🇪',
    coordinates: '-12.043176, -77.028242',
    firmaTexto: 'ACEPTO Y ME COMPROMETO JOSE SANCHEZ'
  });

  assert.equal(mjPdfAtt.filename, 'CONTRATO_FIRMADO_MAESTRIA_LIMA_CQ-MJ-CUTW6-0652.pdf');
  assert.equal(mjPdfAtt.contentType, 'application/pdf');
  assert.ok(mjPdfAtt.content.length > 20000 && mjPdfAtt.content.length < 150000, `PDF Maestría tamaño inesperado: ${mjPdfAtt.content.length}`);

  const mjBytes = new Uint8Array(Buffer.from(mjPdfAtt.content, 'base64'));
  const mjDoc = await pdfjsLib.getDocument({ data: mjBytes }).promise;
  assert.ok(mjDoc.numPages >= 3, `PDF Maestría debe ser multipágina A4 (>=3 páginas), obtenido: ${mjDoc.numPages}`);

  let mjFullText = '';
  for (let p = 1; p <= mjDoc.numPages; p += 1) {
    const page = await mjDoc.getPage(p);
    const tc = await page.getTextContent();
    mjFullText += tc.items.map((item) => item.str).join(' ') + '\n';
  }
  assert.ok(mjFullText.includes('CREACIÓN CUÁNTICA E.I.R.L.'), 'PDF Maestría debe incluir razón social con tildes');
  assert.ok(mjFullText.includes('20612592811'), 'PDF Maestría debe incluir RUC 20612592811');
  assert.ok(mjFullText.includes('SECCIÓN I') && mjFullText.includes('SECCIÓN VI'), 'PDF Maestría debe incluir todas las secciones I a VI');
  assert.ok(mjFullText.includes('CASILLA 1 (DOC 1)'), 'PDF Maestría debe incluir las casillas clickwrap aceptadas');
  assert.ok(mjFullText.includes('FIRMA ELECTRÓNICA VINCULANTE'), 'PDF Maestría debe incluir certificado de firma electrónica');
  assert.ok(mjFullText.includes('CQ-MJ-CUTW6-0652'), 'PDF Maestría debe incluir código único');

  const fwPdfAtt = buildFirewalkContractPdfAttachment({
    nombre: 'José Sánchez',
    documento: 'CE: 008362020',
    email: 'jose.sanchez@crearpsl.net',
    telefono: '+51919563284',
    rolActividad: 'Participante',
    lugar: 'Lima - Casona Blanca (Huachipa)',
    fecha: '11/11/2026, 4:29:10 p. m.',
    codigo: 'CQ-FIRE-TEST-0652',
    ip: '2001:1388:80d:6b8f:c86d:40d2:c8e5:c4a7',
    geoLocation: 'Lima, Lima, Peru 🇵🇪',
    coordinates: '-12.043176, -77.028242',
    aceptoImagen: true,
    firmaTexto: 'ACEPTO CAMINATA JOSE SANCHEZ'
  });

  assert.equal(fwPdfAtt.filename, 'CONTRATO_FIRMADO_CAMINATA_FUEGO_CQ-FIRE-TEST-0652.pdf');
  const fwBytes = new Uint8Array(Buffer.from(fwPdfAtt.content, 'base64'));
  const fwDoc = await pdfjsLib.getDocument({ data: fwBytes }).promise;
  assert.ok(fwDoc.numPages >= 3, `PDF Caminata debe ser multipágina A4 (>=3 páginas), obtenido: ${fwDoc.numPages}`);

  const mjHtmlClauses = renderContractSectionsHtml(MAESTRIA_CONTRACT_SECTIONS);
  const fwHtmlClauses = renderContractSectionsHtml(FIREWALK_CONTRACT_SECTIONS);
  assert.ok(mjHtmlClauses.includes('SECCIÓN VI') && fwHtmlClauses.includes('SECCIÓN IV'), 'El HTML del correo debe transcribir todas las cláusulas del contrato');

  for (const relFile of [
    'src/pages/MonitorMaestriaLima.jsx',
    'src/pages/ContratoMaestriaLima.jsx'
  ]) {
    const src = fs.readFileSync(path.join(repoRoot, relFile), 'utf8');
    assert.ok(src.includes('downloadMaestriaContractPdf'), `${relFile} debe permitir descargar directamente el Contrato PDF firmado`);
  }
  for (const relFile of [
    'src/pages/MonitorAcreditacionFuegoLima.jsx',
    'src/pages/ContratoCaminataFuego.jsx'
  ]) {
    const src = fs.readFileSync(path.join(repoRoot, relFile), 'utf8');
    assert.ok(src.includes('downloadFirewalkContractPdf'), `${relFile} debe permitir descargar directamente el Contrato PDF de Caminata firmado`);
  }
});
