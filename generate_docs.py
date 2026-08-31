import os

docs_dir = r"C:\Users\josem\Downloads\cpsl-base-template\docs"
os.makedirs(docs_dir, exist_ok=True)

docs = {
    "01_Arquitectura_del_Sistema.md": "# 1. Arquitectura del Sistema\n\n**Frontend:** React (Vite)\n**Backend/Base de Datos:** Firebase (Firestore)\n**Autenticación:** Firebase Auth (Google)\n**Hosting:** Firebase Hosting\n\n*La plataforma está diseñada con una arquitectura orientada a eventos en tiempo real, lo que permite que gerentes y coordinadores vean el progreso sincronizado al instante.*",
    "02_Modelo_de_Datos.md": "# 2. Modelo de Datos\n\nEstructura de Firestore:\n\n- `users`: { id, name, email, role, team, supervisor, status }\n- `cycles`: { id, name, startDate, endDate, stages (C1, C2, Maestria) }\n- `tasks`: { id, cycleId, title, roleId, status, isCritical, hasEvidence }\n- `goals`: { id, cycleId, ownerId, kpi, progress, evidenceRequired }\n- `evidences`: { id, taskId, fileUrl, comments, status }\n",
    "03_Mapa_de_Roles.md": "# 3. Mapa de Roles (RBAC)\n\n1. **Gerente:** Visión total, asignación de metas, creación de ciclos.\n2. **Coordinador Maestría:** Checklist de maestría, gestión de metas propias.\n3. **Coordinador C1 / C2:** Checklist específico de capítulo.\n4. **Capitán:** Seguimiento de aliados, checklist de piso.\n5. **Quantum Team (QT):** Auditoría operativa en sala, checklist de soporte.\n",
    "04_Mapa_de_Permisos.md": "# 4. Mapa de Permisos\n\n- **Crear Ciclos:** Gerente.\n- **Asignar Metas:** Gerente.\n- **Actualizar Progreso de Tareas:** Propietario de la tarea.\n- **Validar Evidencias:** Supervisor / Gerente / QT.\n- **Modificar Usuarios:** Administrador / Gerente.\n",
    "05_Flujo_de_Ciclos.md": "# 5. Flujo de Ciclos\n\nEl ciclo es la unidad de tiempo central.\n\n1. **Inicio:** Se define la fecha del C1.\n2. **Preparación (Pre-C1):** Tareas de confirmación, pagos y logística.\n3. **Ejecución (C1):** Operación de fin de semana.\n4. **Seguimiento (Post-C1/Pre-C2):** Seguimiento a indecisos y confirmación para C2.\n5. **Ejecución (C2):** Fin de semana del C2.\n6. **Cierre:** Consolidación, maestría y apertura del nuevo ciclo.\n",
    "06_Manual_Usuario.md": "# 6. Manual de Usuario\n\n1. **Ingresar:** Pulsa en 'Continuar con Google'.\n2. **Pantalla Principal (Mi Día):** Revisa tus prioridades urgentes.\n3. **Mi Checklist:** Marca tus tareas a medida que las completes. Si requieren evidencia, sube el archivo.\n4. **Mis Metas:** Actualiza el % de avance de tus indicadores.\n",
    "07_Manual_Administrador.md": "# 7. Manual del Administrador (Gerente)\n\n1. **Crear Ciclo:** Ve a Configuración > Ciclos > Nuevo.\n2. **Panel Gerencial:** Revisa los semáforos de cumplimiento (Verde, Naranja, Rojo).\n3. **Auditar Evidencias:** Entra al perfil de un coordinador y revisa los archivos adjuntos en sus tareas marcadas.\n",
    "08_Configuracion_Checklists.md": "# 8. Configuración de Checklists\n\nLas plantillas base están en `src/data/checklistData.js`.\nPróximamente se migrarán a Firebase para que el Gerente pueda agregar, editar o eliminar tareas desde la interfaz sin tocar código.\n",
    "09_Lista_Funcionalidades.md": "# 9. Lista de Funcionalidades (Implementadas)\n\n- [x] Selector de Roles Base.\n- [x] Tablero de Checklist Interactivo Local.\n- [x] Panel Gerencial (Progreso de equipo).\n- [x] Diseño UI (Glassmorphism).\n",
    "10_Funcionalidades_Pendientes.md": "# 10. Funcionalidades Pendientes (Roadmap)\n\n- [ ] Conexión a Firebase Auth (Google).\n- [ ] Persistencia Firestore.\n- [ ] Subida de archivos (Evidencias).\n- [ ] Creación de Metas Dinámicas.\n- [ ] Notificaciones en tiempo real.\n",
    "11_Pruebas_Realizadas.md": "# 11. Pruebas Realizadas\n\n- Pruebas UI/UX: Interfaz Glassmorphism validada.\n- Pruebas Estado: Cambio de estados de tareas y recálculo de progreso % funcionales en entorno local.\n",
    "12_Riesgos_Detectados.md": "# 12. Riesgos Detectados\n\n- **Seguridad Firestore:** Asegurar correctamente las Reglas de Seguridad (Firestore Rules) para evitar que un usuario manipule las tareas de otro sin permiso.\n- **Concurrencia:** Posibles conflictos si dos usuarios editan el mismo campo en milisegundos (mitigado por la arquitectura en tiempo real de Firebase).\n",
    "13_Instrucciones_Despliegue.md": "# 13. Instrucciones de Despliegue\n\nPara poner esta aplicación en vivo y accesible desde cualquier navegador:\n\n1. Instalar Firebase CLI: `npm install -g firebase-tools`.\n2. Iniciar sesión: `firebase login`.\n3. Inicializar: `firebase init hosting`.\n4. Construir app: `npm run build`.\n5. Desplegar: `firebase deploy`.\n",
    "14_Instrucciones_Mantenimiento.md": "# 14. Instrucciones de Mantenimiento\n\n- Revisar la consola de Firebase (`console.firebase.google.com`) mensualmente para monitorear uso y costos (el plan gratuito Spark suele ser más que suficiente).\n- Actualizar dependencias `npm update` al menos cada 6 meses por temas de seguridad.\n"
}

for filename, content in docs.items():
    filepath = os.path.join(docs_dir, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Created: {filename}")
