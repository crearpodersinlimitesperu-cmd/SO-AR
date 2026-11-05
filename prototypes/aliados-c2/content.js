export const phases = [
  {
    id: 'puente', title: 'El puente de los 8 días', period: 'Post-C1 → Pre-C2', short: 'Antes de C2',
    description: 'Alinear al equipo, preparar el contexto y revisar los acuerdos antes de llegar a la sede.',
    events: [
      ['Miércoles post-C1', '20:00', 'Grounding virtual de Aliados', 'Máximo 90 minutos. Cámara encendida, espacio privado, pruebas técnicas e iluminación. Asignación del contexto estratégico.'],
      ['Jueves a domingo', '3 min', 'Contactos con el equipo', 'Sostener el propósito y hacer seguimiento a los acuerdos de pago. Duración indicada por contacto; no es una hora de inicio.'],
      ['Lunes pre-C2', '18:00', 'Cierre y confirmados', 'Cierre de la meta de recaudación y validación de la lista de confirmados.'],
    ],
  },
  {
    id: 'sede', title: 'Llegada y rotación', period: 'Jueves C2', short: 'Inicio en sede',
    description: 'Preparar el espacio, recibir a los Partners y asumir una función distinta a la de C1.',
    events: [
      ['Jueves', '10:30', 'Arribo a la sede', 'Verificación de instalaciones, logística y recepción de Partners.'],
      ['Jueves', '11:30', 'Grounding presencial', 'Rotación indispensable: ningún Aliado ejecuta la misma tarea operativa asignada en C1. Presentación de la coreografía aprobada del equipo.'],
      ['Jueves', '13:00', 'Apertura de Mesa', 'Inicio de la Mesa según el cronograma del programa.'],
    ],
  },
  {
    id: 'entrenamiento', title: 'El fin de semana', period: 'Jueves → Domingo C2', short: 'Entrenamiento',
    description: 'Una secuencia de metas, retroalimentación, integración y transición a Maestría del Juego.',
    events: [
      ['Jueves · Resultados Imposibles', '17:00', 'Espacio de Creación de Metas', 'Cada participante declara sus Resultados Imposibles: objetivos de alto impacto con evidencias medibles.'],
      ['Jueves', '17:30', 'Retroalimentación activa', 'Dinámica de retroalimentación en sala.'],
      ['Viernes · Mesa y Palabras Rotas', '07:45', 'Grounding de Aliados', 'Alineación de las metas del día.'],
      ['Viernes', '14:00', 'Cierre definitivo de Mesa', 'Cierre de la Mesa de Enrolamiento.'],
      ['Viernes', '14:01', 'Gestión de Palabras Rotas', 'Los Partners acompañan a quienes declararon metas y no cuentan con Ticket Verde, para revisar la ejecución e integración con equipos de metas consolidadas.'],
      ['Viernes', '19:00–21:00', 'Actividad El Barco', 'Experiencia de quiebre de equipo e integración, según la guía fuente.'],
      ['Sábado · Irrazonabilidad y Vuelos', '09:00', 'Vestimenta Irrazonable', 'Inicio del día: romper posturas rígidas y patrones previsibles, según el lenguaje del programa.'],
      ['Sábado', '19:00', 'Actividad de Vuelos', '“Saltos Cuánticos”, con respaldo del Partner y apoyo de Ángeles convocados. La guía no especifica una práctica física ni proporciona instrucciones para saltar.'],
      ['Domingo · Maestría del Juego', '11:30', 'Grounding de C2', 'Grounding con Aliados.'],
      ['Domingo', '15:00', 'Presentación de Maestría del Juego', 'Presentación del programa de 90 días.'],
      ['Domingo', '15:30', 'Declaración de Managers', 'Inicio del registro de participantes con evidencia de compromiso. Este prototipo no realiza registros.'],
    ],
  },
  {
    id: 'despues', title: 'Socios de Vida', period: 'Post-C2 · Primer fin de semana de Creación', short: 'Después de C2',
    description: 'Acompañar la transición, afianzar los acuerdos y cerrar el ciclo con aprendizajes.',
    events: [
      ['Post-C2', 'Sin horario', 'Participación en Maestría del Juego', 'La fuente establece una meta de participación del 100% de quienes declararon Maestría del Juego y cuentan con evidencia registrada. Es una meta operativa, no una promesa de resultado.'],
      ['Primer fin de semana de Creación', 'Sin horario', 'Conformación de Socios de Vida', 'Se constituyen oficialmente después de C2. El Aliado acompaña los acuerdos y el compromiso para los 90 días del programa.'],
      ['Cierre del equipo', 'Sin horario', 'Rendición de cuentas', 'Asistir al grounding de cierre para evaluar resultados y declarar aprendizajes personales del ciclo. La fuente no indica fecha ni hora.'],
    ],
  },
];

export const preparation = [
  { id: 'tecnica', title: 'Probar el equipo', detail: 'Internet, computadora, micrófono y sonido antes del grounding virtual.' },
  { id: 'espacio', title: 'Preparar el espacio', detail: 'Lugar privado, seguro y sin distracciones; iluminación suficiente y cámara encendida.' },
  { id: 'partner', title: 'Revisar la dupla Partner', detail: 'Si tu Partner de C1 asiste a C2, mantienen la dupla. Si no asiste, constituyen un nuevo Partner en el primer círculo de C2.' },
  { id: 'resultados', title: 'Enviar tus Resultados Imposibles', detail: 'Redactar y enviar al chat del equipo antes de las 23:59 del día del grounding.' },
  { id: 'coreografia', title: 'Preparar la coreografía de Aliados', detail: '30 segundos y grito de poder. Diseñar, ensayar y grabar con todo el equipo; subir el video al chat oficial antes de las 23:59 del miércoles previo a C2. Presentación aprobada: jueves, 11:30.' },
  { id: 'angeles', title: 'Coordinar la convocatoria de Ángeles', detail: 'La misión fuente es convocar a 10 graduados por Aliado, sin repetirlos entre Aliados, para el sábado por la tarde. No se guardan nombres ni datos de invitados aquí.' },
  { id: 'identificacion', title: 'Revisar identificación e integración', detail: 'Cinta negra en el brazo con las iniciales del Aliado que convocó. La fuente solicita puntualidad, integración de principio a fin y cuidado del contexto.' },
  { id: 'acapela', title: 'Preparar la coreografía de Ángeles', detail: '30 segundos, a capela y sin música, que comuniquen la conversación de enrolamiento de su Aliado durante la Noche de Vuelos.' },
  { id: 'feedback', title: 'Acordar el feedback diario', detail: '10 minutos por video entre Aliados, enfocados en la creación. Alternar cada día quién lidera la sesión.' },
];

export const reference = [
  {
    title: 'Partner: rol y corresponsabilidad',
    paragraphs: [
      'Partner es el término oficial. En C2, “Partner Motor de Riesgo” nombra al socio de riesgo compartido que acompaña compromisos y acción. No describe una actividad física.',
      'La fuente propone firmeza, claridad, cumplimiento de la palabra y presencia en todos los groundings y citas. El Aliado también está en entrenamiento constante.',
      'Conservas la dupla de C1 si tu Partner asiste. Si no, formas un nuevo Partner en el primer círculo de C2. El principio de presencia de la fuente indica no ingresar a la sala hasta asegurar la llegada física de tu Partner a la sede.',
    ],
    care: 'Comunica retrasos al equipo y prioriza la seguridad. La participación y las preguntas se acompañan con respeto, sin humillación ni etiquetas. Estas son salvaguardas editoriales, no modificaciones a las reglas del programa.',
  },
  {
    title: 'Grounding virtual: condiciones de consulta',
    paragraphs: [
      'Normalmente a las 20:00, hora local, con un máximo de 90 minutos. El miércoles post-C1 tiene ese mismo horario en el cronograma.',
      'La fuente solicita cámara encendida durante toda la sesión, espacio privado y adecuado, verificación previa de conexión y equipo, e iluminación suficiente.',
    ],
    care: 'Si una condición no es posible, comunica la limitación al equipo. No compartas imágenes, grabaciones o información personal de otras personas sin su consentimiento.',
  },
  {
    title: 'Conversaciones breves, relación primero',
    paragraphs: [
      'La fuente plantea comunicación directa y transparente: escuchar lo que importa a la persona y conectar la conversación con su visión. Las interacciones de seguimiento y encuadre tienen un máximo de 5 minutos.',
      'Ante límites de tiempo o dinero, el texto propone revisar recursos en la vida cotidiana, independientemente de la decisión de asistir. Ante “No puedo” o “Es imposible”, incluye la pregunta “¿Cómo sabes que eso es verdad para ti?”.',
      'La fuente llama “compromiso con el 100%” y “Exigencia Directa” a la entrega y firmeza del acompañamiento, sin juicios ni etiquetas previas.',
    ],
    care: 'Escucha los límites reales; pide permiso para explorar alternativas. No presiones pagos, deuda, asistencia ni revelaciones personales. La persona puede pausar o rechazar la conversación. No se reproducen como instrucciones los pasajes de presión del original.',
  },
  {
    title: 'Vuelos y lenguaje del programa',
    paragraphs: [
      'Actividad de Vuelos, Saltos Cuánticos, Ángeles y Vestimenta Irrazonable son denominaciones de la guía fuente. No constituyen afirmaciones científicas, clínicas ni promesas de transformación.',
      'El sábado a las 19:00 se ubica Vuelos. La convocatoria de Ángeles es para el sábado por la tarde; el adjunto no indica una hora de llegada más precisa.',
    ],
    care: 'No infieras saltos ni ejercicios físicos de estos nombres. Cualquier actividad requiere indicaciones seguras y participación voluntaria; este prototipo no proporciona instrucciones físicas.',
  },
];
