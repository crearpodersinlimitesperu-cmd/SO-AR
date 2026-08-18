// src/services/googleSync.js

/**
 * Formatea una fecha a la estructura requerida por Google Calendar Web URL (YYYYMMDDTHHmmssZ)
 */
function formatGoogleCalendarDate(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace(/-|:|\.\d+/g, '');
}

/**
 * Genera una URL de plantilla directa para Google Calendar (100% Funcional sin depender de tokens)
 */
export const generateGoogleCalendarUrl = (eventDetails) => {
  const text = encodeURIComponent(eventDetails.summary || eventDetails.nombre || eventDetails.name || 'Evento CREAR PSL');
  const details = encodeURIComponent(
    `Entrenador: ${eventDetails.trainer || eventDetails.equipo || 'Por Confirmar'}\n${eventDetails.description || eventDetails.detalles || ''}\n\nOrganizado por CREAR Poder Sin Límites`
  );
  const location = encodeURIComponent(eventDetails.location || eventDetails.direccion || eventDetails.lugar || eventDetails.sede || '');
  
  const startFormatted = formatGoogleCalendarDate(eventDetails.start || eventDetails.fecha_inicio);
  let endFormatted = formatGoogleCalendarDate(eventDetails.end || eventDetails.fecha_fin);
  
  if (!endFormatted && startFormatted) {
    // Si no hay fecha fin, asignar 2 horas después
    const endDate = new Date(new Date(eventDetails.start || eventDetails.fecha_inicio).getTime() + 2 * 60 * 60 * 1000);
    endFormatted = formatGoogleCalendarDate(endDate);
  }

  const dates = `${startFormatted}/${endFormatted}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
};

/**
 * Genera y descarga un archivo .ICS para agregar a cualquier calendario (Google, Outlook, Apple)
 */
export const downloadIcsFile = (eventDetails) => {
  const title = eventDetails.summary || eventDetails.nombre || eventDetails.name || 'Evento CREAR PSL';
  const description = (eventDetails.description || eventDetails.detalles || '').replace(/\n/g, '\\n');
  const location = eventDetails.location || eventDetails.direccion || eventDetails.sede || '';
  const start = formatGoogleCalendarDate(eventDetails.start || eventDetails.fecha_inicio);
  const end = formatGoogleCalendarDate(eventDetails.end || eventDetails.fecha_fin || new Date(new Date(eventDetails.start).getTime() + 2 * 3600000));

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CREAR Poder Sin Limites//Calendar//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const createGoogleTask = async (taskDetails, token) => {
  if (!token) return { success: false, error: 'No token' };
  
  try {
    const task = {
      title: taskDetails.title,
      notes: taskDetails.description || '',
      due: taskDetails.dueDate ? new Date(taskDetails.dueDate).toISOString() : undefined,
    };

    const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(task)
    });

    if (!res.ok) {
      let errorMsg = res.statusText;
      try {
        const errData = await res.json();
        if (errData.error?.message) errorMsg = errData.error.message;
      } catch (e) {}
      throw new Error(`Google Tasks API Error: ${errorMsg}`);
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error creando tarea en Google Tasks:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Agendador Híbrido Inteligente (Zero-Failure):
 * 1. Intenta vía API si hay token activo y válido.
 * 2. Si el token expiró o falta, abre directamente Google Calendar con el evento prellenado sin fallar.
 */
export const createGoogleEvent = async (eventDetails, token) => {
  // Si hay token, intentamos sincronizar directamente vía REST API
  if (token) {
    try {
      const event = {
        summary: eventDetails.summary || eventDetails.nombre || 'Evento CREAR PSL',
        location: eventDetails.location || eventDetails.direccion || eventDetails.sede || '',
        description: eventDetails.description || `Entrenador: ${eventDetails.trainer || 'TBA'}\n${eventDetails.detalles || ''}`,
        start: {
          dateTime: new Date(eventDetails.start).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(eventDetails.end || new Date(new Date(eventDetails.start).getTime() + 2 * 3600000)).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, via: 'api', data };
      }
    } catch (apiErr) {
      console.warn("Fallo de API Calendar, usando redirección directa Web:", apiErr);
    }
  }

  // FALLBACK SEGURO 100%: Abrir directamente la plantilla de Google Calendar
  try {
    const calendarUrl = generateGoogleCalendarUrl(eventDetails);
    window.open(calendarUrl, '_blank', 'noopener,noreferrer');
    return { success: true, via: 'web', openedUrl: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
