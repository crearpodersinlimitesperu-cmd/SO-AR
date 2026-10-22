#!/usr/bin/env node
/**
 * scripts/auditTaskRoleCoherenceAgent.mjs
 * 
 * AGENTE AUDITOR DE COHERENCIA DE TAREAS Y ROLES DE USUARIOS
 * 
 * Misión:
 * 1. Inspeccionar todas las tareas (catálogo y activas en Firestore).
 * 2. Verificar que cada tarea esté funcionando y sea coherente con el perfil y roles del usuario asignado.
 * 3. Detectar asignaciones indebidas (ROLE_MISMATCH), estados contradictorios, correos huérfanos y fallas de esquema.
 * 4. Generar bitácora de auditoría en Firestore y permitir auto-reparaciones seguras con --fix.
 * 
 * Uso:
 *   node scripts/auditTaskRoleCoherenceAgent.mjs [--fix] [--user=correo@crearpsl.net] [--role=gerente] [--json]
 */

import 'dotenv/config';
import fs from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { checklistData } from '../src/data/checklistData.js';
import { USERS_TO_IMPORT } from '../src/data/usersToImport.js';
import {
  auditTaskRoleCoherence,
  SEVERITY
} from '../src/utils/taskRoleCoherence.js';

const KEY_FILE = './centro-operativo-cpsl-65ad52160f45.json';

// --- INICIALIZACIÓN DE FIRESTORE ---
let db = null;
let firestoreConnected = false;

function initFirestore() {
  if (db) return db;
  try {
    const rawEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    let credential = null;
    if (rawEnv && rawEnv.trim().startsWith('{')) {
      credential = cert(JSON.parse(rawEnv));
    } else if (fs.existsSync(KEY_FILE)) {
      credential = cert(JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')));
    } else {
      return null;
    }
    const app = getApps()[0] || initializeApp({
      credential,
      projectId: 'centro-operativo-cpsl'
    });
    db = getFirestore(app);
    firestoreConnected = true;
    return db;
  } catch (err) {
    console.warn(`[auditTaskRoleCoherenceAgent] No se pudo inicializar Firestore Admin: ${err.message}`);
    return null;
  }
}

// --- CARGA DE DATOS ---
async function loadAuditedData() {
  const firestore = initFirestore();
  let users = USERS_TO_IMPORT;
  let tasks = [...checklistData];

  if (firestore) {
    try {
      console.log('📡 Consultando Firestore (users, staff_directory, tasks)...');
      const [usersSnap, staffSnap, tasksSnap] = await Promise.all([
        firestore.collection('users').get().catch(() => ({ docs: [] })),
        firestore.collection('staff_directory').get().catch(() => ({ docs: [] })),
        firestore.collection('tasks').get().catch(() => ({ docs: [] }))
      ]);

      const firestoreUsers = [
        ...usersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        ...staffSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      ];

      if (firestoreUsers.length > 0) {
        // Enriquecer USERS_TO_IMPORT con los usuarios vivos de Firestore
        const emailMap = new Map(users.map(u => [u.email?.toLowerCase(), u]));
        for (const u of firestoreUsers) {
          const email = (u.email || u.correo || '').toLowerCase().trim();
          if (email) {
            emailMap.set(email, { ...(emailMap.get(email) || {}), ...u });
          }
        }
        users = Array.from(emailMap.values());
      }

      if (tasksSnap.docs && tasksSnap.docs.length > 0) {
        const liveTasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Combinar catálogo con tareas en vivo
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        for (const t of liveTasks) {
          taskMap.set(t.id, { ...(taskMap.get(t.id) || {}), ...t });
        }
        tasks = Array.from(taskMap.values());
      }
      console.log(`✅ Datos cargados: ${users.length} usuarios, ${tasks.length} tareas.`);
    } catch (err) {
      console.warn(`⚠️ Error leyendo colecciones de Firestore: ${err.message}. Usando catálogo local.`);
    }
  } else {
    console.log(`ℹ️ Modo sin credenciales de servicio: Auditando catálogo de ${checklistData.length} tareas contra ${USERS_TO_IMPORT.length} perfiles.`);
  }

  return { users, tasks };
}

// --- EJECUCIÓN PRINCIPAL ---
export async function runTaskRoleCoherenceAgent(options = {}) {
  const {
    autoFix = false,
    filterUser = null,
    filterRole = null,
    jsonOutput = false
  } = options;

  const { users, tasks } = await loadAuditedData();

  let tasksToAudit = tasks;
  if (filterUser) {
    const norm = filterUser.trim().toLowerCase();
    tasksToAudit = tasks.filter(t => {
      const direct = (t.assignedToEmail || t.assigned_to || '').toLowerCase();
      const multi = (t.assignedToEmails || []).map(e => String(e).toLowerCase());
      return direct.includes(norm) || multi.some(e => e.includes(norm));
    });
  }

  if (filterRole) {
    const rNorm = filterRole.trim().toLowerCase();
    tasksToAudit = tasksToAudit.filter(t => (t.role || '').toLowerCase().includes(rNorm));
  }

  const auditReport = auditTaskRoleCoherence({
    users,
    tasks: tasksToAudit,
    catalog: checklistData
  });

  // Ejecutar reparaciones si --fix está activo y Firestore está conectado
  const repairLog = [];
  if (autoFix && firestoreConnected && db) {
    console.log('\n🔧 MODO --fix ACTIVO: Aplicando auto-reparaciones seguras...');
    const fixableFindings = auditReport.findings.filter(f => f.autoFixable && f.repair);

    for (const finding of fixableFindings) {
      try {
        const taskRef = db.collection('tasks').doc(finding.taskId);
        const patchData = { ...finding.repair, updatedAt: new Date().toISOString(), autoRepairedBy: 'auditTaskRoleCoherenceAgent' };
        delete patchData.replaceEmail; // Si es reemplazo complejo

        await taskRef.set(patchData, { merge: true });
        repairLog.push({ taskId: finding.taskId, status: 'REPAIRED', repair: finding.repair });
        console.log(`   ✓ Tarea [${finding.taskId}]: ${finding.suggestedFix}`);
      } catch (e) {
        console.error(`   ✗ Error reparando [${finding.taskId}]: ${e.message}`);
        repairLog.push({ taskId: finding.taskId, status: 'ERROR', error: e.message });
      }
    }
  }

  // Registrar en audit_logs de Firestore si hay conexión
  if (firestoreConnected && db) {
    try {
      await db.collection('audit_logs').add({
        action: 'TASK_ROLE_COHERENCE_AUDIT',
        timestamp: auditReport.timestamp,
        healthScore: auditReport.healthScore,
        status: auditReport.status,
        findingsCount: auditReport.findingsCount,
        summary: auditReport.findingsSummary,
        repairsApplied: repairLog.length,
        agent: 'auditTaskRoleCoherenceAgent.mjs'
      });
    } catch (e) {
      console.warn(`No se pudo persistir bitácora en Firestore: ${e.message}`);
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify({ ...auditReport, repairLog }, null, 2));
    return auditReport;
  }

  // Resumen visual para terminal
  console.log(`\n================================================================`);
  console.log(`🛡️ REPORTE DE AUDITORÍA: COHERENCIA DE TAREAS Y ROLES`);
  console.log(`================================================================`);
  console.log(`📅 Timestamp: ${auditReport.timestamp}`);
  console.log(`👥 Usuarios auditados: ${auditReport.totalUsersAudited}`);
  console.log(`📋 Tareas auditadas:   ${auditReport.totalTasksAudited}`);
  console.log(`✅ Tareas conformes:   ${auditReport.compliantTasksCount}`);
  console.log(`⚠️ Tareas con alerta:  ${auditReport.incoherentTasksCount}`);
  console.log(`❌ Tareas rotas/malf:  ${auditReport.brokenTasksCount}`);
  console.log(`\n🏆 SALUD OPERATIVA:    ${auditReport.healthScore} / 100 [${auditReport.status}]`);
  console.log(`----------------------------------------------------------------`);
  console.log(`Hallazgos por severidad:`);
  console.log(`  • CRÍTICA: ${auditReport.findingsSummary.critical}`);
  console.log(`  • ALTA:    ${auditReport.findingsSummary.high}`);
  console.log(`  • MEDIA:   ${auditReport.findingsSummary.medium}`);
  console.log(`  • BAJA:    ${auditReport.findingsSummary.low}`);

  if (auditReport.findings.length > 0) {
    console.log(`\n🔍 DETALLE DE LOS PRINCIPALES HALLAZGOS (Top 10):`);
    const topFindings = auditReport.findings.slice(0, 10);
    for (const f of topFindings) {
      const badge = f.severity === SEVERITY.CRITICAL ? '🛑' : f.severity === SEVERITY.HIGH ? '🔴' : '🟡';
      console.log(`\n${badge} [${f.code}] (${f.severity}) - Tarea: ${f.taskId} ("${f.taskTitle}")`);
      if (f.userEmail) console.log(`   👤 Asignatario: ${f.userName || ''} <${f.userEmail}>`);
      console.log(`   💬 ${f.message}`);
      if (f.suggestedFix) console.log(`   💡 Sugerencia: ${f.suggestedFix}`);
    }
    if (auditReport.findings.length > 10) {
      console.log(`\n... y ${auditReport.findings.length - 10} hallazgos más.`);
    }
  } else {
    console.log(`\n🎉 100% DE COHERENCIA: Todas las tareas operativas están funcionando y coinciden con los perfiles y roles de los usuarios.`);
  }

  console.log(`================================================================\n`);
  return auditReport;
}

// Ejecución CLI directa
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const autoFix = args.includes('--fix');
  const jsonOutput = args.includes('--json');
  const userArg = args.find(a => a.startsWith('--user='));
  const filterUser = userArg ? userArg.split('=')[1] : null;
  const roleArg = args.find(a => a.startsWith('--role='));
  const filterRole = roleArg ? roleArg.split('=')[1] : null;

  runTaskRoleCoherenceAgent({ autoFix, filterUser, filterRole, jsonOutput })
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal audit error:', err);
      process.exit(1);
    });
}
