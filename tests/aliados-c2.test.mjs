import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { phases, preparation } from '../prototypes/aliados-c2/content.js';
import { decodeProgress, STORAGE_KEY } from '../prototypes/aliados-c2/progress.js';

test('C2 content preserves phases, timings and mission dimensions', () => {
  assert.equal(phases.length, 4);
  assert.deepEqual(phases.map(phase => phase.events.length), [3, 3, 11, 3]);
  assert.equal(preparation.length, 9);
  assert.equal(new Set(preparation.map(item => item.id)).size, 9);
  const content = JSON.stringify({ phases, preparation });
  for (const term of ['14:01', '07:45', '19:00–21:00', '23:59', '10 graduados', '30 segundos', 'a capela', '90 días', 'Socios de Vida', 'Ticket Verde']) {
    assert.ok(content.includes(term), term);
  }
  assert.ok(phases[3].events.every(event => event[1] === 'Sin horario'));
});

test('progress rejects corrupt and unexpected data rather than hiding failures', () => {
  const ids = preparation.map(item => item.id);
  assert.deepEqual(decodeProgress(null, ids), []);
  assert.deepEqual(decodeProgress('["tecnica","tecnica"]', ids), ['tecnica']);
  for (const raw of ['bad json', '{}', '["email@example.test"]', '[null]']) {
    assert.throws(() => decodeProgress(raw, ids));
  }
});

test('prototype is not wired into the production application and discourages indexing', () => {
  const main = readFileSync('src/main.jsx', 'utf8');
  assert.ok(!main.includes('aliados-c2'));
  assert.match(readFileSync('prototypes/aliados-c2/index.html', 'utf8'), /noindex, nofollow, noarchive/);
  const prototype = readFileSync('prototypes/aliados-c2/main.jsx', 'utf8');
  assert.doesNotMatch(prototype, /firebase|fetch\(|https?:\/\//);
});

test('guide works on desktop and mobile: phases, local progress, recovery and print', async () => {
  const server = await createServer({
    configFile: 'prototypes/aliados-c2/vite.config.js',
    server: { port: 0, strictPort: false, host: '127.0.0.1', hmr: false },
  });
  let browser;
  try {
    await server.listen();
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    const external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (!request.url().startsWith('http://127.0.0.1:') && !request.url().startsWith('data:')) external.push(request.url());
    });
    const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(url);
    await page.waitForSelector('.schedule-phase');
    assert.equal(await page.$$eval('.schedule-phase:not(.phase-hidden)', items => items.length), 4);
    await page.click('.phase-link[href="#entrenamiento"]');
    await page.waitForFunction(() => document.querySelectorAll('.schedule-phase:not(.phase-hidden)').length === 1);
    assert.ok(await page.$eval('#entrenamiento', node => node.textContent.includes('14:01')));
    await page.click('.checklist input');
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).includes('tecnica'), {}, STORAGE_KEY);
    await page.reload();
    await page.waitForSelector('.checklist input:checked');
    await page.click('.reset-button');
    assert.equal(await page.$eval('.checklist input', node => node.checked), true);
    await page.click('.reset-confirm button:last-child');
    await page.click('.reset-button');
    await page.click('.reset-confirm button:first-of-type');
    await page.waitForFunction(() => !document.querySelector('.checklist input:checked'));
    for (const checkbox of await page.$$('.checklist input')) await checkbox.click();
    await page.waitForFunction(() => document.querySelectorAll('.checklist input:checked').length === 9);
    assert.equal(await page.$eval('.complete-message', node => node.hidden), false);
    assert.equal(await page.$eval('progress', node => node.value), 9);
    await page.evaluate(() => { window.print = () => { window.printInvoked = true; }; });
    await page.click('.print-button');
    assert.equal(await page.evaluate(() => window.printInvoked), true);

    await page.click('summary');
    await page.waitForFunction(() => document.querySelector('details').open);
    await page.click('summary');
    await page.waitForFunction(() => !document.querySelector('details').open);
    await page.setViewport({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.setViewport({ width: 320, height: 740 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));

    await page.evaluate(key => localStorage.setItem(key, 'corrupt'), STORAGE_KEY);
    await page.reload();
    await page.waitForSelector('[role="alert"]');
    await page.click('.reset-button');
    await page.click('.reset-confirm button:first-of-type');
    await page.waitForFunction(() => !document.querySelector('[role="alert"]'));
    await page.evaluate(() => {
      Storage.prototype.setItem = () => { throw new Error('Synthetic denied storage'); };
    });
    await page.click('.checklist input');
    await page.waitForSelector('[role="alert"]');
    assert.equal(await page.$eval('.checklist input', node => node.checked), true);
    assert.match(await page.$eval('[role="alert"]', node => node.textContent), /No se pudo guardar/);

    await page.emulateMediaType('print');
    assert.equal(await page.$$eval('.schedule-phase', nodes => nodes.filter(node => getComputedStyle(node).display !== 'none').length), 4);
    assert.ok(await page.$eval('.print-button', node => getComputedStyle(node).display === 'none'));
    assert.ok(await page.$eval('details:last-of-type .reference-body', node => node.getBoundingClientRect().height > 0));
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
