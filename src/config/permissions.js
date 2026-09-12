﻿// Configuración centralizada de permisos y roles administrativos
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
  const r = currentUser.appRole || currentUser.role;
  if (r === 'director_maestria' || r === 'coord_maestria' || r === 'coordinador_mj') return true;
  if (Array.isArray(currentUser.roles) && (
    currentUser.roles.includes('coord_maestria') || 
    currentUser.roles.includes('coordinador_mj') || 
    currentUser.roles.includes('director_maestria')
  )) {
    return true;
  }
  const email = (currentUser.email || '').toLowerCase();
  if (email === 'linid.valencia@crearpsl.net' || email.includes('linid') || email.includes('maestria')) return true;
  return false;
};


/**
 * Verifica si un usuario puede asignar o reasignar entrenadores a managers y equipos.
 * REGLA CORPORATIVA:
 * 1. Coordinadores de Maestría del Juego (coord_maestria / coordinador_mj)
 * 2. Dirección de Maestría del Juego (director_maestria)
 * 3. SuperAdministradores (José Sánchez, Armando Pilacuán, etc.)
 * 4. Fer Aragón y Paul Sosa
 * Todos ellos tienen PLENO PODER para asignar, cambiar y reasignar entrenadores.
 */
export const canAssignTrainer = (currentUser) => {
  if (!currentUser) return false;
  if (currentUser.isSuperAdmin || isSuperAdminEmail(currentUser.email)) return true;

  // 🎓 REGLA CATEGÓRICA: Coordinadores y Directores de Maestría tienen pleno poder de asignación
  const r = currentUser.appRole || currentUser.role;
  if (r === 'coord_maestria' || r === 'coordinador_mj' || r === 'director_maestria') return true;
  if (Array.isArray(currentUser.roles) && (
    currentUser.roles.includes('coord_maestria') || 
    currentUser.roles.includes('coordinador_mj') || 
    currentUser.roles.includes('director_maestria')
  )) {
    return true;
  }

  const email = (currentUser.email || '').trim().toLowerCase();
  if (
    email === 'linid.valencia@crearpsl.net' || 
    email.includes('linid') || 
    email.includes('maestria')
  ) {
    return true;
  }

  // Fer y Paul autorizados
  const allowedEmails = [
    'fer.aragon@crearpsl.net',
    'fer.aragon@crearpsl.com',
    'paul.sosa@crearpsl.net'
  ];
  if (allowedEmails.includes(email)) return true;

  const name = (currentUser.name || currentUser.displayName || '').toLowerCase();
  if (
    name.includes('fer aragon') || 
    name.includes('fernando aragon') || 
    name.includes('paul sosa') ||
    name.includes('linid')
  ) {
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
  const r = currentUser.appRole || currentUser.role;
  if (r === 'director_maestria' || r === 'coord_maestria' || r === 'coordinador_mj') return true;
  if (Array.isArray(currentUser.roles) && (
    currentUser.roles.includes('coord_maestria') || 
    currentUser.roles.includes('coordinador_mj') || 
    currentUser.roles.includes('director_maestria')
  )) {
    return true;
  }
  const email = (currentUser.email || '').toLowerCase();
  if (email === 'linid.valencia@crearpsl.net' || email.includes('linid') || email.includes('maestria')) return true;
  return false;
};

export const canViewAllManagers = (currentUser) => {
  if (!currentUser) return false;
  if (currentUser.isSuperAdmin || currentUser.isDireccion || isSuperAdminEmail(currentUser.email)) return true;
  const r = currentUser.appRole || currentUser.role;
  return r === 'director_maestria' || isDireccionRole(r);
};

/**
 * Verifica si el usuario puede ver managers de su sede (Coordinadores de Maestría y Gerentes de Sede).
 */
export const canViewSede = (currentUser) => {
  if (!currentUser) return false;
  if (currentUser.isSuperAdmin || isSuperAdminEmail(currentUser.email)) return true;
  const r = currentUser.appRole || currentUser.role;
  const roles = Array.isArray(currentUser.roles) ? currentUser.roles : [];
  // Gerentes, Coordinadores y Capitanes pueden ver su sede
  return (
    r === 'coord_maestria' || r === 'coordinador_mj' || r === 'coord_c1' || r === 'capitan' || r === 'gerente' ||
    currentUser.isGerente ||
    roles.some(rl => ['coord_maestria', 'coordinador_mj', 'coord_c1', 'capitan', 'gerente'].includes(rl))
  );
};


/**
 * Emails de entrenadores que TAMBIÉN tienen un rol corporativo (dual-role).
 * Estos usuarios pueden alternar entre su vista de entrenador y su rol de oficina.
 */
export const DUAL_ROLE_TRAINER_EMAILS = [
  'jose.sanchez@crearpsl.net',      // SuperAdmin + Gerente Lima + Entrenador
  'andres.gomez@crearpsl.net',     // Director Maestría del Juego + Entrenador C2 + Entrenador Relación MJ + Entrenador de Llamadas (confirmado por José, 02/09/2026)
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
  'kerly.carrillo@crearpsl.net',      // Coordinadora MJ Cuenca + Entrenadora de llamadas (Kerlie Carrillo)
];

/**
 * Emails o roles autorizados a ver la pestaÃ±a 'LiquidaciÃ³n de Entrenadores' (auditorÃ­a financiera,
 * pagos realizados extraÃ­dos de la planilla de llamados, $77,550 USD pagados y pagos por equipo Nodus).
 * REGLA ESTRICTA (pedido explÃ­cito de JosÃ©, 12/09/2026):
 * 'de aqui extraer todos los pagos realizados y agregarlos a liquidacion sin rendudar y que se pueda revisar solo visible para mi y directores'
 * Ãšnicamente SuperAdmin (JosÃ© SÃ¡nchez / Armando PilacuÃ¡n / Paul Sosa), el email de JosÃ© SÃ¡nchez
 * ('jose.sanchez@crearpsl.net'), roles de DirecciÃ³n (director_maestria, direccion, ceo, cco, cfo),
 * y el email contable autorizado (Elizabeth Escobar / contabilidad.global@crearpsl.net).
 * NO pueden verlo coordinadores, entrenadores, gerentes de sede operativos, capitanes ni participantes.
 */
export const LIQUIDACION_ENTRENADORES_EMAILS = [
  'jose.sanchez@crearpsl.net',        // JosÃ© SÃ¡nchez
  'contabilidad.global@crearpsl.net', // Elizabeth Escobar (CFO)
];

export const canViewLiquidacionEntrenadores = (currentUser) => {
  if (!currentUser) return false;
  const email = (currentUser.email || '').trim().toLowerCase();

  // 'yo' / SuperAdmin
  if (email === 'jose.sanchez@crearpsl.net') return true;
  if (currentUser.isSuperAdmin || isSuperAdminEmail(email)) return true;

  // 'directores'
  if (currentUser.isDireccion) return true;
  const role = (currentUser.appRole || currentUser.role || '').toLowerCase();
  const roles = (currentUser.roles || []).map(r => String(r).toLowerCase());

  if (isDireccionRole(role) || role === 'director_maestria') return true;
  if (roles.some(r => isDireccionRole(r) || r === 'director_maestria')) return true;

  // Finanzas / CFO autorizado
  if (LIQUIDACION_ENTRENADORES_EMAILS.includes(email)) return true;

  return false;
};

/**
 * Emails autorizados a ver "Base Maestra CRM (Nodus)" (/crm-maestro): el listado
 * completo y SIN filtrar de participantes de TODA la plataforma — nombre, DNI,
 * teléfono, estado C1, coordinadora e IMO enrolador, sin distinción de sede.
 * REGLA ESTRICTA (pedido explícito de José, 08/09/2026): "esta base solo la puedo
 * ver yo" — únicamente este correo, sin excepción automática para otros
 * SuperAdmin ni Dirección (mismo patrón que LIQUIDACION_ENTRENADORES_EMAILS
 * arriba). NOTA: esto solo controla el acceso en la interfaz (el componente
 * CRMBaseMaster.jsx). A nivel de base de datos, firestore.rules todavía permite
 * leer la colección "participants" a CUALQUIER SuperAdmin o Gerente/Dirección
 * (regla existente: isSuperAdmin() || isGerenteODireccion()) — restringirla ahí
 * también a solo este correo requeriría tocar firestore.rules, lo cual necesita
 * tu autorización explícita antes de hacerse.
 */
export const CRM_MAESTRO_ACCESS_EMAILS = [
  'jose.sanchez@crearpsl.net',
];

export const canViewCRMMaestro = (currentUser) => {
  if (!currentUser) return false;
  const email = (currentUser.email || '').trim().toLowerCase();
  return CRM_MAESTRO_ACCESS_EMAILS.includes(email);
};

/**
 * Emails o roles autorizados a ver la pestaña "KPIs de Entrenadores de Llamadas" (Auditoría financiera,
 * facturación $77,550 USD, graduados, deserción y matriz de 16 llamadas).
 * REGLA ESTRICTA (pedido explícito de José, 05/09/2026):
 * "esto solo lo pueden ver directores y yo"
 * Únicamente SuperAdmin (José Sánchez / Armando Pilacuán / Paul Sosa), el email de José Sánchez
 * ('jose.sanchez@crearpsl.net'), y roles de Dirección (director_maestria, direccion, ceo, cco, cfo).
 * NO pueden verlo entrenadores, coordinadores, gerentes de sede, capitanes ni colaboradores operativos.
 */
export const canViewKPIsLlamadas = (currentUser) => {
  if (!currentUser) return false;
  const email = (currentUser.email || '').trim().toLowerCase();

  // "yo" / SuperAdmin
  if (email === 'jose.sanchez@crearpsl.net') return true;
  if (currentUser.isSuperAdmin || isSuperAdminEmail(email)) return true;

  // "directores"
  if (currentUser.isDireccion) return true;
  const role = (currentUser.appRole || currentUser.role || '').toLowerCase();
  const roles = (currentUser.roles || []).map(r => String(r).toLowerCase());

  if (isDireccionRole(role) || role === 'director_maestria') return true;
  if (roles.some(r => isDireccionRole(r) || r === 'director_maestria')) return true;

  return false;
};


/**
 * NOTAS DE SEGUIMIENTO (02/09/2026) — feedback que el entrenador de llamadas deja
 * después de cada llamada (individual o grupal), pedido explícito de José: "puedan
 * dejar notas individuales, grupales, por llamadas que deben de guardarse en un
 * historial por persona y jamás perderse y usarse para notar quiebres y
 * adelantarnos a los quiebres".
 *
 * ¿Puede el usuario actual CREAR una nota? Solo controla si se muestra el botón en
 * la UI — la restricción real de escritura vive en firestore.rules
 * (request.resource.data.autorEmail == su propio correo).
 */
export const canWriteNotaSeguimiento = (currentUser) => {
  if (!currentUser) return false;
  const role = currentUser.appRole || currentUser.role;
  const roles = currentUser.roles || (role ? [role] : []);
  return role === 'entrenador' || role === 'entrenador_llamadas' ||
    roles.includes('entrenador') || roles.includes('entrenador_llamadas') ||
    DUAL_ROLE_TRAINER_EMAILS.includes((currentUser.email || '').toLowerCase());
};

/**
 * ¿Puede el usuario actual VER todas las notas de seguimiento (no solo las que
 * escribió)? Pedido explícito de José: "quien la escribió y los CMJ y los
 * gerentes y los directores". Debe coincidir con callerRole() (coord_maestria /
 * director_maestria) + isGerenteODireccion() en firestore.rules — si esto
 * cambia, actualizar AMBOS lugares.
 */
export const canViewAllNotasSeguimiento = (currentUser) => {
  if (!currentUser) return false;
  const role = currentUser.appRole || currentUser.role;
  const roles = currentUser.roles || (role ? [role] : []);
  return role === 'coord_maestria' || role === 'director_maestria' ||
    roles.includes('coord_maestria') || roles.includes('director_maestria') ||
    isGerenciaRole(role) || roles.some(isGerenciaRole);
};

/**
 * ¿Puede el usuario actual RESPONDER a una nota de seguimiento? Pedido explícito
 * de José: "los CMJ pueden responder a estas notas (opcional)" — solo CMJ, no
 * toda la gerencia. Debe coincidir con callerRole() en firestore.rules.
 */
export const canReplyNotaSeguimiento = (currentUser) => {
  if (!currentUser) return false;
  const role = currentUser.appRole || currentUser.role;
  const roles = currentUser.roles || (role ? [role] : []);
  return role === 'coord_maestria' || role === 'director_maestria' ||
    roles.includes('coord_maestria') || roles.includes('director_maestria');
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
      { id: 'todos', name: '🌍 TODOS LOS EQUIPOS (Cross-Area)' },
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
 * Fuente: Matriz Oficial de Acceso y Visibilidad Causa OS (roles Causa OS en Google Sheets)
 * ID: 1gt7kJblS5sULWDAZ_Gg1aQMIJTmkOIK2snaM-nnNdfI
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
    gerente: 'GLOBAL'
  },
  'campus_interactivo': {
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
  // 'sistema_cartas': módulo confirmado por José (08/09/2026) como GENUINAMENTE
  // DISTINTO de "Monitor de Vuelos" ("Son dos cosas distintas de verdad"). Ahora sí
  // tiene su propia pestaña gateada dentro de /monitor-vuelos (MonitorVuelosCartas.jsx,
  // pestaña "Repositorio de Cartas y Migraciones") — antes ningún botón la usaba.
  // CORREGIDO (08/09/2026): la fila real de la Matriz Oficial ("Sistema de Cartas: -
  // | X | ...") NO le da acceso a Directivos, solo a Gerentes — esta entrada tenía
  // por error 'directivos: GLOBAL', que nunca se había notado porque nada la leía
  // todavía. Se removió esa clave.
  'sistema_cartas': {
    gerente: 'GLOBAL'
  },
  // 'monitor_vuelos': fila "✈️ Monitor de Vuelos" de la Matriz Oficial. Antes,
  // canAccessMonitorVuelos() leía por error la entrada 'sistema_cartas' (ver nota
  // arriba) — corregido para usar esta entrada propia (08/09/2026).
  'monitor_vuelos': {
    directivos: 'GLOBAL',
    gerente: 'SEDE'
  },
  // 'monitor_imos': fila "🦅 Monitor de IMOs" de la Matriz Oficial. Antes compartía
  // gate con Monitor de Vuelos (vía canAccessMonitorVuelos/'sistema_cartas'), lo
  // cual excluía indebidamente a Coordinadores C1Y2 y de MJ. Corregido con su
  // propia entrada (08/09/2026). El alcance "SOLO LIMA" es un scope declarativo —
  // no hay enforcement real de sede en el cliente ni en firestore.rules todavía
  // (Fase 2, fuera de alcance de esta ronda).
  'monitor_imos': {
    directivos: 'GLOBAL',
    gerente: 'SEDE_LIMA',
    coord_c1: 'SEDE_LIMA',
    coord_maestria: 'SEDE_LIMA'
  },
  'copilot': {
    directivos: 'GLOBAL',
    gerente: 'GLOBAL'
  },
  'manual_nodus': {
    directivos: 'GLOBAL',
    gerente: 'GLOBAL',
    coord_c1: 'GLOBAL',
    coord_maestria: 'GLOBAL'
  },
  // (08/09/2026) CORREGIDO — confirmado explícitamente por José: "los Directivos y
  // Gerentes pueden ver todas las sedes". Antes 'gerente' decía 'SEDE' aquí, pero
  // Home.jsx ya tenía un botón "GLOBAL" visible para Gerente que no hacía nada real
  // (el filtro forzaba sede local sin importar la pestaña elegida) — ver el fix
  // correspondiente en el filtro de eventos de Home.jsx. Ahora la matriz y el
  // (08/09/2026) CORREGIDO — confirmado explícitamente por José:
  // "las coordinadoras de cada sede pueden ver todas las fechas de sus sedes tanto de mj como de c1y c2 todas las fechas y entrenadores"
  // Ahora tanto coord_c1 como coord_maestria tienen acceso completo a todas las fechas y entrenadores de su sede.
  'eventos_entrenamientos': {
    directivos: 'GLOBAL',
    gerente: 'GLOBAL',
    coord_c1: 'SEDE_TODAS_FECHAS',
    coord_maestria: 'SEDE_TODAS_FECHAS',
    entrenador: 'ASIGNADOS',
    qt: 'SEDE_C1C2_PROXIMOS_SIN_TRAINER',
    capitan: 'EQUIPO',
    aliado: 'EQUIPO',
    manager: 'EQUIPO'
  },
  'comunicacion_efectiva': {
    directivos: 'GOOGLE_CHAT',
    gerente: 'GOOGLE_CHAT',
    coord_c1: 'GOOGLE_CHAT',
    coord_maestria: 'GOOGLE_CHAT',
    entrenador: 'GOOGLE_CHAT',
    qt: 'WHATSAPP',
    capitan: 'WHATSAPP',
    aliado: 'WHATSAPP',
    manager: 'WHATSAPP'
  },
  // 'flyers_c1': confirmado explícitamente por José (08/09/2026) que Directivos
  // NO tienen acceso — se removió la clave 'directivos' (antes era 'GLOBAL').
  'flyers_c1': {
    gerente: 'GLOBAL',
    coord_c1: 'GLOBAL',
    coord_maestria: 'GLOBAL'
  },
  // 'calendario_mj': confirmado explícitamente por José (08/09/2026, "sí, así es
  // correcto") que SOLO Coordinadores de MJ tienen acceso — se removieron las
  // claves 'directivos' y 'gerente' (antes GLOBAL y SEDE respectivamente).
  'calendario_mj': {
    coord_maestria: 'GLOBAL'
  },
  'agenda_timeboxing': {
    directivos: 'GLOBAL',
    gerente: 'GLOBAL',
    coord_c1: 'GLOBAL',
    coord_maestria: 'GLOBAL'
  }
};

/**
 * Valida el nivel de acceso de un usuario para un módulo específico según la Matriz Oficial
 * @param {Object} currentUser 
 * @param {string} moduleKey 
 * @returns {{ hasAccess: boolean, scope: 'GLOBAL' | 'SEDE' | 'DASHBOARD' | 'ASIGNADOS' | 'NONE' | string }}
 */
export const checkModuleAccess = (currentUser, moduleKey) => {
  if (!currentUser) return { hasAccess: false, scope: 'NONE' };

  // Super Admin tiene acceso GLOBAL incondicional (salvo simulación explícita de otro usuario)
  if ((currentUser.isSuperAdmin || isSuperAdminEmail(currentUser.email)) && !currentUser.isSimulated) {
    return { hasAccess: true, scope: 'GLOBAL' };
  }

  // Vista Consolidada: el usuario ve todas las opciones con alcance GLOBAL
  if (currentUser.isConsolidatedView || currentUser.appRole === 'consolidado') {
    return { hasAccess: true, scope: 'GLOBAL' };
  }

  const role = currentUser.appRole || 'participante';
  // director_maestria se trata como Directivos en TODA la plataforma, confirmado
  // explícitamente por José (08/09/2026: "Como Directivos"). Antes este rol se
  // mapeaba más abajo a la clave 'coord_maestria' de la matriz, lo cual le daba
  // el acceso de Coordinador de MJ en vez de Dirección — corregido aquí.
  const isDir = isDireccionRole(role) || currentUser.isDireccion || role === 'director_maestria';
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
  // (director_maestria ya no se mapea aquí — ver isDir arriba)
  let roleKey = role;
  if (role === 'coord_c2' || role === 'coordinador_c1c2') roleKey = 'coord_c1';
  if (role === 'coordinador_mj') roleKey = 'coord_maestria';
  if (role === 'entrenador_llamadas') roleKey = 'entrenador';

  const roleScope = matrixEntry[roleKey];
  if (roleScope) {
    return { hasAccess: true, scope: roleScope };
  }

  return { hasAccess: false, scope: 'NONE' };
};

/**
 * Canal Oficial de Comunicación según Matriz
 * @param {Object} currentUser
 * @returns {'GOOGLE_CHAT' | 'WHATSAPP'}
 */
export const getEffectiveCommunicationChannel = (currentUser) => {
  const access = checkModuleAccess(currentUser, 'comunicacion_efectiva');
  return access.scope === 'WHATSAPP' ? 'WHATSAPP' : 'GOOGLE_CHAT';
};

export const canAccessAgendaTimeBoxing = (currentUser) => {
  return checkModuleAccess(currentUser, 'agenda_timeboxing').hasAccess;
};

export const canAccessFlyersC1 = (currentUser) => {
  return checkModuleAccess(currentUser, 'flyers_c1').hasAccess;
};

export const canAccessCalendarioMJ = (currentUser) => {
  return checkModuleAccess(currentUser, 'calendario_mj').hasAccess;
};

export const canAccessMonitorVuelos = (currentUser) => {
  // Corregido (08/09/2026): antes leía por error la entrada 'sistema_cartas'
  // (un módulo distinto, confirmado por José). Ahora usa su propia entrada
  // 'monitor_vuelos' en la Matriz Oficial.
  return checkModuleAccess(currentUser, 'monitor_vuelos').hasAccess;
};

/**
 * "Sistema de Cartas" (pestaña "Repositorio de Cartas y Migraciones" dentro de
 * /monitor-vuelos) — nueva función (08/09/2026), separada de
 * canAccessMonitorVuelos por pedido explícito de José ("son dos cosas distintas
 * de verdad"). Según la Matriz Oficial: SOLO Gerentes, Directivos NO tienen acceso.
 */
export const canAccessSistemaCartas = (currentUser) => {
  return checkModuleAccess(currentUser, 'sistema_cartas').hasAccess;
};

/**
 * "🦅 Monitor de IMOs" — fila propia de la Matriz Oficial. Antes de esta
 * corrección (08/09/2026) el botón de Monitor de IMOs en Home.jsx compartía el
 * gate de canAccessMonitorVuelos(), lo que excluía indebidamente a
 * Coordinadores C1Y2 y de MJ (Lima) que la Matriz sí autoriza.
 */
export const canAccessMonitorIMOs = (currentUser) => {
  return checkModuleAccess(currentUser, 'monitor_imos').hasAccess;
};

export const canAccessHotelesSede = (currentUser) => {
  return checkModuleAccess(currentUser, 'hoteles_sede').hasAccess;
};

export const canAccessManualQT = (currentUser) => {
  return checkModuleAccess(currentUser, 'manual_qt').hasAccess;
};

export const canAccessDirectorioQT = (currentUser) => {
  return checkModuleAccess(currentUser, 'directorio_qt').hasAccess;
};

export const canAccessManualNodus = (currentUser) => {
  return checkModuleAccess(currentUser, 'manual_nodus').hasAccess;
};

export const canAccessCampusInteractivo = (currentUser) => {
  return checkModuleAccess(currentUser, 'campus_interactivo').hasAccess;
};

/**
 * Verifica si el usuario actual es Gerente de Lima, SuperAdmin o DirecciÃ³n autorizada.
 * Solicitud directa: "https://drive.google.com/drive/folders/1c3wkWITxPTdtvZ41o-MTcftRPkQtmpgi?usp=drive_link esto es solo para el gerente de lima"
 */
export const isGerenteLima = (currentUser) => {
  if (!currentUser) return false;
  const email = (currentUser.email || '').trim().toLowerCase();
  if (email === 'jose.sanchez@crearpsl.net') return true;
  if (currentUser.isSuperAdmin || isSuperAdminEmail(email)) return true;

  const role = (currentUser.appRole || currentUser.role || '').toLowerCase();
  const roles = Array.isArray(currentUser.roles) ? currentUser.roles.map(r => String(r).toLowerCase()) : [];
  const sede = (currentUser.sede || '').toLowerCase();
  const isLima = sede === 'lima' || sede === 'pe' || sede.includes('lima');
  const isGer = role === 'gerente' || currentUser.isGerente || roles.includes('gerente');

  return isLima && isGer;
};

export const canAccessPagosSemanalesDrive = (currentUser) => {
  return isGerenteLima(currentUser);
};
