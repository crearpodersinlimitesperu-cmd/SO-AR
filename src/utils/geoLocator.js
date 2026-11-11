// src/utils/geoLocator.js
// Servicio de Geolocalización, IP Pública y Rastreo Forense de Dispositivo para Auditoría Legal
// Recopila IP pública, coordenadas (lat/lng), país, ciudad, región, ISP, zona horaria y dispositivo sin excepción.

const GEO_CACHE_KEY = 'cpsl_client_geo_cache_v2';

// Mapa de zonas horarias para fallback instantáneo si las APIs remotas están bloqueadas
const TIMEZONE_COUNTRY_MAP = {
  'America/Lima': { country: 'Perú', countryCode: 'PE', flag: '🇵🇪', city: 'Lima', region: 'Lima', lat: -12.0464, lng: -77.0428 },
  'America/Guayaquil': { country: 'Ecuador', countryCode: 'EC', flag: '🇪🇨', city: 'Guayaquil', region: 'Guayas', lat: -2.1894, lng: -79.8891 },
  'America/Bogota': { country: 'Colombia', countryCode: 'CO', flag: '🇨🇴', city: 'Bogotá', region: 'Cundinamarca', lat: 4.7110, lng: -74.0721 },
  'America/Mexico_City': { country: 'México', countryCode: 'MX', flag: '🇲🇽', city: 'Ciudad de México', region: 'CDMX', lat: 19.4326, lng: -99.1332 },
  'America/Santiago': { country: 'Chile', countryCode: 'CL', flag: '🇨🇱', city: 'Santiago', region: 'RM', lat: -33.4489, lng: -70.6693 },
  'America/Buenos_Aires': { country: 'Argentina', countryCode: 'AR', flag: '🇦🇷', city: 'Buenos Aires', region: 'CABA', lat: -34.6037, lng: -58.3816 },
  'America/La_Paz': { country: 'Bolivia', countryCode: 'BO', flag: '🇧🇴', city: 'La Paz', region: 'La Paz', lat: -16.4897, lng: -68.1193 },
  'America/Caracas': { country: 'Venezuela', countryCode: 'VE', flag: '🇻🇪', city: 'Caracas', region: 'Distrito Capital', lat: 10.4806, lng: -66.9036 },
  'America/New_York': { country: 'Estados Unidos', countryCode: 'US', flag: '🇺🇸', city: 'New York', region: 'NY', lat: 40.7128, lng: -74.0060 },
  'America/Chicago': { country: 'Estados Unidos', countryCode: 'US', flag: '🇺🇸', city: 'Chicago', region: 'IL', lat: 41.8781, lng: -87.6298 },
  'America/Los_Angeles': { country: 'Estados Unidos', countryCode: 'US', flag: '🇺🇸', city: 'Los Ángeles', region: 'CA', lat: 34.0522, lng: -118.2437 },
  'Europe/Madrid': { country: 'España', countryCode: 'ES', flag: '🇪🇸', city: 'Madrid', region: 'Madrid', lat: 40.4168, lng: -3.7038 },
  'Europe/London': { country: 'Reino Unido', countryCode: 'GB', flag: '🇬🇧', city: 'Londres', region: 'England', lat: 51.5074, lng: -0.1278 }
};

// Generador de bandera emoji desde código ISO de 2 letras
export function getCountryFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌐';
  }
}

/**
 * Detecta el navegador y sistema operativo de forma amigable
 */
export function getClientDeviceInfo() {
  if (typeof window === 'undefined' || !navigator) {
    return 'Entorno Servidor / Desconocido';
  }

  const ua = navigator.userAgent || '';
  let browser = 'Navegador Web';
  let os = 'Dispositivo';

  // Detección de OS
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  // Detección de Browser
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

  return `${browser} (${os})`;
}

/**
 * Intenta obtener coordenadas GPS de alta precisión del navegador si el usuario lo permite (con timeout corto)
 */
export function getBrowserGpsCoordinates(timeoutMs = 2200) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator || !navigator.geolocation) {
      resolve(null);
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeoutMs);

    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve({
              lat: Number(pos.coords.latitude.toFixed(6)),
              lng: Number(pos.coords.longitude.toFixed(6)),
              accuracyMeters: Math.round(pos.coords.accuracy || 0),
              source: 'GPS_DISPOSITIVO'
            });
          }
        },
        () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(null);
          }
        },
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
      );
    } catch {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

/**
 * Obtiene la geolocalización pública real del usuario (IP, Coordenadas, País, Ciudad, Región, ISP, Dispositivo)
 * Triple redundancia: ipwho.is -> geojs.io -> ipify + ipapi -> fallback timezone
 */
export async function getClientGeoLocation(options = { forceFresh: false, tryGps: false }) {
  if (typeof window === 'undefined') {
    return {
      country: 'Perú',
      countryCode: 'PE',
      flag: '🇵🇪',
      city: 'Lima',
      region: 'Lima',
      ip: '127.0.0.1',
      lat: -12.0464,
      lng: -77.0428,
      coordinates: '-12.0464, -77.0428',
      geoSource: 'SERVER',
      timezone: 'America/Lima',
      device: 'Servidor',
      userAgent: 'Server',
      locationString: 'Lima, Perú 🇵🇪'
    };
  }

  // 1. Revisar caché en sessionStorage si no se exige lectura fresca
  if (!options?.forceFresh) {
    try {
      const cached = sessionStorage.getItem(GEO_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.ip && parsed.ip !== 'IP Oculta' && parsed.ip !== 'Detectada por Timezone' && parsed.country) {
          return parsed;
        }
      }
    } catch {
      // Continuar
    }
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima';
  const tzFallback = TIMEZONE_COUNTRY_MAP[timezone] || {
    country: 'Perú',
    countryCode: 'PE',
    flag: '🇵🇪',
    city: 'Lima',
    region: 'Lima',
    lat: -12.0464,
    lng: -77.0428
  };

  const device = getClientDeviceInfo();
  const userAgent = navigator.userAgent || '';
  let geoResult = null;

  // 2. Intentar servicio primario: ipwho.is (Rápido, SSL, devuelve IP, lat, lng, ciudad, ISP)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2800);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false && data.ip) {
        const flagEmoji = data.flag?.emoji || getCountryFlag(data.country_code);
        const lat = typeof data.latitude === 'number' ? Number(data.latitude.toFixed(6)) : tzFallback.lat;
        const lng = typeof data.longitude === 'number' ? Number(data.longitude.toFixed(6)) : tzFallback.lng;
        geoResult = {
          country: data.country || tzFallback.country,
          countryCode: data.country_code || tzFallback.countryCode,
          flag: flagEmoji,
          city: data.city || tzFallback.city,
          region: data.region || tzFallback.region || '',
          ip: data.ip,
          lat,
          lng,
          coordinates: `${lat}, ${lng}`,
          geoSource: 'IPWHO_IS',
          isp: data.connection?.isp || data.connection?.org || '',
          timezone: data.timezone?.id || timezone,
          device,
          userAgent,
          locationString: `${data.city ? `${data.city}, ` : ''}${data.region ? `${data.region}, ` : ''}${data.country || tzFallback.country} ${flagEmoji}`.trim()
        };
      }
    }
  } catch {
    // Continuar al segundo proveedor
  }

  // 3. Fallback secundario: geojs.io
  if (!geoResult) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2800);
      const res = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.ip) {
          const flagEmoji = getCountryFlag(data.country_code);
          const lat = data.latitude ? Number(parseFloat(data.latitude).toFixed(6)) : tzFallback.lat;
          const lng = data.longitude ? Number(parseFloat(data.longitude).toFixed(6)) : tzFallback.lng;
          geoResult = {
            country: data.country || tzFallback.country,
            countryCode: data.country_code || tzFallback.countryCode,
            flag: flagEmoji,
            city: data.city || tzFallback.city,
            region: data.region || tzFallback.region || '',
            ip: data.ip,
            lat,
            lng,
            coordinates: `${lat}, ${lng}`,
            geoSource: 'GEOJS_IO',
            isp: data.organization_name || data.organization || '',
            timezone: data.timezone || timezone,
            device,
            userAgent,
            locationString: `${data.city ? `${data.city}, ` : ''}${data.region ? `${data.region}, ` : ''}${data.country || tzFallback.country} ${flagEmoji}`.trim()
          };
        }
      }
    } catch {
      // Continuar al tercer proveedor
    }
  }

  // 4. Fallback terciario: ipapi.co o api.ipify.org para asegurar la IP pública sin excepción
  if (!geoResult) {
    let resolvedIp = 'No detectada';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const ipData = await res.json();
        if (ipData && ipData.ip) resolvedIp = ipData.ip;
      }
    } catch {
      // Ignorar
    }

    geoResult = {
      country: tzFallback.country,
      countryCode: tzFallback.countryCode,
      flag: tzFallback.flag,
      city: tzFallback.city,
      region: tzFallback.region || '',
      ip: resolvedIp,
      lat: tzFallback.lat,
      lng: tzFallback.lng,
      coordinates: `${tzFallback.lat}, ${tzFallback.lng}`,
      geoSource: resolvedIp !== 'No detectada' ? 'IPIFY_TZ' : 'TIMEZONE_FALLBACK',
      isp: '',
      timezone,
      device,
      userAgent,
      locationString: `${tzFallback.city}, ${tzFallback.country} ${tzFallback.flag}`.trim()
    };
  }

  // 5. Si se solicita intento de GPS de dispositivo, enriquecer coordenadas
  if (options?.tryGps) {
    const gps = await getBrowserGpsCoordinates(2200);
    if (gps && gps.lat && gps.lng) {
      geoResult.lat = gps.lat;
      geoResult.lng = gps.lng;
      geoResult.coordinates = `${gps.lat}, ${gps.lng}`;
      geoResult.gpsAccuracyMeters = gps.accuracyMeters;
      geoResult.geoSource = `${geoResult.geoSource}+GPS`;
    }
  }

  // Guardar en sessionStorage
  try {
    sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geoResult));
  } catch {}

  return geoResult;
}
