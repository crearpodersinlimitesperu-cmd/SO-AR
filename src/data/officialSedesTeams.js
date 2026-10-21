import { canonicalSede } from '../utils/sede.js';

/**
 * FUENTE DE VERDAD OFICIAL DE SEDES Y EQUIPOS INSTITUCIONALES (CAUSA OS 2026-2027)
 * Sincronizado con el Calendario Operativo Maestro y Directorio Oficial.
 */
export const OFFICIAL_SEDES = [
  'Quito',
  'Guayaquil',
  'Cuenca',
  'Lima',
  'Medellín',
  'México'
];

/**
 * Mapeo de rangos y equipos oficiales por sede según el Calendario Maestro.
 * Impide que se mezclen números de equipos entre sedes distintas.
 */
export const OFFICIAL_SEDES_TEAMS = {
  Quito: {
    minTeam: 123,
    maxTeam: 153,
    activeC1Team: 129,
    upcomingC1: [
      { team: 129, date: '2026-10-02' },
      { team: 130, date: '2026-10-30' },
      { team: 131, date: '2026-11-06' },
      { team: 132, date: '2026-12-04' },
      { team: 133, date: '2026-12-11' }
    ]
  },
  Guayaquil: {
    minTeam: 35,
    maxTeam: 50,
    activeC1Team: 38,
    upcomingC1: [
      { team: 38, date: '2026-10-09' },
      { team: 39, date: '2026-11-13' },
      { team: 40, date: '2026-12-18' },
      { team: 41, date: '2027-02-05' }
    ]
  },
  Cuenca: {
    minTeam: 21,
    maxTeam: 35,
    activeC1Team: 24,
    upcomingC1: [
      { team: 24, date: '2026-10-16' },
      { team: 25, date: '2026-11-20' },
      { team: 26, date: '2027-01-08' },
      { team: 27, date: '2027-02-12' }
    ]
  },
  Lima: {
    minTeam: 29,
    maxTeam: 44,
    activeC1Team: 32,
    upcomingC1: [
      { team: 32, date: '2026-10-23' },
      { team: 33, date: '2026-11-27' },
      { team: 34, date: '2027-01-08' },
      { team: 35, date: '2027-02-12' }
    ]
  },
  Medellín: {
    minTeam: 17,
    maxTeam: 32,
    activeC1Team: 20,
    upcomingC1: [
      { team: 20, date: '2026-10-16' },
      { team: 21, date: '2026-11-20' },
      { team: 22, date: '2027-01-15' },
      { team: 23, date: '2027-02-19' }
    ]
  },
  México: {
    minTeam: 6,
    maxTeam: 20,
    activeC1Team: 9,
    upcomingC1: [
      { team: 9, date: '2026-10-23' },
      { team: 10, date: '2026-11-27' },
      { team: 11, date: '2027-01-15' },
      { team: 12, date: '2027-02-19' }
    ]
  }
};

/**
 * Extrae limpiamente el número de equipo de cualquier cadena o número.
 * Soporta 'EQUIPO 30', 'Equipo 30 - Lima', 'E30', 'EQ 30', '30', etc.
 */
export const parseTeamNumber = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return Number.isInteger(val) && val > 0 ? val : null;
  const match = String(val).match(/(?:EQUIPO|EQ|E|IMOSE)?[\s\-_]*(\d+)\b/i);
  return match ? Number(match[1]) : null;
};

/**
 * Normaliza nombres de equipo para evitar duplicidades o variantes tipográficas.
 * Ej: 'EQUIPO 29 - LIMA CICLO 1 V' -> 'EQUIPO 29' o 'Equipo 29'
 */
export const normalizeEquipoLabel = (raw) => {
  const num = parseTeamNumber(raw);
  if (!num) return String(raw || '').trim();
  return `Equipo ${num}`;
};

/**
 * Valida si un número de equipo pertenece al rango operativo oficial de una sede dada.
 */
export const isTeamConsistentWithSede = (teamVal, sedeVal) => {
  const num = parseTeamNumber(teamVal);
  const normSede = canonicalSede(sedeVal);
  if (!num || !normSede || normSede === 'Global') return true;

  const sedeConfig = OFFICIAL_SEDES_TEAMS[normSede];
  if (!sedeConfig) return true;

  return num >= sedeConfig.minTeam && num <= sedeConfig.maxTeam;
};

/**
 * Deduce la sede más probable para un número de equipo dado cuando la sede no viene especificada.
 */
export const inferSedeFromTeamNumber = (teamVal) => {
  const num = parseTeamNumber(teamVal);
  if (!num) return null;

  // Quito tiene el rango más alto y único (123+)
  if (num >= 120 && num <= 160) return 'Quito';

  // Buscar coincidencia en rangos oficiales
  for (const [sede, conf] of Object.entries(OFFICIAL_SEDES_TEAMS)) {
    if (num >= conf.minTeam && num <= conf.maxTeam) {
      return sede;
    }
  }
  return null;
};
