const TYPE_LABELS = {
  task_message: 'Nuevo mensaje en tarea',
  task_email_reminder: 'Recordatorio de tarea',
  task_reminder: 'Recordatorio de tarea',
  task_assigned: 'Nueva tarea asignada',
  task_completed: 'Tarea completada',
  COLLABORATION_INVITE: 'Invitación a colaborar',
  operational_broadcast: 'Comunicado operativo',
  schedule_update: 'Actualización de horario',
  NEW_EXCELLENCE_STANDARD: 'Nuevo estándar de excelencia',
  NEW_STANDARD_ANNOUNCEMENT: 'Nuevo estándar de excelencia'
};

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const isOwnNotification = (notification, email) =>
  !!notification && !!email && normalizeEmail(notification.userId) === normalizeEmail(email);

export function getNotificationToast(data = {}) {
  const label = TYPE_LABELS[data.type];
  const title = data.title || '';
  if (!label) return title ? `Nueva notificación: ${title}` : 'Nueva notificación';
  return title ? `${label}: ${title}` : label;
}
