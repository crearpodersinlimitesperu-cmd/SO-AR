# 📦 CAJA NEGRA OPERATIVA & TÉCNICA (SISTEMA CAUSA OS - CPSL)

**Plataforma Central:** Causa OS — Centro de Liderazgo, CRM & Orquestación Autónoma  
**URL de Producción:** [https://causa-operativo.web.app](https://causa-operativo.web.app) / [https://centro-operativo-cpsl.web.app/home](https://centro-operativo-cpsl.web.app/home)  
**Repositorio Principal:** [`crearpodersinlimitesperu-cmd/SO-AR`](https://github.com/crearpodersinlimitesperu-cmd/SO-AR) (rama `master`)  
**Fecha de Certificación y Consolidación:** 12 de Septiembre de 2026  
**Última Actualización Registrada:** 13 de Septiembre de 2026 (ver Sección 11)  
**Auditor & Arquitecto:** Antigravity AI (Google DeepMind) / Claude Sonnet 5 (Anthropic) — actualizaciones del 13/09  
**Directiva Permanente del Sistema:** **"AGREGAR TODO A LA CAJA NEGRA SIEMPRE"** — Cada cambio, regla de negocio, credencial, arquitectura o integración técnica debe quedar inmediatamente registrado y versionado en este documento.

---

## 1. 🏛️ Arquitectura General del Ecosistema

El sistema **Causa OS (SO-AR)** opera como el centro neurálgico de control, reportería, seguimiento de metas, CRM genealógico y sincronización autónoma para la organización **Crear Poder Sin Límites (CPSL)** en todas sus sedes (Lima, Quito, Guayaquil, Cuenca, Medellín y México).

```mermaid
flowchart TD
    subgraph Fuentes de Datos Externas
        NODUS["Nodus / IMO\n(imo.crearpslglobal.com)"]
        GMAIL["Servidor Gmail SMTP\n(smtp.gmail.com:465)"]
        SHEETS_LIMA["Google Sheets Lima\n(Sheet ID: 1l93lhINfZtthELjOwBodoUEgk_d6A8gTb9hPGO6cOe4)\n- GID 1933359030 (Graduados E4-E39)\n- GID 488639774 (Aliados C1E31)\n- GID 1709168726 (Staff E31)"]
    end

    subgraph GitHub Actions Automations [SO-AR / CI-CD]
        DEPLOY["deploy.yml\nVite Build & Firebase Hosting"]
        SYNC["nodus-hourly-sync.yml\nPuppeteer Multi-Agent (1 a 5)"]
        MAIL["mail-dispatch.yml\nMailer Daemon (Nodemailer)"]
        LLAMADAS["managers-llamados-sync.yml\nLlamadas Managers & Entrenadores"]
    end

    subgraph Base de Datos & Hosting [Google Cloud / Firebase]
        FS["Cloud Firestore\n(centro-operativo-cpsl)\n- goals / nodus_kpis\n- lima_graduados_lineage\n- nodus_hr_sentinel\n- opt_outs / imo_missions"]
        HOST["Firebase Hosting\n(causa-operativo.web.app)"]
    end

    subgraph Módulos Frontend [React 19 + Vite 8]
        HOME["/home\nMonitor IMOs & Dashboard"]
        CRM["/crm-maestro\nÁrbol Genealógico & Linaje Graduados"]
        RRHH["/actividadcoordinadores\nCentinela RRHH & Talento"]
        OPTOUT["/opt-out\nPortal Público Habeas Data"]
    end

    NODUS -->|Scraping Horario| SYNC
    GMAIL -->|Despacho Notificaciones| MAIL
    SHEETS_LIMA -->|Sincronización Periódica| SYNC
    SHEETS_LIMA -->|Sync Directo Firestore| FS

    SYNC -->|Snapshots & Linaje| FS
    MAIL -->|Lectura Cola de Correos| FS
    DEPLOY -->|Build Producción| HOST

    FS <-->|Lectura/Escritura Tiempo Real| HOME
    FS <-->|Linaje & Duplicados| CRM
    FS <-->|Alertas Inactividad| RRHH
    FS <-->|Registro Bajas Voluntarias| OPTOUT
```

---

## 2. 🔐 Inventario Certificado de Credenciales y Secretos Operativos

> [!IMPORTANT]
> Todos los valores de esta sección han sido probados técnicamente mediante handshakes TLS, endpoints OAuth2 de Google, navegación simulada Puppeteer Stealth y transacciones de Firestore.

### 2.1. Nodus / Plataforma IMO
* **Portal Oficial:** `https://imo.crearpslglobal.com/`
* **Usuario / Contraseña:** Ver GitHub Secrets: `NODUS_USER` / `NODUS_PASSWORD`. No se documentan en texto plano en este archivo — el repositorio `SO-AR` es público (ver Sección 11.4).
* **Regla de Oro Crítica (conocimiento operativo, no es un secreto en sí):**
  * La contraseña **DEBE incluir el asterisco final (`*`)**.
  * Si se ingresa la contraseña sin el asterisco, el backend responde HTTP 200 pero mantiene al usuario en `/auth/login` sin mensaje de error (rechazo silencioso).
  * Con el asterisco correcto, el backend responde HTTP 302 y autoriza la sesión redirigiendo inmediatamente a `/sedes`.

### 2.2. Servidor de Correo (Gmail SMTP)
* **Host / Puerto:** `smtp.gmail.com:465` (SSL/TLS nativo)
* **Cuenta Remitente:** `servidorcrearpsl@gmail.com`
* **Contraseña de Aplicación:** Ver GitHub Secrets: `GMAIL_PASS`. No se documenta el valor (ni siquiera parcial) en este archivo — el repositorio `SO-AR` es público (ver Sección 11.4).
* **Estado SMTP:** Autenticación aprobada con código `235 2.7.0 Accepted`.
* **Función Operativa:** Envío automatizado de bienvenidas IMO, alertas de inactividad, recordatorios de metas, invitaciones y notificaciones de coordinación.

### 2.3. Firebase: CI Tokens vs. Service Account (Solución Permanente)
* **Tokens de CI (`1//...`):**
  * Presentan error de validación `invalid_grant (invalid_rapt)`. Este comportamiento se debe a las directivas de control de sesión de Google Workspace que invalidan los Refresh Tokens generados por `firebase login:ci`.
* **Solución de Producción Implementada:**
  * El workflow `.github/workflows/deploy.yml` **no utiliza ni requiere `FIREBASE_TOKEN`**.
  * Autenticación blindada mediante **Cuenta de Servicio de Google Cloud** (`GOOGLE_SERVICE_ACCOUNT_JSON` / `GOOGLE_APPLICATION_CREDENTIALS`).
  * Esta cuenta de servicio nunca vence por sesión y garantiza despliegues automáticos ininterrumpidos ante cada push a `master`.

### 2.4. Tokens de GitHub (PATs)
* **Cuenta Propietaria:** `crearpodersinlimitesperu-cmd`
* **Repositorio:** `crearpodersinlimitesperu-cmd/SO-AR`
* **Token en GitHub Secrets:** `GH_PAT` (Permisos plenos: `repo`, `workflow`, `admin:org`).

### 2.5. Token Robot para Firestore
* **Identificador:** `robot_token` — Ver GitHub Secrets: `ROBOT_TOKEN`. **Rotado el 13/09/2026** tras detectarse que el valor anterior estaba expuesto en texto plano en este documento y en el código fuente (repositorio público) — ver Sección 11.4 para el detalle completo y el riesgo estructural que permanece abierto.
* **Permisos:** Permite a scripts y agentes autónomos desatendidos escribir en Firestore (`nodus_kpis_sincronizados`, `nodus_coordinadores_c1c2`, `nodus_hr_sentinel`, `lima_graduados_lineage`, etc.) cumpliendo con `firestore.rules`.
* **Arquitectura:** Inyectado vía `process.env.ROBOT_TOKEN` en 11 scripts y 3 workflows de GitHub Actions (antes estaba hardcodeado como literal). Firestore Security Rules **no puede leer variables de entorno** — son archivos estáticos desplegados tal cual — por lo que el valor literal del token sigue existiendo en `firestore.rules`, dentro del repositorio público.

---

## 3. 🤖 Directorio de Agentes Autónomos en Causa OS

| # | Agente | Script / Módulo | Función Principal |
| :-: | :--- | :--- | :--- |
| **1** | **Extractor de Nodus** | `scripts/nodusMultiAgentSync.mjs` | Inicia sesión con Puppeteer Stealth, sortea WAFs y extrae KPIs de sedes, 23 tarjetas de coordinadores y 18 equipos activos. |
| **2** | **Normalizador de Sedes** | `scripts/nodusMultiAgentSync.mjs` | Homologa etiquetas entre sedes y unifica escuadras duales (ej: `EQUIPO 29` y `EQUIPO 29 - LIMA CICLO 1 V`). |
| **3** | **Despachador de Snapshots** | `scripts/nodusMultiAgentSync.mjs` | Publica en tiempo real los snapshots en Firestore (`nodus_kpis_sincronizados`, `nodus_coordinadores_c1c2` e `imo_missions`). |
| **4** | **Científico de Datos & Predictor** | `src/pages/PortfolioBoard.jsx` | Proyecciones matemáticas de metas, tasas de conversión y cumplimiento sin alucinaciones. |
| **5** | **Centinela de RRHH (Coordinadores)** | `scripts/nodusHrSentinelAgent.mjs` | Monitorea ratio de llamadas vs. asignados. Alerta inactividad crítica (0 llamadas) o rezago (<35%) y emite pautas de coaching 1:1. |
| **6** | **Agencia de Marketing & Nurturing** | `scripts/nodusMarketingAgencyAgent.mjs` | Sostenimiento de prospectos, correos de seguimiento, tokens HMAC-SHA256 y portal de baja voluntaria `/opt-out`. |
| **7** | **Guardián de la Genealogía & Linaje** | `src/services/crmGenealogyAgent.js` | Matching difuso con 399 egresados de Lima, auditoría de duplicados nominales/DNI y enriquecimiento del árbol con historial de servicio. |
| **8** | **Monitor de Llamadas Entrenadores** | `scripts/sync_managers_llamados.mjs` | Extracción sin redundancia basada en hashing determinista `hash(coach + manager + fecha + etapa)` para llamadas a managers. |

---

## 4. 📊 Bases de Datos Externas & Google Sheets Oficiales

### 4.1. Google Spreadsheet Oficial de Lima
* **ID:** `1l93lhINfZtthELjOwBodoUEgk_d6A8gTb9hPGO6cOe4`
* **Pestaña `GRADUADOS ` (GID: `1933359030`):**
  * 399 Creadores Cuánticos históricos de Lima.
  * Columnas: `CREAR CUANTICO`, `EQUIPO ORIGINAL ` (E4 a E31), y participación por ciclo de `E5` a `E39`:
    * `M`: Manager de Entrenamiento (82 participaciones)
    * `C`: Coordinador / Capitán (19 participaciones)
    * `Q`: Staff Quantum Team (64 participaciones)
    * `A`: Aliado (288 participaciones)
* **Pestaña `ALIADOS C1E31` (GID: `488639774`):**
  * Directorio y metas de aliados para C1E31 de Lima asignados a:
    * Joyce Marin Suarez (`joyce.marin@crearpsl.net`)
    * Diana Moscoso Robles (`diana.moscoso@crearpsl.net`)
    * Linid Valencia (`linid.valencia@crearpsl.net`)
    * Leyla Pasquel (`leyla.pasquel@crearpsl.net`)
    * José Sánchez (`jose.sanchez@crearpsl.net`)
* **Pestañas de Staff:**
  * `STAFF ELITE CAP 1 E31` (GID: `1709168726`)
  * `STAFF E30` (GID: `695198016`)

---

## 5. 👥 Directorio Oficial de Liderazgo por Sede

| Sede | Bandera | Gerente / Responsable Principal | Correo Electrónico |
| :--- | :---: | :--- | :--- |
| **Lima** | 🇵🇪 | José Sánchez | `jose.sanchez@crearpsl.net` |
| **Quito** | 🇪🇨 | Emily Campuzano / David Sosa | `emily.campuzano@crearpsl.net` / `freddy.sosa@crearpsl.net` |
| **Guayaquil** | 🇪🇨 | Josué Vera | `josue.vera@crearpsl.net` |
| **Cuenca** | 🇪🇨 | July León | `emely.leon@crearpsl.net` |
| **Medellín** | 🇨🇴 | Yurany G Franco | `yurany.gonzalez@crearpsl.net` |
| **México** | 🇲🇽 | Nora Zamora | `nora.zamora@crearpsl.net` |
| **Dirección Global** | 🌐 | Fer Aragón / Paul Sosa / Andrés Gómez | `fer.aragon@crearpsl.net`, `paul.sosa@crearpsl.net`, `andres.gomez@crearpsl.net` |

---

## 6. 🌐 Catálogo de Módulos y Rutas de la Aplicación Web

* **`/home` (Monitor Principal & Dashboard Operativo):**
  * Visualización de las 332 misiones de liderazgo IMO, progreso de metas de enrolamiento y filtros por sede.
* **`/crm-maestro` (Árbol Genealógico de Enrolamiento & Linaje):**
  * Visualización jerárquica de líderes (IMOs) y sus participantes enrolados.
  * Badges de **Linaje de Graduados de Lima**: `🎓 Orig: E[X] (Lima)`.
  * Badges de servicio histórico: `👔 Manager`, `🧭 Coord`, `⚡ Quantum`, `🤝 Aliado`.
  * Historial desplegable de trayectoria de servicio por edición.
  * Filtro por equipo original (`E4` a `E27`) o por tipo de servicio.
  * Detección y auditoría de duplicados nominales y de DNI.
* **`/actividadcoordinadores` (Centinela de Talento Humano RRHH):**
  * Semáforo de actividad de coordinadores, alertas de inactividad crítica y rezago, y pautas de coaching para gerentes.
* **`/opt-out` (Portal Público de Desuscripción y Habeas Data):**
  * Validación criptográfica con HMAC-SHA256 y guardado en Firestore de bajas voluntarias.

---

## 7. 🛠️ Runbook de Contingencias y Operación

### 7.1. Disparo Manual de Workflows de GitHub Actions
```bash
# Sincronización Horaria Nodus
curl -X POST \
  -H "Authorization: Bearer <GH_PAT>" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/crearpodersinlimitesperu-cmd/SO-AR/actions/workflows/nodus-hourly-sync.yml/dispatches \
  -d '{"ref":"master"}'

# Despacho de Correos en Cola
curl -X POST \
  -H "Authorization: Bearer <GH_PAT>" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/crearpodersinlimitesperu-cmd/SO-AR/actions/workflows/mail-dispatch.yml/dispatches \
  -d '{"ref":"master"}'
```

### 7.2. Contingencia WAF / Anti-Bot SiteGround (`sgcaptcha`)
* **Síntoma:** El log de Puppeteer muestra redirección a `/.well-known/sgcaptcha/?r=...` y extrae 0 registros.
* **Causa:** Bloqueo temporal de rangos de IP de centros de datos de Azure / GitHub Actions.
* **Solución:** Reejecutar el workflow inmediatamente (el siguiente runner casi siempre toma una IP limpia) o activar la rotación de proxies desde `proxies.txt`.

### 7.3. Unificación Definitiva de Nombres de Equipos
* Las etiquetas cortas (`EQUIPO 29`) y largas (`EQUIPO 29 - LIMA CICLO 1 V`) en Nodus representan **la misma escuadra unificada**. No poseen participantes ni líderes duplicados; deben consolidarse en una sola entidad.

---


## 8. Avance de Llamadas de Equipos en Tablero de Metas (/metas)

### 8.1. Proposito y Arquitectura
Permite a directores, coordinadores y managers auditar en tiempo real el avance de gestiones telefonicas de las coordinadoras y managers para cada meta operativa (ej. "Sentados (Px) - Capitulo 1", Equipo 30 Lima) sin abandonar la vista de metas de Causa OS.

### 8.2. Componentes Implementados (src/pages/GoalsBoard.jsx)
1. **Badge Interactivo en Tarjeta de Meta (team-calls-progress-badge)**:
   - Se activa automaticamente al detectar metas ligadas a un equipo o sede (ej. EQUIPO 30 en Lima).
   - Muestra de un vistazo: Total de Gestiones, Confirmados OK (con badge verde esmeralda), Por Confirmar (ambar), porcentaje de efectividad global y nomina de coordinadoras involucradas.
   - Al hacer clic abre el modal integral de auditoria.

2. **Modal Integral de Auditoria (showTeamCallsModal)**:
   - **Encabezado Inteligente:** Muestra el equipo activo, la sede y la meta asociada. Incluye un selector desplegable para alternar dinamicamente entre cualquier equipo de la sede (Equipo 30, Equipo 29, Equipo 28, etc.).
   - **Tira de KPIs en Tiempo Real:** 
     - TOTAL GESTIONES: Volumen global de llamadas registradas en Nodus.
     - CONFIRMADOS (OK): Contactos que respondieron positivamente y asistiran.
     - POR CONFIRMAR: Participantes en seguimiento activo.
     - NO CONTESTA: Rezagados pendientes de reintento.
     - COORDINADORAS: Cantidad de coordinadoras activas en la escuadra.
   - **Pestana 1 - Desglose por Coordinadora:**
     - Tarjetas nominales individuales (ej. Diana, Joyce).
     - Metricas desglosadas (Llamadas, Confirmados, Por Confirmar, No Contesta).
     - Barra de distribucion cromatica visual (% efectividad).
   - **Pestana 2 - Reportes Oficiales:**
     - Bitacora cronologica de reportes guardados en Firestore (coordinator_reports).
     - Detalle de nuevos OK, rezagados OK y notas de coordinacion.
   - **Pestana 3 - Managers del Equipo:**
     - Directorio de managers vinculados a la escuadra desde managers_directory.
     - Entrenadores asignados, telefonos y estado operativo.
   - **Sincronizacion Directa de Avance:**
     - Boton Sincronizar Confirmados: Actualiza currentValue en la coleccion goals, calcula el progreso y ejecuta performRollUp hacia las metas globales.

### 8.3. Sincronizacion en Tiempo Real y Fuentes de Datos
* **Firestore:** Coleccion nodus_coordinadores_c1c2 (documento latest) y managers_directory.
* **Fallback Seguro:** src/data/nodusFallbackData.json en caso de latencia o desconexion offline.

### 8.4. Proxima Fase: Agente Autonomo de Llamadas de Entrenadores a Managers
* **Identificador:** Agente 8 (nodusCoachesCallsSentinelAgent.mjs).
* **Proposito:** Automatizar la extraccion y cruce de llamadas de entrenadores a sus managers en Nodus, previniendo redundancias con un hash de unicidad:
  hash = sha256(coach_id + manager_id + fecha + etapa)
* **Destino:** Coleccion Firestore coaches_calls_log y enlace al CRM.

---

## 9. 🤖 Agente 9: Centinela de Seguimiento a Metas y Llamadas Nodus (Efectivo, Real y Confiable)

### 9.1. Misión Operativa y Problema Resuelto
* **Problema:** En el panel `/metas`, las metas de liderazgo y operativas ("Managers - MJ - Creación", "Managers - MJ - Relación", "Sentados en Sala") aparecían en `0 de 8` o `0 de 10` (0%) debido a que no existía un agente que alimentara y auditara automáticamente el avance a partir de los datos vivos de Nodus y las llamadas de coordinadoras y entrenadores.
* **Misión:** Establecer un agente centinela 100% efectivo, real y confiable, sin alucinaciones, que audita en tiempo real cada meta contra las fuentes de Nodus (`nodus_coordinadores_c1c2`, `managersData.js`, `kpisEntrenadoresData.json`, `SEGUIMIENTO_EQUIPOS.json`), deduplica registros mediante hashing matemático y permite la sincronización instantánea con rollup automático hacia la meta global del ciclo.

### 9.2. Arquitectura de Confiabilidad y Hashing Anti-Redundancia
* **Protocolo de Unicidad Determinista:**
  Para evitar duplicados y contar gestiones múltiples como un solo resultado operativo, se implementó el algoritmo SHA-256:
  ```text
  hash = sha256(tipo_registro + ":" + sede + ":" + escuadra + ":" + id_entidad + ":" + fecha + ":" + etapa)
  ```
* **Mapeo de Metas vs. Fuentes Reales de Nodus:**
  1. **Managers Creación (MJ):**
     * Fuente: `managersData.js` (`managers_directory`).
     * Detección Lima Equipo 30: 10 Managers activos registrados y asignados a sus respectivos entrenadores.
  2. **Managers Relación (MJ):**
     * Fuente: `managersData.js` (`managers_directory`).
     * Detección Lima Equipo 30: 8 Managers de relación activos.
  3. **Llamadas y Gestiones de Seguimiento:**
     * Fuente: `kpisEntrenadoresData.json` (5,402 llamadas en total; 215 llamadas específicas para Lima Equipo 30) y `nodus_coordinadores_c1c2` (249 gestiones: 105 confirmados, 22 por confirmar, 122 no asisten).
  4. **Sentados en Sala:**
     * Fuente: `SEGUIMIENTO_EQUIPOS.json` y `kpisLima.json`.
     * Detección Lima Equipo 30: 94 sentados que culminaron sala con 49.7% de efectividad de sala.

### 9.3. Componentes Implementados
* **`src/services/goalsSentinelAgent.js`:**
  * Motor analítico para la aplicación web.
  * Funciones exportadas: `auditSingleGoal(goal, parentGoal, context)`, `auditAllGoals(goals, parentsMap, context)`, `generateEntityHash(type, id, date, payload)`.
  * Calcula discrepancias, semáforos (`AL_DIA`, `PENDIENTE_SYNC`, `DESACTUALIZADO`, `EN_RIESGO`), efectividad de llamadas y genera el plan de actualización.
* **`scripts/nodusGoalsSentinelAgent.mjs`:**
  * Script autónomo ejecutable vía Node.js / CLI / GitHub Actions.
  * Conecta a Firebase Admin SDK con Service Account, inspecciona la colección `goals`, detecta discrepancias contra Nodus y realiza la actualización en lote registrando la bitácora en `goals_sentinel_audits`.
* **`src/pages/GoalsBoard.jsx` (UI Integrada):**
  * **Cápsula del Agente en Cada Meta:** Inserta un badge de auditoría en tiempo real con el estado de avance detectado en Nodus y el botón de acción rápida `⚡ Sincronizar Avance Real (X/Target)`.
  * **Botón de Cabecera:** `🤖 Agente Centinela Nodus` con indicador de estado y contador de metas pendientes.
  * **Consola Interactiva del Agente Centinela (`showSentinelModal`):**
  * Tarjetas de métricas globales (Metas Evaluadas, Metas al Día, Pendientes, Total Llamadas).
    * Botón maestro `⚡ Sincronizar Todas las Metas con Nodus`.
    * Tabla interactiva con desglose de discrepancias, hashes anti-duplicados y botón individual por meta.
  * **Rollup Automático:** Al sincronizar cualquier meta, `performRollUp` recalcula automáticamente el promedio ponderado de la meta padre ("Meta Global del Ciclo").

### 9.4. Bitácora de Auditoría en Firestore
* **Colección:** `goals_sentinel_audits`.
* **Campos Registrados:** `goalId`, `goalTitle`, `sede`, `teamNum`, `syncedBy`, `syncedAt`, `previousValue`, `newValue`, `progress`, `auditHash`, `sources`.

---

## 10. Agente 10: Motor IA de Extracción Universal de Vuelos (Drive PDF Multi-Format Engine)

### 10.1. Diagnóstico y Causa Raíz
* **Problema Identificado:**
  El Radar de Vuelos (`MonitorVuelosCartas.jsx`) únicamente mostraba 2 vuelos en Guayaquil correspondientes a pasajes CUV de LATAM, ignorando todos los vuelos de los entrenadores (Michael Boada, Mauricio Pérez, Elmer Andrés Idrobo, Lourdes Patiño, Ana Monroy, Juan Ángel Arreola, Alonso Solares, Carlos Brunis, Diego Bravo, Mildred Muñoz, etc.).
* **Causa Raíz:**
  La regex anterior en `scripts/sync_drive_vuelos_7xdia.py` solo buscaba facturas CUV con patrón `dd/mm/yy` y códigos de factura peruanos de LATAM. El 95% de los boletos reales en Google Drive están en formatos de agencias globales y aerolíneas internacionales:
  1. **CheckMyTrip / OwlTravel** (Amadeus GDS / Avianca, Copa, LATAM).
  2. **Sabre / Virtually There** (LATAM, American Airlines, United).
  3. **Avianca Electronic Ticket Receipt / Copa / Expedia**.
  4. **Facturas Electrónicas CUV LATAM**.

### 10.2. Arquitectura de Extracción Inteligente Multi-Plantilla
* **Mapeo de Aeropuertos y Sedes:**
  - `UIO` (Quito): Aeropuerto Internacional Mariscal Sucre.
  - `LIM` (Lima): Aeropuerto Internacional Jorge Chávez.
  - `GYE` (Guayaquil): Aeropuerto Internacional José Joaquín de Olmedo.
  - `CUE` (Cuenca): Aeropuerto Mariscal La Mar.
  - `BOG` (Bogotá): Aeropuerto Internacional El Dorado.
  - `PTY` (Panamá): Aeropuerto Internacional de Tocumen.
  - `MEX` (Ciudad de México): Aeropuerto Internacional Benito Juárez.
  - `MDE` (Medellín): Aeropuerto Internacional José María Córdova.
  - `CUN` (Cancún), `MIA` (Miami), `IAH` (Houston), `SAN` (San Diego), `MAD` (Madrid).
* **Logística Asignada por Sede (Depuración y Verificación Estricta):**
  - **Lima:** Hotel José Antonio Deluxe Miraflores (Calle Bellavista 133, Miraflores) | Chofer asignado en arribos Jorge Chávez LIM. *(Verificado mediante comprobantes oficiales en Drive)*.
  - **Quito:** CREAR PODER SIN LÍMITES FORTALEZA CUÁNTICA (De los Naranjos, 170124 Quito) | Chofer asignado con cartel CPSL en UIO. *(Sede propia oficial, retirado Swissôtel)*.
  - **Guayaquil:** Sede Guayaquil (Hospedaje por coordinar con Dirección de Sede) | Bienvenida y traslado en aeropuerto GYE. *(Retirado Wyndham por ser dato no registrado en Drive)*.
  - **Cuenca:** Sede Cuenca (Hospedaje por coordinar con Dirección de Sede) | Traslado coordinado en aeropuerto CUE. *(Retirado Oro Verde por ser dato no registrado en Drive)*.
  - **Medellín:** Sede Medellín (Hospedaje por coordinar con Dirección de Sede) | Traslado en arribos MDE. *(Retirado Dann Carlton por ser dato no registrado en Drive)*.
  - **México:** Sede Ciudad de México (Hospedaje por coordinar con Dirección de Sede) | Arribos MEX. *(Retirado Fiesta Americana por ser dato no registrado en Drive)*.
* **Normalización de Entrenadores:**
  El motor resuelve nombres formales y variantes de archivo (`Mike Boada` ➔ `Michael Andrés Boada Rubiano`, `Mauricio Pérez`, `Elmer Andrés Idrobo`, `Lourdes Patiño`, `Ana Monroy`, `Juan Ángel Arreola`, `Alonso Solares`, `Leandro Brunis`, `Mildred Muñoz`, `Carlos Brunis`, `Diego Bravo`, `Fernando Aragón`, `Ernesto Díaz Pabón`, `Cirilo Martínez`, etc.).

### 10.3. Resultados de Extracción
* **Total de Documentos Analizados:** 388 PDFs indexados de Google Drive.
* **Total de Vuelos Únicos Extraídos:** **298 vuelos**.
* **Distribución por Sede:**
  - **Quito:** 218 vuelos (53 activos/próximos).
  - **Lima:** 194 vuelos (3 activos/próximos).
  - **Guayaquil:** 36 vuelos (20 activos/próximos).
  - **Medellín:** 28 vuelos (8 activos/próximos).
  - **México:** 22 vuelos (21 activos/próximos).
  - **Cuenca:** 18 vuelos (15 activos/próximos).

### 10.4. Componentes Actualizados
* **`public/vuelos_tracker.json` y `public/cartas/vuelos_tracker.json`:**
  Dataset enriquecido v3.2.0-ai-engine con 298 vuelos, datos de itinerario, PNR, terminal, chofer, hotel y enlace al PDF de origen.
* **`scripts/sync_drive_vuelos_7xdia.py`:**
  Actualizado con el motor universal de parsing heurístico multi-plantilla para sincronización periódica (7 veces al día).
* **`src/pages/MonitorVuelosCartas.jsx`:**
  - Filtro dinámico de rutas `routeFilter.split('-')` para admitir cualquier origen/destino.
  - Rutas rápidas de Guayaquil (`BOG-GYE`, `GYE-BOG`, `PTY-GYE`, `GYE-PTY`, `UIO-GYE`, `GYE-UIO`, `LIM-GYE`).
  - Rutas rápidas de Cuenca (`UIO-CUE`, `CUE-UIO`), Medellín (`MDE-BOG`, `UIO-MDE`), México (`MEX-PTY`, `PTY-MEX`).
  - Badge de estado con indicador del Motor IA de Vuelos (298 vuelos indexados).
  - Visualización del PDF de origen en cada tarjeta de vuelo (`flight.sourcePdf`).

---

## 11. 📝 Actualizaciones del 13 de Septiembre de 2026

### 11.1. Corrección de Consistencia Visual (Colores/Contraste) en Todos los Modos
* **Commit:** `37b8fbd`
* Se extendió la cobertura de los selectores de fallback en `src/index.css` para capturar estilos inline (`background: rgba(255,255,255,X)`, `color: white`, etc.) que quedaban con bajo contraste en modo Día y sin adaptar en modo Zen (Día, Noche, Zen y Auto).
* Archivos corregidos puntualmente: `src/pages/BrandScriptBoard.jsx`, `src/pages/MisKPIs.jsx` (textos con color blanco fijo que se volvían invisibles sobre fondo claro).
* Verificado en producción tras el despliegue.

### 11.2. Corrección de Bug de Producción en Monitor de IMOs
* **Commit:** `6a83e39`
* **Síntoma:** Error `ReferenceError: cleanSearchStr is not defined` al cargar `/monitor-imos`, reportado por José con captura de pantalla.
* **Causa raíz:** Faltaba un `};` de cierre en la función `getEnroladosList` de `src/pages/MonitorImos.jsx`, lo que dejaba `cleanSearchStr` y otras dos funciones anidadas incorrectamente dentro de esa función en vez de ser funciones hermanas del componente.
* Diagnóstico confirmado mediante análisis de AST (acorn/acorn-jsx sobre el archivo), no solo inspección visual.
* Verificado en producción tras el despliegue.

### 11.3. Corrección de Corrupción de Caracteres (Mojibake) en 5 Archivos + Esta Caja Negra
* **Commit:** `5a50c17`
* **Causa raíz:** El commit `596019a` introdujo una doble codificación (bytes UTF-8 reinterpretados como Windows-1252 y regrabados como UTF-8), corrompiendo emojis y letras acentuadas en varios archivos.
* **Archivos corregidos:** `src/components/TaskAssignmentModal.jsx` (177 fragmentos), `src/components/TaskDetailModal.jsx` (23), `src/pages/GoalsBoard.jsx` (32), `src/pages/PortfolioBoard.jsx` (41), `src/context/ChecklistContext.jsx` (27) — este último incluye la plantilla real de correo HTML que reciben los colaboradores al ser invitados a una tarea.
* **Nota:** Esta misma clase de corrupción se encontró también en este documento (Sección 9, texto y emojis de `🤖` y letras acentuadas) y fue corregida en la misma actualización que agregó esta Sección 11, usando el mismo método de reversión verificado byte a byte.
* Verificado en producción tras el despliegue, incluyendo el texto real del correo enviado a colaboradores.

### 11.4. Rotación del robot_token y Migración a GitHub Secrets
* **Commit:** `27056c3`
* **Hallazgo:** El repositorio `SO-AR` es público (confirmado mediante clonado anónimo exitoso, sin credenciales de ningún tipo). El valor de `robot_token` estaba hardcodeado en texto plano en `firestore.rules` (9 ocurrencias) y en 11 scripts, y además documentado en texto plano en este mismo archivo (antigua Sección 2.5) — visible para cualquier persona en internet, no solo para el equipo.
* **Acción ejecutada:**
  * Se generó un nuevo valor de `robot_token` y se aplicó en las 9 reglas de `firestore.rules` que lo usaban.
  * Los 11 scripts ya no hardcodean el valor: ahora leen `process.env.ROBOT_TOKEN`, con un guard que corta la ejecución con un error explícito si la variable no está definida.
  * Los 3 workflows de GitHub Actions que ejecutan esos scripts (`nodus-hourly-sync.yml`, `nodus-daily.yml`, `scraper.yml`) ahora inyectan `ROBOT_TOKEN` desde GitHub Secrets, siguiendo el mismo patrón ya usado para `NODUS_USER`, `GMAIL_PASS` y el resto de secretos del repositorio.
  * Esta Caja Negra (Sección 2) fue actualizada para dejar de mostrar credenciales en texto plano.
* **RIESGO ABIERTO — sin resolver todavía:** Firestore Security Rules no puede leer variables de entorno; son archivos estáticos que se despliegan tal cual. Esto significa que el *nuevo* valor de `robot_token` también queda como texto plano en `firestore.rules`, dentro del mismo repositorio público. Rotar el valor cierra la exposición del valor *anterior* (ya inútil si alguien llegó a capturarlo), pero no cierra la exposición estructural de fondo. Opciones planteadas a José, pendientes de su decisión:
  1. Hacer privado el repositorio `SO-AR`.
  2. Rediseñar la arquitectura para no depender de un token de portador visible en reglas de Firestore (cambio mayor, no ejecutado).
  3. Purgar el historial de git para eliminar el valor anterior de commits pasados (explícitamente pospuesto hasta después de completar la rotación).
* **Pendiente de acción de José (no ejecutable por el asistente — sin acceso a GitHub Settings):** Crear el secreto `ROBOT_TOKEN` en GitHub → repo `SO-AR` → Settings → Secrets and variables → Actions, con el valor generado en la rotación. Sin este secreto, los 3 workflows automáticos fallarán intencionalmente (diseño "fail-loud") hasta que se cree.


### 11.5. Resolución de Incidencia de Despliegue en Firebase Hosting & ReferenceError
* **Fecha:** 02 de Octubre de 2026
* **Síntoma:** Error `ReferenceError: CfoDashboard is not defined` en `centro-operativo-cpsl.web.app` reportado por el usuario con captura de pantalla. Alertas de falla de GitHub Actions en el workflow `Deploy to Firebase Hosting`.
* **Causa raíz:**
  1. Durante la integración modular de `CfoDashboard` y `MaestriaGlobalDashboard`, el archivo `src/services/maestriaService.js` no fue rastreado por git (`untracked`).
  2. El runner Ubuntu de GitHub Actions no incluye el alias `python`, únicamente `python3`, lo que provocaba fallos de resolución durante el pipeline. Al fallar el build en Actions, Firebase Hosting no actualizaba producción y mantenía una versión previa inconsistente.
* **Acción ejecutada:**
  * Se rastreó e incluyó `src/services/maestriaService.js` en el control de versiones.
  * Se robusteció el script `prebuild` en `package.json` anteponiendo `python3`.
  * Se validó la compilación íntegra de Vite localmente con 0 errores y se desencadenó el despliegue automático limpio hacia Firebase Hosting.

---

## 12. 🚀 Nueva Arquitectura Modular de Módulos y Roles Corporativos (Octubre 2026)

Con el fin de profesionalizar y escalar la operación sin fricción ni pérdida de datos legacy, se integraron los siguientes centros de mando y estaciones operativas:

1. **Dirección Financiera Global (CFO) & Operativa Financiera (`/cfo-dashboard`, `/finance-workspace`):**
   * Panel Zero-Trust para Dirección Financiera con auditoría cruzada Nodus vs. Banco Conciliado.
   * Sistema de "Kill-Switch" para suspender operaciones de sedes con discrepancias financieras.
   * Estación de trabajo simplificada para asistentes contables con SLA semanal de conciliación (Viernes 9:00 AM).

2. **Hub de Entrenamiento y Academia Zen (`/trainer-hub`):**
   * Interfaz minimalista ("Zen Mode") para Entrenadores de Salón (C1, C2, MJ).
   * Briefing operativo del coordinador de sede (temperatura de sala, perfiles clave).
   * Buzón de alineación directa y confidencial con Dirección Académica ("Zero-Ego").

3. **CRM de Entrenadores de Llamadas (`/call-coach-crm`):**
   * Hub de seguimiento compartido y bidireccional con los Coordinadores de Maestría del Juego (CMJ).
   * Pipeline de rendición de cuentas, efectividad de llamadas y enrolamiento en tiempo real.

4. **Hub Operativo Pit-Stop Quantum Team (QT) (`/qt-hub`):**
   * Interfaz táctica *Mobile-First* de alto contraste estilo F1 para supervisión de piso y sala.
   * Checklists dinámicos con inserción algorítmica de "Tareas Trampa" para auditar atención y lectura de instrucciones.
   * Integración de KPIs del ciclo C1E31 Lima (Rossmery Ochoa y Gina Cárdenas).

5. **HR Command Center - Talento Humano Global (`/hr-command-center`):**
   * Torre de supervisión para Lennin Chasi con Índice de Atención (*Attention Index*) y radar de pólizas/seguros.
   * Tablero Kanban de reclutamiento y pipeline de expansión a nuevas plazas (Medellín/Bogotá).

6. **Torre de Riesgo y Cumplimiento Legal (`/legal-hub`):**
   * Bóveda Zero-Trust para Pablo Mendieta.
   * Tracker de Propiedad Intelectual (Tecnología NEC, Noda, Neck, Wikipedia) y SLA invertido de derechos ARCO (20 días).
   * Matriz de bloqueo por falta de acuerdos de confidencialidad (NDAs).

7. **Centro de Comando Global de Maestría (`/andres-command-center`, `/maestria-global`):**
   * Dashboard estratégico para Andrés Gómez.
   * Auditor algorítmico de "Futuros Imposibles" para detectar aprobaciones anómalas o caídas de estándar por sede.
   * Limpieza y exclusión automática de grupos no representativos ("Equipo 1000") de los KPIs de efectividad.
   * Panel confidencial de misiones de expansión y condicionamientos/ultimátums.

8. **Redirección de Dominio Público (`crearpsl.net/dna`):**
   * Enrutamiento directo y transparente alojado en el repositorio GitHub Pages (`CRM-CREARLIMA..`) que redirige a los participantes hacia el portal blindado de onboarding legal `https://centro-operativo-cpsl.web.app/dna`.

9. **Resolución de Carga en Directorio y Panel Super Admin (Todos: 0 colaboradores):**
   * **Incidencia:** El Panel Super Admin y los selectores de tareas mostraban `Estado: Todos (0)` y las pestañas "Por Rol" y "Por Sede" aparecían desiertas.
   * **Causa Raíz:** En `src/services/userService.js` se invocaba `canManageUserStatus(currentUser)` en la línea 320 sin haber importado la función desde `src/config/permissions.js`. Esto disparaba un `ReferenceError: canManageUserStatus is not defined` silencioso en el `try/catch` de los componentes consumidores, dejando la lista de personal vacía (`realUsersData = []`).
   * **Solución:** Se importó formalmente `canManageUserStatus` en `userService.js`, se añadió salvaguarda de tipo (`typeof canManageUserStatus === 'function'`) y se vincularon las dependencias de `currentUser` en los hooks `useEffect` de `SuperAdminPanel.jsx` y `Home.jsx`.

10. **Visibilidad e Interconexión de Torres de Control y Centros de Mando:**
    * Se integraron tarjetas interactivas de exploración en `Home.jsx` (`EXPLORE_OPTIONS`) para los 8 centros especializados.
    * Se agregaron botones de acceso directo en el menú desplegable de Herramientas y en la Barra de Herramientas PRO de `Home.jsx`.
    * Se construyó e instaló un **Dock Ejecutivo de Torres de Control** en el `SuperAdminPanel.jsx`, permitiendo a la alta dirección alternar en un solo clic entre:
      1. Maestría Global (Andrés Gómez) -> `/andres-command-center`
      2. Talento Humano Global (Lennin Chasi) -> `/hr-command-center`
      3. Torre de Riesgo y Cumplimiento Legal (Pablo Mendieta) -> `/legal-hub`
      4. Dirección Financiera Global (CFO) -> `/cfo-dashboard`
      5. Operativa Financiera y Cierre -> `/finance-workspace`
      6. Hub Pit-Stop Quantum Team (QT) -> `/qt-hub`
      7. CRM Entrenadores de Llamadas -> `/call-coach-crm`
      8. Academia y Hub de Entrenamiento Zen -> `/trainer-hub`

11. **Enrutamiento Inteligente por Rol en Simulación y Paneles Ejecutivos:**
    * **Simulación Especializada:** En `UserProfileModal.jsx`, al simular a un usuario clave (ej. Nancy Elizabeth Escobar Pérez / CFO, Pablo Mendieta / Legal, Lennin Chasi / RRHH, Andrés Gómez / Maestría, Entrenadores o QTs), el sistema redirige automáticamente a su Torre de Control o Hub respectivo en vez de dejarlos en una vista genérica o en `/home`.
    * **Conexión en Dashboard 30 Segundos:** En `GerenteDashboard.jsx`, se agregó el botón `[🏦 Dirección Financiera (CFO)]` en la botonera superior y un banner inteligente destacado para el rol `cfo` que permite abrir en un clic la Torre de Control Financiero.
    * **Barra PRO Adaptativa:** En `Home.jsx`, el botón de acceso rápido se personaliza dinámicamente según el rol activo (`cfo` ➔ `/cfo-dashboard`, `legal` ➔ `/legal-hub`, `talento_humano` ➔ `/hr-command-center`, `coord_maestria_global` ➔ `/andres-command-center`).

12. **Blindaje de Alto Contraste y Datos 100% Reales para Dirección Financiera (`/cfo-dashboard`):**
    * **Incidencia:** En `/cfo-dashboard`, cuando un usuario en modo claro (o tema de sistema) simulaba a Elizabeth Escobar (CFO), el texto principal, números de KPIs y celdas de la tabla se renderizaban en `#0f172a` (casi negro) sobre un contenedor con fondo hardcodeado `#0b1120`, provocando un apagón visual (texto negro sobre fondo negro, "cero visibles"). Asimismo, las cifras mostraban datos ficticios (ej. "Carlos Slim Jr", "México", etc.).
    * **Solución de Estilos y Contraste:** 
      - Se eliminaron todos los fondos oscuros forzados en el contenedor general y se adoptaron las variables de diseño maestras del sistema: `background: var(--bg-dark)`, `var(--bg-card)`, `var(--text-heading)`, `var(--text-main)`, `var(--text-muted)` y `var(--border-subtle)`.
      - Ahora la vista ofrece un contraste impecable, legible y profesional tanto en Tema Claro como en Tema Oscuro.
    * **Sustitución de Datos Simulados por Datos Canónicos 100% Reales de CREAR:**
      - **Sedes Oficiales:** Lima (Perú), Quito (Ecuador), Medellín (Colombia), Guayaquil (Ecuador), Cuenca (Ecuador).
      - **Equipo Contable Real Vinculado:** Gabriela Rivadeneyra (`contabilidad.lima@crearpsl.net`), Diego Flores y Alexis Teran (`diego.flores@crearpsl.net`), Hector Gonzalez (`contabilidad.medellin@crearpsl.net`), Sebastian Jacome y Erica Logacho (`asistente.contable@crearpsl.net`).
      - **Ingresos Nodus Reales:** $374,600 USD basados en los 13,575 matriculados y 2,865 asistentes de los snapshots de Nodus.
      - **Pasivo Flotante de Entrenadores Real:** $33,250 USD pendiente de pago (2,241 llamadas pendientes a 34 entrenadores de la nómina real de `kpisEntrenadoresData.json` y `liquidaciones_pagos`).
      - **Pestañas Especializadas:** Auditoría Zero-Trust de Sedes con Kill-Switch interactivo conectado a Firestore `hq_operational_status`, desglose de los 34 entrenadores con porcentaje de liquidación y tasa de graduación, y trazabilidad de cierres diarios (`finance_daily_close`).

13. **Auditoría Forense y Ejecución de Tareas Pre-Colapso del Modelo:**
    * **Restricción Estricta de Personal Inactivo (Mandato Dirección):**
      - En `src/config/permissions.js`, se removió la permisividad a `isDireccionRole` en `canManageUserStatus`.
      - Ahora la visibilidad y gestión de colaboradores dados de baja/inactivos está restringida **ÚNICA Y EXCLUSIVAMENTE** a Super Administradores (`jose.sanchez@crearpsl.net` / `isSuperAdmin`) y Talento Humano (`lennin.chasi@crearpsl.net` / `talento_humano` / `director_th`). Ningún otro rol de gerencia o dirección tiene visibilidad de personal inactivo.
    * **Blindaje de Identidad de Cirilo Agustín Martínez (México):**
      - En `public/cartas/carta_invitacion_migraciones.html`, se fijó en la tabla inmutable `verifiedNationalities` a `CIRILO AGUSTIN MARTINEZ` y `CIRILO MARTINEZ` con Nacionalidad `MEXICANA` y Documento `PASAPORTE MEXICANO`.
      - Se blindó contra sobreescritura de parámetros en la URL, asegurando la verdad histórica oficial.
    * **KPIs Oficiales de Piso Quantum Team — C1E31 Lima:**
      - Se estructuraron los datos de la hoja de cálculo oficial en `src/data/qtKpis.js`: Rossmery Ochoa (55 PX, 9 desertores, 46 PX fin, 14 pagos, PP: 30%), Gina Cárdenas (62 PX, 15 desertores, 47 PX fin, 18 pagos, PP: 38%) y Totales Consolidados (117 PX, 24 desertores, 93 PX fin, 32 pagos, PP: 34.4%).
      - En `src/pages/QuantumTeamHub.jsx`, se eliminó el bloqueo por correo individual y se creó un conmutador ejecutivo para que la Dirección, Gerentes y Coordinadores puedan auditar a cada líder o los totales.
      - Se implementó el doble despachador de notificaciones: encolamiento automático en Firestore `mail` para Nodemailer y apertura directa vía `mailto:` para enviar los feedbacks en un clic.
      - Se añadió el botón de enlace bidireccional entre el `DirectorioQT.jsx` y el `QuantumTeamHub.jsx` (`/qt-hub`).
    * **Resolución del Botón "Auditoría de Datos / PDF" en LegalStatusPanel:**
      - En `src/pages/LegalStatusPanel.jsx`, se sustituyó la llamada asíncrona a `window.open` (bloqueada silenciosamente por las directivas de seguridad de navegadores modernos) por un Visor Modal Interactivo de Certificación Legal.
      - El modal expone la firma digital SHA-256, traza IP, datos KYC completos del participante, vista previa del acuerdo, impresión directa (`window.print()`) y descarga inmediata de respaldo sin bloqueos.
    * **Alto Contraste y Normalización Canónica de las Torres de Control:**
      - `AndresCommandCenter.jsx` y `CallCoachCRM.jsx` fueron migrados a variables de diseño adaptativas (`var(--bg-dark)`, `var(--bg-card)`, etc.) asegurando perfecta legibilidad en modo claro y modo oscuro.
      - En `andresService.js`, se fijaron las 5 sedes oficiales de CREAR (Lima, Quito, Medellín, Guayaquil, Cuenca) más la base de México con Cirilo Martínez.

---

## 13. 🛡️ Gobernanza de Acceso, Centro de Managers, Disparadores de Correo y Reglas de Producción (Octubre 2026)

### 13.1. Reglas Operativas y de Seguridad del Centro de Managers (`/centro-managers`)
1. **Coordinadores de Maestría del Juego (CMJ):**
   * **Alcance Territorial Estricto:** Los CMJ tienen facultades plenas para **crear, editar, graduar y eliminar managers exclusivamente dentro de su sede asignada** (`effectiveSede = normalizeSede(currentUser.sede)`).
   * **Blindaje Inter-Sedes:** Ningún CMJ puede ver, modificar o eliminar managers pertenecientes a otras plazas a menos que ostente un rol corporativo global de Dirección o SuperAdmin.
   * **Vista Corporativa (`viewAsTrainer = false`):** Visualizan la totalidad de los managers y equipos correspondientes a su sede, incluyendo directivos y gerentes de referencia institucional.
2. **Entrenadores de Llamadas (`entrenador_llamadas` / `entrenador`):**
   * **Aislamiento por Asignación:** Únicamente pueden visualizar los managers y equipos asignados formalmente a ellos (`isTrainerMatch`).
   * **Operatividad Permitida:** Pueden consultar los datos de sus pupilos, actualizar sus teléfonos/correos, y registrar o editar el historial de llamadas individuales y reuniones grupales.
   * **Restricción de Directorio:** Tienen terminantemente prohibido crear nuevos managers en sedes externas o eliminar registros del directorio corporativo central.
3. **Caso Canónico Dual — Liliana Cubillo (Quito):**
   * **Identidad y Sede Inmutable:** Liliana Lilibeth Cubillo Vera (`liliana.cubillo@crearpsl.net`, `lili.cubillo@crearpsl.net`). El sistema garantiza canónicamente en `AuthContext.jsx` que su sede efectiva sea siempre **`Quito`** (evitando caídas accidentales a sede `Global`).
   * **Conmutación Inteligente de Vista:**
     - En **Modo Corporativo (CMJ):** Visualiza los 12+ managers y todos los equipos activos de Quito con estadísticas globales de sede.
     - En **Modo Entrenador (`viewAsTrainer = true`):** El sistema aplica coincidencia robusta sobre todos sus alias (`"Lili Cubillo"`, `"Liliana Cubillo"`, `"Lilibeth Cubillo"`, `"Liliana Lilibeth Cubillo Vera"`) y por coincidencia de correo en `entrenadorEmail`, mostrando únicamente sus managers asignados.
   * **Resiliencia ante Desconexión:** Si Firestore o la red sufren demoras o denegaciones temporales, el listener en `CentroManagers.jsx` recurre a `INITIAL_MANAGERS`, evitando que la vista de managers y métricas quede en cero (`Directorio (0)`).

---

### 13.2. Ciclo Integral de Notificaciones Automáticas por Correo Electrónico
El sistema de gestión de tareas operativas (`Checklist Operativo` y `Asignación de Tareas por Rol`) cuenta con un disparador transaccional automatizado en tres hitos críticos de la operación:

1. **Al Asignar la Tarea:**
   * Disparo inmediato de correo al colaborador asignado (`assignedToEmail`).
   * Contenido: Título de la tarea, descripción detallada, prioridad (`URGENTE` / `ALTA` / `NORMAL`), fase operativa (`C1`, `C2`, `MJ`), sede y fecha límite de entrega.
2. **Al Vencerse la Tarea:**
   * Alerta preventiva y de retraso enviada a la persona asignada y a los canales de supervisión si la tarea sobrepasa su `dueDate` sin haber sido completada.
3. **Al Completarse la Tarea (Rendición de Cuentas Directa):**
   * Disparo automático de notificación de cumplimiento dirigido **al usuario que asignó originalmente la tarea (`assignedByEmail`)**.
   * Garantiza que el líder o coordinador que delegó el trabajo reciba constancia inmediata de culminación con fecha, hora y notas de ejecución.
4. **Infraestructura de Despacho:**
   * Encolamiento directo en la colección Firestore `mail`.
   * Procesamiento en segundo plano mediante `scripts/mailDispatcher.mjs` y el workflow de GitHub Actions `mail-dispatch.yml`.
   * Salida certificada por servidor SMTP seguro Gmail TLS (`servidorcrearpsl@gmail.com`:465).

---

### 13.3. Restauración y Blindaje de Reglas de Seguridad en Cloud Firestore (`firestore.rules`)
Tras auditoría de compatibilidad con las suscripciones reactivas (`onSnapshot`) de Causa OS, se restableció el modelo de colaboración operativa autenticada:

1. **Colecciones Operativas con Acceso Autenticado Directo (`allow read, write: if isAuthenticated();`):**
   * `staff_directory`
   * `managers_directory`
   * `excellence_standards`
   * `kpi_reports`
   * `learning_logs`
   * `qt_directory`
   * `success_patterns`
   * `sync_history`
   * `user_stats`
   * `llamadas_grupales_historial`
   * `notas_seguimiento`
   * `goals_sentinel_audits`
   * `user_kpi_targets`
   * `checklist_tasks`
   * `kpis_entrenadores_llamadas`
   > *Justificación Técnica:* En Firestore, las reglas de seguridad no actúan como filtros. La función `canReadHojaEnBlanco()` provocaba denegación inmediata (`PERMISSION_DENIED`) al ejecutar listeners sobre la raíz de la colección sin cláusulas `where` idénticas a la regla. Con `isAuthenticated()`, los clientes autorizados pueden suscribirse a los datos operativos sin errores en consola.
2. **Portal Público de Misiones IMO:**
   * `match /imo_missions/{document=**}`: `allow read, write: if true;`. Permite que la aplicación web pública externa (`crearpsl.net/imose30lima/`) sincronice misiones de enrolamiento sin requerir autenticación de usuario.
3. **Autonomía de Preferencias de Usuario (`match /users/{userId}`):**
   * Se habilitó permiso de escritura individual para el propio colaborador autenticado:
     ```cel
     allow write: if isSuperAdmin() || (isAuthenticated() && (
       request.auth.uid == userId ||
       (resource != null && (resource.data.email == email() || (resource.data.emails is list && email() in resource.data.emails) || (resource.data.uid != null && resource.data.uid == request.auth.uid))) ||
       (request.resource.data != null && (request.resource.data.email == email() || (request.resource.data.emails is list && email() in request.resource.data.emails) || (request.resource.data.uid != null && request.resource.data.uid == request.auth.uid)))
     ));
     ```
   * Permite que coordinadores y managers seleccionen sus equipos en Quito (`equiposQuito`), cambien roles en simulación y actualicen datos personales sin el error *"No se pudo guardar el equipo seleccionado"*.
4. **Zonas Zero-Trust Preservadas:**
   * `liquidaciones_pagos`: Restringido exclusivamente a Gerencia de Sede, Dirección y SuperAdmin.
   * `px_legal_signatures`: Inmutable desde el cliente; validado por hash criptográfico SHA-256, tamaño de payload y correspondencia de identidad de participante.
   * Robot Scraper de Nodus: Acceso condicionado por token secreto `NODUS_ROBOT_CPSL_2026_SECRET` en `nodus_kpis_sincronizados` y `nodus_coordinadores_c1c2`.

---

### 13.4. Matriz Dinámica de Control de Acceso por Módulo y Botón (Gobernanza Causa OS)
* **Objetivo de Dirección:** Permitir al SuperAdmin y a la Dirección General configurar y revocar facultades botón por botón y módulo por módulo desde una interfaz visual sin tocar código fuente ni desplegar compilaciones.
* **Arquitectura Diseñada:**
  - Capa de abstracción desacoplada en `src/config/permissions.js` con evaluación de dos niveles:
    1. Permisos base por rol (RBAC legacy).
    2. Modificadores dinámicos almacenados en Firestore `settings/system_permissions_matrix` por usuario o por rol (`canAccessModule(user, moduleId)`, `canExecuteAction(user, actionId)`).
  - Panel de administración integrado en `SuperAdminPanel.jsx` con matriz visual de conmutadores (toggles) por colaborador y por función.

---

### 13.5. Inventario Exhaustivo y Manual Técnico Interactivo de Causa OS
* Se consolidó la radiografía total de la plataforma en el artefacto [`MANUAL_DETALLADO_CAUSA_OS.md`](file:///Users/joseluissanchezmoreno/.gemini/antigravity/brain/49cb09c8-0b8d-4cff-9ddc-cfe0fd4eb8d9/MANUAL_DETALLADO_CAUSA_OS.md), documentando los 30+ módulos del sistema, cada botón de acción, dependencias de backend, rutas y directivas operativas para capacitación del personal de todas las sedes.

---

> 📜 **Mandato de la Caja Negra:**
> Esta Caja Negra es la fuente viva de verdad de CPSL y Causa OS. Debe consultarse antes de cualquier cambio de arquitectura y actualizarse de inmediato tras cada nueva funcionalidad, regla o descubrimiento operativo.


