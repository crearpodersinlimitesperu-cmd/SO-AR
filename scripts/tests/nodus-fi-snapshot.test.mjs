import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildFiLatestSnapshot, buildFiSnapshotChunks } from '../nodusMultiAgentSync.mjs';
import { resolveFISource } from '../../src/services/nodusFISnapshot.js';

function makeParticipant(id) {
  return {
    id: `p-${id}`,
    nombre: `Participante ${id}`,
    sede: 'Lima',
    equipo: 'EQUIPO 32',
    asistioPFD: true,
    totalFi: 5,
    pendientes: 1,
    devueltos: 1,
    aprobados: 3,
    fis: Array.from({ length: 5 }, (_, idx) => ({ area: `Área ${idx + 1}`, estado: 'aprobado' }))
  };
}

test('FI snapshot publication is chunked and compact at the latest document', () => {
  const participantes = Array.from({ length: 350 }, (_, index) => makeParticipant(index));
  const chunks = buildFiSnapshotChunks(participantes);
  const latest = buildFiLatestSnapshot(participantes, { resumen: { totalParticipantes: participantes.length } }, '2026-10-14T00:00:00Z');

  assert.equal(chunks.length, 4);
  assert.equal(chunks[0].participantes.length, 100);
  assert.equal(chunks[3].participantes.length, 50);
  assert.ok(!Object.hasOwn(latest, 'participantes'));
  assert.equal(latest.participantChunks, 4);
  assert.equal(latest.universePfd, 350);
  assert.equal(latest.extractedAt, '2026-10-14T00:00:00Z');
});

const publisherSource = readFileSync(new URL('../nodusMultiAgentSync.mjs', import.meta.url), 'utf8');
const viewSource = readFileSync(new URL('../../src/components/FuturosImposiblesView.jsx', import.meta.url), 'utf8');

for (const completeness of ['complete', 'partial']) {
  test(`chunk publisher preserves ${completeness} isolation and source metadata`, async () => {
    const participantesFI = [makeParticipant(1)];
    const writes = [];
    const deleted = [];
    const adminDb = {
      collection: name => ({
        doc: id => ({
          collection: child => ({
            get: async () => ({ docs: [{ id: 'old', ref: `${name}/${id}/${child}/old` }] }),
            doc: chunk => `${name}/${id}/${child}/${chunk}`
          }),
          path: `${name}/${id}`
        })
      }),
      batch: () => {
        const pending = [];
        return {
          delete: ref => pending.push(() => deleted.push(ref)),
          set: (ref, payload) => pending.push(() => writes.push({ path: ref.path || ref, payload })),
          commit: async () => pending.forEach(write => write())
        };
      }
    };
    const fiResult = {
      completeness, completenessReasons: completeness === 'partial' ? ['Blocked page'] : [],
      coverage: [{ sede: 'Lima', status: 'ok' }], expectedTotal: 1, passes: 2,
      blocked: [], sedeEquipoDiscrepancies: { total: 0, sinSede: 0, detalle: [] }
    };
    const start = publisherSource.indexOf('      const snapshotMeta = {');
    const end = publisherSource.indexOf("      await adminDb.collection('nodus_fi_sync_history').add", start);
    assert.ok(start >= 0 && end > start);
    await runInNewContext(`(async () => { ${publisherSource.slice(start, end)} })()`, {
      adminDb, fiResult, participantesFI, fiDiag: { resumen: { totalParticipantes: 1 } },
      syncId: '2026-10-22T00:00:00Z', buildFiLatestSnapshot, buildFiSnapshotChunks,
      FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' }
    });
    const target = completeness === 'complete' ? 'latest' : 'latest_partial';
    assert.equal(writes.length, 2);
    assert.equal(writes[0].path, `nodus_futuros_imposibles/${target}/participantes/chunk_0000`);
    assert.equal(writes[1].path, `nodus_futuros_imposibles/${target}`);
    assert.equal(deleted[0], `nodus_futuros_imposibles/${target}/participantes/old`);
    assert.equal(writes[1].payload.completeness, completeness);
    assert.equal(writes[1].payload.expectedTotal, 1);
    assert.equal(writes[1].payload.participantChunks, 1);
    assert.ok(!Object.hasOwn(writes[1].payload, 'participantes'));
  });
}

test('FI view reconstructs chunks without losing freshness or completeness metadata', async () => {
  const now = Date.parse('2026-10-22T00:00:00Z');
  const payload = {
    participantChunks: 2, universePfd: 2, completeness: 'partial',
    completenessReasons: ['Blocked page'], extractedAt: new Date(now - 60_000).toISOString()
  };
  const first = makeParticipant(1);
  const second = makeParticipant(2);
  const match = viewSource.match(/const readLiveFISnapshot = async \(\) => \{([\s\S]*?)\n  \};/);
  assert.ok(match);
  let chunkReads = 0;
  const read = async root => runInNewContext(`(async () => { ${match[1]} })()`, {
    db: {}, doc: (...parts) => parts, collection: (...parts) => parts,
    getDocFromServer: async () => ({ exists: () => root !== null, data: () => root }),
    getDocsFromServer: async () => {
      chunkReads += 1;
      return { docs: [
        { data: () => ({ index: 1, extractedAt: payload.extractedAt, participantes: [second] }) },
        { data: () => ({ index: 0, extractedAt: payload.extractedAt, participantes: [first] }) }
      ] };
    }
  });
  const reconstructed = await read(payload);
  assert.deepEqual(Array.from(reconstructed.participantes, p => p.id), ['p-1', 'p-2']);
  assert.equal(reconstructed.completeness, 'partial');
  assert.equal(resolveFISource(reconstructed, [], now).sourceState.status, 'partial');
  assert.equal(resolveFISource(reconstructed, [], now + 3 * 60 * 60_000).sourceState.status, 'stale');
  assert.equal(await read(null), null);
  const legacy = await read({ ...payload, participantes: [first] });
  assert.equal(legacy.participantes[0], first);
  assert.equal(chunkReads, 1);
  await assert.rejects(read({ ...payload, extractedAt: 'different-generation' }),
    /publicación FI cambió o está incompleta/);
  await assert.rejects(read({ ...payload, participantChunks: 3 }), /publicación FI cambió o está incompleta/);
  await assert.rejects(read({ ...payload, universePfd: 3 }), /total de participantes FI/);
  assert.equal((viewSource.match(/await readLiveFISnapshot\(\)/g) || []).length, 2);
});
