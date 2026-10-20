/**
 * src/services/nodusApiService.js
 * ================================
 * Cliente Oficial de Consulta API — NODUS (CREAR PSL)
 *
 * API de solo lectura (GET) que entrega datos del sistema Nodus en JSON (UTF-8).
 * Base URL: https://imo.crearpslglobal.com/api
 * Autenticación: Header `X-Api-Key: <token>` o `Authorization: Bearer <token>`
 */

const NODUS_API_BASE_URL = 'https://imo.crearpslglobal.com/api';
const DEFAULT_API_KEY = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_NODUS_API_KEY || ''
  : '';

/**
 * Helper interno para realizar llamadas GET a la API de Nodus
 */
async function nodusFetch(endpoint, queryParams = {}, apiKey = DEFAULT_API_KEY) {
  const token = apiKey || localStorage.getItem('nodus_api_key') || DEFAULT_API_KEY;
  
  const url = new URL(`${NODUS_API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
  
  Object.entries(queryParams).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      url.searchParams.append(key, val);
    }
  });

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['X-Api-Key'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`[NodusAPI Error] GET ${endpoint}:`, error);
    return {
      ok: false,
      error: {
        codigo: 'error_red',
        mensaje: error.message || 'Error de conexión con el servidor Nodus.'
      }
    };
  }
}

/**
 * 1. GET /api/sedes
 * Obtiene las sedes activas, cada una con sus equipos activos y etapa vigente.
 */
export async function getNodusSedes(apiKey) {
  return nodusFetch('/sedes', {}, apiKey);
}

/**
 * 2. GET /api/equipos
 * Obtiene los equipos activos.
 * @param {Object} params - { id_sede, en_actividad }
 */
export async function getNodusEquipos({ id_sede, en_actividad } = {}, apiKey) {
  return nodusFetch('/equipos', { id_sede, en_actividad }, apiKey);
}

/**
 * 3. GET /api/participantes/{id_equipo}
 * Obtiene participantes activos de un equipo, ordenados por apellidos, con su estado de C1 y C2.
 * @param {number|string} idEquipo - ID numérico del equipo en Nodus
 */
export async function getNodusParticipantesEquipo(idEquipo, apiKey) {
  if (!idEquipo) {
    return {
      ok: false,
      error: { codigo: 'parametro_faltante', mensaje: 'Se requiere id_equipo' }
    };
  }
  return nodusFetch(`/participantes/${idEquipo}`, {}, apiKey);
}

/**
 * 4. GET /api/participante?identificacion={cedula}
 * Obtiene la ficha completa de una persona por cédula/identificación: datos, sede, equipo, etapas, asistencias y pagos.
 * @param {string} identificacion - Número de cédula/DNI/pasaporte
 */
export async function getNodusParticipantePorCedula(identificacion, apiKey) {
  if (!identificacion) {
    return {
      ok: false,
      error: { codigo: 'parametro_faltante', mensaje: 'Se requiere identificacion' }
    };
  }
  return nodusFetch('/participante', { identificacion }, apiKey);
}

/**
 * 5. GET /api/pagos
 * Obtiene los pagos confirmados (estado pagado o abono) dentro de un rango de fechas (máx 93 días).
 * @param {Object} params - { desde: 'YYYY-MM-DD', hasta: 'YYYY-MM-DD', id_sede, id_equipo }
 */
export async function getNodusPagos({ desde, hasta, id_sede, id_equipo } = {}, apiKey) {
  if (!desde || !hasta) {
    return {
      ok: false,
      error: { codigo: 'parametro_faltante', mensaje: 'Se requieren parámetros obligatorios "desde" y "hasta" (YYYY-MM-DD)' }
    };
  }
  return nodusFetch('/pagos', { desde, hasta, id_sede, id_equipo }, apiKey);
}

export default {
  getSedes: getNodusSedes,
  getEquipos: getNodusEquipos,
  getParticipantesEquipo: getNodusParticipantesEquipo,
  getParticipantePorCedula: getNodusParticipantePorCedula,
  getPagos: getNodusPagos
};
