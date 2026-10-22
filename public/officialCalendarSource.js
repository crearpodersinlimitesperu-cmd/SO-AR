import { OFFICIAL_CALENDAR_SHEET_URL, parseOfficialCalendarSheet } from './officialCalendarSheet.js';
import { mergeOfficialCalendar } from './trainerCalendarProjection.js';

export const OFFICIAL_CALENDAR_API_URL = 'https://script.google.com/macros/s/AKfycbxSZFhddMYyspZpkW-qPHEi8hycLGfnhFeCPSYc4VbckWIeiiZAbxyJY71XRb2-Ya4U/exec?action=getEventos';
export const CALENDAR_CACHE_KEY = 'causa_official_calendar_cache';
export const CALENDAR_REFRESH_MS = 5 * 60 * 1000;

async function readSource(url, parse, fetchImpl, timeoutMs, signal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetchImpl(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await parse(response);
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('Tiempo de espera agotado'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export async function loadOfficialCalendar({ fetchImpl = fetch, timeoutMs = 8000, signal } = {}) {
  const [api, sheet] = await Promise.allSettled([
    readSource(OFFICIAL_CALENDAR_API_URL, async response => {
      const json = await response.json();
      const events = json?.data || json;
      if (!Array.isArray(events) || !events.length ||
          events.some(event => !event || !(event.fecha_inicio || event.start))) {
        throw new Error('Respuesta inválida o vacía de Apps Script');
      }
      return events;
    }, fetchImpl, timeoutMs, signal),
    readSource(OFFICIAL_CALENDAR_SHEET_URL, async response => {
      const events = parseOfficialCalendarSheet(await response.text());
      if (!events.length) throw new Error('Hoja oficial sin eventos');
      return events;
    }, fetchImpl, timeoutMs, signal),
  ]);
  const sources = { api: api.status === 'fulfilled', sheet: sheet.status === 'fulfilled' };
  const errors = [api, sheet].flatMap((result, index) => result.status === 'rejected'
    ? [`${index === 0 ? 'Apps Script' : 'Hoja oficial'}: ${result.reason.message}`] : []);
  if (!sources.api && !sources.sheet) throw new Error(errors.join('; '));
  return {
    events: mergeOfficialCalendar(sources.api ? api.value : [], sources.sheet ? sheet.value : [])
      .sort((a, b) => new Date(a.fecha_inicio || a.start) - new Date(b.fecha_inicio || b.start)),
    sources, errors, checkedAt: new Date().toISOString(),
  };
}

export function readCalendarCache(storage) {
  const raw = storage.getItem(CALENDAR_CACHE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  // Legacy arrays have no known retrieval time, so never give them a fresh timestamp.
  const events = Array.isArray(parsed) ? parsed : parsed?.events;
  if (!Array.isArray(events) || !events.length ||
      events.some(event => !event || !(event.fecha_inicio || event.start))) {
    throw new Error('Caché del calendario inválida');
  }
  return { events, checkedAt: Array.isArray(parsed) ? null : parsed.checkedAt || null };
}

export function calendarFreshnessText({ refreshing, checkedAt, sources, error, cached } = {}) {
  const timestamp = checkedAt ? new Date(checkedAt).toLocaleString('es') : 'desconocida';
  const previous = `Última lectura: ${timestamp}.`;
  if (refreshing) return `Consultando fuentes del calendario. ${previous}`;
  if (error) return `No se pudo actualizar el calendario. ${cached ? 'Copia local; actualidad no verificada.' : 'Se conservan los datos disponibles, sin verificar actualidad.'} ${previous} ${error}`;
  if (!sources) return `Copia local; actualidad no verificada. ${previous}`;
  if (!sources.sheet) return `Solo Apps Script; no se pudo contrastar la hoja vigente. ${previous}`;
  if (!sources.api) return `Hoja oficial consultada; historial de Apps Script no disponible. ${previous}`;
  return `Hoja oficial y Apps Script consultados. ${previous} Las asignaciones y cambios operativos se leen de Causa OS.`;
}
