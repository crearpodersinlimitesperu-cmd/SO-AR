export const FLIGHT_DISCLAIMER = 'Estado real del vuelo no disponible; consultar aerolínea/radar externo';

const timestamp = value => typeof value === 'string' ? Date.parse(value) : NaN;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function flightDepartureCountdown(flight, now = Date.now()) {
  const departure = timestamp(flight?.schedule?.scheduledDeparture);
  if (!Number.isFinite(departure) || !Number.isFinite(now)) {
    return { state: 'unknown', text: 'Hora programada no disponible' };
  }
  if (departure <= now) {
    return { state: 'past', text: 'La hora programada ya pasó' };
  }
  // Round up so a future departure never displays zero seconds remaining.
  const remaining = Math.ceil((departure - now) / 1000);
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const units = [
    ...(days > 0 ? [[days, 'día', 'días']] : []),
    ...(days > 0 || hours > 0 ? [[hours, 'hora', 'horas']] : []),
    ...(days > 0 || hours > 0 || minutes > 0 ? [[minutes, 'minuto', 'minutos']] : []),
    [seconds, 'segundo', 'segundos'],
  ];
  return {
    state: 'upcoming',
    text: units.map(([value, singular, plural]) => `${value} ${value === 1 ? singular : plural}`).join(' · '),
  };
}

// These sources contain itinerary PDFs, not airline observations (including legacy ON_TIME).
export function normalizeFlightTracker(data) {
  if (!data || !Number.isFinite(timestamp(data.updatedAt)) || !isRecord(data.flights)) {
    throw new Error('Formato de itinerarios no válido');
  }
  const flights = Object.fromEntries(Object.entries(data.flights).map(([key, flight]) => {
    if (!isRecord(flight) || !isRecord(flight.schedule) ||
        (flight.route !== undefined && !isRecord(flight.route)) ||
        ['flightNumber', 'flightCode', 'airline', 'reservationCode'].some(field =>
          flight[field] != null && typeof flight[field] !== 'string') ||
        ['origin', 'destination', 'originCity', 'destinationCity'].some(field =>
          flight.route?.[field] != null && typeof flight.route[field] !== 'string') ||
        (flight.passengers !== undefined && (!Array.isArray(flight.passengers) ||
          flight.passengers.some(p => typeof p !== 'string')))) {
      throw new Error('Formato de itinerarios no válido');
    }
    const scheduled = Number.isFinite(timestamp(flight.schedule.scheduledDeparture));
    return [key, {
      ...flight,
      status: scheduled ? 'SCHEDULED' : 'STATUS_UNAVAILABLE',
      statusLabel: scheduled ? 'Programado según itinerario' : 'Estado real no disponible',
      statusDescription: FLIGHT_DISCLAIMER,
      delayMinutes: null,
      schedule: {
        ...flight.schedule,
        estimatedDeparture: null,
        estimatedArrival: null,
        actualDeparture: null,
        actualArrival: null,
      },
    }];
  }));
  return { ...data, flights };
}

export function flightTimeWindow(flight, now = Date.now()) {
  const departure = timestamp(flight.schedule?.scheduledDeparture);
  const arrival = timestamp(flight.schedule?.scheduledArrival);
  if (!Number.isFinite(departure)) return 'unknown';
  if (departure > now) return 'upcoming';
  if (Number.isFinite(arrival) && arrival > departure && arrival > now) return 'estimated';
  return 'past';
}

export function matchesFlightTimeFilter(flight, filter, now = Date.now()) {
  const window = flightTimeWindow(flight, now);
  if (filter === 'activos') return window === 'upcoming' || window === 'estimated';
  if (filter === 'pasados') return window === 'past';
  return true;
}

export async function loadFlightTracker(fetcher = fetch) {
  for (const url of ['/vuelos_tracker.json', '/cartas/vuelos_tracker.json']) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetcher(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Fuente de itinerarios no disponible');
      return normalizeFlightTracker(await response.json());
    } catch {
      // The alternate path also has to pass validation; no embedded fallback data.
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error('No se pudieron cargar los itinerarios desde Drive. Reintenta la carga.');
}
