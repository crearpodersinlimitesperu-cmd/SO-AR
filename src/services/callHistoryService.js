import { arrayUnion, doc, runTransaction } from 'firebase/firestore';
import { managerDocumentRef } from './managerPersistence.js';

const requiredText = (value, field) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

export async function recordIndividualCall(db, {
  manager, callId, fecha, asistio, registradoPorEmail = '', registradoPorNombre = '',
  tipoContacto = 'Videollamada de Google Meet', duracionMinutos = '20-30 min',
  meetUrl = '', notaVozEnviada = false, llamadaEfectiva = null
}) {
  const id = requiredText(callId, 'callId');
  const date = requiredText(fecha, 'fecha');
  if (typeof asistio !== 'boolean') throw new Error('asistio must be a boolean.');

  const effective = llamadaEfectiva !== null ? Boolean(llamadaEfectiva) : asistio;

  const event = {
    id,
    tipo: 'individual',
    tipoContacto: String(tipoContacto || 'Videollamada de Google Meet').trim(),
    duracionMinutos: String(duracionMinutos || '20-30 min').trim(),
    fecha: date,
    asistio,
    llamadaEfectiva: effective,
    meetUrl: String(meetUrl || '').trim(),
    notaVozEnviada: Boolean(notaVozEnviada),
    registradoPorEmail,
    registradoPorNombre,
    createdAtIso: new Date().toISOString(),
  };
  const managerRef = managerDocumentRef(db, manager);
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(managerRef);
    if (!snapshot.exists()) {
      // Auto-crear el documento en Firestore si sólo existía en el catálogo local
      const initialDoc = {
        ...(manager || {}),
        docId: managerRef.id,
        id: manager?.id || managerRef.id,
        llamadaFecha: date,
        llamadaAsistio: asistio ? 'SI' : 'NO',
        llamadasHistorial: [event],
        createdAtIso: new Date().toISOString(),
      };
      transaction.set(managerRef, initialDoc);
      return event;
    }

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
  tipoContacto = 'Videollamada de Google Meet', duracionMinutos = '20-30 min',
  meetUrl = '', notaVozEnviada = false,
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
  const contactType = String(tipoContacto || 'Videollamada de Google Meet').trim();
  const duration = String(duracionMinutos || '20-30 min').trim();
  const asistieronCount = members.filter(member => member.asistio).length;

  const call = {
    callId: id,
    equipoKey: `${normalizedSede}_${team}`,
    equipo: team,
    numEquipo,
    sede: normalizedSede,
    entrenador,
    tipoContacto: contactType,
    duracionMinutos: duration,
    meetUrl: String(meetUrl || '').trim(),
    notaVozEnviada: Boolean(notaVozEnviada),
    llamadaEfectiva: asistieronCount > 0,
    fecha: date,
    totalIntegrantes: members.length,
    asistieron: asistieronCount,
    registradoPorEmail,
    registradoPorNombre,
    createdAtIso: new Date().toISOString(),
  };

  return runTransaction(db, async transaction => {
    const existing = await transaction.get(callRef);
    if (existing.exists()) return { alreadyRecorded: true, callId: id };

    // Todas las lecturas antes de escrituras (regla de transacciones Firestore)
    const memberSnapshots = await Promise.all(
      members.map(member => transaction.get(member.ref))
    );

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const memberSnap = memberSnapshots[i];
      const groupCallEvent = {
        id,
        tipo: 'grupal',
        tipoContacto: contactType,
        duracionMinutos: duration,
        meetUrl: call.meetUrl,
        notaVozEnviada: call.notaVozEnviada,
        llamadaEfectiva: member.asistio,
        fecha: date,
        asistio: member.asistio,
        equipo: team,
        sede: normalizedSede,
        registradoPorEmail,
        registradoPorNombre,
        createdAtIso: call.createdAtIso,
      };

      if (!memberSnap.exists()) {
        transaction.set(member.ref, {
          id: member.id,
          docId: member.ref.id,
          equipo: team,
          numEquipo,
          sede: normalizedSede,
          llamadaFecha: date,
          llamadaAsistio: member.asistio ? 'SI' : 'NO',
          llamadasHistorial: [groupCallEvent],
          createdAtIso: new Date().toISOString()
        });
      } else {
        transaction.update(member.ref, {
          llamadaFecha: date,
          llamadaAsistio: member.asistio ? 'SI' : 'NO',
          llamadasHistorial: arrayUnion(groupCallEvent),
        });
      }
    }
    transaction.set(callRef, call);
    return { alreadyRecorded: false, callId: id };
  });
}
