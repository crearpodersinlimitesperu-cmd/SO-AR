import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { normalizeRole, ROLE_DISPLAY_NAMES } from '../data/usersData';
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

  // Búsqueda progresiva de usuarios en Firestore
  const findUserInFirestore = async (normalizedEmail) => {
    try {
      const usersRef = collection(db, "users");
      
      // 1. emails array-contains
      let q = query(usersRef, where("emails", "array-contains", normalizedEmail));
      let snap = await getDocs(q);
      if (!snap.empty) return snap.docs[0].data();

      // 2. email ==
      q = query(usersRef, where("email", "==", normalizedEmail));
      snap = await getDocs(q);
      if (!snap.empty) return snap.docs[0].data();

      // 3. corporateEmail ==
      q = query(usersRef, where("corporateEmail", "==", normalizedEmail));
      snap = await getDocs(q);
      if (!snap.empty) return snap.docs[0].data();

      // 4. personalEmail ==
      q = query(usersRef, where("personalEmail", "==", normalizedEmail));
      snap = await getDocs(q);
      if (!snap.empty) return snap.docs[0].data();

    } catch (err) {
      console.error("Error consultando Firestore:", err);
    }
    return null;
  };

  const switchRole = (newRole) => {
    const canonicalNewRole = normalizeRole(newRole);
    sessionStorage.setItem('cpsl_active_role', canonicalNewRole);
    setCurrentUser(prev => {
      if (!prev) return null;
      const isConsolidated = canonicalNewRole === 'consolidado';
      const userRoles = prev.roles || [prev.appRole || ''];
      const hasDireccion = userRoles.some(r => isDireccionRole(r)) || isDireccionRole(prev.role) || isDireccionRole(prev.rawRole);
      const hasGerente = userRoles.some(r => isGerenciaRole(r)) || isGerenciaRole(prev.role);
      const isSuper = prev.isSuperAdmin || isSuperAdminEmail(prev.email);

      const isDireccion = isSuper || (isConsolidated ? hasDireccion : isDireccionRole(canonicalNewRole));
      const isGerente = isSuper || isDireccion || (isConsolidated ? (hasGerente || hasDireccion) : (canonicalNewRole === 'gerente' || canonicalNewRole === 'director_maestria'));

      const updated = {
        ...prev,
        activeRole: canonicalNewRole,
        appRole: canonicalNewRole,
        isConsolidatedView: isConsolidated,
        isDireccion,
        isGerente,
        isSuperAdmin: isSuper
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
    const canonicalRole = normalizeRole(foundUser.role);
    const isSuperAdmin = isSuperAdminEmail(normalizedEmail) || isSuperAdminEmail(foundUser.email);

    let assignedRoles = [canonicalRole];
    if (foundUser.roles && foundUser.roles.length > 0) {
      assignedRoles = foundUser.roles.map(r => normalizeRole(r));
    }

    // Filtrar roles inválidos (null = roles que no son del sistema, como 'student')
    assignedRoles = assignedRoles.filter(r => r != null);
    
    // Si es SuperAdmin, inyectarle los roles gerenciales y de consolidado para que tenga el selector
    if (isSuperAdmin) {
      if (!assignedRoles.includes('gerente')) assignedRoles.push('gerente');
      if (!assignedRoles.includes('direccion')) assignedRoles.push('direccion');
      if (!assignedRoles.includes('consolidado')) assignedRoles.push('consolidado');
    }

    // 🔥 GOBERNANZA: Si es un Entrenador Dual (ej. Andres Gomez) y por base de datos no tiene
    // el array de roles, se inyecta obligatoriamente 'entrenador' para activar el selector.
    if (DUAL_ROLE_TRAINER_EMAILS.includes(normalizedEmail)) {
      if (!assignedRoles.includes('entrenador')) {
        assignedRoles.push('entrenador');
      }
    }

    // ensure unique
    assignedRoles = Array.from(new Set(assignedRoles.filter(r => r && r !== 'miembro')));
    if (assignedRoles.length === 0) assignedRoles = ['miembro'];

    const hasDireccion = assignedRoles.some(r => isDireccionRole(r)) || isDireccionRole(canonicalRole);
    const hasGerente = assignedRoles.some(r => isGerenciaRole(r)) || isGerenciaRole(canonicalRole);

    const savedActiveRole = sessionStorage.getItem('cpsl_active_role');
    const isConsolidated = savedActiveRole === 'consolidado';
    
    let activeRole = canonicalRole;
    if (isConsolidated) {
      activeRole = 'consolidado';
    } else if (savedActiveRole && assignedRoles.includes(savedActiveRole)) {
      activeRole = savedActiveRole;
    } else if (assignedRoles.length > 0) {
      activeRole = assignedRoles[0];
    }

    const isDireccion = isSuperAdmin || (isConsolidated ? hasDireccion : isDireccionRole(activeRole));
    const isGerente = isSuperAdmin || isDireccion || (isConsolidated ? (hasGerente || hasDireccion) : (activeRole === 'gerente' || activeRole === 'director_maestria'));

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
      sede: foundUser.sede || 'Global',
      document: foundUser.document || '',
      docType: foundUser.docType || '',
      dbId: foundUser.id,
      rawRole: foundUser.role,
      role: canonicalRole
    };
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.addScope('https://www.googleapis.com/auth/tasks');
    
    try {
      const result = await signInWithPopup(auth, provider);
      
      // Extract Google Access Token for API calls
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        sessionStorage.setItem('googleAccessToken', credential.accessToken);
      }
      
      const user = result.user;
      const rawEmail = user.email.trim().toLowerCase();
      
      // FORZAR USO DE .NET (Excepto para los correos autorizados explicitamente de gmail)
      const allowedGmails = ['armando.pilacuan@gmail.com', 'gomeznueve@gmail.com'];
      if (!rawEmail.endsWith('@crearpsl.net') && !allowedGmails.includes(rawEmail)) {
        // Rechazar acceso
        await auth.signOut();
        throw new Error('ACCESO DENEGADO: Por política corporativa, debes iniciar sesión exclusivamente con tu correo corporativo @crearpsl.net');
      }
      const normalizedEmail = rawEmail.replace('@crearpsl.com', '@crearpsl.net');
      
      // Buscar en Firestore con búsqueda progresiva
      let foundUser = await findUserInFirestore(normalizedEmail);

      // Fallback a directorio de staff migrado
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
          
          if (!userObj.isSimulated) {
            setLoading(false);
          }
          try {
            const sessionLogKey = `audit_login_${normalizedEmail}`;
            if (!sessionStorage.getItem(sessionLogKey)) {
              await recordAuditEvent({
                email: foundUser.email || normalizedEmail,
                name: foundUser.name || user.displayName || 'Desconocido',
                role: foundUser.role || 'Desconocido',
                sede: foundUser.sede || 'Desconocida',
                action: 'LOGIN',
                details: 'Inicio de sesión / Reconexión'
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
        sessionStorage.removeItem('googleAccessToken');
        sessionStorage.removeItem('cpsl_active_role');
        setCurrentUser(null);
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, originalAdminUser, loginWithGoogle, logout, loading, switchRole, simulateUser, stopSimulation }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

