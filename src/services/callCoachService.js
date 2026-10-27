import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

// ============================================================================
// SERVICIO DE CRM PARA ENTRENADORES DE LLAMADAS (CENTRO DE MANAGERS)
// ============================================================================

export async function getManagersPipeline(sede) {
  try {
    const managersSnap = await getDocs(collection(db, 'managers_directory'));
    const results = [];
    managersSnap.forEach(docSnap => {
      const data = docSnap.data();
      // Filtrar por sede si se especifica y no es global
      if (sede && sede !== 'Global' && data.sede !== sede) return;
      
      const sentados = data.sentados_confirmados || data.sentadosConfirmados || 0;
      const meta = data.meta_sentados || data.metaSentados || 3;
      const pct = meta > 0 ? sentados / meta : 0;
      
      let status = 'RED';
      if (pct >= 1) status = 'GREEN';
      else if (pct >= 0.5) status = 'YELLOW';
      
      results.push({
        id: docSnap.id,
        docId: docSnap.id,
        name: data.nombre || data.name || 'Sin Nombre',
        equipo: data.equipo || 'Sin Equipo',
        numEquipo: data.numEquipo || '',
        sede: data.sede || 'Sin Sede',
        rol: data.rol || 'Manager',
        telefono: data.telefono || '',
        status,
        sentados,
        meta,
        nodusLastCall: data.ultimo_contacto || data.ultimoContacto || data.llamadaFecha || 'Sin registro',
        isCritical: status === 'RED',
        entrenador: data.entrenador_llamadas || data.entrenador || '',
        llamadasHistorial: Array.isArray(data.llamadasHistorial) ? data.llamadasHistorial : [],
        llamadaFecha: data.llamadaFecha || '',
        llamadaAsistio: data.llamadaAsistio || 'Sin registro',
        tipoContacto: 'Videollamada de Google Meet',
        duracionMinutos: '20-30 min'
      });
    });
    return results;
  } catch (error) {
    console.error("Error al obtener pipeline real de managers:", error);
    throw error;
  }
}

export async function getDualTasks(sede) {
  if (!sede) return [];

  try {
    const tasksQuery = query(
      collection(db, 'checklist_tasks'),
      where('isDualTask', '==', true),
      where('sede', 'in', [sede, 'Global', 'Sede Global'])
    );
    const tasksSnap = await getDocs(tasksQuery);
    const results = [];
    tasksSnap.forEach(docSnap => {
      const data = docSnap.data();
      results.push({ id: docSnap.id, ...data });
    });
    return results;
  } catch (error) {
    console.error("Error al obtener dual tasks:", error);
    throw error;
  }
}

export async function signoffDualTask(taskId, role) {
  // Simulamos la actualización criptográfica del Dual-Signoff
  // role = 'coach' | 'coord'
  console.log(`[DUAL-SIGNOFF] Task ${taskId} signed by ${role}`);
  return true;
}
