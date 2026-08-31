  { id: 'soar_5', role: 'gerente', cyclePhase: 'GATE 1', task: 'Hotel y Transporte del entrenador reservado y confirmado.', isCritical: true },
  { id: 'soar_6', role: 'gerente', cyclePhase: 'GATE 1', task: 'Vuelo comprado/confirmado y responsable de recepción asignado.', isCritical: true },

  // --- PRE-C1 (POST-MJ DEL CICLO ANTERIOR) ---
  { id: 'soar_7', role: 'gerente', cyclePhase: 'PRE-C1', task: 'Revisar resultados finales de MJ (asistencia, graduados, finanzas).', isCritical: false },
  { id: 'soar_8', role: 'gerente', cyclePhase: 'PRE-C1', task: 'Identificar rezagados y determinar metas del nuevo ciclo C1.', isCritical: true },
  { id: 'soar_9', role: 'gerente', cyclePhase: 'PRE-C1', task: 'Coordinador responsable y equipos de apoyo confirmados.', isCritical: true },
  
  // TAREAS NUEVAS: PRE-C1 CC1Y2
  { id: 'cc1y2_pre1', role: 'coord_c1', cyclePhase: 'PRE-C1', task: 'Martes 09:00 - 10:00: Reunión de Coordinación de Sede, validar salón y solicitar baúles.', isCritical: true },
  { id: 'cc1y2_pre2', role: 'coord_c1', cyclePhase: 'PRE-C1', task: 'Miércoles 13:00: Ejecutar Freeze de listas de asistencia. Armar baúles con materiales.', isCritical: true },
  { id: 'cc1y2_pre3', role: 'coord_c1', cyclePhase: 'PRE-C1', task: 'Jueves 19:00: Grounding presencial con Quantum Team (QT) y Aliados. Imprimir gafetes.', isCritical: true },
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
  { id: 'cc1y2_c1_7', role: 'coord_c1', cyclePhase: 'C1', task: 'Domingo 09:00: Capturar e indexar pagos de C2 y combos en mesa externa.', isCritical: true },
  { id: 'cc1y2_c1_8', role: 'coord_c1', cyclePhase: 'C1', task: 'Domingo 19:00 - 21:00: Cierre comercial exhaustivo y conciliación con equipo contable.', isCritical: true },

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
  { id: 'cc1y2_c2_1', role: 'coord_c1', cyclePhase: 'C2', task: 'Martes a Miércoles: Segunda llamada a inscritos C2 y ensamblaje de baúles avanzados.', isCritical: true },