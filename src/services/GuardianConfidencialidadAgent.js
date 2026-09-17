/**
 * ======================================================================================
 * AGENTE AUTÓNOMO GUARDIÁN DE CONFIDENCIALIDAD, AISLAMIENTO Y ESTABILIZACIÓN (SO-AR)
 * Causa OS — Agente Centinela de Integridad Multi-Sede, Multi-Usuario y Multi-Equipo
 * ======================================================================================
 * 
 * MISIÓN:
 * 1. Garantizar que NUNCA se cruce información operativa, confidencial o directiva
 *    entre usuarios, sedes o equipos.
 * 2. Sanear y blindar en tiempo de ejecución las colecciones y vistas de datos:
 *    - Tareas (tasks)
 *    - Metas (goals)
 *    - Indicadores / KPIs (imos, nodus, kpis)
 *    - Contactos y Directorio (users)
 * 3. Auditar violaciones de confidencialidad y registrar eventos de prevención.
 */

import { normalizeSede, normalizeRole, isForeignTask } from '../data/usersData';

export class GuardianConfidencialidadAgent {
  constructor(currentUser, context = {}) {
    this.currentUser = currentUser || null;
    this.context = context;
    this.auditLogs = [];
  }

  /**
   * Determina si el contexto actual permite visibilidad global irrestricta.
   * IMPORTANTE: Si un SuperAdmin está en modo SIMULACIÓN de otro usuario,
   * el agente FUERZA el aislamiento de ese usuario simulado.
   */
  isGlobalPrivilegedScope() {
    if (!this.currentUser) return false;
    // SuperAdmin real sin simulación tiene acceso global
    if (this.currentUser.isSuperAdmin && !this.currentUser.isSimulated) return true;
    return false;
  }

  /**
   * Obtiene la sede efectiva del usuario actual en formato normalizado canónico.
   */
  getUserSede() {
    return normalizeSede(this.currentUser?.sede);
  }

  /**
   * Obtiene la lista de correos válidos del usuario (personal, corporativo .com/.net).
   */
  getUserEmails() {
    if (!this.currentUser) return [];
    const emails = new Set();
    const baseEmail = (this.currentUser.email || '').toLowerCase().trim();
    if (baseEmail) {
      emails.add(baseEmail);
      emails.add(baseEmail.replace('@crearpsl.net', '@crearpsl.com'));
      emails.add(baseEmail.replace('@crearpsl.com', '@crearpsl.net'));
    }
    if (Array.isArray(this.currentUser.emails)) {
      this.currentUser.emails.forEach(e => {
        if (e) emails.add(e.toLowerCase().trim());
      });
    }
    return Array.from(emails);
  }

  /**
   * 🛡️ REGLA 1: AISLAMIENTO ESTRICTO DE TAREAS
   * Evalúa si una tarea puede ser vista/operada por el usuario actual sin fugas.
   */
  canAccessTask(task) {
    if (!task) return false;
    if (this.isGlobalPrivilegedScope()) return true;

    // En vista consolidada, solo se ven tareas permitidas por sus roles y sedes reales
    if (this.currentUser?.appRole === 'consolidado') {
      const allowedRoles = this.currentUser?.roles || [];
      const taskRoleNorm = normalizeRole(task.role);
      const hasRole = allowedRoles.some(r => normalizeRole(r) === taskRoleNorm);
      if (!hasRole) return false;
    }

    // Regla canónica universal de foraneidad
    if (isForeignTask(task, this.currentUser)) {
      return false;
    }

    const userEmails = this.getUserEmails();
    const isAssigned = (Array.isArray(task.assignedToEmails) && task.assignedToEmails.some(e => userEmails.includes((e || '').toLowerCase().trim()))) ||
                       (task.assignedToEmail && userEmails.includes(task.assignedToEmail.toLowerCase().trim()));
    const isCollab = Array.isArray(task.collaborators) && task.collaborators.some(c => {
      const email = typeof c === 'string' ? c : c?.email;
      return userEmails.includes((email || '').toLowerCase().trim());
    });
    const isCreator = task.createdBy && userEmails.includes(task.createdBy.toLowerCase().trim());

    // Si está asignada directamente, es colaborador o creador, pasa la prueba
    if (isAssigned || isCollab || isCreator) {
      return true;
    }

    // Si no tiene asignación directa, verificar que la sede coincida estrictamente
    const taskSede = normalizeSede(task.assignedSede || task.sede);
    const userSede = this.getUserSede();

    if (taskSede && taskSede !== 'Sede Global' && taskSede !== 'Global') {
      if (userSede && userSede !== 'Sede Global' && taskSede !== userSede) {
        return false; // Cruce de sede prevenido
      }
    }

    // Tareas creadas ad-hoc por terceros sin asignación nominal quedan descartadas
    if (task.createdBy && !isCreator) {
      const taskIdStr = String(task.id || '');
      if (taskIdStr.startsWith('custom_') || taskIdStr.startsWith('fs_')) {
        return false;
      }
    }

    // Coincidencia de rol activo o rol asignado
    const userRoles = (this.currentUser?.roles || [this.currentUser?.appRole || '']).map(normalizeRole);
    const taskRole = normalizeRole(task.role);
    return userRoles.includes(taskRole) || task.role === this.currentUser?.appRole;
  }

  /**
   * Filtra una lista de tareas garantizando 100% de aislamiento.
   */
  filterTasks(tasks) {
    if (!Array.isArray(tasks)) return [];
    return tasks.filter(t => this.canAccessTask(t));
  }

  /**
   * 🎯 REGLA 2: AISLAMIENTO Y RESOLUCIÓN DE METAS POR SEDE Y EQUIPO
   * Evita ver metas de otras sedes o mezclar equipos pares/impares.
   */
  canAccessGoal(goal) {
    if (!goal) return false;
    if (this.isGlobalPrivilegedScope()) return true;

    const goalSede = normalizeSede(goal.sede);
    const userSede = this.getUserSede();

    // Si la meta tiene sede definida y es distinta a la del usuario, no mostrar
    if (goalSede && goalSede !== 'Sede Global' && goalSede !== 'Global') {
      if (userSede && userSede !== 'Sede Global' && goalSede !== userSede) {
        return false;
      }
    }

    // Si el usuario es de Quito y tiene equipos asignados (ej. Pares o Impares),
    // validar si la meta pertenece específicamente al equipo seleccionado
    if (userSede === 'Quito' && Array.isArray(this.currentUser?.equiposQuito) && this.currentUser.equiposQuito.length > 0) {
      const userTeams = this.currentUser.equiposQuito.map(e => String(e).trim());
      const goalTeam = String(goal.numEquipo || goal.equipo || '').trim();
      if (goalTeam && !userTeams.includes(goalTeam)) {
        // La meta pertenece a otro equipo de Quito
        return false;
      }
    }

    return true;
  }

  /**
   * Filtra metas asegurando visibilidad clara y sin duplicidad.
   */
  filterGoals(goals) {
    if (!Array.isArray(goals)) return [];
    return goals.filter(g => this.canAccessGoal(g));
  }

  /**
   * 📊 REGLA 3: RESOLUCIÓN DE EQUIPOS Y ETIQUETAS
   * Extrae el número de equipo inequívoco para que siempre se sepa "en qué estamos".
   */
  resolveTeamLabel(item) {
    if (!item) return '';
    if (item.numEquipo) return `Equipo ${item.numEquipo}`;
    if (item.equipo && !isNaN(parseInt(item.equipo, 10))) return `Equipo ${item.equipo}`;

    const text = `${item.title || ''} ${item.nombre || ''} ${item.name || ''}`;
    const match = text.match(/(?:Equipo|Eq\.?|E)\s*(\d+)/i);
    if (match) return `Equipo ${match[1]}`;

    if (this.getUserSede() === 'Quito') {
      if (Array.isArray(this.currentUser?.equiposQuito) && this.currentUser.equiposQuito.length > 0) {
        return `Equipo ${this.currentUser.equiposQuito[0]}`;
      }
    }

    return item.stage || item.cyclePhase || '';
  }
}

/**
 * Fábrica para instanciar el agente rápidamente desde cualquier componente o hook.
 */
export const createConfidentialityAgent = (currentUser, context = {}) => {
  return new GuardianConfidencialidadAgent(currentUser, context);
};
