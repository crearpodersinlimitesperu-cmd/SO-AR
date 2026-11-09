// src/utils/geoLocator.js
// Servicio de Geolocalización y Rastreo de Dispositivo para Auditoría Real
// Recopila país, ciudad, IP, zona horaria y dispositivo de forma rápida y resiliente.

const GEO_CACHE_KEY = 'cpsl_client_geo_cache';

// Mapa de zonas horarias para fallback instantáneo si las APIs remotas están bloqueadas
const TIMEZONE_COUNTRY_MAP = {
  'America/Lima': { country: 'Perú', countryCode: 'PE', flag: '🇵🇪', city: 'Lima' },
  'America/Guayaquil': { country: 'Ecuador', countryCode: 'EC', flag: '🇪🇨', city: 'Guayaquil' },
  'America/Bogota': { country: 'Colombia', countryCode: 'CO', flag: '🇨🇴', city: 'Bogotá' },
  'America/Mexico_City': { country: 'México', countryCode: 'MX', flag: '🇲🇽', city: 'Ciudad de México' },
  'America/Santiago': { country: 'Chile', countryCode: 'CL', flag: '🇨🇱', city: 'Santiago' },
  'America/Buenos_Aires': { country: 'Argentina', countryCode: 'AR', flag: '🇦🇷', city: 'Buenos Aires' },
  'America/La_Paz': { country: 'Bolivia', countryCode: 'BO', flag: '🇧🇴', city: 'La Paz' },
  'America/Caracas': { country: 'Venezuela', countryCode: 'VE', flag: '🇻🇪', city: 'Caracas' },
  'America/New_York': { country: 'Estados Unidos', countryCode: 'US', flag: '🇺🇸', city: 'New York' },
  'America/Chicago': { country: 'Estados Unidos', countryCode: 'US', flag: '🇺🇸', city: 'Chicago' },
  'America/Los_Angeles': { country: 'Estados Unidos', countryCode: 'US', flag: '🇺🇸', city: 'Los Ángeles' },
  'Europe/Madrid': { country: 'España', countryCode: 'ES', flag: '🇪🇸', city: 'Madrid' },
  'Europe/London': { country: 'Reino Unido', countryCode: 'GB', flag: '🇬🇧', city: 'Londres' }
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
 * Obtiene la geolocalización pública real del usuario (País, Ciudad, IP, ISP)
 * Utiliza caché de sesión para evitar peticiones repetidas.
 */
export async function getClientGeoLocation() {
  if (typeof window === 'undefined') {
    return {
      country: 'Perú',
      countryCode: 'PE',
      flag: '🇵🇪',
      city: 'Lima',
      region: 'Lima',
      ip: '127.0.0.1',
      timezone: 'America/Lima',
      device: 'Servidor',
      locationString: 'Lima, Perú 🇵🇪'
    };
  }

  // 1. Revisar caché en sessionStorage
  try {
    const cached = sessionStorage.getItem(GEO_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Validar que tenga datos válidos
      if (parsed && parsed.country) {
        return parsed;
      }
    }
  } catch (e) {
    // Continuar si sessionStorage falla
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima';
  const tzFallback = TIMEZONE_COUNTRY_MAP[timezone] || {
    country: 'Perú',
    countryCode: 'PE',
    flag: '🇵🇪',
    city: 'Lima'
  };

  const device = getClientDeviceInfo();
  let geoResult = null;

  // 2. Intentar servicio primario: ipwho.is (Rápido, SSL, sin API key)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2600);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false && data.country) {
        const flagEmoji = data.flag?.emoji || getCountryFlag(data.country_code);
        geoResult = {
          country: data.country,
          countryCode: data.country_code || tzFallback.countryCode,
          flag: flagEmoji,
          city: data.city || tzFallback.city,
          region: data.region || '',
          ip: data.ip || 'IP Oculta',
          isp: data.connection?.isp || data.connection?.org || '',
          timezone: data.timezone?.id || timezone,
          device: device,
          locationString: `${data.city ? `${data.city}, ` : ''}${data.country} ${flagEmoji}`.trim()
        };
      }
    }
  } catch (primaryErr) {
    // Continuar al fallback secundario
  }

  // 3. Fallback secundario: geojs.io
  if (!geoResult) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2600);
      const res = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.country) {
          const flagEmoji = getCountryFlag(data.country_code);
          geoResult = {
            country: data.country,
            countryCode: data.country_code || tzFallback.countryCode,
            flag: flagEmoji,
            city: data.city || tzFallback.city,
            region: data.region || '',
            ip: data.ip || 'IP Oculta',
            isp: data.organization_name || '',
            timezone: data.timezone || timezone,
            device: device,
            locationString: `${data.city ? `${data.city}, ` : ''}${data.country} ${flagEmoji}`.trim()
          };
        }
      }
    } catch (secondaryErr) {
      // Continuar al fallback local
    }
  }

  // 4. Fallback final por zona horaria del navegador si no hay conectividad externa
  if (!geoResult) {
    geoResult = {
      country: tzFallback.country,
      countryCode: tzFallback.countryCode,
      flag: tzFallback.flag,
      city: tzFallback.city,
      region: '',
      ip: 'Detectada por Timezone',
      isp: '',
      timezone: timezone,
      device: device,
      locationString: `${tzFallback.city}, ${tzFallback.country} ${tzFallback.flag}`.trim()
    };
  }

  // Guardar en sessionStorage para toda la sesión del navegador
  try {
    sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geoResult));
  } catch (e) {}

  return geoResult;
}
