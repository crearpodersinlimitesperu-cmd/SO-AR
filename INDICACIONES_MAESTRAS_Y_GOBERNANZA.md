# 📜 LIBRO MAESTRO DE INDICACIONES, GOBERNANZA Y DIRECTIVAS OPERATIVAS
## Plataforma: CREAR PODER SIN LÍMITES GLOBAL (Sistema Operativo SO-AR)

---

> ### 👑 REGLA DE ORO INSTITUCIONAL (INVIOLABLE)
> 1. **JAMÁS alterar la marca "CREAR PODER SIN LÍMITES".**
> 2. **Utilizar SIEMPRE única y exclusivamente los logos oficiales de la empresa para cualquier diseño, página web o comunicación.**
> 3. **Prohibido terminantemente usar íconos de prueba, placeholders o logos de otras marcas (como GitHub, etc.) en reemplazo del logo oficial de la empresa.**

---

## 📑 ÍNDICE GENERAL DE DIRECTIVAS
1. [Nomenclatura Canónica Oficial de Programas y Talleres](#1-nomenclatura-canónica-oficial)
2. [Gobernanza de Accesos y Matriz RBAC](#2-gobernanza-de-accesos-y-matriz-rbac)
3. [Catálogo Oficial de Sedes e Identificación Geográfica Dual](#3-catálogo-oficial-de-sedes-e-identificación-geográfica)
4. [Protocolo de Cero Pérdida de Datos y Trazabilidad Forense](#4-protocolo-de-cero-pérdida-y-trazabilidad-forense)
5. [Eje de Transformación y Metodología de Alto Rendimiento](#5-eje-de-transformación-y-metodología)
6. [Cadena de Mando, Checklists y Protocolo de Emergencias](#6-cadena-de-mando-checklists-y-emergencias)
7. [Estándares de Código, Arquitectura Técnica y Despliegue](#7-estándares-de-código-y-despliegue)
8. [Directivas Futuras y Compromiso de Mantenimiento](#8-directivas-futuras-y-mantenimiento)

---

## 1. NOMENCLATURA CANÓNICA OFICIAL

Todas las vistas, componentes, selectores, botones y documentos deben utilizar estrictamente las siguientes denominaciones:

### A. Eje Central de Liderazgo (Ruta Troncal):
* **`C1`:** **Capítulo Uno** *(Alineamiento, erradicación de excusas y mentalidad de responsabilidad radical / Grounding).*
* **`C2`:** **Capítulo Dos** *(Ejecución bajo presión, trabajo en equipo y rompimiento de barreras).*
* **`C1 / C2`:** **Capítulo 1 y 2 (C1 / C2)**
* **`MJ`:** **Maestría del Juego (MJ)** *(100 días de ejecución sostenida, Futuros Imposibles, auditada por 4 Fines de Semana).*

### B. Los 4 Hitos de Calibración de la Maestría (MJ / 100 Días):
1. **1FDS:** **1FDS — Creación** *(Visión de metas EAI y enrolamiento).*
2. **2FDS:** **2FDS — Relación** *(Dinámica de equipo y clima organizacional).*
3. **3FDS:** **3FDS — Gratitud** *(Servicio, impacto social y auditoría de avance).*
4. **4FDS:** **4FDS — El Viaje** *(Consolidación de resultados, graduación y legado).*

### C. Entrenamientos Complementarios (Simuladores de Presión):
* **🤝 Caída de Confianza / FI:** Círculo de Limpieza, caída en silencio y auditoría de metas.
* **📻 Tanque:** *(Denominación canónica: **"Tanque"**, NUNCA "El Tanque")*. Navegación a ciegas por walkie-talkie y códigos sonoros; auditoría de ego.
* **🔥 Rompimiento de Barreras:** Dinámica del Monje y el Florero, impacto físico destructivo de miedos y anclaje de determinación.
* **🚶 Caminata de Equipos:** Dinámica nocturna de orientación y resistencia colectiva.

---

## 2. GOBERNANZA DE ACCESOS Y MATRIZ RBAC

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

### Directivas de Seguridad Inviolables:

1. **Simulación de Usuarios (`canSimulate`):**
   * **REGLA DIRECTA:** `"SOLO LOS SUPER PUEDEN SIMULAR"`.
   * Única y exclusivamente los **Super Administradores** (`isSuperAdmin` / emails autorizados en `SUPER_ADMIN_EMAILS`) tienen acceso al botón y funcionalidad de simular perfiles o vistas de otros colaboradores.

2. **Asignación y Reasignación de Entrenadores (`canAssignTrainer`):**
   * Restringido **única y exclusivamente** a:
     - **Fernando (Fer) Aragón**
     - **Paul Sosa (CCO)**
     - **Super Administradores** (José Sánchez, Armando Pilacuán).
   * Para todos los demás roles (incluyendo Gerentes y Coordinadores), los campos de selección de entrenadores permanecen en **modo solo lectura protegido**.

3. **Graduaciones y Deserciones (`canChangeManagerStatus`):**
   * **REGLA DIRECTA:** `"Graduaciones/Deserciones: Restringida a Coordinación DE MAESTRIA DEL JUEGO y Dirección de Maestría"`.
   * Restringida **única y exclusivamente** a:
     - **Coordinación de Maestría del Juego** (`coord_maestria`, `coordinador_mj`)
     - **Dirección de Maestría** (`director_maestria`, Andrés Gómez)
     - **Super Administradores**.
   * Los selectores de estado (`Activo`, `Graduado`, `Desertor`, `Archivado`) se bloquean con candado `🔒` y aviso de restricción para cualquier otro perfil.

4. **Segregación del Centro de Managers:**
   * Los Coordinadores de Capítulo 1 y 2 (C1 / C2) **NO** acceden al Centro de Managers. Su enfoque operativo es Quantum Team (QT), Capitanes de Salón y Participantes (Px).

5. **Quantum Team (QT):**
   * Dispone de acceso directo a su manual digital (`manual_quantum_team.html`), Directorio QT sincronizado con Google Sheets y checklists operativos de sala.

---

## 3. CATÁLOGO OFICIAL DE SEDES E IDENTIFICACIÓN GEOGRÁFICA

### A. Regla de Identificación Dual:
* **REGLA DIRECTA:** `"DEBE DE INCLUIR LA CIUDAD SI SABE ADICIONAL AL PAIS"`.
* Toda tarjeta, perfil o badge debe desplegar la **Bandera Vectorial SVG del País** + el nombre explícito de la **Ciudad / Sede** (`📍 Cuenca`, `📍 Quito`, `📍 Guayaquil`, `📍 Lima`, `📍 Medellín`, `📍 México`, `📍 Global`).

### B. Sedes Oficiales Autorizadas (Exclusivamente 6 + Global):
1. 🇪🇨 **Quito (UIO):** *Sede Fortaleza Cuántica (De los Naranjos, 170124 Quito, Ecuador).*
2. 🇪🇨 **Guayaquil (GYE)**
3. 🇪🇨 **Cuenca (CUE)**
4. 🇵🇪 **Lima (LIM):** *Hotel José Antonio / Sede Operativa Lima.*
5. 🇨🇴 **Medellín (MED)**
6. 🇲🇽 **México (MEX / CDMX)**
7. 🌐 **Global:** *(Dirección General, Entrenadores Internacionales, Coordinación Global).*

> ⛔ **Prohibición Estricta:** Erradicadas total y permanentemente las referencias a sedes inactivas o no oficiales (Miami, USA, Bogotá, Cali).

---

## 4. PROTOCOLO DE CERO PÉRDIDA Y TRAZABILIDAD FORENSE

1. **Cero Pérdida de Información:**
   * Todo flujo de creación, edición o actualización debe persistirse de forma redundante:
     - **Capa 1 (Inmediata):** Caché local de alta velocidad en `localStorage` (versión canónica `cpsl_managers_data_v3`, `cpsl_audit_logs`, etc.).
     - **Capa 2 (Nube):** Sincronización asíncrona y resiliente en Firebase Firestore (`audit_logs`, `kpi_reports`, `venues`, `cycles`).
2. **Caja Negra de Auditoría Forense (`auditService.js`):**
   * Cada acción sensible debe dejar un registro inmutable con fecha, hora, usuario, acción y detalle:
     - `LOGIN`, `SIMULACION`, `FIN_SIMULACION`
     - `NUEVO_INTEGRANTE_MANAGER`, `CREAR_EQUIPO_COMPLETO`, `EDITAR_EQUIPO_COMPLETO`
     - `EDITAR_INDIVIDUAL_MANAGER`, `CAMBIO_ESTADO_MANAGER`
     - `REPORTE_KPI_ENVIADO`, `AUDITORIA_KPI_REVISADO`
3. **Alerta de 2 Llamadas Omitidas:**
   * Si un manager registra 2 semanas consecutivas de inasistencia a llamada de seguimiento, el sistema genera automáticamente una alerta de riesgo de deserción para intervención inmediata de Coordinación.

---

## 5. EJE DE TRANSFORMACIÓN Y METODOLOGÍA

* **Filosofía Base:** *"El conocimiento te muestra el camino. El entrenamiento rompe tus barreras."*
* **100% Responsabilidad, 0% Excusas:** Pasar del saber a la acción masiva bajo presión.
* **Metodología de 3 Pasos:**
  1. *Choque Cognitivo:* Desarticulación de patrones automáticos de justificación.
  2. *Simuladores de Presión:* Dinámicas vivenciales de alto estrés controlado donde aflora la verdadera toma de decisiones.
  3. *Trazabilidad de 100 Días (MJ):* Medición diaria y semanal de metas cuantitativas ("Futuros Imposibles") en finanzas, relaciones, salud y liderazgo.

---

## 6. CADENA DE MANDO, CHECKLISTS Y EMERGENCIAS

### A. Cadena de Mando Operativa:
* **Entrenador (Coach):** Conducción del entrenamiento, calibración emocional de la sala y anclaje de lecciones.
* **Coordinador(a) de Sala / Capitán:** *Única Voz* en logística y emergencias. Gobierna tiempos, música, accesos y staff.
* **Gerente de Sede:** Responsable macro de la sede, relación con hoteles, auditoría de KPIs y cumplimiento de presupuestos.
* **Quantum Team (QT):** Soporte silencioso impecable, montaje, custodia de puertas y custodia de energía en sala.

### B. Principio Inviolable en Gestión de Crisis:
1. **Regla de Acero del Entrenador:** El entrenador **NUNCA** interrumpe el entrenamiento ni abandona el escenario ante un desmayo o crisis médica menor; continúa liderando al grupo.
2. **Cadena de Extracción Silenciosa:** El Coordinador y la brigada de primeros auxilios asumen el control, aíslan al participante y lo trasladan al área de enfermería.
3. **Matriz de Escalamiento:**
   * 🟢 **Verde (Sede):** Mareo, deshidratación, fatiga leve.
   * 🟡 **Amarillo (Derivación):** Crisis de pánico prolongada, esguince, corte menor.
   * 🔴 **Rojo (Código Rojo):** Pérdida de consciencia > 1 min, dolor torácico, traumatismo severo $\rightarrow$ Activación inmediata de ambulancia (911 / 106 SAMU / 123).

---

## 7. ESTÁNDARES DE CÓDIGO Y DESPLIEGUE

1. **Box-Sizing Universal:**
   * Todo elemento visual debe respetar `box-sizing: border-box` para prevenir desbordamientos o solapamiento de botones.
2. **Modo Día / Modo Noche Adaptativo:**
   * Uso estricto de variables semánticas CSS (`var(--bg-card)`, `var(--text-main)`, `var(--crear-gold)`, `var(--crear-blue)`). Cero textos en blanco fijo sobre fondos claros.
3. **Auditoría de Dependencias e Íconos:**
   * Todos los íconos de `lucide-react` deben estar formalmente importados en el encabezado del archivo para evitar `ReferenceError`.
4. **Verificación de Compilación:**
   * Todo cambio debe superar `npm run build` con código de salida 0 en tiempo inferior a 2 segundos.
5. **Documentos de Auditoría Siempre al Día:**
   * Con cada release se deben actualizar de forma obligatoria:
     - [CODIGO_AUTORIA.md](file:///c:/Users/josem/Downloads/SO-AR/CODIGO_AUTORIA.md)
     - `CODIGO_COMPLETO_AUDITORIA.doc` / `CODIGO_COMPLETO_AUDITORIA.docx`
     - Repositorio remoto en GitHub (`git push origin master`).

---

## 8. DIRECTIVAS FUTURAS Y MANTENIMIENTO

* Cualquier nueva funcionalidad, vista o módulo que se desarrolle en la plataforma deberá regirse sin excepción por las políticas consignadas en este documento.
* Los roles, sedes y protocolos aquí descritos constituyen el estándar institucional permanente de **CREAR PODER SIN LÍMITES GLOBAL**.

---

**Documento Maestro Aprobado y Certificado:** 2026-08-20  
**CREAR PODER SIN LÍMITES GLOBAL — Todos los derechos reservados.**

### 9. DIRECTIVA OPERATIVA UNIVERSAL DE AUDITORÍA
> **REGLA ESTRICTA:** Cada cosa que se revise o modifique para un usuario específico, DEBE ser revisada, replicada y estandarizada para TODOS los usuarios relevantes en el sistema.
> **REGLA ESTRICTA:** TODO pedido se guarda, y TODA actualización se actualiza y documenta en el archivo maestro de auditoría.
> **REGLA ESTRICTA:** ESTA INDICACIÓN ES PERMANENTE. JAMÁS se deben borrar o sobrescribir los avances, tareas o el historial de los usuarios.
