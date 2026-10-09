import test from 'node:test';
import assert from 'node:assert/strict';
import { groupCampaignsByTeam } from './publicLinks.js';

test('agrupa campañas por equipo, activas y C1 más reciente primero', () => {
  const groups = groupCampaignsByTeam([
    { id: 'a', targetTeam: 30, c1Date: '2026-08-01', status: 'closed' },
    { id: 'b', targetTeam: 31, c1Date: '2026-09-01', status: 'active' },
    { id: 'c', targetTeam: 30, c1Date: '2026-07-01', status: 'active' },
    { id: 'd', targetTeam: 30, c1Date: '2026-09-15', status: 'closed' },
  ]);
  assert.deepEqual(groups.map(g => g.team), [31, 30]);
  assert.deepEqual(groups[1].campaigns.map(c => c.id), ['c', 'd', 'a']);
  assert.equal(groups[1].hasActive, true);
});

test('ignora campañas sin equipo válido o sin id', () => {
  const groups = groupCampaignsByTeam([{ id: 'x', targetTeam: 0 }, { targetTeam: 5 }, { id: 'y', targetTeam: 'abc' }, null]);
  assert.deepEqual(groups, []);
});

test('equipo solo con campañas cerradas queda marcado sin activa', () => {
  const [g] = groupCampaignsByTeam([{ id: 'z', targetTeam: 12, c1Date: '2026-01-01', status: 'closed' }]);
  assert.equal(g.hasActive, false);
});
