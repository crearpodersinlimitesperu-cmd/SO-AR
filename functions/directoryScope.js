"use strict";

// C-02: lógica pura (sin Firebase) del directorio de usuarios servido por backend.
// Las reglas de Firestore ya solo dejan leer /users por perfil propio, sede o
// rol global; estas funciones deciden qué más puede ver cada persona a través de
// las Cloud Functions getCompanyDirectory / getRoleRecipients, siempre con una
// proyección mínima (sin teléfonos, cumpleaños ni historial).

// Mantener sincronizado con callerIsDirectoryGlobal() en firestore.rules y con
// DIRECTORY_GLOBAL_ROLES en src/services/userService.js.
const GLOBAL_ROLES = ["direccion", "cfo", "cco", "ceo", "director_maestria", "talento_humano"];

// Roles de coordinación/gerencia que asignan tareas o comunican entre sedes.
const CROSS_SEDE_ROSTER_ROLES = [
  "gerente", "coord_c1", "coord_maestria", "coordinador_mj", "coordinador",
  "capitan", "manager", "qt", "finanzas", "admin"
];

// SuperAdmin + isGerenteODireccion() de firestore.rules (con alias .net/.com).
const GLOBAL_EMAILS = [
  "jose.sanchez@crearpsl.net", "armando.pilacuan@gmail.com", "paul.sosa@crearpsl.net",
  "emely.leon@crearpsl.net", "fer.aragon@crearpsl.net", "andres.gomez@crearpsl.net",
  "gomeznueve@gmail.com", "contabilidad.global@crearpsl.net", "leandro.brunis@crearpsl.net",
  "josue.vera@crearpsl.net", "yurany.gonzalez@crearpsl.net", "nora.zamora@crearpsl.net",
  "emily.campuzano@crearpsl.net", "freddy.sosa@crearpsl.net", "diana.moscoso@crearpsl.net"
];

const MINIMAL_FIELDS = [
  "name", "displayName", "email", "emails", "role", "roles", "sede", "roleSedes",
  "status", "isActive", "active", "photoURL"
];

const MAX_RECIPIENT_ROLES = 20;
const LEADERSHIP_RECIPIENT_ROLES = ["gerente", "direccion", "director_maestria", "superadmin"];

// Roles que se pueden pedir como destinatarios (notificaciones de excelencia).
// Cualquier otro valor se rechaza: nunca se enumera por rol arbitrario.
const RECIPIENT_ROLE_ALLOWLIST = Array.from(new Set([
  ...GLOBAL_ROLES, ...CROSS_SEDE_ROSTER_ROLES, "superadmin", "entrenador",
  "entrenador_llamadas", "observador", "colaborador", "legal",
  "asistente_impuestos_quito", "tecnico_sst", "student", "participante", "marketing"
]));

// Tope duro de documentos leídos por llamada: si la colección lo supera se
// falla de forma explícita (nunca un directorio parcial silencioso).
const MAX_DIRECTORY_DOCS = 5000;

// Valores de `sede` conocidos por sede canónica. Deben coincidir con
// canonicalSede() de src/utils/sede.js (test de coherencia), con las listas de
// firestore.rules (sedeAliasList) y con src/utils/sedeAliases.js. Cada lista
// <= 30 para caber en un `where('sede','in', ...)`.
const SEDE_ALIASES = {
  "Quito": ["Quito", "QUITO", "quito", "UIO", "uio", "Quito C1", "Quito C2", "Quito Ciclo 1", "Quito Ciclo 2", "QUITO C1", "QUITO C2", "Quito ciclo 1", "Quito ciclo 2"],
  "Medellín": ["Medellín", "Medellin", "MEDELLIN", "MEDELLÍN", "medellin", "medellín", "MED", "Med"],
  "Lima": ["Lima", "LIMA", "lima", "LIM"],
  "Cuenca": ["Cuenca", "CUENCA", "cuenca", "CUE"],
  "Guayaquil": ["Guayaquil", "GUAYAQUIL", "guayaquil", "GYE"],
  "México": ["México", "Mexico", "MEXICO", "MÉXICO", "mexico", "CDMX", "MEX"],
  "Internacional": ["Internacional", "INTERNACIONAL", "INT"]
};

// Réplica CJS de canonicalSede() (src/utils/sede.js).
const canonicalSede = (value) => {
  const raw = String(value == null ? "" : value).trim();
  const key = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!key || key.includes("global")) return "Global";
  if (key === "med" || key.includes("medellin")) return "Medellín";
  if (key === "lim" || key.includes("lima")) return "Lima";
  if (key === "cue" || key.includes("cuenca")) return "Cuenca";
  if (key === "gye" || key.includes("guayaquil")) return "Guayaquil";
  if (key === "mex" || key === "cdmx" || key.includes("mexico")) return "México";
  if (key.includes("uio") || key.includes("quito") || /ciclo\s*[12]/.test(key)) return "Quito";
  if (key === "int" || key.includes("internacional")) return "Internacional";
  return raw;
};

// "" = sin sede utilizable (vacía, Global/Sede Global, "Sin Sede").
const sedeKey = (sede) => {
  const c = canonicalSede(sede);
  const k = clean(c);
  return !k || k === "global" || k === "sin sede" ? "" : k;
};

// Valores de `sede` que el cliente/regla pueden consultar directamente.
const sedeAliasList = (sede) => {
  const c = canonicalSede(sede);
  if (SEDE_ALIASES[c]) return SEDE_ALIASES[c].slice();
  const raw = String(sede == null ? "" : sede);
  return sedeKey(sede) ? [raw] : [];
};

const clean = (v) => String(v == null ? "" : v)
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const normRole = (r) => {
  const v = clean(r);
  return v === "superadmin" || v === "super_admin" ? "superadmin" : v;
};

const rolesOf = (data) => {
  const out = new Set();
  [data && data.role, data && data.appRole].forEach((r) => { if (r) out.add(normRole(r)); });
  if (data && Array.isArray(data.roles)) data.roles.forEach((r) => { if (r) out.add(normRole(r)); });
  return out;
};

const emailAliases = (email) => {
  const e = clean(email);
  const parts = e.split("@");
  if (parts.length === 2 && (parts[1] === "crearpsl.net" || parts[1] === "crearpsl.com")) {
    return [e, parts[0] + "@crearpsl.net", parts[0] + "@crearpsl.com"];
  }
  return e ? [e] : [];
};

const isGlobalSede = (sede) => sedeKey(sede) === "";

const sameSede = (a, b) => !isGlobalSede(a) && !isGlobalSede(b) && sedeKey(a) === sedeKey(b);

const isInactive = (data) =>
  !data || data.isActive === false || data.active === false || clean(data.status) === "inactive";

// El alcance sale SIEMPRE del perfil guardado en Firestore (users/{uid}) y del
// correo verificado del token: nunca de datos enviados por el cliente.
function resolveScope(profile, authEmail) {
  if (!profile) return { level: "none", sede: null, crossSedeRoster: false };
  const roles = rolesOf(profile);
  const isGlobal = emailAliases(authEmail).some((e) => GLOBAL_EMAILS.includes(e)) ||
    GLOBAL_ROLES.some((r) => roles.has(r));
  const sede = isGlobalSede(profile.sede) ? null : profile.sede;
  if (isGlobal) return { level: "global", sede, crossSedeRoster: true };
  return {
    level: sede ? "sede" : "self",
    sede,
    crossSedeRoster: CROSS_SEDE_ROSTER_ROLES.some((r) => roles.has(r))
  };
}

function projectMinimal(id, data) {
  const out = { id };
  MINIMAL_FIELDS.forEach((f) => { if (data[f] !== undefined) out[f] = data[f]; });
  if (!out.email) out.email = data.correo || data.corporateEmail || data.personalEmail ||
    (Array.isArray(data.emails) ? data.emails.find((e) => typeof e === "string" && e) : "") || "";
  if (!out.role && data.appRole) out.role = data.appRole;
  return out;
}

// Directorio mínimo servido por backend:
//  - roles de coordinación/gerencia/global: otras sedes;
//  - cualquiera con sede: residuos de SU misma sede canónica cuyo valor de
//    `sede` no está en SEDE_ALIASES (el cliente no puede consultarlos con `in`
//    ni las reglas leerlos directo), para no perder personas de su sede.
// Los inactivos solo se devuelven al alcance global.
function buildDirectory(scope, docs) {
  if (scope.level === "none" || scope.level === "self") return [];
  const aliases = scope.level === "global" ? [] : sedeAliasList(scope.sede);
  return docs
    .filter(({ data }) => data && !(scope.level !== "global" && isInactive(data)))
    .filter(({ data }) => {
      if (scope.level === "global") return true;
      if (sameSede(data.sede, scope.sede)) return !aliases.includes(data.sede);
      return scope.crossSedeRoster;
    })
    .map(({ id, data }) => projectMinimal(id, data));
}

function sanitizeRecipientRoles(input) {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(
    input.filter((r) => typeof r === "string").map(normRole).filter(Boolean)
  )).slice(0, MAX_RECIPIENT_ROLES);
}

// Valida una petición de destinatarios: el llamador debe ser global o de
// coordinación/gerencia y cada rol pedido debe estar en la allowlist.
function checkRecipientRequest(scope, input) {
  if (!scope || scope.level === "none") {
    return { error: "permission-denied" };
  }
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_RECIPIENT_ROLES ||
      input.some((r) => typeof r !== "string")) {
    return { error: "invalid-argument" };
  }
  const roles = Array.from(new Set(input.map(normRole)));
  if (roles.some((r) => !RECIPIENT_ROLE_ALLOWLIST.includes(r))) {
    return { error: "invalid-argument" };
  }
  if (!(scope.level === "global" || scope.crossSedeRoster) &&
      !roles.every((r) => LEADERSHIP_RECIPIENT_ROLES.includes(r))) {
    return { error: "permission-denied" };
  }
  return { roles };
}

// Solo correo + rol: lo mínimo para dirigir una notificación.
function buildRecipients(roles, docs) {
  const wanted = new Set(roles);
  if (wanted.size === 0) return [];
  const seen = new Set();
  const out = [];
  docs.forEach(({ data }) => {
    if (!data || isInactive(data)) return;
    const email = clean(projectMinimal("", data).email);
    if (!email) return;
    if (seen.has(email)) return;
    if (![...rolesOf(data)].some((r) => wanted.has(r))) return;
    seen.add(email);
    out.push({ email, role: data.role || data.appRole || "" });
  });
  return out;
}

module.exports = {
  GLOBAL_ROLES,
  CROSS_SEDE_ROSTER_ROLES,
  GLOBAL_EMAILS,
  MINIMAL_FIELDS,
  RECIPIENT_ROLE_ALLOWLIST,
  MAX_DIRECTORY_DOCS,
  SEDE_ALIASES,
  canonicalSede,
  sedeKey,
  sedeAliasList,
  checkRecipientRequest,
  resolveScope,
  buildDirectory,
  sanitizeRecipientRoles,
  buildRecipients,
  sameSede,
  isInactive
};
