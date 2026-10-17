import test from 'node:test';
import assert from 'node:assert/strict';
import { auditNodusApi } from '../auditNodusApi.mjs';

const result = (data, generated = '2026-10-12T11:30:00-05:00') => ({
  data, meta: { generado: generated }, source: 'NODUS_API', retrievedAt: '2026-10-12T16:30:00Z',
});

test('aggregate API audit verifies matching active-team IDs without returning participant data', async () => {
  const client = {
    getSedes: async () => result([{ id: 7, nombre: 'Lima', equipos: [{ id: 149 }, { id: 150 }] }]),
    getEquipos: async () => result([
      { id: 149, id_sede: 7, nombre: 'Equipo 32', sede: 'Lima' },
      { id: 150, id_sede: 7, nombre: 'Equipo 33', sede: 'Lima' },
    ]),
  };
  const audit = await auditNodusApi(client);
  assert.deepEqual(audit, { source: 'NODUS_API', generatedAt: '2026-10-12T11:30:00-05:00',
    sedeCount: 1, activeTeamCount: 2, integrity: 'verified', writes: 0 });
  assert.doesNotMatch(JSON.stringify(audit), /identificacion|telefono|participantes/);
});

test('aggregate audit rejects inconsistent sede/team results rather than publishing partial success', async () => {
  const client = {
    getSedes: async () => result([{ id: 7, nombre: 'Lima', equipos: [{ id: 149 }] }]),
    getEquipos: async () => result([{ id: 149, id_sede: 8, nombre: 'Equipo', sede: 'Otra sede' }]),
  };
  await assert.rejects(auditNodusApi(client), { code: 'cross_endpoint_scope_mismatch' });
});

test('aggregate audit rejects a team assigned to another sede in the nested feed', async () => {
  const client = {
    getSedes: async () => result([
      { id: 7, nombre: 'Lima', equipos: [{ id: 149 }] },
      { id: 8, nombre: 'Quito', equipos: [] },
    ]),
    getEquipos: async () => result([{ id: 149, id_sede: 8, nombre: 'Equipo', sede: 'Quito' }]),
  };
  await assert.rejects(auditNodusApi(client), { code: 'cross_endpoint_team_mismatch' });
});
