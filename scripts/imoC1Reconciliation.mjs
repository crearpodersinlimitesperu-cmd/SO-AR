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
  // Use the inviter label explicitly supplied by Nodus; id_invitador must not
  // be assumed to share the participant-ID namespace. This is evidence-only,
  // never a grant of identity/authentication or a reassignment of an enrollee.
  if (!row.id_invitador || !row.nombre_imo || name(row.nombre_imo) !== name(mission.imoNombre)) return unknown;
  // Before adopting a stable ID, all three source values must agree exactly.
  if (!enrollee.nodusParticipantId && (fullName(row) !== name(enrollee.nombre) || phone(row.telefono) !== phone(enrollee.telefono))) return unknown;
  const evidence = c1Evidence(row);
  return { ...unknown, ...evidence, nodusParticipantId: String(row.id), c1Source: 'Nodus /participantessede/datosTabla', c1Verification: c1Eligibility(evidence) === 'unverified' ? 'unverified' : 'verified' };
}

export async function loadCompleteC1Source(readPage) {
  const first=await readPage(0),total=Number(first.total),size=first.rows?.length;
  if(!Number.isInteger(total)||total<1||total>100000||!size||size>total)throw new Error('Source total missing or changed');
  const validate=(result,start)=>{
    if(Number(result.total)!==total || (result.filtered!==undefined && Number(result.filtered)!==total))throw new Error('Incomplete source filter');
    if(!Array.isArray(result.rows)||result.rows.length!==Math.min(size,total-start))throw new Error('Incomplete source pagination');
    return result.rows;
  };
  const rows=validate(first,0);
  for(let start=size;start<total;start+=size*4){
    const offsets=Array.from({length:4},(_,i)=>start+i*size).filter(n=>n<total);
    const results=await Promise.all(offsets.map(readPage));
    results.forEach((result,i)=>rows.push(...validate(result,offsets[i])));
  }
  buildC1Index(rows); // Reject repeated pages/IDs before any publication.
  return rows;
}
