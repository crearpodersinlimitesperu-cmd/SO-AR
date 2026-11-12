import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeLimaDocNumber,
  extractRecordNormalizedDoc,
  normalizeLimaEmail,
  normalizeLimaPersonName,
  buildDeterministicContractDocId,
  isSameNormalizedDoc,
  findMatchingLimaContract,
  deduplicateSignedContracts
} from '../src/utils/limaContractUniqueness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

test('1. normalizeLimaDocNumber limpia prefijos, guiones, puntos y espacios', () => {
  assert.equal(normalizeLimaDocNumber('DNI: 0813-0068 '), '08130068');
  assert.equal(normalizeLimaDocNumber('ce 008362020'), '008362020');
  assert.equal(normalizeLimaDocNumber('Pasaporte: a99-19241'), 'A9919241');
  assert.equal(buildDeterministicContractDocId('DNI: 70319817'), 'doc_70319817');
});

test('2. isSameNormalizedDoc bloquea equivalencias con o sin cero a la izquierda en DNI/CE numéricos', () => {
  assert.equal(isSameNormalizedDoc('08130068', '8130068'), true);
  assert.equal(isSameNormalizedDoc('008362020', '8362020'), true);
  assert.equal(isSameNormalizedDoc('70319817', '70319818'), false);
});

test('3. findMatchingLimaContract detecta doble registro por documento, correo o nombre completo exacto', () => {
  const existing = [
    {
      id: '7r3uYl7fjJun81qMDvqF',
      nombre: 'Martin Espinoza',
      doc: 'DNI: 08130068',
      numeroDocumento: '08130068',
      email: 'estudiovicentespinoza@gmail.com'
    },
    {
      id: 'REZqpEtwaYmcI1ehGklm',
      nombre: 'José Sánchez Moreno',
      doc: 'DNI: 45892147',
      numeroDocumento: '',
      email: ''
    }
  ];

  assert.equal(extractRecordNormalizedDoc(existing[1]), '45892147');

  // Intento 2 con mismo DNI sin cero inicial y otro correo
  const byDoc = findMatchingLimaContract(existing, {
    nombreCompleto: 'M. Espinoza',
    numeroDocumento: '8130068',
    email: 'otrocorreo@gmail.com'
  });
  assert.ok(byDoc);
  assert.equal(byDoc.matchReason, 'número de documento');

  // Intento 2 con otro DNI (error tipográfico) pero mismo correo
  const byEmail = findMatchingLimaContract(existing, {
    nombreCompleto: 'Martin E.',
    numeroDocumento: '99999999',
    email: 'ESTUDIOVICENTESPINOZA@gmail.com '
  });
  assert.ok(byEmail);
  assert.equal(byEmail.matchReason, 'correo electrónico');

  // Intento 2 con error en DNI y otro correo, pero mismo nombre completo (con tildes distintas)
  const byName = findMatchingLimaContract(existing, {
    nombreCompleto: 'Jose Sanchez Moreno',
    numeroDocumento: '45892148',
    email: 'nuevo@correo.com'
  });
  assert.ok(byName);
  assert.equal(byName.matchReason, 'nombre completo');

  // Persona completamente nueva: permitido
  const brandNew = findMatchingLimaContract(existing, {
    nombreCompleto: 'Lucía Paredes Quispe',
    numeroDocumento: '74125896',
    email: 'lucia.paredes@gmail.com'
  });
  assert.equal(brandNew, null);
});

test('4. deduplicateSignedContracts garantiza 1 fila única por persona en Monitores Lima y agrupa IDs para eliminación limpia', () => {
  const raw = [
    {
      id: 'legacy_1',
      nombre: 'Italo Alonso Roman Nomura',
      numeroDocumento: '70319817',
      email: 'italusroman17@gmail.com',
      fechaValidacionIso: '2026-11-12T22:39:21Z'
    },
    {
      id: 'doc_70319817',
      nombre: 'Ítalo Alonso Román Nomura',
      numeroDocumento: '70319817',
      email: 'italusroman17@gmail.com',
      fechaValidacionIso: '2026-11-12T22:45:00Z'
    },
    {
      id: 'doc_71885881',
      nombre: 'María Flores Mondaluisa',
      numeroDocumento: '71885881',
      email: 'mariaflores231014@gmail.com',
      fechaValidacionIso: '2026-11-12T22:35:53Z'
    }
  ];

  const deduped = deduplicateSignedContracts(raw);
  assert.equal(deduped.length, 2, 'No debe mostrar registros duplicados en el monitor');
  const italo = deduped.find((r) => normalizeLimaPersonName(r.nombre).includes('italo'));
  assert.deepEqual(italo._allDocIds, ['legacy_1', 'doc_70319817']);
});

test('5. ContratoCaminataFuego, ContratoMaestriaLima y ambos Monitores usan unicidad atómica y deduplicación', () => {
  const fuego = fs.readFileSync(path.join(repoRoot, 'src/pages/ContratoCaminataFuego.jsx'), 'utf8');
  const maestria = fs.readFileSync(path.join(repoRoot, 'src/pages/ContratoMaestriaLima.jsx'), 'utf8');
  const monFuego = fs.readFileSync(path.join(repoRoot, 'src/pages/MonitorAcreditacionFuegoLima.jsx'), 'utf8');
  const monMaestria = fs.readFileSync(path.join(repoRoot, 'src/pages/MonitorMaestriaLima.jsx'), 'utf8');

  assert.ok(fuego.includes('registerUniqueLimaContract'), 'ContratoCaminataFuego debe registrar con bloqueo atómico');
  assert.ok(!fuego.includes('addDoc('), 'ContratoCaminataFuego NO debe usar addDoc con IDs aleatorios');
  assert.ok(!fuego.includes('Registrar Nuevo Participante'), 'ContratoCaminataFuego NO debe mostrar botón para volver a llenar tras firmar');
  assert.ok(fuego.includes('cq_firewalk_lima_signed_v2') && fuego.includes('handleIdentityBlur'), 'ContratoCaminataFuego debe bloquear en tiempo real al escribir documento/correo y al reabrir');
  assert.ok(maestria.includes('registerUniqueLimaContract'), 'ContratoMaestriaLima debe registrar con bloqueo atómico');
  assert.ok(!maestria.includes('addDoc('), 'ContratoMaestriaLima NO debe usar addDoc con IDs aleatorios');
  assert.ok(maestria.includes('{!signedSuccess && ('), 'ContratoMaestriaLima debe ocultar el formulario completo una vez firmado o detectado como duplicado');
  assert.ok(maestria.includes('cq_maestria_lima_signed_v2') && maestria.includes('handleIdentityBlur'), 'ContratoMaestriaLima debe bloquear en tiempo real al escribir documento/correo y al reabrir');
  assert.ok(monFuego.includes('deduplicateSignedContracts'), 'MonitorAcreditacionFuegoLima debe deduplicar registros');
  assert.ok(monMaestria.includes('deduplicateSignedContracts'), 'MonitorMaestriaLima debe deduplicar registros');
});
