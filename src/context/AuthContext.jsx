import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { signInWithPopup, reauthenticateWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, or, getDocs, doc, getDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { normalizeRole, ROLE_DISPLAY_NAMES, findUserByAnyEmail, usersData as allUsersList } from '../data/usersData';
import { isSuperAdminEmail, isDireccionRole, isGerenciaRole, canSimulate, DUAL_ROLE_TRAINER_EMAILS } from '../config/permissions';
import { useUI } from './UIContext';
import { recordAuditEvent } from '../services/auditService';
import { mergeAuthenticatedRoleProfile, normalizeUserRecord } from '../utils/userNormalizer';
import { enforceUserRolesAgent } from '../services/roleAgentDaemon';
import { canonicalSede } from '../utils/sede';
import { isInactiveTrainer } from '../data/trainerIdentity';
import { createAuthStartupTrace } from '../utils/authStartupTiming';
import { addConsolidatedRole, resolveActiveRole } from '../utils/activeRole';

const AuthContext = createContext();

async function saveSelfProfile(user, canonicalUser, normalizedEmail, existingSnapshot) {
  const profileRef = doc(db, 'users', user.uid);
  const profileSnapshot = existingSnapshot || await getDoc(profileRef);
  const profileFields = {
    name: canonicalUser.name || user.displayName || '',
    displayName: canonicalUser.displayName || canonicalUser.name || user.displayName || '',
    photoURL: user.photoURL || null,
    lastLoginAt: serverTimestamp()
  };

  // El documento users/{uid} ya existe, así que las reglas que lo leen no
  // dependen de esta escritura de metadatos: se envía sin bloquear el arranque.
  // La creación (primer ingreso) sí se espera porque las reglas usan ese doc.
  if (profileSnapshot.exists()) {
    setDoc(profileRef, profileFields, { merge: true })
      .catch((e) => console.warn('Cannot update self-service profile fields; continuing login', e));
    return;
  }

  await setDoc(profileRef, {
    uid: user.uid,
    email: normalizedEmail,
    ...profileFields,
    createdAt: serverTimestamp(),
    provider: user.providerData?.[0]?.providerId || 'google'
  });
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [originalAdminUser, setOriginalAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useUI();

  // (07/09/2026) DIAGNÓSTICO CONFIRMADO CON DATOS REALES: 60 de 144 correos en
  // la colección "users" tienen MÁS DE UN documento — típicamente uno creado
  // por bootstrapSync.js/qtSyncDaemon.js con un ID tipo slug (ej.
  // "jose_sanchez_crearpsl", con "roles" casi siempre en null) y otro creado
  // por el propio login con ID = UID real de Firebase Auth (con "roles" bien
  // poblado como arreglo). Antes de este fix, cuando una consulta encontraba
  // ambos documentos, `snap.docs[0]` devolvía el que Firestore ordenara
  // primero (orden no controlado por nosotros, prácticamente una moneda al
  // aire) — así que en cada login la persona podía "perder" sus roles
  // múltiples si por azar se devolvía el documento slug en vez del UID.
  // Esto es justamente por qué el selector de "cambiar rol" no aparecía de
  // forma consistente para gente con más de un cargo real.
  // Las reglas de Firestore (firestore.rules) SIEMPRE validan permisos
  // leyendo users/{request.auth.uid} — por eso, cuando hay varios documentos
  // para el mismo correo, preferimos deliberadamente el que tiene forma de
  // UID de Firebase Auth: es el mismo que las reglas van a usar de todos
  // modos, así que usarlo también para leer el perfil hace que el
  // comportamiento sea consistente en vez de aleatorio.
  const pareceUidFirebase = (docId) => /^[A-Za-z0-9]{20,36}$/.test(docId) && !docId.includes('_');

  const elegirDocumentoCanonico = (snap) => {
    if (snap.empty) return null;
    if (snap.size === 1) return snap.docs[0];
    // Si hay varios documentos para el mismo correo, preferir el que tiene
    // forma de UID de Firebase Auth (el mismo que usan las reglas de
    // seguridad y las escrituras de login). Si ninguno tiene esa forma,
    // se mantiene el comportamiento anterior (el primero que devuelva Firestore).
    const conFormaDeUid = snap.docs.find((d) => pareceUidFirebase(d.id));
    return conFormaDeUid || snap.docs[0];
  };

  // Búsqueda progresiva de usuarios en Firestore
  const findUserInFirestore = async (normalizedEmail) => {
    try {
      const usersRef = collection(db, "users");

      const snap = await getDocs(query(usersRef, or(
        where("emails", "array-contains", normalizedEmail),
        where("email", "==", normalizedEmail),
        where("corporateEmail", "==", normalizedEmail),
        where("personalEmail", "==", normalizedEmail)
      )));
      // Un solo viaje de red, pero la misma prioridad entre campos y el mismo
      // desempate UID/slug dentro del campo ganador que la búsqueda progresiva.
      for (const field of ['emails', 'email', 'corporateEmail', 'personalEmail']) {
        const docs = snap.docs.filter((d) => {
          const value = d.data()[field];
          return field === 'emails'
            ? Array.isArray(value) && value.includes(normalizedEmail)
            : value === normalizedEmail;
        });
        if (docs.length) {
          const elegido = elegirDocumentoCanonico({ empty: false, size: docs.length, docs });
          return { ...elegido.data(), _docId: elegido.id };
        }
      }

    } catch (err) {
      console.error("Error consultando Firestore:", err);
      throw err;
    }
    return null;
  };

  const findStaffInFirestore = async (email) => {
    try {
      const snap = await getDocs(query(collection(db, 'staff_directory'), or(
        where('emails', 'array-contains', email),
        where('email', '==', email)
      )));
      const preferred = snap.docs.find((d) => {
        const emails = d.data().emails;
        return Array.isArray(emails) && emails.includes(email);
      });
      return (preferred || snap.docs[0])?.data() || null;
    } catch (err) {
      console.error("Error consultando staff_directory:", err);
      throw err;
    }
  };

  const switchRole = async (newRole) => {
    const canonicalNewRole = normalizeRole(newRole);
    const userBeforeSwitch = currentUser;
    if (!userBeforeSwitch) return;

    const canSelectRole = userBeforeSwitch.isSuperAdmin ||
      (userBeforeSwitch.roles || []).includes(canonicalNewRole);
    if (!canSelectRole) {
      showToast('No tienes asignado ese rol.', 'error');
      return false;
    }

    let persisted = canonicalNewRole === 'consolidado' || userBeforeSwitch.isSimulated;
    // Consolidated is a session view synthesized from multiple existing roles;
    // Firestore only permits persisting overrides already present in the profile.
    if (!userBeforeSwitch.isSimulated && canonicalNewRole !== 'consolidado') {
      if (auth.currentUser?.uid) {
        try {
          await setDoc(doc(db, 'users', auth.currentUser.uid), { activeRoleOverride: canonicalNewRole }, { merge: true });
          persisted = true;
        } catch (err) {
          console.warn('No se pudo persistir activeRoleOverride en Firestore (el cambio de rol aplica en sesión):', err);
          persisted = false;
        }
      }
    }

    sessionStorage.setItem('cpsl_active_role', canonicalNewRole);
    setCurrentUser(prev => {
      if (!prev) return null;
      const isConsolidated = canonicalNewRole === 'consolidado';
      const userRoles = prev.roles || [prev.appRole || ''];
      const hasDireccion = userRoles.some(r => isDireccionRole(r)) || isDireccionRole(prev.role) || isDireccionRole(prev.rawRole);
      const hasGerente = userRoles.some(r => isGerenciaRole(r)) || isGerenciaRole(prev.role);
      const isSuper = prev.isSuperAdmin || isSuperAdminEmail(prev.email);
      // Un perfil dual puede operar en sedes distintas según su rol. Nunca se
      // modifica su sede base almacenada: el cambio es solo de sesión.
      const activeSede = prev.roleSedes?.[canonicalNewRole] || prev.sede || 'Global';

      // Las simulaciones de usuario ÚNICAMENTE las activa el usuario explícitamente mediante simulateUser().
      // SuperAdmin SIEMPRE conserva sus privilegios reales, visibilidad total y acceso completo.
      const isDireccion = isSuper || hasDireccion || isDireccionRole(canonicalNewRole);
      const isGerente = isSuper || isDireccion || hasGerente || canonicalNewRole === 'gerente';

      const updated = {
        ...prev,
        activeRole: canonicalNewRole,
        appRole: canonicalNewRole,
        isConsolidatedView: isConsolidated,
        isDireccion,
        isGerente,
        isSuperAdmin: isSuper,
        sede: activeSede,
        isRoleSimulationActive: false
      };

      recordAuditEvent({
        email: prev.email || '',
        name: prev.name || prev.displayName || 'Usuario',
        role: canonicalNewRole,
        sede: activeSede,
        action: 'CAMBIO_ROL',
        details: `Cambió de rol activo a: ${ROLE_DISPLAY_NAMES[canonicalNewRole] || canonicalNewRole}`
      });

      return updated;
    });
    showToast(
      `Rol activo cambiado a: ${ROLE_DISPLAY_NAMES[canonicalNewRole] || canonicalNewRole}`,
      persisted ? 'info' : 'warning'
    );
    return true;
  };

  const simulateUser = (targetUser) => {
    const realAdmin = originalAdminUser || currentUser;
    if (!canSimulate(currentUser, originalAdminUser)) {
      // (15/09/2026) CORREGIDO: mensaje desactualizado — José confirmó que solo
      // él puede simular usuarios (ver canSimulate() en config/permissions.js).
      showToast('Acceso Denegado: solo José Sánchez puede simular usuarios.', 'error');
      return;
    }
    setOriginalAdminUser(originalAdminUser || currentUser);
    sessionStorage.removeItem('cpsl_active_role');
    
    const targetEmail = (targetUser?.emails?.[0] || targetUser?.email || '').toLowerCase().trim();
    if (targetEmail) {
      sessionStorage.setItem('cpsl_simulated_target_email', targetEmail);
      sessionStorage.setItem('cpsl_original_admin_email', (realAdmin.email || '').toLowerCase().trim());
    }

    const mockAuthUser = {
      email: targetEmail,
      displayName: targetUser.name || targetUser.displayName,
      uid: targetUser.id || targetUser.uid || 'simulated_uid'
    };

    const simulatedUser = buildUserObject(mockAuthUser, targetUser, targetEmail);
    setCurrentUser({
      ...simulatedUser,
      isSimulated: true,
      simulatedBy: realAdmin.email || 'jose.sanchez@crearpsl.net'
    });

    recordAuditEvent({
      email: realAdmin.email || 'jose.sanchez@crearpsl.net',
      name: realAdmin.name || 'José Sánchez',
      role: realAdmin.appRole || 'superadmin',
      sede: realAdmin.sede || 'Global',
      action: 'SIMULACION_INICIO',
      details: `Inicio de simulación de usuario: ${targetUser.name || targetEmail} (${targetEmail}) [Caja Negra]`,
      isSimulation: true,
      simulatedBy: realAdmin.email
    });

    showToast(`🎭 Modo Simulador Activo: Viendo plataforma como ${targetUser.name || targetEmail}`, 'success');
  };

  const stopSimulation = () => {
    const realAdmin = originalAdminUser;
    sessionStorage.removeItem('cpsl_simulated_target_email');
    sessionStorage.removeItem('cpsl_original_admin_email');
    sessionStorage.removeItem('cpsl_active_role');
    if (realAdmin) {
      recordAuditEvent({
        email: realAdmin.email || 'jose.sanchez@crearpsl.net',
        name: realAdmin.name || 'José Sánchez',
        role: realAdmin.appRole || 'superadmin',
        sede: realAdmin.sede || 'Global',
        action: 'SIMULACION_FIN',
        details: 'Fin de sesión simulada [Caja Negra]',
        isSimulation: true,
        simulatedBy: realAdmin.email
      });
      setCurrentUser(originalAdminUser);
      setOriginalAdminUser(null);
      showToast('Simulación terminada. Bienvenido de vuelta, José.', 'success');
    }
  };

  const buildUserObject = (user, foundUser, normalizedEmail) => {
    const rawEmail = (user?.email || foundUser?.email || normalizedEmail || '').toString().trim().toLowerCase();
    // 0. Respaldo fidedigno contra el catálogo oficial corporativo para erradicar
    // colapsos de cargos. Un documento histórico puede tener el correo de login
    // en un campo y el corporativo/alterno en otro; se consultan todos antes de
    // aceptar que no existe un perfil canónico. Así un alias no rebaja cargos.
    const identityEmails = Array.from(new Set([
      normalizedEmail,
      user?.email,
      foundUser?.email,
      foundUser?.correo,
      foundUser?.corporateEmail,
      foundUser?.personalEmail,
      ...(Array.isArray(foundUser?.emails) ? foundUser.emails : [])
    ].filter(Boolean).map((email) => email.toString().trim().toLowerCase())));
    const officialProfile = identityEmails.map(findUserByAnyEmail).find(Boolean) || null;
    
    // Prioridad: Base de Datos Firestore (cuando ha sido configurada o actualizada) > Catálogo oficial
    const hasAdminUpdatedRoles = Boolean(foundUser.rolesUpdatedAt || foundUser.rolesUpdatedBy);
    const dbRole = foundUser.role || foundUser.rol || foundUser.cargo;
    const hasSpecificDbRole = Boolean(dbRole && dbRole !== 'colaborador' && dbRole !== 'miembro');
    const hasSpecificDbRoles = Boolean(
      Array.isArray(foundUser.roles) && 
      foundUser.roles.length > 0 && 
      !foundUser.roles.every(r => r === 'colaborador' || r === 'miembro')
    );
    const isRoleConfiguredInDb = hasAdminUpdatedRoles || (hasSpecificDbRole && hasSpecificDbRoles);

    let canonicalRole = normalizeRole(
      isRoleConfiguredInDb ? dbRole : (officialProfile?.role || dbRole || 'colaborador')
    );
    const isSuperAdmin = isSuperAdminEmail(normalizedEmail) || isSuperAdminEmail(foundUser.email);
    const isDualTrainer = DUAL_ROLE_TRAINER_EMAILS.includes(normalizedEmail);
    const isOfficialCoord = Boolean(
      officialProfile && ['coord_c1', 'coord_maestria', 'director_maestria'].includes(canonicalRole)
    );

    let assignedRoles = [];

    if (hasSpecificDbRoles && Array.isArray(foundUser.roles) && foundUser.roles.length > 0) {
      // Roles explícitamente configurados en la base de datos Firestore
      assignedRoles = foundUser.roles.map(r => normalizeRole(r));
    } else if (hasAdminUpdatedRoles) {
      // Un perfil administrado no debe recuperar roles del catálogo ni del
      // agente cuando el perfil autenticado no concede ninguno adicional.
      assignedRoles = hasSpecificDbRole ? [canonicalRole] : [];
    } else if (officialProfile) {
      // Si el usuario existe en el catálogo corporativo maestro y no tiene roles en DB, sus roles oficiales mandan
      const baseOfficialRoles = (officialProfile.roles || [officialProfile.role]).map(r => normalizeRole(r));
      assignedRoles = [...baseOfficialRoles];

      // Inyectar dual role autorizado de entrenador si aplica
      if (isDualTrainer && !assignedRoles.includes('entrenador')) {
        assignedRoles.push('entrenador');
      }

      // Si es un coordinador oficial de sede, purgar categóricamente roles cruzados espurios
      if (isOfficialCoord) {
        assignedRoles = assignedRoles.filter(r => r !== 'coordinador');
        if (!isDualTrainer) {
          assignedRoles = assignedRoles.filter(r => r !== 'entrenador');
        }
        if (!officialProfile.roles || !officialProfile.roles.includes('manager')) {
          assignedRoles = assignedRoles.filter(r => r !== 'manager');
        }
      }
    } else {
      // Usuario sin perfil en catálogo oficial
      assignedRoles = [canonicalRole];
      if (foundUser.roles && foundUser.roles.length > 0) {
        assignedRoles = foundUser.roles.map(r => normalizeRole(r));
      }
      if (isDualTrainer && !assignedRoles.includes('entrenador')) {
        assignedRoles.push('entrenador');
      }
    }

    // Filtrar roles inválidos (null = roles que no son del sistema, como 'student')
    assignedRoles = assignedRoles.filter(r => r != null);
    
    // Si es SuperAdmin, inyectarle los roles gerenciales y de consolidado para que tenga el selector
    // Si el usuario tiene múltiples roles (más de 1) debe tener acceso a "consolidado"
    if (assignedRoles.length > 1 && !assignedRoles.includes('consolidado')) {
      assignedRoles.push('consolidado');
    }

    if (isSuperAdmin) {
      if (!assignedRoles.includes('gerente')) assignedRoles.push('gerente');
      if (!assignedRoles.includes('direccion')) assignedRoles.push('direccion');
      if (!assignedRoles.includes('consolidado')) assignedRoles.push('consolidado');
    }

    // Jesús Acosta: Rol de Observador Global en toda la plataforma + Entrenador
    const isJesusAcosta = ['jesus.acosta@crearpsl.net', 'chuyacostar88@gmail.com', 'jesusadrianacosta@gmail.com'].includes(normalizedEmail) || ['jesus.acosta@crearpsl.net', 'chuyacostar88@gmail.com', 'jesusadrianacosta@gmail.com'].includes(rawEmail);
    if (isJesusAcosta) {
      if (!assignedRoles.includes('observador')) assignedRoles.push('observador');
      if (!assignedRoles.includes('entrenador')) assignedRoles.push('entrenador');
      if (!assignedRoles.includes('consolidado')) assignedRoles.push('consolidado');
    }

    // Ricardo Gavilánez: Gerente (Cuenca) y Quantum Team (Quito)
    const isRicardoGavilanez = ['ricardo.gavilanez@crearpsl.net', 'ricardogavilanez1021@gmail.com'].includes(normalizedEmail) || ['ricardo.gavilanez@crearpsl.net', 'ricardogavilanez1021@gmail.com'].includes(rawEmail);
    if (isRicardoGavilanez) {
      if (!assignedRoles.includes('gerente')) assignedRoles.push('gerente');
      if (!assignedRoles.includes('qt')) assignedRoles.push('qt');
      if (!assignedRoles.includes('consolidado')) assignedRoles.push('consolidado');
      if (!foundUser.roleSedes) foundUser.roleSedes = {};
      if (!foundUser.roleSedes.gerente) foundUser.roleSedes.gerente = 'Cuenca';
      if (!foundUser.roleSedes.qt) foundUser.roleSedes.qt = 'Quito';
    }

    // Judith Regina Romero Rosales: Coordinadora de Maestría del Juego y Entrenadora de Llamadas (Quito)
    const isJudithRomero = ['judith.romero@crearpsl.net'].includes(normalizedEmail) || ['judith.romero@crearpsl.net'].includes(rawEmail);
    if (isJudithRomero) {
      if (!assignedRoles.includes('coord_maestria')) assignedRoles.push('coord_maestria');
      if (!assignedRoles.includes('entrenador_llamadas')) assignedRoles.push('entrenador_llamadas');
      if (!assignedRoles.includes('entrenador')) assignedRoles.push('entrenador');
      canonicalRole = 'coord_maestria';
    }

    // Liliana Cubillo: Coordinadora de Maestría del Juego y Entrenadora de Llamadas (Quito)
    const isLiliCubillo = ['liliana.cubillo@crearpsl.net', 'lili.cubillo@crearpsl.net'].includes(normalizedEmail) || ['liliana.cubillo@crearpsl.net', 'lili.cubillo@crearpsl.net'].includes(rawEmail) || normalizedEmail.includes('cubillo');
    if (isLiliCubillo) {
      if (!assignedRoles.includes('coord_maestria')) assignedRoles.push('coord_maestria');
      if (!assignedRoles.includes('entrenador_llamadas')) assignedRoles.push('entrenador_llamadas');
      if (!assignedRoles.includes('entrenador')) assignedRoles.push('entrenador');
      canonicalRole = 'coord_maestria';
      if (!foundUser.sede || foundUser.sede === 'Global' || foundUser.sede === 'Sede Global') {
        foundUser.sede = 'Quito';
      }
    }

    // Gina Cárdenas López: Coordinadora Junior (Rezagados C1 + Quantum Team Lima)
    const isGinaCardenas = ['cardenasgina29@gmail.com', 'cardenaslopezgina@gmail.com'].includes(normalizedEmail) || ['cardenasgina29@gmail.com', 'cardenaslopezgina@gmail.com'].includes(rawEmail);
    if (isGinaCardenas) {
      assignedRoles = ['coord_jr', 'qt'];
      canonicalRole = 'coord_jr';
      if (!foundUser.sede || foundUser.sede === 'Global' || foundUser.sede === 'Sede Global') {
        foundUser.sede = 'Lima';
      }
      foundUser.nodusUser = 'GCARDENAS';
      foundUser.nodusPassword = 'nolaolvidare';
      foundUser.nodusSede = 'LIMA CICLO 1';
      foundUser.nodusStatus = 'Activo';
    }

    // Asegurar que no quede 'coordinador' administrativo si el usuario tiene un cargo específico
    const hasSpecificRole = assignedRoles.some(r => ['coord_jr', 'coord_c1', 'coord_maestria', 'director_maestria', 'gerente', 'cfo', 'direccion', 'qt', 'entrenador'].includes(r));
    if (hasSpecificRole) {
      // Únicamente la cuenta oficial de coordinación administrativa puede tener 'coordinador'
      if (normalizedEmail !== 'coordinacion.administrativa@crearpsl.net') {
        assignedRoles = assignedRoles.filter(r => r !== 'coordinador');
      }
    }

    // ensure unique
    assignedRoles = Array.from(new Set(assignedRoles.filter(r => r && r !== 'miembro')));
    if (assignedRoles.length === 0) assignedRoles = ['miembro'];

    const hasDireccion = assignedRoles.some(r => isDireccionRole(r)) || isDireccionRole(canonicalRole);
    const hasGerente = assignedRoles.some(r => isGerenciaRole(r)) || isGerenciaRole(canonicalRole);

    assignedRoles = addConsolidatedRole(assignedRoles);

    const savedActiveRole = sessionStorage.getItem('cpsl_active_role');
    // Dirección de Maestría es el cargo institucional principal de Andrés.
    // Una preferencia histórica de sesión como "coord_maestria" no debe
    // degradarlo al entrar; el cargo de coordinación permanece disponible en
    // el selector cuando necesite operar esa vista.
    const enforceDirectorMaestriaDefault = canonicalRole === 'director_maestria';
    const activeRole = resolveActiveRole({
      assignedRoles,
      defaultRole: canonicalRole,
      isSuperAdmin,
      sessionRole: savedActiveRole,
      persistedRole: foundUser.activeRoleOverride,
      enforceDefaultRole: enforceDirectorMaestriaDefault
    });
    const isConsolidated = activeRole === 'consolidado';

    // Para SuperAdmin, isDireccion y isGerente son SIEMPRE true; nunca se limitan
    const isDireccion = isSuperAdmin || hasDireccion || isDireccionRole(activeRole);
    const isGerente = isSuperAdmin || isDireccion || hasGerente || activeRole === 'gerente';

    return {
      ...user,
      email: foundUser.email || user.email, // 🚨 Unifica TODO sobre el correo primario para que coincida con DB y Checklist
      name: foundUser.name || user.displayName || 'Colaborador CREAR',
      appRole: activeRole,
      activeRole: activeRole,
      roles: assignedRoles,
      isConsolidatedView: isConsolidated,
      isGerente,
      isSuperAdmin,
      isDireccion,
      isRoleSimulationActive: false,
      // La sede efectiva acompaña el rol activo. Ej.: Ricardo Gavilánez es
      // Gerente de Cuenca y QT de Quito; al alternar rol no debe heredar la
      // sede equivocada ni contaminar los filtros de cada operación.
      sede: canonicalSede((foundUser.roleSedes || officialProfile?.roleSedes)?.[activeRole] || foundUser.sede || officialProfile?.sede || (isLiliCubillo ? 'Quito' : 'Global')),
      roleSedes: { ...(officialProfile?.roleSedes || {}), ...(foundUser.roleSedes || {}) },
      // (14/09/2026) NUEVO CAMPO: equiposQuito — José confirmó que, a diferencia de
      // las demás sedes (que corren UN solo equipo a la vez), Quito corre VARIOS
      // equipos en paralelo (ej. C1 Equipo 122 y C1 Equipo 128 el mismo fin de
      // semana). Antes no existía forma de saber a qué equipo específico pertenece
      // cada gerente/coordinador de Quito, así que CyclesContext.jsx adivinaba "el
      // próximo evento cronológico de la sede" sin importar el equipo real de la
      // persona (ver CyclesContext.jsx para el detalle completo). Este arreglo (0, 1
      // o 2 strings con el número de equipo, ej. ["122"] o ["122","128"]) lo elige la
      // propia persona en su perfil (ver UserProfileModal.jsx) y solo se usa/lee en
      // Quito; el resto de sedes lo ignoran por completo. Vive en
      // users/{id}.equiposQuito en Firestore, y llega aquí ya saneado por
      // normalizeUserRecord() (userNormalizer.js) — este fallback solo cubre el caso
      // de foundUser sin pasar por ese normalizador (ej. catálogo estático).
      equiposQuito: Array.isArray(foundUser.equiposQuito) ? foundUser.equiposQuito : [],
      document: foundUser.document || '',
      docType: foundUser.docType || '',
      dbId: foundUser.id,
      rawRole: foundUser.role,
      role: isSuperAdmin ? 'direccion' : canonicalRole
    };
  };

  // (04/09/2026) José reportó el error "No se encontró sesión con permisos
  // de Google. Por favor, cierra sesión y vuelve a entrar." — el token de
  // acceso de Google (sessionStorage.googleAccessToken) dura ~1 hora y no
  // hay forma de refrescarlo automáticamente, así que cualquier intento de
  // usar Calendar/Tasks después de esa hora fallaba y obligaba a cerrar
  // sesión completa. Esta función hace lo mismo que loginWithGoogle pero con
  // reauthenticateWithPopup (un popup corto, sin perder la sesión de la app
  // ni recargar la página) — los 3 lugares que leen googleAccessToken la
  // llaman como respaldo automático cuando no encuentran el token.
  const reauthenticateGoogle = async () => {
    if (!auth.currentUser) return null;
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.addScope('https://www.googleapis.com/auth/tasks');
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');
    try {
      const result = await reauthenticateWithPopup(auth.currentUser, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        sessionStorage.setItem('googleAccessToken', credential.accessToken);
        return credential.accessToken;
      }
      return null;
    } catch (error) {
      console.error('Error reautenticando con Google:', error);
      return null;
    }
  };

  // Perfil de PARTICIPANTE (miembros, clientes, usuarios de cualquier sede que no
  // están en la base de colaboradores). Solo les permite firmar sus contratos en
  // /onboarding-legal: no tienen rol operativo y los guards de ruta los devuelven
  // a esa pantalla si intentan entrar a cualquier otra sección.
  const PARTICIPANT_FLAG = 'cpsl_participant_flow';
  const buildParticipantUser = (user, email) => ({
    id: user.uid,
    uid: user.uid,
    name: user.displayName || 'Participante',
    displayName: user.displayName || 'Participante',
    email,
    emails: [email],
    role: 'participante',
    appRole: 'participante',
    roles: ['participante'],
    sede: 'Global',
    isActive: true,
    isParticipantOnly: true
  });

  const loginWithGoogle = async (options) => {
    // Cuando se usa como onClick llega un evento; solo { participant: true } lo activa.
    const participantFlow = options?.participant === true;
    const provider = new GoogleAuthProvider();
    if (!participantFlow) {
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.addScope('https://www.googleapis.com/auth/tasks');
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');
    }

    try {
      if (participantFlow) sessionStorage.setItem(PARTICIPANT_FLAG, '1');
      const result = await signInWithPopup(auth, provider);

      // Extract Google Access Token for API calls
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        sessionStorage.setItem('googleAccessToken', credential.accessToken);
      }
      
      const user = result.user;
      const rawEmail = user.email.trim().toLowerCase();
      
      // FORZAR USO DE .NET (Excepto para los correos autorizados explicitamente de gmail y miembros registrados)
      const allowedGmails = [
        'armando.pilacuan@gmail.com', 
        'gomeznueve@gmail.com', 
        'emalejodiaz@gmail.com', 
        'anamonroyt@gmail.com', 
        'dibrafi@gmail.com', 
        'fernandomendozaclavijo22@gmail.com', 
        'marylourdespat@gmail.com', 
        'direccion@bmbgbrokers.com', 
        'milacampuzano21@gmail.com',
        'cardenaslopezgina@gmail.com',
        'cardenasgina29@gmail.com',
        'rouz1414@gmail.com',
        'brunische66@gmail.com',
        'ricardogavilanez1021@gmail.com',
        'chuyacostar88@gmail.com',
        'jesusadrianacosta@gmail.com'
      ];
      const normalizedEmail = rawEmail.replace('@crearpsl.com', '@crearpsl.net');
      
      // Buscar en Firestore con búsqueda progresiva (revisando normalized y raw)
      let foundUser = await findUserInFirestore(normalizedEmail);
      if (!foundUser && rawEmail !== normalizedEmail) {
        foundUser = await findUserInFirestore(rawEmail);
      }

      // Fallback a directorio de staff migrado
      if (!foundUser) {
        foundUser = await findStaffInFirestore(rawEmail);
      }

      // Fallback a directorio de QT
      if (!foundUser) {
        try {
          const qtRef = collection(db, "qt_directory");
          let qSnap = await getDocs(query(qtRef, where("email", "==", rawEmail)));
          if (!qSnap.empty) foundUser = qSnap.docs[0].data();
        } catch (err) {
          console.error("Error consultando qt_directory:", err);
        }
      }

      // 🆕 Respaldo: catálogo estático usersToImport.js (findUserByAnyEmail).
      if (!foundUser) {
        const staticUser = findUserByAnyEmail(normalizedEmail) || findUserByAnyEmail(rawEmail);
        if (staticUser) {
          foundUser = { ...staticUser };
        }
      }

      // Participante externo (cliente/miembro de cualquier sede) que solo viene a
      // firmar sus contratos: se admite cualquier cuenta Google, con perfil limitado
      // y sin escribir en la colección "users".
      if (participantFlow && !rawEmail.endsWith('@crearpsl.net') && !allowedGmails.includes(rawEmail) && !foundUser) {
        const participantUser = buildParticipantUser(user, normalizedEmail);
        setCurrentUser(participantUser);
        return user;
      }

      // Verificación de política: si no es @crearpsl.net, ni está en la lista blanca, ni en Firestore/QT/catálogo oficial, se rechaza
      if (!rawEmail.endsWith('@crearpsl.net') && !allowedGmails.includes(rawEmail) && !foundUser) {
        await auth.signOut();
        throw new Error('ACCESO DENEGADO: Por política corporativa, debes iniciar sesión exclusivamente con tu correo corporativo @crearpsl.net');
      }

      if (!foundUser) {
        foundUser = {
          id: user.uid,
          uid: user.uid,
          name: user.displayName || "Usuario",
          role: "colaborador",
          sede: "Global",
          emails: [normalizedEmail],
          email: normalizedEmail
        };
      } else {
        foundUser.uid = user.uid; // Asegurar que tenga el UID correcto
      }

      // 🚫 VALIDACIÓN DE ESTADO ACTIVO / INACTIVO (Trazabilidad y Control de Acceso)
      const esInactivoDesvinculado = isInactiveTrainer(foundUser.name || foundUser.displayName);
      if (foundUser.isActive === false || foundUser.status === 'inactive' || foundUser.active === false || esInactivoDesvinculado) {
        await auth.signOut();
        const reason = esInactivoDesvinculado ? ' (Personal desvinculado de Crear)' : (foundUser.deactivationReason ? ` (Motivo: ${foundUser.deactivationReason})` : '');
        throw new Error(`ACCESO DENEGADO: Tu cuenta de colaborador se encuentra desactivada${reason}. Comunícate con Talento Humano o SuperAdmin.`);
      }

      // Normalizar el registro usando el esquema canónico (Hito 1)
      let canonicalUser = normalizeUserRecord(foundUser, 'login');

      // 🕵️‍♂️ AGENTE ONLINE: Validar y sanar multiroles 
      const [updatedRoles, profileResult] = await Promise.all([
        enforceUserRolesAgent(foundUser || user, canonicalUser.roles),
        getDoc(doc(db, 'users', user.uid)).then(
          snapshot => ({ snapshot }),
          error => ({ error })
        )
      ]);
      canonicalUser = mergeAuthenticatedRoleProfile(
        canonicalUser,
        profileResult.snapshot?.exists() ? profileResult.snapshot.data() : null,
        updatedRoles
      );

      // Persistir solo metadatos de perfil; los roles y la sede son administrados
      // por SuperAdmins y nunca se escriben desde el inicio de sesión del cliente.
      try {
        if (profileResult.error) throw profileResult.error;
        await saveSelfProfile(user, canonicalUser, normalizedEmail, profileResult.snapshot);
      } catch (e) {
        console.error('Cannot verify or create self-service profile; aborting login', e);
        throw e;
      }

      const userObj = buildUserObject(user, canonicalUser, normalizedEmail);
      setCurrentUser(userObj);

      recordAuditEvent({
        uid: user.uid,
        email: normalizedEmail,
        name: foundUser.name || user.displayName,
        role: canonicalUser.appRole,
        sede: canonicalUser.sede,
        action: 'LOGIN',
        details: 'Inicio de sesión exitoso'
      });

      return user;
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  // (14/09/2026) Actualiza campos sueltos del currentUser EN MEMORIA (sin recargar
  // sesión ni volver a llamar a Google). Se agregó para equiposQuito
  // (UserProfileModal.jsx): cuando una persona de Quito elige su(s) equipo(s) en su
  // propio perfil, CyclesContext.jsx necesita ver el cambio de inmediato (para
  // recalcular su ciclo activo) en vez de esperar a que cierre sesión y vuelva a
  // entrar. Es un merge superficial deliberado — no toca Firestore, eso ya lo hace
  // quien llama a esta función antes de invocarla.
  const updateCurrentUserFields = (updates) => {
    setCurrentUser(prev => (prev ? { ...prev, ...updates } : prev));
  };

  const logout = async () => {
    if (currentUser && !currentUser.isSimulated) {
      try {
        await recordAuditEvent({
          email: currentUser.email || currentUser.emails?.[0] || 'Desconocido',
          name: currentUser.name || 'Desconocido',
          role: currentUser.appRole || 'Desconocido',
          sede: currentUser.sede || 'Desconocida',
          action: 'LOGOUT',
          details: 'Cierre de sesión manual'
        });
      } catch (e) {}
    }
    sessionStorage.removeItem('googleAccessToken');
    sessionStorage.removeItem('cpsl_active_role');
    sessionStorage.removeItem(PARTICIPANT_FLAG);
    return signOut(auth);
  };

  useEffect(() => {
    const startupTrace = createAuthStartupTrace();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      startupTrace.authReady();
      try {
        if (user) {
          const rawEmail = user.email.trim().toLowerCase();
          const normalizedEmail = rawEmail.replace('@crearpsl.com', '@crearpsl.net');
          
          let foundUser = await startupTrace.measure('users-lookup', () => findUserInFirestore(normalizedEmail));
          
          if (!foundUser) {
            foundUser = await startupTrace.measure('staff-lookup', () => findStaffInFirestore(normalizedEmail));
          }
          
          // 🆕 (02/09/2026) Mismo respaldo que en loginWithGoogle: catálogo estático
          // antes de descartar al usuario por completo en esta ruta de sesión persistida.
          if (!foundUser) {
            const staticUser = findUserByAnyEmail(normalizedEmail) || findUserByAnyEmail(rawEmail);
            if (staticUser) {
              foundUser = { ...staticUser, uid: user.uid };
            }
          }

          if (!foundUser && isSuperAdminEmail(normalizedEmail)) {
            foundUser = {
              id: user.uid,
              uid: user.uid,
              name: user.displayName || "Administrador",
              role: "gerente",
              sede: "Global",
              emails: [normalizedEmail]
            };
          } else if (foundUser) {
            foundUser.uid = user.uid;
          }

          if (foundUser) {
            // 🚫 VALIDACIÓN DE ESTADO ACTIVO / INACTIVO (Trazabilidad y Control de Acceso)
            const esInactivoDesvinculado = isInactiveTrainer(foundUser.name || foundUser.displayName);
            if (foundUser.isActive === false || foundUser.status === 'inactive' || foundUser.active === false || esInactivoDesvinculado) {
              console.warn("Usuario desactivado intentando acceder a la sesión:", normalizedEmail);
              await signOut(auth);
              setCurrentUser(null);
              setLoading(false);
              return;
            }

            let canonicalUser = normalizeUserRecord(foundUser, 'onAuthStateChanged');
            
            // 🕵️‍♂️ AGENTE ONLINE: Validar y sanar multiroles 
            const [updatedRoles, profileResult] = await Promise.all([
              startupTrace.measure('roles', () => enforceUserRolesAgent({ ...user, ...foundUser }, canonicalUser.roles)),
              startupTrace.measure('self-profile-read', () => getDoc(doc(db, 'users', user.uid))).then(
                snapshot => ({ snapshot }),
                error => ({ error })
              )
            ]);
            canonicalUser = mergeAuthenticatedRoleProfile(
              canonicalUser,
              profileResult.snapshot?.exists() ? profileResult.snapshot.data() : null,
              updatedRoles
            );

            // Persistir solo metadatos de perfil, nunca roles ni sede.
            if (profileResult.error) throw profileResult.error;
            await startupTrace.measure('profile-metadata', () =>
              saveSelfProfile(user, canonicalUser, normalizedEmail, profileResult.snapshot));

            const userObj = buildUserObject(user, canonicalUser, normalizedEmail);
            
            // Restaurar simulación activa tras recarga de página (F5) para José Sánchez
            const simTarget = sessionStorage.getItem('cpsl_simulated_target_email');
            if (simTarget && canSimulate(userObj)) {
              const targetRecord = allUsersList.find(u => 
                (u.email || '').toLowerCase().trim() === simTarget.toLowerCase().trim() ||
                (Array.isArray(u.emails) && u.emails.map(e => e.toLowerCase().trim()).includes(simTarget.toLowerCase().trim()))
              );
              if (targetRecord) {
                const targetEmail = (targetRecord.emails?.[0] || targetRecord.email || simTarget).toLowerCase().trim();
                const mockAuthUser = {
                  email: targetEmail,
                  displayName: targetRecord.name || targetRecord.displayName,
                  uid: targetRecord.id || targetRecord.uid || 'simulated_uid'
                };
                const simulatedObj = buildUserObject(mockAuthUser, targetRecord, targetEmail);
                setOriginalAdminUser(userObj);
                setCurrentUser({
                  ...simulatedObj,
                  isSimulated: true,
                  simulatedBy: userObj.email
                });
              } else {
                setCurrentUser(userObj);
              }
            } else {
              setCurrentUser(userObj);
            }
            
            try {
              const todayStr = new Date().toISOString().slice(0, 10);
              const sessionLogKey = `audit_login_${normalizedEmail}_${todayStr}`;
              if (!sessionStorage.getItem(sessionLogKey)) {
                // Auditoría no bloqueante: el usuario ya fue verificado y
                // recordAuditEvent captura sus propios errores de Firestore.
                recordAuditEvent({
                  email: foundUser.email || normalizedEmail,
                  name: foundUser.name || user.displayName || 'Desconocido',
                  role: foundUser.role || 'Desconocido',
                  sede: foundUser.sede || 'Desconocida',
                  action: 'LOGIN',
                  details: 'Inicio de sesión / Actividad diaria'
                }).catch((e) => console.error("Error actualizando login en auditoría:", e));
                sessionStorage.setItem(sessionLogKey, 'true');
              }
            } catch(e) {
              console.error("Error actualizando login en auditoría:", e);
            }
          } else if (sessionStorage.getItem(PARTICIPANT_FLAG) === '1') {
            // Participante externo con sesión persistida: perfil limitado, solo firma.
            setCurrentUser(buildParticipantUser(user, normalizedEmail));
          } else {
            sessionStorage.removeItem('googleAccessToken');
            sessionStorage.removeItem('cpsl_active_role');
            auth.signOut();
            setCurrentUser(null);
          }
        } else {
          const mockDevUser = localStorage.getItem('cpsl_mock_user');
          if (mockDevUser) {
            try {
              const parsed = JSON.parse(mockDevUser);
              setCurrentUser(parsed);
              return;
            } catch(e) {}
          }
          sessionStorage.removeItem('googleAccessToken');
          sessionStorage.removeItem('cpsl_active_role');
          setCurrentUser(null);
        }
      } catch (authErr) {
        console.error("Error crítico durante autenticación en Causa OS:", authErr);
        setCurrentUser(null);
        showToast('No se pudo verificar tu acceso. Vuelve a iniciar sesión.', 'error');
      } finally {
        startupTrace.finish();
        setLoading(false);
      }
    });
    
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, originalAdminUser, loginWithGoogle, reauthenticateGoogle, logout, loading, switchRole, simulateUser, stopSimulation, updateCurrentUserFields }}>
      {loading ? (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0f1d',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            border: '3px solid rgba(255, 183, 3, 0.2)',
            borderTopColor: '#ffb703',
            borderRadius: '50%',
            animation: 'causaSpin 0.9s linear infinite',
            marginBottom: '1rem'
          }} />
          <div style={{ fontSize: '1.05rem', fontWeight: 600, letterSpacing: '0.5px', color: '#ffb703' }}>
            CREAR PODER SIN LÍMITES
          </div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.35rem' }}>
            Cargando Causa OS...
          </div>
          <style>{`@keyframes causaSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
