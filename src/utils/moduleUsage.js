export const HALF_LIFE_MS = 14 * 86400000;
export const emptyUsage = () => ({ version: 1, modules: {} });
export const canUseLocalUsage = (user, originalAdminUser) =>
  Boolean(user?.uid && !user.isSimulated && !user.isParticipantOnly && !originalAdminUser);
export const usageKey = user => `causa:module-usage:v1:${user.uid}`;
export const decayedScore = (entry, now) =>
  entry.score * 2 ** (-Math.max(0, now - entry.updatedAt) / HALF_LIFE_MS);

export function parseUsage(value, knownIds, now = Date.now()) {
  if (!value || value.version !== 1 || !value.modules ||
      typeof value.modules !== 'object' || Array.isArray(value.modules)) {
    throw new Error('Formato del historial de uso no válido');
  }
  const modules = {};
  for (const [id, entry] of Object.entries(value.modules)) {
    if (!knownIds.includes(id) || !entry ||
        !Number.isFinite(entry.score) || entry.score <= 0 || entry.score > 1_000_000 ||
        !Number.isSafeInteger(entry.visits) || entry.visits < 1 || entry.visits > 1_000_000 ||
        !Number.isSafeInteger(entry.updatedAt) || entry.updatedAt < 0 || entry.updatedAt > now) {
      throw new Error('Entrada del historial de uso no válida');
    }
    modules[id] = { score: entry.score, visits: entry.visits, updatedAt: entry.updatedAt };
  }
  return { version: 1, modules };
}

export function readUsage(storage, user, originalAdminUser, knownIds, now = Date.now()) {
  if (!canUseLocalUsage(user, originalAdminUser)) return emptyUsage();
  const raw = storage.getItem(usageKey(user));
  return raw === null ? emptyUsage() : parseUsage(JSON.parse(raw), knownIds, now);
}

export function recordUsage(storage, user, originalAdminUser, id, allowedIds, knownIds, now = Date.now()) {
  if (!canUseLocalUsage(user, originalAdminUser) || !allowedIds.includes(id) || !knownIds.includes(id)) return null;
  const usage = readUsage(storage, user, originalAdminUser, knownIds, now);
  const previous = usage.modules[id];
  usage.modules[id] = {
    score: Math.min(1_000_000, (previous ? decayedScore(previous, now) : 0) + 1),
    visits: Math.min(1_000_000, (previous?.visits || 0) + 1),
    updatedAt: now
  };
  storage.setItem(usageKey(user), JSON.stringify(usage));
  return usage;
}

export function resetUsage(storage, user, originalAdminUser) {
  if (!canUseLocalUsage(user, originalAdminUser)) return false;
  storage.removeItem(usageKey(user));
  return true;
}

export function frequentModules(usage, allowedModules, now = Date.now()) {
  return allowedModules
    .filter(mod => {
      const entry = usage?.modules[mod.id];
      return entry?.visits >= 2 && decayedScore(entry, now) >= 1.5;
    })
    .sort((a, b) => decayedScore(usage.modules[b.id], now) - decayedScore(usage.modules[a.id], now))
    .slice(0, 6);
}
