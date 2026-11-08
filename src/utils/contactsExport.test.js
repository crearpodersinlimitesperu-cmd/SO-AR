import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatInternationalPhone,
  generateSingleVCard,
  generateVCardBundle,
  generateGoogleContactsCSV
} from './contactsExport.js';

test('formatInternationalPhone formats numbers correctly per country', () => {
  // Peru (+51)
  assert.equal(formatInternationalPhone('+51997213218', 'Lima'), '+51997213218');
  assert.equal(formatInternationalPhone('997213218', 'Lima'), '+51997213218');

  // Ecuador (+593)
  assert.equal(formatInternationalPhone('0939935732', 'Guayaquil'), '+593939935732');
  assert.equal(formatInternationalPhone('5930983807026', 'Cuenca'), '+5930983807026');

  // Colombia (+57)
  assert.equal(formatInternationalPhone('3001234567', 'Medellín'), '+573001234567');
});

test('generateSingleVCard outputs valid vCard 3.0 format', () => {
  const manager = {
    nombre: 'Italo Alonso Roman Nomura',
    rol: 'Manager',
    telefono: '+51997213218',
    equipo: 'QUANTUM PHOENIX',
    numEquipo: '29',
    sede: 'Lima',
    estado: 'Activo',
    entrenador: 'Paul'
  };

  const vcard = generateSingleVCard(manager);
  assert.ok(vcard.startsWith('BEGIN:VCARD'));
  assert.ok(vcard.includes('VERSION:3.0'));
  assert.ok(vcard.includes('FN:Italo Alonso Roman Nomura'));
  assert.ok(vcard.includes('N:Alonso Roman Nomura;Italo;;;'));
  assert.ok(vcard.includes('TEL;TYPE=CELL,VOICE,PREF:+51997213218'));
  assert.ok(vcard.includes('ORG:Crear Poder Sin Límites'));
  assert.ok(vcard.includes('TITLE:Manager · #29 QUANTUM PHOENIX · (Lima)'));
  assert.ok(vcard.endsWith('END:VCARD'));
});

test('generateVCardBundle filters out managers without phone and bundles valid cards', () => {
  const managers = [
    { nombre: 'Karina Garcia', telefono: '0939935732', sede: 'Guayaquil', rol: 'Manager' },
    { nombre: 'Sin Telefono', telefono: '', sede: 'Lima', rol: 'Manager' },
    { nombre: 'Tania Sanchez', telefono: '+51981295423', sede: 'Lima', rol: 'Capitán' }
  ];

  const bundle = generateVCardBundle(managers);
  assert.ok(bundle.includes('FN:Karina Garcia'));
  assert.ok(bundle.includes('FN:Tania Sanchez'));
  assert.ok(!bundle.includes('FN:Sin Telefono'));
});

test('generateGoogleContactsCSV produces RFC 4180 compliant CSV', () => {
  const managers = [
    {
      nombre: 'JOSE PABLO SALDARRIAGA',
      rol: 'Manager',
      telefono: '+573001234567',
      equipo: 'METANOIA',
      numEquipo: '19',
      sede: 'Medellín',
      estado: 'Activo',
      entrenador: 'Fer'
    }
  ];

  const csv = generateGoogleContactsCSV(managers);
  assert.ok(csv.startsWith('Name,Given Name,Family Name'));
  assert.ok(csv.includes('JOSE PABLO SALDARRIAGA'));
  assert.ok(csv.includes('+573001234567'));
  assert.ok(csv.includes('Crear Poder Sin Límites'));
});
