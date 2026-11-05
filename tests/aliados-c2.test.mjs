import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { phases, preparation } from '../prototypes/aliados-c2/content.js';

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

test('official logo is reused unchanged and private records are not simulated', () => {
  assert.deepEqual(readFileSync('prototypes/aliados-c2/logo-crear.png'), readFileSync('public/imo/logo-crear.png'));
  const prototype = readFileSync('prototypes/aliados-c2/main.jsx', 'utf8');
  assert.doesNotMatch(prototype, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.match(prototype, /no tiene inicio de sesión, historial individual ni sincronización/);
  assert.match(prototype, /responsable, contacto, finalidad, conservación, derechos y transferencias/);
});

test('prototype is not wired into the production application and discourages indexing', () => {
  const main = readFileSync('src/main.jsx', 'utf8');
  assert.ok(!main.includes('aliados-c2'));
  assert.match(readFileSync('prototypes/aliados-c2/index.html', 'utf8'), /noindex, nofollow, noarchive/);
  const prototype = readFileSync('prototypes/aliados-c2/main.jsx', 'utf8');
  assert.doesNotMatch(prototype, /firebase|fetch\(|https?:\/\//);
});

test('local guide: logo, privacy, temporary marks, blocked storage, responsive layout and print', async () => {
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
    await page.evaluateOnNewDocument(() => {
      for (const method of ['getItem', 'setItem', 'removeItem']) {
        Storage.prototype[method] = () => { throw new Error('Synthetic storage unavailable'); };
      }
    });
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(url);
    await page.waitForSelector('.schedule-phase');
    assert.equal(await page.$eval('.brand img', image => image.complete && image.naturalWidth > 0), true);
    assert.match(await page.$eval('#privacidad', node => node.textContent), /Propiedad intelectual/);
    assert.equal(await page.$$eval('.schedule-phase:not(.phase-hidden)', items => items.length), 4);
    await page.click('.phase-link[href="#entrenamiento"]');
    await page.waitForFunction(() => document.querySelectorAll('.schedule-phase:not(.phase-hidden)').length === 1);
    assert.ok(await page.$eval('#entrenamiento', node => node.textContent.includes('14:01')));
    await page.click('.checklist input');
    await page.waitForFunction(() => document.querySelector('.checklist input').checked);
    assert.match(await page.$eval('[role="status"]', node => node.textContent), /No se ha guardado/);
    const otherPage = await browser.newPage();
    await otherPage.goto(url);
    await otherPage.waitForSelector('.checklist input');
    assert.equal(await otherPage.$eval('.checklist input', node => node.checked), false);
    await otherPage.close();
    await page.reload();
    await page.waitForSelector('.checklist input');
    assert.equal(await page.$eval('.checklist input', node => node.checked), false);
    await page.click('.checklist input');
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
    await page.setViewport({ width: 768, height: 1024 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.setViewport({ width: 1280, height: 800 });
    await page.evaluate(() => { document.documentElement.style.zoom = '200%'; });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    assert.ok(await page.$eval('h1', node => node.getBoundingClientRect().width >= 300));
    assert.equal(await page.$eval('.chapter-mark', node => getComputedStyle(node).display), 'none');
    await page.evaluate(() => { document.documentElement.style.zoom = ''; });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await page.$eval('.details-sign', node => getComputedStyle(node).transitionDuration), '0s');
    assert.equal(await page.$eval('.brand', node => node.getBoundingClientRect().height >= 44), true);
    await page.click('a[href="#privacidad"]');
    assert.match(await page.$eval('#privacidad', node => node.textContent), /no protege el acceso/);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => {
      const target = document.activeElement;
      return target.tagName === 'A' || target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'SUMMARY';
    }), true);

    await page.evaluate(() => {
      document.querySelector('.brand img').dispatchEvent(new Event('error'));
    });
    await page.waitForSelector('[role="alert"]');
    assert.match(await page.$eval('[role="alert"]', node => node.textContent), /No se pudo cargar el logo/);

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
