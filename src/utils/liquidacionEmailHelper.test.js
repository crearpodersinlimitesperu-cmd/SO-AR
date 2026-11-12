import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ELI_ESCOBAR_EMAIL,
  groupItemsByTrainer,
  buildLiquidacionEmailData,
  dispatchLiquidacionNotifications
} from './liquidacionEmailHelper.js';

test('groupItemsByTrainer groups correctly by trainer name', () => {
  const items = [
    { equipo: 'AZRAK AETERNA', numEquipo: '124', sede: 'Quito', entrenador: 'Haydin Fernando Mendoza Clavijo', montoUSD: 400 },
    { equipo: 'LOTUS IKIGAI', numEquipo: '21', sede: 'Cuenca', entrenador: 'Haydin Fernando Mendoza Clavijo', montoUSD: 400 },
    { equipo: 'KAIROS-CUM', numEquipo: '19', sede: 'Cuenca', entrenador: 'Erika Gavilánez', montoUSD: 400 }
  ];

  const grouped = groupItemsByTrainer(items);
  assert.equal(grouped.size, 2);
  assert.equal(grouped.get('Haydin Fernando Mendoza Clavijo').length, 2);
  assert.equal(grouped.get('Erika Gavilánez').length, 1);
});

test('buildLiquidacionEmailData creates correct subject, body, amounts and infers Quito for #125 Global', () => {
  const items = [
    { tipo: 'grupal', equipo: 'HATUN PUSHAK', numEquipo: '125', sede: 'Sede Global', entrenador: 'Julio Narvaez', montoUSD: 400 }
  ];

  const emailData = buildLiquidacionEmailData({
    trainerName: 'Julio Narvaez',
    items,
    authorizerUser: { name: 'José Luis Sánchez Moreno', email: 'jose.sanchez@crearpsl.net', appRole: 'Director General' }
  });

  assert.equal(emailData.totalMontoUSD, 400);
  assert.equal(emailData.itemsCount, 1);
  assert.ok(emailData.subject.includes('Julio Narvaez'));
  assert.ok(emailData.subject.includes('$400 USD'));
  assert.ok(emailData.text.includes('HATUN PUSHAK (#125) | Sede: Quito'));
  assert.ok(emailData.html.includes('Nancy Elizabeth Escobar Pérez'));
  assert.ok(emailData.mailtoUrl.startsWith('mailto:contabilidad.global%40crearpsl.net'));
});

test('dispatchLiquidacionNotifications writes mail FIRST and notifications strictly matches firestore.rules allowed keys', async () => {
  const rulesSrc = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
  const allowedMatch = rulesSrc.match(/function isValidNotificationData\(\)[\s\S]*?hasOnly\(\[([\s\S]*?)\]\)/);
  assert.ok(allowedMatch, 'Debe existir isValidNotificationData con hasOnly en firestore.rules');
  const allowedKeys = new Set(
    [...allowedMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1])
  );

  const docsWritten = [];
  const fakeDb = {};
  const fakeCollection = (_db, name) => name;
  const fakeAddDoc = async (colName, data) => {
    docsWritten.push({ colName, data });
    return { id: `mock_${docsWritten.length}` };
  };

  const items = [
    { tipo: 'grupal', equipo: 'AZRAK AETERNA', numEquipo: '124', sede: 'Quito', entrenador: 'Haydin Fernando Mendoza Clavijo', montoUSD: 400 },
    { tipo: 'grupal', equipo: 'LOTUS IKIGAI', numEquipo: '21', sede: 'Cuenca', entrenador: 'Haydin Fernando Mendoza Clavijo', montoUSD: 400 }
  ];

  const res = await dispatchLiquidacionNotifications({
    db: fakeDb,
    addDocFn: fakeAddDoc,
    collectionFn: fakeCollection,
    items,
    authorizerUser: { name: 'José Sánchez', email: 'jose.sanchez@crearpsl.net' }
  });

  assert.equal(res.successCount, 1);
  assert.equal(res.errors.length, 0);
  assert.equal(docsWritten.length, 2);
  // Mail DEBE escribirse primero
  assert.equal(docsWritten[0].colName, 'mail');
  assert.deepEqual(docsWritten[0].data.to, [ELI_ESCOBAR_EMAIL]);
  assert.deepEqual(docsWritten[0].data.cc, ['jose.sanchez@crearpsl.net']);
  assert.equal(docsWritten[0].data.type, 'liquidacion_autorizacion_pago');

  // Notification DEBE cumplir 100% las llaves permitidas por firestore.rules
  assert.equal(docsWritten[1].colName, 'notifications');
  assert.equal(docsWritten[1].data.userId, ELI_ESCOBAR_EMAIL);
  for (const k of Object.keys(docsWritten[1].data)) {
    assert.ok(allowedKeys.has(k), `Llave '${k}' en notifications NO está permitida por isValidNotificationData en firestore.rules`);
  }
});

test('dispatchLiquidacionNotifications still enqueues mail even if notifications throws', async () => {
  const fakeDb = {};
  const fakeCollection = (_db, name) => name;
  const fakeAddDoc = async (colName) => {
    if (colName === 'notifications') throw new Error('Simulated in-app error');
    return { id: 'mail_ok_1' };
  };

  const res = await dispatchLiquidacionNotifications({
    db: fakeDb,
    addDocFn: fakeAddDoc,
    collectionFn: fakeCollection,
    items: [{ tipo: 'grupal', equipo: 'KUNTUR SHINSEI', numEquipo: '35', sede: 'Guayaquil', entrenador: 'Jose Luis Sanchez Moreno', montoUSD: 400 }],
    authorizerUser: { name: 'José Sánchez', email: 'jose.sanchez@crearpsl.net' }
  });

  assert.equal(res.successCount, 1);
  assert.deepEqual(res.mailIds, ['mail_ok_1']);
  assert.equal(res.errors.length, 0);
});
