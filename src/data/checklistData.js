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
  { id: 'mngr_3', role: 'manager', cyclePhase: 'MJ', task: 'Dar seguimiento a compromisos y asistencia de los integrantes de su equipo a los FDS.', isCritical: true },

  // ============================================================================
  // CHECKLIST DE APERTURA Y ESTÁNDAR DE SALA (28/08/2026)
  // Fuente: documento "CHECKLIST OPERATIVO — COORDINADOR/A DE CAPÍTULO 1 Y
  // CAPÍTULO 2" provisto por José. Diferenciado por cyclePhase (C1 / C2 / MJ)
  // según la tabla "Estructura Unificada" de ese documento:
  //   - QT solo participa en Capítulo 1 (no aparece en C2 ni en MJ).
  //   - En Maestría del Juego el equipo equivalente de seguimiento son los
  //     Managers, no Capitanes/Aliados/QT.
  //   - Alimentación y tomatodo de Aliados: el documento solo lo especifica
  //     para C1 y C2 ("En C1 y C2, el Coordinador debe verificar...") — no se
  //     agregan tareas de alimentación para MJ porque no está definido en la
  //     fuente (la tabla del documento lo marca como "Según operación").
  // Roles: 'coord_c1' cubre C1 y C2 (mismo criterio que el resto del archivo);
  // 'coord_maestria' cubre MJ.
  // ============================================================================

  // --- I.1 ENTRENADOR (antes del inicio de la jornada) ---
  { id: 'sala_ent_c1_1', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar que el entrenador tenga agua disponible.', isCritical: true },
  { id: 'sala_ent_c1_2', role: 'coord_c1', cyclePhase: 'C1', task: 'Confirmar que el agua del entrenador esté disponible durante toda la jornada.', isCritical: true },
  { id: 'sala_ent_c1_3', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar que la mesa del entrenador esté limpia, ordenada e impecable.', isCritical: true },
  { id: 'sala_ent_c1_4', role: 'coord_c1', cyclePhase: 'C1', task: 'Confirmar que el espacio de trabajo del entrenador esté completamente preparado.', isCritical: true },
  { id: 'sala_ent_c1_5', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar si el entrenador requiere algún elemento adicional para iniciar la jornada.', isCritical: true },
  { id: 'sala_ent_c1_6', role: 'coord_c1', cyclePhase: 'C1', task: 'Resolver o escalar inmediatamente cualquier necesidad operativa del entrenador.', isCritical: true },

  { id: 'sala_ent_c2_1', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar que el entrenador tenga agua disponible.', isCritical: true },
  { id: 'sala_ent_c2_2', role: 'coord_c1', cyclePhase: 'C2', task: 'Confirmar que el agua del entrenador esté disponible durante toda la jornada.', isCritical: true },
  { id: 'sala_ent_c2_3', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar que la mesa del entrenador esté limpia, ordenada e impecable.', isCritical: true },
  { id: 'sala_ent_c2_4', role: 'coord_c1', cyclePhase: 'C2', task: 'Confirmar que el espacio de trabajo del entrenador esté completamente preparado.', isCritical: true },
  { id: 'sala_ent_c2_5', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar si el entrenador requiere algún elemento adicional para iniciar la jornada.', isCritical: true },
  { id: 'sala_ent_c2_6', role: 'coord_c1', cyclePhase: 'C2', task: 'Resolver o escalar inmediatamente cualquier necesidad operativa del entrenador.', isCritical: true },

  { id: 'sala_ent_mj_1', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Verificar que el entrenador tenga agua disponible.', isCritical: true },
  { id: 'sala_ent_mj_2', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Confirmar que el agua del entrenador esté disponible durante toda la jornada.', isCritical: true },
  { id: 'sala_ent_mj_3', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Verificar que la mesa del entrenador esté limpia, ordenada e impecable.', isCritical: true },
  { id: 'sala_ent_mj_4', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Confirmar que el espacio de trabajo del entrenador esté completamente preparado.', isCritical: true },
  { id: 'sala_ent_mj_5', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Verificar si el entrenador requiere algún elemento adicional para iniciar la jornada.', isCritical: true },
  { id: 'sala_ent_mj_6', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Resolver o escalar inmediatamente cualquier necesidad operativa del entrenador.', isCritical: true },

  // --- I.2 COMPUTADORA Y PRESENTACIÓN ---
  { id: 'sala_pc_c1_1', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar que la computadora esté encendida y operativa.', isCritical: true },
  { id: 'sala_pc_c1_2', role: 'coord_c1', cyclePhase: 'C1', task: 'Confirmar que la presentación correspondiente esté cargada.', isCritical: true },
  { id: 'sala_pc_c1_3', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar que la versión correcta de la presentación sea la que se utilizará ese día.', isCritical: true },
  { id: 'sala_pc_c1_4', role: 'coord_c1', cyclePhase: 'C1', task: 'Confirmar que la computadora esté correctamente conectada al sistema de proyección.', isCritical: true },
  { id: 'sala_pc_c1_5', role: 'coord_c1', cyclePhase: 'C1', task: 'Realizar una prueba de proyección.', isCritical: true },
  { id: 'sala_pc_c1_6', role: 'coord_c1', cyclePhase: 'C1', task: 'Confirmar que la imagen se vea correctamente desde el salón.', isCritical: true },
  { id: 'sala_pc_c1_7', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar que exista una alternativa o solución disponible en caso de falla técnica.', isCritical: true },

  { id: 'sala_pc_c2_1', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar que la computadora esté encendida y operativa.', isCritical: true },
  { id: 'sala_pc_c2_2', role: 'coord_c1', cyclePhase: 'C2', task: 'Confirmar que la presentación correspondiente esté cargada.', isCritical: true },
  { id: 'sala_pc_c2_3', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar que la versión correcta de la presentación sea la que se utilizará ese día.', isCritical: true },
  { id: 'sala_pc_c2_4', role: 'coord_c1', cyclePhase: 'C2', task: 'Confirmar que la computadora esté correctamente conectada al sistema de proyección.', isCritical: true },
  { id: 'sala_pc_c2_5', role: 'coord_c1', cyclePhase: 'C2', task: 'Realizar una prueba de proyección.', isCritical: true },
  { id: 'sala_pc_c2_6', role: 'coord_c1', cyclePhase: 'C2', task: 'Confirmar que la imagen se vea correctamente desde el salón.', isCritical: true },
  { id: 'sala_pc_c2_7', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar que exista una alternativa o solución disponible en caso de falla técnica.', isCritical: true },

  { id: 'sala_pc_mj_1', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Verificar que la computadora esté encendida y operativa.', isCritical: true },
  { id: 'sala_pc_mj_2', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Confirmar que la presentación correspondiente esté cargada.', isCritical: true },
  { id: 'sala_pc_mj_3', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Verificar que la versión correcta de la presentación sea la que se utilizará ese día.', isCritical: true },
  { id: 'sala_pc_mj_4', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Confirmar que la computadora esté correctamente conectada al sistema de proyección.', isCritical: true },
  { id: 'sala_pc_mj_5', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Realizar una prueba de proyección.', isCritical: true },
  { id: 'sala_pc_mj_6', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Confirmar que la imagen se vea correctamente desde el salón.', isCritical: true },
  { id: 'sala_pc_mj_7', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Verificar que exista una alternativa o solución disponible en caso de falla técnica.', isCritical: true },

  // --- I.3 PROYECCIÓN ---
  { id: 'sala_proy_c1_1', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar que el proyector esté funcionando.', isCritical: true },
  { id: 'sala_proy_c1_2', role: 'coord_c1', cyclePhase: 'C1', task: 'Confirmar que la imagen sea clara y visible.', isCritical: true },
  { id: 'sala_proy_c1_3', role: 'coord_c1', cyclePhase: 'C1', task: 'Revisar conexiones y cables del proyector.', isCritical: true },
  { id: 'sala_proy_c1_4', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar que la proyección corresponda correctamente a la computadora del entrenador.', isCritical: true },
  { id: 'sala_proy_c1_5', role: 'coord_c1', cyclePhase: 'C1', task: 'Confirmar que no existan interrupciones técnicas antes del inicio.', isCritical: true },

  { id: 'sala_proy_c2_1', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar que el proyector esté funcionando.', isCritical: true },
  { id: 'sala_proy_c2_2', role: 'coord_c1', cyclePhase: 'C2', task: 'Confirmar que la imagen sea clara y visible.', isCritical: true },
  { id: 'sala_proy_c2_3', role: 'coord_c1', cyclePhase: 'C2', task: 'Revisar conexiones y cables del proyector.', isCritical: true },
  { id: 'sala_proy_c2_4', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar que la proyección corresponda correctamente a la computadora del entrenador.', isCritical: true },
  { id: 'sala_proy_c2_5', role: 'coord_c1', cyclePhase: 'C2', task: 'Confirmar que no existan interrupciones técnicas antes del inicio.', isCritical: true },

  { id: 'sala_proy_mj_1', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Verificar que el proyector esté funcionando.', isCritical: true },
  { id: 'sala_proy_mj_2', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Confirmar que la imagen sea clara y visible.', isCritical: true },
  { id: 'sala_proy_mj_3', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Revisar conexiones y cables del proyector.', isCritical: true },
  { id: 'sala_proy_mj_4', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Verificar que la proyección corresponda correctamente a la computadora del entrenador.', isCritical: true },
  { id: 'sala_proy_mj_5', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Confirmar que no existan interrupciones técnicas antes del inicio.', isCritical: true },

  // --- I.4 SONIDO Y MICRÓFONOS (antes de que ingresen los participantes) ---
  { id: 'sala_son_c1_1', role: 'coord_c1', cyclePhase: 'C1', task: 'Encender y probar el sistema de sonido.', isCritical: true },
  { id: 'sala_son_c1_2', role: 'coord_c1', cyclePhase: 'C1', task: 'Probar los micrófonos.', isCritical: true },
  { id: 'sala_son_c1_3', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar batería o carga de los micrófonos inalámbricos.', isCritical: true },
  { id: 'sala_son_c1_4', role: 'coord_c1', cyclePhase: 'C1', task: 'Confirmar que exista micrófono de respaldo si la operación lo requiere.', isCritical: true },
  { id: 'sala_son_c1_5', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar que el volumen sea adecuado.', isCritical: true },
  { id: 'sala_son_c1_6', role: 'coord_c1', cyclePhase: 'C1', task: 'Confirmar que no existan interferencias, cortes o ruidos.', isCritical: true },
  { id: 'sala_son_c1_7', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar que música, videos y cualquier recurso de audio puedan reproducirse correctamente.', isCritical: true },

  { id: 'sala_son_c2_1', role: 'coord_c1', cyclePhase: 'C2', task: 'Encender y probar el sistema de sonido.', isCritical: true },
  { id: 'sala_son_c2_2', role: 'coord_c1', cyclePhase: 'C2', task: 'Probar los micrófonos.', isCritical: true },
  { id: 'sala_son_c2_3', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar batería o carga de los micrófonos inalámbricos.', isCritical: true },
  { id: 'sala_son_c2_4', role: 'coord_c1', cyclePhase: 'C2', task: 'Confirmar que exista micrófono de respaldo si la operación lo requiere.', isCritical: true },
  { id: 'sala_son_c2_5', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar que el volumen sea adecuado.', isCritical: true },
  { id: 'sala_son_c2_6', role: 'coord_c1', cyclePhase: 'C2', task: 'Confirmar que no existan interferencias, cortes o ruidos.', isCritical: true },
  { id: 'sala_son_c2_7', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar que música, videos y cualquier recurso de audio puedan reproducirse correctamente.', isCritical: true },

  { id: 'sala_son_mj_1', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Encender y probar el sistema de sonido.', isCritical: true },
  { id: 'sala_son_mj_2', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Probar los micrófonos.', isCritical: true },
  { id: 'sala_son_mj_3', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Verificar batería o carga de los micrófonos inalámbricos.', isCritical: true },
  { id: 'sala_son_mj_4', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Confirmar que exista micrófono de respaldo si la operación lo requiere.', isCritical: true },
  { id: 'sala_son_mj_5', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Verificar que el volumen sea adecuado.', isCritical: true },
  { id: 'sala_son_mj_6', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Confirmar que no existan interferencias, cortes o ruidos.', isCritical: true },
  { id: 'sala_son_mj_7', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Verificar que música, videos y cualquier recurso de audio puedan reproducirse correctamente.', isCritical: true },

  // --- II. ESTÁNDAR DEL SALÓN ---
  { id: 'sala_std_c1_1', role: 'coord_c1', cyclePhase: 'C1', task: 'El salón está limpio.', isCritical: true },
  { id: 'sala_std_c1_2', role: 'coord_c1', cyclePhase: 'C1', task: 'El salón está ordenado.', isCritical: true },
  { id: 'sala_std_c1_3', role: 'coord_c1', cyclePhase: 'C1', task: 'Las mesas están correctamente ubicadas, cuando corresponda.', isCritical: true },
  { id: 'sala_std_c1_4', role: 'coord_c1', cyclePhase: 'C1', task: 'Las sillas están correctamente distribuidas.', isCritical: true },
  { id: 'sala_std_c1_5', role: 'coord_c1', cyclePhase: 'C1', task: 'Los espacios de circulación están despejados.', isCritical: true },
  { id: 'sala_std_c1_6', role: 'coord_c1', cyclePhase: 'C1', task: 'La mesa del entrenador está impecable.', isCritical: true },
  { id: 'sala_std_c1_7', role: 'coord_c1', cyclePhase: 'C1', task: 'La zona de operación está organizada.', isCritical: true },
  { id: 'sala_std_c1_8', role: 'coord_c1', cyclePhase: 'C1', task: 'No existen elementos innecesarios que afecten la presentación o el funcionamiento del entrenamiento.', isCritical: true },
  { id: 'sala_std_c1_9', role: 'coord_c1', cyclePhase: 'C1', task: 'El salón está listo antes del ingreso de los participantes.', isCritical: true },

  { id: 'sala_std_c2_1', role: 'coord_c1', cyclePhase: 'C2', task: 'El salón está limpio.', isCritical: true },
  { id: 'sala_std_c2_2', role: 'coord_c1', cyclePhase: 'C2', task: 'El salón está ordenado.', isCritical: true },
  { id: 'sala_std_c2_3', role: 'coord_c1', cyclePhase: 'C2', task: 'Las mesas están correctamente ubicadas, cuando corresponda.', isCritical: true },
  { id: 'sala_std_c2_4', role: 'coord_c1', cyclePhase: 'C2', task: 'Las sillas están correctamente distribuidas.', isCritical: true },
  { id: 'sala_std_c2_5', role: 'coord_c1', cyclePhase: 'C2', task: 'Los espacios de circulación están despejados.', isCritical: true },
  { id: 'sala_std_c2_6', role: 'coord_c1', cyclePhase: 'C2', task: 'La mesa del entrenador está impecable.', isCritical: true },
  { id: 'sala_std_c2_7', role: 'coord_c1', cyclePhase: 'C2', task: 'La zona de operación está organizada.', isCritical: true },
  { id: 'sala_std_c2_8', role: 'coord_c1', cyclePhase: 'C2', task: 'No existen elementos innecesarios que afecten la presentación o el funcionamiento del entrenamiento.', isCritical: true },
  { id: 'sala_std_c2_9', role: 'coord_c1', cyclePhase: 'C2', task: 'El salón está listo antes del ingreso de los participantes.', isCritical: true },

  { id: 'sala_std_mj_1', role: 'coord_maestria', cyclePhase: 'MJ', task: 'El salón está limpio.', isCritical: true },
  { id: 'sala_std_mj_2', role: 'coord_maestria', cyclePhase: 'MJ', task: 'El salón está ordenado.', isCritical: true },
  { id: 'sala_std_mj_3', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Las mesas están correctamente ubicadas, cuando corresponda.', isCritical: true },
  { id: 'sala_std_mj_4', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Las sillas están correctamente distribuidas.', isCritical: true },
  { id: 'sala_std_mj_5', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Los espacios de circulación están despejados.', isCritical: true },
  { id: 'sala_std_mj_6', role: 'coord_maestria', cyclePhase: 'MJ', task: 'La mesa del entrenador está impecable.', isCritical: true },
  { id: 'sala_std_mj_7', role: 'coord_maestria', cyclePhase: 'MJ', task: 'La zona de operación está organizada.', isCritical: true },
  { id: 'sala_std_mj_8', role: 'coord_maestria', cyclePhase: 'MJ', task: 'No existen elementos innecesarios que afecten la presentación o el funcionamiento del entrenamiento.', isCritical: true },
  { id: 'sala_std_mj_9', role: 'coord_maestria', cyclePhase: 'MJ', task: 'El salón está listo antes del ingreso de los participantes.', isCritical: true },

  // --- III. CONTROL DEL EQUIPO HUMANO ---
  // C1: incluye QT (QT solo participa en Capítulo 1).
  { id: 'sala_equipo_c1_1', role: 'coord_c1', cyclePhase: 'C1', task: 'Contar el número de Capitanes presentes.', isCritical: true },
  { id: 'sala_equipo_c1_2', role: 'coord_c1', cyclePhase: 'C1', task: 'Contar el número de Aliados presentes.', isCritical: true },
  { id: 'sala_equipo_c1_3', role: 'coord_c1', cyclePhase: 'C1', task: 'Contar el número de integrantes del QT presentes.', isCritical: true },
  { id: 'sala_equipo_c1_4', role: 'coord_c1', cyclePhase: 'C1', task: 'Comparar la asistencia real del equipo (Capitanes, Aliados, QT) con la cantidad requerida.', isCritical: true },
  { id: 'sala_equipo_c1_5', role: 'coord_c1', cyclePhase: 'C1', task: 'Identificar ausencias del equipo.', isCritical: true },
  { id: 'sala_equipo_c1_6', role: 'coord_c1', cyclePhase: 'C1', task: 'Dar seguimiento a las personas del equipo que no han llegado.', isCritical: true },
  { id: 'sala_equipo_c1_7', role: 'coord_c1', cyclePhase: 'C1', task: 'Confirmar quién reemplazará una ausencia del equipo cuando sea necesario.', isCritical: true },
  { id: 'sala_equipo_c1_8', role: 'coord_c1', cyclePhase: 'C1', task: 'Informar cualquier déficit crítico de equipo al responsable correspondiente.', isCritical: true },

  // C2: sin QT (QT solo participa en Capítulo 1, no aparece como equipo operativo regular en C2).
  { id: 'sala_equipo_c2_1', role: 'coord_c1', cyclePhase: 'C2', task: 'Contar el número de Capitanes presentes.', isCritical: true },
  { id: 'sala_equipo_c2_2', role: 'coord_c1', cyclePhase: 'C2', task: 'Contar el número de Aliados presentes.', isCritical: true },
  { id: 'sala_equipo_c2_3', role: 'coord_c1', cyclePhase: 'C2', task: 'Comparar la asistencia real del equipo (Capitanes, Aliados) con la cantidad requerida.', isCritical: true },
  { id: 'sala_equipo_c2_4', role: 'coord_c1', cyclePhase: 'C2', task: 'Identificar ausencias del equipo.', isCritical: true },
  { id: 'sala_equipo_c2_5', role: 'coord_c1', cyclePhase: 'C2', task: 'Dar seguimiento a las personas del equipo que no han llegado.', isCritical: true },
  { id: 'sala_equipo_c2_6', role: 'coord_c1', cyclePhase: 'C2', task: 'Confirmar quién reemplazará una ausencia del equipo cuando sea necesario.', isCritical: true },
  { id: 'sala_equipo_c2_7', role: 'coord_c1', cyclePhase: 'C2', task: 'Informar cualquier déficit crítico de equipo al responsable correspondiente.', isCritical: true },

  // MJ: equipo equivalente = Managers (Sección VII del documento fuente).
  { id: 'sala_equipo_mj_1', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Confirmar el número esperado de Managers para la jornada.', isCritical: true },
  { id: 'sala_equipo_mj_2', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Contar el número de Managers presentes.', isCritical: true },
  { id: 'sala_equipo_mj_3', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Identificar Managers ausentes.', isCritical: true },
  { id: 'sala_equipo_mj_4', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Dar seguimiento inmediato a los Managers que no hayan llegado.', isCritical: true },
  { id: 'sala_equipo_mj_5', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Confirmar cobertura de funciones críticas ante ausencias de Managers.', isCritical: true },
  { id: 'sala_equipo_mj_6', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Atender las necesidades operativas del equipo de Managers.', isCritical: true },

  // --- IV. ALIMENTACIÓN Y BIENESTAR DE ALIADOS ---
  // El documento fuente solo especifica esto para C1 y C2 ("En C1 y C2, el
  // Coordinador debe verificar..."). No se agregan tareas de alimentación
  // para MJ: no está definido en la fuente (tabla lo marca "Según operación").
  { id: 'sala_alim_c1_1', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar que los aliados tengan acceso a frutos secos u otros alimentos definidos por la operación.', isCritical: true },
  { id: 'sala_alim_c1_2', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar que exista una cantidad suficiente de alimento para el equipo de aliados presente.', isCritical: true },
  { id: 'sala_alim_c1_3', role: 'coord_c1', cyclePhase: 'C1', task: 'Confirmar que la distribución de alimento para aliados esté organizada.', isCritical: false },
  { id: 'sala_alim_c1_4', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar que los aliados hayan llevado su tomatodo o envase reutilizable para hidratarse. Regla operativa: cada aliado debe asistir con su tomatodo o envase reutilizable.', isCritical: true },
  { id: 'sala_alim_c1_5', role: 'coord_c1', cyclePhase: 'C1', task: 'Recordar previamente al equipo de aliados que debe asistir con su propio tomatodo o envase reutilizable.', isCritical: false },
  { id: 'sala_alim_c1_6', role: 'coord_c1', cyclePhase: 'C1', task: 'Identificar con anticipación cualquier necesidad relacionada con hidratación o alimentación de los aliados.', isCritical: false },

  { id: 'sala_alim_c2_1', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar que los aliados tengan acceso a frutos secos u otros alimentos definidos por la operación.', isCritical: true },
  { id: 'sala_alim_c2_2', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar que exista una cantidad suficiente de alimento para el equipo de aliados presente.', isCritical: true },
  { id: 'sala_alim_c2_3', role: 'coord_c1', cyclePhase: 'C2', task: 'Confirmar que la distribución de alimento para aliados esté organizada.', isCritical: false },
  { id: 'sala_alim_c2_4', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar que los aliados hayan llevado su tomatodo o envase reutilizable para hidratarse. Regla operativa: cada aliado debe asistir con su tomatodo o envase reutilizable.', isCritical: true },
  { id: 'sala_alim_c2_5', role: 'coord_c1', cyclePhase: 'C2', task: 'Recordar previamente al equipo de aliados que debe asistir con su propio tomatodo o envase reutilizable.', isCritical: false },
  { id: 'sala_alim_c2_6', role: 'coord_c1', cyclePhase: 'C2', task: 'Identificar con anticipación cualquier necesidad relacionada con hidratación o alimentación de los aliados.', isCritical: false },

  // --- V. SEGUIMIENTO DURANTE EL DÍA (el checklist no termina cuando inicia el entrenamiento) ---
  { id: 'sala_seg_c1_1', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar periódicamente que el entrenador tenga agua.', isCritical: false },
  { id: 'sala_seg_c1_2', role: 'coord_c1', cyclePhase: 'C1', task: 'Supervisar que computadora, presentación y proyección continúen funcionando durante la jornada.', isCritical: false },
  { id: 'sala_seg_c1_3', role: 'coord_c1', cyclePhase: 'C1', task: 'Verificar periódicamente el sonido y los micrófonos durante la jornada.', isCritical: false },
  { id: 'sala_seg_c1_4', role: 'coord_c1', cyclePhase: 'C1', task: 'Confirmar que el salón conserve el estándar de orden durante el día.', isCritical: false },
  { id: 'sala_seg_c1_5', role: 'coord_c1', cyclePhase: 'C1', task: 'Dar seguimiento a Capitanes y Aliados durante la jornada.', isCritical: false },
  { id: 'sala_seg_c1_6', role: 'coord_c1', cyclePhase: 'C1', task: 'Dar seguimiento también al QT durante la jornada (aplica solo en Capítulo 1).', isCritical: false },
  { id: 'sala_seg_c1_7', role: 'coord_c1', cyclePhase: 'C1', task: 'Detectar ausencias o desconexiones del equipo durante el día.', isCritical: false },
  { id: 'sala_seg_c1_8', role: 'coord_c1', cyclePhase: 'C1', task: 'Resolver problemas operativos que surjan durante la jornada.', isCritical: false },
  { id: 'sala_seg_c1_9', role: 'coord_c1', cyclePhase: 'C1', task: 'Escalar únicamente los problemas que excedan su capacidad de resolución.', isCritical: false },

  { id: 'sala_seg_c2_1', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar periódicamente que el entrenador tenga agua.', isCritical: false },
  { id: 'sala_seg_c2_2', role: 'coord_c1', cyclePhase: 'C2', task: 'Supervisar que computadora, presentación y proyección continúen funcionando durante la jornada.', isCritical: false },
  { id: 'sala_seg_c2_3', role: 'coord_c1', cyclePhase: 'C2', task: 'Verificar periódicamente el sonido y los micrófonos durante la jornada.', isCritical: false },
  { id: 'sala_seg_c2_4', role: 'coord_c1', cyclePhase: 'C2', task: 'Confirmar que el salón conserve el estándar de orden durante el día.', isCritical: false },
  { id: 'sala_seg_c2_5', role: 'coord_c1', cyclePhase: 'C2', task: 'Dar seguimiento a Capitanes y Aliados durante la jornada.', isCritical: false },
  { id: 'sala_seg_c2_6', role: 'coord_c1', cyclePhase: 'C2', task: 'Detectar ausencias o desconexiones del equipo durante el día.', isCritical: false },
  { id: 'sala_seg_c2_7', role: 'coord_c1', cyclePhase: 'C2', task: 'Resolver problemas operativos que surjan durante la jornada.', isCritical: false },
  { id: 'sala_seg_c2_8', role: 'coord_c1', cyclePhase: 'C2', task: 'Escalar únicamente los problemas que excedan su capacidad de resolución.', isCritical: false },

  { id: 'sala_seg_mj_1', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Verificar periódicamente que el entrenador tenga agua.', isCritical: false },
  { id: 'sala_seg_mj_2', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Supervisar que computadora, presentación y proyección continúen funcionando durante la jornada.', isCritical: false },
  { id: 'sala_seg_mj_3', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Verificar periódicamente el sonido y los micrófonos durante la jornada.', isCritical: false },
  { id: 'sala_seg_mj_4', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Confirmar que el salón conserve el estándar de orden durante el día.', isCritical: false },
  { id: 'sala_seg_mj_5', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Dar seguimiento a los Managers durante la jornada.', isCritical: false },
  { id: 'sala_seg_mj_6', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Detectar ausencias o desconexiones de Managers durante el día.', isCritical: false },
  { id: 'sala_seg_mj_7', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Resolver o escalar problemas operativos que surjan durante la jornada.', isCritical: false },

  // ============================================================================
  // CHECKLIST OPERATIVO DETALLADO C1/C2/MJ — HORA A HORA (28/08/2026)
  // Fuente: "Checklist Detallado e Institucional de Tareas para CC1Y2" y
  // "...para el Coordinador de Maestría del Juego (CMJ)", provistos por José.
  // Revisado contra lo ya existente en este archivo (cc1y2_*, cmj_*, sala_*)
  // para NO repetir: se omiten aquí las verificaciones genéricas de sala,
  // equipo y proyección/sonido/asistencia que ya cubre la sección "sala_*" de
  // arriba, y las tareas de alto nivel que ya cubrían cc1y2_*/cmj_*. Solo se
  // agrega lo que es información NUEVA y específica del documento: horarios
  // exactos, contenidos de baúles, reglas de tickets, disparadores del
  // sistema (ej. Palabra Rota), y nombres/roles puntuales.
  // CORRECCIÓN DE JOSÉ (28/08/2026): la Noche de Confianza ahora se realiza
  // el VIERNES, no el jueves como decía el documento original — reflejado en
  // sala_ent_c1... no, en la tarea 'c1v2_th_7' de abajo.
  // ============================================================================

  // --- C1 · Jueves previo ---
  { id: 'c1v2_th_1', role: 'coord_c1', cyclePhase: 'C1', task: 'Jueves 15:00-17:00: inspección física del salón — validar que la altura del techo sea de mínimo 4.5 metros para la dinámica de Caída de Confianza. Probar audio, iluminación, proyector, micrófonos (con baterías AA/AAA listas) y control de aire acondicionado.', isCritical: true },
  { id: 'c1v2_th_2', role: 'coord_c1', cyclePhase: 'C1', task: 'Jueves 17:00-18:00: auditoría del baúl físico de C1 — verificar 100% de insumos oficiales: 370 bolígrafos, marcadores para rotafolio, 430 porta gafetes, cinta masking ancha, 2 lámparas de mano y la dotación de tickets (azul, naranja, amarillo).', isCritical: true },
  { id: 'c1v2_th_3', role: 'coord_c1', cyclePhase: 'C1', task: 'Jueves 18:00 (hora exacta): Grounding presencial de Aliados, Capitán y Quantum Team. Regla de cero tolerancia: a las 18:00 se cierra y bloquea la puerta de sala — todo aliado impuntual queda fuera del staff de apoyo, sin excepciones.', isCritical: true },
  { id: 'c1v2_th_4', role: 'coord_c1', cyclePhase: 'C1', task: 'Grounding de aliados: asignar funciones de salón (Puertas, Gafetes, Tiempo, Música, Sillas, Excelencia, Micrófonos) — ningún aliado puede repetir el rol que tuvo en el ciclo anterior.', isCritical: true },
  { id: 'c1v2_th_5', role: 'coord_c1', cyclePhase: 'C1', task: 'Publicar el listado de parejas Sombra (espejo de responsabilidad) y verificar que se agreguen a los chats específicos en 2 minutos.', isCritical: true },
  { id: 'c1v2_th_6', role: 'coord_c1', cyclePhase: 'C1', task: '[CORRECCIÓN 28/08/2026: la Noche de Confianza ahora se realiza el VIERNES, no el jueves] Coordinar el montaje del baúl especial de Noche de Confianza (15 lavacaras, 5 cremas, 2 resistencias, globos, serpentinas y bocaditos) para los graduados de Maestría.', isCritical: true },
  { id: 'c1v2_th_7', role: 'coord_c1', cyclePhase: 'C1', task: 'Jueves 22:00-23:00: cierre del día — salón cerrado con llave, reporte de inicio de ciclo enviado al chat de oficina local.', isCritical: false },

  // --- C1 · Viernes (Día 1 — Registro y Apertura) ---
  { id: 'c1v2_vi_1', role: 'coord_c1', cyclePhase: 'C1', task: 'Viernes 07:00-07:45: montaje de las 3 mesas operativas externas — Mesa de carta responsiva, Mesa de registro de asistencia y Mesa de no listados.', isCritical: true },
  { id: 'c1v2_vi_2', role: 'coord_c1', cyclePhase: 'C1', task: 'Viernes 08:30-09:00: transición con el entrenador — entrega de la carpeta del entrenador (lista de precios, fechas, contratos y cartas de deslinde).', isCritical: true },
  { id: 'c1v2_vi_3', role: 'coord_c1', cyclePhase: 'C1', task: 'Viernes 09:00: apertura de puertas y registro — escaneo digital obligatorio de códigos QR de participantes en la App Nodus, exigir firma física de la Carta de Exoneración y entrega del Ticket Azul de ingreso antes de cruzar la puerta.', isCritical: true },
  { id: 'c1v2_vi_4', role: 'coord_c1', cyclePhase: 'C1', task: 'Viernes 11:00: reporte inicial de asistencia al Gerente de Sede (llegaron X, en camino Y).', isCritical: true },
  { id: 'c1v2_vi_5', role: 'coord_c1', cyclePhase: 'C1', task: 'Viernes 11:30: reporte de cierre de registro — envío del consolidado de asistencia física a contabilidad, cierre de puertas del salón e inicio de la Orientación del Entrenador (9 Puntos, Reglas, Camarón que se duerme).', isCritical: true },
  { id: 'c1v2_vi_6', role: 'coord_c1', cyclePhase: 'C1', task: 'Viernes 13:30: alimentar el Cuadro de Conversión (módulo Nodus) — digitar en tiempo real los datos de los grupos de creación conformados en sala para que el Quantum Team inicie el rastreo de enrolamiento.', isCritical: true },
  { id: 'c1v2_vi_7', role: 'coord_c1', cyclePhase: 'C1', task: 'Viernes 15:00-17:00 (break de comida): reemplazar todos los gafetes hechos a mano por impresiones en excelencia; llamadas telefónicas inmediatas a inscritos que no llegaron por la mañana.', isCritical: false },
  { id: 'c1v2_vi_8', role: 'coord_c1', cyclePhase: 'C1', task: 'Viernes 21:30: Grounding de cierre de día — retroalimentación del entrenador, verificar deserción del Día 1, acordar llamadas de reconfirmación de aliados para el sábado 08:00 AM, enviar reporte final de asistencia al chat de oficina local.', isCritical: true },

  // --- C1 · Sábado (Día 2 — Relaciones y Caída de Confianza) ---
  { id: 'c1v2_sa_1', role: 'coord_c1', cyclePhase: 'C1', task: 'Sábado 08:30: Grounding de Aliados — analizar quiebres de energía detectados el viernes, ajustar roles del fin de semana, re-alinear código de vestimenta (staff con polo negro, jean negro y abrigo negro obligatorio).', isCritical: true },
  { id: 'c1v2_sa_2', role: 'coord_c1', cyclePhase: 'C1', task: 'Sábado 09:00: apertura de puertas — entrega física del Ticket Naranja en mesa por parte del CC1Y2.', isCritical: true },
  { id: 'c1v2_sa_3', role: 'coord_c1', cyclePhase: 'C1', task: 'Sábado 11:00: hora máxima de entrada — cierre absoluto de puertas para participantes.', isCritical: true },
  { id: 'c1v2_sa_4', role: 'coord_c1', cyclePhase: 'C1', task: 'Preparación de salón alterno: coordinar con el Capitán y el hotel que el salón para el Juego del Reino y el espacio de Caída de Confianza estén montados en excelencia.', isCritical: true },
  { id: 'c1v2_sa_5', role: 'coord_c1', cyclePhase: 'C1', task: 'Sábado 17:00-18:30: Dinámicas de Confrontación — el CC1Y2 permanece fuera del salón para atender descompensaciones emocionales o físicas en coordinación con el Capitán y el equipo médico.', isCritical: true },
  { id: 'c1v2_sa_6', role: 'coord_c1', cyclePhase: 'C1', task: 'Sábado 22:00: Grounding nocturno — conteo de participantes declarantes de intenciones, alineación de apoyos para la mesa del domingo (revisión de cobros y datáfonos), envío de reporte al chat local.', isCritical: true },

  // --- C1 · Domingo (Día 3 — Cosecha Comercial y Pase de Antorcha) ---
  { id: 'c1v2_do_1', role: 'coord_c1', cyclePhase: 'C1', task: 'Domingo 08:30: Grounding y alineación de apoyos — montaje de las 3 mesas simultáneas: Mesa de Registro C1, Mesa de Creación (liderada por el Coordinador de Maestría) y Mesa de Enrolamiento (colaboran ambos coordinadores).', isCritical: true },
  { id: 'c1v2_do_2', role: 'coord_c1', cyclePhase: 'C1', task: 'Domingo 09:00: apertura de mesas de enrolamiento — foco absoluto e ininterrumpido del CC1Y2 en cobrar y matricular participantes a C2, registrando exclusivamente bajo las nomenclaturas C2 o C2+MJ. Regla de caja: etiquetar cada transacción en Nodus según la vía (TRANSF, TC, LINK, EFECTIVO, USDT, PAYPHONE o PAYPAL).', isCritical: true },
  { id: 'c1v2_do_3', role: 'coord_c1', cyclePhase: 'C1', task: 'Domingo 10:30: Charla del Avión — el CC1Y2 procesa los pagos en tiempo real en Nodus para emitir el Ticket Rojo de ingreso al avanzado.', isCritical: true },
  { id: 'c1v2_do_4', role: 'coord_c1', cyclePhase: 'C1', task: 'Domingo 15:30: Declaración de Aliados C2 — el entrenador saca la declaración pública; el CC1Y2 registra nombres y teléfonos de los declarados de forma inmediata.', isCritical: true },
  { id: 'c1v2_do_5', role: 'coord_c1', cyclePhase: 'C1', task: 'Domingo 20:00: Clausura e ingreso de familiares — reapertura de mesas de pagos en la noche para recolectar saldos pendientes de familiares.', isCritical: false },
  { id: 'c1v2_do_6', role: 'coord_c1', cyclePhase: 'C1', task: 'Domingo 21:00: cierre operativo y contable — cierre contable de terminales POS, escanear al 100% las fichas físicas de C2 firmadas por los coordinadores, descargar la lista de asistencia de Nodus, y enviar el PDF consolidado a la Jefa Financiera (Elizabeth Escobar) por WhatsApp local.', isCritical: true },

  // --- C2 · Miércoles previo ---
  { id: 'c2v2_mi_1', role: 'coord_c1', cyclePhase: 'C2', task: 'Miércoles 11:00: cierre de listas — consolidar el censo final de participantes confirmados y rezagados de C2.', isCritical: true },
  { id: 'c2v2_mi_2', role: 'coord_c1', cyclePhase: 'C2', task: 'Miércoles 14:00: preparación de baúles — verificar físicamente el baúl de C2 (sábanas de cama sin elástico, almohadas, vendas para los ojos, pelotas, cintas masking y la dotación de pulseras de seguridad numeradas).', isCritical: true },
  { id: 'c2v2_mi_3', role: 'coord_maestria', cyclePhase: 'C2', task: 'Miércoles 16:00: coordinación de vuelos — el Coordinador de Maestría de la sede envía el video explicativo de la dinámica de Vuelos a los IMOs de los participantes confirmados de C2.', isCritical: false },
  { id: 'c2v2_mi_4', role: 'coord_c1', cyclePhase: 'C2', task: 'Miércoles 20:00 (hora exacta): Grounding virtual de Aliados C2 vía Teams (60 min) — alinear estándares cuánticos, explicar la dinámica de incertidumbre, asignar las parejas del Sistema Buddy (Socio de Riesgo) y fijar el reto del Futuro Imposible individual. El aliado que no asista queda suspendido de participar en C2.', isCritical: true },

  // --- C2 · Jueves (Día 1 — Grounding Escalonado y Breakthrough) ---
  { id: 'c2v2_ju_1', role: 'coord_c1', cyclePhase: 'C2', task: 'Jueves 11:30: Grounding aliados con CC1Y2 — alineación estrictamente logística, asignación de los 4 apoyos de mesa de enrolamiento y firma del compromiso de metas de cobros.', isCritical: true },
  { id: 'c2v2_ju_2', role: 'coord_c1', cyclePhase: 'C2', task: 'Jueves 13:00-14:00: mesa de registro de apertura — filtro de entrada: todo participante debe portar físicamente su Ticket Rojo de pago y su Cuaderno A4 de cuadros con bolígrafo. Mesa operativa: cobrar saldos pendientes al precio complementario promocional (Ecuador: cierre de matrícula en mesa USD 510).', isCritical: true },
  { id: 'c2v2_ju_3', role: 'coord_c1', cyclePhase: 'C2', task: 'Jueves 15:00: hora máxima de ingreso — cierre de puertas, se inicia la sesión del avanzado.', isCritical: true },
  { id: 'c2v2_ju_4', role: 'coord_c1', cyclePhase: 'C2', task: 'Jueves 15:20: reporte de ingreso — enviar estatus de sentados al Gerente de Sede.', isCritical: true },
  { id: 'c2v2_ju_5', role: 'coord_c1', cyclePhase: 'C2', task: 'Jueves 17:00: reporte de asistencia a contabilidad — enviar escaneo digital del listado de firmas físicas ingresadas en la App Nodus.', isCritical: true },
  { id: 'c2v2_ju_6', role: 'coord_c1', cyclePhase: 'C2', task: 'Jueves 18:40-21:30: Breakthrough (Declaración de Compromiso) — el CC1Y2 ingresa presencialmente al salón en el momento del ejercicio; su responsabilidad es contar personalmente a los participantes NO declarantes (los que se ponen de pie) y restarlos del total del salón para registrar de forma exacta a los declarantes en Nodus.', isCritical: true },
  { id: 'c2v2_ju_7', role: 'coord_c1', cyclePhase: 'C2', task: 'Jueves 21:30: envío de reporte de Breakthrough — cargar el listado de declarantes oficiales y novedades de tareas nocturnas en Nodus.', isCritical: true },

  // --- C2 · Viernes (Día 2 — Tickets Verdes, Palabra Rota y El Barco) ---
  { id: 'c2v2_vi_1', role: 'coord_c1', cyclePhase: 'C2', task: 'Viernes 07:45: Grounding de apoyos y aliados — revisión del censo de Palabra Rota de la mañana.', isCritical: true },
  { id: 'c2v2_vi_2', role: 'coord_c1', cyclePhase: 'C2', task: 'Viernes 08:00: apertura de mesa — verificar que solo los participantes que declararon y tienen su pago al día reciban el Ticket Verde de ingreso.', isCritical: true },
  { id: 'c2v2_vi_3', role: 'coord_c1', cyclePhase: 'C2', task: 'Viernes 14:00: cierre definitivo de mesa de enrolamiento — última oportunidad para liquidar saldos de C2.', isCritical: true },
  { id: 'c2v2_vi_4', role: 'coord_c1', cyclePhase: 'C2', task: 'Viernes 14:01: disparador automático de "Palabra Rota" — el CC1Y2 ejecuta el cruce en Nodus. Todo participante declarante de Breakthrough del jueves que no registre el Ticket Verde a las 14:00 cambia su estado a Palabra Rota, bloqueándole de inmediato el acceso físico al salón a las 15:00 para la tarde de confrontación de secretos.', isCritical: true },
  { id: 'c2v2_vi_5', role: 'coord_c1', cyclePhase: 'C2', task: 'Viernes 17:30: Grounding de El Barco — alineación del staff de aliados, apoyos y el entrenador para la dinámica de visualización de naufragio.', isCritical: false },
  { id: 'c2v2_vi_6', role: 'coord_c1', cyclePhase: 'C2', task: 'Viernes 18:00: El Barco — el CC1Y2 extrae del baúl los pétalos y velas eléctricas para el ejercicio; mantener el contexto silencioso de contención.', isCritical: true },

  // --- C2 · Sábado (Día 3 — Vestimenta Irrazonable, Saltos Cuánticos y Vuelos) ---
  { id: 'c2v2_sa_1', role: 'coord_c1', cyclePhase: 'C2', task: 'Sábado 07:45: Grounding de aliados — verificar que el staff porte la vestimenta irrazonable oficial (rompe lo razonable pero mantiene el respeto y contexto del salón).', isCritical: true },
  { id: 'c2v2_sa_2', role: 'coord_c1', cyclePhase: 'C2', task: 'Sábado 08:30: apertura de mesa de enrolamiento (4 apoyos) — foco absoluto en la captación y movimiento de pagos hacia Maestría del Juego (MJ).', isCritical: true },
  { id: 'c2v2_sa_3', role: 'coord_c1', cyclePhase: 'C2', task: 'Sábado 13:30: alimentar Cuadro de Conversión C2 (Nodus Core) — digitar de forma obligatoria el estatus en tiempo real de pagos a MJ y la asignación técnica de parejas para la dinámica nocturna de Saltos Cuánticos.', isCritical: true },
  { id: 'c2v2_sa_4', role: 'coord_c1', cyclePhase: 'C2', task: 'Sábado 18:00: Vuelos y Saltos Cuánticos — seguridad: inspeccionar área libre de obstáculos (radio mínimo de 2 metros por participante) y piso antideslizante limpio. Contar y verificar físicamente las pulseras de seguridad numeradas del equipo anfitrión antes del inicio. Mapeo: asegurar que los budines en un mismo estiramiento vuelen frente a frente para el abrazo final.', isCritical: true },

  // --- C2 · Domingo (Día 4 — Desayunos y Transición a MJ) ---
  { id: 'c2v2_do_1', role: 'coord_c1', cyclePhase: 'C2', task: 'Domingo 15:00: presentación del Coordinador de Maestría — el CC1Y2 apoya en el salón durante el hito de transición al ciclo de 90 días.', isCritical: true },
  { id: 'c2v2_do_2', role: 'coord_c1', cyclePhase: 'C2', task: 'Domingo 15:30: Declaración de Mánagers — el Capitán y el Coordinador de MJ toman la declaración del nuevo staff de Maestría.', isCritical: true },
  { id: 'c2v2_do_3', role: 'coord_c1', cyclePhase: 'C2', task: 'Domingo 17:00: cierre de caja y lista de MJ — cierre contable de terminales POS; entregar formalmente en Nodus la base de datos de los nuevos inscritos a MJ y la lista de mánagers declarados al Coordinador de Maestría de la Sede.', isCritical: true },

  // --- CMJ · Rutina semanal entre fines de semana (Lunes a Jueves) ---
  { id: 'cmjv2_sem_1', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Lunes: cierre de caja del fin de semana anterior en Nodus (conciliación de fichas físicas vs. depósitos) y envío del reporte consolidado de asistencia de MJ a Contabilidad a primera hora.', isCritical: true },
  { id: 'cmjv2_sem_2', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Martes: llamadas de alineación de 5 minutos con los mánagers para revisar el avance de los Futuros Imposibles (FI) de sus participantes; actualizar en Nodus el estado de los compromisos de enrolamiento declarados.', isCritical: false },
  { id: 'cmjv2_sem_3', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Miércoles 19:00 (deadline crítico): cargar en Nodus la revisión de los FI de todos los mánagers. Si se omite, el sistema asume que no hubo alineación y dispara una Alerta de Riesgo de Deserción al Gerente de Sede.', isCritical: true },
  { id: 'cmjv2_sem_4', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Miércoles: dirigir el grounding virtual de 60 minutos con mánagers y el Capitán para revisar la fisionomía energética del equipo y el estatus de sus invitados a C1.', isCritical: true },
  { id: 'cmjv2_sem_5', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Jueves 12:00 (deadline absoluto): coordinar con el Entrenador de MJ asignado el horario y enfoque del grounding de staff.', isCritical: true },

  // --- CMJ · FDS 1: Creación ---
  { id: 'cmjv2_f1_1', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS1 Viernes 14:00: llegada y montaje — inspeccionar el salón y desempacar el Baúl de Creación (papelería oficial, reglas, hojas de rotafolio y bolígrafos).', isCritical: true },
  { id: 'cmjv2_f1_2', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS1 Viernes 16:30: registro de mánagers — confirmar la asistencia del equipo garantizando el ratio obligatorio de 1 mánager por cada 6 participantes.', isCritical: true },
  { id: 'cmjv2_f1_3', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS1 Viernes 17:00: registro de participantes — recepción de firmas físicas, bienvenida, entrega digital del folleto de los 28 Entrenamientos Sustentables y firma física del compromiso de las reglas de juego de la Maestría.', isCritical: true },
  { id: 'cmjv2_f1_4', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS1 Viernes 19:00: cierre absoluto y reportes — enviar el reporte de asistencia definitiva de sentados a la subdirección.', isCritical: true },
  { id: 'cmjv2_f1_5', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS1 Domingo 15:00: hito de Futuros Imposibles — asistir al Entrenador en sala durante la redacción física y firma de los FI de cada participante.', isCritical: true },
  { id: 'cmjv2_f1_6', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS1 Domingo 21:00: cierre de caja y entrega de tickets — cuadre contable final (POS y efectivo), sincronizar en Nodus la base de datos de inscritos y los FI declarados, entregar los tickets de seguimiento en sobres cerrados, y celebrar el "Juego Ganado" (exclusivamente con pizza, globos y luces — mariachis prohibidos).', isCritical: true },

  // --- CMJ · FDS 2: Relación ---
  { id: 'cmjv2_f2_1', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS2 Sábado 22:00: evaluación intermedia — reunión con el Capitán y el Entrenador para evaluar las dinámicas grupales y el avance del equipo.', isCritical: true },
  { id: 'cmjv2_f2_2', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS2 Domingo: entrega de tickets de seguimiento sueltos (sin sobre) — a diferencia del FDS1, aquí no van en sobre cerrado.', isCritical: false },

  // --- CMJ · FDS 3: Gratitud y Graduación ---
  { id: 'cmjv2_f3_1', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS3 Sábado 15:00: reporte de declaración de logros — registrar en Nodus el porcentaje final de cumplimiento de los FI de cada participante.', isCritical: true },
  { id: 'cmjv2_f3_2', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS3 Sábado 17:00: mesa operativa — registro de interesados en re-entrenarse como aliados en el próximo ciclo.', isCritical: true },
  { id: 'cmjv2_f3_3', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS3 Sábado 22:00: preparación de ceremonia — revisión e impresión impecable de diplomas (cero errores ortográficos) y organización del staff de apoyo.', isCritical: true },
  { id: 'cmjv2_f3_4', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS3 Domingo 21:00: cierre del ciclo de 90 días — cierre contable final de terminales POS y cajas, envío del listado definitivo de graduados que pasan al nivel de Aliados, y entrega de medallas oficiales y diplomas firmados.', isCritical: true },
  { id: 'cmjv2_f3_5', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Regla de FDS3 — Riesgo de Deserción por FI: solo los participantes y mánagers con avance verificado de sus FI ≥80% o al 100% de cumplimiento de evidencias físicas tienen derecho a compartir su testimonio en el arco final; no permitir "historias de justificación" en el salón.', isCritical: true },

  // --- CMJ · FDS 4: El Viaje (facilitado exclusivamente por Paul Sosa) ---
  // Detalle hora a hora integrado desde "Manual Maestro de Operaciones de Sede
  // (V1.0)" (28/08/2026), Sección 5 — reemplaza los dos ítems genéricos previos
  // (cmjv2_f4_1/2) por el desglose real; se conserva el prefijo cmjv2_f4_ y se
  // agrega el inventario de baúl ya confirmado en el ítem original.
  { id: 'cmjv2_f4_1', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS4 Viernes 18:15: Auditoría Logística — el Entrenador Paul Sosa verifica físicamente el baúl de El Viaje (24 velas eléctricas, teteras, resistencias, 5 tinas, 5 jarras, cremas humectantes, además de antorcha, estandarte y medallas de graduación ya confirmados).', isCritical: true },
  { id: 'cmjv2_f4_2', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS4 Viernes 18:30: Grounding con la Comunidad de Graduados — el CMJ alinea a los apoyos graduados que asisten para servir como "ángeles de vuelo" y "susurros".', isCritical: true },
  { id: 'cmjv2_f4_3', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS4 Viernes 19:40: Cierre y Desconexión — el Capitán y mánagers retiran de forma obligatoria los celulares de los participantes (guardados en el baúl con llave) antes de que ingresen con los ojos vendados al salón.', isCritical: true },
  { id: 'cmjv2_f4_4', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS4 Viernes 20:00: Proceso de Limpieza y Declaración de Legado (100% o 0%).', isCritical: true },
  { id: 'cmjv2_f4_5', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS4 Sábado 07:00: Salida de Sede — el CMJ verifica la logística en la sede y envía a los participantes a la hostería asignada.', isCritical: true },
  { id: 'cmjv2_f4_6', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS4 Sábado 07:30: Desayuno de Mánagers con el Entrenador — se alinea a los mánagers en la hostería junto al Coach antes del inicio de las dinámicas.', isCritical: false },
  { id: 'cmjv2_f4_7', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS4 Sábado 08:15: Grounding en Salón — disposición de velas, luces bajas y control de sonido.', isCritical: true },
  { id: 'cmjv2_f4_8', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS4 Sábado 09:20: Inicio en Salón y Vuelos de Maestría.', isCritical: true },
  { id: 'cmjv2_f4_9', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS4 Sábado 14:00: Almuerzo y Reconocimiento de Líderes — se otorgan los reconocimientos de Estandarte, SAI y el premio Antorcha al mánager con el mayor porcentaje de enrolamiento físico comprobable.', isCritical: true },
  { id: 'cmjv2_f4_10', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS4 Domingo 09:00: Conexión con el Futuro — los participantes redactan sus visiones a 10, 5 y 1 año, las guardan en sobres de manila y reciben su Ticket Dorado.', isCritical: false },
  { id: 'cmjv2_f4_11', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS4 Domingo 12:30: Almuerzo de Cierre y redacción de notitas.', isCritical: false },
  { id: 'cmjv2_f4_12', role: 'coord_maestria', cyclePhase: 'MJ', task: 'FDS4 Domingo 18:00: Pase de Antorcha — el CMJ coordina el ingreso físico de la Maestría a la sala de Capítulo Uno para realizar el pase de antorcha oficial, unificando la energía de ambos salones.', isCritical: true },

  // ============================================================================
  // CMJ · TAREAS DURANTE EL CICLO DE CAPÍTULO 1 Y CAPÍTULO 2 (01/09/2026)
  // Fuente: capturas de un tablero de tareas real de una Coordinadora de
  // Maestría (columnas "Antes de Capítulo Uno", "Capítulo Uno" y "Antes de
  // Cap Dos"), provistas por José. Hasta ahora coord_maestria solo tenía
  // tareas en las fases C2/PRE-MJ/MJ/POST-MJ — esto agrega su trabajo durante
  // las fases PRE-C1/C1/POST-C1, en paralelo a las tareas de coord_c1 que ya
  // existen ahí (son responsables distintos operando en las mismas semanas,
  // no se reemplaza nada existente).
  // Generalizado a patrón: el tablero fuente traía varias instancias por
  // equipo (ej. "CARPETA 125", "ALIADOS 127") repetidas para cada equipo que
  // la coordinadora atiende — aquí se integra una sola vez por tarea
  // genérica (sin número de equipo fijo), evitando duplicar la misma tarea
  // una vez por cada equipo. cyclePhase 'PRE-C1' = columna "Antes de
  // Capítulo Uno"; 'C1' = columna "Capítulo Uno"; 'POST-C1' = columna
  // "Antes de Cap Dos" (ocurre después de C1, preparando C2).
  // ============================================================================

  // --- CMJ · Antes de Capítulo Uno ---
  { id: 'cmj_prec1_1', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Actualizar el Drive de desertores.', isCritical: false },
  { id: 'cmj_prec1_2', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Coordinar la reunión de MJ con el equipo.', isCritical: true },
  { id: 'cmj_prec1_3', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Coordinar la reunión de graduación del equipo.', isCritical: true },
  { id: 'cmj_prec1_4', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Dar la bienvenida a los entrenadores del cuarto FDS (El Viaje) y de Caída de Confianza.', isCritical: true },
  { id: 'cmj_prec1_5', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Solicitar el entrenador para el cuarto FDS (El Viaje) y Caída de Confianza.', isCritical: true },
  { id: 'cmj_prec1_6', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Revisar y actualizar la carpeta del equipo.', isCritical: false },
  { id: 'cmj_prec1_7', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Enviar indicaciones sobre distintivos.', isCritical: false },
  { id: 'cmj_prec1_8', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Enviar indicaciones de Futuros Imposibles (FI).', isCritical: true },
  { id: 'cmj_prec1_9', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Coordinar y asistir al Grounding de Capítulo 1 con los equipos.', isCritical: true },
  { id: 'cmj_prec1_10', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Solicitar las cartas del equipo y enviar el mensaje al IMO.', isCritical: false },
  { id: 'cmj_prec1_11', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Dar seguimiento a los aliados del equipo.', isCritical: true },
  { id: 'cmj_prec1_12', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Dar seguimiento a los entrenadores.', isCritical: false },
  { id: 'cmj_prec1_13', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Actualizar el calendario de mánagers del equipo.', isCritical: false },
  { id: 'cmj_prec1_14', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Definir y actualizar las fechas de llamadas con mánagers.', isCritical: false },
  { id: 'cmj_prec1_15', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Mantener actualizado el sistema de llamadas.', isCritical: false },
  { id: 'cmj_prec1_16', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Actualizar las tablas de enrolamiento y dar seguimiento a las llamadas pendientes.', isCritical: true },
  { id: 'cmj_prec1_17', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Dar seguimiento a los rezagados del equipo.', isCritical: true },
  { id: 'cmj_prec1_18', role: 'coord_maestria', cyclePhase: 'PRE-C1', task: 'Coordinar reunión con el Capitán del equipo.', isCritical: false },

  // --- CMJ · Capítulo Uno ---
  { id: 'cmj_c1_1', role: 'coord_maestria', cyclePhase: 'C1', task: 'Preparar el calendario de flyers.', isCritical: false },
  { id: 'cmj_c1_2', role: 'coord_maestria', cyclePhase: 'C1', task: 'Preparar los baúles de Caída de Confianza, Noche de Confianza y Graduación.', isCritical: true },
  { id: 'cmj_c1_3', role: 'coord_maestria', cyclePhase: 'C1', task: 'Preparar las cartas.', isCritical: false },
  { id: 'cmj_c1_4', role: 'coord_maestria', cyclePhase: 'C1', task: 'Preparar los flyers de Noche de Confianza, Caída de Confianza y Graduación.', isCritical: false },
  { id: 'cmj_c1_5', role: 'coord_maestria', cyclePhase: 'C1', task: 'Revisar las carpetas de los equipos.', isCritical: false },
  { id: 'cmj_c1_6', role: 'coord_maestria', cyclePhase: 'C1', task: 'Dar seguimiento a los entrenadores de llamadas.', isCritical: false },
  { id: 'cmj_c1_7', role: 'coord_maestria', cyclePhase: 'C1', task: 'Asignar anfitriones para la mesa de registro.', isCritical: true },
  { id: 'cmj_c1_8', role: 'coord_maestria', cyclePhase: 'C1', task: 'Dar seguimiento y hacer llamadas a los aliados de Capítulo Uno.', isCritical: false },
  { id: 'cmj_c1_9', role: 'coord_maestria', cyclePhase: 'C1', task: 'Enviar mensajes a los IMOs.', isCritical: false },

  // --- CMJ · Antes de Capítulo Dos ---
  { id: 'cmj_postc1_1', role: 'coord_maestria', cyclePhase: 'POST-C1', task: 'Solicitar los entrenadores de Tanque y Rompimiento de Barreras.', isCritical: true },
  { id: 'cmj_postc1_2', role: 'coord_maestria', cyclePhase: 'POST-C1', task: 'Actualizar la tabla de enrolamiento de los equipos.', isCritical: true },
  { id: 'cmj_postc1_3', role: 'coord_maestria', cyclePhase: 'POST-C1', task: 'Dar seguimiento a los aliados de cara a Capítulo Dos.', isCritical: true },
  { id: 'cmj_postc1_4', role: 'coord_maestria', cyclePhase: 'POST-C1', task: 'Coordinar a los Líderes en Acción como apoyos de mesa.', isCritical: false },
  { id: 'cmj_postc1_5', role: 'coord_maestria', cyclePhase: 'POST-C1', task: 'Dar seguimiento a los rezagados del equipo.', isCritical: true },
  { id: 'cmj_postc1_6', role: 'coord_maestria', cyclePhase: 'POST-C1', task: 'Coordinar reunión con los mánagers del equipo.', isCritical: false },
  { id: 'cmj_postc1_7', role: 'coord_maestria', cyclePhase: 'POST-C1', task: 'Dar la bienvenida a los entrenadores de Tanque y Rompimiento de Barreras.', isCritical: true },
  { id: 'cmj_postc1_8', role: 'coord_maestria', cyclePhase: 'POST-C1', task: 'Jueves: coordinar y asistir al Grounding con los aliados del equipo, de cara a Capítulo Dos.', isCritical: true },
  { id: 'cmj_postc1_9', role: 'coord_maestria', cyclePhase: 'POST-C1', task: 'Gestionar los diplomas.', isCritical: false },
  { id: 'cmj_postc1_10', role: 'coord_maestria', cyclePhase: 'POST-C1', task: 'Llamar a los equipos pendientes.', isCritical: false },
  { id: 'cmj_postc1_11', role: 'coord_maestria', cyclePhase: 'POST-C1', task: 'Gestionar los gafetes.', isCritical: false },
  { id: 'cmj_postc1_12', role: 'coord_maestria', cyclePhase: 'POST-C1', task: 'Confirmar salones y audio.', isCritical: true },
  { id: 'cmj_postc1_13', role: 'coord_maestria', cyclePhase: 'POST-C1', task: 'Mantener actualizados los Drives del equipo.', isCritical: false }
];

export const getTasksByRole = (roleId) => checklistData.filter(t => t.role === roleId);
