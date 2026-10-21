export const MISSING_NODUS = '[DATO NO REGISTRADO EN NODUS]';
const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
export const isSpecialTeam = row => /\b(?:EQUIPO\s*#?\s*)?1000\b/.test(norm(row?.equipo));
export const isRecordedSeated = row => norm(row?.estadoC1) === 'SENTADO';
export function fallbackAttendance(row) {
  if (norm(row.asistencia) === 'ASISTIO') return 'SENTADO';
  if (norm(row.desertor) === 'DESERTOR') return 'DESERTOR';
  if ([row.llamada1, row.llamada2].some(value => norm(value) === 'CONFIRMADO')) return 'CONFIRMADO';
  return MISSING_NODUS;
}
export function recordedPhase(row) {
  for (const value of [row?.capitulo, row?.fase, row?.entrenamiento, row?.phase]) {
    const text = norm(value);
    if (/^(C1|CAPITULO (1|UNO))$/.test(text)) return 'C1';
    if (/^(C2|CAPITULO (2|DOS))$/.test(text)) return 'C2';
    if (/^(MJ|MAESTRIA DEL JUEGO)$/.test(text)) return 'MJ';
  }
  return null;
}
export function snapshotFreshness(timestamp, now = Date.now()) {
  const time = timestamp?.toMillis?.() ?? (timestamp?.seconds != null ? timestamp.seconds * 1000 : Date.parse(timestamp));
  if (!Number.isFinite(time) || time > now) return { stale: true, label: 'Fecha de sincronización no verificada' };
  const minutes = Math.floor((now - time) / 60000);
  return { stale: minutes >= 120, label: minutes < 1 ? 'Hace instantes' : minutes < 60 ? `Hace ${minutes} min` : `Hace ${Math.floor(minutes / 60)} h ${minutes % 60} m` };
}
export function participantMetrics(rows) {
  const eligible = rows.filter(row => !row.isManager && !row.isNodusTeam && !isSpecialTeam(row));
  return { total: eligible.length, seated: eligible.filter(isRecordedSeated).length,
    pending: eligible.filter(row => norm(row.estadoC1) === 'PENDIENTE').length };
}
