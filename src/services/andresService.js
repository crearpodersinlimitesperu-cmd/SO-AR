import { db } from './firebase';
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

// ============================================================================
// SERVICIO DE COMANDO GLOBAL DE MAESTRÍA (ANDRÉS GÓMEZ)
// ============================================================================

import { CMJ_METADATA, getSedesBenchmark } from './cmjDataService';

export async function getGlobalSupervision() {
  const benchmark = getSedesBenchmark();
  return benchmark.map((m, i) => {
    // Definimos el estatus basado en la tasa de retención real.
    let status = 'HEALTHY';
    if (m.tasaRetencion < 80) status = 'CRITICAL';
    else if (m.tasaRetencion < 85) status = 'WARNING';
    
    return {
      id: `sup_${i}`,
      hq: m.nombreLargo,
      coordinator: m.cmj,
      status: status,
      compliance: Math.round(m.tasaRetencion), // Usamos la retención como proxy de cumplimiento operativo
      pendingCritical: m.tasaRetencion < 80 ? 3 : (m.tasaRetencion < 85 ? 1 : 0) // Proxy de tareas vencidas
    };
  });
}

export async function getFuturosImposiblesAudit() {
  try {
    const docRef = doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const metrics = snap.data().sedesMetrics || [];
      return metrics.filter(m => m.retencion < 85 || m.asistencia < 80).map((m, i) => ({
        id: `audit_${i}`,
        hq: m.sede || 'Sede Desconocida',
        message: `Retención crítica (${m.retencion}%) o asistencia baja (${m.asistencia}%). Riesgo de no alcanzar el FI.`,
        severity: m.retencion < 80 ? 'HIGH' : 'MEDIUM'
      }));
    }
  } catch (error) {
    console.error('Error fetching FI audit:', error);
  }
  return [];
}

export async function getTalentAndUltimatums() {
  const result = { expansion: [], ultimatums: [] };
  try {
    const q = query(collection(db, 'imo_missions'), orderBy('lastUpdated', 'desc'), limit(20));
    const snap = await getDocs(q);
    
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.type === 'EXPANSION' || data.mission?.toLowerCase().includes('expansión')) {
        result.expansion.push({
          id: docSnap.id,
          mission: data.mission || 'Misión de Expansión',
          assignedTo: data.assignedTo || 'Equipo Global',
          status: data.status === 'CRITICAL' ? 'URGENT' : 'ON-TRACK'
        });
      } else if (data.type === 'ULTIMATUM' || data.isUltimatum) {
        result.ultimatums.push({
          id: docSnap.id,
          person: data.assignedTo || 'Colaborador',
          deadline: data.deadline || 'Inmediato',
          reason: data.mission || 'Bajo rendimiento sostenido'
        });
      }
    });
  } catch (error) {
    console.error('Error fetching talent and ultimatums:', error);
  }
  return result;
}

export async function getNodusCleanKpis() {
  const benchmark = getSedesBenchmark();
  return benchmark.map((m, i) => ({
    id: `kpi_${i}`,
    hq: m.nombreLargo,
    tasaRetencion: m.tasaRetencion,
    tasaDesercion: m.tasaDesercion
  }));
}
