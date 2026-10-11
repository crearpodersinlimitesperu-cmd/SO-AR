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

test('premium Home grid renders real accesses with responsive themes, focus and reduced motion', async () => {
  const home = readFileSync(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8');
  const pro = home.split('{/* BARRA PRO COMPLETA')[1].split('{/* BANNER INTERACTIVO')[0];
  const grid = pro.slice(pro.indexOf('<section'), pro.lastIndexOf('</section>') + '</section>'.length);
  const fixture = '/home-premium-fixture.jsx';
  const server = await createServer({
    configFile: false,
    server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [react(), {
      name: 'home-premium-fixture',
      resolveId: id => id === fixture ? `${process.cwd()}${fixture}` : undefined,
      load: id => id === `${process.cwd()}${fixture}` ? `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { LayoutGrid, Users } from 'lucide-react';
        import ModuleHelpButton from '/src/components/ModuleHelpButton.jsx';
        import '/src/index.css';
        import '/src/pages/HomeModules.css';
        const params = new URLSearchParams(location.search);
        document.documentElement.dataset.theme = params.get('theme') || 'dark';
        const currentUser = { appRole: params.get('role') || 'superadmin' };
        const hasRoleAccess = roles => roles.includes(currentUser.appRole);
        const canAccessAgendaTimeBoxing = () => true;
        const canAccessManualQT = () => true;
        const canAccessManualNodus = () => true;
        const canAccessDirectorioQT = () => true;
        const canAccessCalendarioMJ = () => true;
        const canAccessFlyersC1 = () => true;
        const canAccessMonitorVuelos = () => true;
        const canAccessMonitorIMOs = () => true;
        const canUseAsignadorEntrenadores = () => true;
        const isDataAdmin = () => currentUser.appRole === 'superadmin';
        window.openedModules = [];
        const navigate = path => window.openedModules.push(path);
        const setShowHorariosModal = value => window.openedModules.push(value);
        function Fixture() { return ${grid}; }
        createRoot(document.getElementById('root')).render(<Fixture />);
      ` : undefined,
      configureServer: vite => {
        vite.middlewares.use((req, res, next) => {
          if (!req.url.startsWith('/home-premium-test')) return next();
          res.setHeader('Content-Type', 'text/html');
          res.end(`<meta name="viewport" content="width=device-width,initial-scale=1">
            <div id="root" style="max-width:960px;margin:auto;padding:2rem 1rem"></div>
            <script type="module" src="${fixture}"></script>`);
        });
      }
    }]
  });
  let browser;
  try {
    await server.listen();
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_BIN || await puppeteer.executablePath(),
      headless: true,
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = `${server.resolvedUrls.local[0]}home-premium-test`;
    for (const theme of ['dark', 'light']) {
      for (const width of [1280, 768, 640, 390, 320]) {
        const touch = width <= 390;
        await page.setViewport({ width, height: 1000, isMobile: touch, hasTouch: touch });
        await page.goto(`${url}?theme=${theme}`);
        await page.waitForSelector('.home-module-card');
        assert.equal(await page.$eval('#home-modules-title', el => el.textContent), 'Módulos y herramientas');
        const layout = await page.$$eval('.home-module-card', cards => cards.map(el => {
          const rect = el.getBoundingClientRect();
          return { x: rect.x, width: rect.width, height: rect.height,
            inside: rect.left >= 0 && rect.right <= innerWidth,
            labelFits: el.scrollWidth <= el.clientWidth };
        }));
        assert.ok(layout.every(card => card.inside && card.labelFits && card.height >= 44), `${theme}/${width}`);
        assert.ok(layout.every(card => Math.abs(card.width - layout[0].width) < 1), 'aligned equal-width cards');
        assert.equal(new Set(layout.map(card => card.x)).size, width >= 768 ? 3 : width >= 640 ? 2 : 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const contrast = await page.$eval('.home-module-card', el => {
          const rgb = value => value.match(/[\d.]+/g).map(Number);
          const foreground = rgb(getComputedStyle(el).color);
          const probe = document.createElement('div');
          probe.style.color = 'var(--bg-dark-alt)';
          document.body.append(probe);
          const base = rgb(getComputedStyle(probe).color);
          probe.remove();
          const surface = rgb(getComputedStyle(el).backgroundColor);
          const alpha = surface[3] ?? 1;
          const background = base.map((channel, i) => surface[i] * alpha + channel * (1 - alpha));
          const luminance = channels => channels.slice(0, 3).map(c => {
            const value = c / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
          return (Math.max(luminance(foreground), luminance(background)) + 0.05) /
            (Math.min(luminance(foreground), luminance(background)) + 0.05);
        });
        assert.ok(contrast >= 4.5, `${theme} text contrast: ${contrast}`);
        if (touch) {
          assert.equal(await page.$$eval('.home-modules .module-help-description', nodes =>
            nodes.every(el => getComputedStyle(el).position === 'static' && el.getBoundingClientRect().height > 0)), true);
          await page.tap('[data-module-help="horarios"]');
          assert.deepEqual(await page.evaluate(() => window.openedModules), [true]);
          assert.equal(await page.$eval('.module-help-description',
            el => getComputedStyle(el).position), 'static', 'touch descriptions remain visible after navigation');
        }
        if (process.env.HOME_SCREENSHOT_DIR && [1280, 390].includes(width)) {
          await page.screenshot({ path: `${process.env.HOME_SCREENSHOT_DIR}/home-${theme}-${width}.png`, fullPage: true });
        }
      }
    }
    await page.setViewport({ width: 1280, height: 1000, isMobile: false, hasTouch: false });
    await page.goto(url);
    const card = await page.waitForSelector('[data-module-help="gerencial"]');
    await card.focus();
    assert.equal(await card.evaluate(el => getComputedStyle(el).outlineWidth), '3px');
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => window.openedModules), ['/gerente']);
    await card.hover();
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(await card.evaluate(el => getComputedStyle(el).transform), 'matrix(1, 0, 0, 1, 0, -2)');
    await page.mouse.down();
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(await card.evaluate(el => getComputedStyle(el).transform), 'matrix(1, 0, 0, 1, 0, 0)');
    await page.mouse.up();
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await card.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    assert.equal(await card.evaluate(el => getComputedStyle(el).transform), 'none');
    for (const [role, key, path] of [
      ['cfo', 'cfo', '/cfo-dashboard'], ['legal', 'legal', '/legal-hub'],
      ['rrhh', 'talento', '/hr-command-center'],
      ['coord_maestria_global', 'maestria', '/andres-command-center'],
      ['capitan', 'checklist', '/checklist/capitan']
    ]) {
      await page.goto(`${url}?role=${role}`);
      await page.waitForSelector(`[data-module-help="${key}"]`);
      await page.click(`[data-module-help="${key}"]`);
      assert.deepEqual(await page.evaluate(() => window.openedModules), [path]);
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
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
