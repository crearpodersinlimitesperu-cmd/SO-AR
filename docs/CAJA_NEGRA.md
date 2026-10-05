# CAJA NEGRA - Memoria Persistente de CREAR PSL

Estas reglas son absolutas y se han generado a partir del feedback crítico de Dirección:

1. **PROHIBIDO EL USO DE "Bienvenido/a" o "Señor/a":** Es considerado de bajo perfil y poco personalizado. Se debe inferir el género del participante a partir de su nombre (usando librerías o heurísticas) para escribir "Bienvenido" o "Bienvenida" de forma directa y elegante.
2. **COORDINADOR ASIGNADO:** Los correos de bienvenida de participantes SIEMPRE deben incluir el nombre y número de contacto de su coordinador asignado (presente en la base de datos). Nunca enviarlos a un correo de soporte genérico si tienen un coordinador.
3. **LOGOS OFICIALES:** Usar única y exclusivamente el logo oficial de CREAR Poder Sin Límites en alta resolución (el óvalo/remolino con estrellas y tipografía oficial).
4. **CERO ALUCINACIÓN:** Ningún correo sale si faltan datos logísticos (sede, horarios).
5. **WEB OFICIAL Y POLÍTICAS:** Usar `crearglobal.com` como sitio oficial, pero para la sede de Lima, las políticas de privacidad deben apuntar a `crearpsl.net/lima/politica-de-privacidad`.
6. **REDES SOCIALES EXACTAS:** En los pie de página incluir Instagram Perú (`@crearpslperu`), Instagram Global (`@crearpsl`) y Facebook (`CREAR Poder Sin Límites`).
7. **CALENDARIO:** Incluir siempre un enlace inteligente a Google Calendar en el bloque del CTA para eventos de 3 días.
8. **DURACIÓN C1:** C1 dura 3 días exactos, dejarlo explícito (Viernes, Sábado y Domingo).
9. **MAPEO DE COORDINADORAS:** Se cuenta con una matriz global en Sheet (ya extraída a CSV localmente) que mapea el `nombre del coordinador` del Excel a su respectivo `teléfono` con prefijo internacional para enviar a WhatsApp.
10. **IMÁGENES EN CORREOS (CID INLINE):** Jamás enlazar el logo a URLs externas que dependan de hosting o puedan ser distorsionadas/bloqueadas por el proxy de Gmail. Enviar siempre el logo incrustado directamente vía MIME `cid:logo_crear_blanco` con el PNG optimizado en alta resolución Retina para nitidez absoluta e inmediata.
11. **VISIBILIDAD COMPLETA PARA COORDINADORAS (SEDE):** Las coordinadoras de cada sede (tanto de Capítulo Uno y Dos como de Maestría del Juego) deben poder ver **todas las fechas de su sede** (C1, C2 y MJ) y a los **entrenadores asignados** a cada fecha en su sede. No se debe fragmentar ni ocultar la información entre coordinaciones de la misma sede.
12. **CONFIDENCIALIDAD DEL DASHBOARD DE EVOLUCIÓN (DIRECTIVOS Y GERENTES):** Los reportes y métricas estratégicas de evolución organizacional (Dashboard de Evolución con Temperatura Psicológica, Tasa TRO, Rider de Entrenadores, Presupuestos Liberados, Candado Contable y Buzón Trim & Stack, así como el Reporte Relámpago Post-FDS) son de acceso ESTRICTAMENTE EXCLUSIVO para Directivos (`direccion`, `cfo`, `ceo`, `cco`, `director_maestria`), Gerentes de Sede (`gerente`) y SuperAdmins. Ninguna coordinadora de sede (`coord_c1`, `coord_c2`, `coord_maestria`, `coordinador`) ni personal operativo puede ver la pestaña ni acceder a estas métricas organizacionales.
13. **REPOSITORIO DE DOCUMENTACIÓN OFICIAL (GOOGLE DRIVE):**
    - **Manuales, Guías y Planes de Ejecución:** [Carpeta Oficial Drive](https://drive.google.com/drive/u/0/folders/14miXQ21BLxo-gr5NiW12lhRO-iqebJWR) (`14miXQ21BLxo-gr5NiW12lhRO-iqebJWR`), contiene subcarpetas de Capítulo Uno, Capítulo Dos, Maestría del Juego y el documento maestro *CREAR PODER SIN LÍMITES PLAN DE EJECUCIÓN*.
    - **Caja Negra, Checklists Maestros y Procesos Operativos:** [Carpeta Caja Negra Drive](https://drive.google.com/drive/u/0/folders/1PzONfjeXKCZ9CHhft7lK6H0SnJwCPEx2) (`1PzONfjeXKCZ9CHhft7lK6H0SnJwCPEx2`), contiene los checklists operativos individuales por rol (Coordinación C1, Coordinación Maestría, Gerente, Capitán, Quantum Team) y manuales de procesos.
14. **CALENDARIO CENTRAL Y MATRIZ DE EVENTOS (GOOGLE SHEETS):**
    - **URL:** [Calendario Oficial SO-AR](https://docs.google.com/spreadsheets/d/1u0tc4GeooPmSwNxZ0CErKGtRU4oD-mO3l--ZSQM-KPs/edit?gid=1326951636#gid=1326951636) (Spreadsheet ID: `1u0tc4GeooPmSwNxZ0CErKGtRU4oD-mO3l--ZSQM-KPs`, pestaña `Hoja 2` gid: `1326951636`, pestaña `LOGISTICA` gid: `0`).
    - Gobierna todas las fechas de inicio y fin de ciclos por sede (`LIM`, `UIO`, `MED`, `CUE`, `MEX`, `GYE`) y las etapas de cada equipo (`CAPITULO UNO`, `CAPITULO DOS`, `MAESTRIA DEL JUEGO`, `EL VIAJE`).
15. **TAREAS CÍCLICAS Y PRINCIPIO DE NO DESTRUCCIÓN:**
    - Las tareas de los roles operativos (Coordinador C1/C2, Coordinador Maestría, Gerente de Sede, Capitán, Quantum Team) son **cíclicas** y se repiten rigurosamente en cada ciclo de entrenamiento (`C1 -> C2 -> MJ -> C1...`) siguiendo las fechas del calendario central.
    - **Cero pérdida de datos / No duplicidad:** No se debe borrar, reemplazar ni duplicar tareas existentes en Firestore ni en el catálogo de tareas asignadas.
    - El seguimiento de avance y completitud debe ser multidimensional por ciclo (`sede_cycleId`), permitiendo que un ciclo nuevo arranque en estado limpio para sus tareas sin afectar el historial o la auditoría de ciclos pasados.
16. **ENRUTAMIENTO ESTRICTO DE GOOGLE CHAT POR SEDE:**
    - El espacio configurado de Google Chat (`spaces/AAQAOaOPrZU`) pertenece **ÚNICA Y EXCLUSIVAMENTE a la Sede Lima**.
    - Todos los reportes diarios de llamadas y operativos emitidos por coordinadores de Lima se despachan automáticamente a dicho espacio.
    - PROHIBIDO mezclar reportes de otras sedes (Quito, Guayaquil, Cuenca, Medellín, México) en el espacio de Lima. Cada sede se conectará de manera independiente a su propio espacio a medida que compartan sus respectivos webhooks.
17. **AISLAMIENTO TEMPORAL DE TAREAS POR FASE Y CICLO ACTIVO:**
    - El Checklist Operativo NUNCA debe mostrar ni precargar al usuario tareas de meses o ciclos futuros lejanos como pendientes inmediatas (ej. tareas de noviembre en pleno ciclo de septiembre).
    - La vista por defecto (`⚡ Fase Activa`) muestra estricta y exclusivamente las tareas correspondientes a la fase operativa actual del ciclo (`GATE 1`, `PRE-C1`, `C1`, `POST-C1`, `C2`, `PRE-MJ`, `MJ`, `POST-MJ`).
    - Ninguna condición de urgencia o prioridad (`isCritical`) debe romper el aislamiento de fase: las tareas críticas de una fase futura permanecen en su fase respectiva y solo se activan cuando el ciclo entra a dicha fase.
    - Todo rol con múltiples fases (incluido el Consolidado) dispone de selector explícito por pestañas (`⚡ Fase Activa`, cada fase operativa con conteo real, y `📋 Todo el Catálogo`) para auditar o planificar libremente sin saturar la operación diaria.
18. **COBERTURA MULTI-SEDE UNIVERSAL DE NODUS Y REPORTES:**
    - La sincronización con Nodus y la precarga de reportes operativos debe estar disponible para **TODAS las sedes operativas** de CREAR PSL (Cuenca, Guayaquil, Lima, Medellín, México, Quito) sin excepción ni centralismo.
    - El documento `nodus_coordinadores_c1c2/latest` en Firestore debe contener y mantener el catálogo completo de los 22 coordinadores auditados de todas las sedes.
    - Queda terminantemente PROHIBIDO que un usuario de otra sede (ej. Adrianna en Quito) caiga o herede datos de Lima (como Joyce) por un fallback descuidado: la coincidencia se realiza estrictamente dentro de la sede del usuario (`normalizeSede(currentUser.sede)`), incorporando además un selector explícito de coordinador y sede para máxima transparencia y control auditado.
19. **REGLAS DE CENTRO DE MANAGERS (CMJ VS ENTRENADORES DE LLAMADAS):**
    - **Coordinadores de Maestría del Juego (CMJ):** Tienen facultad plena para crear, editar, graduar y eliminar managers **únicamente dentro de su sede territorial**. Tienen prohibido modificar o suprimir managers de otras plazas.
    - **Entrenadores de Llamadas:** Solo pueden ver los managers y equipos que les han sido asignados expresamente (`isTrainerMatch`), con potestad para actualizar teléfonos/correos y asentar llamadas individuales y grupales. No pueden crear managers ni eliminar registros del directorio corporativo.
20. **RESPETO DE SEDE TERRITORIAL Y PERFILES DUALES (CASO LILI CUBILLO):**
    - Todo colaborador con rol dual (ej. Coordinador CMJ y Entrenador de Llamadas, como Liliana Cubillo en Quito) mantiene inmutable su sede (`Quito`).
    - En vista Corporativa actúa como CMJ con visibilidad completa de su sede. En vista Entrenador se activan sus filtros personalizados por correo y por todos sus alias auditados (`Lili Cubillo`, `Liliana Cubillo`, `Lilibeth Cubillo`, `Liliana Lilibeth Cubillo Vera`).
    - En caso de desconexión o latencia de red, la vista activa un fallback inmediato a `INITIAL_MANAGERS` para garantizar que nunca se muestren contadores en cero vacíos.
21. **CICLO INTEGRAL DE CORREOS EN GESTIÓN DE TAREAS OPERATIVAS:**
    - Toda tarea operativa debe gatillar correos automáticos en tres momentos exactos:
      1. **Al ser Asignada:** Correo al colaborador asignado con detalles, fase, prioridad y vencimiento.
      2. **Al Vencer:** Alerta de atraso al responsable y supervisión.
      3. **Al Completarse:** Notificación automática de confirmación enviada **al usuario que asignó originalmente la tarea (`assignedByEmail`)**, cerrando el bucle de rendición de cuentas.
    - Procesamiento desacoplado vía Firestore `mail` despachado por `servidorcrearpsl@gmail.com` (TLS 465).
22. **RESTABLECIMIENTO Y BLINDAJE DE FIRESTORE RULES OPERATIVAS:**
    - Las 16 colecciones de colaboración en tiempo real del personal operativo (`staff_directory`, `managers_directory`, `excellence_standards`, `kpi_reports`, `learning_logs`, `qt_directory`, `success_patterns`, `sync_history`, `user_stats`, `llamadas_grupales_historial`, `notas_seguimiento`, `goals_sentinel_audits`, `user_kpi_targets`, `checklist_tasks`, `kpis_entrenadores_llamadas`, y públicas como `imo_missions`) deben mantener `allow read, write: if isAuthenticated();` (o `true` para `imo_missions`).
    - Nunca usar funciones de lectura condicional global (`canReadHojaEnBlanco`) en colecciones consumidas por suscripciones `onSnapshot`, pues Firestore deniega las consultas completas.
    - Preservar el modelo Zero-Trust estricto para `liquidaciones_pagos`, firmas digitales inmutables en `px_legal_signatures` y autenticación de scraper robot con token secreto `NODUS_ROBOT_CPSL_2026_SECRET`.
    - Garantizar que los usuarios autenticados puedan modificar sus propias preferencias en `users/{userId}` (equipos Quito, cumpleaños, teléfono) sin bloqueos por falta de rol SuperAdmin.

