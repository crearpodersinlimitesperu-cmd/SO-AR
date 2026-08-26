// Servicio de Directorio y Gestión de Usuarios para Producción
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { usersData, normalizeRole } from '../data/usersData';

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
    
    if (!snapshot1.empty) {
      const userDoc = snapshot1.docs[0].data();
      return {
        ...userDoc,
        email: userDoc.email || normalizedEmail,
        appRole: normalizeRole(userDoc.role)
      };
    }

    if (!snapshot2.empty) {
      const userDoc = snapshot2.docs[0].data();
      return {
        ...userDoc,
        email: userDoc.email || normalizedEmail,
        appRole: normalizeRole(userDoc.role)
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

  const emailKeysOf = (u) => {
    const keys = new Set();
    const primary = normEmail(u.email);
    if (primary) keys.add(primary);
    (Array.isArray(u.emails) ? u.emails : []).forEach(e => {
      const k = normEmail(e);
      if (k) keys.add(k);
    });
    return keys;
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
    // Los usuarios principales están en la colección "users"
    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.forEach(docSnap => allUsers.push({ id: docSnap.id, ...docSnap.data() }));

    // Opcional: Agregar QT si se manejan aparte, o si ya están en "users", esto se puede omitir.
    const qtSnap = await getDocs(collection(db, 'qt_directory'));
    qtSnap.forEach(docSnap => {
      const qtData = docSnap.data();
      const candidate = { email: qtData.email, emails: qtData.emails };
      const candidateKeys = emailKeysOf(candidate);
      if (candidateKeys.size > 0 && findExistingIndex(candidateKeys) === -1) {
        allUsers.push({
          id: docSnap.id,
          ...qtData,
          role: qtData.role || 'qt'
        });
      }
    });

  } catch (error) {
    console.error("Error fetching company users:", error);
  }

  // Merge fallback con registro estático local para usuarios que aún no están en Firestore
  usersData.forEach(localUser => {
    const candidateKeys = emailKeysOf(localUser);
    if (candidateKeys.size > 0 && findExistingIndex(candidateKeys) === -1) {
      allUsers.push({ ...localUser, id: localUser.id || localUser.email, source: 'local_registry' });
    }
  });

  return allUsers;
}
