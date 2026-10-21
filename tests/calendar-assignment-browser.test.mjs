import test from 'node:test';
import assert from 'node:assert/strict';
import { build, preview } from 'vite';
import puppeteer from 'puppeteer';

test('built public calendar uses shared identity and republishes synthetic changes without external access', { timeout: 120_000 }, async () => {
  await build({ logLevel: 'error' });
  const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
  let browser;
  try {
    const origin = new URL(server.resolvedUrls.local[0]).origin;
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (new URL(request.url()).origin === origin) request.continue();
      else request.abort();
    });
    await page.goto(`${origin}/calendario_global.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.causaCalendarProjection));
    const actual = await page.evaluate(() => {
      const projection = window.causaCalendarProjection;
      const event = equipo => ({
        name: 'TANQUE', sede: 'UIO', equipo,
        start: '2026-11-06T00:00:00', end: '2026-11-06T00:00:00',
      });
      const first = event('122');
      const key = projection.buildAsignadorEventKey(first);
      const assignments = [{
        id: key, entrenamiento: first.name, sede: 'Quito', equipo: '122',
        fechaInicio: first.start, fechaFin: first.end,
        unico: { entrenador: 'Entrenador Sintético A' },
      }];
      const override = {
        id: key, kind: 'override', sourceEventKey: key, nombre: 'TANQUE', sede: 'Lima', equipo: '77',
        fechaInicio: '2026-12-01T00:00:00', fechaFin: '2026-12-02T00:00:00',
      };
      const custom = {
        id: 'synthetic-custom', kind: 'custom', nombre: 'TANQUE', sede: 'Lima', equipo: '80',
        fechaInicio: '2026-12-03T00:00:00', fechaFin: '2026-12-03T00:00:00',
      };
      const changes = [override, { ...custom, id: 'custom__synthetic-custom' }, custom];
      const data = { UIO: [first, event('128'), { ...event('122'), start: '2026-11-13T00:00:00', end: '2026-11-13T00:00:00' }] };
      applyOperationalChanges(data, changes);
      mergeOfficialAssignments(data, assignments);
      applyOperationalChanges(data, changes);
      mergeOfficialAssignments(data, assignments);
      const events = Object.values(data).flat();
      const moved = events.find(item => item.sourceEventKey === key);
      const parallel = events.find(item => item.equipo === '128');
      const otherDate = events.find(item => item.start.startsWith('2026-11-13'));
      const result = {
        count: events.length,
        moved: { start: moved.start, end: moved.end, sede: moved.sede, equipo: moved.equipo, trainer: moved.trainer },
        parallel: { start: parallel.start, trainer: parallel.trainer },
        otherDateTrainer: otherDate.trainer,
        customCount: events.filter(item => item.sourceEventKey === custom.id).length,
      };
      mergeOfficialAssignments(data, [{ ...assignments[0], unico: null }]);
      result.clearedTrainer = Object.values(data).flat().find(item => item.sourceEventKey === key).trainer;
      applyOperationalChanges(data, []);
      mergeOfficialAssignments(data, []);
      result.countAfterRemovingChanges = Object.values(data).flat().length;
      result.originalDateRestored = Object.values(data).flat().find(item => item.sourceEventKey === key).start;
      return result;
    });
    assert.deepEqual(actual, {
      count: 4,
      moved: {
        start: '2026-12-01T00:00:00', end: '2026-12-02T00:00:00',
        sede: 'Lima', equipo: '77', trainer: 'Entrenador Sintético A',
      },
      parallel: { start: '2026-11-06T00:00:00', trainer: '' },
      otherDateTrainer: '',
      customCount: 1,
      clearedTrainer: '',
      countAfterRemovingChanges: 3,
      originalDateRestored: '2026-11-06T00:00:00',
    });
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
  }
});
