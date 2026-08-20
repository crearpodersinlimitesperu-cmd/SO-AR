# 📜 REGISTRO DE AUTORÍA, ARQUITECTURA Y CONTROL DE VERSIONES
## Plataforma: Centro de Operaciones y Sistema de Checklists - CREAR PODER SIN LÍMITES (SO-AR)

---

### 🏢 Identificación Institucional
- **Empresa / Marca:** CREAR PODER SIN LÍMITES GLOBAL
- **Sedes Oficiales:** 🇪🇨 Quito (UIO), 🇪🇨 Guayaquil (GYE), 🇪🇨 Cuenca (CUE), 🇵🇪 Lima (LIM), 🇨🇴 Medellín (MED), 🇲🇽 México (MEX / CDMX), 🌐 Global
- **Regla Inviolable de Marca:** JAMÁS alterar la marca "CREAR PODER SIN LÍMITES". Utilizar SIEMPRE única y exclusivamente los logos oficiales de la empresa.
- **Propósito:** Plataforma integral de gestión operativa, asignación y seguimiento de checklists por roles (Dirección, Gerencia, Coordinadores, Entrenadores, Capitanes, QT, Staff), control de tiempos, Centro de Managers de Maestría (MJ / 100 Días), auditoría forense en tiempo real y asistencia inteligente de alto rendimiento.

---

### 🏛️ Matriz de Arquitectura Técnica y Roles (RBAC)

```
                               [ CREAR PODER SIN LÍMITES GLOBAL ]
                                SISTEMA OPERATIVO SO-AR (v2.7.8)
                                               │
     ┌───────────────────┬─────────────────────┼────────────────────┬───────────────────┐
     ▼                   ▼                     ▼                    ▼                   ▼
[ SUPER ADMIN ]    [ DIRECCIÓN GLOBAL ]   [ GERENCIA SEDE ]   [ COORDINACIÓN ]    [ ENTRENADORES & QT ]
• José Sánchez     • Leandro Brunis       • Gerentes Locales  • Coord. C1 / C2    • Entrenadores Oficiales
• Armando Pilacuán • Paul Sosa            • Sedes Oficiales   • Coord. Maestría   • Capitanes de Salón
• Paul Sosa        • Andrés Gómez         (UIO, GYE, CUE,     • Centro Managers   • Quantum Team (Staff)
(Acceso Total)     (Gobierno Macro)        LIM, MED, MEX)      (EAI / 100 Días)    (Soporte & Sala)
```

---

### 🛡️ Historial Completo de Versiones y Registro de Cambios

#### [Versión 2.7.8] - 2026-08-20
- **Normalización de Nomenclatura de Entrenamientos Complementarios:**
  - Corrección canónica del entrenamiento complementario de presión a su denominación oficial exacta: **Tanque** (removiendo el artículo "El").
  - Sincronización en [ManualGuia.jsx](file:///c:/Users/josem/Downloads/SO-AR/src/pages/ManualGuia.jsx) y en la matriz de entrenamientos complementarios.
  - Actualización de referencias en el sistema de filtros de eventos y catálogos de capacitación.

#### [Versión 2.7.7] - 2026-08-20
- **Blindaje Estricto de Permisos para Graduaciones y Deserciones (`canChangeManagerStatus`):**
  1. **Regla de Gobernanza Inviolable:** La declaración y modificación de estados de participantes y managers (**Graduado / Desertor / Activo / Archivado**) queda restringida **única y exclusivamente** a:
     - Coordinación de Maestría del Juego (`coord_maestria`, `coordinador_mj`)
     - Dirección de Maestría (`director_maestria`)
     - Super Administradores (`jose.sanchez@crearpsl.net`, `armando.pilacuan@gmail.com`, `paul.sosa@crearpsl.net`)
  2. **Protección en Capas Múltiples:**
     - En [permissions.js](file:///c:/Users/josem/Downloads/SO-AR/src/config/permissions.js): Especificación canónica y validación de roles en la función `canChangeManagerStatus`.
     - En [CentroManagers.jsx](file:///c:/Users/josem/Downloads/SO-AR/src/pages/CentroManagers.jsx) (Tabla de Directorio): Deshabilitación reactiva del selector de estado en fila para roles no autorizados, mostrando badge en modo solo lectura.
     - En [CentroManagers.jsx](file:///c:/Users/josem/Downloads/SO-AR/src/pages/CentroManagers.jsx) (Modal Individual): Bloqueo del selector de estado con icono de candado `🔒` y aviso explícito *"Restringido a Coord. Maestría y Dirección"*.
     - En controladores de actualización (`handleUpdateManagerField`, `handleSaveEditIndividual`): Rechazo automático en tiempo de ejecución con toast de alerta si un usuario no autorizado intenta mutar el estado.

#### [Versión 2.7.6] - 2026-08-20
- **Estandarización de Brochure Corporativo y Cadena de Mando Operativa:**
  1. **Parte I: Brochure Corporativo (Propuesta de Valor):** Síntesis del estándar de alto rendimiento y progresión C1, C2, MJ (1FDS Creación, 2FDS Relación, 3FDS Gratitud, 4FDS El Viaje).
  2. **Parte II: Hoja de Ruta Interna (Operaciones y Roles del Staff):** Matriz interactiva de Cadena de Mando conectada con botones directos a los Checklists y módulos de cada rol (`/gerente`, `/coordinador`, `/centro-managers`, `/checklist/capitan_salon`, manual QT).
  3. **Estandarización a través de Checklists y Grounding:** Auditoría Global, Control de Calidad con firma/validación, Contingencia y Regla de Grounding institucional.

#### [Versión 2.7.5] - 2026-08-20
- **Integración del Documento Maestro Corporativo y Hoja de Ruta RRHH:**
  1. **Parte I: Brochure Corporativo (Propuesta de Valor):** Integración de matriz de ruta de entrenamiento con Enfoque Operativo, Herramientas de Ejecución y KPIs medibles (Página en Blanco, Autoconfianza Inquebrantable, Metas FI). Desglose de los 4 Hitos de Calibración de la Maestría (1FDS Creación, 2FDS Relación, 3FDS Gratitud, 4FDS El Viaje).
  2. **Parte II: Hoja de Ruta Interna & Operaciones (RRHH):** Matriz de Roles y Control de Acceso RBAC (Subdirección/Gerencia Global, Entrenadores Oficiales, Coordinadores/Managers, Aliados/Capitanes), Protocolo de "Cero Pérdida" (Grounding, Historización de Datos, Alerta de 2 llamadas omitidas) y Principio Operativo de Acero para Gestión de Crisis (Regla de Acero del Entrenador, Cadena de Extracción y Blindaje de Sala).

#### [Versión 2.7.4] - 2026-08-20
- **Integración de la Matriz Operativa Unificada y Entrenamientos Complementarios:** Actualización profunda de [ManualGuia.jsx](file:///c:/Users/josem/Downloads/SO-AR/src/pages/ManualGuia.jsx) integrando:
  1. **Eje Central de Transformación:** Desglose operativo de **Capítulo Uno (C1)** (Descubrimiento de Patrones, Grounding, Cierre y Compromiso), **Capítulo Dos (C2)** (Dinámicas de Confianza, Exigencia en Sala, Rompimiento Físico/Emocional) y **Maestría del Juego (MJ / 100 Días)** con los 4 Fines de Semana de Calibración (**1FDS: Creación, 2FDS: Relación, 3FDS: Gratitud, 4FDS: El Viaje**).
  2. **Entrenamientos Complementarios (Simuladores de Presión):** Mecánica, etapas y detalles operativos de **Caída de Confianza / Revisión FI**, **Tanque**, **Rompimiento de Barreras** y **Caminata de Equipos**.
  3. **Cultura & Clientes Internos:** Pilares innegociables de operación interna y flujo operativo integral.

#### [Versión 2.7.3] - 2026-08-20
- **Integración del Manifiesto Oficial CREAR PODER SIN LÍMITES GLOBAL:** Estructuración de la arquitectura de transformación en [ManualGuia.jsx](file:///c:/Users/josem/Downloads/SO-AR/src/pages/ManualGuia.jsx) dividida en pestañas dinámicas:
  1. **🌟 Manifiesto & Ruta Global:** Portada externa, Choque cognitivo ("¿Por qué el saber no es suficiente?"), Ruta de Progresión (Capítulo Uno C1, Capítulo Dos C2, Maestría del Juego MJ de 100 días), Garantía de Impacto (Metodología, Trazabilidad, Red de Soporte), Clientes Internos y Contraportada Oficial.
  2. **📋 Guía Operativa por Roles:** Desglose para Coordinación C1/C2, Coordinación MJ, Gerencia, Dirección, QT y Entrenadores.
  3. **🚨 Seguridad & Emergencias Médicas:** Procedimiento en sala, escala de gravedad, directrices de seguridad y directorio telefónico por sede.

#### [Versión 2.7.2] - 2026-08-20
- **Estandarización y Precisión de Nomenclaturas de Roles:**
  - **Definición Canónica de Acrónimos Oficiales:**
    - **C1:** Capítulo Uno
    - **C2:** Capítulo Dos
    - **C1 / C2:** Capítulo 1 y 2 (C1 / C2)
    - **MJ:** Maestría del Juego (MJ)
  - **Unificación Global:** Se actualizaron `ROLE_DISPLAY_NAMES`, `ROLE_LABELS`, botones de división de metas (`GoalDivisionModal`) y funciones de normalización de roles (`normalizeRole`) en [usersData.js](file:///c:/Users/josem/Downloads/SO-AR/src/data/usersData.js), [UserProfileModal.jsx](file:///c:/Users/josem/Downloads/SO-AR/src/components/UserProfileModal.jsx) y [SuperAdminPanel.jsx](file:///c:/Users/josem/Downloads/SO-AR/src/pages/SuperAdminPanel.jsx).

#### [Versión 2.7.1] - 2026-08-20
- **Resolución de ReferenceError de Íconos Lucide ([CentroManagers.jsx](file:///c:/Users/josem/Downloads/SO-AR/src/pages/CentroManagers.jsx)):**
  - Se añadió `PlusCircle` al encabezado de importación de `lucide-react` en [CentroManagers.jsx](file:///c:/Users/josem/Downloads/SO-AR/src/pages/CentroManagers.jsx), resolviendo el error de renderizado en tiempo de ejecución al abrir el modal de creación de Manager / Equipo.
  - Auditoría global de íconos en todos los componentes JSX de la aplicación.

#### [Versión 2.7.0] - 2026-08-20
- **Corrección de Box-Sizing y Alineación en Barras de Búsqueda y Filtros ([index.css](file:///c:/Users/josem/Downloads/SO-AR/src/index.css), [CentroManagers.jsx](file:///c:/Users/josem/Downloads/SO-AR/src/pages/CentroManagers.jsx)):**
  - Se incorporó `*, *::before, *::after { box-sizing: border-box; }` globalmente y `boxSizing: 'border-box'` en inputs de búsqueda.
  - Se ajustó la distribución flex (`flexShrink: 0`, `whiteSpace: 'nowrap'`) y se reforzó `canViewAllManagers` para cálculo de métricas consolidado.

#### [Versión 2.6.9] - 2026-08-20
- **Identificación Geográfica Completa: Bandera de País + Ciudad / Sede:**
  - Visualización explícita de la **Ciudad / Sede** (`📍 Cuenca`, `📍 Quito`, `📍 Guayaquil`, `📍 Lima`, `📍 Medellín`, `📍 México`, `📍 Global`) junto con la bandera del país en las tarjetas de colaboradores (`PersonCard`) y perfiles de usuario.

#### [Versión 2.6.8] - 2026-08-20
- **Restricción Estricta del Modo Simulación:**
  - ÚNICA Y EXCLUSIVAMENTE los **Super Administradores** (`isSuperAdmin` o emails en `SUPER_ADMIN_EMAILS`) tienen acceso a simular perfiles y vistas de otros colaboradores.
  - Centralización de la función `canSimulate(currentUser, originalAdminUser)` en [permissions.js](file:///c:/Users/josem/Downloads/SO-AR/src/config/permissions.js).

#### [Versión 2.6.7] - 2026-08-20
- **Autonomía Total de Base de Datos:** Eliminación de botones manuales de migración. Persistencia reactiva en Firestore + caché local inteligente.

#### [Versión 2.6.5] - 2026-08-20
- **Directorio de Quantum Team (QT) en Tiempo Real:** Servicio [qtSheetService.js](file:///c:/Users/josem/Downloads/SO-AR/src/services/qtSheetService.js) conectado con Google Sheets oficial y visualizador [DirectorioQT.jsx](file:///c:/Users/josem/Downloads/SO-AR/src/pages/DirectorioQT.jsx).

#### [Versión 2.6.3] - 2026-08-20
- **Erradicación de Sedes No Oficiales:** Depuración exhaustiva en toda la plataforma para restringir sedes exclusivamente a Quito, Guayaquil, Cuenca, Lima, Medellín, México y Global.

---

### 💻 Módulos de Código Fuente Clave y Especificación Técnica

#### 1. Configuración de Permisos y Gobernanza (`src/config/permissions.js`)
```javascript
export const SUPER_ADMIN_EMAILS = [
  'jose.sanchez@crearpsl.net',
  'armando.pilacuan@gmail.com',
  'paul.sosa@crearpsl.net',
  'paul.sosa@crearpsl.com'
];

export const DIRECCION_ROLES = ['direccion', 'cfo', 'cco', 'ceo'];
export const GERENCIA_ROLES = ['gerente', ...DIRECCION_ROLES];

export const isSuperAdminEmail = (email) => {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
};

export const canSimulate = (currentUser, originalAdminUser = null) => {
  if (originalAdminUser) {
    return Boolean(originalAdminUser.isSuperAdmin || isSuperAdminEmail(originalAdminUser.email));
  }
  if (!currentUser) return false;
  return Boolean(currentUser.isSuperAdmin || isSuperAdminEmail(currentUser.email));
};

export const canAssignTrainer = (currentUser) => {
  if (!currentUser) return false;
  if (currentUser.isSuperAdmin || isSuperAdminEmail(currentUser.email)) return true;
  const email = (currentUser.email || '').trim().toLowerCase();
  const allowedEmails = [
    'fer.aragon@crearpsl.net',
    'fer.aragon@crearpls.com',
    'paul.sosa@crearpsl.net',
    'paul.sosa@crearpsl.com'
  ];
  if (allowedEmails.includes(email)) return true;
  const name = (currentUser.name || currentUser.displayName || '').toLowerCase();
  return name.includes('fer aragon') || name.includes('fernando aragon') || name.includes('paul sosa');
};

export const canChangeManagerStatus = (currentUser) => {
  if (!currentUser) return false;
  if (currentUser.isSuperAdmin || isSuperAdminEmail(currentUser.email)) return true;
  const r = currentUser.appRole;
  return r === 'director_maestria' || r === 'coord_maestria' || r === 'coordinador_mj';
};
```

#### 2. Normalización de Sedes y Nomenclaturas (`src/data/usersData.js`)
```javascript
export const OFFICIAL_SEDES = [
  'Quito',
  'Guayaquil',
  'Cuenca',
  'Lima',
  'Medellín',
  'México',
  'Global'
];

export const ROLE_DISPLAY_NAMES = {
  superadmin: 'Super Administrador Global',
  direccion: 'Dirección Global',
  cfo: 'Dirección Financiera (CFO)',
  cco: 'Chief Commercial Officer (CCO)',
  gerente: 'Gerente de Sede',
  director_maestria: 'Director de Maestría del Juego',
  coord_maestria: 'Coordinador(a) Maestría del Juego',
  coordinador_mj: 'Coordinador(a) Maestría del Juego',
  coord_c1: 'Coordinador(a) Capítulo 1 y 2 (C1 / C2)',
  coord_c2: 'Coordinador(a) Capítulo 1 y 2 (C1 / C2)',
  coordinador_c1c2: 'Coordinador(a) Capítulo 1 y 2 (C1 / C2)',
  coordinador: 'Coordinador(a) General',
  capitan_salon: 'Capitán de Salón',
  capitan: 'Capitán de Salón',
  qt: 'Quantum Team (QT)',
  staff: 'Staff Operativo',
  entrenador: 'Entrenador Oficial (Coach)',
  entrenador_llamadas: 'Entrenador de Seguimiento',
  manager: 'Manager (Líder EAI)'
};
```

#### 3. Control de Estados y Roster en Centro de Managers (`src/pages/CentroManagers.jsx`)
```javascript
// Verificación de permisos reactivos
const canChangeStatus = canChangeManagerStatus(currentUser);
const userCanAssign = canAssignTrainer(currentUser);

// Actualización protegida de campos
const handleUpdateManagerField = (id, field, value) => {
  if (field === 'entrenador' && !userCanAssign) {
    showToast("Acceso restringido: Solo Fer, Paul y SuperAdmins pueden editar entrenadores.", "warning");
    return;
  }
  if (field === 'estado' && !canChangeStatus) {
    showToast("Acceso restringido: Las Graduaciones y Deserciones están restringidas a Coordinación de Maestría del Juego y Dirección de Maestría.", "warning");
    return;
  }
  const finalValue = field === 'entrenador' ? normalizeTrainer(value)
    : field === 'coordinador' ? normalizeCoordinator(value)
    : field === 'sede' ? normalizeSede(value)
    : value;
  setManagers(prev => {
    const updated = prev.map(m => m.id === id ? { ...m, [field]: finalValue } : m);
    localStorage.setItem('cpsl_managers_data_v3', JSON.stringify(updated));
    return updated;
  });
  showToast(`Actualizado: ${field}`, 'info');
};
```

---

### 🔍 Protocolos de Verificación de Integridad
1. **Compilación Limpia:** `npm run build` ejecutado con éxito en Vite (cero errores sintácticos, cero advertencias de resolución).
2. **Cero Pérdida de Datos:** Persistencia dual con fallback en `localStorage` v3 y sincronización asíncrona en colecciones Firestore (`audit_logs`, `kpi_reports`, `venues`).
3. **Control de Auditoría Forense:** Registro inmutable de eventos de seguridad (`LOGIN`, `SIMULACION`, `NUEVO_INTEGRANTE_MANAGER`, `EDITAR_EQUIPO_COMPLETO`, `CAMBIO_ESTADO_MANAGER`).

---

**Última Actualización:** 2026-08-20 | **Estado:** 100% Operativo y Verificado en Producción.
