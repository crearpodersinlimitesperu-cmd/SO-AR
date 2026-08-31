// src/data/venuesData.js
// Configuración de Sedes, Hoteles y Salones Oficiales por Defecto

export const defaultVenues = {
  Quito: {
    sede: 'Quito',
    c1_venue: 'CREAR PODER SIN LIMITES FORTALEZA CUÁNTICA (De los Naranjos, 170124 Quito, Ecuador)',
    c2_venue: 'CREAR PODER SIN LIMITES FORTALEZA CUÁNTICA (De los Naranjos, 170124 Quito, Ecuador)',
    mj_venue: 'CREAR PODER SIN LIMITES FORTALEZA CUÁNTICA (De los Naranjos, 170124 Quito, Ecuador)',
    viaje_venue: 'Quito (El Viaje)',
    caminata_venue: 'Quito, Ecuador',
    address: 'De los Naranjos, 170124 Quito, Ecuador',
    city: 'Quito',
    country: 'Ecuador'
  },
  Guayaquil: {
    sede: 'Guayaquil',
    c1_venue: 'Guayaquil',
    c2_venue: 'Guayaquil',
    mj_venue: 'Guayaquil',
    viaje_venue: 'Guayaquil (El Viaje)',
    caminata_venue: 'Guayaquil, Ecuador',
    address: 'Guayaquil, Ecuador',
    city: 'Guayaquil',
    country: 'Ecuador'
  },
  Cuenca: {
    sede: 'Cuenca',
    c1_venue: 'Cuenca',
    c2_venue: 'Cuenca',
    mj_venue: 'Cuenca',
    viaje_venue: 'Cuenca (El Viaje)',
    caminata_venue: 'Cuenca, Ecuador',
    address: 'Cuenca, Ecuador',
    city: 'Cuenca',
    country: 'Ecuador'
  },
  Lima: {
    sede: 'Lima',
    c1_venue: 'Hotel José Antonio Deluxe Miraflores (Calle Bellavista 133, Miraflores)',
    c2_venue: 'Hotel José Antonio Deluxe Miraflores (Calle Bellavista 133, Miraflores)',
    mj_venue: 'Hotel José Antonio Deluxe Miraflores (Calle Bellavista 133, Miraflores)',
    viaje_venue: 'Hostal Sol y Luna (Cieneguilla, Lima, Perú)',
    caminata_venue: 'CASONA BLANCA C. Las Perdices 1126, Lima 15457',
    address: 'Calle Bellavista 133, Miraflores, Lima, Perú',
    city: 'Lima',
    country: 'Perú'
  },
  Medellin: {
    sede: 'Medellín',
    c1_venue: 'Medellín',
    c2_venue: 'Medellín',
    mj_venue: 'Medellín',
    viaje_venue: 'Medellín (El Viaje)',
    caminata_venue: 'Medellín, Colombia',
    address: 'Medellín, Colombia',
    city: 'Medellín',
    country: 'Colombia'
  },
  Mexico: {
    sede: 'México',
    c1_venue: 'Ciudad de México',
    c2_venue: 'Ciudad de México',
    mj_venue: 'Ciudad de México',
    viaje_venue: 'México (El Viaje)',
    caminata_venue: 'Ciudad de México, México',
    address: 'Ciudad de México, México',
    city: 'Ciudad de México',
    country: 'México'
  }
};

/**
 * Obtiene el lugar/hotel oficial para una sede y nivel de entrenamiento
 */
export function getVenueForTraining(sede, trainingLevel = 'C1', rawPlace = '', rawAddress = '') {
  const normSede = (sede || '').trim().toLowerCase();
  const level = (trainingLevel || '').toUpperCase();
  
  let matchKey = null;
  if (normSede.includes('lima') || normSede === 'lim' || normSede.includes('pe lim') || normSede === 'pe' || normSede.startsWith('lim')) {
    matchKey = 'Lima';
  } else if (normSede.includes('quito') || normSede.includes('uio') || normSede.includes('ec uio') || normSede.startsWith('uio')) {
    matchKey = 'Quito';
  } else if (normSede.includes('cuenca') || normSede.includes('cue') || normSede.includes('ec cue') || normSede.startsWith('cue')) {
    matchKey = 'Cuenca';
  } else if (normSede.includes('guayaquil') || normSede.includes('gye') || normSede.includes('ec gye') || normSede.startsWith('gye')) {
    matchKey = 'Guayaquil';
  } else if (normSede.includes('medell') || normSede.includes('med') || normSede.includes('co med') || normSede.startsWith('med')) {
    matchKey = 'Medellin';
  } else if (normSede.includes('mex') || normSede.includes('méx') || normSede.includes('mx') || normSede.includes('cdmx')) {
    matchKey = 'Mexico';
  }

  // SI NO ES LIMA, JAMÁS USAR LIMA COMO DEFAULT
  if (!matchKey) {
    const fallbackName = (sede || 'Sede Local').trim();
    return fallbackName;
  }

  const venueObj = defaultVenues[matchKey];

  // Si el evento es "El Viaje", devolver el lugar específico de retiro
  if (level.includes('VIAJE') || level.includes('RETIRO') || level.includes('CIE') || level.includes('SOL Y LUNA')) {
    try {
      const customVenues = JSON.parse(localStorage.getItem('cpsl_custom_venues') || '{}');
      if (customVenues[matchKey] && customVenues[matchKey].viaje_venue) {
        return customVenues[matchKey].viaje_venue;
      }
    } catch (e) {}
    return venueObj.viaje_venue || (matchKey === 'Lima' ? 'Hostal Sol y Luna (Cieneguilla, Lima, Perú)' : `${venueObj.city} (El Viaje)`);
  }

  // Si viene un nombre específico en rawPlace, pero verificar que si no es Lima no traiga hoteles de Lima
  const cleanPlace = (rawPlace || '').trim();
  const isGeneric = !cleanPlace || 
                    cleanPlace.toLowerCase().includes('lima') && matchKey !== 'Lima' ||
                    cleanPlace.toLowerCase().includes('jose antonio') && matchKey !== 'Lima' ||
                    cleanPlace.toLowerCase().includes('miraflores') && matchKey !== 'Lima' ||
                    cleanPlace.toLowerCase() === 'quito, ecuador' ||
                    cleanPlace.toLowerCase() === 'quito' ||
                    cleanPlace.toLowerCase() === 'cuenca, ecuador' ||
                    cleanPlace.toLowerCase() === 'cuenca' ||
                    cleanPlace.toLowerCase() === 'guayaquil' ||
                    cleanPlace.toLowerCase() === 'medellín' ||
                    cleanPlace.toLowerCase() === 'medellin' ||
                    cleanPlace.toLowerCase() === 'méxico' ||
                    cleanPlace.toLowerCase() === 'mexico' ||
                    cleanPlace.toLowerCase().includes('por confirmar');

  if (!isGeneric && (cleanPlace.toLowerCase().includes('hotel') || cleanPlace.toLowerCase().includes('hostal') || cleanPlace.toLowerCase().includes('hoster') || cleanPlace.toLowerCase().includes('salon') || cleanPlace.toLowerCase().includes('salón') || cleanPlace.toLowerCase().includes('fortaleza') || cleanPlace.length > 25)) {
    return cleanPlace;
  }

  // Leer overrides personalizados en localStorage si existen
  try {
    const customVenues = JSON.parse(localStorage.getItem('cpsl_custom_venues') || '{}');
    if (customVenues[matchKey]) {
      if ((level.includes('C1') || level.includes('UNO')) && customVenues[matchKey].c1_venue) return customVenues[matchKey].c1_venue;
      if ((level.includes('C2') || level.includes('DOS')) && customVenues[matchKey].c2_venue) return customVenues[matchKey].c2_venue;
      if ((level.includes('MJ') || level.includes('MAESTR') || level.includes('JUEGO')) && customVenues[matchKey].mj_venue) return customVenues[matchKey].mj_venue;
      if (customVenues[matchKey].c1_venue) return customVenues[matchKey].c1_venue;
    }
  } catch (e) {}

  if (level.includes('C2') || level.includes('DOS')) return venueObj.c2_venue;
  if (level.includes('MJ') || level.includes('MAESTR') || level.includes('JUEGO')) return venueObj.mj_venue;
  if (level.includes('CAMINATA') || level.includes('FUEGO')) return venueObj.caminata_venue || venueObj.c1_venue;
  return venueObj.c1_venue;
}

