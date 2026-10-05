const ev = { fecha_inicio: "2026-11-20T00:00:00", sede: "Lima", nombre: "C2+MJ", equipo: "30" };
const publicAssignmentEventKey = (event = {}) => {
  const date = String(event.fecha_inicio || event.start || event.fechaInicio || '').slice(0, 10);
  const normalizeSede = (s) => String(s).trim().toUpperCase();
  const sede = normalizeSede(event.sede || event.sedeTag || '');
  const training = String(event.nombre || event.name || event.entrenamiento || '').trim();
  const team = String(event.equipo || event.team || '').trim();
  return `${date}__${sede}__${training}${team ? `__${team}` : ''}`.replace(/\//g, '-');
};
console.log(publicAssignmentEventKey(ev));
