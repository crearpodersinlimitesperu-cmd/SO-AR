import { USERS_TO_IMPORT } from './usersToImport';

export const usersData = USERS_TO_IMPORT;

export const normalizeRole = (role) => {
  if (!role) return 'miembro';
  
  const r = role.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Coordinadores Capítulo 1 / Capítulo 2 (C1 / C2)
  if (r === 'coordinador_c1c2' || r === 'coord_c1' || r === 'coord_c2' || r === 'coordinador_c1' || r === 'coordinador_c2' || r.includes('capitulo uno') || r.includes('capitulo 1') || r.includes('capitulo dos') || r.includes('capitulo 2') || r === 'c1' || r === 'c2' || r === 'c1/c2' || r === 'c1c2') return 'coord_c1';
  
  // Coordinadores Maestría del Juego (MJ)
  if (r === 'coordinador_mj' || r === 'coord_maestria' || r === 'coordinador_maestria' || r.includes('maestria del juego') || r.includes('maestria') || r.includes('coordinador global maestria') || r === 'mj') return 'coord_maestria';
  
  // Gerentes
  if (r === 'gerente' || r === 'gerente_sede' || r.includes('gerente de sede')) return 'gerente';
  
  // Capitanes
  if (r === 'capitan') return 'capitan';
  
  // Quantum Team & Coordinación QT Global
  if (r === 'qt' || r === 'quantum_team' || r.includes('quantum') || r.includes('coord_qt') || r.includes('coordinador qt') || r.includes('coordinador_qt') || r.includes('qt global')) return 'qt';
  
  // Director Maestría del Juego (MJ)
  if (r === 'director_maestria' || r === 'director_mj' || (r.includes('director') && (r.includes('maestr') || r.includes('mj')))) return 'director_maestria';
  
  // Manager
  if (r === 'manager' || r === 'managers') return 'manager';
  
  // Direccion (CEO, CCO, Socio)
  if (r.includes('ceo') || r.includes('cco') || r.includes('socio') || r.includes('direccion') || r.includes('dirección')) return 'direccion';
  
  // CFO / Finanzas
  if (r === 'cfo' || r.includes('jefa financiera') || r.includes('jefe financiero')) return 'cfo';
  if (r.includes('facturacion') || r.includes('contador lima') || r.includes('contador medellin') || r.includes('finanzas')) return 'finanzas';
  
  // Coordinacion Administrativa
  if (r === 'coordinadora administrativa' || r === 'coordinador administrativo' || r === 'coordinador' || r === 'coordinadora' || r.includes('coordinacion administrativa')) return 'coordinador';
  
  // Talento Humano
  if (r.includes('talento humano')) return 'talento_humano';
  
  // Legal
  if (r.includes('legal') || r.includes('juridico')) return 'legal';
  
  // Impuestos
  if (r.includes('impuesto') || r.includes('tributar')) return 'asistente_impuestos_quito';
  
  // SST
  if (r.includes('sst') || r.includes('seguridad y salud')) return 'tecnico_sst';
  
  // Entrenador de Llamadas / Coach
  if (r === 'entrenador_llamadas' || r.includes('llamadas')) return 'entrenador_llamadas';
  
  // Entrenador (Coach)
  if (r === 'entrenador' || r === 'coach' || r.includes('entrenador') || r.includes('coach')) return 'entrenador';
  
  return r;
};

export const normalizeSede = (sede) => {
  if (!sede) return 'Sede Global';
  const s = sede.trim();
  if (s === 'MED' || s.toLowerCase().includes('medell')) return 'Medellín';
  if (s === 'LIM' || s.toLowerCase().includes('lima')) return 'Lima';
  if (s === 'CUE' || s.toLowerCase().includes('cuenca')) return 'Cuenca';
  if (s === 'GYE' || s.toLowerCase().includes('guayaquil')) return 'Guayaquil';
  if (s === 'MEX' || s.toLowerCase().includes('mex') || s.toLowerCase().includes('méxico')) return 'México';
  if (s === 'UIO-C1' || s === 'UIO-C2' || s === 'UIO' ||
      s.toLowerCase().includes('ciclo 1') || s.toLowerCase().includes('ciclo1') ||
      s.toLowerCase().includes('ciclo 2') || s.toLowerCase().includes('ciclo2') ||
      s.toLowerCase().includes('quito')) return 'Quito';
  if (s === 'INT' || s.toLowerCase().includes('intern')) return 'Internacional';
  if (s.toLowerCase().includes('global')) return 'Sede Global';
  return s;
};


export const OPERATIONAL_SEDES = [
  'Lima',
  'Quito',       // Ciclo 1 + Ciclo 2 fusionados (operan juntos)
  'Cuenca',
  'Guayaquil',
  'Medellín',
  'México'
];

export const ROLE_DISPLAY_NAMES = {
  coord_c1: 'Coordinador Capítulo 1 y 2 (C1 / C2)',
  coordinador_c1c2: 'Coordinador Capítulo 1 y 2 (C1 / C2)',
  coord_maestria: 'Coordinador Maestría del Juego (MJ)',
  coordinador_mj: 'Coordinador Maestría del Juego (MJ)',
  gerente: 'Gerente de Sede',
  capitan: 'Capitán de Sede',
  qt: 'Coordinador QT Global / QT',
  director_maestria: 'Director Maestría del Juego (MJ)',
  manager: 'Manager',
  cfo: 'CFO (Chief Financial Officer)',
  direccion: 'Dirección Global',
  finanzas: 'Finanzas',
  coordinador: 'Coordinación Administrativa',
  talento_humano: 'Talento Humano',
  legal: 'Legal / Jurídico',
  asistente_impuestos_quito: 'Impuestos & Tributación',
  tecnico_sst: 'Seguridad y Salud (SST)',
  entrenador: 'Entrenador (Coach)',
  entrenador_llamadas: 'Entrenador de Llamadas'
};

export const getRoleDisplayName = (role) => {
  if (!role) return 'Colaborador';
  const canonical = normalizeRole(role);
  if (ROLE_DISPLAY_NAMES[canonical]) return ROLE_DISPLAY_NAMES[canonical];
  if (ROLE_DISPLAY_NAMES[role]) return ROLE_DISPLAY_NAMES[role];
  return String(role)
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const ROLE_COLORS = {
  direccion: '#ef4444',
  cfo: '#eab308',
  gerente: '#f59e0b',
  director_maestria: '#ec4899',
  coordinador_c1c2: '#29abe2',
  coord_c1: '#29abe2',
  coordinador_mj: '#8b5cf6',
  coord_maestria: '#8b5cf6',
  capitan: '#22c55e',
  manager: '#10b981',
  qt: '#ec4899',
  coordinador: '#0ea5e9',
  finanzas: '#6b7280',
  asistente_impuestos_quito: '#64748b',
  talento_humano: '#06b6d4',
  legal: '#a855f7',
  tecnico_sst: '#14b8a6',
  entrenador: '#fbbf24',
  entrenador_llamadas: '#38bdf8'
};

/**
 * Busca un usuario por cualquiera de sus correos (corporativo @crearpsl.net o personal Gmail)
 */

export const findUserByAnyEmail = (searchEmail) => {
  if (!searchEmail) return null;
  const emailLower = searchEmail.toLowerCase().trim();
  return usersData.find(u => {
    if (u.email?.toLowerCase().trim() === emailLower) return true;
    if (u.corporateEmail?.toLowerCase().trim() === emailLower) return true;
    if (u.personalEmail?.toLowerCase().trim() === emailLower) return true;
    if (u.emails && u.emails.some(e => e.toLowerCase().trim() === emailLower)) return true;
    return false;
  }) || null;
};

