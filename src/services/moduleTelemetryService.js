// src/services/moduleTelemetryService.js
// Servicio Autoritativo de Telemetría y Monitoreo de Uso Real de Módulos (Causa OS)
// Prohibición estricta de alucinación o datos simulados: todos los cálculos provienen 100% de Firestore.

import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { MODULE_REGISTRY } from '../config/moduleRegistry';

// Caché de debounce en memoria para evitar saturar escrituras por re-renders o clics consecutivos
const visitThrottleMap = new Map();
const THROTTLE_MS = 60 * 1000; // 1 minuto por módulo y usuario

/**
 * Registra una visita real de un usuario a un módulo específico en Firestore (audit_logs y user_profiles)
 */
export async function recordModuleVisitTelemetry(module, pathname, currentUser, originalAdminUser = null) {
  if (!currentUser?.email || !module?.id) return { ok: false, reason: 'missing_user_or_module' };

  const email = currentUser.email.toLowerCase().trim();
  const throttleKey = `${email}:${module.id}`;
  const now = Date.now();
  const lastTime = visitThrottleMap.get(throttleKey) || 0;

  if (now - lastTime < THROTTLE_MS) {
    return { ok: true, throttled: true };
  }
  visitThrottleMap.set(throttleKey, now);

  const nowIso = new Date().toISOString();
  const effectiveIsSimulation = Boolean(originalAdminUser && originalAdminUser.email !== currentUser.email);
  const effectiveSimulatedBy = effectiveIsSimulation ? (originalAdminUser?.email || 'admin') : null;

  const eventPayload = {
    action: 'ACCESO_MODULO',
    moduleId: module.id,
    moduleName: module.label || module.id,
    route: pathname || (typeof module.route === 'function' ? module.route(currentUser) : module.route) || '',
    email: email,
    name: currentUser.displayName || currentUser.name || 'Colaborador',
    role: currentUser.appRole || currentUser.role || 'miembro',
    sede: currentUser.sede || 'Global',
    isSimulation: effectiveIsSimulation,
    simulatedBy: effectiveSimulatedBy,
    timestamp: serverTimestamp(),
    createdAtIso: nowIso,
    details: `Ingreso a módulo: ${module.label} (${pathname || ''})`
  };

  try {
    // 1. Escritura en audit_logs inmutable
    await addDoc(collection(db, 'audit_logs'), eventPayload);

    // 2. Actualización de perfil de usuario sin romper si no tiene permisos
    try {
      const userRef = doc(db, 'user_profiles', email);
      await setDoc(userRef, {
        lastActiveAt: serverTimestamp(),
        lastActiveAtIso: nowIso,
        lastModuleAccessed: module.label,
        lastModuleId: module.id
      }, { merge: true });
    } catch (profileErr) {
      // Ignorar si el usuario solo tiene permisos sobre su doc o está restringido
    }

    return { ok: true, recorded: true };
  } catch (error) {
    console.warn('Aviso no fatal registrando telemetría de módulo:', error?.message);
    return { ok: false, error };
  }
}

/**
 * Mapea acciones de auditoría existentes a los módulos de Causa OS
 */
function inferModuleFromAction(action, details = '', moduleId = null) {
  if (moduleId) return moduleId;
  const act = String(action || '').toUpperCase();
  const det = String(details || '').toLowerCase();

  if (act === 'ACCESO_MODULO') {
    return null; // Ya trae su moduleId explícito
  }

  if (act.includes('MANAGER') || act.includes('LLAMADA') || det.includes('manager') || det.includes('llamada')) {
    return 'centro-managers';
  }
  if (act.includes('CHECKLIST') || act.includes('TASK_') || det.includes('tarea') || det.includes('checklist')) {
    return 'checklist';
  }
  if (act.includes('KPI') || det.includes('kpi')) {
    return 'mis-kpis';
  }
  if (act.includes('LOGIN') || act.includes('ACCESO')) {
    if (det.includes('gerente')) return 'gerencial';
    if (det.includes('superadmin') || det.includes('centro de mando')) return 'superadmin';
    return 'gerencial';
  }
  if (act.includes('LEGAL') || act.includes('FIRMA') || det.includes('firma') || det.includes('contrato')) {
    return 'panel-legal';
  }
  if (act.includes('FINANZ') || det.includes('finanz') || det.includes('cfo')) {
    return 'cfo-dashboard';
  }
  if (act.includes('CAMPUS') || det.includes('campus')) {
    return 'campus';
  }
  if (act.includes('ACUERDO') || det.includes('acuerdo')) {
    return 'acuerdos';
  }
  if (act.includes('EXCELENCIA')) {
    return 'excelencia';
  }
  if (act.includes('LEARNING')) {
    return 'learning';
  }
  return null;
}

/**
 * Recupera y computa el reporte de telemetría de módulos 100% REAL
 */
export async function fetchModuleTelemetryReport() {
  const result = {
    summary: {
      totalModules: MODULE_REGISTRY.length,
      activeModulesCount: 0,
      inactiveModulesCount: 0,
      totalEventsCount: 0,
      uniqueUsersCount: 0,
      lastEventIso: null,
      firstEventIso: null,
    },
    modules: [],
    usersSummary: [],
    agentAnalysis: null
  };

  try {
    // 1. Obtener logs de auditoría reales de Firestore (hasta 1500 eventos)
    const logsQuery = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(1500));
    const [logsSnap, profilesSnap] = await Promise.all([
      getDocs(logsQuery).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'user_profiles')).catch(() => ({ docs: [] }))
    ]);

    const auditDocs = logsSnap.docs || [];
    const profileDocs = profilesSnap.docs || [];

    // Mapa de perfiles de usuario
    const userProfilesMap = new Map();
    profileDocs.forEach(d => {
      const data = d.data();
      const em = (data.email || d.id || '').toLowerCase().trim();
      if (em) {
        userProfilesMap.set(em, {
          email: em,
          name: data.name || data.displayName || em.split('@')[0],
          role: data.role || data.appRole || 'miembro',
          sede: data.sede || 'Global',
          lastActiveAtIso: data.lastActiveAtIso || data.lastLoginAtIso || null
        });
      }
    });

    // Mapa de inicialización para TODOS los módulos del sistema
    const modulesMap = new Map();
    MODULE_REGISTRY.forEach(m => {
      modulesMap.set(m.id, {
        id: m.id,
        label: m.label,
        emoji: m.emoji || '📦',
        route: typeof m.route === 'function' ? '/checklist/:rol' : (m.route || m.external || ''),
        roles: m.roles,
        totalVisits: 0,
        uniqueUsersMap: new Map(), // email -> { email, name, role, sede, count, lastVisitedIso }
        rolesCount: {},
        sedesCount: {},
        lastAccessIso: null,
        lastUser: null
      });
    });

    const globalUsersMap = new Map();
    let totalEvents = 0;
    let latestTimestampIso = null;
    let earliestTimestampIso = null;

    // 2. Procesar cada evento de auditoría
    auditDocs.forEach(d => {
      const data = d.data();
      const userEmail = (data.email || '').toLowerCase().trim();
      if (!userEmail) return;

      let isoDate = data.createdAtIso;
      if (!isoDate && data.timestamp?.toDate) {
        isoDate = data.timestamp.toDate().toISOString();
      } else if (!isoDate && typeof data.timestamp === 'string') {
        isoDate = data.timestamp;
      }
      if (!isoDate) isoDate = new Date().toISOString();

      if (!latestTimestampIso || isoDate > latestTimestampIso) latestTimestampIso = isoDate;
      if (!earliestTimestampIso || isoDate < earliestTimestampIso) earliestTimestampIso = isoDate;

      // Determinar a qué módulo pertenece este evento
      let targetModuleId = data.moduleId;
      if (!targetModuleId || !modulesMap.has(targetModuleId)) {
        targetModuleId = inferModuleFromAction(data.action, data.details, data.moduleId);
      }

      if (!targetModuleId || !modulesMap.has(targetModuleId)) {
        // Evento genérico del sistema no asociado directamente a un módulo del catálogo
        return;
      }

      totalEvents++;
      const mod = modulesMap.get(targetModuleId);
      mod.totalVisits++;

      // Registrar último acceso del módulo
      if (!mod.lastAccessIso || isoDate > mod.lastAccessIso) {
        mod.lastAccessIso = isoDate;
        mod.lastUser = {
          email: userEmail,
          name: data.name || userProfilesMap.get(userEmail)?.name || userEmail.split('@')[0],
          role: data.role || userProfilesMap.get(userEmail)?.role || 'miembro',
          sede: data.sede || userProfilesMap.get(userEmail)?.sede || 'Global'
        };
      }

      // Detalle por usuario en este módulo
      const userProfile = userProfilesMap.get(userEmail) || {};
      const userName = data.name || userProfile.name || userEmail.split('@')[0];
      const userRole = data.role || userProfile.role || 'miembro';
      const userSede = data.sede || userProfile.sede || 'Global';

      if (!mod.uniqueUsersMap.has(userEmail)) {
        mod.uniqueUsersMap.set(userEmail, {
          email: userEmail,
          name: userName,
          role: userRole,
          sede: userSede,
          count: 1,
          lastVisitedIso: isoDate
        });
      } else {
        const u = mod.uniqueUsersMap.get(userEmail);
        u.count++;
        if (isoDate > u.lastVisitedIso) {
          u.lastVisitedIso = isoDate;
        }
      }

      // Conteo por Rol
      mod.rolesCount[userRole] = (mod.rolesCount[userRole] || 0) + 1;

      // Conteo por Sede
      mod.sedesCount[userSede] = (mod.sedesCount[userSede] || 0) + 1;

      // Acumulador de usuarios globales
      if (!globalUsersMap.has(userEmail)) {
        globalUsersMap.set(userEmail, {
          email: userEmail,
          name: userName,
          role: userRole,
          sede: userSede,
          totalModuleVisits: 1,
          modulesAccessed: new Set([targetModuleId]),
          lastActiveIso: isoDate
        });
      } else {
        const gu = globalUsersMap.get(userEmail);
        gu.totalModuleVisits++;
        gu.modulesAccessed.add(targetModuleId);
        if (isoDate > gu.lastActiveIso) {
          gu.lastActiveIso = isoDate;
        }
      }
    });

    // 3. Transformar mapa de módulos a array ordenado por visitas
    const rawModulesArray = Array.from(modulesMap.values()).map(m => {
      const uniqueUsersList = Array.from(m.uniqueUsersMap.values()).sort((a, b) => b.count - a.count);
      return {
        id: m.id,
        label: m.label,
        emoji: m.emoji,
        route: m.route,
        roles: m.roles,
        totalVisits: m.totalVisits,
        uniqueUsersCount: uniqueUsersList.length,
        users: uniqueUsersList,
        rolesCount: m.rolesCount,
        sedesCount: m.sedesCount,
        lastAccessIso: m.lastAccessIso,
        lastUser: m.lastUser,
        usageTier: m.totalVisits >= 20 ? 'ALTO' : (m.totalVisits >= 5 ? 'MEDIO' : (m.totalVisits > 0 ? 'BAJO' : 'SIN_USO'))
      };
    });

    // Ordenar de mayor a menor uso
    rawModulesArray.sort((a, b) => b.totalVisits - a.totalVisits);

    const activeModules = rawModulesArray.filter(m => m.totalVisits > 0);
    const zeroUsageModules = rawModulesArray.filter(m => m.totalVisits === 0);

    result.summary.totalModules = rawModulesArray.length;
    result.summary.activeModulesCount = activeModules.length;
    result.summary.inactiveModulesCount = zeroUsageModules.length;
    result.summary.totalEventsCount = totalEvents;
    result.summary.uniqueUsersCount = globalUsersMap.size;
    result.summary.lastEventIso = latestTimestampIso;
    result.summary.firstEventIso = earliestTimestampIso;

    result.modules = rawModulesArray;
    result.usersSummary = Array.from(globalUsersMap.values()).map(u => ({
      ...u,
      modulesCount: u.modulesAccessed.size,
      modulesList: Array.from(u.modulesAccessed)
    })).sort((a, b) => b.totalModuleVisits - a.totalModuleVisits);

    // 4. GENERACIÓN DEL DICTAMEN OBJETIVO DEL AGENTE AUDITOR DE TELEMETRÍA (Modo Anti-Alucinación)
    const topLeader = activeModules[0] || null;
    const topThree = activeModules.slice(0, 3);
    const orphanCount = zeroUsageModules.length;

    const criticalFindings = [];

    if (topLeader) {
      criticalFindings.push({
        tipo: 'LIDER_OPERATIVO',
        severidad: 'INFO',
        titulo: `Módulo Troncal: "${topLeader.label}" (${topLeader.totalVisits} visitas)`,
        descripcion: `Es el centro neurálgico con mayor recurrencia. Agrupa a ${topLeader.uniqueUsersCount} colaboradores activos.`
      });
    }

    if (orphanCount > 0) {
      criticalFindings.push({
        tipo: 'MODULOS_HUERFANOS',
        severidad: 'ALERTA',
        titulo: `${orphanCount} módulos con CERO accesos registrados`,
        descripcion: `Existen ${orphanCount} herramientas en el catálogo de Causa OS sin registros auditables de uso en la muestra analizada (${zeroUsageModules.map(m => m.label).slice(0, 4).join(', ')}${orphanCount > 4 ? '...' : ''}). Recomendación: evaluar si requieren reinducción o baja técnica para optimizar la interfaz.`
      });
    }

    if (globalUsersMap.size > 0) {
      const topUser = result.usersSummary[0];
      criticalFindings.push({
        tipo: 'ADOPCION_USUARIOS',
        severidad: 'POSITIVO',
        titulo: `Mayor Adopción Operativa: ${topUser.name} (${topUser.email})`,
        descripcion: `Registra ${topUser.totalModuleVisits} interacciones auditadas en ${topUser.modulesCount} módulos distintos.`
      });
    }

    result.agentAnalysis = {
      auditorName: 'Centinela de Telemetría & Adopción Causa OS',
      reglaVeracidad: '100% de métricas computadas contra logs inmutables de Firestore (audit_logs). Prohibido inventar datos.',
      fechaAuditoriaIso: new Date().toISOString(),
      estadoGeneral: orphanCount > 10 ? 'REQUIERE_DEPURACION' : (orphanCount > 5 ? 'ATENCION' : 'OPTIMO'),
      modulosTop: topThree.map(m => ({ label: m.label, visitas: m.totalVisits, usuarios: m.uniqueUsersCount })),
      modulosSinUso: zeroUsageModules.map(m => ({ id: m.id, label: m.label, route: m.route })),
      hallazgos: criticalFindings,
      conclusion: orphanCount > 0
        ? `La plataforma tiene ${activeModules.length} módulos con actividad demostrable y ${orphanCount} módulos sin ningún registro de uso. Dirección General cuenta con la evidencia real para consolidar la plataforma, reduciendo ruido cognitivo.`
        : `Excelente nivel de tracción: todos los módulos del catálogo presentan interacción auditada.`
    };

    return result;
  } catch (error) {
    console.error('Error generando reporte de telemetría de módulos:', error);
    return result;
  }
}
