export function nodusValidationLabel(stats) {
  if (!stats.totalReportadosImo) return 'Sin confirmaciones IMO para comparar';
  if (stats.totalDiscrepancias > 0) return `${stats.totalDiscrepancias} discrepancias`;
  if (stats.totalPendientesCoord > 0 || stats.totalValidadosLlamada < stats.totalReportadosImo) return 'Validación pendiente de coordinación o sincronización';
  return '✅ Coordinadoras coinciden';
}
