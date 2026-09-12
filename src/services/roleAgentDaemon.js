import { db } from './firebase';
import { doc, getDocs, collection, updateDoc } from 'firebase/firestore';
import { findUserByAnyEmail, normalizeRole } from '../data/usersData';

function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/**
 * Agente en línea de Causa OS para Integridad de Roles.
 * Se ejecuta en cada inicio de sesión y audita la coherencia operativa.
 * Garantiza:
 * 1. Cero colapso de cargos: No inyecta 'coordinador' genérico si la persona es coord_c1, coord_maestria o manager.
 * 2. Cero falsos positivos: Los managers no son marcados como entrenadores o coordinadores por error de homonimia.
 * 3. Sanitización activa: Elimina duplicados, valores inválidos (null, undefined, student) y roles espurios.
 * 4. Preserva multi-perfiles reales (ej. coordinador + entrenador) con roles específicos.
 */
export async function enforceUserRolesAgent(firebaseUser, userDocId, currentRoles) {
  if (!firebaseUser || !userDocId) return currentRoles;

  try {
    const rawEmail = (firebaseUser.email || '').trim().toLowerCase();
    const userEmail = normalizeString(rawEmail);
    const userName = normalizeString(firebaseUser.displayName);

    // Iniciar con roles actuales válidos
    const discoveredRoles = new Set(
      (currentRoles || [])
        .map(r => (r ? r.toString().trim().toLowerCase() : ''))
        .filter(r => r && r !== 'undefined' && r !== 'null' && r !== 'student')
    );

    // 0. Respaldo contra el Catálogo Oficial Corporativo
    const staticProfile = findUserByAnyEmail(rawEmail);
    if (staticProfile) {
      if (staticProfile.role) {
        discoveredRoles.add(normalizeRole(staticProfile.role));
      }
      if (Array.isArray(staticProfile.roles)) {
        staticProfile.roles.forEach(r => {
          if (r) discoveredRoles.add(normalizeRole(r));
        });
      }
    }

    // 1. Escanear Directorio de Managers y Equipos con Idoneidad Estricta
    const managersSnap = await getDocs(collection(db, 'managers_directory'));
    let isManagerInDB = false;
    let isTrainerInDB = false;
    let isCoordInDB = false;

    managersSnap.forEach(docSnap => {
      const data = docSnap.data();
      const mName = normalizeString(data.nombre);
      const mEmail = normalizeString(data.email);
      const mEntrenador = normalizeString(data.entrenador);
      const mCoord = normalizeString(data.coordinador);

      // Si el usuario es manager en la BD (coincidencia por correo O por nombre exacto si tiene nombre)
      if ((userEmail && mEmail === userEmail) || (userName && mName && mName === userName)) {
        isManagerInDB = true;
        if (data.rol) {
          discoveredRoles.add(data.rol.toLowerCase().trim());
        } else {
          discoveredRoles.add('manager');
        }
      }

      // Si el usuario aparece legítimamente como Entrenador del equipo (¡SOLO comparando con mEntrenador!)
      if (userName && mEntrenador && mEntrenador === userName) {
        isTrainerInDB = true;
        discoveredRoles.add('entrenador');
      }

      // Si el usuario aparece legítimamente como Coordinador del equipo (¡SOLO comparando con mCoord!)
      if (userName && mCoord && mCoord === userName) {
        isCoordInDB = true;
      }
    });

    // Si aparece como coordinador en algún equipo, asignar el cargo específico (NO el genérico 'coordinador')
    if (isCoordInDB) {
      if (staticProfile?.role) {
        discoveredRoles.add(normalizeRole(staticProfile.role));
      } else {
        // Por defecto en Nodus los equipos operativos corresponden a Maestría o C1/C2
        discoveredRoles.add('coord_maestria');
      }
    }

    // 2. Escanear Directorio QT
    const qtSnap = await getDocs(collection(db, 'qt_directory'));
    qtSnap.forEach(docSnap => {
      const data = docSnap.data();
      const qName = normalizeString(data.nombre);
      const qEmail = normalizeString(data.email);

      if ((userEmail && qEmail === userEmail) || (userName && qName && qName === userName)) {
        discoveredRoles.add('qt');
        if (data.rol) discoveredRoles.add(normalizeRole(data.rol));
      }
    });

    // 3. PURGA Y SANITIZACIÓN:
    // Si la persona tiene un rol específico de coordinación (coord_c1, coord_maestria, director_maestria)
    // O si es solo un manager, ELIMINAR el rol genérico 'coordinador' para evitar que se colapse en Coordinación Administrativa
    const hasSpecificCoordRole = discoveredRoles.has('coord_c1') || discoveredRoles.has('coord_maestria') || discoveredRoles.has('director_maestria');
    if (hasSpecificCoordRole || (isManagerInDB && !isCoordInDB && !hasSpecificCoordRole)) {
      discoveredRoles.delete('coordinador');
    }

    // Convertir a lista canónica deduplicada
    const cleanedRoles = Array.from(discoveredRoles).filter(r => r && r !== 'undefined' && r !== 'null' && r !== 'student');

    // Determinar si hay diferencias con los roles que estaban en base de datos
    const currentSorted = (currentRoles || []).slice().sort().join(',');
    const newSorted = cleanedRoles.slice().sort().join(',');

    if (currentSorted !== newSorted) {
      console.log(`🛡️ [RoleIntegrityAgent] Roles sanados y coherentes para ${userEmail || userName}:`, cleanedRoles);
      await updateDoc(doc(db, 'users', userDocId), {
        roles: cleanedRoles
      });
      return cleanedRoles;
    }

    return currentRoles;
  } catch (error) {
    console.error("🛡️ [RoleIntegrityAgent] Error validando integridad de roles:", error);
    return currentRoles;
  }
}

