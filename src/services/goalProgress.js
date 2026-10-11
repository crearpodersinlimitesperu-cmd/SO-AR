export function goalProgress(currentValue, targetValue) {
  const valid = value => value !== null && value !== undefined && value !== '' &&
    Number.isFinite(Number(value)) && Number(value) >= 0;
  const current = valid(currentValue) ? Number(currentValue) : null;
  const target = valid(targetValue) ? Number(targetValue) : null;
  const percent = current !== null && target > 0 ? Math.round(current / target * 100) : null;
  return {
    current,
    target,
    percent,
    barPercent: percent === null ? 0 : Math.min(100, percent),
    label: percent === null ? 'Sin avance calculable' : current > target ? 'Meta superada' :
      current === target ? 'Meta alcanzada' : 'En progreso'
  };
}

export function assignedQuotaTotals(assignments = []) {
  if (!Array.isArray(assignments)) return { current: null, target: null };
  const values = assignments.map(c => goalProgress(c.currentQuota, c.targetQuota));
  const sum = key => values.every(v => v[key] !== null)
    ? Math.round(values.reduce((total, v) => total + v[key], 0) * 100) / 100 : null;
  return { current: sum('current'), target: sum('target') };
}

export function isCallConfirmationGoal(goal) {
  const text = `${goal?.title || ''} ${goal?.kpi || ''}`.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /confirmad|confirmacion/.test(text) && !/sentad|participante|\bpx\b|aliado|manager|apoyo/.test(text);
}
