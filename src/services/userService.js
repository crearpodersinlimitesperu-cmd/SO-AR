import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, getDocs, query, where } from 'firebase/firestore';
import { usersData, normalizeRole, findUserByAnyEmail } from '../data/usersData';
import { DUAL_ROLE_TRAINER_EMAILS } from '../config/permissions';
import { recordAuditEvent } from './auditService';


/**
 * Busca y verifica un usuario en Firestore por email.
 * Si no existe en Firestore, consulta el seed inicial de usersData.
 */
export async function getVerifiedUser(email) {
  if (!email) return null;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const q1 = query(collection(db, 'users'), where('email', '==', normalizedEmail));
    const q2 = query(collection(db, 'users'), where('emails', 'array-contains', normalizedEmail));
    
    const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    if (!snapshot1.empty || !snapshot2.empty) {
      const userDoc = (!snapshot1.empty ? snapshot1.docs[0] : snapshot2.docs[0]).data();
      const official = findUserByAnyEmail(normalizedEmail);
      let role = userDoc.role;
      let roles = Array.isArray(userDoc.roles) ? [...userDoc.roles] : (role ? [role] : []);
      let name = userDoc.name || userDoc.displayName;
      if (official) {
        role = official.role || role;
        if (official.roles && official.roles.length > 0) {
          roles = official.roles;
        }
        if (official.name && (!name || name.toLowerCase().trim() === 'redes sociales' || name.toLowerCase().trim() === 'staff_redessociales')) {
          name = official.name;
        }
      }
      return {
        ...userDoc,
        name: name || userDoc.name,
        displayName: name || userDoc.displayName || userDoc.name,
        email: userDoc.email || normalizedEmail,
        role: role,
        roles: roles,
        appRole: normalizeRole(role)
      };
    }

    // Check qt_directory if not found in users
    const qtQ = query(collection(db, 'qt_directory'), where('email', '==', normalizedEmail));
    const qtSnapshot = await getDocs(qtQ);
    if (!qtSnapshot.empty) {
      const qtDoc = qtSnapshot.docs[0].data();
      return {
        ...qtDoc,
        email: qtDoc.email || normalizedEmail,
        role: qtDoc.role || 'qt',
        appRole: normalizeRole(qtDoc.role || 'qt')
      };
    }
  } catch (error) {
    console.warn("Firestore directory query fallback to local registry:", error.message);
  }

  // Fallback seguro al registro predefinido
  const localMatch = usersData.find(u => u.email.toLowerCase() === normalizedEmail);
  if (localMatch) {
    return {
      ...localMatch,
      appRole: normalizeRole(localMatch.role)
    };
  }

  return null;
}

/**
 * Obtiene todos los usuarios de la compañía consultando los tres directorios oficiales de Firestore.
 * Esto reemplaza al archivo estático usersData.js
 */
export async function getAllCompanyUsers() {
  const allUsers = [];

  // NOTA (26/08/2026): normalizamos (trim + minúsculas) todas las comparaciones de
  // email para evitar duplicados por diferencias de mayúsculas/espacios entre
  // "users", "qt_directory" y el registro local. No eliminamos registros sin email
  // (docs "fantasma" de la colección "users") porque no hay forma segura de saber,
  // sin ese dato, si corresponden o no a alguien ya listado — hacerlo arriesgaría
  // ocultar a una persona real. Ver reporte de auditoría del 26/08/2026 para el
  // detalle de por qué pueden existir esos docs sin email.
  const normEmail = (e) => (e || '').toString().trim().toLowerCase();

  // NOTA (27/08/2026): src/utils/userNormalizer.js (usado en el login, ver
  // AuthContext.jsx) ya sabe que el correo de una persona puede venir en más de
  // un nombre de campo — "email", "correo" (algunos docs viejos), "emails"[],
  // "corporateEmail" o "personalEmail" — pero getAllCompanyUsers() no aplicaba
  // esa misma lógica: solo miraba "email"/"emails". Eso significa que una
  // persona con su correo guardado bajo "correo" o solo en "corporateEmail"
  // aparecía en el Panel Super Admin SIN botón de Correo/Chat (y a veces como
  // tarjeta duplicada, porque tampoco se detectaba como la misma persona al
  // fusionar). deriveEmail()/emailKeysOf() ahora reconocen esas variantes.
  const deriveEmail = (u) => normEmail(
    u.email || u.correo || u.corporateEmail || u.personalEmail ||
    (Array.isArray(u.emails) && u.emails.find(e => e)) || ''
  ) || null;

  const emailKeysOf = (u) => {
    const keys = new Set();
    const primary = deriveEmail(u);
    if (primary) keys.add(primary);
    (Array.isArray(u.emails) ? u.emails : []).forEach(e => {
      const k = normEmail(e);
      if (k) keys.add(k);
    });
    if (u.correo) keys.add(normEmail(u.correo));
    if (u.corporateEmail) keys.add(normEmail(u.corporateEmail));
    if (u.personalEmail) keys.add(normEmail(u.personalEmail));
    return keys;
  };

  // Devuelve el registro con un campo "email" de nivel superior garantizado
  // (sin pisar uno que ya existiera), para que cualquier componente que solo
  // lea person.email — como los botones de contacto del Panel Super Admin —
  // lo encuentre sin importar en qué campo llegó originalmente el dato.
  const withCanonicalEmail = (raw) => {
    if (raw.email) return raw;
    const derived = deriveEmail(raw);
    return derived ? { ...raw, email: derived } : raw;
  };

  const findExistingIndex = (candidateKeys) => {
    if (candidateKeys.size === 0) return -1;
    return allUsers.findIndex(u => {
      const existingKeys = emailKeysOf(u);
      for (const k of candidateKeys) {
        if (existingKeys.has(k)) return true;
      }
      return false;
    });
  };

  try {
    // Los usuarios principales están en la colección "users".
    // NOTA (27/08/2026): "users" puede tener más de un documento para la misma
    // persona (ej. un doc viejo con otro id y uno nuevo con el uid actual, ambos
    // con el mismo correo) — eso causaba tarjetas duplicadas en el Panel Super
    // Admin. Se fusionan por correo igual que ya se hace con qt_directory abajo,
    // sin perder ningún campo: el primer doc encontrado manda, y el duplicado
    // solo rellena los campos que al primero le falten.
    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.forEach(docSnap => {
      const uData = docSnap.data();
      const candidateKeys = emailKeysOf(uData);
      const existingIdx = candidateKeys.size > 0 ? findExistingIndex(candidateKeys) : -1;
      
      // Respaldo contra catálogo fidedigno oficial para prevenir colapsos de cargos y nombres genéricos
      const primaryEmail = deriveEmail(uData);
      const officialProfile = primaryEmail ? findUserByAnyEmail(primaryEmail) : null;
      let finalRole = uData.role;
      let finalRoles = Array.isArray(uData.roles) ? [...uData.roles] : (uData.role ? [uData.role] : []);
      let finalSede = uData.sede;
      let finalName = uData.name || uData.displayName;

      if (officialProfile) {
        // Prevenir nombres genéricos de buzón o alias (ej. 'redes sociales' -> 'Alex Zapata')
        const currentLower = (finalName || '').toLowerCase().trim();
        if (officialProfile.name && (!finalName || currentLower === 'redes sociales' || currentLower === 'staff_redessociales' || currentLower === 'marketing')) {
          finalName = officialProfile.name;
        }

        // El catálogo oficial corporativo es la máxima fuente de verdad contra colapsos
        finalRole = officialProfile.role || finalRole;
        if (!finalSede || finalSede === 'Global') {
          finalSede = officialProfile.sede || finalSede;
        }

        const canonicalOfficial = normalizeRole(officialProfile.role);
        const isOfficialCoord = ['coord_c1', 'coord_maestria', 'director_maestria'].includes(canonicalOfficial);
        const isDualTrainer = primaryEmail ? DUAL_ROLE_TRAINER_EMAILS.includes(primaryEmail.toLowerCase()) : false;

        // Iniciar roles desde los definidos en el perfil oficial
        const officialRolesSet = new Set(
          (officialProfile.roles || [officialProfile.role]).map(r => normalizeRole(r))
        );

        // Si es entrenador dual autorizado por gobernanza, asegurar rol entrenador
        if (isDualTrainer) officialRolesSet.add('entrenador');

        // Purgar categóricamente roles prohibidos para coordinadores
        if (isOfficialCoord) {
          officialRolesSet.delete('coordinador');
          if (!isDualTrainer) officialRolesSet.delete('entrenador');
          if (!officialProfile.roles || !officialProfile.roles.includes('manager')) {
            officialRolesSet.delete('manager');
          }
        }

        finalRoles = Array.from(officialRolesSet);
      } else {
        // Si no tiene perfil oficial, purgar 'coordinador' genérico si tiene cargo operativo específico
        const normRoles = finalRoles.map(r => normalizeRole(r));
        if (normRoles.includes('coord_c1') || normRoles.includes('coord_maestria') || normRoles.includes('director_maestria')) {
          finalRoles = finalRoles.filter(r => r !== 'coordinador');
        }
      }

      // Deduplicar y limpiar roles
      finalRoles = Array.from(new Set(finalRoles.filter(r => r && r !== 'undefined' && r !== 'null' && r !== 'student')));

      const isUserActive = uData.isActive !== false && uData.status !== 'inactive' && uData.active !== false;

      const enrichedUser = {
        ...uData,
        name: finalName || uData.name,
        displayName: finalName || uData.displayName || uData.name,
        role: finalRole || uData.role,
        roles: finalRoles.length > 0 ? finalRoles : (finalRole ? [finalRole] : []),
        sede: finalSede || uData.sede,
        status: isUserActive ? 'active' : 'inactive',
        active: isUserActive,
        isActive: isUserActive,
        deactivatedAt: uData.deactivatedAt || null,
        deactivatedBy: uData.deactivatedBy || null,
        deactivationReason: uData.deactivationReason || null,
        deactivationNotes: uData.deactivationNotes || null,
        statusHistory: Array.isArray(uData.statusHistory) ? uData.statusHistory : []
      };

      if (existingIdx !== -1) {
        allUsers[existingIdx] = withCanonicalEmail({
          ...allUsers[existingIdx],
          ...enrichedUser,
          name: finalName || allUsers[existingIdx].name,
          displayName: finalName || allUsers[existingIdx].displayName,
          role: finalRole,
          roles: finalRoles,
          sede: finalSede,
          status: isUserActive ? 'active' : 'inactive',
          active: isUserActive,
          isActive: isUserActive,
          deactivatedAt: uData.deactivatedAt || allUsers[existingIdx].deactivatedAt || null,
          deactivatedBy: uData.deactivatedBy || allUsers[existingIdx].deactivatedBy || null,
          deactivationReason: uData.deactivationReason || allUsers[existingIdx].deactivationReason || null,
          deactivationNotes: uData.deactivationNotes || allUsers[existingIdx].deactivationNotes || null,
          statusHistory: Array.isArray(uData.statusHistory) && uData.statusHistory.length > 0
            ? uData.statusHistory
            : (allUsers[existingIdx].statusHistory || [])
        });
        return;
      }
      allUsers.push(withCanonicalEmail({ id: docSnap.id, ...enrichedUser }));
    });


    // Agregar QT (y, cuando la persona ya existe como "users", rellenar sus campos
    // de contacto de QT en vez de descartarlos).
    // NOTA (27/08/2026): antes, cuando una persona de qt_directory YA tenía un doc
    // en "users" (findExistingIndex !== -1), este bloque simplemente no hacía nada
    // con ella — el registro que quedaba listado era el de "users", que no trae
    // whatsapp/whatsappUrl/cleanPhone (esos campos solo los pobla qtSheetService.js
    // sobre qt_directory). Eso dejaba sin botón de WhatsApp (y a veces sin correo,
    // si "users" tampoco lo tenía) a QT que sí tienen esos datos en qt_directory.
    // Ahora se rellenan esos campos en el registro existente, sin pisar ningún dato
    // que "users" ya tuviera.
    const qtSnap = await getDocs(collection(db, 'qt_directory'));
    // (29/08/2026) Se agrega "cumpleanos" para la alerta de cumpleaños: el dato existe
    // hoy en el directorio de QT (además del Directorio Global importado a "users"),
    // así que se rellena igual que whatsapp/phone: solo si el registro existente
    // todavía no tiene el campo, sin pisar un valor ya cargado.
    const CONTACT_FIELDS_FROM_QT = ['whatsapp', 'whatsappUrl', 'cleanPhone', 'phone', 'telefono', 'email', 'correo', 'corporateEmail', 'personalEmail', 'cumpleanos'];
    qtSnap.forEach(docSnap => {
      const qtData = docSnap.data();
      const candidateKeys = emailKeysOf(qtData);
      const existingIdx = candidateKeys.size > 0 ? findExistingIndex(candidateKeys) : -1;
      if (existingIdx !== -1) {
        CONTACT_FIELDS_FROM_QT.forEach(f => {
          if (!allUsers[existingIdx][f] && qtData[f]) {
            allUsers[existingIdx][f] = qtData[f];
          }
        });
        allUsers[existingIdx] = withCanonicalEmail(allUsers[existingIdx]);
        return;
      }
      if (candidateKeys.size > 0) {
        allUsers.push(withCanonicalEmail({
          id: docSnap.id,
          ...qtData,
          role: qtData.role || 'qt',
          roles: [qtData.role || 'qt']
        }));
      }
    });

  } catch (error) {
    console.error("Error fetching company users:", error);
  }

  // Merge fallback con registro estático local para usuarios que aún no están en Firestore
  usersData.forEach(localUser => {
    const candidateKeys = emailKeysOf(localUser);
    if (candidateKeys.size > 0 && findExistingIndex(candidateKeys) === -1) {
      allUsers.push(withCanonicalEmail({ ...localUser, id: localUser.id || localUser.email, source: 'local_registry' }));
    }
  });

  return allUsers;
}

/**
 * Actualiza el estado activo/inactivo de un colaborador con trazabilidad completa.
 * REGLA INSTITUCIONAL:
 * 1. Actualiza en la colección 'users'.
 * 2. Registra evento oficial en 'audit_logs' para consulta de SuperAdmin y Talento Humano.
 * 3. Registra entrada en la bitácora de 'user_profiles'.
 */
export async function setUserActiveStatus(targetUser, { isActive, reason = '', notes = '', effectiveDate = '', performedBy = {} }) {
  if (!targetUser || (!targetUser.email && !targetUser.id)) {
    throw new Error('Usuario inválido para actualizar estado');
  }

  const normalizedEmail = (targetUser.email || targetUser.emails?.[0] || '').toLowerCase().trim();
  const timestamp = new Date().toISOString();
  const actionType = isActive ? 'USER_REACTIVATED' : 'USER_DEACTIVATED';
  const actionLabel = isActive ? 'REACTIVACIÓN' : 'DESACTIVACIÓN';

  const historyEntry = {
    action: actionType,
    status: isActive ? 'active' : 'inactive',
    reason: reason || (isActive ? 'Reactivación de cuenta' : 'Baja de personal'),
    notes: notes || '',
    effectiveDate: effectiveDate || timestamp.split('T')[0],
    performedBy: {
      name: performedBy.name || 'Administrador',
      email: performedBy.email || '',
      role: performedBy.appRole || performedBy.role || 'superadmin'
    },
    timestamp
  };

  const updatePayload = {
    isActive: Boolean(isActive),
    active: Boolean(isActive),
    status: isActive ? 'active' : 'inactive',
    ...(isActive ? {
      reactivatedAt: timestamp,
      reactivatedBy: historyEntry.performedBy,
      deactivatedAt: null,
      deactivationReason: null,
      deactivationNotes: null
    } : {
      deactivatedAt: timestamp,
      deactivatedBy: historyEntry.performedBy,
      deactivationReason: reason || 'Baja de personal',
      deactivationNotes: notes || ''
    }),
    updatedAt: timestamp
  };

  // 1. Actualizar o crear en la colección 'users'
  let targetDocId = targetUser.id;

  if (!targetDocId || targetUser.source === 'local_registry') {
    const q1 = query(collection(db, 'users'), where('email', '==', normalizedEmail));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      targetDocId = snap1.docs[0].id;
    } else {
      targetDocId = targetUser.uid || normalizedEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
    }
  }

  const userDocRef = doc(db, 'users', targetDocId);
  const existingDoc = await getDoc(userDocRef);

  if (existingDoc.exists()) {
    const existingData = existingDoc.data();
    const existingHistory = Array.isArray(existingData.statusHistory) ? existingData.statusHistory : [];
    await updateDoc(userDocRef, {
      ...updatePayload,
      statusHistory: [...existingHistory, historyEntry]
    });
  } else {
    await setDoc(userDocRef, {
      ...targetUser,
      ...updatePayload,
      id: targetDocId,
      email: normalizedEmail,
      statusHistory: [historyEntry],
      createdAt: timestamp
    }, { merge: true });
  }

  // 2. Registrar evento formal de trazabilidad en audit_logs
  try {
    await recordAuditEvent({
      email: performedBy.email || 'admin@crearpsl.net',
      name: performedBy.name || 'Talento Humano / SuperAdmin',
      role: performedBy.appRole || performedBy.role || 'superadmin',
      sede: performedBy.sede || 'Global',
      action: actionType,
      details: `${actionLabel} de colaborador: ${targetUser.name || normalizedEmail} (${normalizedEmail}) - Cargo: ${targetUser.role || 'N/A'}, Sede: ${targetUser.sede || 'Global'}. Motivo: ${reason || 'N/A'}. Notas: ${notes || 'Sin notas adicionales'}. Fecha efectiva: ${effectiveDate || 'Inmediata'}. Ejecutado por: ${performedBy.name || performedBy.email}.`
    });
  } catch (auditErr) {
    console.warn("Error al registrar auditoría de estado:", auditErr);
  }

  // 3. Registrar nota en user_profiles para consulta en Bitácora del usuario
  try {
    const profileRef = doc(db, 'user_profiles', normalizedEmail);
    const noteEntry = {
      id: 'status_note_' + Date.now(),
      text: `[${actionLabel} DE COLABORADOR] ${isActive ? 'Cuenta reactivada' : 'Cuenta desactivada / Baja'}. Motivo: ${reason || 'N/A'}. Observaciones: ${notes || 'N/A'}. Fecha efectiva: ${effectiveDate || 'Inmediata'}.`,
      authorName: performedBy.name || 'Talento Humano / SuperAdmin',
      authorEmail: performedBy.email || '',
      createdAt: timestamp,
      isSystemAudit: true
    };
    await setDoc(profileRef, {
      notes: arrayUnion(noteEntry),
      status: isActive ? 'active' : 'inactive',
      isActive: Boolean(isActive),
      updatedAt: timestamp
    }, { merge: true });
  } catch (profileErr) {
    console.warn("No se pudo agregar nota en user_profiles:", profileErr);
  }

  return {
    ...targetUser,
    ...updatePayload,
    statusHistory: [...(targetUser.statusHistory || []), historyEntry]
  };
}
