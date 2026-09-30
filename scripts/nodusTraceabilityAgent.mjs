import { initializeApp as initializeAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';

function getAdminDb() {
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    let serviceAccount;
    if (!rawServiceAccount) {
      if (fs.existsSync('centro-operativo-cpsl-3d05655c949c.json')) {
        serviceAccount = JSON.parse(fs.readFileSync('centro-operativo-cpsl-3d05655c949c.json', 'utf8'));
      } else {
        throw new Error('Falta FIREBASE_SERVICE_ACCOUNT_KEY/GOOGLE_SERVICE_ACCOUNT_JSON o el archivo local centro-operativo-cpsl-3d05655c949c.json.');
      }
    } else {
      serviceAccount = JSON.parse(rawServiceAccount);
    }
    
    if (getAdminApps().length === 0) {
      initializeAdminApp({ credential: cert(serviceAccount) });
    }
    return getAdminFirestore();
}

const db = getAdminDb();

/**
 * Agente de Trazabilidad y Confianza (Nodus Trust & Traceability Agent)
 * 
 * PROPÓSITO:
 * Asegurar que todas las operaciones críticas (cambios de roles, asignaciones de sedes)
 * dejen un rastro auditable (trazabilidad) y alertar si se detectan anomalías o falta de logs.
 */
async function auditTraceability() {
    console.log("🕵️‍♂️ Iniciando Auditoría de Trazabilidad y Confianza...");
    
    try {
        // 1. Revisar los últimos 100 logs de auditoría
        const logsSnapshot = await db.collection('audit_logs')
            .orderBy('createdAtIso', 'desc')
            .limit(100)
            .get();

        if (logsSnapshot.empty) {
            console.warn("⚠️ ALERTA CRÍTICA: No se encontraron logs de auditoría recientes. La trazabilidad podría estar comprometida.");
            return;
        }

        let roleChanges = 0;
        let logins = 0;
        let anomalies = 0;

        logsSnapshot.forEach(doc => {
            const data = doc.data();
            
            if (data.action === 'ROLE_UPDATE' || data.action === 'SEDE_UPDATE') {
                roleChanges++;
                // Validar que el log tenga la información completa
                if (!data.email || !data.details) {
                    console.warn(`⚠️ Anomalía detectada en log ${doc.id}: Cambio de rol/sede sin email o detalles.`);
                    anomalies++;
                }
            } else if (data.action === 'LOGIN' || data.action === 'ACCESO') {
                logins++;
            }
        });

        console.log(`✅ Trazabilidad confirmada en los últimos 100 eventos:`);
        console.log(`   - 🔄 Cambios de Rol/Sede registrados: ${roleChanges}`);
        console.log(`   - 🔐 Accesos registrados: ${logins}`);
        
        if (anomalies > 0) {
            console.warn(`⚠️ Se encontraron ${anomalies} anomalías en la estructura de los logs de trazabilidad.`);
        } else {
            console.log(`✅ Los logs de trazabilidad cumplen con el estándar de confianza.`);
        }

        // 2. Escribir el reporte de confianza en Firestore
        await db.collection('nodus_reports').doc('traceability_audit_latest').set({
            lastRun: FieldValue.serverTimestamp(),
            roleChanges,
            logins,
            anomalies,
            status: anomalies > 0 ? 'WARNING' : 'HEALTHY',
            agentName: 'Nodus Traceability Agent'
        });
        
        console.log("💾 Reporte de Trazabilidad guardado en 'nodus_reports/traceability_audit_latest'.");

    } catch (error) {
        console.error("❌ Error durante la auditoría de trazabilidad:", error);
    }
}

auditTraceability().then(() => {
    console.log("🏁 Auditoría finalizada.");
    process.exit(0);
});
