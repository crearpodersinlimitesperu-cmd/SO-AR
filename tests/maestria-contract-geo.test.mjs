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
