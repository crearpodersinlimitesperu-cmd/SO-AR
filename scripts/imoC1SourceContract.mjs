// Registration and effective attendance are separate fields in Nodus.
export function adaptC1Participant(tableRow, detail) {
  if (String(tableRow.id) !== String(detail.id)) throw new Error('Participant detail mismatch');
  const same = (a, b) => String(a ?? '').trim() === String(b ?? '').trim();
  for (const field of ['nombres', 'apellidos', 'telefono']) {
    if (!same(tableRow[field], detail[field])) throw new Error('Participant identity changed');
  }
  if (!same(tableRow.id_equipo, detail.id_equipo)) throw new Error('Participant team mismatch');
  return {
    id: tableRow.id, nombres: tableRow.nombres, apellidos: tableRow.apellidos,
    telefono: tableRow.telefono, id_invitador: tableRow.id_invitador, nombre_imo: tableRow.nombre_imo,
    // Do not carry the table's asistio_c1 alias into historical attendance.
    c1Registration: {
      chapter: detail.capitulo1 === true || Number(detail.capitulo1) === 1,
      date: typeof detail.fecha_c1 === 'string' ? detail.fecha_c1 : null,
      status: typeof detail.asistencia === 'string' ? detail.asistencia : null,
    },
    asistenciaC1: null, asistio_c1: null, estadoC1: null, estado_c1: null,
    desertorC1: null, desertor_c1: null,
  };
}
