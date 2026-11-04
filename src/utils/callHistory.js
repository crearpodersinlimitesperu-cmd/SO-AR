export const isActiveCall = call => !['anulada', 'duplicada'].includes(call?.estadoRegistro);

export const callHistorySignature = history => JSON.stringify(history.map(call => [
  call.id || call.callId, call.fecha, call.asistio, call.asistieron,
  call.llamadaEfectiva, call.estadoRegistro || 'activa', call.revision || 0,
]));

export function operationalCallMetrics(managers, groups) {
  const individual = managers.flatMap(manager => (manager.llamadasHistorial || [])
    .filter(call => call.tipo !== 'grupal'));
  const activeIndividuals = individual.filter(isActiveCall);
  const activeGroups = groups.filter(isActiveCall);
  return {
    individual: activeIndividuals.length,
    grupal: activeGroups.length,
    efectivas: activeIndividuals.filter(call => call.llamadaEfectiva === true || call.asistio === true || call.asistio === 'SI').length +
      activeGroups.filter(call => call.asistieron > 0).length,
    anuladas: individual.length + groups.length - activeIndividuals.length - activeGroups.length,
  };
}

export function callSettlement({ effectiveCount, payment, closed = false, hasCorrections = false, fee = 25 }) {
  const paid = payment?.estado === 'pagado';
  return {
    eligible: paid || (hasCorrections ? effectiveCount > 0 : effectiveCount > 0 || closed || Boolean(payment)),
    amount: paid ? Number(payment.montoUSD || 0)
      : hasCorrections ? effectiveCount * fee
      : payment?.montoUSD ? Number(payment.montoUSD) : Math.max(fee, effectiveCount * fee),
  };
}
