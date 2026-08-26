export const roles = [
  { id: 'gerente', name: 'Gerente de Sede' },
  { id: 'coord_maestria', name: 'Coordinador/a Maestría (CMJ)' },
  { id: 'coord_c1', name: 'Coordinador/a C1/C2' },
  { id: 'capitan', name: 'Capitán' },
  { id: 'qt', name: 'Quantum Team' },
  { id: 'entrenador', name: 'Entrenador (Coach)' },
  { id: 'entrenador_llamadas', name: 'Entrenador de Llamadas' },
  { id: 'director_maestria', name: 'Director de Maestría' },
  { id: 'direccion', name: 'Dirección Global' },
  { id: 'manager', name: 'Manager' },
  { id: 'cfo', name: 'CFO (Finanzas)' },
  { id: 'finanzas', name: 'Finanzas' },
  { id: 'coordinador', name: 'Coordinación Administrativa' },
  { id: 'talento_humano', name: 'Talento Humano' },
  { id: 'legal', name: 'Legal / Jurídico' }
];

// Fases oficiales del SO-AR:
// 1. GATE 1 (Mes antes)
// 2. PRE-C1 (Lunes a Viernes antes de C1)
// 3. C1 (Fin de semana)
// 4. POST-C1 / PRE-C2 (Semana entre entrenamientos)
// 5. C2 (Fin de semana)
// 6. PRE-MJ (Preparación Maestría)
// 7. MJ (FDS 1, 2, 3)
// 8. POST-MJ (Cierre de ciclo)

export const checklistData = [
  // --- GATE 1: UN MES ANTES (GERENTE) ---
  { id: 'soar_1', role: 'gerente', cyclePhase: 'GATE 1', task: 'Entrenamiento definido y fecha confirmada.', isCritical: true },
  { id: 'soar_2', role: 'gerente', cyclePhase: 'GATE 1', task: 'Presupuesto definido, separado y pagado.', isCritical: true },
  { id: 'soar_3', role: 'gerente', cyclePhase: 'GATE 1', task: 'Capacidad requerida confirmada y Salón confirmado/contratado.', isCritical: true },
  { id: 'soar_4', role: 'gerente', cyclePhase: 'GATE 1', task: 'Entrenador confirmado. Honorarios programados/pagados.', isCritical: true },
  { id: 'soar_5', role: 'gerente', cyclePhase: 'GATE 1', task: 'Hotel y Transporte del entrenador reservado y confirmado.', isCritical: true },
  { id: 'soar_6', role: 'gerente', cyclePhase: 'GATE 1', task: 'Vuelo comprado/confirmado y responsable de recepción asignado.', isCritical: true },

  // --- PRE-C1 (POST-MJ DEL CICLO ANTERIOR) ---
  { id: 'soar_7', role: 'gerente', cyclePhase: 'PRE-C1', task: 'Revisar resultados finales de MJ (asistencia, graduados, finanzas).', isCritical: false },
  { id: 'soar_8', role: 'gerente', cyclePhase: 'PRE-C1', task: 'Identificar rezagados y determinar metas del nuevo ciclo C1.', isCritical: true },
  { id: 'soar_9', role: 'gerente', cyclePhase: 'PRE-C1', task: 'Coordinador responsable y equipos de apoyo confirmados.', isCritical: true },
  
  // TAREAS NUEVAS: PRE-C1 CC1Y2
  { id: 'cc1y2_pre1', role: 'coord_c1', cyclePhase: 'PRE-C1', task: 'Martes antes de 10:00 AM (Sedes UIO): Enviar correo solicitando baúles (C1, Confianza, Viaje) e insumos.', isCritical: true },
  { id: 'cc1y2_pre1_b', role: 'coord_c1', cyclePhase: 'PRE-C1', task: 'Martes (Sedes sin logística): Inventariar y armar materiales de baúles (1 semana de anticipación).', isCritical: true },
  { id: 'cc1y2_pre2', role: 'coord_c1', cyclePhase: 'PRE-C1', task: 'Miércoles 13:00: Ejecutar Freeze de listas de asistencia. Validar salón.', isCritical: true },
  { id: 'cc1y2_pre3', role: 'coord_c1', cyclePhase: 'PRE-C1', task: 'Jueves 19:00: Grounding presencial con QT. Asignar al aliado con mayor rigor administrativo al rol de Baúl (verificar lámparas cargadas).', isCritical: true },
  { id: 'cc1y2_pre4', role: 'coord_c1', cyclePhase: 'PRE-C1', task: 'Viernes: Bloqueo final, últimas llamadas de confirmación y registro en base de datos.', isCritical: true },
  { id: 'cc1y2_rutina_diaria', role: 'coord_c1', cyclePhase: 'PRE-C1', task: 'DIARIO (Ma-Vi): 09:00 Inicialización / 10:30 Llamadas (Alta densidad) / 14:00 Escritura en CRM.', isCritical: false },

  // --- C1 ---
  { id: 'soar_10', role: 'gerente', cyclePhase: 'C1', task: 'Supervisar asistencia, incidencias y situación financiera (Sin microgestión).', isCritical: false },
  { id: 'soar_11', role: 'gerente', cyclePhase: 'C1', task: 'Verificar que cada quiebre detectado tenga un responsable asignado.', isCritical: true },
  { id: 'soar_12', role: 'coord_c1', cyclePhase: 'C1', task: 'Registro listo, información de participantes disponible y sistema operativo.', isCritical: true },
  { id: 'soar_13', role: 'coord_c1', cyclePhase: 'C1', task: 'Cierre: Resultado final registrado (Asistencia, Finanzas, Rezagados).', isCritical: true },
  { id: 'soar_14', role: 'capitan', cyclePhase: 'C1', task: 'Alineación de equipo, drills practicados, y aliados alineados.', isCritical: true },
  { id: 'soar_15', role: 'qt', cyclePhase: 'C1', task: 'Ensayar drills, confirmar música, luces, puertas y soporte al entrenador.', isCritical: true },
  
  // TAREAS NUEVAS: EJECUCIÓN C1 CC1Y2
  { id: 'cc1y2_c1_1', role: 'coord_c1', cyclePhase: 'C1', task: 'Martes a Jueves: Segunda llamada (3 Minutos) a todos los inscritos para reafirmar compromisos.', isCritical: true },
  { id: 'cc1y2_c1_2', role: 'coord_c1', cyclePhase: 'C1', task: 'Jueves 18:00: Grounding crítico presencial con Aliados, QT y Capitán.', isCritical: true },
  { id: 'cc1y2_c1_3', role: 'coord_c1', cyclePhase: 'C1', task: 'Viernes 08:00 - 11:30: Configurar 3 mesas operativas y apertura de registro. Corte absoluto a las 11:30.', isCritical: true },
  { id: 'cc1y2_c1_4', role: 'coord_c1', cyclePhase: 'C1', task: 'Viernes 21:00: Emitir reportes de conciliación de asistencia y control de caja.', isCritical: true },
  { id: 'cc1y2_c1_5', role: 'coord_c1', cyclePhase: 'C1', task: 'Sábado 08:00: Control y conteo exacto de los tickets naranja.', isCritical: true },
  { id: 'cc1y2_c1_6', role: 'coord_c1', cyclePhase: 'C1', task: 'Sábado 11:30/14:00/21:00: Despacho de métricas operativas al grupo de oficina.', isCritical: true },
  { id: 'cc1y2_c1_7', role: 'coord_c1', cyclePhase: 'C1', task: 'Domingo 09:00: Capturar e indexar pagos en mesa externa (Mínimo 2 apoyos por mesa todo el día).', isCritical: true },
  { id: 'cc1y2_c1_8', role: 'coord_c1', cyclePhase: 'C1', task: 'Domingo 19:00 - 21:00: Cierre comercial exhaustivo. Etiquetar fichas físicas con C2 o C2+MJ y vía de pago.', isCritical: true },

  // --- POST-C1 / PRE-C2 ---
  { id: 'soar_16', role: 'gerente', cyclePhase: 'POST-C1', task: 'Lunes: Revisar resultados C1, identificar desviaciones y rezagados.', isCritical: true },
  { id: 'soar_17', role: 'gerente', cyclePhase: 'POST-C1', task: 'Definir prioridades para C2 y actualizar metas.', isCritical: true },
  { id: 'soar_18', role: 'coord_c1', cyclePhase: 'POST-C1', task: 'Seguimiento de participantes, pagos y logística para C2.', isCritical: true },
  { id: 'soar_19', role: 'capitan', cyclePhase: 'POST-C1', task: 'Seguimiento a participantes y aliados. Resolver quiebres de equipo.', isCritical: false },
  
  // TAREAS NUEVAS: POST-C1 CC1Y2
  { id: 'cc1y2_post1', role: 'coord_c1', cyclePhase: 'POST-C1', task: 'Lunes: Análisis Post-Mortem. Calcular conversión y re-enrolar junto a la IMO.', isCritical: true },
  { id: 'cc1y2_post2', role: 'coord_c1', cyclePhase: 'POST-C1', task: 'Martes a Miércoles: Llamadas de bienvenida a C2 y mover acuerdos de abonos gerenciales.', isCritical: true },
  { id: 'cc1y2_post3', role: 'coord_c1', cyclePhase: 'POST-C1', task: 'Jueves: HALT (Día libre innegociable de recuperación obligatoria).', isCritical: true },
  { id: 'cc1y2_post4', role: 'coord_c1', cyclePhase: 'POST-C1', task: 'Viernes: Mitigación de rezagados (procesar re-enrolamiento y reasignar fechas).', isCritical: true },
  
  // --- C2 ---
  { id: 'soar_20', role: 'gerente', cyclePhase: 'C2', task: 'Supervisar operación C2, verificar cumplimiento de metas y preparación de MJ.', isCritical: false },
  { id: 'soar_21', role: 'coord_c1', cyclePhase: 'C2', task: 'Controlar operación, asistencia, quiebres financieros y metas.', isCritical: true },
  
  // TAREAS NUEVAS: C2 CC1Y2
  { id: 'cc1y2_c2_1', role: 'coord_c1', cyclePhase: 'C2', task: 'Martes a Miércoles: Segunda llamada a inscritos C2.', isCritical: true },
  { id: 'cc1y2_c2_1_b', role: 'coord_c1', cyclePhase: 'C2', task: 'Miércoles 14:00 PM (Innegociable): Baúl C2 y de actividades cerrado y verificado.', isCritical: true },
  { id: 'cc1y2_c2_2', role: 'coord_c1', cyclePhase: 'C2', task: 'Jueves 10:30 Arranque / 11:45 AM: Grounding de apoyos en salón.', isCritical: true },
  { id: 'cc1y2_c2_3', role: 'coord_c1', cyclePhase: 'C2', task: 'Jueves 15:20 y 17:00: Reporte de ingreso y escaneo de fichas para contabilidad.', isCritical: true },
  { id: 'cc1y2_c2_4', role: 'coord_c1', cyclePhase: 'C2', task: 'Viernes 15:30: Consolidar reporte crítico de Palabras Rotas.', isCritical: true },
  { id: 'cc1y2_c2_5', role: 'coord_c1', cyclePhase: 'C2', task: 'Sábado: Asignación obligatoria de 4 apoyos en la mesa de enrolamiento para mover flujos a MJ.', isCritical: true },
  
  // --- GATE CRÍTICO: VIERNES DE C2 ---
  { id: 'soar_22', role: 'gerente', cyclePhase: 'C2', task: 'GATE C2: Confirmar que los 3 FDS de Maestría tienen estructura y responsable.', isCritical: true },
  { id: 'soar_23', role: 'gerente', cyclePhase: 'C2', task: 'GATE C2: Recibir/validar Meta de rezagados para el PRÓXIMO C1.', isCritical: true },
  { id: 'soar_24', role: 'coord_maestria', cyclePhase: 'C2', task: 'Confirmar Grounding, Entrenador y Managers para los 3 FDS de MJ.', isCritical: true },

  // --- PRE-MAESTRÍA ---
  { id: 'soar_25', role: 'gerente', cyclePhase: 'PRE-MJ', task: 'Verificar salones, logística y presupuesto para MJ.', isCritical: true },
  { id: 'soar_26', role: 'coord_maestria', cyclePhase: 'PRE-MJ', task: 'Coordinar con managers, asegurar groundings y logística de entrenadores.', isCritical: true },
  
  // TAREAS NUEVAS: PRE-MJ CMJ (Semanas 1 y 2)
  { id: 'cmj_pre1', role: 'coord_maestria', cyclePhase: 'PRE-MJ', task: 'Lunes Post-C2 (09:00): Recibir lista de graduados y declaración de caja de managers firmada.', isCritical: true },
  { id: 'cmj_pre2', role: 'coord_maestria', cyclePhase: 'PRE-MJ', task: 'Martes: Asignar managers en sistema (Ratio estricto: 1 manager por cada 6 participantes).', isCritical: true },
  { id: 'cmj_pre3', role: 'coord_maestria', cyclePhase: 'PRE-MJ', task: 'Miércoles: Primera llamada masiva de bienvenida y alineación (100% contactados).', isCritical: true },
  { id: 'cmj_pre4', role: 'coord_maestria', cyclePhase: 'PRE-MJ', task: 'Semana 2 (Miércoles): Grounding Virtual de Contexto con el equipo de managers.', isCritical: true },
  { id: 'cmj_pre5', role: 'coord_maestria', cyclePhase: 'PRE-MJ', task: 'Jueves Pre-FDS (12:00 Deadline Absoluto): Bloquear agenda de Entrenador MJ y confirmar horarios.', isCritical: true },
  
  // --- MAESTRÍA (MJ) ---
  { id: 'soar_27', role: 'gerente', cyclePhase: 'MJ', task: 'Monitorear indicadores ejecutivos: Operación, Finanzas, Riesgos.', isCritical: false },
  { id: 'soar_28', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Dirigir la operación logística de los FDS, asistencia y soporte a entrenadores.', isCritical: true },
  // --- POST-MJ ---
  { id: 'soar_29', role: 'gerente', cyclePhase: 'POST-MJ', task: 'Auditoría final y Cierre de Oro.', isCritical: true },
  { id: 'soar_30', role: 'coord_maestria', cyclePhase: 'POST-MJ', task: 'Consolidar métricas y entregar aprendizajes.', isCritical: true },

  // --- ENTRENADOR (COACH) ---
  { id: 'coach_1', role: 'entrenador', cyclePhase: 'PRE-MJ', task: 'Contactar a los equipos de MJ donde se impartió FDS para iniciar seguimiento.', isCritical: true },
  { id: 'coach_2', role: 'entrenador', cyclePhase: 'MJ', task: 'Realizar 1er seguimiento de la semana con el equipo de MJ.', isCritical: true },
  { id: 'coach_3', role: 'entrenador', cyclePhase: 'MJ', task: 'Realizar 2do seguimiento de la semana con el equipo de MJ.', isCritical: true },
  { id: 'coach_4', role: 'entrenador', cyclePhase: 'PRE-C1', task: 'Monitorear y asegurar que las personas enroladas por el equipo se sienten efectivamente en la sala del Capítulo.', isCritical: true },
  { id: 'coach_5', role: 'entrenador', cyclePhase: 'C1', task: 'Validar asistencia en el Capítulo de los enrolados por el equipo de seguimiento.', isCritical: true },
  // --- ENTRENADOR DE LLAMADAS ---
  { id: 'coach_ll_1', role: 'entrenador_llamadas', cyclePhase: 'PRE-MJ', task: 'Revisar directorio de managers asignados y calendarizar llamadas semanales.', isCritical: true },
  { id: 'coach_ll_2', role: 'entrenador_llamadas', cyclePhase: 'PRE-MJ', task: 'Ejecutar llamada semanal de alineación con cada equipo asignado (#).', isCritical: true },
  { id: 'coach_ll_3', role: 'entrenador_llamadas', cyclePhase: 'MJ', task: 'Registrar asistencia y estatus de conexión en el Centro de Managers.', isCritical: true },
  { id: 'coach_ll_4', role: 'entrenador_llamadas', cyclePhase: 'MJ', task: 'Identificar managers en riesgo de deserción y reportar quiebres a Coordinación.', isCritical: true },

  // --- DIRECTOR DE MAESTRÍA ---
  { id: 'dir_m_1', role: 'director_maestria', cyclePhase: 'PRE-MJ', task: 'Supervisar la asignación equilibrada de managers y cobertura de entrenadores.', isCritical: true },
  { id: 'dir_m_2', role: 'director_maestria', cyclePhase: 'MJ', task: 'Monitorear la tasa de asistencia y efectividad de llamadas grupales en el Centro de Managers.', isCritical: true },
  { id: 'dir_m_3', role: 'director_maestria', cyclePhase: 'POST-MJ', task: 'Consolidar métricas globales de retención y graduación con Dirección.', isCritical: true },

  // --- MANAGERS ---
  { id: 'mngr_1', role: 'manager', cyclePhase: 'PRE-MJ', task: 'Contactar a los participantes de su equipo (#) para bienvenida y confirmación.', isCritical: true },
  { id: 'mngr_2', role: 'manager', cyclePhase: 'PRE-MJ', task: 'Conectarse puntualmente a la llamada grupal semanal con su Entrenador asignado.', isCritical: true },
  { id: 'mngr_3', role: 'manager', cyclePhase: 'MJ', task: 'Dar seguimiento a compromisos y asistencia de los integrantes de su equipo a los FDS.', isCritical: true }
];

export const getTasksByRole = (roleId) => checklistData.filter(t => t.role === roleId);
