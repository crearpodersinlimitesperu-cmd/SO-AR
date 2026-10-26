const DEFAULT_BASE_URL = 'https://imo.crearpslglobal.com/api';
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export class NodusApiError extends Error {
  constructor(code, status = null) {
    super(`Nodus API request failed (${code}).`);
    this.name = 'NodusApiError';
    this.code = code;
    this.status = status;
  }
}

function parseGenerated(value) {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function validateDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function boundedInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new NodusApiError(`invalid_${label}`);
  return number;
}

function requireObject(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new NodusApiError(code);
  return value;
}

function requireRows(value, code) {
  if (!Array.isArray(value)) throw new NodusApiError(code);
  for (const row of value) requireObject(row, code);
  return value;
}

export function createNodusApiClient({
  apiKey,
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  maxAgeMs = DEFAULT_MAX_AGE_MS,
} = {}) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new NodusApiError('missing_api_key');
  if (typeof fetchImpl !== 'function') throw new NodusApiError('fetch_unavailable');
  if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) throw new NodusApiError('invalid_max_age');
  let parsedBase;
  try {
    parsedBase = new URL(baseUrl);
  } catch {
    throw new NodusApiError('invalid_base_url');
  }
  if (parsedBase.protocol !== 'https:' || parsedBase.hostname !== 'imo.crearpslglobal.com' ||
      parsedBase.username || parsedBase.password || parsedBase.search || parsedBase.hash) {
    throw new NodusApiError('invalid_base_url');
  }
  const root = parsedBase.toString().replace(/\/+$/, '');

  async function request(path, params) {
    const url = new URL(`${root}${path}`);
    for (const [key, value] of Object.entries(params || {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    let response;
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'application/json', 'X-Api-Key': apiKey },
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new NodusApiError('network_error');
    }
    let body;
    try {
      body = await response.json();
    } catch {
      throw new NodusApiError('invalid_json', response.status);
    }
    if (!response.ok || body?.ok !== true) {
      const suppliedCode = typeof body?.error?.codigo === 'string' ? body.error.codigo : '';
      const code = /^[a-z0-9_]{1,64}$/.test(suppliedCode) ? suppliedCode : `http_${response.status}`;
      throw new NodusApiError(code, response.status);
    }
    if (!body.meta || typeof body.meta !== 'object' || body.data === undefined) {
      throw new NodusApiError('invalid_envelope', response.status);
    }
    const generatedMs = parseGenerated(body.meta.generado);
    if (generatedMs === null) throw new NodusApiError('invalid_generated_timestamp', response.status);
    const age = now() - generatedMs;
    if (age < -MAX_CLOCK_SKEW_MS) throw new NodusApiError('future_generated_timestamp', response.status);
    if (age > maxAgeMs) throw new NodusApiError('stale_data', response.status);
    return { data: body.data, meta: body.meta, source: 'NODUS_API', retrievedAt: new Date(now()).toISOString() };
  }

  return Object.freeze({
    async getSedes() {
      const result = await request('/sedes');
      const rows = requireRows(result.data, 'invalid_sedes_schema');
      if (rows.some(row => !Number.isSafeInteger(Number(row.id)) || typeof row.nombre !== 'string' || !Array.isArray(row.equipos))) {
        throw new NodusApiError('invalid_sedes_schema');
      }
      return result;
    },
    async getEquipos({ sedeId, activeOnly = false } = {}) {
      const result = await request('/equipos', {
        id_sede: sedeId == null ? undefined : boundedInteger(sedeId, 'sede_id'),
        en_actividad: activeOnly ? 1 : undefined,
      });
      const rows = requireRows(result.data, 'invalid_equipos_schema');
      if (rows.some(row => !Number.isSafeInteger(Number(row.id)) || !Number.isSafeInteger(Number(row.id_sede)) ||
          typeof row.nombre !== 'string' || typeof row.sede !== 'string')) throw new NodusApiError('invalid_equipos_schema');
      return result;
    },
    async getParticipantes(equipoId) {
      const id = boundedInteger(equipoId, 'equipo_id');
      const result = await request(`/participantes/${id}`);
      const data = requireObject(result.data, 'invalid_participantes_schema');
      const team = requireObject(data.equipo, 'invalid_participantes_schema');
      const rows = requireRows(data.participantes, 'invalid_participantes_schema');
      if (Number(team.id) !== id || Number(result.meta.total) !== rows.length ||
          rows.some(row => !Number.isSafeInteger(Number(row.id)) || typeof row.nombres !== 'string' ||
            typeof row.apellidos !== 'string' || !('capitulo1' in row) || !('capitulo2' in row))) {
        throw new NodusApiError('invalid_participantes_schema');
      }
      return result;
    },
    async getParticipante(identificacion) {
      if (typeof identificacion !== 'string' || !identificacion.trim()) throw new NodusApiError('invalid_identificacion');
      const result = await request('/participante', { identificacion: identificacion.trim() });
      const data = requireObject(result.data, 'invalid_participante_schema');
      if (!['participante', 'prospecto'].includes(data.estado) || !Number.isSafeInteger(Number(data.id))) {
        throw new NodusApiError('invalid_participante_schema');
      }
      return result;
    },
    async getPagos({ desde, hasta, sedeId, equipoId }) {
      if (!validateDate(desde) || !validateDate(hasta) || Date.parse(`${hasta}T00:00:00Z`) < Date.parse(`${desde}T00:00:00Z`)) {
        throw new NodusApiError('invalid_date_range');
      }
      if ((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000 > 93) {
        throw new NodusApiError('date_range_exceeded');
      }
      const result = equipoId != null ? await request('/pagos', {
        desde, hasta, id_equipo: boundedInteger(equipoId, 'equipo_id'),
      }) : await request('/pagos', {
        desde, hasta, id_sede: sedeId == null ? undefined : boundedInteger(sedeId, 'sede_id'),
      });
      const rows = requireRows(result.data, 'invalid_pagos_schema');
      if (!Number.isSafeInteger(Number(result.meta.total_registros)) ||
          Number(result.meta.total_registros) !== rows.length ||
          rows.some(row => !Number.isSafeInteger(Number(row.id_factura)) || !validateDate(String(row.fecha || '').slice(0, 10)))) {
        throw new NodusApiError('invalid_pagos_schema');
      }
      return result;
    },
    async getAliados({ equipoId } = {}) {
      const params = equipoId != null ? { id_equipo: boundedInteger(equipoId, 'equipo_id') } : {};
      return await request('/aliados', params);
    },
    async getContabilidad({ sedeId, equipoId } = {}) {
      const params = {};
      if (equipoId != null) params.id_equipo = boundedInteger(equipoId, 'equipo_id');
      if (sedeId != null) params.id_sede = boundedInteger(sedeId, 'sede_id');
      return await request('/contabilidad', params);
    },
    async getMesaRegistro({ equipoId } = {}) {
      const params = equipoId != null ? { id_equipo: boundedInteger(equipoId, 'equipo_id') } : {};
      return await request('/mesaregistro', params);
    },
    async getJuniors({ sedeId } = {}) {
      const params = sedeId != null ? { id_sede: boundedInteger(sedeId, 'sede_id') } : {};
      return await request('/juniors', params);
    },
    async getModulosCatalogo() {
      return await request('/modulos');
    },
    async getModuloGenerico(moduloPath, params = {}) {
      const cleanPath = String(moduloPath || '').replace(/^\/+/, '');
      if (!cleanPath || /[^a-zA-Z0-9_\-\/]/.test(cleanPath)) throw new NodusApiError('invalid_modulo_path');
      return await request(`/${cleanPath}`, params);
    },
  });
}
