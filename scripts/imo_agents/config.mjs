export const CONFIG = {
  IMO_URL: 'https://imo.crearpslglobal.com/',
  CREDENTIALS: {
    username: process.env.NODUS_USER || process.env.NODUS_GLOBAL_USER,
    password: process.env.NODUS_PASSWORD || process.env.NODUS_GLOBAL_PASS
  },
  PATHS: {
    metricsOutput: '../src/data/kpisNodus.json',
    reportsDir: '../src/data/reports/'
  },
  SUPERVISOR: {
    intervalMinutes: 60, // Correr cada 1 hora
    maxRetries: 3
  }
};
