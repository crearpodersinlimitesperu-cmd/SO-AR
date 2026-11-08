import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ELI_ESCOBAR_EMAIL,
  FEE_PER_EFFECTIVE_CALL_USD,
  groupItemsByTrainer,
  buildLiquidacionEmailData
} from './liquidacionEmailHelper.js';

test('groupItemsByTrainer groups correctly by trainer name', () => {
  const items = [
    { equipo: 'AZRAK AETERNA', numEquipo: '124', sede: 'Quito', entrenador: 'Haydin Fernando Mendoza Clavijo', montoUSD: 25 },
    { equipo: 'LOTUS IKIGAI', numEquipo: '21', sede: 'Cuenca', entrenador: 'Haydin Fernando Mendoza Clavijo', montoUSD: 25 },
    { equipo: 'METAMORFOSIS', numEquipo: '30', sede: 'Guayaquil', entrenador: 'Erika Gavilánez', montoUSD: 25 }
  ];

  const grouped = groupItemsByTrainer(items);
  assert.equal(grouped.size, 2);
  assert.equal(grouped.get('Haydin Fernando Mendoza Clavijo').length, 2);
  assert.equal(grouped.get('Erika Gavilánez').length, 1);
});

test('buildLiquidacionEmailData creates correct subject, body and amounts', () => {
  const items = [
    { tipo: 'grupal', equipo: 'AZRAK AETERNA', numEquipo: '124', sede: 'Quito', entrenador: 'Haydin Fernando Mendoza Clavijo', montoUSD: 25, llamadasEfectivas: 1 },
    { tipo: 'grupal', equipo: 'LOTUS IKIGAI', numEquipo: '21', sede: 'Cuenca', entrenador: 'Haydin Fernando Mendoza Clavijo', montoUSD: 25, llamadasEfectivas: 1 }
  ];

  const emailData = buildLiquidacionEmailData({
    trainerName: 'Haydin Fernando Mendoza Clavijo',
    trainerEmail: 'fernandomendozaclavijo22@gmail.com',
    items,
    authorizerUser: { name: 'José Sánchez', email: 'comunidadcrearpsl@gmail.com', appRole: 'Director General' }
  });

  assert.equal(emailData.totalMontoUSD, 50);
  assert.equal(emailData.itemsCount, 2);
  assert.ok(emailData.subject.includes('Haydin Fernando Mendoza Clavijo'));
  assert.ok(emailData.subject.includes('$50 USD'));
  assert.ok(emailData.text.includes('Eli Escobar'));
  assert.ok(emailData.text.includes('AZRAK AETERNA (#124)'));
  assert.ok(emailData.text.includes('LOTUS IKIGAI (#21)'));
  assert.ok(emailData.text.includes('Quito'));
  assert.ok(emailData.text.includes('Cuenca'));
  assert.ok(emailData.text.includes('José Sánchez'));
  assert.ok(emailData.mailtoUrl.startsWith('mailto:contabilidad.global%40crearpsl.net'));
  assert.ok(emailData.html.includes('Nancy Elizabeth Escobar Pérez'));
  assert.ok(emailData.html.includes('$50 USD'));
});

test('dispatchLiquidacionNotifications records both notification and mail docs', async () => {
  const docsWritten = [];
  const fakeDb = {};
  const fakeCollection = (_db, name) => name;
  const fakeAddDoc = async (colName, data) => {
    docsWritten.push({ colName, data });
    return { id: `mock_${Date.now()}` };
  };

  const items = [
    { tipo: 'grupal', equipo: 'AZRAK AETERNA', numEquipo: '124', sede: 'Quito', entrenador: 'Haydin Fernando Mendoza Clavijo', montoUSD: 25 },
    { tipo: 'grupal', equipo: 'LOTUS IKIGAI', numEquipo: '21', sede: 'Cuenca', entrenador: 'Haydin Fernando Mendoza Clavijo', montoUSD: 25 }
  ];

  const res = await (await import('./liquidacionEmailHelper.js')).dispatchLiquidacionNotifications({
    db: fakeDb,
    addDocFn: fakeAddDoc,
    collectionFn: fakeCollection,
    items,
    authorizerUser: { name: 'José Sánchez', email: 'comunidadcrearpsl@gmail.com' }
  });

  assert.equal(res.successCount, 1);
  assert.equal(docsWritten.length, 2);

  const notif = docsWritten.find(d => d.colName === 'notifications');
  assert.ok(notif);
  assert.equal(notif.data.userId, ELI_ESCOBAR_EMAIL);
  assert.equal(notif.data.montoUSD, 50);

  const mail = docsWritten.find(d => d.colName === 'mail');
  assert.ok(mail);
  assert.deepEqual(mail.data.to, [ELI_ESCOBAR_EMAIL]);
  assert.ok(mail.data.message.subject.includes('Haydin Fernando Mendoza Clavijo'));
});

