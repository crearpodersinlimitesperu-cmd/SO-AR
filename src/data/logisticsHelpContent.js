export const flightMonitorGuide = {
  label: 'Monitor de Vuelos',
  intro: 'Consulta itinerarios y coordina la logística sin confundir horarios programados con seguimiento en vivo.',
  steps: [
    ['Encuentra el itinerario', 'Elige la sede y filtra por ruta o por Próximos / En horario estimado, Pasados o Todos. Busca entrenador, número de vuelo o reserva; confirma el documento original antes de coordinar.'],
    ['Interpreta el contador', 'La cuenta regresiva usa la salida programada y su zona horaria. Llegar a cero no confirma despegue; «en horario estimado» no confirma que el avión esté volando ni que haya aterrizado. Sin hora fiable no se calcula el contador.'],
    ['Actualiza la consulta', 'Actualizar itinerarios vuelve a leer el feed publicado; no ejecuta la sincronización de Drive. La casilla automática refresca cada 5 minutos mientras el panel esté visible. Revisa Última sincronización: el agente está programado 7 veces al día y, cuando termina con éxito en master, se publica automáticamente. Si la publicación falla, se conserva la versión anterior.'],
    ['Habilita tracking live con autorización', 'El responsable debe elegir y autorizar un proveedor de estados de vuelos y entregar acceso API/credenciales al administrador mediante un canal seguro, nunca en este panel ni en el feed público. La integración de backend debe validar vuelo, fecha y aeropuertos, guardar credenciales como secretos y mostrar fuente y hora de consulta. Hasta verificarla, confirma retrasos, cancelaciones y aterrizajes con la aerolínea; no hay tracking live habilitado.']
  ],
  scope: 'Cartas Oficiales y Logística complementan el itinerario según tus permisos. Esta ayuda no modifica documentos, reservas, asignaciones ni el feed público.'
};

export const flyerGuide = {
  label: 'Generador de Flyers',
  intro: 'Usa el calendario como fuente y revisa sede, equipo y fechas antes de compartir un flyer.',
  steps: [
    ['Selecciona sede y equipo', 'En «Por sede y equipo: C1, C2 y MJ», elige primero la sede y después el equipo. Cambiar sede borra el equipo seleccionado. Se incluyen fechas históricas y futuras de esa identidad exacta; Equipo 32 no equivale a Equipo 132.'],
    ['Revisa MJ y los datos faltantes', 'MJ significa Maestría del Juego. Solo con número MJ explícito se declara Creación N, Relación N−1 y Gratitud N−2 en la fecha del mismo MJ; fases cero o negativas no son derivables. «Sin vínculo explícito» o «sin número MJ explícito» requiere corregir la fuente, no tomar el MJ de otro equipo ni inferirlo desde el número de equipo.'],
    ['Solicita el vínculo MJ en la fuente', 'El responsable del calendario debe confirmar el evento con sede + equipo exactos, fecha de inicio y fin confirmado, y un número MJ explícito en el nombre (por ejemplo «MJ 3») o en un campo admitido: mjNumero, numeroMJ o mjNumber. No declares valores contradictorios. El administrador debe verificar que la fuente autorizada entregue ese dato a Causa OS; no basta con añadir una columna que la integración aún no lee. Después comprueba la selección por sede/equipo. Hoy la fuente carece de ese número verificable; esta pantalla no lo inventa.'],
    ['Previsualiza y descarga', 'Revisa todas las páginas de la preview y descarga PNG 1080×1920. Más de seis entradas se reparten en páginas sin omitir fechas. «Por fase: una sede o todas» es un editor separado: los presets y cambios son manuales y no corrigen el calendario ni vinculan MJ. Sincronizar Calendario reemplaza esas ediciones con las fechas del programa seleccionado.']
  ],
  scope: 'Estas indicaciones no cambian el esquema ni escriben en la fuente. Si faltan fechas o vínculos, solicita evidencia al responsable antes de publicar.'
};
