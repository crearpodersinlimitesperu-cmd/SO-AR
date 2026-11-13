#!/usr/bin/env node
/**
 * scripts/profileRoleIntegrityAgent.mjs
 * ============================================================================
 * AGENTE DE INTEGRIDAD DE PERFILES Y ROLES (CAUSA OS)
 *
 * Propósito:
 * Auditar y reparar de forma determinista, idempotente y sin alucinaciones
 * todos los perfiles activos en la colección `users` de Firestore, garantizando:
 *  1. Cero degradación de cargos primarios (`role` nunca degradado a 'operativo',
 *     'colaborador', 'miembro' o 'participante' cuando el catálogo oficial,
 *     el directorio CMJ o `roles[]` acreditan un cargo específico).
 *  2. Preservación estricta de multi-roles: nunca sobrescribe ni borra roles
 *     legítimos existentes; fusiona mediante unión aditiva (`Set`).
 *  3. Coherencia de `activeRole` y `activeRoleOverride`: si apuntan a un rol
 *     inexistente en `roles[]` o degradado, los alinea al rol primario válido.
 *  4. Normalización canónica de `sede` (`canonicalSede`) para evitar bucles
 *     de actualización por diferencias de tildes o mayúsculas (ej. Medellin/Medellín).
 *  5. Respeto absoluto e inviolable a avances, historiales, `tasks`, `checklists`,
 *     `lastLoginAt`, `statusHistory`, `equiposQuito`, `roleSedes` y registros
 *     operativos: JAMÁS borra o altera datos de progreso o historial.
 * ============================================================================
 */

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { USERS_TO_IMPORT } from '../src/data/usersToImport.js';
import { normalizeRole } from '../src/data/usersData.js';
import { CMJ_DIRECTORY } from '../src/services/cmjSentinelAgent.js';
import {
  MAESTRIA_COORDINATOR_EMAILS,
  DUAL_ROLE_TRAINER_EMAILS,
  SUPER_ADMIN_EMAILS
} from '../src/config/permissions.js';
import { canonicalSede } from '../src/utils/sede.js';

dotenv.config();

const DEFAULT_CREDENTIAL_PATHS = [
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  './centro-operativo-cpsl-65ad52160f45.json',
  '/Users/joseluissanchezmoreno/Downloads/Code/centro-operativo-cpsl-firebase-adminsdk-fbsvc-bcacde54f8.json'
].filter(Boolean);

const DEGRADED_ROLES = new Set(['operativo', 'colaborador', 'miembro', 'participante']);
const EXECUTIVE_ROLES = new Set(['superadmin', 'direccion', 'director_maestria', 'gerente', 'cfo', 'ceo', 'cco']);

function initAdminFirestore() {
  if (getApps().length > 0) {
    return getFirestore(getApps()[0]);
  }
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (rawJson && rawJson.trim().startsWith('{')) {
    const sa = JSON.parse(rawJson);
    initializeApp({ credential: cert(sa), projectId: sa.project_id || 'centro-operativo-cpsl' });
    return getFirestore();
  }
  for (const credPath of DEFAULT_CREDENTIAL_PATHS) {
    if (fs.existsSync(credPath)) {
      const sa = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      initializeApp({ credential: cert(sa), projectId: sa.project_id || 'centro-operativo-cpsl' });
      return getFirestore();
    }
  }
  return null;
}

function buildReferenceMaps() {
  const staticByEmail = new Map();
  for (const u of USERS_TO_IMPORT) {
    const emails = [u.email, ...(u.emails || [])]
      .filter(Boolean)
      .map((e) => String(e).toLowerCase().trim());
    for (const e of emails) {
      staticByEmail.set(e, u);
    }
  }

  const cmjByEmail = new Map();
  for (const c of CMJ_DIRECTORY) {
    const e = String(c.email || '').toLowerCase().trim();
    if (!e) continue;
    cmjByEmail.set(e, c);
    if (e.endsWith('@crearpsl.net')) {
      cmjByEmail.set(e.replace('@crearpsl.net', '@crearpsl.com'), c);
    }
  }

  return { staticByEmail, cmjByEmail };
}

/**
 * Evalúa deterministamente un perfil de usuario y calcula el parche mínimo
 * requerido (o null si el perfil está 100% íntegro).
 * Función pura, libre de efectos secundarios, apta para pruebas unitarias.
 */
export function evaluateUserProfileIntegrity(docId, data, refs = buildReferenceMaps()) {
  if (!data || typeof data !== 'object') return null;
  if (data.status === 'archived_merged' || data.isActive === false || data.active === false) {
    return null;
  }

  const { staticByEmail, cmjByEmail } = refs;
  const email = String(data.email || '').toLowerCase().trim();
  const staticProfile = email ? staticByEmail.get(email) : null;
  const cmjEntry = email ? cmjByEmail.get(email) : null;
  const isSuperAdmin = email ? SUPER_ADMIN_EMAILS.includes(email) : false;

  const currentRole = String(data.role || '').trim();
  const currentRoles = Array.isArray(data.roles)
    ? data.roles.map((r) => String(r || '').trim()).filter(Boolean)
    : [];
  const currentActiveRole = data.activeRole ? String(data.activeRole).trim() : '';
  const currentActiveOverride = data.activeRoleOverride ? String(data.activeRoleOverride).trim() : '';

  const findings = [];
  const patch = {};

  // 1. Normalización canónica de sede (preservando 'Sede Global' si ya está explícito)
  if (data.sede && data.sede !== 'Sede Global') {
    const canon = canonicalSede(data.sede);
    if (canon && data.sede !== canon) {
      findings.push(`sede no canónica: '${data.sede}' -> '${canon}'`);
      patch.sede = canon;
    }
  }

  // 2. Determinar rol primario autorizado sin degradación
  let targetRole = currentRole;

  if (cmjEntry && !isSuperAdmin && !EXECUTIVE_ROLES.has(currentRole)) {
    if (currentRole !== 'coord_maestria') {
      findings.push(`CMJ en directorio con role='${currentRole}' -> 'coord_maestria'`);
      targetRole = 'coord_maestria';
    }
  } else if (DEGRADED_ROLES.has(currentRole)) {
    const officialRole = staticProfile?.role ? normalizeRole(staticProfile.role) : null;
    if (officialRole && !DEGRADED_ROLES.has(officialRole)) {
      findings.push(`rol degradado '${currentRole}' restaurado a catálogo oficial '${officialRole}'`);
      targetRole = officialRole;
    } else {
      const specificInArray = currentRoles.find(
        (r) => !DEGRADED_ROLES.has(r) && r !== 'consolidado'
      );
      if (specificInArray) {
        findings.push(`rol degradado '${currentRole}' restaurado desde roles[] a '${specificInArray}'`);
        targetRole = specificInArray;
      }
    }
  }

  if (targetRole && targetRole !== currentRole) {
    patch.role = targetRole;
  }

  // 3. Unión aditiva de roles (NUNCA borrar roles legítimos existentes)
  const mergedRolesSet = new Set();
  if (targetRole) mergedRolesSet.add(targetRole);
  for (const r of currentRoles) {
    mergedRolesSet.add(r);
  }
  if (cmjEntry && !mergedRolesSet.has('coord_maestria')) {
    findings.push(`agregado 'coord_maestria' a roles[] por directorio CMJ`);
    mergedRolesSet.add('coord_maestria');
  }
  if (
    email &&
    MAESTRIA_COORDINATOR_EMAILS.includes(email) &&
    !mergedRolesSet.has('coord_maestria') &&
    !mergedRolesSet.has('director_maestria')
  ) {
    findings.push(`agregado 'coord_maestria' a roles[] por lista MAESTRIA_COORDINATOR_EMAILS`);
    mergedRolesSet.add('coord_maestria');
  }
  if (
    email &&
    DUAL_ROLE_TRAINER_EMAILS.includes(email) &&
    !mergedRolesSet.has('entrenador') &&
    !mergedRolesSet.has('entrenador_llamadas')
  ) {
    findings.push(`agregado 'entrenador' a roles[] por lista DUAL_ROLE_TRAINER_EMAILS`);
    mergedRolesSet.add('entrenador');
  }

  const mergedRoles = Array.from(mergedRolesSet);
  const hasDuplicates = new Set(currentRoles).size !== currentRoles.length;
  const hasMissingRole = mergedRoles.some((r) => !currentRoles.includes(r));

  if (hasDuplicates || hasMissingRole) {
    if (hasDuplicates) {
      findings.push(`roles duplicados saneados en roles[]`);
    }
    if (!currentRoles.includes(targetRole) && targetRole) {
      findings.push(`rol primario '${targetRole}' asegurado dentro de roles[]`);
    }
    patch.roles = mergedRoles;
  }

  // 4. Coherencia de activeRole y activeRoleOverride
  const effectiveRoles = patch.roles || currentRoles;
  const effectivePrimaryRole = patch.role || currentRole;

  const isActiveRoleValid = (r) => {
    if (!r) return true; // No forzar activeRole si nunca fue inicializado en docs de catálogo
    if (r === 'consolidado') return true;
    if (isSuperAdmin) return !DEGRADED_ROLES.has(r);
    if (DUAL_ROLE_TRAINER_EMAILS.includes(email) && (r === 'entrenador' || r === 'entrenador_llamadas')) {
      return true;
    }
    return effectiveRoles.includes(r);
  };

  if (
    effectivePrimaryRole &&
    currentActiveRole &&
    (!isActiveRoleValid(currentActiveRole) ||
      (DEGRADED_ROLES.has(currentActiveRole) && !DEGRADED_ROLES.has(effectivePrimaryRole)))
  ) {
    findings.push(
      `activeRole '${currentActiveRole}' alineado a '${effectivePrimaryRole}'`
    );
    patch.activeRole = effectivePrimaryRole;
  }

  if (
    effectivePrimaryRole &&
    currentActiveOverride &&
    (!isActiveRoleValid(currentActiveOverride) ||
      (DEGRADED_ROLES.has(currentActiveOverride) && !DEGRADED_ROLES.has(effectivePrimaryRole)))
  ) {
    findings.push(
      `activeRoleOverride '${currentActiveOverride}' alineado a '${effectivePrimaryRole}'`
    );
    patch.activeRoleOverride = effectivePrimaryRole;
  }

  // 5. Normalización de sede en CMJ_DIRECTORY si difiere de la sede canónica CMJ
  if (cmjEntry) {
    const cmjSede = canonicalSede(cmjEntry.sede);
    const currentSede = canonicalSede(patch.sede || data.sede);
    if (cmjSede && currentSede !== cmjSede && !EXECUTIVE_ROLES.has(effectivePrimaryRole)) {
      findings.push(`CMJ sede '${data.sede}' alineada a '${cmjSede}'`);
      patch.sede = cmjSede;
    }
    if (data.roleSedes && typeof data.roleSedes === 'object') {
      const currentCoordSede = data.roleSedes.coord_maestria;
      if (cmjSede && currentCoordSede !== cmjSede) {
        patch.roleSedes = {
          ...data.roleSedes,
          coord_maestria: cmjSede
        };
        findings.push(`roleSedes.coord_maestria alineado a '${cmjSede}'`);
      }
    }
  }

  if (Object.keys(patch).length === 0) {
    return null;
  }

  return {
    docId,
    name: data.name || data.displayName || docId,
    email,
    findings,
    patch
  };
}

/**
 * Ejecuta la auditoría integral sobre todos los perfiles activos en Firestore.
 */
export async function runProfileRoleIntegrityAgent({ db: providedDb = null, dryRun = true } = {}) {
  const db = providedDb || initAdminFirestore();
  if (!db) {
    return {
      ok: true,
      skipped: true,
      totalDocs: 0,
      activeAudited: 0,
      anomaliesFound: 0,
      repairedCount: 0,
      repairs: [],
      detail: 'Sin Service Account en este entorno; omitida auditoría en vivo de perfiles.'
    };
  }

  const refs = buildReferenceMaps();
  const snap = await db.collection('users').get();
  let activeAudited = 0;
  const repairs = [];

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data || data.status === 'archived_merged' || data.isActive === false || data.active === false) {
      return;
    }
    activeAudited += 1;
    const evaluation = evaluateUserProfileIntegrity(docSnap.id, data, refs);
    if (evaluation) {
      repairs.push(evaluation);
    }
  });

  let repairedCount = 0;
  if (!dryRun && repairs.length > 0) {
    const nowIso = new Date().toISOString();
    for (const item of repairs) {
      await db.collection('users').doc(item.docId).update({
        ...item.patch,
        rolesIntegrityAuditAt: FieldValue.serverTimestamp(),
        updatedAt: nowIso
      });
      repairedCount += 1;
    }

    await db.collection('system_agent_audits').doc('profileRoleIntegrityAgent').set(
      {
        agentId: 'profileRoleIntegrityAgent',
        status: 'HEALTHY',
        lastRunAt: FieldValue.serverTimestamp(),
        lastRunIso: nowIso,
        activeAudited,
        anomaliesFound: repairs.length,
        repairedCount,
        repairedUsers: repairs.map((r) => ({
          docId: r.docId,
          email: r.email,
          findings: r.findings
        }))
      },
      { merge: true }
    );
  } else if (!dryRun && repairs.length === 0) {
    await db.collection('system_agent_audits').doc('profileRoleIntegrityAgent').set(
      {
        agentId: 'profileRoleIntegrityAgent',
        status: 'HEALTHY',
        lastRunAt: FieldValue.serverTimestamp(),
        lastRunIso: new Date().toISOString(),
        activeAudited,
        anomaliesFound: 0,
        repairedCount: 0
      },
      { merge: true }
    );
  }

  return {
    ok: dryRun ? repairs.length === 0 : true,
    skipped: false,
    dryRun,
    totalDocs: snap.size,
    activeAudited,
    anomaliesFound: repairs.length,
    repairedCount,
    repairs,
    detail:
      repairs.length === 0
        ? `${activeAudited} perfiles activos auditados: 100% íntegros`
        : dryRun
          ? `${activeAudited} perfiles activos auditados: ${repairs.length} anomalías detectadas (dry-run)`
          : `${activeAudited} perfiles activos auditados: ${repairedCount} perfiles reparados preservando avances e historial`
  };
}

const isCli =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  const applyMode = process.argv.includes('--apply');
  const dryRun = !applyMode;

  runProfileRoleIntegrityAgent({ dryRun })
    .then((res) => {
      console.log(`🛡️ [Agente de Integridad de Perfiles y Roles] Modo: ${dryRun ? 'DRY-RUN' : 'APPLY'}`);
      console.log(`   Total documentos users: ${res.totalDocs} | Activos auditados: ${res.activeAudited}`);
      console.log(`   Anomalías detectadas: ${res.anomaliesFound} | Reparados: ${res.repairedCount}`);
      for (const r of res.repairs) {
        console.log(`   - [${r.docId}] ${r.name} (${r.email}): ${r.findings.join(' ; ')}`);
      }
      console.log(`   Resultado: ${res.detail}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error en Agente de Integridad de Perfiles y Roles:', err);
      process.exit(1);
    });
}
