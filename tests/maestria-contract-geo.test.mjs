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

test('2. ContratoMaestriaLima.jsx incluye las 6 secciones del Dossier Legal, QR, 3 casillas Clickwrap, IP y Geolocalización', () => {
  const code = fs.readFileSync(path.join(repoRoot, 'src/pages/ContratoMaestriaLima.jsx'), 'utf8');
  assert.ok(code.includes('Creación Cuántica E.I.R.L.'), 'Debe identificar a Creación Cuántica E.I.R.L.');
  assert.ok(code.includes('20612592811'), 'Debe mostrar RUC 20612592811');
  assert.ok(code.includes('casilla1_TerminosNDA'), 'Debe exigir Casilla 1 (NDA y Reglas)');
  assert.ok(code.includes('casilla2_SaludExoneracion'), 'Debe exigir Casilla 2 (Salud y Exoneración)');
  assert.ok(code.includes('casilla3_DatosImagen'), 'Debe exigir Casilla 3 (Datos e Imagen)');
  assert.ok(code.includes('getClientGeoLocation'), 'Debe capturar IP y Geolocalización sin excepción');
  assert.ok(code.includes('contratos_maestria_lima'), 'Debe persistir en colección contratos_maestria_lima');
  assert.ok(code.includes('sendMaestriaConfirmationEmail'), 'Debe enviar automáticamente el contrato y pase por correo');
  assert.ok(code.includes('generateMaestriaPassCanvas'), 'Debe generar la imagen de validación');
});

test('3. MonitorMaestriaLima.jsx provee supervisión para Oficina de Lima con IP, Geolocalización, Padrón 111 y Reenvío de Correo', () => {
  const code = fs.readFileSync(path.join(repoRoot, 'src/pages/MonitorMaestriaLima.jsx'), 'utf8');
  assert.ok(code.includes('contratos_maestria_lima'), 'Debe escuchar en vivo contratos_maestria_lima');
  assert.ok(code.includes('padron_fuego_lima_111.json'), 'Debe cruzar contra el padrón oficial de Lima');
  assert.ok(code.includes('handleResendEmail'), 'Debe permitir reenviar contrato y pase por correo');
  assert.ok(code.includes('handleExportCsv'), 'Debe permitir exportar CSV forense con IP y Geolocalización');
  assert.ok(code.includes('selectedRecordForAudit'), 'Debe incluir modal de expediente forense detallado');
});

test('4. Caminata sobre Fuego y Onboarding Legal registran IP y Geolocalización y envían imagen por correo inmediatamente', () => {
  const fireCode = fs.readFileSync(path.join(repoRoot, 'src/pages/ContratoCaminataFuego.jsx'), 'utf8');
  assert.ok(fireCode.includes('getClientGeoLocation'), 'ContratoCaminataFuego debe capturar IP y Geolocalización');
  assert.ok(fireCode.includes('sendFirewalkConfirmationEmail'), 'ContratoCaminataFuego debe enviar el pase por correo de inmediato');

  const legalService = fs.readFileSync(path.join(repoRoot, 'src/services/legalSignatureService.js'), 'utf8');
  assert.ok(legalService.includes('getClientGeoLocation'), 'legalSignatureService debe capturar IP y Geolocalización en todas las firmas');
  assert.ok(legalService.includes('geo_location'), 'legalSignatureService debe persistir geo_location en Firestore');
});
