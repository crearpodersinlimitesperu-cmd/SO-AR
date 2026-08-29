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
      if (existingIdx !== -1) {
        allUsers[existingIdx] = withCanonicalEmail({ ...uData, ...allUsers[existingIdx] });
        return;
      }
      allUsers.push(withCanonicalEmail({ id: docSnap.id, ...uData }));
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
          role: qtData.role || 'qt'
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
