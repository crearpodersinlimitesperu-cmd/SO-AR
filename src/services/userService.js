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
    const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0].data();
      return {
        ...userDoc,
        appRole: normalizeRole(userDoc.role)
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
  try {
    // Los usuarios principales están en la colección "users"
    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.forEach(doc => allUsers.push({ id: doc.id, ...doc.data() }));

    // Opcional: Agregar QT si se manejan aparte, o si ya están en "users", esto se puede omitir.
    // Lo mantenemos por si la migración de QT los puso sólo en qt_directory
    const qtSnap = await getDocs(collection(db, 'qt_directory'));
    qtSnap.forEach(doc => {
      // Evitar duplicados si QT ya está en users
      if (!allUsers.find(u => u.email === doc.data().email)) {
        allUsers.push({ id: doc.id, ...doc.data() });
      }
    });
    
  } catch (error) {
    console.error("Error fetching company users:", error);
  }
  return allUsers;
}
