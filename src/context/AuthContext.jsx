import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { normalizeRole, ROLE_DISPLAY_NAMES } from '../data/usersData';
import { isSuperAdminEmail, isDireccionRole, isGerenciaRole, canSimulate } from '../config/permissions';
import { USERS_TO_IMPORT } from '../data/usersToImport';
import { useUI } from './UIContext';
import { recordAuditEvent, fetchNetworkInfo } from '../services/auditService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [originalAdminUser, setOriginalAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useUI();

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
      showToast('Acceso Denegado: Solo el Super Administrador puede simular usuarios.', 'error');
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

    // Get all roles
    let assignedRoles = [canonicalRole];
    if (foundUser.roles && foundUser.roles.length > 0) {
      assignedRoles = foundUser.roles.map(r => normalizeRole(r));
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
      const normalizedEmail = user.email.trim().toLowerCase();
      
      // Buscar en Firestore
      let foundUser = null;
      try {
        const q = query(collection(db, "users"), where("emails", "array-contains", normalizedEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          foundUser = snap.docs[0].data();
        }
      } catch (err) {
        console.error("Error consultando Firestore:", err);
      }

      // Fallback a archivo estático
      if (!foundUser) {
        foundUser = USERS_TO_IMPORT.find(u => 
          (u.emails && u.emails.map(e => e.toLowerCase()).includes(normalizedEmail)) || 
          (u.email && u.email.toLowerCase() === normalizedEmail)
        );
      }

      if (!foundUser) {
        foundUser = {
          id: normalizedEmail.split('@')[0].replace('.', '_'),
          name: user.displayName || "Usuario",
          role: "colaborador",
          sede: "Sede Global",
          emails: [normalizedEmail],
          email: normalizedEmail
        };
      }

      const userObj = buildUserObject(user, foundUser, normalizedEmail);
      setCurrentUser(userObj);

      recordAuditEvent({
        email: foundUser.email || normalizedEmail,
        name: userObj.name,
        role: userObj.appRole,
        sede: userObj.sede,
        action: 'LOGIN',
        details: 'Inicio de sesión con Google'
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
        const normalizedEmail = user.email.trim().toLowerCase();
        
        let foundUser = null;
        try {
          const q = query(collection(db, "users"), where("emails", "array-contains", normalizedEmail));
          const snap = await getDocs(q);
          if (!snap.empty) foundUser = snap.docs[0].data();
        } catch(e) {
          console.error("Error de auth con Firestore:", e);
        }
        
        if (!foundUser) {
          foundUser = USERS_TO_IMPORT.find(u => 
            (u.emails && u.emails.map(e => e.toLowerCase()).includes(normalizedEmail)) || 
            (u.email && u.email.toLowerCase() === normalizedEmail)
          );
        }
        
        if (!foundUser && isSuperAdminEmail(normalizedEmail)) {
          foundUser = {
            id: normalizedEmail.split('@')[0].replace('.', '_'),
            name: user.displayName || "Administrador",
            role: "gerente",
            sede: "Global",
            emails: [normalizedEmail]
          };
        }

        if (foundUser) {
          const userObj = buildUserObject(user, foundUser, normalizedEmail);
          setCurrentUser(userObj);
          
          // Registrar último login y auditoría
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
