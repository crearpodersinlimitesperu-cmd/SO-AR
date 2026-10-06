// Server-side contract: reported changes never overwrite the official Nodus snapshot.
export function normalizeDocument(value) {
  const document = String(value || '').normalize('NFKC').trim().toUpperCase().replace(/[ .-]/g, '');
  if (!/^[A-Z0-9]{6,20}$/.test(document)) throw new Error('Documento inválido.');
  return document;
}
export function scopedEnrollee(records, imoId, enrolleeId) {
  const matches = records.filter(row => row.id === enrolleeId && row.imoId === imoId);
  if (matches.length !== 1) throw new Error('La asignación no está verificada.');
  return matches[0];
}
export function projectEnrollee(row) {
  // Do not disclose documents, emails, payment amounts, addresses or other profiles.
  return {
    id: row.id, nombre: row.nombre, sede: row.sede,
    originTeam: row.originTeam, currentTeam: row.currentTeam,
    asistenciaC1: row.asistenciaC1 ?? null, asistenciaC2: row.asistenciaC2 ?? null,
    llamada1: row.llamada1 || '', llamada2: row.llamada2 || '',
    coordinadorNombre: row.coordinadorNombre || '',
    source: 'Nodus', sourceUpdatedAt: row.sourceUpdatedAt,
  };
}
export function buildImoRequest({ requestId, actorId, enrollee, type, targetEvent, attendance, note, at }) {
  if (!requestId || actorId !== enrollee.imoId) throw new Error('No autorizado.');
  if (!enrollee.coordinadorId || !enrollee.coordinadorEmail) throw new Error('Falta verificar el coordinador C1/C2 asignado en Nodus.');
  if (!['team_change', 'attendance_confirmation', 'contact_update'].includes(type)) throw new Error('Novedad inválida.');
  if (type === 'team_change' && (!targetEvent?.id || targetEvent.sede !== enrollee.sede || targetEvent.stage !== 'C1' || targetEvent.team === enrollee.currentTeam || !targetEvent.date)) throw new Error('Selecciona otro equipo C1 del calendario de tu sede.');
  if (type === 'attendance_confirmation' && typeof attendance !== 'boolean') throw new Error('Confirmación inválida.');
  if (String(note || '').length > 1000) throw new Error('El comentario supera 1000 caracteres.');
  return {
    id: requestId, imoId: actorId, enrolleeId: enrollee.id, sede: enrollee.sede,
    type, status: 'pending_coordinator', createdAt: at, updatedAt: at,
    assignedCoordinatorId: enrollee.coordinadorId,
    assignedCoordinatorEmail: enrollee.coordinadorEmail.toLowerCase(),
    note: String(note || '').trim(),
    before: { currentTeam: enrollee.currentTeam, asistenciaC1: enrollee.asistenciaC1 ?? null, sourceUpdatedAt: enrollee.sourceUpdatedAt },
    requested: type === 'team_change' ? { team: targetEvent.team, c1Date: targetEvent.date, calendarEventId: targetEvent.id } : type === 'attendance_confirmation' ? { attendance } : { contacted: true },
  };
}
export function reviewImoRequest(request, coordinator, decision, note, at) {
  if (coordinator.id !== request.assignedCoordinatorId || String(coordinator.email || '').toLowerCase() !== request.assignedCoordinatorEmail || !coordinator.active || coordinator.sede !== request.sede) throw new Error('Solo C1/C2 asignado puede resolver esta solicitud.');
  if (request.status !== 'pending_coordinator') throw new Error('La solicitud ya fue resuelta.');
  if (!['approve', 'reject'].includes(decision)) throw new Error('Decisión inválida.');
  if (String(note || '').length > 1000) throw new Error('El comentario supera 1000 caracteres.');
  return { ...request, status: decision === 'approve' ? 'approved_pending_nodus' : 'rejected', reviewedBy: coordinator.id, reviewedAt: at, updatedAt: at, reviewNote: String(note || '').trim() };
}
export function reconcileApprovedRequest(request, nodusEnrollee, at) {
  if (request.status !== 'approved_pending_nodus' || request.type !== 'team_change') return request;
  if (request.enrolleeId !== nodusEnrollee.id || request.imoId !== nodusEnrollee.imoId || request.sede !== nodusEnrollee.sede || request.requested.team !== nodusEnrollee.currentTeam || Date.parse(nodusEnrollee.sourceUpdatedAt) <= Date.parse(request.reviewedAt)) return request;
  return { ...request, status: 'confirmed_in_nodus', updatedAt: at, confirmedAt: at, nodusSourceUpdatedAt: nodusEnrollee.sourceUpdatedAt };
}
