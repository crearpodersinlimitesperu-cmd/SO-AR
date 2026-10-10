import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import puppeteer from 'puppeteer';
import { homeModuleHelp } from '../src/data/homeModuleHelp.js';

test('every Home Pro access has a concise description, including role-specific alternatives', () => {
  const home = readFileSync(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8');
  const grid = home.split('{/* BARRA PRO COMPLETA')[1].split('{/* BANNER INTERACTIVO')[0];
  assert.doesNotMatch(grid, /<button\b/);
  const keys = [...grid.matchAll(/<ModuleHelpButton helpKey="([^"]+)"/g)].map(match => match[1]);
  assert.equal(keys.length, 33);
  assert.deepEqual([...new Set(keys)].sort(), Object.keys(homeModuleHelp).sort());
  for (const key of keys) {
    assert.ok(homeModuleHelp[key].length >= 30 && homeModuleHelp[key].length <= 115, key);
  }
  assert.match(homeModuleHelp.vuelos, /no confirma tracking en vivo/);
  assert.match(homeModuleHelp.manualQT, /externo/);
  assert.match(homeModuleHelp.campus, /externa/);
});

test('module help supports hover, keyboard, viewport edges and mobile without intercepting navigation', async () => {
  const fixture = '/home-module-help-fixture.jsx';
  const server = await createServer({
    configFile: false,
    server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [
      react(),
      {
        name: 'home-module-help-fixture',
        resolveId: id => id === fixture ? `\0${fixture}` : undefined,
        load: id => id === `\0${fixture}` ? `
          import React from 'react';
          import { createRoot } from 'react-dom/client';
          import ModuleHelpButton from '/src/components/ModuleHelpButton.jsx';
          import { homeModuleHelp } from '/src/data/homeModuleHelp.js';
          window.openedModules = [];
          createRoot(document.getElementById('root')).render(
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
              ...Object.keys(homeModuleHelp).map(helpKey =>
                React.createElement(ModuleHelpButton, {
                  key: helpKey, helpKey, className: 'btn-primary',
                  style: { padding: '8px', display: 'flex' },
                  onClick: () => window.openedModules.push(helpKey)
                }, helpKey)
              ),
              React.createElement(ModuleHelpButton, { helpKey: 'horarios' }, 'Duplicate')
            )
          );
        ` : undefined,
        configureServer: vite => {
          vite.middlewares.use((req, res, next) => {
            if (req.url !== '/home-module-help-test') return next();
            res.setHeader('Content-Type', 'text/html');
            res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="${fixture}"></script>`);
          });
        }
      }
    ]
  });
  let browser;
  try {
    await server.listen();
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_BIN || await puppeteer.executablePath(),
      headless: true,
      args: [
        '--no-sandbox',
        '--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4'
      ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, isMobile: false, hasTouch: false });
    const url = `${server.resolvedUrls.local[0]}home-module-help-test`;
    await page.goto(url);
    await page.waitForSelector('[data-module-help]');
    const controls = await page.$$('[data-module-help]');
    const descriptionIds = [];
    for (const control of controls) {
      const attributes = await control.evaluate(el => ({
        id: el.getAttribute('aria-describedby'),
        title: el.title,
        description: document.getElementById(el.getAttribute('aria-describedby')).textContent,
        label: document.getElementById(el.getAttribute('aria-labelledby')).textContent,
        key: el.dataset.moduleHelp
      }));
      assert.equal(attributes.title, homeModuleHelp[attributes.key]);
      assert.equal(attributes.description, attributes.title);
      assert.ok(!attributes.label.includes(attributes.description), 'description does not replace accessible name');
      descriptionIds.push(attributes.id);
    }
    assert.equal(new Set(descriptionIds).size, controls.length);

    await controls[0].hover();
    assert.deepEqual(await page.evaluate(() => ({
      hoverNone: matchMedia('(hover: none)').matches,
      coarse: matchMedia('(pointer: coarse)').matches,
      tooltip: document.querySelector('[role="tooltip"]')?.textContent,
      display: document.querySelector('[role="tooltip"]') && getComputedStyle(document.querySelector('[role="tooltip"]')).display
    })), { hoverNone: false, coarse: false, tooltip: homeModuleHelp.horarios, display: 'block' });
    await page.waitForSelector('[role="tooltip"]', { visible: true });
    assert.equal(await page.$eval('[role="tooltip"]', el => el.textContent), homeModuleHelp.horarios);
    await page.hover('[role="tooltip"]');
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.ok(await page.$('[role="tooltip"]'), 'tooltip stays open while hovered');
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role="tooltip"]', { hidden: true });

    await controls[1].focus();
    await page.waitForSelector('[role="tooltip"]', { visible: true });
    assert.equal(await controls[1].evaluate(el => getComputedStyle(el).outlineWidth), '3px');
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role="tooltip"]', { hidden: true });
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => window.openedModules), ['gerencial']);
    await controls[2].focus();
    await page.keyboard.press('Space');
    assert.deepEqual(await page.evaluate(() => window.openedModules), ['gerencial', 'checklist']);

    await controls.at(-1).evaluate(el => {
      el.style.position = 'fixed';
      el.style.right = '0';
      el.style.bottom = '0';
    });
    await controls.at(-1).focus();
    await page.waitForSelector('[role="tooltip"]', { visible: true });
    assert.equal(await page.$eval('[role="tooltip"]', el => {
      const rect = el.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
    }), true);
    await page.click('body', { offset: { x: 5, y: 500 } });
    await page.waitForSelector('[role="tooltip"]', { hidden: true });

    for (const width of [390, 320]) {
      await page.setViewport({ width, height: 900, isMobile: true, hasTouch: true });
      await page.goto(url);
      await page.waitForSelector('[data-module-help]');
      assert.equal(await page.evaluate(() => matchMedia('(hover: none)').matches), true);
      assert.equal(await page.$$eval('.module-help-description', nodes =>
        nodes.every(el => getComputedStyle(el).position === 'static' && el.getBoundingClientRect().height > 0)
      ), true, 'mobile explanations are visible without tapping');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.tap('[data-module-help="horarios"]');
      assert.deepEqual(await page.evaluate(() => window.openedModules), ['horarios'], 'first tap navigates once');
    }
  } finally {
    await browser?.close();
    await server.close();
  }
});
