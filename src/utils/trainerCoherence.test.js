import test from 'node:test';
import assert from 'node:assert/strict';
import { auditTrainerCoherence, resolveTrainerIdentity, preserveExplicitTrainerAssignment, isCoherenceAdmin, assertLegacyTrainerEdit, matchesExplicitTrainer } from './trainerCoherence.js';

const users = [
  { docId: 'u1', name: 'Coach Uno', email: 'uno@example.test', sede: 'Lima' },
  { docId: 'u2', name: 'Coach Uno', email: 'dos@example.test', sede: 'Quito' },
  { docId: 'u3', name: 'Retirado', activo: false },
];
const manager = { docId: 'm1', entrenadorId: 'u1', entrenador: 'Coach Uno', sede: 'Lima', numEquipo: 30 };
const run = overrides => auditTrainerCoherence({ users, managers: [manager], ...overrides });

test('explicit ID distinguishes homonyms, without restricting travelling trainers to their home sede', () => {
  assert.equal(resolveTrainerIdentity({ entrenadorId: 'u2', entrenador: 'Coach Uno', sede: 'Lima' }, users).user.docId, 'u2');
  assert.equal(resolveTrainerIdentity({ entrenador: 'Coach Uno', sede: 'Lima' }, users).status, 'missing_identity');
});
test('invalid IDs cannot fall back to matching email or name', () => {
  assert.equal(resolveTrainerIdentity({ entrenadorId: 'absent', entrenadorEmail: 'uno@example.test' }, users).status, 'unknown_identity');
  assert.equal(resolveTrainerIdentity({ entrenadorId: 'u1', entrenadorEmail: 'dos@example.test' }, users).status, 'conflicting_identity');
});
test('duplicate explicit emails are ambiguous', () => {
  assert.equal(resolveTrainerIdentity({ entrenadorEmail: 'uno@example.test' }, [...users, { docId: 'u4', email: 'uno@example.test' }]).status, 'ambiguous_identity');
});
test('inactive coach is detected, inactive manager remains historical and is not repaired', () => {
  assert.equal(run({ managers: [{ ...manager, entrenadorId: 'u3' }] }).counts.inactive_trainer, 1);
  assert.equal(run({ managers: [{ ...manager, estado: 'Graduado', entrenador: 'Old' }] }).findings.length, 0);
});
test('manager without assignment is reported, never default-assigned', () => {
  const result = run({ managers: [{ ...manager, entrenadorId: '', entrenador: '' }] });
  assert.equal(result.counts.unassigned_manager, 1);
  assert.equal(result.findings[0].repair, null);
});
test('only explicit ID-backed directory labels are repairable', () => {
  const result = run({ managers: [{ ...manager, entrenador: 'Old label' }] });
  assert.deepEqual(result.findings[0].repair, { managerDocId: 'm1', trainerDocId: 'u1', before: 'Old label', after: 'Coach Uno' });
  assert.equal(run({ managers: [{ ...manager, entrenadorId: '', entrenadorEmail: 'uno@example.test', entrenador: 'Old' }] }).findings[0].repair, null);
});
test('calls and CMJ accompaniment mismatch requires manager ID and matching sede/team', () => {
  const linked = { ...manager, managerDocId: 'm1', entrenadorId: 'u2' };
  assert.equal(run({ calls: [linked], cmj: [linked] }).counts.assignment_mismatch, 2);
  assert.equal(run({ calls: [{ ...linked, sede: 'Quito' }] }).counts.scope_mismatch, 1);
  assert.equal(run({ calls: [{ ...linked, numEquipo: 31 }] }).counts.scope_mismatch, 1);
  assert.equal(run({ calls: [{ ...linked, sede: '' }] }).counts.missing_scope, 1);
});
test('unlinked rows never match managers by homonymous names or row IDs', () => {
  const result = run({ calls: [{ ...manager, id: 'm1', entrenadorId: 'u2' }] });
  assert.equal(result.counts.unlinked_record, 1);
  assert.equal(result.counts.assignment_mismatch, undefined);
});
test('FDS coach is a different role, never forced to equal the accompaniment coach', () => {
  assert.equal(run({ sessions: [{ ...manager, entrenadorId: 'u2' }] }).findings.length, 0);
});
test('sheet sync cannot overwrite explicit confirmed coach assignments', () => {
  assert.deepEqual(preserveExplicitTrainerAssignment(manager, { entrenador: 'Sheet', tieneEntrenador: false, estado: 'Activo' }), { estado: 'Activo' });
});
test('repair access is explicit and excludes simulated users', () => {
  assert.equal(isCoherenceAdmin({ email: 'coach@example.test', isSuperAdmin: true }), false);
  assert.equal(isCoherenceAdmin({ email: 'paul.sosa@crearpsl.net' }), true);
  assert.equal(isCoherenceAdmin({ email: 'paul.sosa@crearpsl.net', isSimulated: true }), false);
});
test('name-only edits cannot leave a stale confirmed trainer ID behind', () => {
  assert.throws(() => assertLegacyTrainerEdit(manager, 'Other'), /identidad explícita/);
  assert.doesNotThrow(() => assertLegacyTrainerEdit(manager, manager.entrenador));
  assert.doesNotThrow(() => assertLegacyTrainerEdit({ entrenador: 'Legacy' }, 'Other'));
});
test('explicit identity takes precedence over legacy trainer name visibility', () => {
  assert.equal(matchesExplicitTrainer(manager, { uid: 'u2', name: 'Coach Uno' }), false);
  assert.equal(matchesExplicitTrainer(manager, { uid: 'u1' }), true);
  assert.equal(matchesExplicitTrainer({ entrenadorEmail: 'uno@example.test' }, { email: 'dos@example.test' }), false);
  assert.equal(matchesExplicitTrainer({ entrenador: 'Legacy' }, {}), null);
});
