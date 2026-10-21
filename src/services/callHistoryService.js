import { arrayUnion, doc, runTransaction } from 'firebase/firestore';
import { managerDocumentRef } from './managerPersistence.js';

const requiredText = (value, field) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

export async function recordIndividualCall(db, {
  manager, callId, fecha, asistio, registradoPorEmail = '', registradoPorNombre = '',
}) {
  const id = requiredText(callId, 'callId');
  const date = requiredText(fecha, 'fecha');
  if (typeof asistio !== 'boolean') throw new Error('asistio must be a boolean.');

  const event = {
    id,
    tipo: 'individual',
    fecha: date,
    asistio,
    registradoPorEmail,
    registradoPorNombre,
    createdAtIso: new Date().toISOString(),
  };
  const managerRef = managerDocumentRef(db, manager);
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(managerRef);
    if (!snapshot.exists()) throw new Error('Manager document does not exist.');

    const currentHistory = Array.isArray(snapshot.data().llamadasHistorial)
      ? snapshot.data().llamadasHistorial
      : [];
    const existingEvent = currentHistory.find(item => item.id === id);
    if (existingEvent) return existingEvent;

    transaction.update(managerRef, {
      llamadaFecha: date,
      llamadaAsistio: asistio ? 'SI' : 'NO',
      llamadasHistorial: [...currentHistory, event],
    });
    return event;
  });
}

export async function updateIndividualCallDate(db, { manager, fecha }) {
  const date = requiredText(fecha, 'fecha');
  const managerRef = managerDocumentRef(db, manager);

  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(managerRef);
    if (!snapshot.exists()) throw new Error('Manager document does not exist.');

    const data = snapshot.data();
    const history = Array.isArray(data.llamadasHistorial) ? data.llamadasHistorial : [];
    const latestEvent = history.length - 1;
    const updatedHistory = history.map((event, index) => (
      index === latestEvent ? { ...event, fecha: date } : event
    ));
    transaction.update(managerRef, {
      llamadaFecha: date,
      ...(history.length > 0 ? { llamadasHistorial: updatedHistory } : {}),
    });
    return history.length > 0 ? updatedHistory[latestEvent] : null;
  });
}

export async function recordGroupCall(db, {
  callId, managers, attendance, fecha, equipo, numEquipo = '', sede,
  entrenador = '', registradoPorEmail = '', registradoPorNombre = '',
}) {
  const id = requiredText(callId, 'callId');
  const date = requiredText(fecha, 'fecha');
  if (!Array.isArray(managers) || managers.length === 0) {
    throw new Error('A group call must include at least one manager.');
  }

  const members = managers.map(manager => {
    const managerId = requiredText(manager?.id, 'manager id');
    if (!Object.prototype.hasOwnProperty.call(attendance || {}, managerId) ||
        typeof attendance[managerId] !== 'boolean') {
      throw new Error(`Attendance is missing for manager ${managerId}.`);
    }
    return {
      id: managerId,
      ref: managerDocumentRef(db, manager),
      asistio: attendance[managerId],
    };
  });
  const team = requiredText(equipo, 'equipo');
  const normalizedSede = requiredText(sede, 'sede');
  const callRef = doc(db, 'llamadas_grupales_historial', id);
  const call = {
    callId: id,
    equipoKey: `${normalizedSede}_${team}`,
    equipo: team,
    numEquipo,
    sede: normalizedSede,
    entrenador,
    fecha: date,
    totalIntegrantes: members.length,
    asistieron: members.filter(member => member.asistio).length,
    registradoPorEmail,
    registradoPorNombre,
    createdAtIso: new Date().toISOString(),
  };

  return runTransaction(db, async transaction => {
    const existing = await transaction.get(callRef);
    if (existing.exists()) return { alreadyRecorded: true, callId: id };

    for (const member of members) {
      transaction.update(member.ref, {
        llamadaFecha: date,
        llamadaAsistio: member.asistio ? 'SI' : 'NO',
        llamadasHistorial: arrayUnion({
          id,
          tipo: 'grupal',
          fecha: date,
          asistio: member.asistio,
          equipo: team,
          sede: normalizedSede,
          registradoPorEmail,
          registradoPorNombre,
          createdAtIso: call.createdAtIso,
        }),
      });
    }
    transaction.set(callRef, call);
    return { alreadyRecorded: false, callId: id };
  });
}
