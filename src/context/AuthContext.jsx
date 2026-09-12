import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { signInWithPopup, reauthenticateWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { normalizeRole, ROLE_DISPLAY_NAMES, findUserByAnyEmail } from '../data/usersData';
import { isSuperAdminEmail, isDireccionRole, isGerenciaRole, canSimulate, DUAL_ROLE_TRAINER_EMAILS } from '../config/permissions';
import { useUI } from './UIContext';
import { recordAuditEvent, fetchNetworkInfo } from '../services/auditService';
import { normalizeUserRecord } from '../utils/userNormalizer';
import { enforceUserRolesAgent } from '../services/roleAgentDaemon';

const AuthContext = createContext();

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

      // 1. emails array-contains
      let q = query(usersRef, where("emails", "array-contains", normalizedEmail));
      let snap = await getDocs(q);
      if (!snap.empty) {
        const elegido = elegirDocumentoCanonico(snap);
        return { ...elegido.data(), _docId: elegido.id };
      }

      // 2. email ==
      q = query(usersRef, where("email", "==", normalizedEmail));
      snap = await getDocs(q);
      if (!snap.empty) {
        const elegido = elegirDocumentoCanonico(snap);
        return { ...elegido.data(), _docId: elegido.id };
      }

      // 3. corporateEmail ==
      q = query(usersRef, where("corporateEmail", "==", normalizedEmail));
      snap = await getDocs(q);
      if (!snap.empty) {
        const elegido = elegirDocumentoCanonico(snap);
        return { ...elegido.data(), _docId: elegido.id };
      }

      // 4. personalEmail ==
      q = query(usersRef, where("personalEmail", "==", normalizedEmail));
      snap = await getDocs(q);
      if (!snap.empty) {
        const elegido = elegirDocumentoCanonico(snap);
        return { ...elegido.data(), _docId: elegido.id };
      }

    } catch (err) {
      console.error("Error consultando Firestore:", err);
    }
    return null;
  };

  const switchRole = (newRole) => {
    const canonicalNewRole = normalizeRole(newRole);
    sessionStorage.setItem('cpsl_active_role', canonicalNewRole);

    // (07/09/2026) Confirmado explícitamente por José: hasta ahora este selector solo
    // cambiaba el estado local de React (lo que se VE), nunca escribía a Firestore — así
    // que cualquier acción protegida por firestore.rules (por ejemplo guardar en
    // mj_calendars o gestionar managers_directory) seguía evaluándose con el rol
    // "oficial" guardado en el login, sin importar qué eligiera la persona aquí. Este
    // setDoc hace que el cambio sea real: guarda el rol elegido en users/{uid}, en un
    // campo NUEVO y separado (activeRoleOverride) — nunca en "role", porque ese campo
    // también lo usan SuperAdminPanel.jsx, GerenteDashboard.jsx, UserAuditReport.jsx y
    // causa_sync_bot.mjs como el cargo oficial de la persona, no como su vista de
    // sesión. Ver effectiveRole() en firestore.rules para el lado que lo consume.
    // Es "fire and forget": no bloquea el cambio visual si la escritura tarda o falla
    // (queda igual que antes en ese caso — decorativo pero sin romper la sesión), y el
    // error se registra en consola para poder diagnosticarlo si pasa seguido.
    if (auth.currentUser?.uid) {
      setDoc(doc(db, 'users', auth.currentUser.uid), { activeRoleOverride: canonicalNewRole }, { merge: true })
        .catch((err) => {
          console.error('No se pudo guardar el rol activo en Firestore (el cambio de vista sigue funcionando localmente):', err);
        });
    }

    setCurrentUser(prev => {
      if (!prev) return null;
      const isConsolidated = canonicalNewRole === 'consolidado';
      const userRoles = prev.roles || [prev.appRole || ''];
      const hasDireccion = userRoles.some(r => isDireccionRole(r)) || isDireccionRole(prev.role) || isDireccionRole(prev.rawRole);
      const hasGerente = userRoles.some(r => isGerenciaRole(r)) || isGerenciaRole(prev.role);
      const isSuper = prev.isSuperAdmin || isSuperAdminEmail(prev.email);

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
        isRoleSimulationActive: false
      };

      recordAuditEvent({
        email: prev.email || '',
        name: prev.name || prev.displayName || 'Usuario',
        role: canonicalNewRole,
        sede: prev.sede || 'Global',
        action: 'CAMBIO_ROL',
        details: `Cambió de rol activo a: ${ROLE_DISPLAY_NAMES[canonicalNewRole] || canonicalNewRole}`
      });

      return updated;
    });
    showToast(`Rol activo cambiado a: ${ROLE_DISPLAY_NAMES[canonicalNewRole] || canonicalNewRole}`, 'info');
  };

  const simulateUser = (targetUser) => {
    if (!canSimulate(currentUser, originalAdminUser)) {
      showToast('Acceso Denegado: Solo Super Administradores y Directivos pueden simular usuarios.', 'error');
      return;
    }
    setOriginalAdminUser(currentUser);
    sessionStorage.removeItem('cpsl_active_role');
    
    const targetEmail = targetUser.emails?.[0] || targetUser.email || '';
    const mockAuthUser = {
      email: targetEmail,
      displayName: targetUser.name,
      uid: targetUser.id || 'simulated_uid'
    };

    const simulatedUser = buildUserObject(mockAuthUser, targetUser, targetEmail);
    setCurrentUser({
      ...simulatedUser,
      isSimulated: true
    });

    recordAuditEvent({
      email: currentUser?.email || 'admin@crearpsl.net',
      name: currentUser?.name || 'Super Administrador',
      role: currentUser?.appRole || 'superadmin',
      sede: currentUser?.sede || 'Global',
      action: 'SIMULACION_ADMIN',
      details: `El administrador visualizó la pantalla de: ${targetUser.name} (${targetEmail})`,
      isSimulation: true
    });

    showToast(`Iniciando simulación como ${targetUser.name}`, 'success');
  };

  const stopSimulation = () => {
    if (originalAdminUser) {
      sessionStorage.removeItem('cpsl_active_role');
      recordAuditEvent({
        email: originalAdminUser.email || '',
        name: originalAdminUser.name || 'Admin',
        role: originalAdminUser.appRole || 'direccion',
        sede: originalAdminUser.sede || 'Global',
        action: 'FIN_SIMULACION',
        details: 'Fin de sesión simulada'
      });
      setCurrentUser(originalAdminUser);
      setOriginalAdminUser(null);
      showToast('Simulación terminada. Bienvenido de vuelta, Admin.', 'success');
    }
  };

  const buildUserObject = (user, foundUser, normalizedEmail) => {
    // 0. Respaldo fidedigno contra el catálogo oficial corporativo para erradicar colapsos de cargos
    const officialProfile = findUserByAnyEmail(normalizedEmail) || (foundUser?.email ? findUserByAnyEmail(foundUser.email) : null);
    
    let canonicalRole = normalizeRole(officialProfile?.role || foundUser.role);
    const isSuperAdmin = isSuperAdminEmail(normalizedEmail) || isSuperAdminEmail(foundUser.email);
    const isDualTrainer = DUAL_ROLE_TRAINER_EMAILS.includes(normalizedEmail);
    const isOfficialCoord = Boolean(
      officialProfile && ['coord_c1', 'coord_maestria', 'director_maestria'].includes(canonicalRole)
    );

    let assignedRoles = [];

    if (officialProfile) {
      // Si el usuario existe en el catálogo corporativo maestro, sus roles oficiales mandan
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
    if (isSuperAdmin) {
      if (!assignedRoles.includes('gerente')) assignedRoles.push('gerente');
      if (!assignedRoles.includes('direccion')) assignedRoles.push('direccion');
      if (!assignedRoles.includes('consolidado')) assignedRoles.push('consolidado');
    }

    // Asegurar que no quede 'coordinador' administrativo si el usuario tiene un cargo específico
    const hasSpecificRole = assignedRoles.some(r => ['coord_c1', 'coord_maestria', 'director_maestria', 'gerente', 'cfo', 'direccion'].includes(r));
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

    const savedActiveRole = sessionStorage.getItem('cpsl_active_role');
    
    // Por defecto, SuperAdmin inicia SIEMPRE en 'consolidado' para ver todas las opciones sin límites
    let activeRole = isSuperAdmin ? 'consolidado' : canonicalRole;
    if (savedActiveRole && (assignedRoles.includes(savedActiveRole) || isSuperAdmin)) {
      activeRole = savedActiveRole;
    } else if (isSuperAdmin) {
      activeRole = 'consolidado';
    } else if (assignedRoles.length > 0) {
      activeRole = assignedRoles[0];
    }
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
      sede: foundUser.sede || 'Global',
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

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.addScope('https://www.googleapis.com/auth/tasks');
    provider.addScope('https://www.googleapis.com/auth/drive.file');

    try {
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
        'brunische66@gmail.com'
      ];
      const normalizedEmail = rawEmail.replace('@crearpsl.com', '@crearpsl.net');
      
      // Buscar en Firestore con búsqueda progresiva (revisando normalized y raw)
      let foundUser = await findUserInFirestore(normalizedEmail);
      if (!foundUser && rawEmail !== normalizedEmail) {
        foundUser = await findUserInFirestore(rawEmail);
      }

      // Fallback a directorio de staff migrado
      if (!foundUser) {
        try {
          const staffRef = collection(db, "staff_directory");
          
          let sq = query(staffRef, where("emails", "array-contains", rawEmail));
          let sSnap = await getDocs(sq);
          if (!sSnap.empty) {
            foundUser = sSnap.docs[0].data();
          } else {
            sq = query(staffRef, where("email", "==", rawEmail));
            sSnap = await getDocs(sq);
            if (!sSnap.empty) foundUser = sSnap.docs[0].data();
          }
        } catch (err) {
          console.error("Error consultando staff_directory:", err);
        }
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

      // Verificación de política: si no es @crearpsl.net, ni está en la lista blanca, ni en Firestore/QT, se rechaza
      if (!rawEmail.endsWith('@crearpsl.net') && !allowedGmails.includes(rawEmail) && !foundUser) {
        await auth.signOut();
        throw new Error('ACCESO DENEGADO: Por política corporativa, debes iniciar sesión exclusivamente con tu correo corporativo @crearpsl.net');
      }

      // 🆕 (02/09/2026) Respaldo: catálogo estático usersToImport.js (findUserByAnyEmail).
      // Antes de este fix, si el correo todavía no existía en Firestore (típicamente
      // porque nadie corrió una importación manual para esa persona), el login caía
      // directo al "colaborador" genérico, aunque esa persona ya estuviera correctamente
      // registrada como entrenador/etc. en el código fuente. Caso real confirmado:
      // Lourdes Patiño (marylourdespat@gmail.com) — ver managers_directory/liquidacion,
      // reportado por José el 02/09/2026.
      if (!foundUser) {
        const staticUser = findUserByAnyEmail(normalizedEmail);
        if (staticUser) {
          foundUser = { ...staticUser };
        }
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

      // Normalizar el registro usando el esquema canónico (Hito 1)
      let canonicalUser = normalizeUserRecord(foundUser, 'login');

      // 🕵️‍♂️ AGENTE ONLINE: Validar y sanar multiroles 
      const updatedRoles = await enforceUserRolesAgent(user, user.uid, canonicalUser.roles);
      canonicalUser.roles = updatedRoles;

      // 🔥 CRÍTICO: Guardar el usuario en la colección "users"
      // Si no existe aquí, las reglas de Firestore (Hito 0) rechazarán todas sus peticiones.
      try {
        await setDoc(doc(db, 'users', user.uid), canonicalUser, { merge: true });
      } catch (e) {
        console.warn('Cannot update /users since only superadmin can, continuing login');
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
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const rawEmail = user.email.trim().toLowerCase();
          const normalizedEmail = rawEmail.replace('@crearpsl.com', '@crearpsl.net');
          
          let foundUser = await findUserInFirestore(normalizedEmail);
          
          if (!foundUser) {
            try {
              const staffRef = collection(db, "staff_directory");
              let sq = query(staffRef, where("emails", "array-contains", normalizedEmail));
              let sSnap = await getDocs(sq);
              if (!sSnap.empty) {
                foundUser = sSnap.docs[0].data();
              } else {
                sq = query(staffRef, where("email", "==", normalizedEmail));
                sSnap = await getDocs(sq);
                if (!sSnap.empty) foundUser = sSnap.docs[0].data();
              }
            } catch (err) {
              console.error("Error consultando staff_directory:", err);
            }
          }
          
          // 🆕 (02/09/2026) Mismo respaldo que en loginWithGoogle: catálogo estático
          // antes de descartar al usuario por completo en esta ruta de sesión persistida.
          if (!foundUser) {
            const staticUser = findUserByAnyEmail(normalizedEmail);
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
            let canonicalUser = normalizeUserRecord(foundUser, 'onAuthStateChanged');
            
            // 🕵️‍♂️ AGENTE ONLINE: Validar y sanar multiroles 
            const updatedRoles = await enforceUserRolesAgent(user, user.uid, canonicalUser.roles);
            canonicalUser.roles = updatedRoles;

            // 🔥 CRÍTICO: Guardar el usuario en la colección "users"
            try {
              try {
                await setDoc(doc(db, 'users', user.uid), canonicalUser, { merge: true });
              } catch (e) {
                console.warn('Cannot update /users since only superadmin can, continuing login');
              }
            } catch (err) {
              console.error("Error guardando perfil de usuario en auth state:", err);
            }

            const userObj = buildUserObject(user, canonicalUser, normalizedEmail);
            setCurrentUser(userObj);
            
            try {
              const todayStr = new Date().toISOString().slice(0, 10);
              const sessionLogKey = `audit_login_${normalizedEmail}_${todayStr}`;
              if (!sessionStorage.getItem(sessionLogKey)) {
                await recordAuditEvent({
                  email: foundUser.email || normalizedEmail,
                  name: foundUser.name || user.displayName || 'Desconocido',
                  role: foundUser.role || 'Desconocido',
                  sede: foundUser.sede || 'Desconocida',
                  action: 'LOGIN',
                  details: 'Inicio de sesión / Actividad diaria'
                });
                sessionStorage.setItem(sessionLogKey, 'true');
              }
            } catch(e) {
              console.error("Error actualizando login en auditoría:", e);
            }
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
      } finally {
        setLoading(false);
      }
    });
    
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, originalAdminUser, loginWithGoogle, reauthenticateGoogle, logout, loading, switchRole, simulateUser, stopSimulation }}>
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

