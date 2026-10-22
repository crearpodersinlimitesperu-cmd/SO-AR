export function resolveTaskCycleScope(task, { catalogTask = false, sede, cycle } = {}) {
  const hasDirectAssignees = Boolean(task?.assignedToEmail) ||
    (Array.isArray(task?.assignedToEmails) && task.assignedToEmails.length > 0);
  if (!catalogTask || task?.isCustom || hasDirectAssignees) return null;
  if (!sede?.trim() || typeof cycle?.id !== 'string' || !cycle.id.trim()) {
    throw new Error('Espera a que cargue el ciclo de la tarea antes de guardar los avances.');
  }
  return { sede, cycle };
}

export function getEffectiveCompletion(task, { sede, cycleId, cycleScoped = false } = {}) {
  if (cycleScoped) {
    const cycleCompletion = cycleId && sede
      ? task?.completions?.[`${sede}__${cycleId}`]
      : null;
    const completed = cycleCompletion?.completed === true;
    return {
      completed,
      status: completed ? 'Completada' : 'Pendiente',
      completion: cycleCompletion || null
    };
  }

  const sedeCompletion = sede ? task?.completions?.[sede] : null;
  if (sedeCompletion?.completed !== undefined) {
    const completed = sedeCompletion.completed === true;
    return {
      completed,
      status: sedeCompletion.status || (completed ? 'Completada' : 'Pendiente'),
      completion: sedeCompletion
    };
  }

  const completed = task?.completed === true || task?.status === 'Completada';
  return {
    completed,
    status: task?.status || (completed ? 'Completada' : 'Pendiente'),
    completion: null
  };
}

export function isCompletionTransition(previousCompleted, nextCompleted) {
  return previousCompleted !== true && nextCompleted === true;
}

export function taskClosureContext(task) {
  const comments = task?.comments ?? '';
  const evidenceUrl = task?.evidenceUrl ?? task?.evidence_url ?? '';
  const evidences = task?.evidences ?? [];
  if (typeof comments !== 'string' || comments.length > 500000 ||
      typeof evidenceUrl !== 'string' || evidenceUrl.length > 8192 ||
      !Array.isArray(evidences) || evidences.length > 100) {
    throw new Error('El comentario o las referencias de evidencia exceden el esquema de auditoría del cierre.');
  }
  return { comments, evidenceUrl, evidences };
}

export function isTaskClosedForDelivery(task, { completionScope, recipientEmail } = {}) {
  const isClosed = entry => Boolean(entry) && (
    entry.completed === true ||
    entry.status === 'Completada' ||
    entry.progress === 100 ||
    entry.progressPercentage === 100
  );

  const cycleScoped = Boolean(completionScope?.sede && completionScope?.cycleId);
  if (cycleScoped && isClosed(task?.completions?.[`${completionScope.sede}__${completionScope.cycleId}`])) return true;
  if (!cycleScoped && completionScope?.sede && isClosed(task?.completions?.[completionScope.sede])) return true;

  if (recipientEmail && task?.assigneeProgress && typeof task.assigneeProgress === 'object') {
    const email = String(recipientEmail).trim().toLowerCase()
      .replace('@crearpls.com', '@crearpsl.net')
      .replace('@crearpsl.com', '@crearpsl.net');
    const key = Object.keys(task.assigneeProgress).find(candidate => String(candidate).trim().toLowerCase()
      .replace('@crearpls.com', '@crearpsl.net')
      .replace('@crearpsl.com', '@crearpsl.net') === email);
    if (key && isClosed(task.assigneeProgress[key])) return true;
  }

  if (cycleScoped) return false;
  return isClosed(task);
}

export function hasAmbiguousCycleCompletionScope(task, { completionScope } = {}) {
  if (completionScope?.sede && completionScope?.cycleId) return false;
  return Object.keys(task?.completions || {}).some(key => key.includes('__'));
}

export function preserveClosedAssigneeProgress(previous = {}, requested = {}) {
  if (!previous || typeof previous !== 'object' || Array.isArray(previous) ||
      !requested || typeof requested !== 'object' || Array.isArray(requested)) return requested;
  const normalizeEmail = value => String(value || '').trim().toLowerCase()
    .replace('@crearpls.com', '@crearpsl.net')
    .replace('@crearpsl.com', '@crearpsl.net');
  const merged = { ...requested };

  Object.entries(previous).forEach(([previousKey, previousEntry]) => {
    const isClosed = previousEntry?.completed === true ||
      previousEntry?.status === 'Completada' ||
      previousEntry?.progress === 100 ||
      previousEntry?.progressPercentage === 100;
    if (!isClosed) return;
    const requestedKey = Object.keys(merged).find(key =>
      normalizeEmail(key) === normalizeEmail(previousKey)
    );
    if (!requestedKey) return;

    const entry = { ...merged[requestedKey] };
    ['completed', 'status', 'progress', 'progressPercentage', 'completedAt'].forEach(field => {
      if (field in previousEntry) entry[field] = previousEntry[field];
      else delete entry[field];
    });
    if ('completionId' in previousEntry) entry.completionId = previousEntry.completionId;
    merged[requestedKey] = entry;
  });

  return merged;
}

export function getTaskProgress(task) {
  if (typeof task?.progressPercentage === 'number') return task.progressPercentage;
  if (typeof task?.progress === 'number') return task.progress;
  return task?.completed === true || task?.status === 'Completada' ? 100 : 0;
}

export function applyCycleCompletion(task, { sede, cycleId } = {}) {
  const effective = getEffectiveCompletion(task, { sede, cycleId, cycleScoped: true });
  const entry = effective.completion;
  // Older entries stored progress only at the root. Recover it only when
  // there is a single cycle entry, so it cannot leak from another cycle.
  const legacyProgress = entry && Object.keys(task.completions || {}).filter(key => key.includes('__')).length === 1
    ? task : null;
  const progressPercentage = effective.completed ? 100 : entry
    ? getTaskProgress({
        progressPercentage: entry.progressPercentage ?? entry.progress ?? legacyProgress?.progressPercentage ?? legacyProgress?.progress,
        completed: effective.completed
      })
    : 0;
  return {
    ...task,
    completed: effective.completed,
    status: effective.completed ? 'Completada' : (progressPercentage > 0 ? 'En progreso' : effective.status),
    progressPercentage,
    progress: progressPercentage,
    completedAt: entry?.completedAt || null
  };
}

export function getNextCompletionState(updates) {
  if (typeof updates?.completed === 'boolean') return updates.completed;
  if (updates?.status === 'Completada') return true;
  if (['Pendiente', 'En progreso', 'En Progreso'].includes(updates?.status)) return false;
  if (typeof updates?.progressPercentage === 'number') return updates.progressPercentage >= 100;
  if (typeof updates?.progress === 'number') return updates.progress >= 100;
  return null;
}

export function createCycleCompletion(current = {}, { cycle, completed, updatedAt, completionId, updates = {} } = {}) {
  const progress = typeof updates.progressPercentage === 'number'
    ? updates.progressPercentage
    : (typeof updates.progress === 'number' ? updates.progress : (completed ? 100 : 0));
  return {
    ...current,
    completed: completed === true,
    status: completed === true ? 'Completada' : (progress > 0 ? 'En progreso' : 'Pendiente'),
    progressPercentage: progress,
    progress,
    cycleId: cycle?.id || current.cycleId || '',
    cycleName: cycle?.name || current.cycleName || '',
    updatedAt,
    ...(completed === true ? { completedAt: current.completedAt || updatedAt, completionId } : { completedAt: null })
  };
}
