/**
 * scheduleGovernanceAgent.js — Causa OS v3.2.0
 * Agente de Gobernanza y Acuse de Recibo Logístico de Horarios
 * 
 * Principios de Gerencia Organizacional y Logística:
 * 1. Principio de Autoridad & Mando: Solo los Gerentes de Sede, Dirección General
 *    y SuperAdmins tienen potestad para crear, editar, reasignar o eliminar turnos.
 * 2. Principio de Transparencia & Claridad Operativa: Los Coordinadores (CC1Y2, CMJ)
 *    y demás personal acceden a un Modo Consulta Oficial (Solo Lectura) blindado.
 * 3. Notificación Proactiva en Causa OS: Cada actualización de la Gerencia genera
 *    notificaciones directas en la bandeja interna de Causa OS para el equipo de esa sede.
 * 4. Acuse de Recibo Vinculante ("Leído y Enterado"): Sello digital con fecha, hora
 *    y usuario que audita el 100% de confirmación operativa de sala.
 */

import { db } from './firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

/**
 * Directorio Oficial de Gerencia por Sede y Dirección Global
 */
export const SCHEDULE_SEDE_MANAGERS = {
  'lima': ['jose.sanchez@crearpsl.net', 'contabilidad.lima@crearpsl.net'],
  'quito': ['emily.campuzano@crearpsl.net', 'freddy.sosa@crearpsl.net', 'david.sosa@crearpsl.net'],
  'guayaquil': ['josue.vera@crearpsl.net'],
  'cuenca': ['emely.leon@crearpsl.net', 'emely.leon@crearpls.com'],
  'medellin': ['yurany.gonzalez@crearpsl.net'],
  'mexico': ['nora.zamora@crearpsl.net']
};

export const GLOBAL_SUPER_ADMINS = [
  'jose.sanchez@crearpsl.net',
  'fer.aragon@crearpsl.net',
  'paul.sosa@crearpsl.net',
  'armando.pilacuan@gmail.com',
  'andres.gomez@crearpsl.net',
  'contabilidad.global@crearpsl.net',
  'talento.humano@crearpsl.net'
];

/**
 * Valida si el usuario actual posee autoridad jerárquica para editar horarios en la sede.
 * @param {Object} currentUser - Usuario autenticado
 * @param {string} sede - Nombre de la sede (ej. 'Lima', 'Quito')
 * @returns {Object} { canEdit: boolean, isSuperAdmin: boolean, isSedeManager: boolean, roleTitle: string }
 */
export function checkScheduleAuthority(currentUser, sede = '') {
  if (!currentUser) {
    // Si no hay usuario especificado, por seguridad restringir edición
    return {
      canEdit: false,
      isSuperAdmin: false,
      isSedeManager: false,
      roleTitle: 'Invitado / No autenticado'
    };
  }

  const email = (currentUser.email || '').toLowerCase().trim();
  const role = (currentUser.role || currentUser.appRole || '').toLowerCase().trim();
  const normSede = (sede || currentUser.sede || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // 1. SuperAdmin / Dirección Global
  const isSuper = Boolean(
    currentUser.isSuperAdmin ||
    role === 'superadmin' ||
    role === 'direccion' ||
    role === 'ceo' ||
    role === 'cfo' ||
    role === 'cco' ||
    role === 'director_maestria' ||
    GLOBAL_SUPER_ADMINS.some(adm => email.includes(adm))
  );

  if (isSuper) {
    return {
      canEdit: true,
      isSuperAdmin: true,
      isSedeManager: true,
      roleTitle: 'SuperAdmin / Dirección Global'
    };
  }

  // 2. Gerente de Sede Específico
  const managersOfSede = SCHEDULE_SEDE_MANAGERS[normSede] || [];
  const isNamedManager = managersOfSede.some(m => email.includes(m.toLowerCase()));
  const isGenericGerente = Boolean(
    currentUser.isGerente ||
    role === 'gerente' ||
    role === 'gerente_sede' ||
    role.includes('gerente')
  );

  if (isNamedManager || isGenericGerente) {
    return {
      canEdit: true,
      isSuperAdmin: false,
      isSedeManager: true,
      roleTitle: `Gerente de Sede (${sede})`
    };
  }

  // 3. Coordinadores y Staff (Solo Lectura)
  return {
    canEdit: false,
    isSuperAdmin: false,
    isSedeManager: false,
    roleTitle: role ? `Coordinación / Staff (${role})` : 'Personal de Sala'
  };
}

/**
 * Despacha notificaciones en Causa OS a todos los colaboradores de la sede
 * informando que la Gerencia ha actualizado la matriz de horarios.
 */
export async function notifyTeamScheduleUpdated({ sede, updatedBy, staffList }) {
  if (!staffList || staffList.length === 0) return { notifiedCount: 0 };

  let count = 0;
  const now = new Date().toISOString();

  for (const staff of staffList) {
    if (!staff.email) continue;
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: staff.email.toLowerCase().trim(),
        title: `📅 Horarios Actualizados — Sede ${sede}`,
        message: `La Gerencia (${updatedBy || 'Gerencia de Sede'}) ha actualizado los horarios y turnos de entrenamiento en Causa OS. Por favor revisa tus asignaciones y confirma de "Leído y Enterado".`,
        type: 'schedule_update',
        sede: sede,
        read: false,
        created_at: now,
        timestamp: Date.now()
      });
      count++;
    } catch (err) {
      console.warn(`Error enviando notificación in-app a ${staff.email}:`, err);
    }
  }

  return { notifiedCount: count };
}

/**
 * Registra el acuse de recibo formal ("Leído y Enterado") del colaborador.
 */
export async function recordStaffAcknowledgement({ sedeDocId, user, sede }) {
  if (!sedeDocId || !user?.email) throw new Error('Parámetros insuficientes para registrar acuse de recibo.');

  const emailKey = user.email.toLowerCase().replace(/[\.\@\-]/g, '_');
  const docRef = doc(db, 'nodus_training_schedules', sedeDocId);
  const now = new Date().toISOString();

  const ackData = {
    email: user.email.toLowerCase().trim(),
    name: user.name || user.displayName || user.email,
    role: user.role || user.appRole || 'Coordinador',
    confirmedAt: now,
    timestamp: Date.now(),
    sede: sede
  };

  try {
    // Merge en el documento de horarios de la sede
    await setDoc(docRef, {
      acknowledgements: {
        [emailKey]: ackData
      }
    }, { merge: true });

    return { success: true, ackData };
  } catch (err) {
    console.error('Error registrando acuse de recibo en Firestore:', err);
    throw err;
  }
}

/**
 * Analiza el estado de confirmaciones (Leído y Enterado) del equipo de una sede.
 */
export function auditAcknowledgements(acknowledgements = {}, staffList = []) {
  const acks = acknowledgements || {};
  const confirmedList = [];
  const pendingList = [];

  staffList.forEach(staff => {
    const staffEmail = (staff.email || '').toLowerCase().trim();
    if (!staffEmail) {
      pendingList.push({ ...staff, reason: 'Sin correo' });
      return;
    }

    const emailKey = staffEmail.replace(/[\.\@\-]/g, '_');
    const ack = acks[emailKey] || Object.values(acks).find(a => (a.email || '').toLowerCase() === staffEmail);

    if (ack) {
      confirmedList.push({
        ...staff,
        confirmedAt: ack.confirmedAt,
        timestamp: ack.timestamp
      });
    } else {
      pendingList.push(staff);
    }
  });

  const total = staffList.length;
  const confirmed = confirmedList.length;
  const percentage = total > 0 ? Math.round((confirmed / total) * 100) : 0;

  return {
    total,
    confirmed,
    percentage,
    confirmedList,
    pendingList
  };
}

export default {
  SCHEDULE_SEDE_MANAGERS,
  GLOBAL_SUPER_ADMINS,
  checkScheduleAuthority,
  notifyTeamScheduleUpdated,
  recordStaffAcknowledgement,
  auditAcknowledgements
};
