const fs = require('fs');
const file = 'src/services/financeService.js';
let content = fs.readFileSync(file, 'utf8');

const newFunctions = `
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
`;

content += newFunctions;
fs.writeFileSync(file, content);
console.log('financeService updated with subordinate operations');
