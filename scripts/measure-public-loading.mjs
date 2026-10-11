import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import puppeteer from 'puppeteer';

// Cold, anonymous navigations only: no login, credentials, or data writes.
const target = process.argv[2] || 'local';
const runs = Number(process.argv[3] || 5);
if (!Number.isInteger(runs) || runs < 1) throw new Error('Runs must be a positive integer');
const dist = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
let server;
let browser;
try {
  let url = target;
  if (target === 'local') {
    server = createServer(async (req, res) => {
      try {
        let path = resolve(dist, `.${new URL(req.url, 'http://localhost').pathname}`);
        if (!path.startsWith(`${dist}/`)) path = resolve(dist, 'index.html');
        try {
          if (!(await stat(path)).isFile()) path = resolve(dist, 'index.html');
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
          path = resolve(dist, 'index.html');
        }
        const body = await readFile(path);
        res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        if (/\bbr\b/.test(req.headers['accept-encoding'] || '')) {
          res.setHeader('Content-Encoding', 'br');
          res.end(brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }));
        } else {
          res.setHeader('Content-Encoding', 'gzip');
          res.end(gzipSync(body));
        }
      } catch (error) {
        console.error('Measurement server:', error);
        res.writeHead(500).end();
      }
    });
    await new Promise(resolveReady => server.listen(0, '127.0.0.1', resolveReady));
    url = `http://127.0.0.1:${server.address().port}/`;
  }
  browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_BIN || await puppeteer.executablePath() });
  const results = [];
  for (let run = 0; run < runs; run++) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const client = await page.createCDPSession();
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8 });
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluateOnNewDocument(() => {
      window.loadingLcp = 0;
      window.loginReady = 0;
      const loginObserver = new MutationObserver(() => {
        if ([...document.querySelectorAll('button')].some(button => /Continuar con Google/.test(button.textContent))) {
          window.loginReady = performance.now();
          loginObserver.disconnect();
        }
      });
      loginObserver.observe(document, { subtree: true, childList: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.loadingLcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => /Continuar con Google/.test(button.textContent)), { timeout: 30_000 });
    await page.waitForFunction(() => performance.getEntriesByType('resource').some(resource => /leones_bg_v2\.jpg|login-background[^/]*\.webp/.test(resource.name)), { timeout: 30_000 });
    await new Promise(resolvePaint => setTimeout(resolvePaint, 1000));
    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource').map(({ name, initiatorType, startTime, responseEnd, transferSize, encodedBodySize, decodedBodySize }) => ({
        name, initiatorType, startTime, responseEnd, transferSize, encodedBodySize, decodedBodySize
      }));
      return { fcpMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime, lcpMs: window.loadingLcp, loginReadyMs: window.loginReady, domContentLoadedMs: nav.domContentLoadedEventEnd, htmlEncodedBytes: nav.encodedBodySize, resources };
    });
    const jsResources = metrics.resources.filter(resource => new URL(resource.name).pathname.endsWith('.js'));
    const assets = [...new Set(jsResources.map(resource => new URL(resource.name).pathname))];
    let jsBytes = 0;
    let jsGzipBytes = 0;
    if (target === 'local') {
      for (const asset of assets) {
        const contents = await readFile(resolve(dist, `.${asset}`));
        jsBytes += contents.length;
        jsGzipBytes += gzipSync(contents).length;
      }
    }
    results.push({ run: run + 1, ...metrics, jsBytes, jsGzipBytes, jsEncodedBytes: jsResources.reduce((sum, resource) => sum + resource.encodedBodySize, 0), failures });
    await context.close();
  }
  const median = field => [...results.map(result => result[field])].sort((a, b) => a - b)[Math.floor(results.length / 2)];
  console.log(JSON.stringify({ url, conditions: { runs, latencyMs: 150, downloadMbps: 1.6, cpuSlowdown: 4, cache: 'disabled', browser: await browser.version() }, median: { fcpMs: median('fcpMs'), lcpMs: median('lcpMs'), loginReadyMs: median('loginReadyMs'), jsBytes: median('jsBytes'), jsGzipBytes: median('jsGzipBytes'), jsEncodedBytes: median('jsEncodedBytes') }, results }, null, 2));
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolveClosed => server.close(resolveClosed));
}
