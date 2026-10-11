import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverNodusGoalSources, goalSourcePath } from '../scripts/discoverNodusGoalSources.mjs';

test('goal discovery only follows safe read-only routes without query identifiers', () => {
  assert.equal(goalSourcePath('https://imo.crearpslglobal.com/calendario'), '/calendario');
  assert.equal(goalSourcePath('https://imo.crearpslglobal.com/aliados'), '/aliados');
  for (const path of ['/logout', '/aliados/delete/1', '/aliados?email=fixture@example.invalid', '/finanzas']) {
    assert.equal(goalSourcePath(`https://imo.crearpslglobal.com${path}`), null);
  }
  assert.equal(goalSourcePath('https://example.invalid/calendario'), null);
});

test('discovery exports schema and counts only, not raw people or body text', async () => {
  let url;
  const page = {
    goto: async next => { url = next; return { status: () => 200 }; },
    url: () => url,
    waitForNetworkIdle: async () => {},
    evaluate: async () => ({
      tables: [{ headers: ['Equipo', 'Sede', 'Fecha C1'], visibleRows: 3, paginated: false }],
      links: ['https://imo.crearpslglobal.com/calendario']
    })
  };
  const result = await discoverNodusGoalSources(page);
  assert.equal(result.pathsSearched, 6);
  assert.equal(result.evidence.at(-1).path, '/calendario');
  assert.deepEqual(Object.keys(result.evidence[0]).sort(), ['path', 'status', 'tables']);
  assert.equal(JSON.stringify(result).includes('links'), false);
});

test('discovery stops at authentication or anti-bot challenges', async () => {
  const page = {
    goto: async () => ({ status: () => 200 }),
    url: () => 'https://imo.crearpslglobal.com/auth/login'
  };
  await assert.rejects(discoverNodusGoalSources(page), /verificación o una nueva sesión/);
});

test('HTTP denial is recorded as denial, not empty or complete data', async () => {
  let url;
  const page = {
    goto: async next => { url = next; return { status: () => 403 }; },
    url: () => url,
    evaluate: async () => { throw new Error('Denied pages must not be inspected'); }
  };
  const result = await discoverNodusGoalSources(page);
  assert.equal(result.evidence.length, 1);
  assert.equal(result.accessBlocked, true);
  assert.ok(result.evidence.every(e => e.status === 403 && !e.tables.length));
});

test('discovery never follows external origin after a redirect', async () => {
  const page = {
    goto: async () => ({ status: () => 200 }),
    url: () => 'https://example.invalid/dashboard'
  };
  await assert.rejects(discoverNodusGoalSources(page), /fuera del origen autorizado/);
});
