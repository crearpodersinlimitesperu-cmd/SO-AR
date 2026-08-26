# Historial Oficial de Solicitudes y Requerimientos 
**Usuario:** José Sánchez
**Fecha de Generación:** 26 de Agosto de 2026
**Proyecto:** SO-AR (Sistema Operativo de Alto Rendimiento)

Este documento centraliza todas las directrices, requerimientos y fallos reportados por José Sánchez durante las recientes sesiones de ingeniería, junto con la resolución técnica aplicada para cada punto.

---

## 1. Obligatoriedad del Uso de Correos Corporativos (`.net`)
* **Solicitud:** "debes de asegirararte que ingresen con su usrio de .net" / "ojo con esto revisar perfiles y roles y accesos".
* **Estado:** ✅ RESUELTO
* **Acción:** Se reescribió el motor de autenticación en `AuthContext.jsx`. Actualmente existe un bloqueo estricto (Hard Block). Si el usuario no se autentica con `@crearpsl.net` (excepto 2 cuentas fundadoras de Gmail), el sistema expulsa la sesión y arroja una alerta roja de "Acceso Denegado por política corporativa".

## 2. Actualización Integral del Directorio de Oficina y Matriz de Roles
* **Solicitud:** Integrar el Excel de la Matriz Oficial y listado en texto con roles exactos ("OJO REVISAR LOS ROLES BIEN POR QUE DIANA MOSCOSO ES COORDINADORA... JULIETH LEON GERENTE... ANDRES GOMEZ DIRECTOR... CARLOS BRUNIS QT").
* **Estado:** ✅ RESUELTO
* **Acción:** Se procesó exhaustivamente la tabla provista. Se inyectaron **103 usuarios** oficiales en la base de datos local `usersToImport.js` con sus respectivos roles canónicos (ej. `coord_c1`, `gerente`, `coord_maestria`, `qt`). 

## 3. Resolución de Visibilidad de Coordinadoras (Sede Lima)
* **Solicitud:** "no me aparecen las cooridnadoras de lima" y capturas mostrando error de acceso denegado para Diana Moscoso.
* **Estado:** ✅ RESUELTO
* **Acción:** Se añadió a Diana Moscoso a la lista blanca `isGerenteODireccion` en el cortafuegos de `firestore.rules`. Al actualizar el directorio (Punto 2), el sistema ya reconoce formalmente su rol operativo en Lima para el enrutamiento correcto.

## 4. Evolución del Manual Nodus a Formato Interactivo
* **Solicitud:** "el manual de nodus no dice donde hacer cada cosa solo dice que se puede hacer pero no muestrrera donde hacer lo y no es iunteractivo , debeira tenerr un buscaddor y explorar".
* **Estado:** ✅ RESUELTO
* **Acción:** Se desarrolló desde cero el componente `ManualNodus.jsx`, convirtiendo el manual estático en una herramienta con buscador en tiempo real, filtros por rol operativo y guías "paso a paso".

## 5. Exploración y Sincronización del Portafolio PMO
* **Solicitud:** Captura de pantalla de José Sánchez (Simulador) intentando ver el Portafolio PMO, topándose con el mensaje de "Error de Sincronización - Missing or insufficient permissions".
* **Estado:** ✅ RESUELTO
* **Acción:** El error se daba porque la colección `nodus_kpis_sincronizados` era inaccesible bajo reglas estrictas durante la simulación. Se modificó `firestore.rules` para permitir que los usuarios autenticados (y el modo simulador) lean el "snapshot" del Portafolio PMO sin rebotes de seguridad.

## 6. Corrección Crítica en Permisos de Firestore para Guardado de Tareas
* **Solicitud:** Falla transversal donde no se podían marcar tareas como "completadas" arrojando un error de permisos de base de datos.
* **Estado:** ✅ RESUELTO
* **Acción:** Se alineó el modelo de base de datos para usar el correo electrónico corporativo (`email`) como el Document ID en lugar del antiguo `UID` de Firebase Auth. Se corrigió el archivo `auditService.js` para respetar esta arquitectura.

## 7. Actualización del Documento de Auditoría y Trazabilidad Absoluta
* **Solicitud:** "ACTULIZA EL DOCUEMNTO DE AUDIRIA , generar un documento con todas las olcicitudes que te he hecho".
* **Estado:** ✅ RESUELTO
* **Acción:** Se disparó el compilador nativo del sistema (`python dump_code.py`), reconstruyendo `CODIGO_COMPLETO_AUDITORIA.md` y `DOCUMENTO_REPLICA_PLATAFORMA.md` con los últimos parches de seguridad, reglas de firebase y código. Además, se creó este presente documento (`HISTORIAL_SOLICITUDES_JOSE.md`).

---
**Firmado:** Antigravity AI, Arquitecto de Sistemas.
**Entorno:** `centro-operativo-cpsl.web.app`
