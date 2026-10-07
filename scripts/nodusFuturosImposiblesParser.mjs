// Funciones puras del extractor de Futuros Imposibles (FI) de NODUS.
// Sin dependencias de navegador ni Firebase para poder probarlas en aislamiento.

export const normalizeText = (value = '') => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const SEDE_ALIASES = [
  [/\blima\b/, 'Lima'],
  [/\bquito\b/, 'Quito'],
  [/\bcuenca\b/, 'Cuenca'],
  [/\bguayaquil\b|\bgye\b/, 'Guayaquil'],
  [/\bmedellin\b/, 'Medellín'],
  [/\bmexico\b|\bcdmx\b/, 'México'],
  [/\bbogota\b/, 'Bogotá']
];

const titleCase = (text) => text.replace(/\b\p{L}/gu, (c) => c.toUpperCase());

// Índice RRHH equipo -> sedes que lo tienen asignado. Un nombre de equipo que
// aparece en varias sedes es ambiguo y no sirve para inferir la sede.
export function buildEquipoSedeIndex(coordinadores = []) {
  const index = new Map();
  for (const c of Array.isArray(coordinadores) ? coordinadores : []) {
    if (!c?.sede || !Array.isArray(c.equipos)) continue;
    for (const eq of c.equipos) {
      const name = normalizeText(typeof eq === 'string' ? eq : eq?.equipo);
      if (!name) continue;
      const sede = canonicalSede(c.sede);
      if (!index.has(name)) index.set(name, new Set());
      index.get(name).add(sede);
    }
  }
  return index;
}

const sedeFromText = (text) => {
  const t = normalizeText(text);
  const alias = SEDE_ALIASES.find(([pattern]) => pattern.test(t));
  return alias ? alias[1] : null;
};

// "LIMA CICLO 1 — EQUIPO 15" -> { sede: 'Lima', codigo: 'EQUIPO 15' }. El código
// numérico es el de NODUS; nunca se renumera.
export function parseEquipo(raw = '') {
  const text = String(raw ?? '').trim();
  const match = text.match(/^(.*?)\s*[—–-]\s*(equipo\s*\S+.*)$/i);
  if (match) return { sedeEnNombre: match[1].trim(), codigo: match[2].trim().toUpperCase() };
  return { sedeEnNombre: '', codigo: text.toUpperCase() };
}

// "LIMA CICLO 1" -> "Lima". Una sede desconocida conserva su nombre real (sin
// ciclo/equipo); sin ningún dato queda "Sin sede", nunca "Lima" por defecto.
export function canonicalSede(rawSede = '', equipo = '', equipoSedeIndex = null) {
  const sedeText = normalizeText(rawSede)
    .replace(/\s*[—–-]\s*equipo.*$/, '')
    .replace(/\bciclo\s*\d+\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const direct = sedeFromText(sedeText);
  if (direct) return direct;
  if (sedeText) return titleCase(sedeText);
  const parsed = parseEquipo(equipo);
  const fromName = sedeFromText(parsed.sedeEnNombre || parsed.codigo);
  if (fromName) return fromName;
  const candidates = equipoSedeIndex?.get?.(normalizeText(equipo)) || equipoSedeIndex?.get?.(normalizeText(parsed.codigo));
  if (candidates && candidates.size === 1) return [...candidates][0];
  return 'Sin sede';
}

const firstValue = (row, candidates) => {
  const found = Object.entries(row).find(([key]) => candidates.some((candidate) => key.includes(candidate)));
  return found?.[1] ?? '';
};
const toInt = (value) => Number.parseInt(String(value ?? '').replace(/[^0-9-]/g, ''), 10) || 0;
const yes = (value) => /^(si|true|1|asistio|confirmad[oa])$/i.test(normalizeText(value));
const no = (value) => /^(no|false|0|falto|ausente|pendiente)$/i.test(normalizeText(value));

// Convierte filas {encabezado normalizado: texto} en participantes. La página de
// NODUS ya filtra "solo participantes que asistieron a su PFD", por lo que sin
// columna explícita de asistencia la fila cuenta como post-PFD; si la columna
// existe y dice que no, se excluye (filtro post-PFD preservado).
export function rowsToFiParticipants(rawRows = [], { equipoSedeIndex = null } = {}) {
  return rawRows.map((row, index) => {
    const nombrePart = firstValue(row, ['participante', 'nombre', 'asistente']);
    const apellidoPart = firstValue(row, ['apellido']);
    const nombre = apellidoPart && !normalizeText(nombrePart).includes(normalizeText(apellidoPart))
      ? `${nombrePart} ${apellidoPart}`.trim()
      : String(nombrePart).trim();
    const asistenciaRaw = firstValue(row, ['asistencia pfd', 'asistio pfd', 'asistencia', 'pfd']);
    const sedeRaw = firstValue(row, ['sede', 'ciudad']);
    const equipoNodus = String(firstValue(row, ['equipo', 'team'])).trim();
    const { codigo } = parseEquipo(equipoNodus);
    const equipo = codigo;
    const dni = String(firstValue(row, ['identificacion', 'dni', 'cedula', 'documento'])).trim();
    const campos = Object.fromEntries(Object.entries(row).filter(([key, value]) => value !== '' && !/^acciones?$/.test(key)));
    const sede = canonicalSede(sedeRaw, equipoNodus, equipoSedeIndex);
    const rrhhSedes = equipoSedeIndex?.get?.(normalizeText(equipo));
    const discrepancias = [];
    if (rrhhSedes && rrhhSedes.size > 0 && sede !== 'Sin sede' && !rrhhSedes.has(sede)) {
      discrepancias.push({
        tipo: 'sede_equipo',
        detalle: `${equipo} figura en RRHH para ${[...rrhhSedes].join('/')} y NODUS lo reporta en ${sede}.`,
        resolucion: 'Se conserva la sede declarada por la fila de NODUS y el código de equipo original.'
      });
    }
    return {
      id: dni || `nodus_fi_${index}`,
      dni,
      nombre,
      sede,
      sedeNodus: String(sedeRaw).trim(),
      equipo,
      equipoNodus,
      equipoKey: `${normalizeText(sede)}|${normalizeText(equipo)}`,
      discrepancias,
      fechaPFD: String(firstValue(row, ['fecha pfd', 'pfd fecha'])).trim(),
      asistioPFD: asistenciaRaw === '' ? true : yes(asistenciaRaw) || !no(asistenciaRaw),
      totalFi: toInt(firstValue(row, ['total fi', 'fis cargados', 'futuros cargados'])),
      pendientes: toInt(firstValue(row, ['pendiente'])),
      devueltos: toInt(firstValue(row, ['devuelto'])),
      aprobados: toInt(firstValue(row, ['aprobado'])),
      fis: Array.isArray(row.fis) ? row.fis : [],
      camposNodus: campos
    };
  }).filter((p) => p.nombre && p.asistioPFD);
}

export function participantKey(p) {
  const dni = String(p?.dni || '').replace(/\D/g, '');
  return dni.length >= 6 ? `dni:${dni}` : `nombre:${normalizeText(p?.nombre)}|${normalizeText(p?.sede)}`;
}

// Fusiona sin duplicar: ante una misma persona conserva el registro con más FI
// y completa campos vacíos con los del otro; los detalles FI reales se unen.
export function mergeParticipants(accumulator, list) {
  let added = 0;
  for (const p of list) {
    const key = participantKey(p);
    const current = accumulator.get(key);
    if (!current) { accumulator.set(key, p); added++; continue; }
    const best = (p.totalFi || 0) > (current.totalFi || 0) ? p : current;
    const other = best === p ? current : p;
    const merged = { ...other, ...best };
    for (const field of Object.keys(other)) {
      if ((merged[field] === '' || merged[field] == null) && other[field]) merged[field] = other[field];
    }
    if (merged.sede === 'Sin sede' && other.sede !== 'Sin sede') merged.sede = other.sede;
    const fis = [...(current.fis || []), ...(p.fis || [])];
    merged.fis = fis.filter((fi, i) => fis.findIndex((x) => JSON.stringify(x) === JSON.stringify(fi)) === i);
    accumulator.set(key, merged);
  }
  return added;
}

// "Mostrando 1 a 25 de 415 registros" / "(filtrado de 900 registros en total)".
export function parseDataTablesInfo(text = '') {
  const match = String(text).match(/\bde\s+([\d.,]+)\s+(?:registros|entradas|entries|resultados)/i);
  return match ? toInt(match[1]) : null;
}

export function summarizeCoverage(participantes, { expectedSedes = [] } = {}) {
  const bySede = new Map();
  for (const p of participantes) {
    const sede = p.sede || 'Sin sede';
    const entry = bySede.get(sede) || { sede, participantes: 0, totalFi: 0, status: 'ok' };
    entry.participantes++;
    entry.totalFi += p.totalFi || 0;
    bySede.set(sede, entry);
  }
  const found = new Set([...bySede.keys()].map(normalizeText));
  for (const expected of expectedSedes) {
    const canonical = canonicalSede(expected);
    if (canonical === 'Sin sede' || found.has(normalizeText(canonical))) continue;
    found.add(normalizeText(canonical));
    bySede.set(canonical, { sede: canonical, participantes: 0, totalFi: 0, status: 'sin_datos' });
  }
  return [...bySede.values()].sort((a, b) => a.sede.localeCompare(b.sede, 'es'));
}

// 'complete' solo si se leyó todo el universo que NODUS declara, no hubo
// lecturas bloqueadas y toda sede esperada tiene registros.
export function assessFiCompleteness({ participantes, expectedTotal = null, blocked = [], expectedSedes = [] }) {
  const reasons = [];
  if (blocked.length) reasons.push(`Lecturas bloqueadas o fallidas: ${blocked.join(', ')}.`);
  if (expectedTotal == null) reasons.push('NODUS no declaró el total de registros; no se puede verificar la cobertura.');
  else if (participantes.length < expectedTotal) reasons.push(`Se leyeron ${participantes.length} de ${expectedTotal} registros declarados por NODUS.`);
  const coverage = summarizeCoverage(participantes, { expectedSedes });
  const missing = coverage.filter((c) => c.status === 'sin_datos').map((c) => c.sede);
  if (missing.length) reasons.push(`Sedes esperadas sin registros FI en NODUS: ${missing.join(', ')}.`);
  return { status: reasons.length ? 'partial' : 'complete', reasons, coverage };
}

export function summarizeSedeEquipoDiscrepancies(participantes) {
  const lista = participantes.flatMap((p) => (p.discrepancias || []).map((d) => ({ participante: p.nombre, sede: p.sede, equipo: p.equipo, ...d })));
  const sinSede = participantes.filter((p) => p.sede === 'Sin sede').length;
  return { total: lista.length, sinSede, detalle: lista.slice(0, 200) };
}
