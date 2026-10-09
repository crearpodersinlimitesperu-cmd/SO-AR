import { c1Evidence, c1Eligibility } from '../functions-imo/c1Eligibility.mjs';
const name = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const phone = value => String(value || '').replace(/\D/g, '');
const fullName = row => name([row.nombres, row.apellidos].filter(Boolean).join(' '));
export function buildC1Index(rows) {
  const byId = new Map(), byIdentity = new Map();
  for (const row of rows) {
    const id = String(row.id || '');
    if (!/^\d+$/.test(id) || byId.has(id)) throw new Error('Incomplete or duplicate Nodus IDs');
    byId.set(id, row);
    const tel = phone(row.telefono), n = fullName(row);
    if (tel.length < 7 || !n) continue;
    const key = `${n}|${tel}`;
    byIdentity.set(key, [...(byIdentity.get(key) || []), row]);
  }
  return { byId, byIdentity };
}
export function reconcileC1(enrollee, mission, index, sourceUpdatedAt) {
  const unknown = { asistenciaC1: null, asistio_c1: null, estadoC1: null, estado_c1: null, desertorC1: null, desertor_c1: null, c1SourceUpdatedAt: sourceUpdatedAt, c1Verification: 'unverified' };
  const candidates = enrollee.nodusParticipantId ? [index.byId.get(String(enrollee.nodusParticipantId))].filter(Boolean) : index.byIdentity.get(`${name(enrollee.nombre)}|${phone(enrollee.telefono)}`) || [];
  if (candidates.length !== 1) return unknown;
  const row = candidates[0];
  const inviter = index.byId.get(String(row.id_invitador));
  if (!inviter || fullName(inviter) !== name(mission.imoNombre)) return unknown;
  // Before adopting a stable ID, all three source values must agree exactly.
  if (!enrollee.nodusParticipantId && (fullName(row) !== name(enrollee.nombre) || phone(row.telefono) !== phone(enrollee.telefono))) return unknown;
  const evidence = c1Evidence(row);
  return { ...unknown, ...evidence, nodusParticipantId: String(row.id), c1Source: 'Nodus /participantessede/datosTabla', c1Verification: c1Eligibility(evidence) === 'unverified' ? 'unverified' : 'verified' };
}
