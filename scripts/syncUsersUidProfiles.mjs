#!/usr/bin/env node
/**
 * scripts/syncUsersUidProfiles.mjs
 * ============================================================================
 * RECONCILIADOR DE PERFILES users/{uid} Y METADATOS DE CATÁLOGO tasks/{taskId}
 *
 * Propósito:
 * 1. A-01 restringió la escritura de `role`, `roles`, `appRole` y `sede` en
 *    `users/{uid}` exclusivamente al servidor/SuperAdmin, mientras que
 *    `saveSelfProfile()` en `AuthContext.jsx` solo escribe metadatos básicos
 *    (`uid`, `email`, `name`, `displayName`, `photoURL`, `lastLoginAt`).
 * 2. Este agente de servidor (Firebase Admin SDK) sincroniza para TODOS los
 *    usuarios activos en Firebase Auth sus campos autorizados (`role`, `roles`,
 *    `appRole`, `sede`) sobre `users/{uid}`, respetando:
 *      - Cero privilegios a perfiles inactivos (`isUserInactive`).
 *      - Respeto absoluto a overrides administrativos (`rolesUpdatedBy` / `rolesUpdatedAt`).
 *      - Preservación de multi-roles legítimos (`DUAL_ROLE_TRAINER_EMAILS`, `staff_directory`, `users/slug`).
 * 3. También sanea metadatos nulos o incompletos en documentos existentes de
 *    catálogo `tasks/{taskId}` (`id` faltante, `isCustom: null`, `comments: null`,
 *    `evidenceUrl: null`, `evidences: null`, `completions: null`), SIN tocar
 *    jamás avances, completitudes, evidencias ni notas reales.
 * ============================================================================
 */

import fs from 'node:fs';
import dotenv from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { checklistData } from '../src/data/checklistData.js';
import { findUserByAnyEmail, normalizeRole, normalizeSede } from '../src/data/usersData.js';
import { DUAL_ROLE_TRAINER_EMAILS, SUPER_ADMIN_EMAILS } from '../src/config/permissions.js';
import { isUserInactive } from '../src/utils/userNormalizer.js';

dotenv.config();

const CREDENTIALS_PATH = './centro-operativo-cpsl-65ad52160f45.json';

function initAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && fs.existsSync(envPath)) {
    const sa = JSON.parse(fs.readFileSync(envPath, 'utf8'));
    return initializeApp({ credential: cert(sa), projectId: sa.project_id || 'centro-operativo-cpsl' });
  }

  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (rawJson && rawJson.trim().startsWith('{')) {
    const sa = JSON.parse(rawJson);
    return initializeApp({ credential: cert(sa), projectId: sa.project_id || 'centro-operativo-cpsl' });
  }

  if (fs.existsSync(CREDENTIALS_PATH)) {
    const sa = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    return initializeApp({ credential: cert(sa), projectId: sa.project_id || 'centro-operativo-cpsl' });
  }

  return null;
}

async function listAllAuthUsers(auth) {
  const all = [];
  let pageToken = undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    all.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return all;
}

export async function syncUsersUidProfilesAndCatalogTasks({ dryRun = false } = {}) {
  const app = initAdminApp();
  if (!app) {
    return {
      skipped: true,
      detail: 'Sin Service Account disponible en este entorno; omitida sincronización Admin SDK.'
    };
  }

  const db = getFirestore(app);
  const auth = getAuth(app);

  const [authUsers, usersSnap, staffSnap, qtSnap, tasksSnap] = await Promise.all([
    listAllAuthUsers(auth),
    db.collection('users').get(),
    db.collection('staff_directory').get(),
    db.collection('qt_directory').get(),
    db.collection('tasks').get()
  ]);

  const usersByDocId = new Map();
  const usersDocsByEmail = new Map();
  usersSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    usersByDocId.set(docSnap.id, data);
    const emails = [
      data.email,
      data.corporateEmail,
      data.personalEmail,
      ...(Array.isArray(data.emails) ? data.emails : [])
    ]
      .map((e) => String(e || '').trim().toLowerCase())
      .filter(Boolean);
    for (const em of emails) {
      if (!usersDocsByEmail.has(em)) usersDocsByEmail.set(em, []);
      usersDocsByEmail.get(em).push({ id: docSnap.id, data });
    }
  });

  const staffByEmail = new Map();
  staffSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const emails = [data.email, ...(Array.isArray(data.emails) ? data.emails : [])]
      .map((e) => String(e || '').trim().toLowerCase())
      .filter(Boolean);
    for (const em of emails) {
      if (!staffByEmail.has(em)) staffByEmail.set(em, data);
    }
  });

  const qtByEmail = new Map();
  qtSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const em = String(data.email || '').trim().toLowerCase();
    if (em && !qtByEmail.has(em)) qtByEmail.set(em, data);
  });

  const dualTrainerSet = new Set(DUAL_ROLE_TRAINER_EMAILS.map((e) => e.toLowerCase().trim()));
  const superAdminSet = new Set(SUPER_ADMIN_EMAILS.map((e) => e.toLowerCase().trim()));

  let updatedUsersCount = 0;
  let skippedInactiveCount = 0;
  let skippedAdminLockedCount = 0;
  let batch = db.batch();
  let opsInBatch = 0;

  const flushBatch = async () => {
    if (opsInBatch === 0) return;
    if (!dryRun) await batch.commit();
    batch = db.batch();
    opsInBatch = 0;
  };

  for (const authUser of authUsers) {
    const email = String(authUser.email || '').trim().toLowerCase();
    if (!email) continue;

    const uid = authUser.uid;
    const existingUidDoc = usersByDocId.get(uid) || null;

    if (existingUidDoc && (existingUidDoc.rolesUpdatedBy || existingUidDoc.rolesUpdatedAt)) {
      skippedAdminLockedCount += 1;
      continue;
    }

    const staticProfile = findUserByAnyEmail(email);
    const staffProfile = staffByEmail.get(email) || null;
    const qtProfile = qtByEmail.get(email) || null;
    const relatedDocs = usersDocsByEmail.get(email) || [];

    if (
      (staticProfile && isUserInactive(staticProfile)) ||
      (existingUidDoc && isUserInactive(existingUidDoc)) ||
      (staffProfile && isUserInactive(staffProfile))
    ) {
      skippedInactiveCount += 1;
      continue;
    }

    const discoveredRoles = new Set();
    const addCleanRole = (raw) => {
      if (!raw || raw === 'undefined' || raw === 'null' || raw === 'student') return;
      const norm = normalizeRole(String(raw));
      if (norm && norm !== 'inactivo' && norm !== 'student') discoveredRoles.add(norm);
    };

    if (staticProfile) {
      if (staticProfile.role) addCleanRole(staticProfile.role);
      if (Array.isArray(staticProfile.roles)) staticProfile.roles.forEach(addCleanRole);
    }
    if (existingUidDoc) {
      if (existingUidDoc.role) addCleanRole(existingUidDoc.role);
      if (existingUidDoc.rol) addCleanRole(existingUidDoc.rol);
      if (existingUidDoc.appRole && existingUidDoc.appRole !== 'consolidado') addCleanRole(existingUidDoc.appRole);
      if (Array.isArray(existingUidDoc.roles)) existingUidDoc.roles.forEach(addCleanRole);
    }
    for (const rel of relatedDocs) {
      if (isUserInactive(rel.data)) continue;
      if (rel.data.role) addCleanRole(rel.data.role);
      if (Array.isArray(rel.data.roles)) rel.data.roles.forEach(addCleanRole);
    }
    if (staffProfile) {
      if (staffProfile.role) addCleanRole(staffProfile.role);
      if (Array.isArray(staffProfile.roles)) staffProfile.roles.forEach(addCleanRole);
    }
    if (qtProfile && discoveredRoles.size === 0) {
      discoveredRoles.add('qt');
    }
    if (dualTrainerSet.has(email)) {
      discoveredRoles.add('entrenador');
    }

    // Purgar 'coordinador' genérico si existe cargo operativo específico
    if (
      discoveredRoles.has('coord_c1') ||
      discoveredRoles.has('coord_maestria') ||
      discoveredRoles.has('director_maestria') ||
      discoveredRoles.has('gerente') ||
      discoveredRoles.has('cfo') ||
      discoveredRoles.has('direccion')
    ) {
      discoveredRoles.delete('coordinador');
    }

    if (discoveredRoles.size === 0) continue;

    const rolesList = [...discoveredRoles];
    const primaryRole = staticProfile?.role
      ? normalizeRole(staticProfile.role)
      : existingUidDoc?.role
        ? normalizeRole(existingUidDoc.role)
        : rolesList[0];

    const rawSede =
      staticProfile?.sede ||
      existingUidDoc?.sede ||
      staffProfile?.sede ||
      relatedDocs.find((d) => d.data.sede)?.data.sede ||
      qtProfile?.sede ||
      '';
    const canonicalUserSede = rawSede ? normalizeSede(rawSede) : '';

    const currentRolesArr = Array.isArray(existingUidDoc?.roles) ? existingUidDoc.roles : [];
    const rolesMatch =
      existingUidDoc?.role === primaryRole &&
      (existingUidDoc?.appRole === primaryRole || existingUidDoc?.appRole === 'consolidado') &&
      currentRolesArr.length === rolesList.length &&
      rolesList.every((r) => currentRolesArr.includes(r)) &&
      (!canonicalUserSede || existingUidDoc?.sede === canonicalUserSede);

    if (rolesMatch) continue;

    const patch = {
      uid,
      email,
      role: primaryRole,
      appRole: existingUidDoc?.appRole === 'consolidado' ? 'consolidado' : primaryRole,
      roles: rolesList,
      ...(canonicalUserSede ? { sede: canonicalUserSede } : {}),
      ...(superAdminSet.has(email) ? { isSuperAdmin: true } : {}),
      ...(staticProfile?.name && !existingUidDoc?.name ? { name: staticProfile.name } : {}),
      uidProfileSyncedAt: FieldValue.serverTimestamp()
    };

    batch.set(db.collection('users').doc(uid), patch, { merge: true });
    opsInBatch += 1;
    updatedUsersCount += 1;
    if (opsInBatch >= 400) await flushBatch();
  }

  // Sanear metadatos nulos o faltantes en tareas de catálogo base (sin tocar avances)
  const catalogById = new Map(checklistData.map((t) => [t.id, t]));
  let healedCatalogTasks = 0;

  for (const taskDoc of tasksSnap.docs) {
    const baseTask = catalogById.get(taskDoc.id);
    if (!baseTask) continue;
    const d = taskDoc.data() || {};
    if (d.isCustom === true) continue;

    const hasRealPersonalOwner =
      (typeof d.assignedToEmail === 'string' && d.assignedToEmail.trim() !== '') ||
      (Array.isArray(d.assignedToEmails) && d.assignedToEmails.some((e) => typeof e === 'string' && e.trim() !== ''));
    if (hasRealPersonalOwner) continue;

    const taskPatch = {};
    const expectedRole = normalizeRole(baseTask.role);
    if (d.id !== taskDoc.id) taskPatch.id = taskDoc.id;
    if (d.role !== expectedRole) taskPatch.role = expectedRole;
    if (d.isCustom !== false) taskPatch.isCustom = false;
    if (d.catalogTask !== true) taskPatch.catalogTask = true;
    if (d.comments === null) taskPatch.comments = '';
    if (d.evidenceUrl === null) taskPatch.evidenceUrl = '';
    if (d.evidence_url === null) taskPatch.evidence_url = '';
    if (d.evidences === null) taskPatch.evidences = [];
    if (d.completions === null) taskPatch.completions = {};

    // Limpiar campos personales vacíos accidentales ("", []) en tareas de catálogo
    for (const emptyPersonalField of ['assignedToEmail', 'assigned_to', 'ownerId', 'assignedByEmail', 'createdBy', 'createdByEmail', 'created_by']) {
      if (emptyPersonalField in d && (d[emptyPersonalField] === '' || d[emptyPersonalField] === null)) {
        taskPatch[emptyPersonalField] = FieldValue.delete();
      }
    }
    if ('assignedToEmails' in d && Array.isArray(d.assignedToEmails) && d.assignedToEmails.length === 0) {
      taskPatch.assignedToEmails = FieldValue.delete();
    }

    if (Object.keys(taskPatch).length > 0) {
      batch.set(taskDoc.ref, taskPatch, { merge: true });
      opsInBatch += 1;
      healedCatalogTasks += 1;
      if (opsInBatch >= 400) await flushBatch();
    }
  }

  await flushBatch();

  return {
    skipped: false,
    dryRun,
    authUsersScanned: authUsers.length,
    updatedUsersCount,
    skippedInactiveCount,
    skippedAdminLockedCount,
    healedCatalogTasks,
    detail: `Auth escaneados=${authUsers.length} | users/{uid} sincronizados=${updatedUsersCount} | catálogo saneado=${healedCatalogTasks}`
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes('--dry-run');
  syncUsersUidProfilesAndCatalogTasks({ dryRun })
    .then((res) => {
      console.log('✅ [syncUsersUidProfiles]', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ [syncUsersUidProfiles] Error:', err);
      process.exit(1);
    });
}
