import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptC1Participant, matchReportParticipant } from '../imoC1SourceContract.mjs';
import { buildC1Index, reconcileC1 } from '../imoC1Reconciliation.mjs';
import { c1Eligibility } from '../../functions-imo/c1Eligibility.mjs';
import { readFileSync } from 'node:fs';

const row = { id: '2', id_equipo: '149', nombres: 'Synthetic', apellidos: 'Enrollee',
  telefono: '00000000', id_invitador: '8', nombre_imo: 'Synthetic Inviter', asistio_c1: 1 };
const detail = { ...row, capitulo1: 1, fecha_c1: '2026-10-23', asistencia: 'pendiente' };
test('future chapter registration never becomes attended or fabricated non-attendance', () => {
  for (const asistencia of ['pendiente', 'confirmado']) {
    const adapted = adaptC1Participant(row, { ...detail, asistencia });
    assert.equal(adapted.c1Registration.chapter, true);
    assert.equal(adapted.c1Registration.date, '2026-10-23');
    assert.equal(adapted.asistio_c1, null);
    const evidence = reconcileC1({ nombre: 'Synthetic Enrollee', telefono: row.telefono },
      { imoNombre: row.nombre_imo }, buildC1Index([adapted]), '2026-10-12T02:00:00Z');
    assert.equal(c1Eligibility(evidence), 'unverified');
    assert.equal(evidence.c1Verification, 'unverified');
  }
});
test('detail for a different person or destination is rejected', () => {
  for (const patch of [{ id: '8' }, { id_equipo: '141' }, { nombres: 'Inviter' }, { telefono: '11111111' }]) {
    assert.throws(() => adaptC1Participant(row, { ...detail, ...patch }));
  }
});
test('stable participant ID resolves stale display phone without allowing different owners or people', () => {
  const report = { ...row, imo: row.nombre_imo, nodusParticipantId: row.id, telefono: 'old display' };
  assert.equal(matchReportParticipant(report, [row]).length, 1);
  assert.equal(matchReportParticipant({ ...report, nodusParticipantId: '8' }, [row]).length, 0);
  assert.equal(matchReportParticipant({ ...report, imo: 'Other Inviter' }, [row]).length, 0);
  assert.equal(matchReportParticipant({ ...report, nombres: 'Other' }, [row]).length, 0);
  assert.equal(matchReportParticipant({ ...report, nodusParticipantId: undefined }, [row]).length, 0);
  assert.equal(matchReportParticipant({ ...report, nodusParticipantId: undefined, telefono: row.telefono }, [row]).length, 1);
});
test('scoped import cannot create campaigns or promote pending registration to eligibility', () => {
  const source = readFileSync(new URL('../syncImoLimaE32.mjs', import.meta.url), 'utf8');
  assert.match(source, /id_sede=7&id_equipo=149/);
  assert.match(source, /extractNodusC1Report\(page, '149', async \(\) =>/);
  assert.match(source, /\/reporte\?id_equipo=149/);
  assert.match(source, /adaptC1Participant\(row, detail\)/);
  assert.match(source, /db\.doc\(`imo_missions\/\$\{id\}`\)/);
  assert.doesNotMatch(source, /db\.(doc|collection)\(['"`](imo_campaign|goals)/);
  assert.doesNotMatch(source, /asistio_c1:\s*(false|0)|asistenciaC1:\s*(false|0)/);
  assert.match(source, /Authorized access or human verification required/);
  const recurring = readFileSync(new URL('../syncImoC1Eligibility.mjs', import.meta.url), 'utf8');
  assert.match(recurring, /safe\.asistio_c1=null/);
});
