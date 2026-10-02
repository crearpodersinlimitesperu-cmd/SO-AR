import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// ============================================================================
// SERVICIO DE CRM PARA ENTRENADORES DE LLAMADAS (CENTRO DE MANAGERS)
// ============================================================================

export async function getManagersPipeline(sede) {
  // Simulamos la obtención de datos de "Managers" (participantes de Maestría)
  // cruzados con datos de Nodus (filtrando automáticamente al Equipo 1000).
  return [
    {
      id: 'mgr_001',
      name: 'Jorge Salgado',
      equipo: 'Equipo 30',
      sede: sede || 'Quito',
      status: 'RED', // Sin prospectos, sin llamadas
      sentados: 0,
      meta: 3,
      nodusLastCall: 'No contesta (Hace 2 días)',
      isCritical: true
    },
    {
      id: 'mgr_002',
      name: 'Valeria Cedeño',
      equipo: 'Equipo 30',
      sede: sede || 'Quito',
      status: 'YELLOW', // Tiene prospectos pero faltan cierres
      sentados: 1,
      meta: 3,
      nodusLastCall: 'En Seguimiento',
      isCritical: false
    },
    {
      id: 'mgr_003',
      name: 'Esteban Ramírez',
      equipo: 'Equipo 31',
      sede: sede || 'Quito',
      status: 'GREEN', // Meta cumplida
      sentados: 3,
      meta: 3,
      nodusLastCall: 'Confirmados al 100%',
      isCritical: false
    }
  ];
}

export async function getDualTasks(sede) {
  // Simulamos tareas cruzadas con el Coordinador de Maestría
  return [
    {
      id: 'dtask_001',
      title: 'Alineación Urgente: Jorge Salgado',
      description: 'Manager en cero sentados a 48h del evento. Requiere intervención en sala y en llamada.',
      status: 'PENDING',
      coachSigned: false,
      coordSigned: false,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() // Mañana
    },
    {
      id: 'dtask_002',
      title: 'Auditoría de Rezagados Cap 1',
      description: 'Revisar la lista de 5 participantes que no asistieron al enrolamiento. Doble check de gestión.',
      status: 'PENDING',
      coachSigned: true, // El coach ya hizo su parte
      coordSigned: false,
      dueDate: new Date().toISOString() // Hoy
    }
  ];
}

export async function signoffDualTask(taskId, role) {
  // Simulamos la actualización criptográfica del Dual-Signoff
  // role = 'coach' | 'coord'
  console.log(`[DUAL-SIGNOFF] Task ${taskId} signed by ${role}`);
  return true;
}
