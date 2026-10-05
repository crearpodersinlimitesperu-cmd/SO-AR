// An IMO's origin team and an enrollee's C1 destination are distinct identities.
export const normalizeText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
export const teamNumber = value => {
  const match = String(value || '').match(/^(?:EQUIPO\s*)?(\d+)\b/i);
  return match ? Number(match[1]) : null;
};
export const isMissionComplete = enrolados => enrolados.length > 0 && enrolados.every(e => e.contacto === true && e.asistencia === true);
export const missionProgress = enrolados => enrolados.length ? Math.round(100 * enrolados.filter(e => e.contacto === true && e.asistencia === true).length / enrolados.length) : 0;
export function confirmedStatus(value) {
  const s = normalizeText(value);
  if (!s || /\b(NO|SIN|PENDIENTE|POR|DESERTOR|DESERTO|CANCELADO)\b/.test(s)) return false;
  return /^(SI|TRUE|CONFIRMADO|CONFIRMADA|ASISTE|ASISTIO|SENTADO|SENTADA|PAGADO|PAGADA|ABONO)(\b|$)/.test(s);
}
export const campaignUrl = id => `https://centro-operativo-cpsl.web.app/mision-imo?campana=${encodeURIComponent(id)}`;
export function validateCampaign({ sede, targetTeam, c1Date, assignments }) {
  if (!sede || sede === 'todos') throw new Error('Selecciona la sede.');
  if (!Number.isInteger(Number(targetTeam)) || Number(targetTeam) < 1) throw new Error('Indica el equipo que ingresa a Capítulo Uno.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c1Date) || (Number.isNaN(Date.parse(c1Date)) || new Date(c1Date).toISOString().slice(0, 10) !== c1Date)) throw new Error('Indica la fecha de inicio de C1.');
  if (!assignments.length) throw new Error('Selecciona al menos un IMO con sus enrolados revisados.');
  if (assignments.length > 100) throw new Error('Genera campañas de hasta 100 IMOs.');
  const sources = new Set(), people = new Set();
  for (const a of assignments) {
    if (!a.nombre || !a.sourceMissionId || sources.has(a.sourceMissionId)) throw new Error('Hay una misión de origen repetida o incompleta.');
    sources.add(a.sourceMissionId);
    if (!Number.isInteger(Number(a.originTeam)) || Number(a.originTeam) < 1 || Number(a.originTeam) === Number(targetTeam)) throw new Error(`Revisa el equipo de origen de ${a.nombre}.`);
    if (!a.enrolados?.length || a.enrolados.length > 100) throw new Error(`Revisa los enrolados de ${a.nombre} (entre 1 y 100).`);
    const ids = new Set();
    for (const e of a.enrolados) {
      if (!e.id || !e.nombre || ids.has(e.id) || /\//.test(e.id)) throw new Error(`Hay enrolados incompletos o repetidos en ${a.nombre}.`);
      ids.add(e.id);
      // Do not silently merge people sharing phones. Ambiguous same names require review.
      const key = normalizeText(e.nombre);
      if (people.has(key)) throw new Error(`El enrolado ${e.nombre} aparece más de una vez. Revisa su IMO antes de publicar.`);
      people.add(key);
    }
  }
}
