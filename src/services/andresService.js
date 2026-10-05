import { db } from './firebase';
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

// ============================================================================
// SERVICIO DE COMANDO GLOBAL DE MAESTRÍA (ANDRÉS GÓMEZ)
// ============================================================================

import { CMJ_METADATA } from './cmjDataService';

export async function getGlobalSupervision() {
  try {
    const docRef = doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot');
    const snap = await getDoc(docRef);
    let mockCriticals = {};
    if (snap.exists()) {
      const metrics = snap.data().sedesMetrics || [];
      metrics.forEach(m => {
        mockCriticals[m.sede] = m.retencion < 80 ? 7 : (m.retencion < 85 ? 2 : 0);
      });
    }

    return Object.values(CMJ_METADATA).map((cmjMeta, i) => {
      let critCount = mockCriticals[cmjMeta.sede] || 0;
      let status = 'HEALTHY';
      if (critCount > 5) status = 'CRITICAL';
      else if (critCount > 0) status = 'WARNING';
      
      return {
        id: `sup_${i}`,
        hq: cmjMeta.nombreLargo,
        coordinator: cmjMeta.cmj,
        status: status
      };
    });
  } catch (error) {
    console.error('Error fetching global supervision:', error);
  }
  
  return Object.values(CMJ_METADATA).map((cmjMeta, i) => ({
    id: `sup_${i}`,
    hq: cmjMeta.nombreLargo,
    coordinator: cmjMeta.cmj,
    status: 'HEALTHY'
  }));
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
  try {
    const docRef = doc(db, 'nodus_kpis_sincronizados', 'latest_snapshot');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const metrics = snap.data().sedesMetrics || [];
      return metrics.map((m, i) => ({
        id: `kpi_${i}`,
        hq: m.sede,
        enrolled: m.matriculados || 0,
        seated: m.asistentes || 0,
        dropout: m.bajas || 0,
        trend: m.asistentes >= (m.matriculados * 0.9) ? 'up' : 'down'
      }));
    }
  } catch (error) {
    console.error('Error fetching clean KPIs:', error);
  }
  return [];
}
