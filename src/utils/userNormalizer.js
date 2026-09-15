/**
 * SO-AR - Normalizador Canónico de Usuarios
 * Implementación de la Fase 3 de la Auditoría
 * Regla: Funciones puras, deterministas y sin pérdida de datos.
 */

// 1. Normalización de Email
export const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') return null;
  return email.toLowerCase().trim();
};

// 2. Normalización de Rol Individual (Basado en usersData.js pero más estricto)
export const normalizeRole = (role) => {
  if (!role) return 'miembro';
  
  const r = role.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Coordinadores Capítulo 1 / Capítulo 2 (C1 / C2)
  if (r === 'coordinador_c1c2' || r === 'coord_c1' || r === 'coord_c2' || r === 'coordinador_c1' || r === 'coordinador_c2' || r.includes('capitulo uno') || r.includes('capitulo 1') || r.includes('capitulo dos') || r.includes('capitulo 2') || r === 'c1' || r === 'c2' || r === 'c1/c2' || r === 'c1c2') return 'coord_c1';
  
  // (15/09/2026) BUG CRITICO CORREGIDO: este chequeo de "director_maestria"
  // se movio ANTES del chequeo de "coord_maestria" (unas lineas mas abajo).
  // Motivo: el chequeo de coord_maestria usaba r.includes('maestria'), que
  // TAMBIEN es verdadero para el string 'director_maestria' -- como los if
  // regresan en la primera coincidencia, CUALQUIER usuario con rol
  // "director_maestria" quedaba silenciosamente reclasificado como
  // "coord_maestria" en cada login, sin importar lo que dijera el catalogo
  // oficial (usersToImport.js) o Firestore. Mismo bug que en usersData.js
  // (normalizeRole tiene dos implementaciones casi identicas en el repo).
  // Confirmado como la causa real de que Andres Gomez -- con
  // "director_maestria" ya asignado en el catalogo desde el 13/09/2026
  // (commit 3f3f6fb) -- nunca viera ese rol activo en su selector.
  // Reportado por Jose el 15/09/2026.
  // Director Maestría del Juego (MJ)
  if (r === 'director_maestria' || r === 'director_mj' || (r.includes('director') && (r.includes('maestr') || r.includes('mj')))) return 'director_maestria';
  
  // Coordinadores Maestría del Juego (MJ)
  if (r === 'coordinador_mj' || r === 'coord_maestria' || r === 'coordinador_maestria' || r.includes('maestria del juego') || r.includes('maestria') || r.includes('coordinador global maestria') || r === 'mj') return 'coord_maestria';
  
  // Gerentes
  if (r === 'gerente' || r === 'gerente_sede' || r.includes('gerente de sede')) return 'gerente';
  
  // Capitanes
  if (r === 'capitan') return 'capitan';
  
  // Quantum Team & Coordinación QT Global
  if (r === 'qt' || r === 'quantum_team' || r.includes('quantum') || r.includes('coord_qt') || r.includes('coordinador qt') || r.includes('coordinador_qt') || r.includes('qt global')) return 'qt';
  
  
  // Manager
  if (r === 'manager' || r === 'managers') return 'manager';
  
  // Direccion (CEO, CCO, Socio)
  if (r.includes('ceo') || r.includes('cco') || r.includes('socio') || r.includes('direccion') || r.includes('dirección') || r === 'superadmin') return 'direccion';
  
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

// 3. Normalización del Array de Roles
export const normalizeRoles = (rolesArray, mainRole) => {
  let roles = [];
  if (Array.isArray(rolesArray)) {
    roles = rolesArray.map(normalizeRole);
  }
  if (mainRole) {
    roles.push(normalizeRole(mainRole));
  }
  if (roles.length === 0) {
    roles.push('miembro');
  }
  // Deduplicar
  return [...new Set(roles)];
};

// 4. Normalización de Sede
export const normalizeSede = (sede) => {
  if (!sede) return 'Global';
  const s = sede.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (s === 'med' || s.includes('medellin')) return 'Medellín';
  if (s === 'lim' || s.includes('lima')) return 'Lima';
  if (s === 'cue' || s.includes('cuenca')) return 'Cuenca';
  if (s === 'gye' || s.includes('guayaquil')) return 'Guayaquil';
  if (s === 'mex' || s.includes('mexico')) return 'México';
  if (s === 'uio-c1' || s.includes('ciclo 1') || s.includes('ciclo1')) return 'Quito Ciclo 1';
  if (s === 'uio-c2' || s.includes('ciclo 2') || s.includes('ciclo2')) return 'Quito Ciclo 2';
  if (s === 'uio' || s.includes('quito')) return 'Quito Ciclo 1'; // Default as requested
  if (s === 'int' || s.includes('internacional')) return 'Internacional';
  if (s.includes('global')) return 'Global';
  
  // Si no coincide, capitalizar la primera letra y devolver
  return sede.trim().charAt(0).toUpperCase() + sede.trim().slice(1);
};

// 5. Normalizar el Registro Completo (Modelo Canónico)
export const normalizeUserRecord = (data, source = 'unknown') => {
  if (!data) return null;
  
  const rawEmail = data.email || data.correo || '';
  const email = normalizeEmail(rawEmail);
  const emailsArray = Array.isArray(data.emails) ? data.emails.map(normalizeEmail) : (email ? [email] : []);
  
  // Determinar correo corporativo vs personal de forma heurística simple
  const corporateEmail = data.corporateEmail ? normalizeEmail(data.corporateEmail) : (emailsArray.find(e => e.includes('@crearpsl.net')) || null);
  const personalEmail = data.personalEmail ? normalizeEmail(data.personalEmail) : (emailsArray.find(e => !e.includes('@crearpsl.net')) || null);

  const nRoles = normalizeRoles(data.roles, data.role);
  const nRole = nRoles.length > 0 ? nRoles[0] : 'miembro'; // Rol principal por defecto
  const activeRole = data.activeRole ? normalizeRole(data.activeRole) : nRole;
  
  const nSede = normalizeSede(data.sede);

  return {
    id: data.id || data.uid || email || `generated_${Date.now()}`,
    uid: data.uid || null,
    name: data.name || data.displayName || email?.split('@')[0] || 'Usuario Desconocido',
    displayName: data.displayName || data.name || email?.split('@')[0] || 'Usuario Desconocido',
    email: email,
    emails: [...new Set(emailsArray)],
    corporateEmail: corporateEmail,
    personalEmail: personalEmail,
    role: nRole,
    roles: nRoles,
    activeRole: activeRole,
    sede: nSede,
    sedeTag: nSede.substring(0, 3).toUpperCase(),
    // (14/09/2026) equiposQuito: a diferencia de las demás sedes (un solo equipo
    // activo a la vez), Quito corre VARIOS equipos en paralelo (ej. C1 Equipo 122 y
    // C1 Equipo 128 el mismo fin de semana). Este campo NUEVO guarda 0, 1 o 2
    // números de equipo (string) que la propia persona elige en su perfil (ver
    // UserProfileModal.jsx) para que CyclesContext.jsx sepa exactamente qué equipo
    // usar en vez de adivinar "el próximo evento cronológico de la sede" (que fallaba
    // cuando hay más de un equipo activo). Solo se usa/lee para Quito; el resto de
    // sedes lo ignoran. Se capa a 2 elementos porque el diseño confirmado con José
    // solo contempla 1 o 2 equipos simultáneos por persona.
    equiposQuito: Array.isArray(data.equiposQuito)
      ? [...new Set(data.equiposQuito.map(v => String(v).trim()).filter(Boolean))].slice(0, 2)
      : [],
    status: data.status || (data.active === false || data.isActive === false ? 'inactive' : 'active'),
    active: data.active !== false && data.isActive !== false && data.status !== 'inactive',
    isActive: data.active !== false && data.isActive !== false && data.status !== 'inactive',
    deactivatedAt: data.deactivatedAt || null,
    deactivatedBy: data.deactivatedBy || null,
    deactivationReason: data.deactivationReason || null,
    deactivationNotes: data.deactivationNotes || null,
    statusHistory: Array.isArray(data.statusHistory) ? data.statusHistory : [],
    isSuperAdmin: nRoles.includes('direccion') || nRoles.includes('superadmin') || data.isSuperAdmin === true,
    isDireccion: nRoles.includes('direccion') || data.isDireccion === true,
    isGerente: nRoles.includes('gerente') || data.isGerente === true,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 1,
    _source: source // Meta-dato útil para la auditoría
  };
};

// 6. Fusionar Registros (Merge) sin pérdida
export const mergeUserRecords = (existing, incoming) => {
  if (!existing) return normalizeUserRecord(incoming, 'merged');
  if (!incoming) return normalizeUserRecord(existing, 'merged');

  const e = normalizeUserRecord(existing, 'existing');
  const i = normalizeUserRecord(incoming, 'incoming');

  const mergedEmails = [...new Set([...e.emails, ...i.emails])];
  const mergedRoles = [...new Set([...e.roles, ...i.roles])];
  const isInactive = e.status === 'inactive' || i.status === 'inactive' || e.isActive === false || i.isActive === false || e.active === false || i.active === false;

  return {
    ...e,
    uid: e.uid || i.uid,
    name: e.name !== 'Usuario Desconocido' ? e.name : i.name,
    displayName: e.displayName !== 'Usuario Desconocido' ? e.displayName : i.displayName,
    emails: mergedEmails,
    corporateEmail: e.corporateEmail || i.corporateEmail,
    personalEmail: e.personalEmail || i.personalEmail,
    role: e.role !== 'miembro' ? e.role : i.role,
    roles: mergedRoles,
    activeRole: e.activeRole !== 'miembro' ? e.activeRole : i.activeRole,
    sede: e.sede !== 'Global' ? e.sede : i.sede,
    // (14/09/2026) mismo criterio que el resto de campos "propios": el existente manda
    // si ya trae algo elegido; si no, se respalda con el del registro entrante.
    equiposQuito: (e.equiposQuito && e.equiposQuito.length > 0) ? e.equiposQuito : i.equiposQuito,
    status: isInactive ? 'inactive' : 'active',
    active: !isInactive,
    isActive: !isInactive,
    deactivatedAt: e.deactivatedAt || i.deactivatedAt || null,
    deactivatedBy: e.deactivatedBy || i.deactivatedBy || null,
    deactivationReason: e.deactivationReason || i.deactivationReason || null,
    deactivationNotes: e.deactivationNotes || i.deactivationNotes || null,
    statusHistory: [...(e.statusHistory || []), ...(i.statusHistory || [])],
    isSuperAdmin: e.isSuperAdmin || i.isSuperAdmin,
    isDireccion: e.isDireccion || i.isDireccion,
    isGerente: e.isGerente || i.isGerente,
    updatedAt: new Date().toISOString(),
    _source: 'merged'
  };
};
