export function buildUnverifiedFallbackReport(fallbackAccounts) {
  return {
    accountCount: fallbackAccounts.length,
    accountsWithLastConnection: null,
    lastConnectionColumn: null,
    statusColumn: null,
    statusCounts: {},
    columns: ['Usuario', 'Correo / Identificador', 'Sede', 'Rol / Cargo', 'Pendientes', 'Últ. conexión', 'Estado'],
    coverage: 'unknown',
    publishedAt: null,
    source: 'Respaldo estático; cobertura y fecha de origen no verificadas',
  };
}
