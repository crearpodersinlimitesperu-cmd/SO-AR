// Configuración centralizada de permisos y roles administrativos
// Este archivo es la ÚNICA fuente de verdad para emails con privilegios elevados.
// Cualquier cambio de SuperAdmin se hace AQUÍ, no disperso en el código.

/**
 * Emails con privilegios de Super Administrador.
 * Estos usuarios tienen acceso total: Centro de Mando, reinicio de ciclos,
 * gestión de metas, y visibilidad global multi-sede.
 */
export const SUPER_ADMIN_EMAILS = [
  'jose.sanchez@crearpsl.net',
  'armando.pilacuan@gmail.com',
  'paul.sosa@crearpsl.net',
  'paul.sosa@crearpsl.com'
];

/**
 * Roles que otorgan privilegios de Dirección (equivalente a SuperAdmin por rol)
 */
export const DIRECCION_ROLES = ['direccion', 'cfo', 'cco', 'ceo'];

/**
 * Roles que otorgan privilegios de Gerencia
 */
export const GERENCIA_ROLES = ['gerente', ...DIRECCION_ROLES];

/**
 * Verifica si un email tiene privilegios de SuperAdmin
 * @param {string} email 
 * @returns {boolean}
 */
export const isSuperAdminEmail = (email) => {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
};

/**
 * Verifica si el usuario actual tiene permisos para simular vistas de otros colaboradores.
 * REGLA ESTRICTA DE SEGURIDAD:
 * ÚNICA Y EXCLUSIVAMENTE los Super Administradores pueden simular usuarios.
 * @param {Object} currentUser
 * @param {Object} originalAdminUser
 * @returns {boolean}
 */
export const canSimulate = (currentUser, originalAdminUser = null) => {
  if (originalAdminUser) {
    return Boolean(originalAdminUser.isSuperAdmin || isSuperAdminEmail(originalAdminUser.email));
  }
  if (!currentUser) return false;
  return Boolean(currentUser.isSuperAdmin || isSuperAdminEmail(currentUser.email));
};

/**
 * Verifica si un rol normalizado tiene privilegios de Dirección
 * @param {string} role - Rol normalizado
 * @returns {boolean}
 */
export const isDireccionRole = (role) => {
  return DIRECCION_ROLES.includes(role);
};

/**
 * Verifica si un rol normalizado tiene privilegios de Gerencia
 * @param {string} role - Rol normalizado  
 * @returns {boolean}
 */
export const isGerenciaRole = (role) => {
  return GERENCIA_ROLES.includes(role);
};

/**
 * Verifica si un usuario puede agregar nuevos managers (Coordinador Maestría, Director Maestría o SuperAdmin)
 */
export const canAddManagers = (currentUser) => {
  if (!currentUser) return false;
  if (currentUser.isSuperAdmin || isSuperAdminEmail(currentUser.email)) return true;
  const r = currentUser.appRole;
  return r === 'director_maestria' || r === 'coord_maestria' || r === 'coordinador_mj';
};

/**
 * Verifica si un usuario puede asignar o reasignar entrenadores a managers.
 * REGLA ESTRICTA:
 * SOLO Fer Aragón, Paul Sosa y los SuperAdministradores (José Sánchez, Armando Pilacuán, etc.)
 * tienen permiso para editar o reasignar entrenadores. Nadie más.
 */
export const canAssignTrainer = (currentUser) => {
  if (!currentUser) return false;
  if (currentUser.isSuperAdmin || isSuperAdminEmail(currentUser.email)) return true;
  
  const email = (currentUser.email || '').trim().toLowerCase();

  // Fer y Paul autorizados exclusivamente
  const allowedEmails = [
    'fer.aragon@crearpsl.net',
    'fer.aragon@crearpls.com',
    'paul.sosa@crearpsl.net',
    'paul.sosa@crearpsl.com'
  ];
  if (allowedEmails.includes(email)) return true;

  const name = (currentUser.name || currentUser.displayName || '').toLowerCase();
  if (name.includes('fer aragon') || name.includes('fernando aragon') || name.includes('paul sosa')) {
    return true;
  }

  return false;
};

/**
 * Verifica si un usuario puede cambiar el estado de un manager (Graduaciones / Deserciones).
 * REGLA ESTRICTA DE GOBERNANZA (INVIOLABLE):
 * Restringida ÚNICA Y EXCLUSIVAMENTE a:
 * 1. Coordinación de Maestría del Juego (coord_maestria / coordinador_mj)
 * 2. Dirección de Maestría (director_maestria)
 * 3. Super Administradores
 * 
 * Entrenadores, capitanes, coordinadores C1/C2, gerentes de sede y demás roles NO pueden cambiar estados.
 */
export const canChangeManagerStatus = (currentUser) => {
  if (!currentUser) return false;
  if (currentUser.isSuperAdmin || isSuperAdminEmail(currentUser.email)) return true;
  const r = currentUser.appRole;
  return r === 'director_maestria' || r === 'coord_maestria' || r === 'coordinador_mj';
};

export const canViewAllManagers = (currentUser) => {
  if (!currentUser) return false;
  if (currentUser.isSuperAdmin || currentUser.isDireccion || isSuperAdminEmail(currentUser.email)) return true;
  const r = currentUser.appRole;
  return r === 'director_maestria' || isDireccionRole(r);
};

/**
 * Verifica si el usuario puede ver managers de su sede (Coordinadores de Maestría y Gerentes de Sede).
 */
export const canViewSede = (currentUser) => {
  if (!currentUser) return false;
  const r = currentUser.appRole;
  return r === 'coord_maestria' || r === 'coordinador_mj' || r === 'gerente' || currentUser.isGerente;
};

/**
 * Emails de entrenadores que TAMBIÉN tienen un rol corporativo (dual-role).
 * Estos usuarios pueden alternar entre su vista de entrenador y su rol de oficina.
 */
export const DUAL_ROLE_TRAINER_EMAILS = [
  'andres.gomez@crearpsl.net',     // Director Maestría + Entrenador C2+MJ
  'fer.aragon@crearpsl.net',        // Corporativo + Entrenador C1
  'paul.sosa@crearpsl.net',         // Corporativo + Entrenador C2+MJ
  'leandro.brunis@crearpsl.net',    // Dirección / Corporativo + Entrenador C1 (Leandro Brunis)
  'leandro.brunis@crearpsl.com',
  'carlos.brunis@crearpsl.net',     // Coordinador QT Global + Entrenador (Carlos Brunis)
  'carlos.brunis@crearpsl.com',
  'brunische66@gmail.com',
];

/**
 * Devuelve la lista de roles a los que el usuario actual puede asignar tareas,
 * basado en la jerarquía del organigrama de CREAR PSL.
 * @param {Object} currentUser - Objeto del usuario logueado
 * @returns {Array<{id: string, name: string}>}
 */
export const getAssignableRoles = (currentUser) => {
  const normRole = currentUser?.appRole;
  
  if (!normRole) return [];

  if (currentUser.isSuperAdmin) {
    return [
      { id: 'gerente', name: 'Gerente de Sede' },
      { id: 'director_maestria', name: 'Director de Maestría' },
      { id: 'coord_maestria', name: 'Coordinador Maestría' },
      { id: 'coord_c1', name: 'Coordinador C1/C2' },
      { id: 'capitan', name: 'Capitán' },
      { id: 'manager', name: 'Manager' },
      { id: 'qt', name: 'Quantum Team (QT)' },
      { id: 'admin', name: 'Equipo Administrativo' }
    ];
  }

  if (isDireccionRole(normRole) || normRole === 'director_maestria') {
    return [
      { id: 'gerente', name: 'Gerente de Sede' },
      { id: 'coord_maestria', name: 'Coordinador Maestría' },
      { id: 'coord_c1', name: 'Coordinador C1/C2' },
      { id: 'capitan', name: 'Capitán' },
      { id: 'manager', name: 'Manager' },
      { id: 'qt', name: 'Quantum Team (QT)' },
      { id: 'admin', name: 'Equipo Administrativo' }
    ];
  }

  if (normRole === 'gerente') {
    return [
      { id: 'gerente', name: 'Gerente (O a otros Gerentes)' },
      { id: 'coord_c1', name: 'Coordinador C1/C2' },
      { id: 'coord_maestria', name: 'Coordinador Maestría' },
      { id: 'capitan', name: 'Capitán' },
      { id: 'qt', name: 'Quantum Team (QT)' },
      { id: 'manager', name: 'Manager' },
      { id: 'admin', name: 'Equipo Administrativo' }
    ];
  }

  if (normRole === 'coord_c1') {
    return [
      { id: 'coord_c1', name: 'Coordinador C1/C2 (A mí mismo)' },
      { id: 'capitan', name: 'Capitán' },
      { id: 'qt', name: 'Quantum Team (QT)' }
    ];
  }

  if (normRole === 'coord_maestria') {
    return [
      { id: 'coord_maestria', name: 'Coordinador Maestría (A mí mismo)' },
      { id: 'manager', name: 'Manager' }
    ];
  }

  if (normRole === 'qt') {
    return [
      { id: 'qt', name: 'Quantum Team (A mí mismo)' },
      { id: 'coord_c1', name: 'Coordinador C1/C2' }
    ];
  }

  // Base roles: Capitán, Manager, etc.
  return [
    { id: normRole, name: 'A mí mismo' }
  ];
};
