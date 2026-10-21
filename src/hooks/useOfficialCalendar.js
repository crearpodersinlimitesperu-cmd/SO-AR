import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeOfficialCalendar } from '../services/trainerCalendarProjection.js';
import {
  CALENDAR_CACHE_KEY, CALENDAR_REFRESH_MS, loadOfficialCalendar, readCalendarCache,
} from '../../public/officialCalendarSource.js';

export function useOfficialCalendar() {
  const [sourceEvents, setSourceEvents] = useState([]);
  const [calendarStatus, setCalendarStatus] = useState({ refreshing: true });
  const [loadingEvents, setLoadingEvents] = useState(true);
  const inFlight = useRef(null);
  const mounted = useRef(false);
  const lastEvents = useRef([]);

  const refreshCalendar = useCallback(() => {
    if (inFlight.current) return inFlight.current.promise;
    const controller = new AbortController();
    setCalendarStatus(previous => ({ ...previous, refreshing: true }));
    const promise = loadOfficialCalendar({ signal: controller.signal }).then(result => {
      if (!mounted.current || controller.signal.aborted) return;
      const events = result.sources.api ? result.events : mergeOfficialCalendar(lastEvents.current, result.events);
      lastEvents.current = events;
      setSourceEvents(events);
      setCalendarStatus({
        checkedAt: result.checkedAt, sources: result.sources, refreshing: false, cached: false,
      });
      if (result.errors.length) console.warn('Lectura parcial del calendario:', result.errors);
      try {
        localStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify({
          events, checkedAt: result.checkedAt,
        }));
      } catch (error) {
        console.warn('No se pudo guardar la caché del calendario:', error);
      }
    }).catch(error => {
      if (!mounted.current || controller.signal.aborted) return;
      console.error('No se pudo actualizar el calendario:', error);
      setCalendarStatus(previous => ({ ...previous, refreshing: false, error: error.message }));
    }).finally(() => {
      if (inFlight.current?.controller === controller) inFlight.current = null;
      if (mounted.current && !controller.signal.aborted) setLoadingEvents(false);
    });
    inFlight.current = { controller, promise };
    return promise;
  }, []);

  useEffect(() => {
    mounted.current = true;
    try {
      const cached = readCalendarCache(localStorage);
      if (cached) {
        lastEvents.current = cached.events;
        setSourceEvents(cached.events);
        setCalendarStatus({ checkedAt: cached.checkedAt, cached: true, refreshing: true });
        setLoadingEvents(false);
      }
    } catch (error) {
      console.warn('No se pudo leer la caché del calendario:', error);
    }
    refreshCalendar();
    const onVisible = () => { if (document.visibilityState === 'visible') refreshCalendar(); };
    window.addEventListener('online', refreshCalendar);
    window.addEventListener('focus', refreshCalendar);
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(onVisible, CALENDAR_REFRESH_MS);
    return () => {
      mounted.current = false;
      inFlight.current?.controller.abort();
      inFlight.current = null;
      clearInterval(interval);
      window.removeEventListener('online', refreshCalendar);
      window.removeEventListener('focus', refreshCalendar);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshCalendar]);

  return { sourceEvents, loadingEvents, calendarStatus, refreshCalendar };
}
