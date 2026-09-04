export const CONFIG = {
  IMO_URL: 'https://imo.crearpslglobal.com/',
  CREDENTIALS: {
    username: 'CREARPSL',
    password: 'CREARPSL26*'
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
