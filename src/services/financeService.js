import { collection, doc, getDocs, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function getHQOperationalStatus() {
  const hqStatuses = [];
  try {
    const snap = await getDocs(collection(db, 'hq_operational_status'));
    snap.forEach(doc => {
      hqStatuses.push({ id: doc.id, ...doc.data() });
    });
    return hqStatuses;
  } catch (error) {
    console.error("Error fetching HQ status:", error);
    return [];
  }
}

export async function toggleHQBlock(sedeId, isBlocked, blockedBy, reason = '') {
  try {
    const hqRef = doc(db, 'hq_operational_status', sedeId);
    await setDoc(hqRef, {
      sede: sedeId,
      isBlocked,
      blockedBy,
      blockedAt: isBlocked ? serverTimestamp() : null,
      reason: isBlocked ? reason : ''
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error toggling HQ block:", error);
    return false;
  }
}

// Datos canónicos reales de sedes y contadores para auditoría Zero-Trust de CREAR
export const officialFinancialData = [
  { 
    sede: 'Lima (Perú)', 
    sedeKey: 'lima',
    pais: 'Perú',
    razonSocial: 'CREACIÓN CUÁNTICA E.I.R.L. (RUC 20612592811)',
    gerentes: ['Jose Sanchez'],
    contadores: ['Gabriela Rivadeneyra'], 
    emailContable: 'contabilidad.lima@crearpsl.net',
    nodusIncome: 118500, 
    bankConciliated: 118500, 
    pendingExpenses: 6800, 
    asistentesNodus: 927,
    matriculadosNodus: 2051,
    slaStatus: 'COMPLETED', 
    isBlocked: false 
  },
  { 
    sede: 'Quito (Ecuador)', 
    sedeKey: 'quito',
    pais: 'Ecuador',
    gerentes: ['Emily Campuzano', 'David Sosa'],
    contadores: ['Diego Flores', 'Alexis Teran'], 
    emailContable: 'diego.flores@crearpsl.net',
    nodusIncome: 94200, 
    bankConciliated: 91800, 
    pendingExpenses: 11200, 
    asistentesNodus: 885,
    matriculadosNodus: 5067,
    slaStatus: 'WARNING', 
    isBlocked: false 
  },
  { 
    sede: 'Medellín (Colombia)', 
    sedeKey: 'medellin',
    pais: 'Colombia',
    gerentes: ['Yurany G Franco'],
    contadores: ['Hector Gonzalez'], 
    emailContable: 'contabilidad.medellin@crearpsl.net',
    nodusIncome: 68400, 
    bankConciliated: 65900, 
    pendingExpenses: 6200, 
    asistentesNodus: 1018,
    matriculadosNodus: 1418,
    slaStatus: 'WARNING', 
    isBlocked: false 
  },
  { 
    sede: 'Guayaquil (Ecuador)', 
    sedeKey: 'guayaquil',
    pais: 'Ecuador',
    gerentes: ['Josue Vera'],
    contadores: ['Sebastian Jacome', 'Erica Logacho'], 
    emailContable: 'contabilidad.global@crearpsl.net',
    nodusIncome: 52000, 
    bankConciliated: 52000, 
    pendingExpenses: 5400, 
    asistentesNodus: 27,
    matriculadosNodus: 1902,
    slaStatus: 'COMPLETED', 
    isBlocked: false 
  },
  { 
    sede: 'Cuenca (Ecuador)', 
    sedeKey: 'cuenca',
    pais: 'Ecuador',
    gerentes: ['July Leon', 'Edison Ricardo Gavilánez'],
    contadores: ['Erica Logacho'], 
    emailContable: 'asistente.contable@crearpsl.net',
    nodusIncome: 41500, 
    bankConciliated: 41500, 
    pendingExpenses: 3650, 
    asistentesNodus: 8,
    matriculadosNodus: 3137,
    slaStatus: 'COMPLETED', 
    isBlocked: false 
  }
];

export const mockFinancialData = officialFinancialData;

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIVA SUBALTERNA (Contadores / Analistas)
// ─────────────────────────────────────────────────────────────────────────────

export async function submitDailyClose(sede, payload) {
  try {
    const closeRef = doc(collection(db, 'finance_daily_close'));
    await setDoc(closeRef, {
      sede,
      ...payload,
      timestamp: serverTimestamp(),
      hash: 'SHA256-MOCK-HASH-' + Date.now() // Simulación de inmutabilidad criptográfica
    });
    return true;
  } catch (error) {
    console.error("Error en cierre diario:", error);
    return false;
  }
}

export async function submitWeeklySLA(sede, payload) {
  try {
    // 1. Guardar el reporte
    const reportRef = doc(collection(db, 'finance_conciliations'));
    await setDoc(reportRef, {
      sede,
      ...payload,
      submittedAt: serverTimestamp(),
      status: 'SUBMITTED'
    });

    // 2. Aquí iría la lógica en Cloud Functions para cruzar con Nodus, 
    // pero actualizamos el estado optimista para el dashboard.
    return true;
  } catch (error) {
    console.error("Error al enviar SLA semanal:", error);
    return false;
  }
}

/**
 * Script de Hidratación (Cero Pérdida de Datos)
 * Etiqueta tareas históricas de contadores con una categoría financiera silenciosa.
 * Se puede ejecutar una sola vez desde el panel de SuperAdmin.
 */
export async function hydrateFinanceTasks() {
  const financeEmails = [
    'erica.logacho', 'gabriela.rivadeneyra', 'hector.gonzalez', 
    'alexis.teran', 'diego.flores', 'sebastian.jacome'
  ];
  
  try {
    const tasksSnap = await getDocs(collection(db, 'tasks'));
    let updatedCount = 0;
    
    // Batch updates para no saturar Firestore
    // Nota: Simplificado para el MVP.
    const promises = [];
    tasksSnap.forEach(taskDoc => {
      const data = taskDoc.data();
      const assigneeEmail = (data.assignedToEmail || '').toLowerCase();
      
      if (financeEmails.some(e => assigneeEmail.includes(e)) && !data.financeCategory) {
        // Auto-tagging heurístico basado en título
        let cat = 'Operativa General';
        const title = (data.title || '').toLowerCase();
        if (title.includes('factura')) cat = 'Facturación';
        if (title.includes('concilia') || title.includes('banco')) cat = 'Conciliación';
        if (title.includes('cierre')) cat = 'Cierre';
        if (title.includes('auditor')) cat = 'Auditoría';
        
        promises.push(updateDoc(doc(db, 'tasks', taskDoc.id), {
          financeCategory: cat,
          systemTag: 'auto-hydrated-cfo-v1'
        }));
        updatedCount++;
      }
    });
    
    await Promise.all(promises);
    return updatedCount;
  } catch (error) {
    console.error("Error hidratando tareas:", error);
    return 0;
  }
}
