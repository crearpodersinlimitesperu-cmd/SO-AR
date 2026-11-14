import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyContractAndNodus } from '../scripts/sendMaestriaLimaSaturdayEnrollmentMail.mjs';
import {
  buildMaestriaLeaderEmail,
  buildMaestriaParticipantEmail,
} from '../scripts/maestriaLimaSaturdayMailTemplates.mjs';

test('excluye desertores, bajas, ausentes y sin registro en Nodus', () => {
  assert.equal(classifyContractAndNodus({ rol: 'Participante' }, null, 32).action, 'exclude');
  assert.equal(
    classifyContractAndNodus({ rol: 'Participante' }, { desertor: true, asistenciaMJ: 'Asistió' }, 32).reason,
    'DESERTOR_O_BAJA'
  );
  assert.equal(
    classifyContractAndNodus({ rol: 'Manager', estado: 'baja' }, { rol: 'Manager', asistenciaMJ: 'Asistió' }, 32).reason,
    'DESERTOR_O_BAJA'
  );
  assert.equal(
    classifyContractAndNodus({ rol: 'Participante' }, { rol: 'Participante', asistenciaMJ: 'No asistió' }, 32).reason,
    'SIN_ASISTENCIA_NODUS'
  );
});

test('excluye staff interno, otros equipos y conflictos de rol entre contrato y Nodus', () => {
  assert.equal(
    classifyContractAndNodus({ rol: 'Entrenador' }, { rol: 'Entrenador', asistenciaMJ: 'Asistió' }, 32).action,
    'exclude'
  );
  assert.equal(
    classifyContractAndNodus({ rol: 'Participante', equipoCohorte: 'Equipo 30' }, { rol: 'Participante', asistenciaMJ: 'Asistió' }, 32).action,
    'exclude'
  );
  const conflict = classifyContractAndNodus(
    { rol: 'Participante', equipoCohorte: 'Equipo 32' },
    { rol: 'Manager', asistenciaMJ: 'Asistió' },
    32
  );
  assert.equal(conflict.action, 'exclude');
  assert.match(conflict.reason, /CONFLICTO_ROL/);
});

test('clasifica correctamente Managers, Capitanes y Participantes activos', () => {
  const manager = classifyContractAndNodus(
    { rol: 'Manager', equipoCohorte: 'Equipo 32' },
    { rol: 'Manager', asistenciaMJ: 'Asistió' },
    32
  );
  assert.deepEqual(manager, { action: 'send', segment: 'leader', roleLabel: 'Manager' });

  const capitan = classifyContractAndNodus(
    { rol: 'Capitán', equipoCohorte: 'Equipo 32' },
    { rol: 'Capitan', asistenciaMJ: 'Asistió' },
    32
  );
  assert.deepEqual(capitan, { action: 'send', segment: 'leader', roleLabel: 'Capitán' });

  const participant = classifyContractAndNodus(
    { rol: 'Participante', equipoCohorte: 'Equipo 32' },
    { rol: 'Participante', asistenciaMJ: 'Asistió' },
    32
  );
  assert.deepEqual(participant, { action: 'send', segment: 'participant', roleLabel: 'Participante' });
});

test('plantillas usan links reales de pago, Nodus, WhatsApp de Joyce/Diana y lenguaje de Creación', () => {
  const leader = buildMaestriaLeaderEmail({ recipientName: 'Andrea Mendoza', roleLabel: 'Manager', config: { teamNumber: 33 } });
  assert.ok(leader.html.includes('https://express.culqi.com/pago/UWQZ951G41'));
  assert.ok(!leader.html.includes('50FZYQ87V0'));
  assert.ok(leader.html.includes('https://wa.me/51933599903'));
  assert.ok(leader.html.includes('https://wa.me/51912379744'));
  assert.ok(leader.html.includes('Nodus'));
  assert.ok(!/transforma/i.test(leader.html));

  const participant = buildMaestriaParticipantEmail({ recipientName: 'Carlos Paredes', config: { teamNumber: 33 } });
  assert.ok(participant.html.includes('https://express.culqi.com/pago/50FZYQ87V0'));
  assert.ok(participant.html.includes('https://express.culqi.com/pago/U7K3CBISZX'));
  assert.ok(!participant.html.includes('UWQZ951G41'));
  assert.ok(participant.html.includes('https://wa.me/51933599903'));
  assert.ok(participant.html.includes('https://wa.me/51912379744'));
  assert.ok(!/invitado|enrolamiento|enrolado|transforma|\bIMO\b/i.test(participant.subject + participant.html.replace(/https:\/\/imo\.crearpslglobal\.com\/registro\/ciudad\/lima|imo\.crearpslglobal\.com\/registro\/ciudad\/lima/g, '')));
});
