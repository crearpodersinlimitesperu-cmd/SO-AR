import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// ============================================================================
// SERVICIO DE COMANDO GLOBAL DE MAESTRÍA (Perfil: Andrés Gómez)
// ============================================================================

export async function getMaestriaMissions() {
  // En producción esto vendría de una colección especial 'maestria_missions'
  // Simulamos los datos exigidos en el PRD:
  return [
    {
      id: 'exp_med_01',
      type: 'EXPANSION',
      title: 'Apertura Medellín (Capítulos 1, 2 y Maestría)',
      deadline: '2026-10-05T00:00:00Z',
      status: 'CRITICAL',
      assignedTo: 'Andrés Gómez',
      progress: 65
    },
    {
      id: 'ult_mauricio_01',
      type: 'ULTIMATUM',
      title: 'Condicionamiento: Mauricio Ramírez',
      description: 'Metas de salud y preparación técnica. Si no cumple, desvinculación.',
      deadline: '2027-01-15T00:00:00Z',
      status: 'WARNING',
      targetUser: 'Mauricio Ramírez'
    }
  ];
}

export async function getMaestriaCoordinatorsStatus() {
  return [
    { sede: 'Quito', coordinator: 'Andrés Gómez / Local', pulse: 'GREEN', futurosImposiblesAlert: false, aprobacionRate: '45%' },
    { sede: 'Lima', coordinator: 'Por Asignar', pulse: 'YELLOW', futurosImposiblesAlert: false, aprobacionRate: '30%' },
    { sede: 'México', coordinator: 'En Evaluación', pulse: 'RED', futurosImposiblesAlert: true, aprobacionRate: '92%' }, // 92% dispara alerta de "bajando estándar"
    { sede: 'Colombia', coordinator: 'Expansión (MED)', pulse: 'WARNING', futurosImposiblesAlert: false, aprobacionRate: 'N/A' }
  ];
}

/**
 * Filtro Algorítmico Cero-Fricción para Nodus
 * Excluye al "Equipo 1000" para no distorsionar KPIs reales.
 */
export function sanitizeNodusKPIs(rawNodusData) {
  if (!rawNodusData || !Array.isArray(rawNodusData)) return [];
  
  return rawNodusData.filter(participante => {
    const isEquipo1000 = participante.equipo && participante.equipo.toLowerCase().includes('equipo 1000');
    // Depuramos y excluimos a este equipo de la estadística pura de la maestría
    return !isEquipo1000;
  });
}

export async function getCleanMaestriaKPIs() {
  // Simulamos la obtención y depuración de datos
  const mockRawData = [
    { sede: 'Quito', equipo: 'Alpha', llamadasNoContestadas: 5, retencion: 95 },
    { sede: 'Quito', equipo: 'Equipo 1000', llamadasNoContestadas: 0, retencion: 100 }, // Dato distorsionado
    { sede: 'México', equipo: 'Beta', llamadasNoContestadas: 15, retencion: 82 },
    { sede: 'Lima', equipo: 'Gamma', llamadasNoContestadas: 8, retencion: 89 },
  ];

  const cleanedData = sanitizeNodusKPIs(mockRawData);
  
  // Consolidar por sede
  const kpisPorSede = cleanedData.reduce((acc, curr) => {
    if (!acc[curr.sede]) {
      acc[curr.sede] = { llamadasFallidas: 0, retencionAcum: 0, count: 0 };
    }
    acc[curr.sede].llamadasFallidas += curr.llamadasNoContestadas;
    acc[curr.sede].retencionAcum += curr.retencion;
    acc[curr.sede].count += 1;
    return acc;
  }, {});

  return Object.keys(kpisPorSede).map(sede => ({
    sede,
    llamadasFallidas: kpisPorSede[sede].llamadasFallidas,
    retencionPromedio: (kpisPorSede[sede].retencionAcum / kpisPorSede[sede].count).toFixed(1) + '%'
  }));
}
