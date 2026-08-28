import { db } from './firebase';
import { doc, getDocs, collection, updateDoc, arrayUnion } from 'firebase/firestore';

function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/**
 * Agente en línea de Causa OS.
 * Se ejecuta cada vez que un usuario inicia sesión.
 * Escanea toda la plataforma (Directorio QT, Managers, etc.) para encontrar todos los cargos
 * que ocupa esta persona y le inyecta los permisos "multi-rol" automáticamente si le faltan.
 * ¡Elimina para siempre la necesidad de listas blancas de código (hardcoded)!
 */
export async function enforceUserRolesAgent(firebaseUser, userDocId, currentRoles) {
  if (!firebaseUser || !userDocId) return;

  try {
    const userEmail = normalizeString(firebaseUser.email);
    const userName = normalizeString(firebaseUser.displayName);
    const discoveredRoles = new Set(currentRoles || []);

    // 1. Escanear Directorio de Managers y Equipos
    const managersSnap = await getDocs(collection(db, 'managers_directory'));
    managersSnap.forEach(docSnap => {
      const data = docSnap.data();
      const mName = normalizeString(data.nombre);
      const mEmail = normalizeString(data.email);
      const mEntrenador = normalizeString(data.entrenador);
      const mCoord = normalizeString(data.coordinador);

      // Si el usuario es manager en la BD
      if (mEmail === userEmail || (userName && mName === userName)) {
        if (data.rol) discoveredRoles.add(data.rol.toLowerCase());
      }
      
      // Si el usuario aparece como Entrenador de algún equipo
      if ((mName && mName === userName) || (userName && mEntrenador === userName)) {
         discoveredRoles.add('entrenador');
      }

      // Si el usuario aparece como Coordinador de algún equipo
      if ((mName && mName === userName) || (userName && mCoord === userName)) {
         discoveredRoles.add('coordinador');
      }
    });

    // 2. Escanear Directorio QT
    const qtSnap = await getDocs(collection(db, 'qt_directory'));
    qtSnap.forEach(docSnap => {
      const data = docSnap.data();
      const qName = normalizeString(data.nombre);
      const qEmail = normalizeString(data.email);
      
      if (qEmail === userEmail || (userName && qName === userName)) {
         discoveredRoles.add('qt');
         if (data.rol) discoveredRoles.add(data.rol.toLowerCase());
      }
    });

    // Validar si descubrimos roles nuevos que no estaban en la base de datos
    let hasNewRoles = false;
    const currentRolesNormalized = (currentRoles || []).map(r => r.toLowerCase());
    
    discoveredRoles.forEach(r => {
       if (!currentRolesNormalized.includes(r) && r !== '' && r !== 'undefined' && r !== 'null') {
           hasNewRoles = true;
       }
    });

    if (hasNewRoles) {
       console.log("🕵️‍♂️ [Causa OS Agent] Nuevos roles multi-perfil detectados para el usuario. Actualizando DB...", Array.from(discoveredRoles));
       await updateDoc(doc(db, 'users', userDocId), {
           roles: arrayUnion(...Array.from(discoveredRoles))
       });
       return Array.from(discoveredRoles); // Devolvemos los roles actualizados
    }

    return currentRoles; // Sin cambios
  } catch (error) {
    console.error("🕵️‍♂️ [Causa OS Agent] Error revisando autorizaciones:", error);
    return currentRoles;
  }
}
