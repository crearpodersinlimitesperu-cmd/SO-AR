# 📘 MANUAL MAESTRO DE OPERACIONES Y ARQUITECTURA: CAUSA OS (SO-AR)
**Versión:** 3.4.0 (Edición Definitiva 2026)  
**Organización:** Crear Poder Sin Límites (CPSL) - Operaciones Globales (Lima, Quito, Cuenca, Bogotá)  
**Autoría del Sistema:** DeepMind Advanced Agentic Systems & Equipo Tecnológico CPSL  
**Propósito:** Manual técnico y operativo de referencia integral para Directores, Gerentes, Coordinadores, Entrenadores, Staff y Mánagers.

---

## 📑 TABLA DE CONTENIDO GENERAL
1. **Filosofía y Arquitectura Operativa de Causa OS**
2. **Matriz Global de Roles, Jerarquía y Niveles de Seguridad**
3. **Módulo 1: Tablero Central y Navegación Transversal (/home)**
4. **Módulo 2: Centro de Mánagers y Comunidad (/centro-managers)**
5. **Módulo 3: Asignador de Entrenadores y Cronograma Maestro (/asignador-entrenadores)**
6. **Módulo 4: Tablero de Metas y OKRs (/metas)**
7. **Módulo 5: Monitor de IMOs y Misiones (/monitor-imos)**
8. **Módulo 6: Matriz de Enrolamiento y Sentados (/matriz-enrolamiento-sentados)**
9. **Módulo 7: Panel de SuperAdmin y Gobernanza (/superadmin)**
10. **Módulo 8: Dirección Financiera y Liquidaciones (/cfo-dashboard, /finance-workspace)**
11. **Módulo 9: Dirección de Maestría del Juego (/andres-command-center, /calendario-mj)**
12. **Módulo 10: Call Coach CRM y Entrenadores de Llamadas (/call-coach-crm, /trainer-hub)**
13. **Módulo 11: Quantum Team y Protocolo de Emergencias (/qt-hub, /directorio-qt, /protocolo-emergencias)**
14. **Módulo 12: Centro de Cumplimiento Legal y Firmas (/legal-admin, /legal-hub, /onboarding-legal)**
15. **Módulo 13: Reportes, Analítica y Auditoría Nodus (/reportes, /auditoria-kpis)**
16. **Módulo 14: Comercial, Metodología y Marca (/vende-sin-vender, /embudo-conversion, /brandscript)**
17. **Módulo 15: Logística, Vuelos, Sedes y Flyers (/monitor-vuelos, /datos-sedes-cartas, /generador-flyer)**
18. **Módulo 16: Cultura, Aprendizaje y Excelencia (/excelencia, /learning, /masterclass-distinciones)**
19. **Inventario de Modales Transversales y Componentes Globales**
20. **Catálogo de Agentes Autónomos y Servicios en Segundo Plano**
21. **Colecciones de Firestore y Estructura de Datos**

---

## 1. FILOSOFÍA Y ARQUITECTURA OPERATIVA DE CAUSA OS

Causa OS (SO-AR: Sistema Operativo de Alto Rendimiento) es el núcleo digital que unifica toda la cadena de transformación humana de **Crear Poder Sin Límites (CPSL)**. 

### Los Tres Capítulos de la Transformación:
1. **Capítulo 1 (C1) - Gratitud / Descubrimiento:** Punto de quiebre donde el participante inicia su proceso. Mide sentados, asistencia, enrolamiento y cartas de compromiso.
2. **Capítulo 2 (C2) - Relación / Avanzado:** Profundización emocional, alineación de metas personales y relación interpersonal.
3. **Capítulo 3 (C3) - Creación / Programa de Liderazgo (PL):** Implementación práctica de metas en la vida real. Aquí nacen los equipos (ej. Equipo 4, Equipo 30, Equipo 122).

### La Red de Apoyo Inter-Generacional (Mánagers & IMOs):
- **Equipos en Carrera:** Un equipo en C3 enrola y registra participantes de sus vidas para alimentar el siguiente Capítulo 1 de su sede (ejemplo: Equipos 1 en Gratitud, 2 en Relación y 3 en Creación enrolan para el Equipo 4 C1).
- **IMOs (In-Meeting Observers / Staff Graduado):** Son graduados de equipos anteriores (ej. Equipos 27, 28, 29) que se ponen al servicio como staff de apoyo para enrolar y sostener a los equipos nuevos (ej. Equipo 30).
- **Mánagers del Juego (MJ):** Participantes que sostienen la estructura organizativa de llamadas semanales, acuerdos, cuotas y asistencia.
- **Entrenadores de Llamadas:** Profesionales que sostienen llamadas individuales y grupales para disolver quiebres antes del fin de semana de entrenamiento.

---

## 2. MATRIZ GLOBAL DE ROLES, JERARQUÍA Y NIVELES DE SEGURIDAD

| Nivel | Rol Clave | Identificador Técnico | Alcance Operativo | Pantallas Clave |
|---|---|---|---|---|
| **0** | **SuperAdmin** | `superadmin`, `isSuperAdmin` | Acceso absoluto a todas las sedes, colecciones, auditorías y reasignación de permisos. | Todas + `/superadmin` |
| **1** | **Dirección General** | `ceo`, `cfo`, `cco`, `direccion` | Visión financiera global, liquidaciones, aprobación de presupuestos y cierre de sedes. | `/cfo-dashboard`, `/reportes`, `/metas` |
| **2** | **Dirección de Maestría** | `director_maestria` | Dirección global del programa de Maestría, supervisión de todos los equipos y entrenadores. | `/andres-command-center`, `/centro-managers` |
| **3** | **Gerente de Sede** | `gerente` | Control total de su sede geográfica (Lima, Quito, Cuenca, Bogotá). | `/gerente`, `/reportes`, `/metas` |
| **4** | **Coordinador Maestría (CMJ)** | `coord_maestria`, `coordinador_mj` | Gestión de equipos, creación/edición de mánagers de su sede, llamadas grupales. | `/centro-managers`, `/calendario-mj` |
| **5** | **Entrenador de Llamadas** | `entrenador`, `entrenador_llamadas` | Vista restringida a los mánagers asignados a su correo. Registro de llamadas y quiebres. | `/trainer-hub`, `/centro-managers` (restringido) |
| **6** | **Quantum Team (QT)** | `coordinador_qt`, `qt_staff` | Logística de sala, soporte presencial, control de salones y emergencias. | `/qt-hub`, `/directorio-qt` |
| **7** | **Participante / Mánager** | `participante`, `manager` | Registro de metas personales, acuerdos, firmas de onboarding legal y checklist. | `/home`, `/checklist` |

---

## 3. MÓDULO 1: TABLERO CENTRAL Y NAVEGACIÓN TRANSVERSAL (`/home`)

### Objetivo Operativo
El tablero de entrada de Causa OS. Presenta una vista adaptativa de acuerdo al rol del usuario, centraliza las alertas críticas (cumpleaños, pagos APDAYC, documentos legales pendientes), métricas del día y accesos directos.

### Inventario de Elementos y Botones
1. **Selector de Sede (Barra Superior):**
   - *Función:* Permite a Directores y SuperAdmins alternar entre Lima, Quito, Cuenca y Bogotá.
   - *Comportamiento:* Filtra en cascada los datos de todos los widgets de la pantalla.
2. **Botón "Simular Rol" (Barra Superior - Exclusivo SuperAdmin):**
   - *Función:* Permite al SuperAdmin colocarse los ojos de cualquier colaborador para auditar lo que ve.
3. **Widget "Mi Pasaporte Legal":**
   - *Función:* Alerta si el colaborador tiene pendiente firmar el Código de Honor o Contrato de Confidencialidad.
   - *Botón:* `Firmar Documentos Ahora` (abre el modal `LegalOnboardingModal`).
4. **Widget "Alertas de Quiebre / Sentinel":**
   - *Función:* Muestra en rojo llamadas grupales atrasadas o equipos sin entrenador asignado.
5. **Widget "Cumpleaños del Mes":**
   - *Función:* Notificaciones de aniversarios del equipo para fomentar cultura y reconocimiento.
6. **Buscador Global (`Cmd + K` / Icono Lupa):**
   - *Función:* Abre `GlobalSearch` para localizar en milisegundos a cualquier participante, mánager o equipo.
7. **Botón Flotante "Copilot IA":**
   - *Función:* Abre la consola conversacional de asistencia inteligente (`AICopilot`).

---

## 4. MÓDULO 2: CENTRO DE MÁNAGERS Y COMUNIDAD (`/centro-managers`)

### Objetivo Operativo
Es el corazón operativo del programa de Maestría del Juego (C3 / PL). Administra a los cientos de mánagers organizados por equipos y sedes, la asistencia a llamadas semanales y la liquidación de honorarios a entrenadores.

### Pestañas Principales
- **Pestaña "Activos":** Equipos y mánagers actualmente en campaña de llamadas.
- **Pestaña "Archivo":** Equipos históricos graduados o pausados.
- **Pestaña "Llamadas Grupales":** Control de asistencia a la llamada semanal de equipo.
- **Pestaña "Historial de Notas":** Bitácora cronológica de observaciones y detección de quiebres ontológicos.
- **Pestaña "Liquidación de Entrenadores":** Módulo financiero restringido para pago de $400 USD por equipo.

### Inventario de Botones y Acciones en Centro de Mánagers
1. **Botón `+ Nuevo Integrante`:**
   - *¿Qué hace?* Abre un modal para ingresar nombre, teléfono, correo, equipo y asignar entrenador.
   - *Permiso:* SuperAdmin, Director de Maestría y CMJ de la misma sede.
2. **Botón `+ Crear Equipo`:**
   - *¿Qué hace?* Registra un nuevo equipo (ej. "Equipo 123 - Quito") definiendo su número, sede y fecha de inicio.
3. **Botón `🔀 Unir Equipos`:**
   - *¿Qué hace?* Fusiona dos equipos que sufrieron bajas para consolidar un solo grupo viable de llamadas.
4. **Botón `🛡️ Supervisor de Datos`:**
   - *¿Qué hace?* Escanea registros duplicados, teléfonos sin formato o correos con espacios y los repara en lote.
5. **Botón `Registrar Llamada Grupal`:**
   - *¿Qué hace?* Abre la planilla donde el entrenador marca los mánagers que asistieron y registra una nota grupal. Al llegar a 7 llamadas grupales, el sistema marca el equipo como listo para liquidación.
6. **Botón `Marcar como Pagado` (Pestaña Liquidación):**
   - *¿Qué hace?* Cambia el estado financiero del pago de $400 USD a `pagado`, guarda el nombre y correo del pagador, fecha exacta y genera el registro en `liquidaciones_pagos`.
   - *Permiso:* Exclusivo para SuperAdmin (José), CFO (Eli) y Dirección.
7. **Botón `Cerrar Equipo para Liquidación`:**
   - *¿Qué hace?* Disparador manual para cuando un equipo termina antes de las 7 llamadas (deserción o graduación anticipada).
8. **Botón `Eliminar Integrante / Mánager` (Icono Basurero):**
   - *¿Qué hace?* Elimina el documento de `managers_directory`.
   - *Permiso:* SuperAdmin o CMJ de su respectiva sede.

---

## 5. MÓDULO 3: ASIGNADOR DE ENTRENADORES Y CRONOGRAMA MAESTRO (`/asignador-entrenadores`)

### Objetivo Operativo
Garantiza que cada fin de semana de entrenamiento (C1, C2, C3 y Relación MJ) en cada ciudad tenga un entrenador titular asignado, previniendo choques de agenda, violaciones de políticas de descanso y sobrecargas de viaje.

### Inventario de Botones y Funciones
1. **Selector de Año y Mes:** Navegación por el cronograma operativo anual.
2. **Filtro por Sede:** Alterna entre vista combinada de todas las ciudades o enfoque en una sede.
3. **Selector "Entrenador Asignado" (por bloque):**
   - *¿Qué hace?* Menú desplegable con los entrenadores certificados disponibles para ese fin de semana.
4. **Botón `Validar Políticas de Descanso`:**
   - *¿Qué hace?* Ejecuta `nodusFIAgent` para auditar si algún entrenador tiene más de 3 fines de semana continuos de viaje.
5. **Botón `Guardar Asignación en Firme`:**
   - *¿Qué hace?* Registra en `asignaciones_entrenadores` y notifica vía webhook a los coordinadores.
6. **Botón `Exportar a Excel / CSV`:**
   - *¿Qué hace?* Descarga la matriz completa de asignaciones para la gerencia de operaciones.

---

## 6. MÓDULO 4: TABLERO DE METAS Y OKRs (`/metas`)

### Objetivo Operativo
Control en tiempo real de las metas numéricas de cada campaña (Enrolados, Sentados, Dinero Recaudado, Confirmados).

### Inventario de Botones y Funciones
1. **Botón `+ Nueva Meta`:**
   - *¿Qué hace?* Crea un objetivo con fecha límite, indicador clave (KPI) y responsable.
2. **Botón `Dividir Meta (Cascada)`:**
   - *¿Qué hace?* Abre el modal `GoalDivisionModal` para subdividir la meta de la sede entre los coordinadores y capitanes.
3. **Botón `Actualizar Avance Manual`:**
   - *¿Qué hace?* Permite a los coordinadores cargar los números del día antes del cierre oficial.
4. **Botón `Sincronizar con Nodus en Vivo`:**
   - *¿Qué hace?* Fuerza al agente en background a consultar las APIs de Nodus y actualizar los sentados reales.

---

## 7. MÓDULO 5: MONITOR DE IMOS Y MISIONES (`/monitor-imos`)

### Objetivo Operativo
Seguimiento a los In-Meeting Observers (IMOs): voluntarios de promociones pasadas que acompañan a las nuevas generaciones.

### Inventario de Botones y Funciones
1. **Selector de Equipo Graduado de Origen:**
   - *¿Qué hace?* Permite al IMO buscarse por el equipo del cual se graduó (ej. Equipo 27, 28, 29).
2. **Botón `Registrar Mi Asistencia / Misión`:**
   - *¿Qué hace?* Guarda la asistencia del IMO a las dinámicas de sala en `imo_missions`.
3. **Botón `Descargar Reporte de IMOs Activos`:**
   - *¿Qué hace?* Genera un balance de cuántos graduados están sosteniendo la sala actual.

---

## 8. MÓDULO 6: MATRIZ DE ENROLAMIENTO Y SENTADOS (`/matriz-enrolamiento-sentados`)

### Objetivo Operativo
Control numérico exhaustivo del "Juego de Sentados": la métrica reina de Causa OS. Registra cuántas personas físicas se encuentran sentadas en la sala de entrenamiento al inicio de cada fin de semana.

### Inventario de Botones y Funciones
1. **Contador en Vivo de Sentados:** Muestra el número total vs la meta de cupo de sala.
2. **Botón `Ingresar Registro Rápido`:** Suma participantes confirmados en la puerta del salón.
3. **Botón `Comparar vs Nodus`:** Cruza la lista de personas registradas en el software comercial contra las presentes físicamente.

---

## 9. MÓDULO 7: PANEL DE SUPERADMIN Y GOBERNANZA (`/superadmin`)

### Objetivo Operativo
Centro de mantenimiento maestro, reservado para José Sánchez y el equipo de arquitectura técnica.

### Inventario de Botones y Funciones
1. **Botón `Reparar Permisos de Colecciones`:** Resetea reglas y reindexa campos en Firestore.
2. **Botón `Regenerar Directorio Canónico`:** Lee la base de usuarios y consolida perfiles duplicados.
3. **Botón `Disparar Agente Nodus Scraper`:** Inicia una sincronización manual forzada del robot de datos.
4. **Pestaña "Gestor de Permisos Dinámicos" (Nueva Arquitectura):** Permite agregar o remover correos en módulos críticos sin tocar código.

---

## 10. MÓDULOS DE DIRECCIÓN FINANCIERA (`/cfo-dashboard`, `/finance-workspace`)

### Objetivo Operativo
Supervisión del flujo de caja, pagos de honorarios y arqueos diarios de taquilla.
- **Botón `Bloquear / Desbloquear Sede`:** Mecanismo de control cuando una sede no ha completado el arqueo de caja diario.
- **Botón `Auditar Liquidaciones Pagadas`:** Cruce entre lo pagado a entrenadores y los comprobantes contables.

---

## 11. MÓDULOS DE COMUNICACIÓN, LEGAL Y EMERGENCIAS
- **Módulo Legal (`/legal-admin`):** Visualización de contratos firmados digitalmente con hash SHA-256 e IP de captura.
- **Directorio QT y Protocolo de Emergencias (`/protocolo-emergencias`):** Números directos de clínicas, ambulancias y protocolos de seguridad en sala.
- **Generador de Flyers (`/generador-flyer`):** Renderiza en el navegador artes gráficos descargables en PNG con la tipografía oficial.

---

## 12. CATÁLOGO DE AGENTES AUTÓNOMOS (BACKGROUND DAEMONS)

| Agente | Archivo Fuente | Misión | Frecuencia |
|---|---|---|---|
| **CausaNodusAgent** | `src/services/CausaNodusAgent.js` | Extrae y normaliza enrolados, pagos y estados desde el backend de Nodus. | Cada 1 hora / Automático |
| **cmjSentinelAgent** | `src/services/cmjSentinelAgent.js` | Monitorea que ningún equipo de Maestría quede sin llamada semanal registrada. | Diario |
| **goalsSentinelAgent** | `src/services/goalsSentinelAgent.js` | Alerta si una meta semanal tiene una brecha mayor al 25% respecto al plan. | Diario |
| **GuardianConfidencialidad** | `src/services/GuardianConfidencialidadAgent.js` | Verifica que todos los usuarios con roles operativos tengan firma legal activa. | Tiempo Real |
| **roleIntegritySentinel** | `src/services/roleIntegritySentinelAgent.js` | Impide que un usuario no autorizado modifique su propio rol en Firestore. | Tiempo Real |

---
*Fin del Manual Maestro de Operaciones de Causa OS.*
