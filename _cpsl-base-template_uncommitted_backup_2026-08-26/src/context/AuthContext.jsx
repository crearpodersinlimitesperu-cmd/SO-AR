import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { normalizeRole, ROLE_DISPLAY_NAMES, findUserByAnyEmail } from '../data/usersData';
import { isSuperAdminEmail, isDireccionRole, isGerenciaRole } from '../config/permissions';
import { USERS_TO_IMPORT } from '../data/usersToImport';
import { syncSingleUserToFirestore } from '../services/dbInit';
import { useUI } from './UIContext';

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
      return {
        ...prev,
        activeRole: canonicalNewRole,
        appRole: canonicalNewRole
      };
    });
    showToast(`Rol activo cambiado a: ${ROLE_DISPLAY_NAMES[canonicalNewRole] || canonicalNewRole}`, 'info');
  };

  const simulateUser = (targetUser) => {
    if (!currentUser?.isSuperAdmin) {
      showToast('Acceso Denegado: Solo el Super Administrador puede simular usuarios.', 'error');
      return;
    }
    setOriginalAdminUser(currentUser);
    
    const mockAuthUser = {
      email: targetUser.emails?.[0] || targetUser.email || '',
      displayName: targetUser.name,
      uid: targetUser.id || 'simulated_uid'
    };

    const simulatedUser = buildUserObject(mockAuthUser, targetUser, mockAuthUser.email);
    setCurrentUser({
      ...simulatedUser,
      isSimulated: true
    });
    showToast(`Iniciando simulación como ${targetUser.name}`, 'success');
  };

  const stopSimulation = () => {
    if (originalAdminUser) {
      setCurrentUser(originalAdminUser);
      setOriginalAdminUser(null);
      showToast('Simulación terminada. Bienvenido de vuelta, Admin.', 'success');
    }
  };

  const buildUserObject = (user, foundUser, normalizedEmail) => {
    const canonicalRole = normalizeRole(foundUser.role);
    const isDireccion = isDireccionRole(canonicalRole);
    const isSuperAdmin = isSuperAdminEmail(normalizedEmail);
    const isGerente = isSuperAdmin || isGerenciaRole(canonicalRole);

    // Obtener todos los roles asignados a esta persona
    const assignedRoles = (foundUser.roles && foundUser.roles.length > 0)
      ? Array.from(new Set(foundUser.roles.map(r => normalizeRole(r))))
      : [canonicalRole];

    // Verificar si el usuario tenía un rol activo previamente guardado
    const savedActiveRole = sessionStorage.getItem('cpsl_active_role');
    const activeRole = (savedActiveRole && assignedRoles.includes(savedActiveRole))
      ? savedActiveRole
      : canonicalRole;

    return {
      ...user,
      name: foundUser.name || user.displayName || 'Colaborador CREAR',
      appRole: activeRole,
      activeRole: activeRole,
      roles: assignedRoles,
      rawRole: foundUser.role,
      sede: foundUser.sede,
      sedeTag: foundUser.sedeTag,
      corporateEmail: foundUser.corporateEmail || (foundUser.email?.endsWith('@crearpsl.net') ? foundUser.email : null),
      personalEmail: foundUser.personalEmail || (!foundUser.email?.endsWith('@crearpsl.net') ? foundUser.email : null),
      emails: foundUser.emails || [foundUser.email],
      docType: foundUser.docType,
      docNum: foundUser.docNum,
      phone: foundUser.phone,
      isSuperAdmin,
      isDireccion,
      isGerente,
      switchRole,
      canAccessRole: (targetRole) => {
        const tNorm = normalizeRole(targetRole);
        return isSuperAdmin || isGerente || assignedRoles.includes(tNorm) || activeRole === tNorm;
      }
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
      
      // Buscar en Firestore (por array de emails o por email directo)
      let foundUser = null;
      try {
        const q = query(collection(db, "users"), where("emails", "array-contains", normalizedEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          foundUser = snap.docs[0].data();
        } else {
          const qDirect = query(collection(db, "users"), where("email", "==", normalizedEmail));
          const snapDirect = await getDocs(qDirect);
          if (!snapDirect.empty) {
            foundUser = snapDirect.docs[0].data();
          }
        }
      } catch (err) {
        console.error("Error consultando Firestore:", err);
      }

      // Fallback exhaustivo al directorio local
      if (!foundUser) {
        foundUser = findUserByAnyEmail(normalizedEmail);
      }

      if (!foundUser) {
        console.warn("Acceso denegado: Usuario no encontrado en BD: " + normalizedEmail);
        await signOut(auth);
        throw new Error("Acceso denegado. Tu correo no está autorizado en el sistema.");
      }

      const userObj = buildUserObject(user, foundUser, normalizedEmail);
      setCurrentUser(userObj);
      syncSingleUserToFirestore(userObj);
      return user;
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const fetchNetworkData = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) return { ip: 'Desconocida', location: 'Desconocida' };
      const data = await res.json();
      return {
        ip: data.ip || 'Desconocida',
        location: data.city && data.country_name ? `${data.city}, ${data.country_name}` : 'Desconocida'
      };
    } catch (error) {
      return { ip: 'Desconocida', location: 'Desconocida' };
    }
  };

  const logout = async () => {
    if (currentUser && !currentUser.isSimulated) {
      try {
        const netData = await fetchNetworkData();
        await addDoc(collection(db, 'audit_logs'), {
          email: currentUser.email || currentUser.emails?.[0] || 'Desconocido',
          name: currentUser.name || 'Desconocido',
          role: currentUser.appRole || 'Desconocido',
          sede: currentUser.sede || 'Desconocida',
          action: 'LOGOUT',
          timestamp: serverTimestamp(),
          ip: netData.ip,
          location: netData.location,
          userAgent: navigator.userAgent
        });
      } catch (e) {
        console.error("Error registrando LOGOUT en audit_logs:", e);
      }
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
          if (!snap.empty) {
            foundUser = snap.docs[0].data();
          } else {
            const qDirect = query(collection(db, "users"), where("email", "==", normalizedEmail));
            const snapDirect = await getDocs(qDirect);
            if (!snapDirect.empty) foundUser = snapDirect.docs[0].data();
          }
        } catch(e) {
          console.error("Error de auth con Firestore:", e);
        }
        
        if (!foundUser) {
          foundUser = findUserByAnyEmail(normalizedEmail);
        }
        
        if (!foundUser && isSuperAdminEmail(normalizedEmail)) {
          foundUser = {
            id: normalizedEmail.split('@')[0].replace('.', '_'),
            name: user.displayName || "Administrador",
            role: "direccion",
            sede: "Sede Global",
            emails: [normalizedEmail]
          };
        }

        if (foundUser) {
          const userObj = buildUserObject(user, foundUser, normalizedEmail);
          setCurrentUser(userObj);
          syncSingleUserToFirestore(userObj);
          
          // Registrar último login para el sistema de inactividad
          try {
            const userProfileRef = doc(db, 'user_profiles', normalizedEmail);
            const userProfileSnap = await getDoc(userProfileRef);
            
            if (userProfileSnap.exists()) {
              const profileData = userProfileSnap.data();
              if (profileData.lastLoginAt) {
                const lastLogin = profileData.lastLoginAt.toDate();
                const now = new Date();
                const diffHours = (now - lastLogin) / (1000 * 60 * 60);
                
                // Si la diferencia es mayor a 72 horas, enviamos alerta
                if (diffHours > 72) {
                  await addDoc(collection(db, 'mail'), {
                    to: 'sistemas@crearpsl.net',
                    message: {
                      subject: `⚠️ Alerta de Inactividad: ${foundUser.name}`,
                      html: `<h2>Alerta de Inactividad en SO-AR</h2>
                             <p>El usuario <strong>${foundUser.name}</strong> (${normalizedEmail}) acaba de ingresar a la plataforma después de <strong>${Math.floor(diffHours)} horas</strong> de inactividad.</p>
                             <p>Rol: ${foundUser.role || 'Desconocido'}</p>
                             <p>Sede: ${foundUser.sede || 'Desconocida'}</p>
                             <hr/>
                             <p><small>Sistema Automático de Alertas SO-AR</small></p>`
                    }
                  });
                }
              }
            }

            await setDoc(userProfileRef, {
              lastLoginAt: serverTimestamp()
            }, { merge: true });

            // Registrar evento de auditoría
            try {
              // Evitar doble log si la sesión ya estaba iniciada y onAuthStateChanged se dispara de nuevo
              const sessionLogKey = `audit_login_${normalizedEmail}`;
              if (!sessionStorage.getItem(sessionLogKey)) {
                const netData = await fetchNetworkData();
                await addDoc(collection(db, 'audit_logs'), {
                  email: normalizedEmail,
                  name: foundUser.name || user.displayName || 'Desconocido',
                  role: foundUser.role || 'Desconocido',
                  sede: foundUser.sede || 'Desconocida',
                  action: 'LOGIN',
                  timestamp: serverTimestamp(),
                  ip: netData.ip,
                  location: netData.location,
                  userAgent: navigator.userAgent
                });
                sessionStorage.setItem(sessionLogKey, 'true');
              }
            } catch (e) {
              console.error("Error registrando LOGIN en audit_logs:", e);
            }
          } catch(e) {
            console.error("Error actualizando lastLoginAt:", e);
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
