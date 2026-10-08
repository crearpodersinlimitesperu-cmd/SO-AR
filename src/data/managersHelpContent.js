const help = (label, text, good, avoid) => ({
  label, text, ...(good && { good }), ...(avoid && { avoid })
});

export const managersFieldHelp = {
  nombre: help('Nombre completo', 'Escribe tus nombres y apellidos exactamente como aparecen en tu documento oficial de identidad, con tildes.', 'María José Pérez López', 'Majo, iniciales o apodos'),
  telefono: help('Teléfono WhatsApp', 'Incluye + y el código de país. Confirma con la persona que el número recibe WhatsApp.', '+51 987 654 321 (ejemplo ficticio)', 'Un número local sin código de país'),
  rol: help('Rol en el equipo', 'Elige la función real de la persona: Capitán o Manager. Este campo no otorga permisos de acceso a Causa OS.', 'Capitán para quien lidera el equipo', 'Cambiar el rol para obtener acceso'),
  sede: help('Sede', 'Selecciona la sede a la que pertenece el equipo, no tu ciudad de residencia.', 'Lima si el equipo pertenece a Lima', 'Elegir una sede solo porque aparece primero'),
  equipo: help('Nombre de equipo', 'Copia el nombre oficial y comprueba también su número y sede antes de guardar.', '#122 · KAIZEN MAINICHI, Lima', 'Suponer que #122 y #124 KAIZEN MAINICHI son el mismo equipo'),
  numEquipo: help('Número de equipo', 'Escribe el número oficial del equipo. Distingue equipos con el mismo nombre; verifica la sede.', '122 para el equipo #122', '124 si la persona pertenece al #122'),
  entrenador: help('Entrenadores asignados', 'Selecciona solo los entrenadores confirmados para este equipo. Puedes elegir varios si corresponde; la asignación requiere el permiso existente.', 'Los nombres acordados con coordinación', 'Asignar por parecido de nombres'),
  estado: help('Estado del integrante', 'Confirma la situación antes de cambiarla. En una celda del directorio el cambio se guarda al seleccionar; en un formulario se guarda con Guardar.', 'Graduado cuando su cierre está confirmado', 'Usar Desertor para indicar una sola ausencia'),
  fechaIndividual: help('Fecha de llamada individual', 'Elige la fecha real de la llamada. Esta celda se guarda al cambiarla; si no había asistencia registrada, el sistema usa SÍ.', 'La fecha del encuentro confirmado', 'Cambiar la fecha como recordatorio de una llamada futura'),
  fechaGrupal: help('Fecha de llamada grupal', 'Selecciona la fecha real del encuentro que estás registrando o corrigiendo.', 'La fecha en que se realizó la llamada', 'La fecha prevista si aún no ocurrió'),
  asistencia: help('Asistencia individual', 'Marca la casilla solo si esta persona conectó. Revisa integrante por integrante antes de guardar.', 'Marcado para quien sí asistió', 'Marcar todo sin comprobar asistencia'),
  asistieron: help('Cantidad de asistentes', 'Introduce cuántos integrantes realmente asistieron a esa llamada, sin superar el total del equipo.', '4 si conectaron cuatro integrantes', 'Contar invitados como integrantes del equipo'),
  nota: help('Nota de seguimiento', 'Describe un hecho observable y el siguiente acuerdo, con responsable y fecha. Incluye solo información necesaria para el seguimiento.', 'Falta evidencia de la tarea. Ana la enviará el viernes.', 'Juicios como «es irresponsable» o datos privados innecesarios'),
  respuesta: help('Respuesta de CMJ', 'Responde al hecho con una acción concreta, responsable y fecha. La respuesta quedará en el historial de la nota.', 'Coordinaré con Ana hoy y confirmaré el acuerdo el viernes.', '«Visto» sin un siguiente paso'),
  quiebre: help('Marcar como quiebre', 'Actívalo cuando exista un compromiso, meta o estándar incumplido. Describe el hecho sin etiquetar a la persona.', 'Compromiso vencido sin evidencia', 'Marcar una preocupación sin un compromiso incumplido'),
  categoria: help('Categoría del quiebre', 'Elige el ámbito del hecho: operativo, equipo o participante.', 'Operativo para una tarea pendiente', 'Elegir por la gravedad en lugar del ámbito'),
  estadoQuiebre: help('Estado del quiebre', 'Selecciona la situación actual: riesgo alto, vencido, bloqueado o requiere escalamiento.', 'Bloqueado si necesita resolver una dependencia', 'Vencido si todavía no llegó la fecha acordada'),
  origen: help('Equipo origen', 'Elige el equipo cuyos integrantes se transferirán. Comprueba número, nombre y sede en la vista previa.', 'El equipo que se integrará al destino', 'Confundir origen con destino'),
  destino: help('Equipo destino', 'Elige el equipo que recibirá los integrantes y conservará la identidad de destino.', 'El equipo que seguirá operando', 'Unir equipos solo porque tienen el mismo nombre'),
  reasignar: help('Reasignar entrenador', 'Actívalo solo si también se acordó usar los entrenadores del destino para los integrantes transferidos.', 'La reasignación confirmada por coordinación', 'Cambiar entrenadores sin acuerdo'),
  confirmarFusion: help('Confirmar advertencia de fusión', 'Lee la advertencia y revisa la vista previa antes de aceptar. La fusión modifica integrantes y avances.', 'Origen y destino verificados por número y sede', 'Aceptar sin revisar ambos equipos'),
  buscar: help('Buscar', 'Escribe una parte del nombre, equipo, entrenador o sede según el buscador de esta pestaña. Buscar no modifica registros.', 'KAIZEN para localizar equipos y luego verificar su número', 'Crear otro registro antes de buscar el existente'),
  filtroSede: help('Filtrar por sede', 'Reduce la lista a la sede seleccionada, dentro del alcance que permite tu perfil. No cambia la sede de ningún registro.'),
  filtroEntrenador: help('Filtrar por entrenador', 'Muestra los registros del entrenador seleccionado. No cambia sus asignaciones.'),
  filtroEquipo: help('Filtrar por equipo', 'Elige el equipo por número, nombre y sede. Este filtro no mueve integrantes.'),
  filtroPagos: help('Filtrar pagos', 'Elige el estado de pago que necesitas revisar. El filtro no registra ni revierte pagos.'),
  filtroEstado: help('Filtrar estado de managers', 'Reduce la lista por graduación, deserción, en juego o falta de entrenador. No cambia estados ni asignaciones.'),
  filtroRendimiento: help('Filtrar rendimiento', 'Selecciona el indicador que necesitas revisar: graduación, deserción o pagos pendientes. El filtro no modifica registros.')
};

export const managersActionHelp = {
  inicio: help('Volver a Inicio', 'Regresa al inicio de Causa OS. Guarda primero los cambios pendientes del formulario.'),
  vistaRol: help('Cambiar vista', 'Alterna entre tu vista de entrenador y corporativa si tienes doble rol. No cambia tu identidad ni tus permisos.'),
  cerrar: help('Cerrar', 'Cierra este panel. Si hay un formulario abierto, guarda primero los cambios que quieras conservar.'),
  cancelar: help('Cancelar', 'Cierra la edición sin guardar sus cambios pendientes. No revierte cambios ya guardados en otras celdas.'),
  pestaña: help('Cambiar sección', 'Abre la sección elegida. Cada pestaña se muestra según los permisos existentes de tu perfil.'),
  limpiarBusqueda: help('Limpiar búsqueda', 'Borra el texto de búsqueda para volver a ver la lista que permiten tus filtros.'),
  filtroEstado: help('Filtrar por estado', 'Muestra integrantes del estado seleccionado sin cambiar su situación.'),
  filtroCiclo: help('Filtrar ciclo del equipo', 'Muestra equipos según su situación en el ciclo. No gradúa ni cierra equipos.'),
  filtroLlamadas: help('Filtrar avance de llamadas', 'Reduce la lista según el avance de llamadas. No registra asistencia.'),
  ordenar: help('Ordenar la lista', 'Ordena por esta columna; vuelve a activarla para alternar el sentido. El orden visual no modifica registros.'),
  tabla: help('Vista en tabla', 'Revisa y compara integrantes en filas. Usa los encabezados para ordenar la lista.'),
  tarjetas: help('Vista por equipos', 'Agrupa visualmente integrantes por equipo para revisar su roster y asignaciones.'),
  restaurar: help('Restaurar filtros', 'Limpia los filtros de esta vista. En el directorio también restaura el orden natural por número de equipo.'),
  fusion: help('Unir equipos', 'Abre la fusión operativa. Úsala solo ante una unión confirmada; compartir nombre no convierte #122 y #124 en un mismo equipo.'),
  ejecutarFusion: help('Confirmar fusión', 'Ejecuta la transferencia indicada en la vista previa. Verifica número, sede, destino y reasignación antes de confirmar.'),
  nuevo: help('Nuevo registro', 'Abre el alta de una persona o un equipo completo. Busca primero para evitar duplicados.'),
  tarjetaEntrenador: help('Ver tarjeta del entrenador', 'Consulta su resumen, equipos y llamadas. Los controles editables dependen de tus permisos existentes.'),
  tarjetaIntegrante: help('Ver tarjeta del integrante', 'Abre su ficha con contacto, asistencia y resumen de llamadas. Úsala antes de iniciar seguimiento.'),
  notas: help('Ver notas de seguimiento', 'Abre el historial permitido para este integrante y su equipo. Escribir o responder depende de tu perfil.'),
  editarIntegrante: help('Editar integrante', 'Abre sus datos para corregir identidad, contacto y equipo. Verifica la identidad oficial antes de guardar.'),
  editarEquipo: help('Editar equipo', 'Abre la sede, identidad, entrenadores y roster del equipo. Confirma número y nombre para no mezclar homónimos.'),
  eliminar: help('Eliminar registro', 'Abre la confirmación de eliminación de la persona o del equipo completo. Revisa el alcance; no lo uses para indicar una ausencia.'),
  confirmarEliminar: help('Confirmar eliminación', 'Elimina el registro indicado; si es un equipo, elimina sus integrantes. Confirma solo después de revisar la advertencia.'),
  anterior: help('Página anterior', 'Muestra la página anterior de resultados sin cambiar datos.'),
  siguiente: help('Página siguiente', 'Muestra la siguiente página de resultados sin cambiar datos.'),
  agregarIntegrante: help('Agregar integrante', 'Añade una fila al formulario o abre el alta en este equipo. Completa su identidad oficial y teléfono antes de guardar.'),
  quitarFila: help('Quitar integrante del formulario', 'Retira esta fila del roster que estás preparando. En una edición, revisa la lista final antes de guardar el equipo.'),
  asistioSi: help('Registrar SÍ asistió', 'Guarda SÍ en la llamada individual de esta persona. Si no hay fecha, usa la de hoy; verifica la fecha primero.'),
  asistioNo: help('Registrar NO asistió', 'Guarda NO en la llamada individual de esta persona. Si no hay fecha, usa la de hoy. No cambia su estado a Desertor.'),
  alternarAsistencia: help('Cambiar asistencia individual', 'Alterna SÍ y NO y guarda al instante. Conserva la fecha existente o usa hoy si no había una.'),
  llamadaGrupal: help('Registrar llamada grupal', 'Abre la fecha y asistencia del equipo. Al guardar, registra una llamada grupal; no la repitas para corregir un encuentro existente.'),
  todosSi: help('Marcar todos presentes', 'Marca las casillas del formulario como presentes. Úsalo solo si todos conectaron; revisa excepciones antes de guardar.'),
  todosNo: help('Marcar todos ausentes', 'Desmarca todas las casillas del formulario. Después marca únicamente a quienes sí conectaron.'),
  guardarAsistencia: help('Guardar asistencia grupal', 'Registra la llamada con su fecha, asistencia y nota opcional. Comprueba que este encuentro no esté ya registrado.'),
  guardarNota: help('Guardar nota', 'Añade la nota al historial. Revisa que incluya un hecho, un acuerdo y solo la información necesaria.'),
  responder: help('Enviar respuesta de CMJ', 'Añade tu respuesta a esta nota. Confirma la acción, quién la realizará y cuándo.'),
  seleccionarEntrenador: help('Seleccionar entrenador', 'Agrega o quita este entrenador confirmado para el equipo. Puedes elegir varios si corresponde; la asignación se aplica al guardar, según tus permisos.'),
  modoIndividual: help('Alta individual', 'Registra un Manager o Capitán. Si ya pertenece a un equipo, copia su número, nombre y sede exactos.'),
  modoEquipo: help('Alta de equipo completo', 'Prepara la identidad del equipo, su capitán y managers en un solo formulario. Busca el equipo antes de crear otro.'),
  guardarIntegrante: help('Guardar integrante', 'Crea la persona con los datos del formulario. Verifica identidad oficial, teléfono y equipo antes de guardar.'),
  guardarEquipo: help('Guardar equipo', 'Guarda el equipo y su roster. Revisa número, sede, nombres completos y entrenadores confirmados.'),
  guardarCambios: help('Guardar cambios', 'Guarda las correcciones del formulario abierto. Revisa los datos y las asignaciones antes de confirmar.'),
  directorio: help('Ver directorio filtrado', 'Abre el directorio filtrado por esta sede o entrenador para revisar a sus integrantes.'),
  equipos: help('Ver equipos del entrenador', 'Abre Grupales con el filtro de este entrenador para revisar sus equipos.'),
  supervisor: help('Supervisor de datos', 'Ejecuta una revisión que también puede purgar duplicados y registros espurios: NO es solo una consulta. Úsalo únicamente para una depuración autorizada.'),
  planilla: help('Ver planilla oficial', 'Consulta el resumen de la planilla Sheets. Esta pestaña no ejecuta transferencias bancarias.'),
  nodus: help('Ver liquidación Nodus', 'Consulta los equipos pendientes y pagados del registro operativo. Revisa la fuente antes de conciliar.'),
  consolidado: help('Ver consolidado', 'Compara los totales de ambas fuentes. No asumas que un registro de una fuente es otro pago adicional.'),
  verLiquidacion: help('Consultar liquidación', 'Abre Liquidación por Equipos para revisar su situación, sin registrar un pago.'),
  cerrarEquipo: help('Cerrar equipo para liquidación', 'Marca el cierre de graduación o deserción para incluirlo en liquidación aunque no alcance siete llamadas. Confirma el cierre real antes de usarlo.'),
  reabrirEquipo: help('Reabrir equipo', 'Quita el cierre manual y restaura los estados previos para continuar su curso. Úsalo si el cierre fue incorrecto.'),
  marcarPagado: help('Marcar como pagado', 'Registra el pago como realizado. Verifica antes el comprobante, monto, entrenador y equipo; este botón NO transfiere dinero.'),
  ocultarPago: help('Retirar de pendientes', 'Oculta este equipo del reporte financiero de pendientes. No borra el equipo en Nodus ni registra un pago.'),
  reversarPago: help('Reversar registro de pago', 'Devuelve el equipo a pendientes. NO revierte la transferencia bancaria. Disponible solo para las identidades autorizadas.'),
  editarLlamada: help('Editar llamada grupal', 'Abre la corrección de fecha y cantidad de asistentes de esta llamada existente, sin registrar otra.'),
  guardarLlamada: help('Guardar corrección de llamada', 'Actualiza la fecha y asistentes de esta llamada. Revisa la cantidad frente al total de integrantes.'),
  aceptar: help('Aceptar reporte', 'Cierra el reporte mostrado. No deshace la depuración que ya ejecutó el supervisor.'),
  whatsapp: help('Contactar por WhatsApp', 'Abre WhatsApp en otra pestaña con este teléfono. Confirma el destinatario y comparte solo la información necesaria.'),
  planillaManagers: help('Abrir planilla de managers', 'Abre la fuente de managers en Google Sheets. El acceso y la edición dependen también de los permisos del documento.'),
  planillaLlamadas: help('Abrir planilla de llamadas', 'Abre la fuente de llamadas y pagos en Google Sheets. Verifica la fuente antes de editar; no registra pagos en Causa OS.'),
  drivePagos: help('Abrir pagos semanales', 'Abre la carpeta autorizada de Drive para consultar documentos de pagos. El botón no ejecuta transferencias.'),
  resumenKpis: help('Resumen por entrenador', 'Compara asignaciones, llamadas y montos por entrenador. Usa sede y rendimiento para delimitar la revisión.'),
  retencion: help('Gráficas de retención', 'Compara graduación, deserción y permanencia. Usa estas tendencias para orientar el seguimiento, no para etiquetar a una persona.'),
  estadosKpis: help('Directorio por estados', 'Consulta managers por situación y asignación. Esta vista de indicadores no cambia sus estados.'),
  detalleKpis: help('Detalle del entrenador', 'Abre el detalle de managers y llamadas de este entrenador dentro de los indicadores.'),
  actualizarIndicador: help('Indicador de actualización', 'Este botón muestra una animación de actualización. Los indicadores reciben cambios mediante su suscripción en tiempo real; el botón no fuerza una sincronización externa.'),
  directorioTab: help('Directorio', 'Busca integrantes, verifica sus datos y revisa llamadas individuales. Los controles disponibles dependen de tu perfil.'),
  grupalesTab: help('Grupales', 'Revisa el roster y avance de cada equipo. Registra encuentros grupales con fecha y asistencia, sin duplicar una llamada existente.'),
  dashboardTab: help('Sedes', 'Compara el resumen de managers por sede y abre un directorio filtrado para profundizar. Disponible en perfiles con vista global.'),
  entrenadoresTab: help('Entrenadores', 'Consulta el resumen por entrenador y abre sus managers o equipos. Disponible en perfiles con vista global.'),
  kpis_llamadasTab: help('KPIs Llamadas', 'Revisa indicadores de llamadas, retención y estados en el alcance autorizado para Dirección. Un indicador no sustituye verificar el registro.'),
  liquidacionTab: help('Liquidación', 'Consulta y concilia la planilla Sheets y los equipos Nodus. Antes de registrar un pago, verifica fuente, equipo y comprobante. Disponible según el permiso existente.')
};

export const managersTabHelpKeys = {
  directorio: 'directorioTab',
  grupales: 'grupalesTab',
  dashboard: 'dashboardTab',
  entrenadores: 'entrenadoresTab',
  kpis_llamadas: 'kpis_llamadasTab',
  liquidacion: 'liquidacionTab'
};

export const managersGuides = {
  entrenador: {
    label: 'Entrenador',
    steps: [
      ['Ubica tu equipo', 'En Directorio o Grupales, verifica número, nombre y sede de tus asignaciones.'],
      ['Registra lo que ocurrió', 'En individuales, revisa la fecha y marca SÍ o NO: se guarda al instante. En grupales, revisa cada asistente y guarda una sola vez.'],
      ['Acompaña con hechos', 'Si tienes habilitadas las notas, escribe el hecho y el próximo acuerdo. No incluyas juicios ni datos privados innecesarios.'],
      ['Confirma tu registro', 'Revisa la ficha y el historial disponible. Los controles no visibles no están habilitados para tu perfil.']
    ]
  },
  cmj: {
    label: 'CMJ / Coordinación',
    steps: [
      ['Busca antes de crear', 'Verifica nombre completo, número de equipo y sede para evitar personas o equipos duplicados.'],
      ['Completa la identidad', 'Copia nombres y apellidos del documento oficial; comprueba teléfono con código de país y rol real.'],
      ['Coordina con precisión', 'Si tu perfil permite asignar, selecciona los entrenadores confirmados. #122 y #124 KAIZEN MAINICHI son equipos distintos.'],
      ['Cierra el seguimiento', 'Revisa asistencia y responde las notas habilitadas con acción, responsable y fecha. Cambia estados solo con confirmación.']
    ]
  },
  direccion: {
    label: 'Dirección / Vista global',
    steps: [
      ['Delimita tu revisión', 'Usa sede y entrenador para revisar cada equipo por número, nombre y sede.'],
      ['Cuida la calidad', 'Verifica identidad, roster y asignaciones. Una fusión o el supervisor puede modificar registros; no lo uses como consulta exploratoria.'],
      ['Consulta tendencias', 'Revisa Sedes, Entrenadores y los KPIs habilitados. Distingue asistencia de graduación o deserción.'],
      ['Concilia antes de registrar', 'En Liquidación, verifica fuente y comprobante. Marcar pagado no transfiere dinero; reversar no devuelve dinero al banco.']
    ]
  },
  consulta: {
    label: 'Consulta',
    steps: [
      ['Encuentra el registro', 'Busca una persona o equipo y comprueba número, nombre y sede.'],
      ['Consulta su contexto', 'Abre las fichas y el historial que permite tu perfil. Los filtros no cambian datos.'],
      ['Coordina una corrección', 'Si necesitas corregir datos y no ves el control, solicita apoyo a coordinación con el registro exacto.']
    ]
  }
};

export function getManagersGuideRole({ viewAsTrainer, canViewAll, canViewOwnSede }) {
  if (viewAsTrainer) return 'entrenador';
  if (canViewAll) return 'direccion';
  if (canViewOwnSede) return 'cmj';
  return 'consulta';
}

export const managersHelpUI = {
  guideTitle: 'Tu siguiente paso, claro',
  intro: 'Una tarea a la vez: ubica, verifica y registra.',
  open: 'Ver guía rápida',
  close: 'Cerrar y recordar',
  learn: 'Aprender botones',
  work: 'Volver a trabajar',
  learning: 'Modo aprender: los botones explican sin ejecutar. Cerrar y Cancelar siguen disponibles; los campos siguen editables.',
  hint: 'Pasa el cursor o enfoca un campo o botón para ver su ayuda. En móvil, activa Aprender botones antes de tocarlos. Escape cierra la ayuda.',
  storageError: 'No pudimos recordar tu preferencia en este navegador. La guía sigue disponible.',
  scope: {
    entrenador: 'Estás en vista de entrenador. La ayuda no amplía tus asignaciones ni los permisos de escritura.',
    cmj: 'Tu revisión se limita al alcance de tu sede y tus permisos actuales.',
    direccion: 'Tu perfil tiene vista global. La ayuda no habilita acciones adicionales.',
    consulta: 'Solo se muestran los registros y acciones que permite tu perfil.'
  }
};

export const managersGuideStorageKey = role => `causa.managers.guide.v1.${role}`;

export function shouldExplainAction(learning, helpKey) {
  return learning && !['cerrar', 'cancelar', 'aceptar'].includes(helpKey);
}
