/**
 * src/services/nodusLiveApiService.js
 * =========================================================================
 * Integración Oficial Directa y Tolerante con la API de NODUS / IMO
 * =========================================================================
 * Host Oficial: https://imo.crearpslglobal.com/api
 * Autenticación: Header 'x-api-key' con clave oficial provista por Dirección.
 *
 * Principios de Diseño:
 * 1. Resiliencia Máxima: Cero pantallas en blanco. Si la red falla o está lenta,
 *    sirve caché local o fallback sin bloquear la interfaz.
 * 2. Normalización Instantánea: Mapea entidades de Nodus al modelo canónico de
 *    Causa OS (sedes, equipos, participantes, asistencias C1/C2).
 * 3. Trazabilidad: Expone metadatos de sincronización (fecha de corte, latencia, total).
 */

export const NODUS_API_BASE_URL = 'https://imo.crearpslglobal.com/api';
export const NODUS_OFFICIAL_API_KEY = '7VEBgG3zFHRC1m28yDLsfwUhvukq0KWdQaliSPNt';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de validez para caché en memoria
const memoryCache = new Map();

function getCached(key) {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data) {
  memoryCache.set(key, { time: Date.now(), data });
}

/**
 * Cliente HTTP base para la API de Nodus
 */
async function fetchNodusEndpoint(endpoint, { apiKey = NODUS_OFFICIAL_API_KEY, timeoutMs = 12000 } = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${NODUS_API_BASE_URL}${cleanEndpoint}`;
  const cacheKey = `nodus_api_${cleanEndpoint}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return { ok: true, data: cached.data, meta: cached.meta, source: 'MEMORY_CACHE' };
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
      },
      signal: controller ? controller.signal : undefined
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `HTTP ${res.status}: ${res.statusText}`,
        source: 'NODUS_API'
      };
    }

    const json = await res.json();
    if (json && json.ok) {
      setCached(cacheKey, json);
      return {
        ok: true,
        data: json.data,
        meta: json.meta || { total: Array.isArray(json.data) ? json.data.length : 1 },
        source: 'LIVE_API'
      };
    }

    return {
      ok: false,
      error: json?.error?.mensaje || 'Respuesta inválida de Nodus',
      source: 'NODUS_API'
    };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    return {
      ok: false,
      error: err.name === 'AbortError' ? 'Tiempo de espera agotado con servidor Nodus' : err.message,
      source: 'NETWORK_ERROR'
    };
  }
}

/**
 * 1. Obtener todas las Sedes oficiales de Nodus con sus equipos asociados
 */
export async function getLiveNodusSedes(apiKey) {
  return await fetchNodusEndpoint('/sedes', { apiKey });
}

/**
 * 2. Obtener Equipos de Nodus (opcionalmente filtrados por sede o en actividad)
 */
export async function getLiveNodusEquipos({ sedeId = null, enActividad = true, apiKey } = {}) {
  let endpoint = '/equipos';
  const params = [];
  if (sedeId) params.push(`id_sede=${sedeId}`);
  if (enActividad !== null) params.push(`en_actividad=${enActividad ? 1 : 0}`);
  if (params.length) endpoint += `?${params.join('&')}`;

  return await fetchNodusEndpoint(endpoint, { apiKey });
}

/**
 * 3. Obtener Participantes en vivo de un Equipo (ej. 141 - EQUIPO 31 LIMA)
 */
export async function getLiveNodusParticipantes(equipoId, apiKey) {
  if (!equipoId) return { ok: false, error: 'ID de equipo requerido' };
  const res = await fetchNodusEndpoint(`/participantes/${equipoId}`, { apiKey });
  
  if (res.ok && res.data?.participantes) {
    // Normalizar participantes para Causa OS
    const equipo = res.data.equipo || {};
    const normalizados = res.data.participantes.map(p => ({
      ...p,
      id: p.id,
      identificacion: p.identificacion,
      dni: p.identificacion,
      nombre: p.nombre_preferido || `${p.nombres || ''} ${p.apellidos || ''}`.trim(),
      nombreCompleto: `${p.nombres || ''} ${p.apellidos || ''}`.trim(),
      nombres: p.nombres,
      apellidos: p.apellidos,
      telefono: p.telefono,
      email: p.email,
      coordinador: p.coordinador,
      sede: equipo.sede || '',
      sedeId: equipo.id_sede,
      equipo: equipo.nombre || '',
      equipoId: equipo.id,
      etapaVigente: equipo.etapa_vigente || 'PFD',
      asistioC1: !!p.capitulo1?.asistio,
      desertorC1: !!p.capitulo1?.desertor,
      pagadoC1: !!p.capitulo1?.pagado,
      pagadoC2: !!p.capitulo2?.pagado
    }));

    return {
      ok: true,
      equipo,
      participantes: normalizados,
      total: normalizados.length,
      meta: res.meta,
      source: res.source
    };
  }

  return res;
}

/**
 * 4. Obtener Ficha de un Participante por Cédula / DNI
 */
export async function getLiveNodusParticipantePorCedula(cedula, apiKey) {
  if (!cedula) return { ok: false, error: 'Cédula o identificación requerida' };
  return await fetchNodusEndpoint(`/participante?identificacion=${encodeURIComponent(cedula.trim())}`, { apiKey });
}

/**
 * 5. Test rápido de salud de la conexión a la API Nodus
 */
export async function pingNodusApi(apiKey) {
  const start = Date.now();
  const res = await fetchNodusEndpoint('/sedes', { apiKey, timeoutMs: 5000 });
  const latency = Date.now() - start;
  return {
    conectado: res.ok,
    latenciaMs: latency,
    sedesDisponibles: res.ok && Array.isArray(res.data) ? res.data.length : 0,
    error: res.error || null
  };
}
