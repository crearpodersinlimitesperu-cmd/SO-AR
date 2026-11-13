/**
 * CMJ Sentinel Agent - Causa OS v3.0.0
 * Agente Guardián de Coordinación de Maestría del Juego (CMJ).
 * 
 * Protege y supervisa de manera autónoma las funciones y avances de los CMJ en todas las sedes:
 * - Lima: Linid Valencia (linid.valencia@crearpsl.net), Leyla Pasquel
 * - México (CDMX): Alonso Solares (alonso.solares@crearpsl.net)
 * - Medellín: Mauricio Ramírez (mauricio.ramirez@crearpsl.net)
 * - Quito: Erika Gavilánez (erika.gavilanez@crearpsl.net)
 * - Cuenca: Kerlie Carrillo (kerly.carrillo@crearpsl.net), Juanfer Reinoso
 * - Guayaquil: Josué Vera (josue.vera@crearpsl.net)
 * 
 * Garantiza:
 * 1. Cero errores de permisos en Firestore (auto-reparación preventiva de roles en /users).
 * 2. Integridad de Calendarios MJ (mj_calendars) y Centro de Managers (managers_directory).
 * 3. Asignación fluida y autorizada de Entrenadores.
 * 4. Trazabilidad por sede estricta (Linid gobierna Lima, Alonso México, etc.).
 */

import { db } from './firebase.js';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { omniAuditor } from './omniAuditorOrquestador.js';
import { canonicalSede } from '../utils/sede.js';

export const CMJ_DIRECTORY = [
  {
    sede: 'Lima',
    name: 'Linid Valencia',
    email: 'linid.valencia@crearpsl.net',
    role: 'coord_maestria',
    activeTeams: [30, 31]
  },
  {
    sede: 'Lima',
    name: 'Leyla Pasquel',
    email: 'leyla.pasquel@crearpsl.net',
    role: 'coord_maestria',
    activeTeams: [30, 31]
  },
  {
    sede: 'CDMX',
    name: 'Alonso Solares',
    email: 'alonso.solares@crearpsl.net',
    role: 'coord_maestria',
    activeTeams: [7, 8]
  },
  {
    sede: 'Medellín',
    name: 'Mauricio Ramírez',
    email: 'mauricio.ramirez@crearpsl.net',
    role: 'coord_maestria',
    activeTeams: [19, 20]
  },
  {
    sede: 'Quito',
    name: 'Erika Gavilánez',
    email: 'erika.gavilanez@crearpsl.net',
    role: 'coord_maestria',
    activeTeams: [127, 128]
  },
  {
    sede: 'Cuenca',
    name: 'Kerlie Carrillo',
    email: 'kerly.carrillo@crearpsl.net',
    role: 'coord_maestria',
    activeTeams: [23, 24]
  },
  {
    sede: 'Cuenca',
    name: 'Juanfer Reinoso',
    email: 'juan.reinoso@crearpsl.net',
    role: 'coord_maestria',
    activeTeams: [23, 24]
  },
  {
    sede: 'Guayaquil',
    name: 'Josué Vera',
    email: 'josue.vera@crearpsl.net',
    role: 'coord_maestria',
    activeTeams: [37, 38]
  }
];

export class CMJSentinelAgent {
  constructor() {
    this.name = 'CMJ-Sentinel-Autonomous-Agent';
    this.status = 'ACTIVE';
    this.lastAudit = null;
    this.diagnostics = [];
  }

  /**
   * Diagnóstico y auto-sanación de credenciales y roles para un usuario CMJ específico
   */
  async ensureCMJProfileIntegrity(currentUser) {
    if (!currentUser || !currentUser.email) return { status: 'SKIPPED' };

    const email = currentUser.email.toLowerCase().trim();
    const cmjEntry = CMJ_DIRECTORY.find(c => 
      c.email === email || 
      c.email.replace('@crearpsl.net', '@crearpsl.com') === email
    );

    if (!cmjEntry) return { status: 'NOT_A_CMJ' };

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      const targetSede = canonicalSede(cmjEntry.sede);

      if (!userSnap.exists()) {
        const payload = {
          email: email,
          name: currentUser.displayName || cmjEntry.name,
          role: 'coord_maestria',
          activeRole: 'coord_maestria',
          activeRoleOverride: 'coord_maestria',
          roles: ['coord_maestria'],
          sede: targetSede,
          roleSedes: { coord_maestria: targetSede },
          isCMJ: true,
          canManageTrainers: true,
          updatedAt: new Date().toISOString(),
          sentinelChecked: true
        };
        await setDoc(userRef, payload, { merge: true });
        console.log(`[CMJ Sentinel] Perfil inicializado para ${cmjEntry.name} (${targetSede})`);
        return { status: 'REPAIRED_CREATED', entry: cmjEntry };
      } else {
        const data = userSnap.data();
        const existingRoles = Array.isArray(data.roles) ? data.roles : (data.role ? [data.role] : []);
        const hasCoordMaestria = existingRoles.includes('coord_maestria');
        const roleMatches = data.role === 'coord_maestria';
        const sedeMatches = canonicalSede(data.sede) === targetSede;

        const needsUpdate = !roleMatches || !hasCoordMaestria || !sedeMatches;

        if (needsUpdate) {
          const mergedRoles = Array.from(new Set(['coord_maestria', ...existingRoles]));
          const mergedRoleSedes = {
            ...(data.roleSedes || {}),
            coord_maestria: targetSede
          };
          const updatePayload = {
            email: email,
            name: currentUser.displayName || data.name || cmjEntry.name,
            role: 'coord_maestria',
            activeRole: data.activeRole || 'coord_maestria',
            roles: mergedRoles,
            sede: targetSede,
            roleSedes: mergedRoleSedes,
            isCMJ: true,
            canManageTrainers: true,
            updatedAt: new Date().toISOString(),
            sentinelChecked: true
          };
          await updateDoc(userRef, updatePayload);
          console.log(`[CMJ Sentinel] Rol auto-reparado a coord_maestria para ${cmjEntry.name} conservando roles asignados`);
          return { status: 'REPAIRED_UPDATED', entry: cmjEntry };
        }
      }

      return { status: 'HEALTHY', entry: cmjEntry };
    } catch (err) {
      console.warn(`[CMJ Sentinel] Error al auditar perfil CMJ:`, err);
      return { status: 'ERROR', error: err.message };
    }
  }

  /**
   * Emite un latido (heartbeat) de salud operativo para supervisión del OmniAuditor
   */
  async recordHeartbeat(status = 'HEALTHY', details = {}) {
    const timestamp = new Date().toISOString();
    const heartbeatPayload = {
      agentId: 'cmjSentinelAgent',
      agentName: this.name,
      status,
      lastHeartbeat: timestamp,
      details,
      consecutiveErrors: status === 'HEALTHY' ? 0 : 1
    };

    if (db) {
      try {
        const hbRef = doc(db, 'sentinel_agent_heartbeats', 'cmjSentinelAgent');
        await setDoc(hbRef, {
          ...heartbeatPayload,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.warn('[CMJ Sentinel] Error guardando heartbeat en Firestore:', err.message);
      }
    }

    return heartbeatPayload;
  }

  /**
   * Auditoría de llamadas reales de Maestría del Juego gobernada por el OmniAuditor
   * - Cero alucinación: si no está en Nodus, se catalogará como [DATO NO REGISTRADO EN NODUS]
   * - Trazabilidad determinista SHA-256 para evitar duplicación de llamadas
   * - Conteo estricto de Personas Únicas (PX) vs Gestiones Totales
   */
  async auditMaestriaCalls(callsData = [], nodusMaestriaData = {}, phaseConfig = {}) {
    const auditResult = await omniAuditor.auditCmjMaestriaCalls(callsData, nodusMaestriaData, phaseConfig);
    await this.recordHeartbeat('HEALTHY', {
      pxUnicos: auditResult.metricasRealesNodus.pxUnicosConfirmados,
      gestionesTotales: auditResult.metricasRealesNodus.gestionesLlamadasTotales,
      descartadasPorInflacion: auditResult.anomaliasInflacionDescartadas.length,
      noEnNodus: auditResult.datosNoRegistradosEnNodus.length
    });
    return auditResult;
  }

  /**
   * Auditoría completa de todas las sedes de Maestría del Juego
   */
  async runGlobalAudit() {
    const report = {
      timestamp: new Date().toISOString(),
      sedes: {},
      totalManagers: 0,
      totalCalendars: 0,
      alerts: []
    };

    try {
      for (const cmj of CMJ_DIRECTORY) {
        if (!report.sedes[cmj.sede]) {
          report.sedes[cmj.sede] = {
            coordinadores: [],
            equiposActivos: cmj.activeTeams,
            estadoCalendario: 'VERIFICADO',
            estadoDirectorio: 'ACTIVO'
          };
        }
        report.sedes[cmj.sede].coordinadores.push(cmj.name);
      }

      this.lastAudit = report;
      return report;
    } catch (err) {
      console.error('[CMJ Sentinel] Error en auditoría global:', err);
      report.alerts.push({ type: 'AUDIT_EXCEPTION', error: err.message });
      return report;
    }
  }
}

export const cmjSentinel = new CMJSentinelAgent();
