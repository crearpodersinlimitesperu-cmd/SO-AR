import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import puppeteer from 'puppeteer';

test('guides open, close and reopen by keyboard on desktop and mobile', async () => {
  const fixture = '/logistics-help-fixture.jsx';
  const server = await createServer({
    configFile: false,
    server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [
      react(),
      {
        name: 'logistics-help-fixture',
        resolveId: id => id === fixture ? `\0${fixture}` : undefined,
        load: id => id === `\0${fixture}` ? `
          import React from 'react';
          import { createRoot } from 'react-dom/client';
          import ModuleQuickGuide from '/src/components/ModuleQuickGuide.jsx';
          import { flightMonitorGuide, flyerGuide } from '/src/data/logisticsHelpContent.js';
          createRoot(document.getElementById('root')).render(
            React.createElement(React.Fragment, null,
              React.createElement(ModuleQuickGuide, { guide: flightMonitorGuide }),
              React.createElement(ModuleQuickGuide, { guide: flyerGuide })
            )
          );
        ` : undefined,
        configureServer: vite => {
          vite.middlewares.use((req, res, next) => {
            if (req.url !== '/logistics-help-test') return next();
            res.setHeader('Content-Type', 'text/html');
            res.end(`<div id="root"></div><script type="module" src="/@vite/client"></script><script type="module" src="${fixture}"></script>`);
          });
        }
      }
    ]
  });
  let browser;
  try {
    await server.listen();
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_BIN || puppeteer.executablePath(),
      headless: true,
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    const origin = server.resolvedUrls.local[0];
    for (const width of [1280, 390]) {
      await page.setViewport({ width, height: 900 });
      await page.goto(`${origin}logistics-help-test`);
      await page.waitForSelector('.managers-quick-guide button');
      const buttons = await page.$$('.managers-quick-guide button');
      assert.equal(buttons.length, 2);
      for (const button of buttons) {
        const controlId = await button.evaluate(el => el.getAttribute('aria-controls'));
        assert.ok(controlId);
        assert.equal(await button.evaluate(el => el.getAttribute('aria-expanded')), 'true');
        assert.equal(await page.$eval(`[id="${controlId}"]`, el => el.hidden), false);
        await button.focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(id => document.getElementById(id).hidden, {}, controlId);
        assert.equal(await button.evaluate(el => el.getAttribute('aria-expanded')), 'false');
        assert.equal(await button.evaluate(el => el.textContent.trim()), 'Ver indicaciones');
        await page.keyboard.press('Space');
        await page.waitForFunction(id => !document.getElementById(id).hidden, {}, controlId);
        assert.equal(await button.evaluate(el => el.getAttribute('aria-expanded')), 'true');
        assert.equal(await button.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
        assert.equal(await button.evaluate(el => getComputedStyle(el).outlineWidth), '3px');
      }
      assert.equal(await page.$$eval('.managers-guide-steps li', nodes => nodes.length), 8);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
  } finally {
    await browser?.close();
    await server.close();
  }
});
