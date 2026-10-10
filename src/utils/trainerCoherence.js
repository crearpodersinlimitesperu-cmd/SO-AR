const text = value => String(value ?? '').trim();
const key = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');

export const coherenceSede = value => key(value).replace(/^(mexico|ciudad de mexico)$/, 'cdmx')
  .replace(/^gye$/, 'guayaquil').replace(/^uio$/, 'quito');
export const coherenceTeam = row => text(row.numEquipo ?? row.equipoNum) || key(row.equipo || row.nombreEquipo);
export const hasTrainerIdentity = row => Boolean(text(row.entrenadorId) || text(row.entrenadorEmail));
export const isCoherenceAdmin = user => !user?.isSimulated && [
  'jose.sanchez@crearpsl.net', 'jose.sanchez@crearpsl.com',
  'armando.pilacuan@gmail.com', 'paul.sosa@crearpsl.net',
].includes(key(user?.email));

export function resolveTrainerIdentity(row, users) {
  const id = text(row.entrenadorId);
  const email = key(row.entrenadorEmail);
  if (!id && !email) return { status: 'missing_identity' };
  // An explicit but invalid ID must never fall back to email or name.
  const candidates = users.filter(user => id ? text(user.docId) === id :
    [user.email, ...(Array.isArray(user.emails) ? user.emails : [])].some(value => key(value) === email));
  if (candidates.length !== 1) return { status: candidates.length ? 'ambiguous_identity' : 'unknown_identity' };
  const user = candidates[0];
  if (id && email && ![user.email, ...(Array.isArray(user.emails) ? user.emails : [])].some(value => key(value) === email)) {
    return { status: 'conflicting_identity' };
  }
  const inactive = user.activo === false || user.active === false ||
    ['inactivo', 'inactive', 'deshabilitado', 'archivado'].includes(key(user.estado || user.status));
  if (inactive) return { status: 'inactive_trainer', user };
  const label = text(user.name || user.displayName || user.nombre);
  return { status: 'resolved', user, label };
}

const activeManager = row => !['graduado', 'desertor', 'archivado', 'inactivo'].includes(key(row.estado));
const assigned = row => hasTrainerIdentity(row) || !['', '-', 'sin asignar', 'sin entrenador'].includes(key(row.entrenador));

export function auditTrainerCoherence({ managers = [], users = [], calls = [], cmj = [], sessions = [] } = {}) {
  const findings = [];
  const add = (source, index, code, row, repair = null) => findings.push({
    source, index, code, sede: coherenceSede(row.sede), team: coherenceTeam(row), repair,
  });
  const inspect = (rows, source) => rows.forEach((row, index) => {
    if (source === 'managers' && !activeManager(row)) return;
    if (!assigned(row)) {
      if (source === 'managers') add(source, index, 'unassigned_manager', row);
      return;
    }
    const resolved = resolveTrainerIdentity(row, users);
    if (resolved.status !== 'resolved') {
      add(source, index, resolved.status, row);
      return;
    }
    if (resolved.label && text(row.entrenador) !== resolved.label) {
      const repair = source === 'managers' && row.docId && row.entrenadorId
        ? { managerDocId: row.docId, trainerDocId: resolved.user.docId, before: text(row.entrenador), after: resolved.label }
        : null;
      add(source, index, 'label_mismatch', row, repair);
    }
  });
  inspect(managers, 'managers');
  inspect(calls, 'calls');
  inspect(cmj, 'cmj');
  inspect(sessions, 'sessions');
  // Only an explicit manager document ID links a call/CMJ accompaniment
  // record to the directory. Row numbers, names and FDS are not that ID.
  for (const [source, rows] of [['calls', calls], ['cmj', cmj]]) {
    rows.forEach((row, index) => {
      if (!row.managerDocId) {
        add(source, index, 'unlinked_record', row);
        return;
      }
      const candidates = managers.filter(manager => manager.docId === row.managerDocId);
      if (candidates.length !== 1) {
        add(source, index, 'unknown_manager', row);
        return;
      }
      const manager = candidates[0];
      if (!activeManager(manager)) return;
      if (!row.sede || !manager.sede || !coherenceTeam(row) || !coherenceTeam(manager)) {
        add(source, index, 'missing_scope', row);
      } else if (coherenceSede(row.sede) !== coherenceSede(manager.sede) || coherenceTeam(row) !== coherenceTeam(manager)) {
        add(source, index, 'scope_mismatch', row);
      } else {
        const left = resolveTrainerIdentity(manager, users);
        const right = resolveTrainerIdentity(row, users);
        if (left.status === 'resolved' && right.status === 'resolved' && left.user.docId !== right.user.docId) {
          add(source, index, 'assignment_mismatch', row);
        }
      }
    });
  }
  const counts = {};
  for (const finding of findings) counts[finding.code] = (counts[finding.code] || 0) + 1;
  return { findings, counts, records: { managers: managers.length, users: users.length, calls: calls.length, cmj: cmj.length, sessions: sessions.length } };
}

export function flattenSessionAssignments(documents) {
  return documents.flatMap(document => Object.entries(document).filter(([field, value]) =>
    field !== 'docId' && value && typeof value === 'object' && !Array.isArray(value) && 'entrenador' in value
  ).map(([slot, value]) => ({ sede: document.sede, equipo: document.equipo, ...value, assignmentDocId: document.docId, slot })));
}

export function preserveExplicitTrainerAssignment(existing, incoming) {
  if (!hasTrainerIdentity(existing || {})) return incoming;
  return Object.fromEntries(Object.entries(incoming).filter(([field]) =>
    !['entrenador', 'tieneEntrenador', 'entrenadorId', 'entrenadorEmail'].includes(field)));
}

export function assertLegacyTrainerEdit(existing, trainerLabel) {
  if (hasTrainerIdentity(existing || {}) && text(existing.entrenador) !== text(trainerLabel)) {
    throw new Error('Asignación con identidad explícita: no puede cambiarse mediante un selector de nombres. Requiere reasignación por ID verificada.');
  }

}

export function matchesExplicitTrainer(row, user) {
  if (!hasTrainerIdentity(row)) return null;
  if (row.entrenadorId) {
    if (text(row.entrenadorId) !== text(user?.uid)) return false;
    return !row.entrenadorEmail || key(row.entrenadorEmail) === key(user?.email);
  }
  return Boolean(key(user?.email) && key(row.entrenadorEmail) === key(user.email));
}
