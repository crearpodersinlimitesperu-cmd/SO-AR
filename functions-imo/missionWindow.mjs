export const MISSION_WINDOW_MS = 7 * 60 * 60 * 1000;
export const MISSION_EXTENSION_MS = 90 * 60 * 1000;
export const MISSION_TOTAL_WINDOW_MS = MISSION_WINDOW_MS + MISSION_EXTENSION_MS;

export function timestampMillis(value) {
  if (value?.toMillis) return value.toMillis();
  if (value?.toDate) return value.toDate().getTime();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? null : parsed;
}

export function getMissionWindow(openedAt, now = Date.now()) {
  const openedAtMs = timestampMillis(openedAt);
  if (!Number.isFinite(openedAtMs)) return null;
  const primaryDeadlineMs = openedAtMs + MISSION_WINDOW_MS;
  const finalDeadlineMs = openedAtMs + MISSION_TOTAL_WINDOW_MS;
  const phase = now < primaryDeadlineMs ? 'active' : now <= finalDeadlineMs ? 'extension' : 'expired';
  return {
    phase,
    openedAtMs,
    primaryDeadlineMs,
    finalDeadlineMs,
    remainingMs: phase === 'active' ? primaryDeadlineMs - now : phase === 'extension' ? finalDeadlineMs - now : 0,
  };
}

export const isMissionWindowOpen = (openedAt, now = Date.now()) => {
  const window = getMissionWindow(openedAt, now);
  return !!window && window.phase !== 'expired';
};
