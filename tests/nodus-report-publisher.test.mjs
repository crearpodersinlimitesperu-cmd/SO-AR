import test from 'node:test';
import assert from 'node:assert/strict';
import { loadReportSnapshot, publishNodusReportSources } from '../scripts/publishNodusReportSources.mjs';

const timestamp = '2026-10-10T09:25:22.640Z';
const root = { timestamp, equiposReporte: [{ equipoId: '1', equipoNombre: 'EQUIPO 32 - LIMA CICLO 1' }] };
function readOnlyDb(teams) {
  return {
    doc: () => ({ get: async () => ({ exists: true, data: () => root }) }),
    collection: () => ({ get: async () => ({ size: teams.length, docs: teams.map(team => ({ data: () => team })) }) })
  };
}
test('read-only loader accepts granular rows only from the exact current snapshot', async () => {
  const rows = [{ grupoReporte: 'Nuevo', llamada1: 'Confirmado', nombres: 'PRIVATE' }];
  const stale = await loadReportSnapshot(readOnlyDb([{ ...root.equiposReporte[0], timestamp: '2026-09-16', participantes: rows }]));
  assert.equal(stale.snapshot.equiposReporte[0].participantes, undefined);
  assert.equal(stale.inventory.currentGranularTeams, 0);
  const current = await loadReportSnapshot(readOnlyDb([{ ...root.equiposReporte[0], timestamp, participantes: rows }]));
  assert.deepEqual(current.snapshot.equiposReporte[0].participantes, rows);
  assert.equal(JSON.stringify(current.inventory).includes('PRIVATE'), false);
});
test('publishing persists only 12 aggregate sources, not participants or Nodus mutations', async () => {
  const writes = [];
  let commits = 0;
  const db = {
    collection: name => ({ doc: id => ({ name, id }) }),
    batch: () => ({
      set: (ref, data) => writes.push({ ref, data }),
      commit: async () => { commits++; }
    })
  };
  await publishNodusReportSources(db, { timestamp, equiposReporte: [{ ...root.equiposReporte[0], participantes: [{ grupoReporte: 'Nuevo', llamada1: 'Confirmado', nombres: 'PRIVATE', telefono: 'PRIVATE' }] }] });
  assert.equal(commits, 1);
  assert.equal(writes.length, 12);
  assert.equal(writes.every(w => w.ref.name === 'nodus_report_sources'), true);
  assert.equal(JSON.stringify(writes).includes('PRIVATE'), false);
  assert.equal(writes[0].data.teams[0].counts.nuevos_OK, 1);
});
