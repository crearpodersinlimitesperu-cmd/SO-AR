import { PORTFOLIO_FI_REVIEW_EMAILS, isDataAdmin } from './permissions.js';

export const EXEC_ROLES = ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'director_maestria'];
export const KPI_ROLES = ['coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'qt', 'capitan'];
export const DIRECTORIO_QT_ROLES = ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'qt', 'superadmin', 'director_maestria'];
// CAMPUS_ROLES: ya no se usa como filtro — Campus Interactivo es abierto a TODOS los
// roles según la Matriz Oficial (fila "Campus Interactivo" = X en las 9 columnas).
// Se deja declarada solo por si se necesita revertir a un acceso restringido.
export const CAMPUS_ROLES = ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'superadmin'];
export const CENTRO_MANAGERS_ROLES = ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coordinador_mj', 'coord_maestria', 'entrenador', 'entrenador_llamadas', 'superadmin', 'director_maestria'];
export const MANUAL_ROLES = ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'qt', 'superadmin', 'director_maestria'];
export const MANUAL_NODUS_ROLES = ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'superadmin', 'director_maestria'];
export const REPORTES_VISIBLE = (u) => Boolean(
  u?.isSuperAdmin || u?.isGerente ||
  ['coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'capitan', 'qt', 'direccion', 'director_maestria', 'aliado', 'manager'].includes(u?.appRole)
);

export const MODULE_REGISTRY = [
  { id: 'gerencial', label: 'Causa OS Gerencial', emoji: '💼', route: '/gerente', roles: EXEC_ROLES },
  { id: 'portafolio', label: 'Portafolio PMO (Planview)', emoji: '📈', route: '/portafolio', roles: EXEC_ROLES },
  { id: 'estrategia', label: 'Estrategia OKRs (Cascade)', emoji: '🎯', route: '/estrategia', roles: EXEC_ROLES },
  { id: 'auditoria-kpis', label: 'Auditoría de KPIs', emoji: '📉', route: '/auditoria-kpis', roles: EXEC_ROLES },
  { id: 'acuerdos', label: 'Acuerdos Oficiales (Correo)', emoji: '✉️', route: '/acuerdos', roles: EXEC_ROLES },
  { id: 'calendario-equipo', label: 'Agenda y Time Boxing', emoji: '🗓️', route: '/calendario-equipo', roles: null },
  { id: 'learning', label: 'Inteligencia Colectiva (Learning)', emoji: '🧠', route: '/learning', roles: EXEC_ROLES },
  { id: 'excelencia', label: 'Excelencia Operativa', emoji: '👑', route: '/excelencia', roles: EXEC_ROLES },
  { id: 'mis-kpis', label: 'Mis KPIs', emoji: '📊', route: '/mis-kpis', roles: KPI_ROLES },
  { id: 'directorio-qt', label: 'Directorio QT', emoji: '⚡', route: '/directorio-qt', roles: DIRECTORIO_QT_ROLES },
  { id: 'superadmin', label: 'Centro de Mando', emoji: '🌐', route: '/superadmin', roles: [...EXEC_ROLES, 'talento_humano'] },
  // Antes era null (abierto a todos). Corregido: Directivos + Gerentes únicamente
  // según la Matriz Oficial, fila "Calendario Global" (08/09/2026).
  { id: 'calendario-global', label: 'Calendario Global Maestro', emoji: '📅', external: 'calendario-global', roles: EXEC_ROLES },
  // Abierto a TODOS los roles según la Matriz Oficial (antes usaba CAMPUS_ROLES, restrictivo).
  { id: 'campus', label: 'Campus Interactivo', emoji: '🎓', external: 'https://cpsl-campus-interactivo.vercel.app/ruta', roles: null },
  { id: 'centro-managers', label: 'Centro de Managers', emoji: '🎯', route: '/centro-managers', roles: CENTRO_MANAGERS_ROLES },
  { id: 'protocolo-emergencias', label: 'Protocolo de Emergencias', emoji: '🚨', route: '/protocolo-emergencias', roles: null },
  { id: 'manual', label: 'Manual / Guía Causa OS / QT', emoji: '📘', route: '/manual', roles: MANUAL_ROLES },
  { id: 'manual-nodus', label: 'Manual Práctico Nodus', emoji: '📗', route: '/manual-nodus', roles: MANUAL_NODUS_ROLES },
  { id: 'checklist', label: 'Mi Checklist Operativo', emoji: '✅', route: (u) => `/checklist/${u?.appRole || 'capitan'}`, roles: null },
  { id: 'metas', label: 'Mis Metas', emoji: '🏆', route: '/metas', roles: null },
  { id: 'reportes', label: 'Enviar Reportes', emoji: '📤', route: '/reportes', roles: null, visible: REPORTES_VISIBLE },
  // Corregido según confirmación explícita de José (08/09/2026): Directivos (y
  // director_maestria, tratado como Directivos) NO tienen acceso a Flyers C1.
  // Solo Gerentes, Coordinadores C1Y2 y Coordinadores de MJ, según la Matriz Oficial.
  { id: 'generador-flyer', label: 'Generador de Flyers Oficiales', emoji: '🎨', route: '/generador-flyer', roles: ['gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj'] },
  { id: 'cfo-dashboard', label: 'Dirección Financiera Global', emoji: '🏦', route: '/cfo-dashboard', roles: null, visible: (u) => ['cfo', 'ceo', 'superadmin', 'direccion'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'finance-workspace', label: 'Operativa Financiera', emoji: '💸', route: '/finance-workspace', roles: null, visible: (u) => ['finanzas', 'facturacion', 'contador', 'superadmin'].includes(u?.appRole) },
  { id: 'maestria-global', label: 'Comando Global Maestría', emoji: '🎯', route: '/maestria-global', roles: null, visible: (u) => ['director_maestria', 'direccion', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'trainer-hub', label: 'Academia y Hub de Entrenamiento', emoji: '🎓', route: '/trainer-hub', roles: null, visible: (u) => ['entrenador', 'direccion', 'superadmin', 'ceo', 'director_maestria'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'call-coach-crm', label: 'CRM Entrenadores de Llamadas', emoji: '📞', route: '/call-coach-crm', roles: null, visible: (u) => ['entrenador_llamadas', 'direccion', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'qt-hub', label: 'Hub Operativo QT', emoji: '⚡', route: '/qt-hub', roles: null, visible: (u) => ['qt', 'gerente', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'hr-command-center', label: 'HR Command Center', emoji: '🏢', route: '/hr-command-center', roles: null, visible: (u) => ['talento_humano', 'rrhh', 'superadmin', 'ceo', 'direccion'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'legal-hub', label: 'Torre de Riesgo (Legal)', emoji: '⚖️', route: '/legal-hub', roles: null, visible: (u) => ['legal', 'juridico', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'andres-command-center', label: 'Comando Maestría (Andrés)', emoji: '🌐', route: '/andres-command-center', roles: null, visible: (u) => ['coord_maestria_global', 'director_maestria', 'superadmin', 'ceo'].includes(u?.appRole) || u?.isSuperAdmin },
  { id: 'panel-legal', label: 'Auditoría Legal (Firmas)', emoji: '⚖️', route: '/legal-admin', roles: null, visible: (u) => isDataAdmin(u) },
];

export const isModuleVisible = (mod, currentUser) => {
  if (typeof mod.visible === 'function') return mod.visible(currentUser);
  if (mod.roles === null) return true;
  const allowedRoles = mod.roles || [];
  // Super Administrador (cuando NO está en simulación explícita de otro usuario) tiene acceso total a todos los módulos
  if (currentUser?.isSuperAdmin && !currentUser?.isSimulated) return true;
  // Respaldo nominal únicamente para el acceso de revisión FI de Andrés Gómez.
  // No convierte su cuenta en superadmin ni altera otros módulos.
  if (mod.id === 'portafolio' && PORTFOLIO_FI_REVIEW_EMAILS.includes((currentUser?.email || '').trim().toLowerCase())) return true;
  if (currentUser?.appRole === 'consolidado') return true;
  return allowedRoles.includes(currentUser?.appRole);
};

