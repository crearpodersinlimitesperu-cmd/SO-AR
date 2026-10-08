// Builds Misión IMO campaign candidates from Nodus (v1) mission records.
// In Nodus "reporte por equipo", a v1 record's `equipo` is the team the
// ENROLLEES join (C1 target), not the IMO's own team. The IMO's origin team is
// inferred only when the IMO appears as a participant of another team.
import { normalizeText } from './missionModel.js';

export const MAX_CAMPAIGN_IMOS = 200;

export function recordTeamNumber(m) {
  if (Number.isInteger(m?.targetTeam) && m.targetTeam > 0) return m.targetTeam;
  const match = String(m?.equipo || '').match(/(?:EQUIPO|EQ|E)?[\s\-_]*(\d+)\b/i);
  return match ? Number(match[1]) : null;
}

const personKey = name => normalizeText(name).replace(/[^A-Z0-9 ]/g, '').trim();
const phoneKey = phone => String(phone || '').replace(/\D/g, '');
const updatedMs = m => {
  const v = m?.lastUpdated;
  if (v?.toMillis) return v.toMillis();
  if (typeof v?.seconds === 'number') return v.seconds * 1000;
  const t = Date.parse(v || '');
  return Number.isNaN(t) ? 0 : t;
};

// person name -> team numbers where that person entered as an enrollee (v1 only).
export function buildOriginIndex(missions, resolveSede) {
  const index = new Map();
  for (const m of missions || []) {
    if (m.schemaVersion === 2) continue;
    const team = recordTeamNumber(m);
    if (!team) continue;
    const sede = resolveSede ? normalizeText(resolveSede(m)) : '';
    for (const e of m.enrolados || []) {
      const key = personKey(e.nombre);
      if (!key) continue;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push({ team, sede });
    }
  }
  return index;
}

// Most recent previous team of the same sede where the IMO was an enrollee; 0 = por confirmar.
export function inferOriginTeam(imoNombre, targetTeam, index, sede = '') {
  const sedeNorm = normalizeText(sede);
  const teams = (index.get(personKey(imoNombre)) || [])
    .filter(r => r.team !== Number(targetTeam) && (!sedeNorm || !r.sede || r.sede === sedeNorm))
    .map(r => r.team);
  const previous = teams.filter(t => t < Number(targetTeam));
  if (previous.length) return Math.max(...previous);
  return 0;
}

/**
 * Returns one candidate per IMO for a sede + C1 target team. Duplicate v1
 * records of the same IMO are merged; an enrollee listed under two IMOs stays
 * with the most recently updated record and is reported in `conflicts`.
 */
// Nodus marca a los participantes sin IMO con un nombre genérico; no es un IMO.
export function isPlaceholderImo(name) {
  return /^SIN (INVITADOR|IMO|ENROLADOR)\b/.test(personKey(name));
}

// Nodus a veces deja filas de estado de pago en la columna de nombre.
export function isPersonName(name) {
  const raw = String(name || '').trim();
  return !!raw && !/^(sin pago|pagado|pago)\b|S\/\.|\d/i.test(raw);
}

export function buildCampaignCandidates(missions, { sede, targetTeam, resolveSede, getEnrolados, search = '' }) {
  const target = Number(targetTeam);
  if (!target || !sede) return { candidates: [], conflicts: [] };
  const sedeNorm = normalizeText(sede);
  const index = buildOriginIndex(missions, resolveSede);
  const records = (missions || [])
    .filter(m => m.schemaVersion !== 2 && recordTeamNumber(m) === target)
    .filter(m => !resolveSede || normalizeText(resolveSede(m)) === sedeNorm)
    .filter(m => personKey(m.imoNombre) && !isPlaceholderImo(m.imoNombre))
    .sort((a, b) => updatedMs(b) - updatedMs(a));

  const byImo = new Map();
  const ownerByPerson = new Map();
  const conflicts = [];
  const seenConflicts = new Set();
  for (const m of records) {
    const imoKey = personKey(m.imoNombre);
    if (!byImo.has(imoKey)) {
      byImo.set(imoKey, {
        id: m.id,
        sourceMissionId: m.id,
        sourceMissionIds: [],
        nombre: String(m.imoNombre).trim(),
        originTeam: inferOriginTeam(m.imoNombre, target, index, sede),
        enrolados: [],
      });
    }
    const candidate = byImo.get(imoKey);
    candidate.sourceMissionIds.push(m.id);
    for (const e of getEnrolados(m)) {
      const key = personKey(e.nombre);
      if (!key || !isPersonName(e.nombre)) continue;
      const phone = phoneKey(e.telefono);
      const owner = ownerByPerson.get(key) || (phone.length >= 7 ? ownerByPerson.get(`tel:${phone}`) : null);
      if (owner === imoKey) continue;
      if (owner) {
        const conflictKey = `${key}|${imoKey}`;
        if (seenConflicts.has(conflictKey)) continue;
        seenConflicts.add(conflictKey);
        conflicts.push({ enrolado: e.nombre, keptWith: byImo.get(owner).nombre, skippedFrom: candidate.nombre });
        continue;
      }
      ownerByPerson.set(key, imoKey);
      if (phone.length >= 7) ownerByPerson.set(`tel:${phone}`, imoKey);
      candidate.enrolados.push({
        id: String(e.id || `enr_${key.replace(/ /g, '_').toLowerCase()}`).replace(/\//g, '_'),
        nombre: String(e.nombre).trim(),
        telefono: e.telefono || '',
        coordinadora_nombre: e.coordinadora_nombre || '',
        coordinadora_telefono: e.coordinadora_telefono || '',
      });
    }
  }

  const query = normalizeText(search);
  const candidates = [...byImo.values()]
    .filter(c => c.enrolados.length > 0)
    .map(c => {
      const ids = new Set();
      c.enrolados = c.enrolados.filter(e => (ids.has(e.id) ? false : ids.add(e.id)));
      return c;
    })
    .filter(c => !query || normalizeText(c.nombre).includes(query) || c.enrolados.some(e => normalizeText(e.nombre).includes(query)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return { candidates, conflicts };
}

// Teams of a sede that already have Nodus enrollee records, with counts.
export function teamsWithRecords(missions, sede, resolveSede, getEnrolados) {
  const sedeNorm = normalizeText(sede);
  const map = new Map();
  for (const m of missions || []) {
    if (m.schemaVersion === 2) continue;
    if (resolveSede && normalizeText(resolveSede(m)) !== sedeNorm) continue;
    if (!personKey(m.imoNombre) || isPlaceholderImo(m.imoNombre)) continue;
    if (getEnrolados && !getEnrolados(m).some(e => isPersonName(e.nombre))) continue;
    const team = recordTeamNumber(m);
    if (!team) continue;
    map.set(team, (map.get(team) || 0) + 1);
  }
  return [...map.entries()].map(([team, records]) => ({ team, records })).sort((a, b) => b.team - a.team);
}
