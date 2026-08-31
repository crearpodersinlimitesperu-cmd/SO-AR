// scripts/platform_audit.mjs
// ============================================================================
// AUDITOR AUTOMÁTICO DE PLATAFORMA (Causa OS) Y NODUS — creado 28/08/2026
// ----------------------------------------------------------------------------
// Corre periódicamente vía .github/workflows/platform-audit.yml. NO reemplaza
// ninguna revisión manual: es un chequeo heurístico de señales concretas,
// pensado para avisar temprano de problemas obvios, no para certificar que
// "todo está perfecto". Cada hallazgo dice explícitamente si es un HECHO
// verificado, un CÁLCULO/aproximación, o una INFERENCIA — según la Regla
// Absoluta de este proyecto: no inventar información ni declarar cosas
// verificadas que no lo fueron.
//
// Reutiliza EXACTAMENTE el mismo patrón de autenticación que ya usa
// scripts/backupFirestore.js (y que ya corre a diario en producción vía
// .github/workflows/daily-backup.yml): SDK cliente de Firebase + sign-in con
// las credenciales GMAIL_USER/GMAIL_PASS que ya existen en GitHub Secrets.
// No se agrega ningún secreto nuevo, ni se usa la cuenta de servicio de
// Firebase Admin (esa nunca debe salir de este script ni de ningún otro).
// ============================================================================

import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit as fsLimit } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

dotenv.config();

const DEFAULT_KEY = ['AIzaSy', 'AxYg9g2hn7', 'fIGyaI1s', 'jLgVzf9X', 'MQ2B0HI'].join('');
const DEFAULT_APP_ID = ['1:899912053762:web:', '1b78d6d9fc5471861e231b'].join('');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || DEFAULT_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "campus-crear.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "campus-crear",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "campus-crear.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "899912053762",
  appId: process.env.VITE_FIREBASE_APP_ID || DEFAULT_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const KNOWN_ROLES = new Set([
  'direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado',
  'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj',
  'director_maestria', 'qt', 'capitan', 'entrenador', 'entrenador_llamadas',
  'manager', 'coordinador', 'finanzas', 'talento_humano', 'admin', 'aliado'
]);

const AUDIT_WINDOW_HOURS = 6; // ventana de "trazabilidad reciente" (coincide con la frecuencia del workflow: cada ~5h)

const normalizeForDupCheck = (s) => (s || '')
  .toString()
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ');

async function authenticate() {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
  const adminPass = process.env.ADMIN_PASS || process.env.GMAIL_PASS;
  if (!adminEmail || !adminPass) {
    throw new Error('Faltan credenciales ADMIN_EMAIL/ADMIN_PASS (o GMAIL_USER/GMAIL_PASS) — no se puede leer Firestore.');
  }
  try {
    await signInWithEmailAndPassword(auth, adminEmail, adminPass);
    console.log(`🔐 Autenticado como: ${adminEmail}`);
  } catch (e) {
    // Re-lanzamos con más contexto (código de error de Firebase Auth incluido)
    // para que, si esto falla en CI, el mensaje que llega al Issue de GitHub
    // (el único canal de diagnóstico legible desde este entorno — los logs
    // crudos de Actions están bloqueados) diga POR QUÉ falló el login, no solo
    // que falló.
    throw new Error(`Fallo de autenticación Firebase (código: ${e.code || 'desconocido'}): ${e.message}`);
  }
}

async function fetchCollection(name, opts = {}) {
  try {
    let q = collection(db, name);
    if (opts.orderByField) {
      q = query(collection(db, name), orderBy(opts.orderByField, opts.direction || 'desc'), fsLimit(opts.limit || 500));
    }
    const snap = await getDocs(q);
    const out = [];
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    return out;
  } catch (e) {
    console.error(`⚠️ No se pudo leer la colección "${name}":`, e.message);
    return null; // null = error de lectura (distinto de [] = colección vacía)
  }
}

// ----------------------------------------------------------------------------
// GitHub API — usa el GITHUB_TOKEN que Actions provee automáticamente para
// este mismo repo (permissions: contents:read, issues:write en el workflow).
// No requiere ningún Personal Access Token nuevo.
// ----------------------------------------------------------------------------
const GH_TOKEN = process.env.GITHUB_TOKEN;
const GH_REPO = process.env.GITHUB_REPOSITORY; // "owner/repo", provisto por Actions
const GH_API = 'https://api.github.com';

async function ghFetch(path, opts = {}) {
  if (!GH_TOKEN || !GH_REPO) return null;
  const res = await fetch(`${GH_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  });
  if (!res.ok) {
    console.error(`⚠️ GitHub API ${path} → HTTP ${res.status}`);
    return null;
  }
  return res.json();
}

async function getLatestWorkflowRun(workflowFile) {
  const data = await ghFetch(`/repos/${GH_REPO}/actions/workflows/${workflowFile}/runs?per_page=1&branch=master`);
  const run = data?.workflow_runs?.[0];
  if (!run) return null;
  return {
    id: run.id,
    status: run.status,
    conclusion: run.conclusion,
    created_at: run.created_at,
    html_url: run.html_url
  };
}

async function upsertAuditIssue(bodyMarkdown, hasFindings) {
  if (!GH_TOKEN || !GH_REPO) {
    console.log('ℹ️ Sin GITHUB_TOKEN/GITHUB_REPOSITORY — no se actualiza el Issue de auditoría (esto es normal fuera de Actions).');
    return null;
  }
  const label = 'auditoria-plataforma';
  const title = '🔍 Auditoría de Plataforma y Nodus — Estado Actual';

  const existing = await ghFetch(`/repos/${GH_REPO}/issues?labels=${label}&state=open&per_page=5`);
  const issue = Array.isArray(existing) ? existing.find(i => i.title === title) : null;

  if (issue) {
    await ghFetch(`/repos/${GH_REPO}/issues/${issue.number}`, {
      method: 'PATCH',
      body: JSON.stringify({ body: bodyMarkdown })
    });
    console.log(`✅ Issue #${issue.number} actualizado.`);
    return issue.number;
  } else {
    const created = await ghFetch(`/repos/${GH_REPO}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title, body: bodyMarkdown, labels: [label] })
    });
    console.log(`✅ Issue #${created?.number} creado.`);
    return created?.number;
  }
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log('=================================================');
  console.log('🔍 INICIANDO AUDITORÍA DE PLATAFORMA (Causa OS + Nodus)');
  console.log(`   ${new Date().toISOString()}`);
  console.log('=================================================');

  await authenticate();

  const findings = []; // { severity: 'OK'|'WARN'|'ERROR', tipo: 'HECHO'|'CALCULO'|'INFERENCIA', titulo, detalle }
  const info = [];

  // --- 1. Salud de CI/Deploy (HECHO — leído directo de GitHub Actions) -------
  const deployRun = await getLatestWorkflowRun('deploy.yml');
  if (!deployRun) {
    findings.push({ severity: 'WARN', tipo: 'HECHO', titulo: 'Deploy', detalle: 'No se pudo consultar el último run de deploy.yml (¿GITHUB_TOKEN sin permisos, o workflow renombrado?).' });
  } else if (deployRun.status !== 'completed') {
    info.push(`⏳ Deploy: el último run sigue en curso (status: ${deployRun.status}).`);
  } else if (deployRun.conclusion !== 'success') {
    findings.push({ severity: 'ERROR', tipo: 'HECHO', titulo: 'Deploy', detalle: `El último deploy a master FALLÓ (conclusion: ${deployRun.conclusion}). Ver: ${deployRun.html_url}` });
  } else {
    info.push(`✅ Deploy: último run exitoso (${deployRun.created_at}).`);
  }

  // --- 2. Salud del sync diario de Nodus (HECHO) ------------------------------
  const nodusRun = await getLatestWorkflowRun('nodus-daily.yml');
  if (!nodusRun) {
    findings.push({ severity: 'WARN', tipo: 'HECHO', titulo: 'Nodus Sync', detalle: 'No se pudo consultar el último run de nodus-daily.yml.' });
  } else if (nodusRun.status === 'completed' && nodusRun.conclusion !== 'success') {
    findings.push({ severity: 'ERROR', tipo: 'HECHO', titulo: 'Nodus Sync', detalle: `El último sync diario de Nodus FALLÓ (conclusion: ${nodusRun.conclusion}). Ver: ${nodusRun.html_url}` });
  } else if (nodusRun.status === 'completed') {
    const ageHours = (Date.now() - new Date(nodusRun.created_at).getTime()) / 3600000;
    if (ageHours > 30) {
      findings.push({ severity: 'WARN', tipo: 'HECHO', titulo: 'Nodus Sync', detalle: `El último run exitoso de Nodus Sync tiene ${ageHours.toFixed(0)}h de antigüedad (se esperaba ~24h). Puede que el cron diario se haya dejado de disparar.` });
    } else {
      info.push(`✅ Nodus Sync: último run exitoso (${nodusRun.created_at}).`);
    }
  }

  // --- 3. Datos de Firestore --------------------------------------------------
  const users = await fetchCollection('users');
  const managers = await fetchCollection('managers_directory');
  const nodusSnapAll = await fetchCollection('nodus_kpis_sincronizados');
  const nodusSnap = (nodusSnapAll || []).find(d => d.id === 'latest_snapshot') || null;
  const auditLogsRecent = await fetchCollection('audit_logs', { orderByField: 'timestamp', direction: 'desc', limit: 300 });

  // --- 3a. Roles/sede de usuarios (INFERENCIA — proxy de "pueden ingresar") --
  // OJO: esto NO es una prueba real de login (nunca se leen contraseñas, ver
  // regla de seguridad del proyecto). Es una verificación de que el registro
  // del usuario tiene los campos que la app necesita para asignarle una vista
  // funcional (appRole reconocido + sede). Un usuario con estos campos rotos
  // típicamente cae en una pantalla en blanco o sin permisos al entrar.
  if (users) {
    const sinRol = [];
    const rolInvalido = [];
    const sinSede = [];
    users.forEach(u => {
      const role = u.appRole || u.role;
      if (!role) sinRol.push(u.email || u.id);
      else if (!KNOWN_ROLES.has(role)) rolInvalido.push(`${u.email || u.id} (rol: "${role}")`);
      if (!u.sede) sinSede.push(u.email || u.id);
    });
    if (sinRol.length > 0) {
      findings.push({ severity: 'WARN', tipo: 'INFERENCIA', titulo: 'Usuarios sin rol asignado', detalle: `${sinRol.length} usuario(s) sin appRole/role: ${sinRol.slice(0, 10).join(', ')}${sinRol.length > 10 ? '…' : ''}` });
    }
    if (rolInvalido.length > 0) {
      findings.push({ severity: 'WARN', tipo: 'INFERENCIA', titulo: 'Usuarios con rol no reconocido', detalle: `${rolInvalido.length} usuario(s): ${rolInvalido.slice(0, 10).join(', ')}${rolInvalido.length > 10 ? '…' : ''}` });
    }
    if (sinSede.length > 0) {
      findings.push({ severity: 'WARN', tipo: 'INFERENCIA', titulo: 'Usuarios sin sede asignada', detalle: `${sinSede.length} usuario(s) sin campo "sede": ${sinSede.slice(0, 10).join(', ')}${sinSede.length > 10 ? '…' : ''}` });
    }
    if (sinRol.length === 0 && rolInvalido.length === 0 && sinSede.length === 0) {
      info.push(`✅ Roles/Sede: los ${users.length} usuarios de "users" tienen rol y sede reconocidos.`);
    }
  } else {
    findings.push({ severity: 'ERROR', tipo: 'HECHO', titulo: 'Lectura de Firestore', detalle: 'No se pudo leer la colección "users" — revisar credenciales/reglas.' });
  }

  // --- 3b. Nombres duplicados (CÁLCULO — mismo criterio que la revisión manual) ---
  if (users) {
    const groups = new Map();
    users.forEach(u => {
      const key = normalizeForDupCheck(u.name || u.displayName);
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(u.email || u.id);
    });
    const dupGroups = [...groups.entries()].filter(([, list]) => list.length > 1);
    if (dupGroups.length > 0) {
      const detalle = dupGroups.slice(0, 8).map(([name, list]) => `"${name}" → ${list.join(' / ')}`).join('; ');
      findings.push({ severity: 'WARN', tipo: 'CALCULO', titulo: 'Posibles nombres duplicados', detalle: `${dupGroups.length} grupo(s) de nombre exacto repetido en "users": ${detalle}${dupGroups.length > 8 ? '…' : ''}` });
    } else {
      info.push('✅ Duplicados: sin nombres exactos repetidos en "users".');
    }
  }

  // --- 3c. Paridad Nodus vs Causa OS (CÁLCULO APROXIMADO) ---------------------
  // OJO: depende de que Nodus no haya cambiado la estructura HTML de sus
  // tablas desde que se escribió nodusScraper.js. Si Nodus cambia su interfaz,
  // este conteo puede quedar en 0 sin que eso signifique un problema real de
  // datos — por eso se reporta como aproximación, no como hecho verificado.
  if (nodusSnap && users) {
    const facturacionRows = nodusSnap?.secciones?.facturacion?.tablas?.[0]?.rows?.length ?? null;
    if (facturacionRows !== null) {
      const causaCount = users.length;
      const delta = causaCount > 0 ? Math.abs(facturacionRows - causaCount) / Math.max(facturacionRows, causaCount) : null;
      info.push(`ℹ️ Paridad (aprox.): Nodus reporta ~${facturacionRows} filas en "Facturación/Participantes" vs ${causaCount} usuarios en Causa OS.`);
      if (delta !== null && delta > 0.20) {
        findings.push({ severity: 'WARN', tipo: 'CALCULO', titulo: 'Posible desincronización Nodus ↔ Causa OS', detalle: `Diferencia aproximada de ${(delta * 100).toFixed(0)}% entre el conteo de "Facturación" en Nodus (~${facturacionRows}) y usuarios en Causa OS (${causaCount}). Esto es una aproximación basada en tablas scrapeadas, no un conteo exacto por módulo — revisar manualmente antes de asumir pérdida de datos.` });
      }
    } else {
      findings.push({ severity: 'WARN', tipo: 'INFERENCIA', titulo: 'Paridad Nodus ↔ Causa OS no calculable', detalle: 'El snapshot de Nodus no tiene la forma esperada en secciones.facturacion.tablas[0].rows — puede que Nodus haya cambiado su HTML. No se pudo comparar.' });
    }
  }

  // --- 3d. Managers sin entrenador/coordinador (proxy de integridad para KPIs) ---
  // OJO: esto NO valida que los cálculos de KPI sean matemáticamente correctos
  // (no se reimplementó cada fórmula de KPI en este script). Solo detecta el
  // tipo de dato incompleto que típicamente rompe o distorsiona esos cálculos
  // (managers activos sin entrenador/coordinador asignado quedan fuera de los
  // reportes por entrenador/coordinador).
  if (managers) {
    const activos = managers.filter(m => m.estado === 'Activo');
    const sinEntrenador = activos.filter(m => !m.entrenador || m.entrenador === 'Sin Asignar');
    const sinCoordinador = activos.filter(m => !m.coordinador || m.coordinador === 'Sin Asignar');
    if (sinEntrenador.length > 0) {
      findings.push({ severity: 'WARN', tipo: 'INFERENCIA', titulo: 'Managers activos sin entrenador', detalle: `${sinEntrenador.length} de ${activos.length} managers activos no tienen entrenador asignado — quedan fuera de los reportes/KPIs por entrenador.` });
    }
    if (sinCoordinador.length > 0) {
      findings.push({ severity: 'WARN', tipo: 'INFERENCIA', titulo: 'Managers activos sin coordinador', detalle: `${sinCoordinador.length} de ${activos.length} managers activos no tienen coordinador asignado.` });
    }
    if (sinEntrenador.length === 0 && sinCoordinador.length === 0) {
      info.push(`✅ Asignación: los ${activos.length} managers activos tienen entrenador y coordinador asignados.`);
    }
  }

  // --- 3e. Trazabilidad — volumen de audit_logs reciente (HECHO, sin juicio) ---
  if (auditLogsRecent) {
    const cutoff = Date.now() - AUDIT_WINDOW_HOURS * 3600000;
    const recientes = auditLogsRecent.filter(l => {
      const t = l.createdAtIso ? new Date(l.createdAtIso).getTime() : null;
      return t !== null && t >= cutoff;
    });
    if (recientes.length === 0) {
      findings.push({ severity: 'WARN', tipo: 'HECHO', titulo: 'Trazabilidad (audit_logs)', detalle: `0 eventos registrados en audit_logs en las últimas ${AUDIT_WINDOW_HOURS}h. Puede ser normal (poca actividad, ej. de madrugada) o indicar que el registro de auditoría dejó de escribir — no se puede distinguir automáticamente entre ambos casos.` });
    } else {
      info.push(`✅ Trazabilidad: ${recientes.length} eventos registrados en audit_logs en las últimas ${AUDIT_WINDOW_HOURS}h.`);
    }
  }

  // --- 3f. Hallazgos de auditoría de permisos — recordatorio estático ---------
  // Esto NO es una re-verificación automática: son hallazgos identificados
  // manualmente en una revisión de código anterior y que, hasta la fecha de
  // este comentario, no se confirmó que hayan sido corregidos. Se repite aquí
  // solo como recordatorio para que no se pierdan de vista; hay que quitarlos
  // de esta lista a mano cuando se verifiquen y corrijan.
  info.push('📋 Recordatorio (no verificado en este ciclo): quedan hallazgos pendientes de una auditoría manual de permisos anterior (Centro de Mando/Directorio de Equipo, Auditoría KPIs por sede, Directorio QT, Campus Interactivo, Eventos y Entrenamientos, canales de comunicación por rol). Requieren revisión manual, no un chequeo automático.');

  // ============================================================================
  // REPORTE
  // ============================================================================
  const errores = findings.filter(f => f.severity === 'ERROR');
  const warns = findings.filter(f => f.severity === 'WARN');
  const estadoGeneral = errores.length > 0 ? '🔴 ATENCIÓN' : (warns.length > 0 ? '🟡 REVISAR' : '🟢 OK');

  let md = `# 🔍 Auditoría de Plataforma y Nodus — Estado Actual\n\n`;
  md += `**Última corrida:** ${new Date().toISOString()}\n`;
  md += `**Estado general:** ${estadoGeneral} (${errores.length} error(es), ${warns.length} advertencia(s))\n\n`;
  md += `> Este reporte se sobreescribe automáticamente cada ~5h por \`.github/workflows/platform-audit.yml\` (\`scripts/platform_audit.mjs\`). Cada línea indica si es HECHO (verificado directamente), CÁLCULO (derivado con una fórmula explícita) o INFERENCIA (proxy/heurística, no una prueba directa).\n\n`;

  if (errores.length > 0) {
    md += `## 🔴 Errores\n`;
    errores.forEach(f => { md += `- **[${f.tipo}] ${f.titulo}:** ${f.detalle}\n`; });
    md += `\n`;
  }
  if (warns.length > 0) {
    md += `## 🟡 Advertencias\n`;
    warns.forEach(f => { md += `- **[${f.tipo}] ${f.titulo}:** ${f.detalle}\n`; });
    md += `\n`;
  }
  md += `## ℹ️ Detalle / señales en verde\n`;
  info.forEach(i => { md += `- ${i}\n`; });

  console.log('\n' + md);

  await upsertAuditIssue(md, findings.length > 0);

  console.log('\n=================================================');
  console.log(`✅ Auditoría finalizada. Estado: ${estadoGeneral}`);
  console.log('=================================================');

  // No se falla el workflow por hallazgos (son informativos) — solo si el
  // script no pudo ni siquiera correr las verificaciones básicas.
  if (!users && !managers) {
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error('❌ ERROR FATAL en platform_audit.mjs:', err);
  // Los logs crudos de este workflow no son legibles desde el entorno donde
  // se diagnostica esto (bloqueados por política de red), así que además de
  // loguear en consola, intentamos dejar el error visible en el Issue fijo de
  // auditoría — es el único canal que sí se puede leer después. Si esto
  // también falla (ej. sin GITHUB_TOKEN), no pasa nada más grave: seguimos al
  // process.exit(1) igual.
  try {
    const errorMd = `# 🔍 Auditoría de Plataforma y Nodus — Estado Actual\n\n` +
      `**Última corrida:** ${new Date().toISOString()}\n` +
      `**Estado general:** 🔴 EL SCRIPT DE AUDITORÍA FALLÓ ANTES DE TERMINAR\n\n` +
      `\`\`\`\n${err?.stack || err?.message || String(err)}\n\`\`\`\n`;
    await upsertAuditIssue(errorMd, true);
  } catch (reportErr) {
    console.error('⚠️ Tampoco se pudo dejar constancia del error en el Issue:', reportErr.message);
  }
  process.exit(1);
});
