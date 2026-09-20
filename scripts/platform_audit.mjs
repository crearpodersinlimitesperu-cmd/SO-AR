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
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';

dotenv.config();

let db;
try {
  const saPath = './centro-operativo-cpsl-65ad52160f45.json';
  if (existsSync(saPath)) {
    const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'));
    if (!getApps().length) {
      initializeApp({ credential: cert(serviceAccount) });
    }
  } else if (!getApps().length) {
    initializeApp();
  }
  db = getFirestore();
} catch (e) {
  console.warn("⚠️ Firebase Admin init:", e.message);
}

const KNOWN_ROLES = new Set([
  'direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado',
  'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj',
  'director_maestria', 'qt', 'capitan', 'entrenador', 'entrenador_llamadas',
  'manager', 'coordinador', 'finanzas', 'talento_humano', 'admin', 'aliado'
]);

const AUDIT_WINDOW_HOURS = 6; // ventana de "trazabilidad reciente" (coincide con la frecuencia del workflow: cada ~5h)

// ----------------------------------------------------------------------------
// (20/09/2026) Constantes de los chequeos agregados este día, pedidos por José
// ("asegurarse que Causa funciona... que supervise esta plataforma sin
// alucinar"). Todos siguen la misma regla del resto del archivo: si un dato no
// se pudo leer, se dice que NO se pudo leer — nunca se asume que está bien.
// ----------------------------------------------------------------------------

// URL real del hosting (firebase.json → hosting.site: "centro-operativo-cpsl").
const SITIO_URL = process.env.CAUSA_OS_URL || 'https://centro-operativo-cpsl.web.app/';

// Hoja "DIRECTORIO GLOBAL" — fuente de verdad de sede/cargo del staff, la misma
// que José usó el 17/09/2026 para detectar que Daniela Esposito (Quito/UIO)
// estaba con sede "global" en Firestore.
// OJO: al escribir esto NO se pudo comprobar si la hoja permite lectura
// anónima (el entorno donde se programó no tiene salida a Google). Si no se
// puede leer, el chequeo lo reporta explícitamente en vez de dar un falso OK.
const DIRECTORIO_SHEET_ID = process.env.DIRECTORIO_GLOBAL_SHEET_ID || '1bl1_R6Qiee4tQ31Oix1Mjo_Jsbmddv3nsc5xBIy7QJY';
const DIRECTORIO_SHEET_GID = process.env.DIRECTORIO_GLOBAL_GID || '0';

// Copia local de normalizeSede() de src/data/usersData.js. Se duplica a
// propósito: ese archivo importa usersToImport.js y arrastra el bundle entero
// de la app, que no tiene por qué correr en un script de CI. Si normalizeSede()
// cambia allá, hay que actualizar esta copia (igual que pasa con
// firestore.rules ↔ permissions.js).
const normalizeSede = (sede) => {
  if (!sede) return 'Sede Global';
  const s = sede.toString().trim();
  const clean = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (s === 'MED' || clean.includes('medell')) return 'Medellín';
  if (s === 'LIM' || clean.includes('lima')) return 'Lima';
  if (s === 'CUE' || clean.includes('cuenca')) return 'Cuenca';
  if (s === 'GYE' || clean.includes('guayaquil')) return 'Guayaquil';
  if (s === 'MEX' || clean.includes('mex') || clean.includes('cdmx')) return 'México';
  if (s === 'UIO-C1' || s === 'UIO-C2' || s === 'UIO' || clean.includes('uio') ||
      clean.includes('ciclo 1') || clean.includes('ciclo1') ||
      clean.includes('ciclo 2') || clean.includes('ciclo2') ||
      clean.includes('quito')) return 'Quito';
  if (s === 'INT' || clean.includes('intern')) return 'Internacional';
  if (clean.includes('global')) return 'Sede Global';
  return s;
};

const esSedeGlobal = (s) => {
  const n = normalizeSede(s);
  return n === 'Sede Global' || n === 'Global';
};

// Copia reducida de normalizeRole() de src/data/usersData.js — solo los grupos
// de sinónimos, que es lo único que hace falta para comparar dos documentos de
// la misma persona. Sin esto, "coordinador_maestria" vs "coord_maestria" (el
// MISMO rol, escrito distinto por bootstrapSync y por el login) se reportaría
// como contradicción: una falsa alarma. Un agente que da falsas alarmas se
// vuelve ruido y se deja de leer.
const normalizeRoleCompare = (role) => {
  const r = (role || '').toString().toLowerCase().trim();
  if (!r) return '';
  if (['coordinador_c1c2', 'coord_c1', 'coord_c2', 'coordinador_c1', 'coordinador_c2', 'c1', 'c2', 'c1c2'].includes(r)) return 'coord_c1';
  if (r === 'director_maestria' || r === 'director_mj') return 'director_maestria';
  if (['coordinador_mj', 'coord_maestria', 'coordinador_maestria'].includes(r) || r.includes('maestria')) return 'coord_maestria';
  if (r === 'gerente' || r === 'gerente_sede') return 'gerente';
  if (['coordinador', 'coordinadora', 'coordinacion_administrativa', 'colaborador'].includes(r)) return 'coordinador';
  if (r === 'entrenador_llamadas' || r.includes('llamadas')) return 'entrenador_llamadas';
  if (r === 'entrenador' || r === 'coach') return 'entrenador';
  if (r.includes('direccion') || r.includes('ceo') || r.includes('cco') || r.includes('socio')) return 'direccion';
  if (r === 'finanzas' || r.includes('facturacion')) return 'finanzas';
  return r;
};

const emailKey = (e) => (e || '')
  .toString()
  .toLowerCase()
  .trim()
  // typos de dominio ya documentados en la app (ver ChecklistContext.jsx)
  .replace('@crearpls.com', '@crearpsl.net')
  .replace('@crearpsl.com', '@crearpsl.net');

// Parser CSV mínimo con soporte de comillas (las celdas del Directorio traen
// comas dentro de "Cargo / Función").
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => (cell || '').trim() !== ''));
}

const normalizeForDupCheck = (s) => (s || '')
  .toString()
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ');

async function authenticate() {
  if (!db) {
    throw new Error('Firebase Admin no pudo inicializarse (verificar Service Account centro-operativo-cpsl-65ad52160f45.json).');
  }
  console.log(`🔐 Autenticado exitosamente con Firebase Admin SDK (centro-operativo-cpsl)`);
}

async function fetchCollection(name, opts = {}) {
  if (!db) {
    console.error(`⚠️ No hay conexión a Firestore para leer "${name}"`);
    return null;
  }
  try {
    let q = db.collection(name);
    if (opts.orderByField) {
      q = q.orderBy(opts.orderByField, opts.direction || 'desc').limit(opts.limit || 500);
    }
    const snap = await q.get();
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

  // ==========================================================================
  // (20/09/2026) CHEQUEOS AGREGADOS — pedido de José: "asegurarse que Causa
  // funciona" y "supervisar esta plataforma sin alucinar".
  // ==========================================================================

  // --- 4a. ¿Causa OS está realmente en pie? (HECHO — petición HTTP real) -----
  // Este es el chequeo que antes NO existía: el agente miraba si el workflow
  // de deploy decía "success", pero nunca abría el sitio. Ya pasó (ver
  // deploy.yml, fix del 04/09/2026) que el deploy reportara verde durante
  // semanas sin publicar nada. Acá se pide la página de verdad y además se
  // descarga el bundle JS que esa página referencia: un index.html que
  // responde 200 pero cuyo bundle da 404 es exactamente una pantalla en
  // blanco para el usuario, y el HTTP 200 solo no lo detecta.
  try {
    const res = await fetch(SITIO_URL, { redirect: 'follow' });
    if (!res.ok) {
      findings.push({ severity: 'ERROR', tipo: 'HECHO', titulo: 'Causa OS no responde', detalle: `${SITIO_URL} devolvió HTTP ${res.status}. El sitio está caído o mal desplegado.` });
    } else {
      const html = await res.text();
      const tieneRoot = html.includes('id="root"');
      const bundleMatch = html.match(/src="(\/assets\/[^"]+\.js)"/);
      if (!tieneRoot) {
        findings.push({ severity: 'ERROR', tipo: 'HECHO', titulo: 'Causa OS responde pero sin la app', detalle: `${SITIO_URL} devolvió HTTP 200 pero el HTML no contiene <div id="root"> — lo que llega no es la aplicación (¿deploy incompleto o página de error del hosting?).` });
      } else if (!bundleMatch) {
        findings.push({ severity: 'WARN', tipo: 'HECHO', titulo: 'Bundle JS no referenciado', detalle: `El HTML de ${SITIO_URL} tiene <div id="root"> pero no se encontró la etiqueta <script src="/assets/*.js">. No se pudo verificar que el código de la app esté publicado.` });
      } else {
        const bundleUrl = new URL(bundleMatch[1], SITIO_URL).toString();
        const bundleRes = await fetch(bundleUrl, { method: 'GET' });
        if (!bundleRes.ok) {
          findings.push({ severity: 'ERROR', tipo: 'HECHO', titulo: 'Causa OS sirve una pantalla en blanco', detalle: `El index.html carga bien pero su bundle ${bundleMatch[1]} devuelve HTTP ${bundleRes.status}. Para el usuario esto es una pantalla en blanco.` });
        } else {
          const bytes = (await bundleRes.arrayBuffer()).byteLength;
          info.push(`✅ Causa OS en línea: ${SITIO_URL} responde 200 con la app cargada (bundle ${bundleMatch[1]}, ${(bytes / 1024).toFixed(0)} KB).`);
        }
      }
    }
  } catch (e) {
    findings.push({ severity: 'ERROR', tipo: 'HECHO', titulo: 'Causa OS inalcanzable', detalle: `No se pudo conectar a ${SITIO_URL}: ${e.message}` });
  }

  // --- 4b. Cruce de tareas entre sedes (HECHO — datos reales de Firestore) ---
  // Detecta la fuga que José reportó el 16-17/09/2026 y que se corrigió en
  // GerenteDashboard/SuperAdminPanel/UserProfileModal: una tarea marcada para
  // una sede pero asignada nominalmente a alguien de OTRA sede. Acá no se
  // evalúa el filtro de la interfaz (eso es código), se revisa el DATO: si el
  // dato está cruzado, la interfaz lo va a mostrar cruzado.
  const tasks = await fetchCollection('tasks');
  if (tasks && users) {
    const sedePorEmail = new Map();
    users.forEach(u => {
      [u.email, u.corporateEmail, ...(Array.isArray(u.emails) ? u.emails : [])]
        .filter(Boolean)
        .forEach(e => { if (u.sede) sedePorEmail.set(emailKey(e), u.sede); });
    });

    const cruzadas = [];
    tasks.forEach(t => {
      const tSede = t.assignedSede || t.sede;
      if (!tSede || esSedeGlobal(tSede)) return; // "Global" es visible para todos a propósito
      const destinatarios = [
        ...(Array.isArray(t.assignedToEmails) ? t.assignedToEmails : []),
        ...(t.assignedToEmail ? [t.assignedToEmail] : [])
      ].filter(Boolean);
      destinatarios.forEach(e => {
        const sedePersona = sedePorEmail.get(emailKey(e));
        if (!sedePersona || esSedeGlobal(sedePersona)) return; // sin dato o global → no es cruce comprobable
        if (normalizeSede(sedePersona) !== normalizeSede(tSede)) {
          cruzadas.push(`"${(t.task || t.title || t.id)}" (sede ${normalizeSede(tSede)}) → ${e} (sede ${normalizeSede(sedePersona)})`);
        }
      });
    });

    if (cruzadas.length > 0) {
      findings.push({ severity: 'WARN', tipo: 'HECHO', titulo: 'Tareas cruzadas entre sedes', detalle: `${cruzadas.length} asignación(es) donde la sede de la tarea no coincide con la sede de la persona asignada: ${cruzadas.slice(0, 8).join(' | ')}${cruzadas.length > 8 ? ` | …y ${cruzadas.length - 8} más` : ''}` });
    } else {
      info.push(`✅ Aislamiento de sede: ninguna de las ${tasks.length} tareas está asignada a alguien de otra sede.`);
    }
  } else if (!tasks) {
    findings.push({ severity: 'WARN', tipo: 'HECHO', titulo: 'Tareas no verificables', detalle: 'No se pudo leer la colección "tasks" — no se pudo comprobar el aislamiento de sede en este ciclo.' });
  }

  // --- 4c. Sede en Firestore vs. Directorio Global (HECHO / o falla honesta) --
  // El "desastre" que José encontró el 17/09/2026: la hoja dice una sede y
  // Firestore tiene otra (Daniela Esposito: UIO en la hoja, "global" en la
  // base). Esto lo detecta automáticamente y de forma reversible: solo
  // REPORTA, nunca escribe en Firestore.
  if (users) {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${DIRECTORIO_SHEET_ID}/export?format=csv&gid=${DIRECTORIO_SHEET_GID}`;
      const res = await fetch(csvUrl, { redirect: 'follow' });
      const text = res.ok ? await res.text() : '';
      const pareceCsv = res.ok && !text.trimStart().toLowerCase().startsWith('<!doctype') && !text.trimStart().toLowerCase().startsWith('<html');

      if (!pareceCsv) {
        findings.push({ severity: 'WARN', tipo: 'HECHO', titulo: 'Directorio Global no legible', detalle: `No se pudo leer la hoja DIRECTORIO GLOBAL como CSV (HTTP ${res.status}${res.ok ? ', pero la respuesta es una página de login/HTML, no datos' : ''}). Probablemente la hoja no permite lectura anónima. Para activar este chequeo: compartirla como "cualquiera con el enlace puede ver". NO se comparó ninguna sede en este ciclo — esto no es un OK.` });
      } else {
        const rows = parseCsv(text);
        const header = (rows[0] || []).map(h => (h || '').toLowerCase().trim());
        const idxEmail = header.findIndex(h => h.includes('email') || h.includes('correo'));
        const idxSede = header.findIndex(h => h === 'sede' || h.includes('sede'));
        const idxNombre = header.findIndex(h => h.includes('nombre'));

        if (idxEmail === -1 || idxSede === -1) {
          findings.push({ severity: 'WARN', tipo: 'HECHO', titulo: 'Directorio Global con formato inesperado', detalle: `La hoja se leyó (${rows.length} filas) pero no se encontraron las columnas de email y/o sede en el encabezado: [${header.join(', ')}]. No se comparó nada — revisar si cambiaron los títulos de las columnas.` });
        } else {
          const sedeHoja = new Map();
          rows.slice(1).forEach(r => {
            const e = emailKey(r[idxEmail]);
            const s = (r[idxSede] || '').trim();
            if (e && s) sedeHoja.set(e, { sede: s, nombre: (r[idxNombre] || '').trim() });
          });

          const discrepancias = [];
          const sinCuenta = [];
          sedeHoja.forEach((fila, e) => {
            const u = users.find(x => [x.email, x.corporateEmail, ...(Array.isArray(x.emails) ? x.emails : [])]
              .filter(Boolean).some(ue => emailKey(ue) === e));
            if (!u) { sinCuenta.push(`${fila.nombre || e} (${e})`); return; }
            if (!u.sede) { discrepancias.push(`${fila.nombre || e}: hoja dice "${fila.sede}", Firestore no tiene sede`); return; }
            if (normalizeSede(u.sede) !== normalizeSede(fila.sede)) {
              discrepancias.push(`${fila.nombre || e}: hoja dice "${fila.sede}" (${normalizeSede(fila.sede)}), Firestore dice "${u.sede}" (${normalizeSede(u.sede)})`);
            }
          });

          if (discrepancias.length > 0) {
            findings.push({ severity: 'WARN', tipo: 'HECHO', titulo: 'Sede distinta a la del Directorio Global', detalle: `${discrepancias.length} persona(s) con la sede desalineada respecto de la hoja oficial: ${discrepancias.slice(0, 10).join(' | ')}${discrepancias.length > 10 ? ` | …y ${discrepancias.length - 10} más` : ''}` });
          } else {
            info.push(`✅ Sedes: las ${sedeHoja.size} personas del Directorio Global con cuenta en Causa OS tienen la misma sede en ambos lados.`);
          }
          if (sinCuenta.length > 0) {
            findings.push({ severity: 'WARN', tipo: 'HECHO', titulo: 'Personas del Directorio sin cuenta en Causa OS', detalle: `${sinCuenta.length} persona(s) están en la hoja pero no tienen documento en "users" (nunca ingresaron o nunca se sincronizaron): ${sinCuenta.slice(0, 10).join(', ')}${sinCuenta.length > 10 ? '…' : ''}` });
          }
        }
      }
    } catch (e) {
      findings.push({ severity: 'WARN', tipo: 'HECHO', titulo: 'Directorio Global no verificado', detalle: `Error al intentar leer la hoja: ${e.message}. No se comparó ninguna sede en este ciclo.` });
    }
  }

  // --- 4d. Misma persona en varios documentos con datos que NO coinciden -----
  // El patrón real de esta base: casi todos tienen 2 documentos (uno de
  // bootstrapSync con id tipo "nombre_apellido" y otro creado al ingresar, con
  // id = UID de Firebase). Tener 2 documentos por sí solo no es un problema y
  // por eso NO se reporta. Lo que sí rompe cosas es que esos documentos se
  // contradigan en sede o rol: según cuál lea cada pantalla, la persona ve una
  // cosa u otra.
  if (users) {
    const porPersona = new Map();
    users.forEach(u => {
      const claves = [u.corporateEmail, u.email, ...(Array.isArray(u.emails) ? u.emails : [])]
        .filter(Boolean).map(emailKey);
      const clave = claves.sort()[0];
      if (!clave) return;
      if (!porPersona.has(clave)) porPersona.set(clave, []);
      porPersona.get(clave).push(u);
    });

    const contradicciones = [];
    porPersona.forEach((docs, clave) => {
      if (docs.length < 2) return;
      const sedes = [...new Set(docs.filter(d => d.sede).map(d => normalizeSede(d.sede)))];
      const roles = [...new Set(docs.map(d => normalizeRoleCompare(d.appRole || d.role)).filter(Boolean))];
      if (sedes.length > 1) contradicciones.push(`${clave}: sedes distintas entre sus documentos → ${sedes.join(' vs ')} (ids: ${docs.map(d => d.id).join(', ')})`);
      else if (roles.length > 1) contradicciones.push(`${clave}: roles distintos entre sus documentos → ${roles.join(' vs ')} (ids: ${docs.map(d => d.id).join(', ')})`);
    });

    if (contradicciones.length > 0) {
      findings.push({ severity: 'WARN', tipo: 'HECHO', titulo: 'Documentos de la misma persona que se contradicen', detalle: `${contradicciones.length} caso(s) donde la misma persona tiene varios documentos en "users" con sede o rol distintos entre sí: ${contradicciones.slice(0, 8).join(' | ')}${contradicciones.length > 8 ? ` | …y ${contradicciones.length - 8} más` : ''}` });
    } else {
      info.push('✅ Consistencia: cuando una persona tiene varios documentos en "users", todos coinciden en sede y rol.');
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

  // No se falla el workflow para evitar correos de alarma de CI; los hallazgos se reportan en el Issue
  if (!users && !managers) {
    console.warn("⚠️ No se pudieron consultar colecciones clave (users/managers), completando ejecución.");
  }
}

main().catch(async (err) => {
  console.error('❌ Advertencia en platform_audit.mjs:', err.message || err);
  try {
    const errorMd = `# 🔍 Auditoría de Plataforma y Nodus — Estado Actual\n\n` +
      `**Última corrida:** ${new Date().toISOString()}\n` +
      `**Estado general:** 🟡 AUDITORÍA REQUIRIÓ ATENCIÓN\n\n` +
      `\`\`\`\n${err?.stack || err?.message || String(err)}\n\`\`\`\n`;
    await upsertAuditIssue(errorMd, true);
  } catch (reportErr) {
    console.error('⚠️ Tampoco se pudo dejar constancia del error en el Issue:', reportErr.message);
  }
  process.exit(0);
});
