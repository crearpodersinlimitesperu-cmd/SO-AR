/**
 * src/utils/taskRoleCoherence.js
 * 
 * MOTOR DE AUDITORÍA Y COHERENCIA DE TAREAS Y ROLES DE USUARIOS (CAUSA OS)
 * 
 * Reglas Operativas:
 * 1. Cada tarea debe tener un funcionamiento operativo íntegro (id, título, estado coherente con avance).
 * 2. Las tareas asignadas a usuarios deben ser estrictamente coherentes con su perfil y roles autorizados.
 * 3. Prohibido asignar tareas de gestión o coordinación a roles no autorizados (ej. tarea de Gerente a Voluntario).
 * 4. Las tareas multi-asignadas deben tener coherencia entre assignedToEmails y assigneeProgress.
 * 5. Cero tareas huérfanas (asignadas a correos inexistentes o con dominios erróneos).
 * 6. Privacidad estricta: las tareas personales no deben tener fuga hacia otros usuarios.
 */

import { checklistData } from '../data/checklistData.js';
import { normalizeRole } from '../data/usersData.js';
import { isTaskVisibleForUser, getChecklistRolesForUser } from './taskPrivacy.js';

export const SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO'
};

export const AUDIT_CODES = {
  ROLE_MISMATCH: 'ROLE_MISMATCH',
  ORPHANED_ASSIGNEE: 'ORPHANED_ASSIGNEE',
  CONTRADICTORY_STATUS: 'CONTRADICTORY_STATUS',
  STATUS_PROGRESS_MISMATCH: 'STATUS_PROGRESS_MISMATCH',
  MALFORMED_TASK_SCHEMA: 'MALFORMED_TASK_SCHEMA',
  UNOWNED_CUSTOM_TASK: 'UNOWNED_CUSTOM_TASK',
  MULTI_ASSIGNEE_DESYNC: 'MULTI_ASSIGNEE_DESYNC',
  ZERO_VISIBLE_TASKS: 'ZERO_VISIBLE_TASKS',
  SUSPICIOUS_COMPLETION: 'SUSPICIOUS_COMPLETION',
  EMAIL_DOMAIN_TYPO: 'EMAIL_DOMAIN_TYPO'
};

/**
 * Normaliza un email eliminando espacios y corrigiendo errores tipográficos comunes.
 */
export function normalizeAuditedEmail(value) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().toLowerCase()
    .replace('@crearpls.com', '@crearpsl.net')
    .replace('@crearpls.net', '@crearpsl.net');
}

/**
 * Genera aliases de un email (@crearpsl.net <-> @crearpsl.com).
 */
export function getAuditedEmailAliases(email) {
  const norm = normalizeAuditedEmail(email);
  if (!norm) return [];
  const aliases = new Set([norm]);
  if (norm.endsWith('@crearpsl.net')) {
    aliases.add(norm.replace('@crearpsl.net', '@crearpsl.com'));
  } else if (norm.endsWith('@crearpsl.com')) {
    aliases.add(norm.replace('@crearpsl.com', '@crearpsl.net'));
  }
  return Array.from(aliases);
}

/**
 * Construye un mapa canónico de identidades de usuarios.
 */
export function buildUsersDirectoryMap(users = []) {
  const directory = new Map();

  for (const user of users) {
    if (!user) continue;
    const primaryEmail = normalizeAuditedEmail(user.email || user.correo);
    const emailsList = [
      primaryEmail,
      ...(Array.isArray(user.emails) ? user.emails.map(normalizeAuditedEmail) : [])
    ].filter(Boolean);

    // Expandir con aliases
    const allAliases = emailsList.flatMap(getAuditedEmailAliases);

    // Normalizar roles
    const rawRoles = [
      user.role,
      user.appRole,
      user.activeRole,
      ...(Array.isArray(user.roles) ? user.roles : [])
    ].filter(Boolean);

    const normalizedRoles = new Set(rawRoles.map(r => normalizeRole(r)));
    // Si tiene permisos de superadmin o dirección
    if (user.isSuperAdmin || user.isDireccion || normalizedRoles.has('superadmin') || normalizedRoles.has('direccion') || normalizedRoles.has('ceo') || normalizedRoles.has('cfo') || normalizedRoles.has('cco')) {
      normalizedRoles.add('superadmin');
      normalizedRoles.add('direccion');
    }

    const profileData = {
      uid: user.uid || user.id || primaryEmail,
      name: user.name || user.displayName || user.nombre || 'Usuario',
      email: primaryEmail,
      emails: Array.from(new Set(allAliases)),
      roles: Array.from(normalizedRoles),
      sede: user.sede || user.ciudad || 'Global',
      isActive: user.isActive !== false && user.status !== 'inactive' && !normalizedRoles.has('inactivo'),
      rawUser: user
    };

    for (const alias of allAliases) {
      directory.set(alias, profileData);
    }
    if (profileData.uid) {
      directory.set(profileData.uid, profileData);
    }
  }

  return directory;
}

/**
 * Audita una única tarea contra el directorio de usuarios y el catálogo oficial.
 */
export function auditSingleTask(task, { usersDirectory, catalogMap = new Map() } = {}) {
  const findings = [];
  const taskId = task?.id || 'sin-id';
  const taskTitle = task?.title || task?.task || task?.nombre || 'Tarea sin título';

  // 1. Integridad de Esquema Básico
  if (!task || typeof task !== 'object') {
    return [{
      code: AUDIT_CODES.MALFORMED_TASK_SCHEMA,
      severity: SEVERITY.CRITICAL,
      taskId,
      taskTitle: 'Objeto no válido',
      message: 'La tarea no es un objeto válido.',
      autoFixable: false
    }];
  }

  if (!task.id) {
    findings.push({
      code: AUDIT_CODES.MALFORMED_TASK_SCHEMA,
      severity: SEVERITY.HIGH,
      taskId: 'sin-id',
      taskTitle,
      message: 'La tarea no posee un identificador único (id).',
      autoFixable: false
    });
  }

  if (!task.title && !task.task && !task.nombre) {
    findings.push({
      code: AUDIT_CODES.MALFORMED_TASK_SCHEMA,
      severity: SEVERITY.HIGH,
      taskId,
      taskTitle: 'Sin título',
      message: 'La tarea no posee un título o descripción operativa.',
      autoFixable: false
    });
  }

  // 2. Coherencia de Estado Operativo (Status vs Completed vs Progress)
  const isCompletedFlag = task.completed === true;
  const statusStr = String(task.status || '').trim();
  const progressVal = Number(task.progress ?? task.progressPercentage ?? (isCompletedFlag ? 100 : 0));

  if (isCompletedFlag && statusStr && statusStr !== 'Completada' && statusStr !== 'Completado') {
    findings.push({
      code: AUDIT_CODES.CONTRADICTORY_STATUS,
      severity: SEVERITY.HIGH,
      taskId,
      taskTitle,
      message: `Estado contradictorio: completed=true pero status='${statusStr}'.`,
      suggestedFix: "Actualizar status a 'Completada'.",
      autoFixable: true,
      repair: { status: 'Completada', completed: true }
    });
  }

  if (!isCompletedFlag && (statusStr === 'Completada' || statusStr === 'Completado') && progressVal < 100) {
    findings.push({
      code: AUDIT_CODES.CONTRADICTORY_STATUS,
      severity: SEVERITY.HIGH,
      taskId,
      taskTitle,
      message: `Estado contradictorio: status='Completada' pero completed=false y avance=${progressVal}%.`,
      suggestedFix: "Sincronizar completed=true y progress=100.",
      autoFixable: true,
      repair: { completed: true, progress: 100, progressPercentage: 100 }
    });
  }

  if (progressVal === 100 && !isCompletedFlag && statusStr === 'Pendiente') {
    findings.push({
      code: AUDIT_CODES.STATUS_PROGRESS_MISMATCH,
      severity: SEVERITY.MEDIUM,
      taskId,
      taskTitle,
      message: `Avance al 100% pero la tarea permanece en estado 'Pendiente'.`,
      suggestedFix: "Marcar completed=true y status='Completada'.",
      autoFixable: true,
      repair: { completed: true, status: 'Completada' }
    });
  }

  // 3. Revisión de Asignatarios (Directos y Multi-asignación)
  const directAssignee = task.assignedToEmail || task.assigned_to;
  const multiAssignees = Array.isArray(task.assignedToEmails) ? task.assignedToEmails : [];
  const allAssigneeEmails = [...new Set([
    ...(directAssignee ? [directAssignee] : []),
    ...multiAssignees
  ])].filter(Boolean);

  const taskRole = normalizeRole(task.role || catalogMap.get(taskId)?.role);

  // 4. Verificación de Tarea Personal / Custom
  const isCustom = task.isCustom === true || (typeof task.id === 'string' && task.id.startsWith('custom_'));
  if (isCustom && allAssigneeEmails.length === 0 && !task.ownerId && !task.createdBy) {
    findings.push({
      code: AUDIT_CODES.UNOWNED_CUSTOM_TASK,
      severity: SEVERITY.HIGH,
      taskId,
      taskTitle,
      message: 'Tarea personalizada sin propietario (ownerId/createdBy) ni asignatario directo. Riesgo de fuga o huérfana.',
      autoFixable: false
    });
  }

  // 5. Coherencia de Rol & Perfil para cada Asignatario
  for (const rawEmail of allAssigneeEmails) {
    const emailNorm = normalizeAuditedEmail(rawEmail);

    // Revisar si había typo en el dominio (ej @crearpls.com)
    if (rawEmail.toLowerCase().includes('@crearpls.com')) {
      findings.push({
        code: AUDIT_CODES.EMAIL_DOMAIN_TYPO,
        severity: SEVERITY.MEDIUM,
        taskId,
        taskTitle,
        userEmail: rawEmail,
        message: `Correo asignatario con error tipográfico histórico: '${rawEmail}'.`,
        suggestedFix: `Reemplazar por '${emailNorm}'.`,
        autoFixable: true,
        repair: { replaceEmail: { from: rawEmail, to: emailNorm } }
      });
    }

    const userProfile = usersDirectory.get(emailNorm);

    if (!userProfile) {
      findings.push({
        code: AUDIT_CODES.ORPHANED_ASSIGNEE,
        severity: SEVERITY.HIGH,
        taskId,
        taskTitle,
        userEmail: rawEmail,
        message: `La tarea está asignada a '${rawEmail}', pero no existe en el directorio de colaboradores de Causa OS.`,
        suggestedFix: 'Reasignar la tarea a un colaborador activo o retirar la asignación.',
        autoFixable: false
      });
      continue;
    }

    // Verificar si el rol de la tarea es coherente con el perfil del usuario
    if (taskRole && taskRole !== 'miembro' && taskRole !== 'colaborador' && taskRole !== 'coordinador') {
      const isSuperAdminOrDireccion = userProfile.roles.includes('superadmin') || userProfile.roles.includes('direccion');

      // Si el usuario no tiene el rol de la tarea ni es dirección/superadmin
      if (!isSuperAdminOrDireccion && !userProfile.roles.includes(taskRole)) {
        // Excepciones operativas conocidas (ej. coordinadores C1/C2 cubriendo rol coord_c1 o gerentes supervisando)
        const isCoordCovered = (taskRole === 'coord_c1' || taskRole === 'coord_c2') && userProfile.roles.includes('coord_c1');
        const isTrainerCovered = (taskRole === 'entrenador' || taskRole === 'entrenador_llamadas') && (userProfile.roles.includes('entrenador') || userProfile.roles.includes('entrenador_llamadas'));

        if (!isCoordCovered && !isTrainerCovered) {
          findings.push({
            code: AUDIT_CODES.ROLE_MISMATCH,
            severity: SEVERITY.HIGH,
            taskId,
            taskTitle,
            userEmail: userProfile.email,
            userName: userProfile.name,
            message: `Incoherencia de Rol: La tarea requiere rol '${taskRole}', pero el usuario '${userProfile.name}' solo posee roles [${userProfile.roles.join(', ')}].`,
            suggestedFix: `Verificar perfil de '${userProfile.name}' o reasignar la tarea al rol '${taskRole}' correspondiente.`,
            autoFixable: false
          });
        }
      }
    }
  }

  // 6. Coherencia en multi-asignación (assigneeProgress vs assignedToEmails)
  if (multiAssignees.length > 0 && task.assigneeProgress) {
    const progressKeys = Object.keys(task.assigneeProgress).map(normalizeAuditedEmail);
    const missingKeys = multiAssignees
      .map(normalizeAuditedEmail)
      .filter(email => !progressKeys.includes(email));

    if (missingKeys.length > 0) {
      findings.push({
        code: AUDIT_CODES.MULTI_ASSIGNEE_DESYNC,
        severity: SEVERITY.LOW,
        taskId,
        taskTitle,
        message: `Asignatarios en 'assignedToEmails' sin registro inicial en 'assigneeProgress': [${missingKeys.join(', ')}].`,
        suggestedFix: 'Inicializar estados de avance para todos los asignatarios.',
        autoFixable: true
      });
    }
  }

  return findings;
}

/**
 * Auditoría Global de Coherencia de Tareas y Roles.
 */
export function auditTaskRoleCoherence({
  users = [],
  tasks = [],
  catalog = checklistData,
  options = {}
} = {}) {
  const usersDirectory = buildUsersDirectoryMap(users);
  const catalogMap = new Map((catalog || []).map(t => [t.id, t]));

  const allFindings = [];
  let compliantTasksCount = 0;
  let incoherentTasksCount = 0;
  let brokenTasksCount = 0;

  // 1. Auditar cada tarea
  for (const task of tasks) {
    const taskFindings = auditSingleTask(task, { usersDirectory, catalogMap });
    if (taskFindings.length === 0) {
      compliantTasksCount++;
    } else {
      allFindings.push(...taskFindings);
      if (taskFindings.some(f => f.severity === SEVERITY.CRITICAL || f.code === AUDIT_CODES.MALFORMED_TASK_SCHEMA)) {
        brokenTasksCount++;
      } else {
        incoherentTasksCount++;
      }
    }
  }

  // 2. Cobertura de Tareas por Rol Operativo
  // Verifica que usuarios en roles operativos clave tengan al menos tareas de catálogo accesibles
  const uniqueUsers = Array.from(new Set(Array.from(usersDirectory.values()).map(u => u.email)))
    .map(email => usersDirectory.get(email))
    .filter(u => u && u.isActive);

  const operationalRoles = ['gerente', 'coord_c1', 'coord_maestria', 'capitan', 'qt', 'entrenador', 'director_maestria'];

  for (const user of uniqueUsers) {
    const hasOpRole = user.roles.some(r => operationalRoles.includes(r));
    if (!hasOpRole) continue;

    const visibleTasks = (catalog || []).filter(task => isTaskVisibleForUser(task, user.rawUser || user));
    if (visibleTasks.length === 0) {
      allFindings.push({
        code: AUDIT_CODES.ZERO_VISIBLE_TASKS,
        severity: SEVERITY.MEDIUM,
        taskId: 'N/A',
        taskTitle: 'Cobertura de Tareas Operativas',
        userEmail: user.email,
        userName: user.name,
        message: `El usuario activo '${user.name}' tiene rol operativo [${user.roles.join(', ')}], pero no tiene ninguna tarea de catálogo visible.`,
        suggestedFix: 'Revisar roles del usuario en staff_directory y permisos de checklistData.'
      });
    }
  }

  // 3. Cálculo de Puntuación de Salud (Score 0-100)
  const totalTasks = tasks.length || 1;
  const criticalCount = allFindings.filter(f => f.severity === SEVERITY.CRITICAL).length;
  const highCount = allFindings.filter(f => f.severity === SEVERITY.HIGH).length;
  const mediumCount = allFindings.filter(f => f.severity === SEVERITY.MEDIUM).length;

  const deductions = (criticalCount * 15) + (highCount * 5) + (mediumCount * 2);
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - (deductions / totalTasks * 100))));

  return {
    timestamp: new Date().toISOString(),
    totalTasksAudited: tasks.length,
    totalUsersAudited: uniqueUsers.length,
    compliantTasksCount,
    incoherentTasksCount,
    brokenTasksCount,
    healthScore,
    status: healthScore >= 90 ? 'HEALTHY' : healthScore >= 70 ? 'WARNING' : 'CRITICAL',
    findingsCount: allFindings.length,
    findingsSummary: {
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: allFindings.filter(f => f.severity === SEVERITY.LOW || f.severity === SEVERITY.INFO).length
    },
    findings: allFindings
  };
}
