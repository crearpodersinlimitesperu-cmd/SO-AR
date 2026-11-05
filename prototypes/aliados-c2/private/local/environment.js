export const demoProject = 'demo-aliados-c2';
export const emulatorPorts = Object.freeze({ auth: 9198, firestore: 8198 });

export function assertLocalDemo(projectId, hostname) {
  if (projectId !== demoProject || !projectId.startsWith('demo-')
    || !['127.0.0.1', 'localhost', '[::1]', '::1'].includes(hostname)) {
    throw new Error('Acceso bloqueado: esta superficie solo admite demo-aliados-c2 en loopback. No existe conexión de producción.');
  }
}

export function assertEmulatorEnvironment(env) {
  assertLocalDemo(env.GCLOUD_PROJECT, '127.0.0.1');
  if (env.FIREBASE_AUTH_EMULATOR_HOST !== `127.0.0.1:${emulatorPorts.auth}`
    || env.FIRESTORE_EMULATOR_HOST !== `127.0.0.1:${emulatorPorts.firestore}`) {
    throw new Error('Fixtures bloqueados: se requieren ambos emuladores loopback y el proyecto demo exacto.');
  }
}
