import { db } from './firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { usersData, normalizeRole, findUserByAnyEmail, ROLE_DISPLAY_NAMES } from '../data/usersData';
import { DUAL_ROLE_TRAINER_EMAILS } from '../config/permissions';

/**
 * AGENTE SUPERVISOR DE INTEGRIDAD Y COHERENCIA DE ROLES EN LÍNEA (Causa OS Sentinel)
 * 
 * Misión:
 * 1. Garantizar que NINGÚN cargo se colapse erróneamente en "Coordinación Administrativa".
 * 2. Reparar roles alterados, inválidos, perdidos o desincronizados contra el catálogo operativo maestro.
 * 3. Deduplicar y sanitizar el arreglo 'roles' de cada usuario (eliminar null, undefined, student, duplicados).
 * 4. Mantener la coherencia operativa con la estructura real de Sedes y Maestría.
 */

function cleanRoleName(role) {
  if (!role) return '';
  return role.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export async function runRoleIntegrityAuditAndHeal(options = { dryRun: false }) {
  const auditReport = {
    timestamp: new Date().toISOString(),
    totalUsersScanned: 0,
    rolesRepaired: 0,
    duplicatesRemoved: 0,
    healedUsers: [],
    details: [],
    status: 'success'
  };

  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    auditReport.totalUsersScanned = usersSnap.size;

    const batch = writeBatch(db);
    let pendingUpdates = 0;

    usersSnap.forEach(docSnap => {
      const uData = docSnap.data();
      const docId = docSnap.id;
      const email = (uData.email || uData.correo || '').trim().toLowerCase();
      const name = uData.name || uData.displayName || '';

      // Buscar perfil fidedigno en el catálogo oficial de la compañía
      const officialProfile = email ? findUserByAnyEmail(email) : null;
      let targetRole = uData.role;
      let targetRoles = Array.isArray(uData.roles) ? [...uData.roles] : (uData.role ? [uData.role] : []);
      let needsUpdate = false;
      const issues = [];

      // 1. SANEAMIENTO: Eliminar nulos, indefinidos, 'student' y strings vacíos
      const originalRolesCount = targetRoles.length;
      targetRoles = targetRoles
        .map(r => cleanRoleName(r))
        .filter(r => r && r !== 'undefined' && r !== 'null' && r !== 'student');
      
      // Deduplicar
      targetRoles = Array.from(new Set(targetRoles));
      if (targetRoles.length !== originalRolesCount) {
        needsUpdate = true;
        auditReport.duplicatesRemoved++;
        issues.push("Roles duplicados o inválidos depurados");
      }

      // 2. DETECCIÓN DE COLAPSO: Si el rol está en 'coordinador' genérico o alterado
      const rawRole = cleanRoleName(targetRole);
      
      if (officialProfile) {
        const canonicalOfficial = normalizeRole(officialProfile.role);

        // Si en Firestore tiene 'coordinador' pero en el catálogo oficial es coord_c1 o coord_maestria
        if ((rawRole === 'coordinador' || rawRole === 'coordinadora' || rawRole === 'miembro' || rawRole === 'colaborador') && canonicalOfficial !== 'coordinador') {
          targetRole = canonicalOfficial;
          needsUpdate = true;
          issues.push(`Rol alterado/colapsado corregido: '${rawRole}' -> '${canonicalOfficial}' (${ROLE_DISPLAY_NAMES[canonicalOfficial] || canonicalOfficial})`);
        }

        // Asegurar que su rol oficial esté presente en targetRoles
        if (!targetRoles.includes(canonicalOfficial)) {
          targetRoles.push(canonicalOfficial);
          needsUpdate = true;
          issues.push(`Rol oficial inyectado: '${canonicalOfficial}'`);
        }

        // Si tiene un rol de coordinación específico, PURGAR el rol genérico 'coordinador'
        if ((canonicalOfficial === 'coord_c1' || canonicalOfficial === 'coord_maestria' || canonicalOfficial === 'director_maestria') && targetRoles.includes('coordinador')) {
          targetRoles = targetRoles.filter(r => r !== 'coordinador');
          needsUpdate = true;
          issues.push("Rol genérico 'coordinador' purgado para evitar colapso administrativo");
        }

        // Si es coordinador oficial y NO es dual trainer, PURGAR 'entrenador' espurio
        const isDualTrainer = email ? DUAL_ROLE_TRAINER_EMAILS.includes(email.toLowerCase()) : false;
        if (canonicalOfficial === 'coord_c1' || canonicalOfficial === 'coord_maestria' || canonicalOfficial === 'director_maestria') {
          if (!isDualTrainer && targetRoles.includes('entrenador')) {
            targetRoles = targetRoles.filter(r => r !== 'entrenador');
            needsUpdate = true;
            issues.push("Rol 'entrenador' espurio purgado de coordinador");
          }
          if ((!officialProfile.roles || !officialProfile.roles.includes('manager')) && targetRoles.includes('manager')) {
            targetRoles = targetRoles.filter(r => r !== 'manager');
            needsUpdate = true;
            issues.push("Rol 'manager' espurio purgado de coordinador");
          }
        }
      } else {
        // Para usuarios no encontrados en catálogo estático:
        // Si el rol es 'coordinador' y el usuario tiene indicios o pertenece a una sede operativa de C1/C2 o Maestría
        if (rawRole === 'coordinador' || rawRole === 'coordinadora') {
          const notes = (uData.cargo || uData.position || '').toLowerCase();
          if (notes.includes('c1') || notes.includes('c2') || notes.includes('capitulo')) {
            targetRole = 'coord_c1';
            targetRoles = targetRoles.filter(r => r !== 'coordinador').concat('coord_c1');
            needsUpdate = true;
            issues.push("Reclasificado con precisión a 'coord_c1'");
          } else if (notes.includes('maestria') || notes.includes('mj')) {
            targetRole = 'coord_maestria';
            targetRoles = targetRoles.filter(r => r !== 'coordinador').concat('coord_maestria');
            needsUpdate = true;
            issues.push("Reclasificado con precisión a 'coord_maestria'");
          }
        }
      }

      // Si es un manager exclusivo, no debe tener 'coordinador' ni 'entrenador' espurios
      if (targetRoles.includes('manager') && !targetRoles.includes('coord_c1') && !targetRoles.includes('coord_maestria')) {
        if (targetRoles.includes('coordinador')) {
          targetRoles = targetRoles.filter(r => r !== 'coordinador');
          needsUpdate = true;
          issues.push("Removido 'coordinador' espurio de perfil manager");
        }
      }

      if (needsUpdate) {
        auditReport.rolesRepaired++;
        auditReport.healedUsers.push({
          docId,
          name: name || email,
          email,
          previousRole: uData.role,
          repairedRole: targetRole,
          repairedRoles: targetRoles,
          issues
        });

        if (!options.dryRun) {
          batch.update(doc(db, 'users', docId), {
            role: targetRole,
            roles: targetRoles,
            rolesAuditDate: new Date().toISOString()
          });
          pendingUpdates++;
        }
      }
    });

    if (!options.dryRun && pendingUpdates > 0) {
      await batch.commit();
      console.log(`🛡️ [RoleIntegritySentinel] Éxito: ${pendingUpdates} usuarios sanados y actualizados en Firestore.`);
    }

    return auditReport;
  } catch (error) {
    console.error("🛡️ [RoleIntegritySentinel] Error durante la auditoría de roles:", error);
    auditReport.status = 'error';
    auditReport.error = error.message;
    return auditReport;
  }
}