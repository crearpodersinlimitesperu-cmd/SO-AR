// Only recorded C1 attendance is authoritative. IMO intention, calls and payments
// never establish whether a person has already trained.
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
const yes = value => value === true || value === 1 || ['1', 'SI', 'TRUE'].includes(normalize(value));
const no = value => value === false || value === 0 || ['0', 'NO', 'FALSE', 'NO ASISTIO', 'NO SENTADO', 'NO SENTADA', 'NO SE HA SENTADO'].includes(normalize(value));
const dropped = value => yes(value) || ['DESERTOR', 'DESERTORA', 'DESERTO'].includes(normalize(value));
export function c1Eligibility(row = {}) {
  const states = [row.asistenciaC1, row.asistio_c1, row.estadoC1, row.estado_c1];
  // A recorded C1 dropout remains eligible even when opening attendance was true.
  if (dropped(row.desertorC1) || dropped(row.desertor_c1) || states.some(v => ['DESERTOR', 'DESERTORA', 'DESERTO'].includes(normalize(v)))) return 'eligible';
  if (states.some(v => yes(v) || ['ASISTIO', 'SENTADO', 'SENTADA', 'COMPLETADO', 'GRADUADO'].includes(normalize(v)))) return 'already_attended';
  if (states.some(no)) return 'eligible';
  return 'unverified';
}
export const isAvailableForC1 = row => c1Eligibility(row) === 'eligible';
export const c1Evidence = row => Object.fromEntries(['asistenciaC1', 'asistio_c1', 'estadoC1', 'estado_c1', 'desertorC1', 'desertor_c1'].filter(key => row[key] !== undefined).map(key => [key, row[key]]));
