import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFiLatestSnapshot, buildFiSnapshotChunks } from '../nodusMultiAgentSync.mjs';

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
