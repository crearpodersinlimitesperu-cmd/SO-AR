import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// ============================================================================
// SERVICIO DEL HUB OPERATIVO PARA QUANTUM TEAM (QT)
// ============================================================================

export async function getQTCronogramaActual(sede) {
  // Simula el estado actual del salón
  return {
    evento: 'Capítulo 1',
    sede: sede || 'Lima',
    actividadActual: 'Apertura de Salón y Registro',
    horaFin: '09:00 AM',
    proximaActividad: 'Dinámica: Botes Salvavidas',
    temperaturaSala: '18°C Objetivo',
    status: 'ACTIVE'
  };
}

export async function getQTChecklists() {
  // Simula los checklists logísticos dinámicos. Incluye Tareas Trampa.
  return [
    {
      id: 'chk_001',
      category: 'APERTURA',
      task: 'Encendido de Proyectores y Pruebas de Audio (Micrófonos al 70%)',
      isCompleted: true,
      isTrap: false
    },
    {
      id: 'chk_002',
      category: 'APERTURA',
      task: 'Acomodar 150 sillas en configuración herradura (Filas de 20)',
      isCompleted: false,
      isTrap: false
    },
    {
      id: 'chk_003',
      category: 'OPERACION',
      task: 'TRAMPA DE ATENCIÓN: Si lees esto, no marques la tarea y envía "Faltan aguas" por interno a Gerencia.',
      isCompleted: false,
      isTrap: true
    },
    {
      id: 'chk_004',
      category: 'CIERRE',
      task: 'Recolección de Gafetes y Esferos (Inventario completo)',
      isCompleted: false,
      isTrap: false
    }
  ];
}

export async function getQTQuickTasks() {
  // Simulamos órdenes urgentes inyectadas por Gerentes o Entrenadores
  return [
    {
      id: 'qtask_001',
      from: 'José Sánchez (Gerencia)',
      message: 'Subir el aire acondicionado de la zona norte a 22°C. El entrenador reporta frío en primera fila.',
      time: 'Hace 5 mins',
      status: 'PENDING'
    },
    {
      id: 'qtask_002',
      from: 'Fernando Aragón (Entrenador)',
      message: 'Traer 5 marcadores negros nuevos a la tarima antes de las 11:30 AM.',
      time: 'Hace 12 mins',
      status: 'COMPLETED'
    }
  ];
}

export async function toggleQTTask(taskId, currentState, isTrap) {
  if (isTrap && !currentState) {
    // Si están marcando como completada una tarea trampa
    console.warn(`[ALERTA DE ATENCIÓN] El usuario QT ha caído en una tarea trampa (ID: ${taskId}). Reportando a Gerencia.`);
    return { success: true, trapTriggered: true };
  }
  
  // En producción real, updateDoc...
  return { success: true, trapTriggered: false };
}
