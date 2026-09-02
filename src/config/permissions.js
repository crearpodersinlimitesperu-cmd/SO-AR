// Configuración centralizada de permisos y roles administrativos
// Este archivo es la ÚNICA fuente de verdad para emails con privilegios elevados.
// Cualquier cambio de SuperAdmin se hace AQUÍ, no disperso en el código.

/**
 * Emails con privilegios de Super Administrador.
 * Estos usuarios tienen acceso total: Centro de Mando, reinicio de ciclos,
 * gestión de metas, y visibilidad global multi-sede.
 */
export const SUPER_ADMIN_EMAILS = [
  'jose.sanchez@crearpsl.net',   // José Sánchez — SuperAdmin + Gerente Lima
  'armando.pilacuan@gmail.com',  // Armando Pilacuán — SuperAdmin
  'paul.sosa@crearpsl.net'       // Paul Sosa — SuperAdmin
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
    return Boolean(originalAdminUser.isSuperAdmin || isSuperAdminEmail(originalAdminUser.email) || DIRECCION_ROLES.includes(originalAdminUser.appRole));
  }
  if (!currentUser) return false;
  return Boolean(currentUser.isSuperAdmin || isSuperAdminEmail(currentUser.email) || DIRECCION_ROLES.includes(currentUser.appRole));
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
 * Verifica si el usuario es Coordinador Global QT (Carlos Brunis)
 */
export const isGlobalQTCoordinator = (currentUser) => {
  if (!currentUser) return false;
  const email = (currentUser.email || '').toLowerCase();
  return email.includes('carlos.brunis') || email.includes('brunische66');
};

/**
 * Verifica si el usuario tiene privilegios del Quantum Team (QT).
 * Incluye a Leyla (que tiene rol dual de coord_maestria y qt).
 */
export const hasQTPrivileges = (currentUser) => {
  if (!currentUser) return false;
  const email = (currentUser.email || '').toLowerCase();
  const name = (currentUser.name || currentUser.displayName || '').toLowerCase();
  const r = currentUser.appRole;
  
  if (r === 'qt') return true;
  // Regla especial: Leyla (Lima) es coord_maestria y qt senior
  if (name.includes('leyla') || email.includes('leyla')) return true;
  
  return false;
};

/**
 * Verifica si el usuario es un directivo no operativo.
 * Según feedback: Fer, Paul, Elizabeth, Andres Gomez, Karol pueden ver todo
 * pero NO deben ver botones operativos (como actualizar sheets).
 */
export const isNonOperationalDirector = (currentUser) => {
  if (!currentUser) return false;
  const email = (currentUser.email || '').toLowerCase();
  const name = (currentUser.name || currentUser.displayName || '').toLowerCase();
  
  const nonOperationalNames = ['fer', 'paul', 'elizabeth', 'andres', 'karol'];
  // Si tiene rol de direccion pero coincide con estos nombres/emails
  if (isDireccionRole(currentUser.appRole) || currentUser.isDireccion) {
    return nonOperationalNames.some(n => name.includes(n) || email.includes(n));
  }
  return false;
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
    'paul.sosa@crearpsl.net'
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
  // Gerentes, Coordinadores y Capitanes pueden ver su sede
  return r === 'coord_maestria' || r === 'coordinador_mj' || r === 'coord_c1' || r === 'capitan' || r === 'gerente' || currentUser.isGerente;
};

/**
 * Emails de entrenadores que TAMBIÉN tienen un rol corporativo (dual-role).
 * Estos usuarios pueden alternar entre su vista de entrenador y su rol de oficina.
 */
export const DUAL_ROLE_TRAINER_EMAILS = [
  'jose.sanchez@crearpsl.net',      // SuperAdmin + Gerente Lima + Entrenador
  'andres.gomez@crearpsl.net',     // Director Maestría + Entrenador C2+MJ
  'fer.aragon@crearpsl.net',        // Corporativo + Entrenador C1
  'paul.sosa@crearpsl.net',         // Corporativo + Entrenador C2+MJ
  'leandro.brunis@crearpsl.net',    // Dirección / Corporativo + Entrenador C1 (Leandro Brunis)
  'carlos.brunis@crearpsl.net',     // Coordinador QT Global + Entrenador (Carlos Brunis)
  'linid.valencia@crearpsl.net',    // Coordinadora MJ + Entrenadora
  'brunische66@gmail.com',
  'daniela.monroy@crearpsl.net',      // Entrenadora de llamadas
  'erika.gavilanez@crearpsl.net',     // Coordinadora MJ + Entrenadora de llamadas
  'mauricio.ramirez@crearpsl.net',    // Entrenador de llamadas
  'emalejodiaz@gmail.com',            // Entrenador de llamadas
  'anamonroyt@gmail.com',             // Entrenadora de llamadas
  'dibrafi@gmail.com',                // Entrenador de llamadas
  'fernandomendozaclavijo22@gmail.com', // Entrenador de llamadas
  'marylourdespat@gmail.com',         // Entrenadora de llamadas
  'direccion@bmbgbrokers.com',        // Entrenador de llamadas
  'milacampuzano21@gmail.com',        // Entrenadora de llamadas
];

/**
 * Emails autorizados a ver la pestaña "Liquidación de Entrenadores" (pago de $400
 * por equipo al llegar a 7 llamadas grupales registradas).
 * REGLA ESTRICTA (pedido explícito de José, 02/09/2026):
 * "esta info solo la debo de ver yo y Elizabeth Escobar" — únicamente estos dos
 * correos, sin excepción automática para otros SuperAdmin ni Dirección.
 */
export const LIQUIDACION_ENTRENADORES_EMAILS = [
  'jose.sanchez@crearpsl.net',        // José Sánchez
  'contabilidad.global@crearpsl.net', // Elizabeth Escobar (CFO)
];

export const canViewLiquidacionEntrenadores = (currentUser) => {
  if (!currentUser) return false;
  const email = (currentUser.email || '').trim().toLowerCase();
  return LIQUIDACION_ENTRENADORES_EMAILS.includes(email);
};

/**
 * Devuelve la lista de roles a los que el usuario actual puede asignar tareas,
 * basado en la jerarquía del organigrama de CREAR PSL.
 * @param {Object} currentUser - Objeto del usuario logueado
 * @returns {Array<{id: string, name: string}>}
 */
export const getAssignableRoles = (currentUser) => {
  const normRole = currentUser?.appRole;
  
  if (!normRole) return [];

  // Todos los roles corporativos / directivos
  const directivos = [
    { id: 'direccion', name: 'Dirección Global' },
    { id: 'cfo', name: 'CFO' },
    { id: 'ceo', name: 'CEO' },
    { id: 'cco', name: 'CCO' }
  ];

  const baseManagers = [
    { id: 'gerente', name: 'Gerente de Sede' },
    { id: 'director_maestria', name: 'Director de Maestría' },
    { id: 'coord_maestria', name: 'Coordinador Maestría' },
    { id: 'coord_c1', name: 'Coordinador C1/C2' },
    { id: 'capitan', name: 'Capitán' },
    { id: 'manager', name: 'Manager' },
    { id: 'qt', name: 'Quantum Team (QT)' },
    { id: 'coordinador', name: 'Coordinador Administrativo' },
    { id: 'finanzas', name: 'Finanzas' },
    { id: 'talento_humano', name: 'Talento Humano' },
    { id: 'admin', name: 'Equipo Administrativo' }
  ];

  if (currentUser.isSuperAdmin || isDireccionRole(normRole) || normRole === 'director_maestria') {
    return [
      ...directivos,
      ...baseManagers
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

/**
 * MATRIZ OFICIAL DE PERMISOS Y VISTAS POR ROL (CREAR PODER SIN LÍMITES)
 * Fuente: Matriz Oficial de Acceso y Visibilidad Causa OS
 */
export const OFFICIAL_PERMISSION_MATRIX = {
  'causa_os': {
    directivos: 'GLOBAL',
    gerente: 'SEDE',
    coord_c1: 'DASHBOARD',
    coord_maestria: 'DASHBOARD',
    entrenador: 'DASHBOARD',
    qt: 'DASHBOARD',
    capitan: 'DASHBOARD',
    aliado: 'DASHBOARD',
    manager: 'DASHBOARD'
  },
  'portafolio_pmo': {
    directivos: 'GLOBAL',
    gerente: 'SEDE'
  },
  'okrs_cascade': {
    directivos: 'GLOBAL',
    gerente: 'SEDE'
  },
  'auditoria_kpis': {
    directivos: 'GLOBAL',
    gerente: 'SEDE'
  },
  'manual_qt': {
    directivos: 'GLOBAL',
    gerente: 'GLOBAL',
    coord_c1: 'GLOBAL',
    qt: 'GLOBAL'
  },
  'directorio_qt': {
    directivos: 'GLOBAL',
    gerente: 'GLOBAL',
    coord_c1: 'SEDE',
    qt: 'GLOBAL'
  },
  'centro_de_mando': {
    directivos: 'GLOBAL',
    gerente: 'SEDE'
  },
  'calendario_global': {
    directivos: 'GLOBAL',
    gerente: 'GLOBAL',
    coord_c1: 'GLOBAL',
    coord_maestria: 'GLOBAL',
    entrenador: 'GLOBAL',
    qt: 'GLOBAL',
    capitan: 'GLOBAL',
    aliado: 'GLOBAL',
    manager: 'GLOBAL'
  },
  'campus_interactivo': {
    directivos: 'GLOBAL',
    gerente: 'GLOBAL',
    coord_c1: 'GLOBAL',
    coord_maestria: 'GLOBAL'
  },
  'centro_managers': {
    directivos: 'GLOBAL',
    gerente: 'SEDE',
    coord_maestria: 'SEDE',
    entrenador: 'ASIGNADOS'
  },
  'hoteles_sede': {
    directivos: 'GLOBAL',
    gerente: 'SEDE'
  },
  'asignar_meta': {
    directivos: 'GLOBAL',
    gerente: 'SEDE'
  },
  'directorio_equipo': {
    directivos: 'GLOBAL',
    gerente: 'GLOBAL'
  },
  'sistema_cartas': {
    gerente: 'GLOBAL',
    directivos: 'GLOBAL'
  },
  'copilot': {
    directivos: 'GLOBAL',
    gerente: 'GLOBAL',
    coord_c1: 'DASHBOARD',
    coord_maestria: 'DASHBOARD',
    entrenador: 'DASHBOARD',
    qt: 'DASHBOARD',
    capitan: 'DASHBOARD',
    aliado: 'DASHBOARD',
    manager: 'DASHBOARD'
  }
};

/**
 * Valida el nivel de acceso de un usuario para un módulo específico según la Matriz Oficial
 * @param {Object} currentUser 
 * @param {string} moduleKey 
 * @returns {{ hasAccess: boolean, scope: 'GLOBAL' | 'SEDE' | 'DASHBOARD' | 'ASIGNADOS' | 'NONE' }}
 */
export const checkModuleAccess = (currentUser, moduleKey) => {
  if (!currentUser) return { hasAccess: false, scope: 'NONE' };
  
  // Super Admin tiene acceso GLOBAL a todo
  if (currentUser.isSuperAdmin || isSuperAdminEmail(currentUser.email)) {
    return { hasAccess: true, scope: 'GLOBAL' };
  }

  const role = currentUser.appRole || 'participante';
  const isDir = isDireccionRole(role) || currentUser.isDireccion;
  const isGer = role === 'gerente' || currentUser.isGerente;

  const matrixEntry = OFFICIAL_PERMISSION_MATRIX[moduleKey];
  if (!matrixEntry) return { hasAccess: false, scope: 'NONE' };

  if (isDir && matrixEntry.directivos) {
    return { hasAccess: true, scope: matrixEntry.directivos };
  }

  if (isGer && matrixEntry.gerente) {
    return { hasAccess: true, scope: matrixEntry.gerente };
  }

  // Mapear rol normalizado a claves de matriz
  let roleKey = role;
  if (role === 'coord_c2' || role === 'coordinador_c1c2') roleKey = 'coord_c1';
  if (role === 'coordinador_mj' || role === 'director_maestria') roleKey = 'coord_maestria';
  if (role === 'entrenador_llamadas') roleKey = 'entrenador';

  const roleScope = matrixEntry[roleKey];
  if (roleScope) {
    return { hasAccess: true, scope: roleScope };
  }

  return { hasAccess: false, scope: 'NONE' };
};



