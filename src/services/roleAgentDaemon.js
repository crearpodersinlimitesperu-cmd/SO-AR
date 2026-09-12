import { db } from './firebase';
import { doc, getDocs, collection, updateDoc } from 'firebase/firestore';
import { findUserByAnyEmail, normalizeRole } from '../data/usersData';
import { DUAL_ROLE_TRAINER_EMAILS } from '../config/permissions';

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
 * 3. Aislamiento territorial: No cruza roles entre distintas sedes por coincidencia parcial de nombres.
 * 4. Sanitización activa: Elimina duplicados, valores inválidos (null, undefined, student) y roles espurios.
 * 5. Preserva multi-perfiles reales autorizados (ej. coordinador + entrenador) con roles específicos.
 */
export async function enforceUserRolesAgent(firebaseUser, userDocId, currentRoles) {
  if (!firebaseUser || !userDocId) return currentRoles;

  try {
    const rawEmail = (firebaseUser.email || '').trim().toLowerCase();
    const userEmail = normalizeString(rawEmail);
    const userName = normalizeString(firebaseUser.displayName);

    // 0. Respaldo contra el Catálogo Oficial Corporativo (fuente primaria de verdad)
    const staticProfile = findUserByAnyEmail(rawEmail);
    const userSede = normalizeString(staticProfile?.sede || firebaseUser.sede || '');
    const isDualTrainer = DUAL_ROLE_TRAINER_EMAILS.includes(rawEmail);
    const isOfficialCoordinator = Boolean(
      staticProfile && ['coord_c1', 'coord_maestria', 'director_maestria'].includes(normalizeRole(staticProfile.role))
    );

    // Iniciar con roles actuales válidos
    const discoveredRoles = new Set(
      (currentRoles || [])
        .map(r => (r ? r.toString().trim().toLowerCase() : ''))
        .filter(r => r && r !== 'undefined' && r !== 'null' && r !== 'student')
    );

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

    // 1. Escanear Directorio de Managers y Equipos con Idoneidad Estricta y Aislamiento Territorial
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
      const mSede = normalizeString(data.sede);

      // Coincidencia segura: debe coincidir correo corporativo exacto O (nombre exacto Y sede territorial exacta)
      const emailMatches = Boolean(userEmail && mEmail && userEmail === mEmail);
      const nameAndSedeMatches = Boolean(
        userName && mName && userName === mName &&
        userSede && mSede && userSede === mSede
      );
      const isLegitimatePerson = emailMatches || nameAndSedeMatches;

      if (isLegitimatePerson) {
        // Un coordinador oficial cerrado de sede NO puede recibir rol de manager por base externa
        if (!isOfficialCoordinator || (staticProfile?.roles && staticProfile.roles.includes('manager'))) {
          isManagerInDB = true;
          if (data.rol) {
            discoveredRoles.add(data.rol.toLowerCase().trim());
          } else {
            discoveredRoles.add('manager');
          }
        }
      }

      // Entrenador del equipo: solo si coincide correo exacto O (nombre exacto Y misma sede)
      const trainerMatches = Boolean(
        userName && mEntrenador && userName === mEntrenador &&
        (!userSede || !mSede || userSede === mSede)
      );
      if (trainerMatches && (isDualTrainer || !isOfficialCoordinator)) {
        isTrainerInDB = true;
        discoveredRoles.add('entrenador');
      }

      // Coordinador del equipo
      const coordMatches = Boolean(
        userName && mCoord && userName === mCoord &&
        (!userSede || !mSede || userSede === mSede)
      );
      if (coordMatches) {
        isCoordInDB = true;
      }
    });

    // Si aparece legítimamente como coordinador en algún equipo, asignar el cargo específico (NO el genérico 'coordinador')
    if (isCoordInDB) {
      if (staticProfile?.role) {
        discoveredRoles.add(normalizeRole(staticProfile.role));
      } else {
        discoveredRoles.add('coord_maestria');
      }
    }

    // 2. Escanear Directorio QT con Validación Estricta
    const qtSnap = await getDocs(collection(db, 'qt_directory'));
    qtSnap.forEach(docSnap => {
      const data = docSnap.data();
      const qName = normalizeString(data.nombre);
      const qEmail = normalizeString(data.email);
      const qSede = normalizeString(data.sede);

      const qtEmailMatches = Boolean(userEmail && qEmail && userEmail === qEmail);
      const qtNameAndSedeMatches = Boolean(
        userName && qName && userName === qName &&
        userSede && qSede && userSede === qSede
      );

      if (qtEmailMatches || qtNameAndSedeMatches) {
        // Solo agregar 'qt' si el usuario no es un coordinador exclusivo de sede
        if (!isOfficialCoordinator || (staticProfile?.roles && staticProfile.roles.includes('qt'))) {
          discoveredRoles.add('qt');
          if (data.rol) discoveredRoles.add(normalizeRole(data.rol));
        }
      }
    });

    // 3. PURGA Y SANITIZACIÓN CONTRA COLAPSO DE ROLES:
    // Purgar categóricamente el rol administrativo genérico 'coordinador' para cualquier coordinador operativo o corporativo
    const hasOperationalRole = discoveredRoles.has('coord_c1') || 
                               discoveredRoles.has('coord_maestria') || 
                               discoveredRoles.has('director_maestria') || 
                               discoveredRoles.has('gerente') || 
                               discoveredRoles.has('cfo') || 
                               discoveredRoles.has('direccion');
    
    if (hasOperationalRole || (isManagerInDB && !isCoordInDB)) {
      discoveredRoles.delete('coordinador');
    }

    // Purgar falsos positivos de 'manager' y 'entrenador' en coordinadores oficiales de sede
    if (isOfficialCoordinator) {
      if (!isDualTrainer && (!staticProfile.roles || !staticProfile.roles.includes('entrenador'))) {
        discoveredRoles.delete('entrenador');
      }
      if (!staticProfile.roles || !staticProfile.roles.includes('manager')) {
        discoveredRoles.delete('manager');
      }
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

