export function createCallOperationGate() {
  const operations = new Map();

  return {
    run(managerId, createCallId, operation) {
      const existing = operations.get(managerId);
      if (existing?.promise) return existing.promise;

      const callId = existing?.callId || createCallId();
      const entry = { callId, promise: null };
      entry.promise = Promise.resolve()
        .then(() => operation(callId))
        .then(
          result => {
            if (operations.get(managerId) === entry) operations.delete(managerId);
            return result;
          },
          error => {
            entry.promise = null;
            throw error;
          }
        );
      operations.set(managerId, entry);
      return entry.promise;
    },
  };
}
