import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { build, preview } from 'vite';
import puppeteer from 'puppeteer';

test('startup images have bounded bytes and use fingerprinted build assets', () => {
  assert.ok(statSync('src/assets/login-background.webp').size < 150_000);
  assert.ok(statSync('src/assets/causa-icon.png').size < 5_000);
  const icon = readFileSync('src/assets/causa-icon.png');
  assert.equal(icon.readUInt32BE(16), 32);
  assert.equal(icon.readUInt32BE(20), 32);
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /sizes="32x32" href="\/src\/assets\/causa-icon.png"/);
  const login = readFileSync('src/pages/Login.jsx', 'utf8');
  assert.match(login, /import loginBackground from '\.\.\/assets\/login-background.webp'/);
  assert.doesNotMatch(login, /leones_bg_v2\.jpg/);
});

test('production anonymous login loads without managers directory or full-size startup images', { timeout: 120_000 }, async () => {
  await build({ logLevel: 'error' });
  const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], executablePath: process.env.CHROME_BIN || await puppeteer.executablePath() });
    const page = await browser.newPage();
    const errors = [];
    const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(new URL(request.url()).pathname));
    await page.goto(server.resolvedUrls.local[0], { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Continuar con Google'));
    await page.waitForFunction(() => performance.getEntriesByType('resource').some(resource => /login-background[^/]*\.webp/.test(resource.name)));
    const image = await page.evaluate(async () => {
      const background = document.querySelector('.bg-animated').style.backgroundImage;
      const url = background.match(/url\(["']?(.*?)["']?\)/)[1];
      const image = new Image();
      image.src = url;
      await image.decode();
      return { url, width: image.naturalWidth, height: image.naturalHeight };
    });
    assert.match(image.url, /\/assets\/login-background-[^/]+\.webp/);
    assert.deepEqual([image.width, image.height], [1376, 768]);
    assert.equal(await page.$eval('link[rel="icon"]', element => element.sizes.value), '32x32');
    assert.equal(requests.some(path => /managersData-|leones_bg_v2\.jpg|causa-logo\.png/.test(path)), false, requests.join('\n'));
    assert.deepEqual(errors, []);
    assert.match(page.url(), /\/login\?from=/);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
  }
});
