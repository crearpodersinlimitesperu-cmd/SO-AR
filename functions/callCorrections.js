const text = value => String(value ?? '').trim();
const key = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const { dualRoleTrainerEmails } = require('./callCorrectionAccess.json');
const sameEmail = (left, right) => key(left).replace(/@crearpsl\.com$/, '@crearpsl.net') ===
  key(right).replace(/@crearpsl\.com$/, '@crearpsl.net');
const superiorEmails = [
  'jose.sanchez@crearpsl.net', 'jose.sanchez@crearpsl.com',
  'armando.pilacuan@gmail.com', 'paul.sosa@crearpsl.net',
];
const superiorRoles = ['direccion', 'director_maestria', 'ceo', 'cco', 'cfo'];
const activeCall = call => !['anulada', 'duplicada'].includes(call?.estadoRegistro);
const effectiveIndividual = call => call.llamadaEfectiva === true || call.asistio === true || call.asistio === 'SI';

function isAssigned(manager, actor) {
  if (manager.entrenadorId) {
    return manager.entrenadorId === actor.uid &&
      (!manager.entrenadorEmail || sameEmail(manager.entrenadorEmail, actor.email));
  }
  if (manager.entrenadorEmail) return sameEmail(manager.entrenadorEmail, actor.email);
  const name = key(actor.name);
  return Boolean(name && text(manager.entrenador).split(/[,/&•]+/).some(label => key(label) === name));
}

function summarize(history) {
  const latest = history.filter(activeCall).slice().sort((a, b) =>
    text(b.fecha).localeCompare(text(a.fecha)) || text(b.createdAtIso).localeCompare(text(a.createdAtIso))
  )[0];
  return {
    llamadaFecha: latest?.fecha || '',
    llamadaAsistio: latest ? (latest.asistio === true || latest.asistio === 'SI' ? 'SI' : 'NO') : '',
  };
}

function recordAuditEvent(tx, db, id, actor, details, timestamp) {
  tx.create(db.collection('audit_logs').doc(id), {
    email: actor.email, name: actor.name, role: actor.roles[0] || '',
    sede: actor.sede, action: 'CORREGIR_LLAMADA', details: JSON.stringify(details),
    timestamp, createdAtIso: new Date().toISOString(),
  });
}

function createCorrectCall({ db, FieldValue, HttpsError }) {
  const fail = (code, message) => { throw new HttpsError(code, message); };
  return async request => {
    if (!request.auth?.uid || !request.auth.token.email) fail('unauthenticated', 'Inicia sesión para corregir llamadas.');
    const input = request.data || {};
    const { tipo, callId, managerDocId = '', action, motivo, operationId } = input;
    if (!['individual', 'grupal'].includes(tipo) || !['editar', 'anular', 'restaurar'].includes(action) ||
        typeof operationId !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(operationId) ||
        typeof callId !== 'string' || !text(callId) || callId.includes('/') ||
        typeof managerDocId !== 'string' ||
        (tipo === 'individual' && (!text(managerDocId) || managerDocId.includes('/')))) {
      fail('invalid-argument', 'La llamada o la operación no tiene una identidad válida.');
    }
    if (text(motivo).length < 5 || text(motivo).length > 500) {
      fail('invalid-argument', 'Describe el motivo de la corrección (5 a 500 caracteres).');
    }
    const changes = input.changes || {};
    if (Object.keys(changes).some(field => !['fecha', 'asistio'].includes(field)) ||
        (tipo === 'grupal' && 'asistio' in changes) ||
        (action !== 'editar' && Object.keys(changes).length)) {
      fail('invalid-argument', 'Solo puedes corregir fecha y asistencia individual.');
    }
    if (action === 'editar' && (!Object.keys(changes).length ||
        ('fecha' in changes && (!/^\d{4}-\d{2}-\d{2}$/.test(changes.fecha) ||
          Number.isNaN(Date.parse(`${changes.fecha}T12:00:00Z`)) ||
          new Date(`${changes.fecha}T12:00:00Z`).toISOString().slice(0, 10) !== changes.fecha)) ||
        ('asistio' in changes && typeof changes.asistio !== 'boolean'))) {
      fail('invalid-argument', 'Verifica la fecha y la asistencia.');
    }
    const ledgerRef = db.collection('call_corrections').doc(operationId);
    const fingerprint = JSON.stringify({ tipo, callId, managerDocId, action, motivo: text(motivo), changes,
      expectedRevision: input.expectedRevision });

    return db.runTransaction(async tx => {
      const [profileSnap, previous] = await Promise.all([
        tx.get(db.collection('users').doc(request.auth.uid)), tx.get(ledgerRef),
      ]);
      const profile = profileSnap.data() || {};
      const roles = [...new Set([profile.role, profile.rol, profile.appRole, ...(Array.isArray(profile.roles) ? profile.roles : [])].filter(Boolean))];
      if (!profileSnap.exists || profile.activo === false || profile.active === false ||
          profile.isActive === false || profile.esActivo === false || roles.some(role => key(role) === 'inactivo') ||
          ['inactivo', 'inactive', 'deshabilitado', 'archivado', 'baja', 'renuncia', 'desvinculado']
            .some(marker => `${key(profile.estado)} ${key(profile.status)}`.includes(marker))) {
        fail('permission-denied', 'Tu perfil no está activo.');
      }
      const actor = {
        uid: request.auth.uid, email: key(request.auth.token.email),
        name: text(profile.name || profile.displayName || profile.nombre),
        sede: text(profile.sede),
        roles,
      };
      const superior = superiorEmails.includes(actor.email) || actor.roles.some(role => superiorRoles.includes(role));
      const trainer = actor.roles.some(role => ['entrenador', 'entrenador_llamadas'].includes(role)) ||
        dualRoleTrainerEmails.some(value => sameEmail(value, actor.email));
      if (!superior && !trainer) fail('permission-denied', 'No tienes permiso para corregir llamadas.');
      if (previous.exists) {
        if (previous.data().actorUid !== actor.uid || previous.data().fingerprint !== fingerprint) {
          fail('already-exists', 'El identificador ya pertenece a otra corrección.');
        }
        return { ok: true, operationId, alreadyApplied: true };
      }
      if (action === 'restaurar' && !superior) fail('permission-denied', 'Solo Dirección o Finanzas puede restaurar una llamada.');

      const sourceRef = tipo === 'grupal'
        ? db.collection('llamadas_grupales_historial').doc(callId)
        : db.collection('managers_directory').doc(managerDocId);
      const sourceSnap = await tx.get(sourceRef);
      if (!sourceSnap.exists) fail('not-found', 'No se encontró el registro original.');
      const source = sourceSnap.data();
      const originals = tipo === 'grupal' ? [source] : (source.llamadasHistorial || []).filter(call => call.id === callId);
      if (originals.length !== 1) fail('failed-precondition', 'La identidad de la llamada no es única. Solicita revisión a Dirección.');
      const before = originals[0];
      if (tipo === 'grupal' && !text(before.equipoKey)) {
        fail('failed-precondition', 'La llamada grupal no tiene identidad de equipo verificable. Solicita conciliación a Dirección.');
      }
      if (tipo === 'individual' && before.tipo === 'grupal') fail('failed-precondition', 'Corrige la llamada grupal completa, no una copia individual.');
      if (!Number.isInteger(input.expectedRevision) || input.expectedRevision !== (before.revision || 0)) {
        fail('aborted', 'La llamada cambió mientras la revisabas. Cierra y vuelve a abrir la ficha.');
      }
      if ((action === 'restaurar') === activeCall(before)) {
        fail('failed-precondition', activeCall(before) ? 'La llamada ya está activa.' : 'La llamada está anulada; solicita su restauración a Dirección.');
      }

      // La consulta incluye integrantes trasladados de equipo y pagos con claves heredadas.
      const [directory, payments, groupHistory] = await Promise.all([
        tipo === 'grupal' ? tx.get(db.collection('managers_directory')) : Promise.resolve(null),
        tx.get(db.collection('liquidaciones_pagos')),
        tipo === 'grupal' ? tx.get(db.collection('llamadas_grupales_historial')) : Promise.resolve(null),
      ]);
      const members = tipo === 'grupal'
        ? directory.docs.filter(snap => (snap.data().llamadasHistorial || []).some(call => call.id === callId && call.tipo === 'grupal'))
        : [sourceSnap];
      if (tipo === 'grupal' && (members.length !== before.totalIntegrantes || members.length > 200 ||
          (before.managerDocIds && (before.managerDocIds.length !== members.length ||
            before.managerDocIds.some(id => !members.some(snap => snap.id === id)))))) {
        fail('failed-precondition', 'No se pudieron verificar todas las copias grupales. Dirección debe conciliar los integrantes antes de corregir.');
      }
      if (!superior && !sameEmail(before.registradoPorEmail, actor.email) &&
          !members.every(snap => isAssigned(snap.data(), actor))) {
        fail('permission-denied', 'Solo puedes corregir llamadas propias o de tus integrantes asignados.');
      }
      const scopeKey = tipo === 'individual' ? `indiv__${managerDocId}` :
        (before.equipoKey || `${before.sede}_${before.equipo}`);
      const aliases = new Set([key(scopeKey), key(tipo === 'individual' ? managerDocId : `grupal__${scopeKey}`)]);
      const matchingPayments = payments.docs.filter(snap => {
        const payment = snap.data();
        return [snap.id, payment.liquidacionKey, payment.equipoKey].some(value => aliases.has(key(value))) ||
          (tipo === 'individual' && payment.managerId === managerDocId);
      });
      if (matchingPayments.some(snap => {
        const payment = snap.data();
        return ['pagado', 'pagada', 'liquidado', 'liquidada', 'procesando', 'paid'].includes(key(payment.estado)) ||
          ((payment.fechaPago || payment.pagadoPorEmail) && key(payment.estado) !== 'pendiente') ||
          (!superior && (payment.fechaPago || payment.pagadoPorEmail || payment.reversadoDeFechaPago));
      })) {
        fail('failed-precondition', 'La llamada pertenece a una liquidación pagada o procesada. Solicita revisión a Finanzas o Dirección; no se modificó ningún dato.');
      }
      const occurredAtIso = new Date().toISOString();
      const correction = { operationId, action, motivo: text(motivo), actorEmail: actor.email, actorUid: actor.uid, occurredAtIso };
      const patch = {
        ...(action === 'editar' ? changes : { estadoRegistro: action === 'anular' ? 'anulada' : 'activa' }),
        ...('asistio' in changes ? { llamadaEfectiva: changes.asistio } : {}),
        revision: (before.revision || 0) + 1, ultimaCorreccion: correction,
      };
      const affectsSettlement = action !== 'editar' ||
        ('asistio' in changes && effectiveIndividual(before) !== changes.asistio);
      if (before.afectaLiquidacion || affectsSettlement) patch.afectaLiquidacion = true;
      const after = { ...before, ...patch };
      const memberChanges = members.map(snap => {
        const data = snap.data();
        const matches = data.llamadasHistorial.filter(call => call.id === callId);
        if (matches.length !== 1) fail('failed-precondition', 'Una copia no tiene identidad única. Solicita conciliación a Dirección.');
        const history = data.llamadasHistorial.map(call => call.id === callId
          ? { ...call, ...patch, revision: (call.revision || 0) + 1 } : call);
        return { snap, history, before: matches[0], after: history.find(call => call.id === callId) };
      });
      const callsBefore = tipo === 'individual' ? source.llamadasHistorial.filter(call => call.tipo !== 'grupal') :
        groupHistory.docs.filter(snap => key(snap.data().equipoKey) === key(scopeKey)).map(snap => snap.data());
      const relevantCalls = tipo === 'individual' ? memberChanges[0].history.filter(call => call.tipo !== 'grupal') :
        groupHistory.docs.filter(snap => key(snap.data().equipoKey) === key(scopeKey))
          .map(snap => snap.id === callId ? after : snap.data());
      const count = relevantCalls.filter(activeCall).length;
      const effective = call => activeCall(call) && (tipo === 'grupal' ? call.asistieron > 0 : effectiveIndividual(call));
      const effectiveCount = relevantCalls.filter(effective).length;
      const previousEffectiveCount = callsBefore.filter(effective).length;
      for (const change of memberChanges) {
        tx.update(change.snap.ref, { llamadasHistorial: change.history, ...summarize(change.history) });
      }
      if (tipo === 'grupal') tx.update(sourceRef, patch);
      const paymentChanges = [];
      for (const payment of matchingPayments) {
        const data = payment.data();
        const amount = Number(data.montoUSD ?? data.monto ?? previousEffectiveCount * 25);
        if (affectsSettlement && key(data.estado) === 'pendiente' &&
            ((data.tarifaPorLlamada && Number(data.tarifaPorLlamada) !== 25) ||
              !Number.isFinite(amount) || amount !== previousEffectiveCount * 25)) {
          fail('failed-precondition', 'La liquidación usa una tarifa histórica distinta. Finanzas debe conciliarla antes de corregir.');
        }
        if (affectsSettlement && key(data.estado) === 'pendiente') {
          const paymentPatch = {
            montoUSD: effectiveCount * 25, monto: effectiveCount * 25,
            llamadasAlPagar: count, llamadasEfectivas: effectiveCount,
            callCorrectionId: operationId,
          };
          paymentChanges.push({ paymentDocId: payment.id, before: payment.data(), patch: paymentPatch });
          tx.update(payment.ref, { ...paymentPatch, updatedAt: FieldValue.serverTimestamp() });
        }
      }
      if (paymentChanges.length) {
        tx.create(db.collection('finanzas_audit_trail').doc(operationId), {
          action: 'CORREGIR_LLAMADA_PENDIENTE', operationId, actorEmail: actor.email,
          timestamp: FieldValue.serverTimestamp(), occurredAtIso, paymentChanges,
        });
      }
      tx.create(ledgerRef, {
        tipo, callId, managerDocId, scopeKey, action, motivo: text(motivo), actorUid: actor.uid,
        actorEmail: actor.email, actorName: actor.name, occurredAtIso,
        timestamp: FieldValue.serverTimestamp(), fingerprint, before, after,
        members: memberChanges.map(change => ({ managerDocId: change.snap.id, before: change.before, after: change.after })),
      });
      recordAuditEvent(tx, db, operationId, actor, {
        operationId, tipo, callId, managerDocId, action, motivo: text(motivo), before, after,
      }, FieldValue.serverTimestamp());
      return { ok: true, operationId, alreadyApplied: false };
    });
  };
}

module.exports = { createCorrectCall, activeCall, isAssigned, summarize };
