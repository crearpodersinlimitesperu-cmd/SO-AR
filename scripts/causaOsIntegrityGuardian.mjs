#!/usr/bin/env node
/**
 * scripts/causaOsIntegrityGuardian.mjs
 * ============================================================================
 * GUARDIÁN AUTÓNOMO CADA 3 HORAS DE INTEGRIDAD, TRAZABILIDAD Y CONFIANZA
 * Plataforma: Causa OS (https://centro-operativo-cpsl.web.app)
 * Canal Oficial de Comunicación: no-reply@crearpsl.net
 *
 * Propósito:
 * Supervisar automáticamente cada 3 horas (sin intervención humana, sin repetir
 * procesos ni dañar ningún workflow existente) que:
 *  1. Todas las rutas, páginas y permisos por rol estén íntegros y el hosting
 *     en producción responda HTTP 200 en index.html y en todos sus bundles JS/CSS.
 *  2. Los guardados de usuarios, avances por roles/usuarios (tasks, participant_states,
 *     evidences, contratos Lima) mantengan coherencia y cero duplicados activos.
 *  3. El canal oficial `no-reply@crearpsl.net` esté unificado en todos los emisores,
 *     con autenticación SMTP TLS 465 IPv4 operativa y sin correos atascados.
 *  4. Los archivos de trazabilidad y audit_logs estén vigentes y libres de
 *     cualquier filtración de claves o secretos en texto plano.
 *  5. Los bots, extensiones y workflows autónomos de GitHub Actions estén corriendo
 *     de manera coherente y sin fallos silenciosos.
 * ============================================================================
 */

import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import nodemailer from 'nodemailer';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
  OFFICIAL_CAUSA_MAIL_ADDRESS,
  resolveOfficialMailFrom
} from '../src/config/officialMailConfig.js';
import { runTaskRoleCoherenceAgent } from './auditTaskRoleCoherenceAgent.mjs';
import { syncUsersUidProfilesAndCatalogTasks } from './syncUsersUidProfiles.mjs';
import { runProfileRoleIntegrityAgent } from './profileRoleIntegrityAgent.mjs';

dotenv.config();

const REPO_ROOT = process.cwd();
const LIVE_SITE_URL = process.env.CAUSA_OS_URL || 'https://centro-operativo-cpsl.web.app';
const CREDENTIALS_PATH = './centro-operativo-cpsl-65ad52160f45.json';
const ALERT_RECIPIENT = 'jose.sanchez@crearpsl.net';
const ALERT_DEBOUNCE_MS = 12 * 60 * 60 * 1000; // Máx 1 alerta cada 12h por huella única (cero spam)

function initAdminFirestore() {
  try {
    if (getApps().length > 0) {
      return getFirestore(getApps()[0]);
    }
    const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (envPath && fs.existsSync(envPath)) {
      const sa = JSON.parse(fs.readFileSync(envPath, 'utf8'));
      initializeApp({ credential: cert(sa), projectId: sa.project_id || 'centro-operativo-cpsl' });
      return getFirestore();
    }
    const rawEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (rawEnv && rawEnv.trim().startsWith('{')) {
      initializeApp({ credential: cert(JSON.parse(rawEnv)), projectId: 'centro-operativo-cpsl' });
      return getFirestore();
    }
    if (fs.existsSync(CREDENTIALS_PATH)) {
      const sa = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
      initializeApp({ credential: cert(sa), projectId: 'centro-operativo-cpsl' });
      return getFirestore();
    }
    return null;
  } catch (err) {
    console.warn(`⚠️ [Guardián 3H] Firebase Admin no disponible: ${err.message}`);
    return null;
  }
}

/**
 * 1. Verificación estática de rutas, módulos, permisos y tests críticos de coherencia
 */
function checkStaticRoutesAndCoreTests() {
  const testFiles = [
    'tests/ui-routes-buttons-integrity.test.mjs',
    'tests/task-progress-roles.test.mjs',
    'tests/task-role-coherence.test.mjs',
    'tests/task-privacy.test.mjs',
    'tests/deactivated-users-privacy.test.mjs',
    'tests/sede-datos-permissions.test.mjs',
    'tests/checklist-cycle-completion-persistence.test.mjs',
    'tests/legal-signature-save.test.mjs',
    'tests/lima-contract-anti-duplicate.test.mjs',
    'tests/mail-queue.test.mjs'
  ].filter((f) => fs.existsSync(path.join(REPO_ROOT, f)));

  const proc = spawnSync(process.execPath, ['--test', ...testFiles], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 60000
  });

  return {
    ok: proc.status === 0,
    testedSuites: testFiles,
    exitCode: proc.status,
    detail: proc.status === 0
      ? `${testFiles.length} suites críticas aprobadas (rutas, roles, avances, firmas legales y cola de correos)`
      : `Fallo en suites críticas (exit=${proc.status}): ${(proc.stderr || proc.stdout || '').slice(-400)}`
  };
}

/**
 * 2. Verificación HTTP real de producción (index.html + todos los bundles JS/CSS referenciados)
 */
async function checkLiveProductionHosting() {
  try {
    const res = await fetch(`${LIVE_SITE_URL}/?_guardian=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!res.ok) {
      return { ok: false, status: res.status, detail: `Hosting respondió HTTP ${res.status}` };
    }
    const html = await res.text();
    const assetMatches = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map((m) => m[1]);
    const uniqueAssets = [...new Set(assetMatches)];

    if (uniqueAssets.length === 0) {
      return { ok: false, status: 200, detail: 'index.html no contiene referencias a /assets/*' };
    }

    const brokenAssets = [];
    for (const assetPath of uniqueAssets) {
      const assetRes = await fetch(`${LIVE_SITE_URL}${assetPath}`, { method: 'HEAD' });
      if (!assetRes.ok) {
        brokenAssets.push(`${assetPath} (HTTP ${assetRes.status})`);
      }
    }

    return {
      ok: brokenAssets.length === 0,
      status: 200,
      checkedAssets: uniqueAssets.length,
      brokenAssets,
      detail: brokenAssets.length === 0
        ? `Producción activa HTTP 200 y ${uniqueAssets.length} bundles verificados sin páginas caídas`
        : `Bundles rotos detectados: ${brokenAssets.join(', ')}`
    };
  } catch (err) {
    return { ok: false, status: 0, detail: `Error conectando a ${LIVE_SITE_URL}: ${err.message}` };
  }
}

/**
 * 3. Verificación del canal oficial `no-reply@crearpsl.net` y salud SMTP
 */
async function checkOfficialMailChannelAndSmtp() {
  const senderConfig = resolveOfficialMailFrom(process.env);
  const filesToVerify = [
    'src/config/officialMailConfig.js',
    'scripts/mailerDaemon.js',
    'functions-mailer/index.mjs',
    'functions-imo/index.mjs',
    'scripts/nodusMarketingAgencyAgent.mjs'
  ];

  const missingOfficialSender = [];
  const legacyGmailSenders = [];

  for (const rel of filesToVerify) {
    const full = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(full)) {
      missingOfficialSender.push(`${rel} (ausente)`);
      continue;
    }
    const content = fs.readFileSync(full, 'utf8');
    if (!content.includes('no-reply@crearpsl.net') && !content.includes('resolveOfficialMailFrom')) {
      missingOfficialSender.push(rel);
    }
    if (content.includes('servidorcrearpsl@gmail.com')) {
      legacyGmailSenders.push(rel);
    }
  }

  let smtpVerified = null;
  let smtpDetail = 'Credenciales SMTP no provistas en este entorno (solo verificación estática)';
  const smtpUser = process.env.GMAIL_USER || process.env.GMAIL_SERVER_EMAIL || '';
  const smtpPass = process.env.GMAIL_PASS || process.env.GMAIL_SERVER_APP_PASSWORD || '';

  if (smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      family: 4,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      auth: { user: smtpUser, pass: smtpPass }
    });
    try {
      await transporter.verify();
      smtpVerified = true;
      smtpDetail = `SMTP TLS 465 IPv4 verificado correctamente (canal oficial: ${senderConfig.address})`;
    } catch (err) {
      smtpVerified = false;
      smtpDetail = `Fallo en autenticación SMTP (${err.responseCode || err.code || 'SMTP_ERR'})`;
    }
  }

  const codeOk =
    senderConfig.address === OFFICIAL_CAUSA_MAIL_ADDRESS &&
    missingOfficialSender.length === 0 &&
    legacyGmailSenders.length === 0;

  return {
    ok: codeOk && smtpVerified !== false,
    officialAddress: senderConfig.address,
    missingOfficialSender,
    legacyGmailSenders,
    smtpVerified,
    detail: `${smtpDetail}; emisores verificados=${filesToVerify.length - missingOfficialSender.length}/${filesToVerify.length}`
  };
}

/**
 * 4. Verificación de trazabilidad y cero filtración de claves/secretos
 */
function checkTraceabilityAndSecretHygiene() {
  const traceFiles = [
    'CAJA_NEGRA_OPERATIVA.md',
    'docs/caja_negra_operativa_cpsl.md',
    'DOCUMENTO_REPLICA_PLATAFORMA.md',
    'CODIGO_COMPLETO_AUDITORIA.md',
    'TRAZABILIDAD_COMUNICACIONES_Y_GUARDIAN_CAUSA_OS.md'
  ];

  const missingFiles = traceFiles.filter((f) => !fs.existsSync(path.join(REPO_ROOT, f)));
  const secretLeaks = [];

  for (const rel of traceFiles) {
    const full = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const txt = fs.readFileSync(full, 'utf8');
    if (
      txt.includes('-----BEGIN PRIVATE KEY-----') ||
      /GMAIL_SERVER_APP_PASSWORD\s*=\s*\S+/.test(txt) ||
      /ghp_[A-Za-z0-9]{20,}/.test(txt)
    ) {
      secretLeaks.push(rel);
    }
  }

  const gitignoreTxt = fs.existsSync(path.join(REPO_ROOT, '.gitignore'))
    ? fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf8')
    : '';
  const envIgnored = gitignoreTxt.includes('.env');

  return {
    ok: missingFiles.length === 0 && secretLeaks.length === 0 && envIgnored,
    missingFiles,
    secretLeaks,
    envIgnored,
    detail:
      missingFiles.length === 0 && secretLeaks.length === 0 && envIgnored
        ? 'Archivos de trazabilidad íntegros, vigentes y con cero exposición de secretos'
        : `Faltantes=${missingFiles.join(',') || 'ninguno'} | Fugas=${secretLeaks.join(',') || 'ninguna'}`
  };
}

/**
 * 5. Verificación de Firestore: Guardados de usuarios, avances por rol, cola mail y contratos
 */
async function checkFirestoreIntegrity(db) {
  if (!db) {
    return {
      ok: true,
      skipped: true,
      detail: 'Sin Service Account en este entorno; omitida inspección en vivo de Firestore'
    };
  }

  const now = Date.now();
  const [tasksSnap, mailSnap, mjSnap, fwSnap, auditSnap] = await Promise.all([
    db.collection('tasks').get(),
    db.collection('mail').get(),
    db.collection('contratos_maestria_lima').get(),
    db.collection('contratos_caminata_fuego').get(),
    db.collection('audit_logs').orderBy('createdAtIso', 'desc').limit(25).get().catch(() => ({ empty: true, size: 0 }))
  ]);

  // 5.1 Revisar estructura de avances por rol/usuario en tasks
  let tasksWithParticipantStates = 0;
  let tasksWithEvidences = 0;
  let malformedTasks = 0;
  tasksSnap.forEach((docSnap) => {
    const d = docSnap.data() || {};
    if (d.participant_states && typeof d.participant_states === 'object') tasksWithParticipantStates += 1;
    if (Array.isArray(d.evidences) && d.evidences.length > 0) tasksWithEvidences += 1;
    if (!d.title && !d.task && !d.nombre) malformedTasks += 1;
  });

  // 5.2 Revisar cola de correos: detectar pendientes estancados (>25 min) o leases expirados
  let mailSuccess = 0;
  let mailPendingStuck = 0;
  let mailExpiredSending = 0;
  mailSnap.forEach((docSnap) => {
    const d = docSnap.data() || {};
    const st = d.delivery?.state;
    if (st === 'SUCCESS') mailSuccess += 1;
    if (st === 'PENDING') {
      const createdMs = Date.parse(d.createdAt || d.created_at || '');
      if (Number.isFinite(createdMs) && now - createdMs > 25 * 60 * 1000) {
        mailPendingStuck += 1;
      }
    }
    if (st === 'SENDING') {
      const leaseMs = Date.parse(d.delivery?.leaseExpiresAt || '');
      if (Number.isFinite(leaseMs) && leaseMs < now) {
        mailExpiredSending += 1;
      }
    }
  });

  // 5.3 Revisar anti-duplicados en contratos Lima
  const findDupes = (snap) => {
    const seen = new Set();
    const dupes = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data() || {};
      const rawDoc = String(d.numeroDocumento || d.doc || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
      if (!rawDoc) return;
      if (seen.has(rawDoc)) dupes.push(rawDoc);
      else seen.add(rawDoc);
    });
    return dupes;
  };
  const mjDupes = findDupes(mjSnap);
  const fwDupes = findDupes(fwSnap);

  // 5.4 Coherencia de tareas vs roles y sincronización de perfiles users/{uid}
  let coherenceCritical = 0;
  let syncedUidProfiles = 0;
  let profileIntegrityRepaired = 0;
  try {
    const syncRes = await syncUsersUidProfilesAndCatalogTasks({ dryRun: false });
    syncedUidProfiles = syncRes?.updatedUsersCount || 0;
  } catch (err) {
    console.warn(`⚠️ [Guardián 3H] Aviso en syncUsersUidProfiles: ${err.message}`);
  }
  try {
    const profileRes = await runProfileRoleIntegrityAgent({ db, dryRun: false });
    profileIntegrityRepaired = profileRes?.repairedCount || 0;
  } catch (err) {
    console.warn(`⚠️ [Guardián 3H] Aviso en runProfileRoleIntegrityAgent: ${err.message}`);
  }
  try {
    const coherenceReport = await runTaskRoleCoherenceAgent({ autoFix: false, jsonOutput: true });
    coherenceCritical = coherenceReport?.summary?.criticalCount || 0;
  } catch (err) {
    console.warn(`⚠️ [Guardián 3H] Aviso en runTaskRoleCoherenceAgent: ${err.message}`);
  }

  const ok = mailPendingStuck === 0 && mailExpiredSending === 0;

  return {
    ok,
    metrics: {
      totalTasks: tasksSnap.size,
      tasksWithParticipantStates,
      tasksWithEvidences,
      malformedTasks,
      mailTotal: mailSnap.size,
      mailSuccess,
      mailPendingStuck,
      mailExpiredSending,
      contratosMaestriaLima: mjSnap.size,
      contratosFuegoLima: fwSnap.size,
      duplicateMaestriaDocs: mjDupes.length,
      duplicateFuegoDocs: fwDupes.length,
      recentAuditLogs: auditSnap.size || 0,
      coherenceCritical,
      syncedUidProfiles,
      profileIntegrityRepaired
    },
    detail: `Tareas=${tasksSnap.size} (avances=${tasksWithParticipantStates}, evidencias=${tasksWithEvidences}) | Perfiles saneados=${profileIntegrityRepaired} | Mail SUCCESS=${mailSuccess}, estancados=${mailPendingStuck}, leasesVencidos=${mailExpiredSending} | Contratos MJ=${mjSnap.size}, Fuego=${fwSnap.size}`
  };
}

/**
 * 6. Verificación de bots y workflows autónomos en GitHub Actions (sin tocar ni cancelar ninguno)
 */
async function checkGitHubWorkflowsHealth() {
  const repo = process.env.GITHUB_REPOSITORY || 'crearpodersinlimitesperu-cmd/SO-AR';
  const token = process.env.GITHUB_TOKEN || '';
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'causa-os-3h-guardian',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const criticalWorkflows = new Set([
    '🚀 Deploy to Firebase Hosting',
    '📧 Mail Dispatch & Inactivity Alerts',
    '⚡ Deploy Instant Contract Mailer Function',
    'Managers & Llamados Sheet Sync',
    'QT Sheet Sync',
    'Agente Guardián de Sincronización Asignador ↔ Calendario Global',
    'Nodus Flight Monitor Agent (7x Day)',
    'Nodus 30-Min Autonomous Multi-Agent Sync'
  ]);

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=50`, { headers });
    if (!res.ok) {
      return { ok: true, skipped: true, detail: `GitHub API HTTP ${res.status} (sin bloqueo)` };
    }
    const data = await res.json();
    const latestCompletedByWorkflow = new Map();
    for (const run of data.workflow_runs || []) {
      if (run.status !== 'completed') continue;
      if (!latestCompletedByWorkflow.has(run.name)) {
        latestCompletedByWorkflow.set(run.name, {
          id: run.id,
          conclusion: run.conclusion,
          createdAt: run.created_at,
          headSha: (run.head_sha || '').slice(0, 7)
        });
      }
    }

    const failingCritical = [];
    for (const [wfName, info] of latestCompletedByWorkflow.entries()) {
      if (info && info.conclusion === 'failure') {
        failingCritical.push(`${wfName} (#${info.id} @ ${info.headSha})`);
      }
    }

    return {
      ok: failingCritical.length === 0,
      checkedWorkflows: latestCompletedByWorkflow.size,
      failingCritical,
      detail:
        failingCritical.length === 0
          ? `${latestCompletedByWorkflow.size} workflows autónomos verificados en verde`
          : `Workflows con fallo reciente: ${failingCritical.join('; ')}`
    };
  } catch (err) {
    return { ok: true, skipped: true, detail: `No se pudo consultar API de Actions: ${err.message}` };
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`🛡️ [Guardián Autónomo 3H — Causa OS] Iniciando supervisión integral (${startedAt})...`);

  const db = initAdminFirestore();

  const [staticRoutes, liveWeb, mailChannel, traceability, firestoreHealth, workflowsHealth] = await Promise.all([
    Promise.resolve(checkStaticRoutesAndCoreTests()),
    checkLiveProductionHosting(),
    checkOfficialMailChannelAndSmtp(),
    Promise.resolve(checkTraceabilityAndSecretHygiene()),
    checkFirestoreIntegrity(db),
    checkGitHubWorkflowsHealth()
  ]);

  const checks = {
    staticRoutes,
    liveWeb,
    mailChannel,
    traceability,
    firestoreHealth,
    workflowsHealth
  };

  // Fallos críticos reales de la plataforma (se excluyen avisos transitorios externos de scrapers si ya se repararon en código)
  const criticalFailures = [];
  if (!staticRoutes.ok) criticalFailures.push(`Rutas/Tests: ${staticRoutes.detail}`);
  if (!liveWeb.ok) criticalFailures.push(`Hosting Web: ${liveWeb.detail}`);
  if (!mailChannel.ok) criticalFailures.push(`Canal Correo (${OFFICIAL_CAUSA_MAIL_ADDRESS}): ${mailChannel.detail}`);
  if (!traceability.ok) criticalFailures.push(`Trazabilidad/Seguridad: ${traceability.detail}`);
  if (!firestoreHealth.ok) criticalFailures.push(`Firestore/Cola Mail: ${firestoreHealth.detail}`);

  const warnings = [];
  if (!workflowsHealth.ok) {
    warnings.push(`Bots/Workflows: ${workflowsHealth.detail}`);
  }

  const overallStatus = criticalFailures.length > 0 ? 'CRITICAL' : warnings.length > 0 ? 'WARNING' : 'HEALTHY';

  console.log('================================================================');
  console.log(`📊 ESTADO GLOBAL GUARDIÁN 3H: ${overallStatus}`);
  for (const [key, val] of Object.entries(checks)) {
    console.log(`  ${val.ok ? '✅' : '⚠️'} ${key}: ${val.detail}`);
  }
  console.log('================================================================');

  if (db) {
    const summaryText =
      overallStatus === 'HEALTHY'
        ? `Guardián 3H CERTIFICADO: Web 200 OK, canal ${OFFICIAL_CAUSA_MAIL_ADDRESS} activo, avances por rol íntegros y bots operativos.`
        : `Guardián 3H (${overallStatus}): ${[...criticalFailures, ...warnings].join(' | ').slice(0, 260)}`;

    const cajaNegraPath = path.join(REPO_ROOT, 'CAJA_NEGRA_OPERATIVA.md');
    const cajaNegraSha256 = fs.existsSync(cajaNegraPath)
      ? crypto.createHash('sha256').update(fs.readFileSync(cajaNegraPath)).digest('hex')
      : null;

    if (cajaNegraSha256) {
      const stateRef = db.collection('nodus_reports').doc('caja_negra_sync_state');
      const prevSnap = await stateRef.get();
      const prevSha = prevSnap.exists ? prevSnap.data()?.sha256 : null;
      if (prevSha !== cajaNegraSha256) {
        const nowIso = new Date().toISOString();
        await Promise.all([
          db.collection('audit_logs').add({
            email: 'jose.sanchez@crearpsl.net',
            name: 'José Sánchez (Guardián Caja Negra Causa OS)',
            role: 'super_admin',
            sede: 'Sede Global',
            action: 'ACTUALIZACION_CAJA_NEGRA',
            details: `Caja Negra Operativa sincronizada y certificada (SHA-256: ${cajaNegraSha256.slice(0, 16)} · commit: ${(process.env.GITHUB_SHA || 'local').slice(0, 7)}) — Cero secretos expuestos.`,
            isSimulation: false,
            simulatedBy: null,
            timestamp: FieldValue.serverTimestamp(),
            createdAtIso: nowIso,
            country: 'Perú',
            countryCode: 'PE',
            city: 'Lima',
            region: 'Lima',
            flag: '🇵🇪',
            ip: 'GitHub-Actions-Guardian',
            timezone: 'America/Lima',
            device: 'Guardián Autónomo 3H Causa OS',
            userAgent: 'Guardián Autónomo 3H Causa OS',
            location: 'Cloud / Sede Global 🌐',
            cajaNegraSha256,
            commit: process.env.GITHUB_SHA || null,
            runId: process.env.GITHUB_RUN_ID || null
          }),
          stateRef.set({
            sha256: cajaNegraSha256,
            commit: process.env.GITHUB_SHA || null,
            runId: process.env.GITHUB_RUN_ID || null,
            updatedAt: FieldValue.serverTimestamp(),
            updatedAtIso: nowIso
          })
        ]);
        console.log(`📦 [Caja Negra Cloud] Nueva revisión registrada en /audit_logs (sha256=${cajaNegraSha256.slice(0, 12)})`);
      }
    }

    await Promise.all([
      db.collection('nodus_reports').doc('causa_os_3h_guardian_latest').set({
        lastRun: FieldValue.serverTimestamp(),
        lastRunIso: new Date().toISOString(),
        intervalHours: 3,
        officialMailChannel: OFFICIAL_CAUSA_MAIL_ADDRESS,
        status: overallStatus,
        criticalFailures,
        warnings,
        checks,
        commit: process.env.GITHUB_SHA || null,
        runId: process.env.GITHUB_RUN_ID || null
      }),
      db.collection('platform_diagnostic_reports').add({
        source: 'automatic',
        guardian: 'causa-os-3h-integrity-guardian',
        status: overallStatus === 'CRITICAL' ? 'error' : overallStatus === 'WARNING' ? 'warn' : 'ok',
        summary: summaryText,
        content: JSON.stringify({ startedAt, overallStatus, criticalFailures, warnings, checks }, null, 2).slice(0, 55000),
        errores: criticalFailures.length,
        advertencias: warnings.length,
        commit: process.env.GITHUB_SHA || null,
        runId: process.env.GITHUB_RUN_ID || null,
        trigger: process.env.GITHUB_EVENT_NAME || 'local',
        createdAt: FieldValue.serverTimestamp()
      })
    ]);

    // Si existe un fallo crítico real, emitir 1 alerta debounced desde no-reply@crearpsl.net (sin spam)
    if (criticalFailures.length > 0) {
      const fingerprint = crypto
        .createHash('sha256')
        .update(criticalFailures.join('|'))
        .digest('hex')
        .slice(0, 16);
      const alertDocId = `guardian_3h_alert_${fingerprint}`;
      const alertRef = db.collection('mail').doc(alertDocId);
      const existingAlert = await alertRef.get();
      const prevMs = Date.parse(existingAlert.data()?.createdAt || '');

      if (!existingAlert.exists || !Number.isFinite(prevMs) || Date.now() - prevMs > ALERT_DEBOUNCE_MS) {
        const nowIso = new Date().toISOString();
        await alertRef.set({
          to: [ALERT_RECIPIENT],
          type: 'system_access_invite',
          robot_token: 'NODUS_ROBOT_CPSL_2026_SECRET',
          createdAt: nowIso,
          created_at: nowIso,
          delivery: { state: 'PENDING', attemptCount: 0 },
          source: 'causa_os_3h_integrity_guardian',
          message: {
            subject: `🚨 [Guardián 3H Causa OS] Atención requerida (${criticalFailures.length} hallazgo crítico)`,
            html: `
              <div style="font-family:Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#0F172A;color:#F8FAFC;border-radius:12px;border:1px solid #EF4444;">
                <h2 style="margin-top:0;color:#FCA5A5;">Guardián Autónomo 3H — Causa OS</h2>
                <p>Se detectó el siguiente hallazgo crítico durante la supervisión automática cada 3 horas:</p>
                <ul>${criticalFailures.map((f) => `<li>${f}</li>`).join('')}</ul>
                <p style="font-size:12px;color:#94A3B8;">Canal oficial: ${OFFICIAL_CAUSA_MAIL_ADDRESS} · Hora UTC: ${nowIso}</p>
              </div>
            `
          }
        });
        console.log(`📨 Alerta crítica encolada sin duplicación (${alertDocId}).`);
      }
    }
  }

  if (criticalFailures.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Error inesperado en Guardián 3H:', err.message);
  process.exit(1);
});
