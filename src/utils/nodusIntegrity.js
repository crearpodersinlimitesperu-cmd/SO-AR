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
export function recordedPhase(row, parentContext = null) {
  for (const value of [row?.capitulo, row?.fase, row?.entrenamiento, row?.phase, row?.ciclo, row?.equipo, row?.equipoNombre]) {
    const text = norm(value);
    if (/^(C1|CAPITULO (1|UNO)|CICLO (1|UNO))$/.test(text) || /\b(C1|CAPITULO 1|CICLO 1)\b/.test(text)) return 'C1';
    if (/^(C2|CAPITULO (2|DOS)|CICLO (2|DOS))$/.test(text) || /\b(C2|CAPITULO 2|CICLO 2)\b/.test(text)) return 'C2';
    if (/^(MJ|MAESTRIA DEL JUEGO)$/.test(text) || /\b(MJ|MAESTRIA DEL JUEGO)\b/.test(text)) return 'MJ';
  }
  if (parentContext) {
    for (const value of [parentContext?.ciclo, parentContext?.rol, parentContext?.entrenamiento, parentContext?.fase, parentContext?.capitulo]) {
      const text = norm(value);
      if (/\b(C1|CICLO 1|CAPITULO 1|COORDINADOR C1)\b/.test(text) && !/\b(C2|CICLO 2|CAPITULO 2)\b/.test(text)) return 'C1';
      if (/\b(C2|CICLO 2|CAPITULO 2|COORDINADOR C2)\b/.test(text) && !/\b(C1|CICLO 1|CAPITULO 1)\b/.test(text)) return 'C2';
      if (/\b(MJ|MAESTRIA)\b/.test(text)) return 'MJ';
    }
    if ((Number(parentContext?.c1) > 0 || Number(parentContext?.gestionesC1) > 0) &&
        Number(parentContext?.c2 || 0) === 0 && Number(parentContext?.gestionesC2 || 0) === 0) {
      return 'C1';
    }
    if ((Number(parentContext?.c2) > 0 || Number(parentContext?.gestionesC2) > 0) &&
        Number(parentContext?.c1 || 0) === 0 && Number(parentContext?.gestionesC1 || 0) === 0) {
      return 'C2';
    }
    if (norm(parentContext?.ciclo) === 'CICLO 2' || norm(parentContext?.ciclo) === 'C2') return 'C2';
    if (norm(parentContext?.ciclo) === 'CICLO 1' || norm(parentContext?.ciclo) === 'C1') return 'C1';
  }
  if (row?.llamadas || row?.confirmado || row?.asistieron) {
    return 'C1';
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
