/**
 * src/services/nodusApiService.js
 * ================================
 * Cliente Oficial de Consulta API — NODUS (CREAR PSL)
 *
 * Enforza validación estricta fail-closed (createNodusApiClient):
 * - Verifica host oficial https://imo.crearpslglobal.com/api
 * - Valida sobre { ok: true, data, meta: { generado } } con zona horaria ISO
 * - Rechaza respuestas vencidas (>24h), con desfase de reloj (>5 min),
 *   o cuyos conteos (meta.total / meta.total_registros) no coincidan con las filas reales.
 * - Cero datos inventados o inferidos.
 */

import { createNodusApiClient, NodusApiError } from '../../cloudflare-worker/src/nodusApiClient.js';

const DEFAULT_API_KEY = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_NODUS_API_KEY || ''
  : '';

function buildClient(apiKey = DEFAULT_API_KEY) {
  const resolvedKey = String(apiKey || DEFAULT_API_KEY || '').trim();
  return createNodusApiClient({ apiKey: resolvedKey });
}

function wrapError(error) {
  if (error instanceof NodusApiError) {
    return {
      ok: false,
      source: 'NODUS_API',
      error: {
        codigo: error.code,
        status: error.status ?? null,
        mensaje: error.message
      }
    };
  }
  return {
    ok: false,
    source: 'NODUS_API',
    error: {
      codigo: 'error_red',
      mensaje: error?.message || 'Error de conexión con el servidor Nodus.'
    }
  };
}

/**
 * 1. GET /api/sedes
 * Obtiene las sedes activas verificadas, cada una con sus equipos activos y etapa vigente.
 */
export async function getNodusSedes(apiKey) {
  try {
    const result = await buildClient(apiKey).getSedes();
    return { ok: true, ...result };
  } catch (error) {
    return wrapError(error);
  }
}

/**
 * 2. GET /api/equipos
 * Obtiene los equipos activos verificados contra meta.total.
 * @param {Object} params - { id_sede, en_actividad }
 */
export async function getNodusEquipos({ id_sede, en_actividad } = {}, apiKey) {
  try {
    const activeOnly = en_actividad === undefined
      ? undefined
      : (en_actividad === true || en_actividad === 1 || en_actividad === '1');
    const result = await buildClient(apiKey).getEquipos({
      sedeId: id_sede,
      activeOnly
    });
    return { ok: true, ...result };
  } catch (error) {
    return wrapError(error);
  }
}

/**
 * 3. GET /api/participantes/{id_equipo}
 * Obtiene participantes activos de un equipo verificados contra meta.total.
 * @param {number|string} idEquipo - ID numérico del equipo en Nodus
 */
export async function getNodusParticipantesEquipo(idEquipo, apiKey) {
  try {
    const result = await buildClient(apiKey).getParticipantes(idEquipo);
    return { ok: true, ...result };
  } catch (error) {
    return wrapError(error);
  }
}

/**
 * 4. GET /api/participante?identificacion={cedula}
 * Obtiene la ficha completa verificada de una persona por cédula/identificación.
 * @param {string} identificacion - Número de cédula/DNI/pasaporte
 */
export async function getNodusParticipantePorCedula(identificacion, apiKey) {
  try {
    const result = await buildClient(apiKey).getParticipante(identificacion);
    return { ok: true, ...result };
  } catch (error) {
    return wrapError(error);
  }
}

/**
 * 5. GET /api/pagos
 * Obtiene los pagos confirmados dentro de un rango de fechas (máx 93 días) verificados contra meta.total_registros.
 * @param {Object} params - { desde: 'YYYY-MM-DD', hasta: 'YYYY-MM-DD', id_sede, id_equipo }
 */
export async function getNodusPagos({ desde, hasta, id_sede, id_equipo } = {}, apiKey) {
  try {
    const result = await buildClient(apiKey).getPagos({
      desde,
      hasta,
      sedeId: id_sede,
      equipoId: id_equipo
    });
    return { ok: true, ...result };
  } catch (error) {
    return wrapError(error);
  }
}

/**
 * 6. GET /api/aliados
 * Obtiene métricas y asignaciones de aliados por equipo.
 */
export async function getNodusAliados({ equipoId } = {}, apiKey) {
  try {
    const result = await buildClient(apiKey).getAliados({ equipoId });
    return { ok: true, ...result };
  } catch (error) {
    return wrapError(error);
  }
}

/**
 * 7. GET /api/contabilidad
 * Obtiene totales recaudados, pagos cerrados y pendientes.
 */
export async function getNodusContabilidad({ sedeId, equipoId } = {}, apiKey) {
  try {
    const result = await buildClient(apiKey).getContabilidad({ sedeId, equipoId });
    return { ok: true, ...result };
  } catch (error) {
    return wrapError(error);
  }
}

/**
 * 8. GET /api/mesaregistro
 * Obtiene el padrón de mesa de registro y check-in en vivo.
 */
export async function getNodusMesaRegistro({ equipoId } = {}, apiKey) {
  try {
    const result = await buildClient(apiKey).getMesaRegistro({ equipoId });
    return { ok: true, ...result };
  } catch (error) {
    return wrapError(error);
  }
}

/**
 * 9. GET /api/juniors
 * Obtiene los registros de cohorts y liderazgo Juniors.
 */
export async function getNodusJuniors({ sedeId } = {}, apiKey) {
  try {
    const result = await buildClient(apiKey).getJuniors({ sedeId });
    return { ok: true, ...result };
  } catch (error) {
    return wrapError(error);
  }
}

/**
 * 10. GET /api/modulos
 * Obtiene el catálogo dinámico de módulos disponibles en Nodus.
 */
export async function getNodusModulosCatalogo(apiKey) {
  try {
    const result = await buildClient(apiKey).getModulosCatalogo();
    return { ok: true, ...result };
  } catch (error) {
    return wrapError(error);
  }
}

/**
 * 11. GET /api/{moduloPath}
 * Consulta genérica para cualquier módulo nuevo auto-descubierto.
 */
export async function getNodusModuloGenerico(moduloPath, params = {}, apiKey) {
  try {
    const result = await buildClient(apiKey).getModuloGenerico(moduloPath, params);
    return { ok: true, ...result };
  } catch (error) {
    return wrapError(error);
  }
}

export { createNodusApiClient, NodusApiError };

export default {
  getSedes: getNodusSedes,
  getEquipos: getNodusEquipos,
  getParticipantesEquipo: getNodusParticipantesEquipo,
  getParticipantePorCedula: getNodusParticipantePorCedula,
  getPagos: getNodusPagos,
  getAliados: getNodusAliados,
  getContabilidad: getNodusContabilidad,
  getMesaRegistro: getNodusMesaRegistro,
  getJuniors: getNodusJuniors,
  getModulosCatalogo: getNodusModulosCatalogo,
  getModuloGenerico: getNodusModuloGenerico
};
