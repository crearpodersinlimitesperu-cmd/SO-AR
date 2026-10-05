const ev = { fecha_inicio: "2026-11-20T00:00:00", sede: "Lima", nombre: "C2+MJ", equipo: "30" };
const assignments = {
  "2026-10-08__LIMA__C2+MJ__30": { entrenador: "Fer" }
};
const normalizeSede = (s) => String(s).trim().toUpperCase();

const looseMatch = (event) => {
  const sede = normalizeSede(event.sede || event.sedeTag || '');
  const training = String(event.nombre || event.name || event.entrenamiento || '').trim();
  const team = String(event.equipo || event.team || '').trim();
  const suffixWithTeam = `__${sede}__${training}${team ? `__${team}` : ''}`.replace(/\//g, '-');
  const suffixNoTeam = `__${sede}__${training}`.replace(/\//g, '-');
  
  for (const k of Object.keys(assignments)) {
    if (k.endsWith(suffixWithTeam)) return assignments[k];
  }
  for (const k of Object.keys(assignments)) {
    if (k.endsWith(suffixNoTeam)) return assignments[k];
  }
  return null;
};
console.log(looseMatch(ev));
