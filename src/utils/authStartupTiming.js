// User Timing local, sin correos, UID ni datos de perfil. No envia telemetria.
export function createAuthStartupTrace() {
  const timing = globalThis.performance;
  const startedAt = timing.now();
  let awaitingAuth = true;
  let finished = false;
  const record = (phase, start) => {
    timing.measure(`causa-auth:${phase}`, { start, end: timing.now() });
  };
  return {
    authReady() {
      if (awaitingAuth) {
        record('auth-state-wait', startedAt);
        awaitingAuth = false;
      }
    },
    async measure(phase, task) {
      const start = timing.now();
      try {
        return await task();
      } finally {
        if (!finished) record(phase, start);
      }
    },
    finish() {
      if (!finished) {
        record('total-to-gate', startedAt);
        finished = true;
      }
    }
  };
}
