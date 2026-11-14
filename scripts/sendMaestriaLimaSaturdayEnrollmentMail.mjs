/**
 * Envío automático de los sábados de Maestría en Lima (9:00 AM hora Lima).
 * Cruza `contratos_maestria_lima` (Firestore) con la asistencia actual en Nodus,
 * excluye desertores/bajas/inactivos/staff interno, detecta el Capítulo Uno vigente
 * para enrolamiento y resuelve los WhatsApps de Joyce y Diana desde el directorio.
 *
 * Uso:
 *   node scripts/sendMaestriaLimaSaturdayEnrollmentMail.mjs --dry-run [--force]
 *   node scripts/sendMaestriaLimaSaturdayEnrollmentMail.mjs --send [--force]
 */

import fs from 'node:fs';
import path from 'node:path';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import {
  buildMaestriaLeaderEmail,
  buildMaestriaParticipantEmail,
} from './maestriaLimaSaturdayMailTemplates.mjs';

const NODUS_WORKER_BASE =
  process.env.NODUS_WORKER_BASE || 'https://nodus-json-worker.crearpodersinlimitesperu.workers.dev';
const LOG_COLLECTION = 'maestria_saturday_enrollment_logs';

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    send: args.has('--send'),
    dryRun: !args.has('--send') || args.has('--dry-run'),
    force: args.has('--force'),
  };
}

function initFirebaseAdmin() {
  if (admin.apps.length > 0) return admin.firestore();
  const envJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const candidateFiles = [
    path.resolve(process.cwd(), 'centro-operativo-cpsl-65ad52160f45.json'),
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
  ];
  let credObj = null;
  if (envJson && envJson.trim().startsWith('{')) {
    credObj = JSON.parse(envJson);
  } else {
    for (const file of candidateFiles) {
      if (fs.existsSync(file)) {
        credObj = JSON.parse(fs.readFileSync(file, 'utf8'));
        break;
      }
    }
  }
  if (!credObj) {
    throw new Error('No se encontró GOOGLE_SERVICE_ACCOUNT_JSON ni archivo de Service Account local.');
  }
  admin.initializeApp({ credential: admin.credential.cert(credObj) });
  return admin.firestore();
}

function getLimaNowParts() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday, // e.g. 'Sat'
    isSaturday: parts.weekday === 'Sat',
  };
}

function normalizeStr(val) {
  return String(val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeDni(val) {
  return String(val || '').replace(/[^0-9a-zA-Z]/g, '').trim().toUpperCase();
}

function extractTeamNumber(nameOrId) {
  const m = String(nameOrId || '').match(/(\d{2,3})/);
  return m ? Number(m[1]) : null;
}

function normalizePeruPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('51') && digits.length >= 11) return digits;
  if (digits.length === 9 && digits.startsWith('9')) return `51${digits}`;
  return digits.length >= 9 ? digits : null;
}

async function resolveDirectoryContacts(db) {
  const [qtSnap, usersSnap, profilesSnap] = await Promise.all([
    db.collection('qt_directory').get(),
    db.collection('users').get(),
    db.collection('user_profiles').get(),
  ]);
  const allDocs = [
    ...qtSnap.docs.map((d) => d.data()),
    ...usersSnap.docs.map((d) => d.data()),
    ...profilesSnap.docs.map((d) => d.data()),
  ];

  const findPhone = (patterns) => {
    for (const u of allDocs) {
      const hay = normalizeStr(`${u.nombre || ''} ${u.name || ''} ${u.displayName || ''} ${u.email || ''}`);
      if (patterns.some((p) => hay.includes(p))) {
        const phone = normalizePeruPhone(u.whatsapp || u.telefono || u.phone || u.celular || u.whatsappUrl);
        if (phone) return phone;
      }
    }
    return null;
  };

  const joycePhone = findPhone(['joyce.marin', 'joyce marin', 'joyce']);
  const dianaPhone = findPhone(['diana.moscoso', 'diana moscoso', 'diana']);
  return { joycePhone, dianaPhone };
}

async function resolveLimaCycleAndTeam(db, todayLima) {
  const snap = await db.collection('cycles').get();
  const cycles = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => !c.sede || normalizeStr(c.sede).includes('lima'));

  const activeMaestria = cycles.find(
    (c) => c.maestria_start && c.maestria_end && todayLima >= c.maestria_start && todayLima <= c.maestria_end
  );

  // Capítulo Uno vigente para enrolamiento: próximo C1 con c1_start >= hoy (ordenado ascendente)
  const upcomingC1 = cycles
    .filter((c) => c.c1_start && c.c1_start >= todayLima)
    .sort((a, b) => String(a.c1_start).localeCompare(String(b.c1_start)))[0];

  let teamNumber = extractTeamNumber(upcomingC1?.name || upcomingC1?.id);
  if (!teamNumber && activeMaestria) {
    const mjNum = extractTeamNumber(activeMaestria.name || activeMaestria.id);
    if (mjNum) teamNumber = mjNum + 1;
  }
  if (!teamNumber) {
    const maxNum = cycles.reduce((acc, c) => Math.max(acc, extractTeamNumber(c.name || c.id) || 0), 32);
    teamNumber = maxNum + 1;
  }

  return {
    isMaestriaDay: Boolean(activeMaestria),
    activeMaestria,
    teamNumber,
  };
}

async function fetchNodusMaestriaData(dnis) {
  const [mjResp, batchResp] = await Promise.all([
    fetch(`${NODUS_WORKER_BASE}/nodus-json/maestria-lima`),
    dnis.length > 0
      ? fetch(`${NODUS_WORKER_BASE}/nodus-json/participantes-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentos: dnis }),
        })
      : Promise.resolve(null),
  ]);

  const mjData = mjResp.ok ? await mjResp.json() : null;
  if (!mjResp.ok) {
    throw new Error(`Fallo crítico consultando Nodus maestria-lima (${mjResp.status}): abortando para no enviar sin cruce.`);
  }
  if (dnis.length > 0 && (!batchResp || !batchResp.ok)) {
    throw new Error(`Fallo crítico consultando Nodus participantes-batch (${batchResp?.status || 'network'}): abortando para no enviar sin cruce.`);
  }
  const batchData = batchResp ? await batchResp.json() : {};
  return { mjData, batchByDoc: batchData?.participantes || batchData?.data || {} };
}

function resolveRoleCategory(rawRole) {
  const r = normalizeStr(rawRole);
  if (!r) return 'unknown';
  if (/(entrenador|staff|oficina|coordinador|gerente|director)/.test(r)) return 'staff';
  if (r.includes('manager')) return 'manager';
  if (r.includes('capitan')) return 'capitan';
  if (r.includes('participante') || r.includes('enrolado')) return 'participante';
  return 'unknown';
}

export function classifyContractAndNodus(contract, nodusRecord, activeMaestriaTeamNumber = null) {
  if (!nodusRecord) {
    return { action: 'exclude', reason: 'SIN_REGISTRO_ACTIVO_NODUS' };
  }

  if (activeMaestriaTeamNumber) {
    const contractTeam = extractTeamNumber(contract.equipo || contract.equipoCohorte || contract.cohorte);
    if (contractTeam && contractTeam !== activeMaestriaTeamNumber) {
      return { action: 'exclude', reason: `OTRO_EQUIPO_CONTRATO (Eq.${contractTeam} != Eq.${activeMaestriaTeamNumber})` };
    }
  }

  const statusText = normalizeStr(
    `${contract.estado || ''} ${contract.status || ''} ${nodusRecord?.estado || ''} ${nodusRecord?.situacion || ''} ${nodusRecord?.estatus || ''}`
  );
  if (/(desert|baja|retir|inactiv|anulad|suspend)/.test(statusText) || nodusRecord?.desertor === true) {
    return { action: 'exclude', reason: 'DESERTOR_O_BAJA' };
  }

  // Verificar asistencia actual en Nodus
  const asistText = normalizeStr(
    `${nodusRecord.asistenciaMJ || ''} ${nodusRecord.asistencia || ''} ${nodusRecord.estadoMJ || ''}`
  );
  if (asistText.includes('no asist') || asistText.includes('ausente') || asistText.includes('inasist')) {
    return { action: 'exclude', reason: 'SIN_ASISTENCIA_NODUS' };
  }

  const contractRoleRaw = String(contract.rol || contract.rolActividad || '').trim();
  const nodusRoleRaw = String(nodusRecord.rol || nodusRecord.rolMJ || nodusRecord.tipo || '').trim();
  const contractCat = resolveRoleCategory(contractRoleRaw);
  const nodusCat = resolveRoleCategory(nodusRoleRaw);

  if (contractCat === 'staff' || nodusCat === 'staff') {
    return { action: 'exclude', reason: `STAFF_INTERNO (${contractRoleRaw || nodusRoleRaw})` };
  }

  // Si ambas fuentes tienen rol explícito y pertenecen a segmentos distintos (líder vs participante), excluir por conflicto
  const contractIsLeader = contractCat === 'manager' || contractCat === 'capitan';
  const nodusIsLeader = nodusCat === 'manager' || nodusCat === 'capitan';
  if (
    contractCat !== 'unknown' &&
    nodusCat !== 'unknown' &&
    contractIsLeader !== nodusIsLeader
  ) {
    return {
      action: 'exclude',
      reason: `CONFLICTO_ROL (Contrato:${contractRoleRaw} vs Nodus:${nodusRoleRaw})`,
    };
  }

  const finalCat = contractCat !== 'unknown' ? contractCat : nodusCat;
  if (finalCat === 'manager') {
    return { action: 'send', segment: 'leader', roleLabel: 'Manager' };
  }
  if (finalCat === 'capitan') {
    return { action: 'send', segment: 'leader', roleLabel: 'Capitán' };
  }
  return { action: 'send', segment: 'participant', roleLabel: 'Participante' };
}

async function run() {
  const opts = parseArgs(process.argv);
  const db = initFirebaseAdmin();
  const lima = getLimaNowParts();
  const cycleInfo = await resolveLimaCycleAndTeam(db, lima.dateStr);

  console.log(`📅 Fecha Lima: ${lima.dateStr} (${lima.weekday}) | Es Maestría hoy: ${cycleInfo.isMaestriaDay ? 'SÍ' : 'NO'} | Equipo C1 vigente: Equipo ${cycleInfo.teamNumber}`);

  if (!opts.force && (!lima.isSaturday || !cycleInfo.isMaestriaDay)) {
    console.log('⏭️ Hoy no corresponde a un sábado oficial de Maestría en Lima. Saliendo sin enviar.');
    return;
  }

  const [{ joycePhone, dianaPhone }, contractsSnap, logsSnap] = await Promise.all([
    resolveDirectoryContacts(db),
    db.collection('contratos_maestria_lima').get(),
    db.collection(LOG_COLLECTION).where('dateStr', '==', lima.dateStr).get(),
  ]);

  const alreadySentEmails = new Set(logsSnap.docs.map((d) => normalizeStr(d.data()?.email)));
  const contracts = contractsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const uniqueDnis = [...new Set(contracts.map((c) => normalizeDni(c.identificacion || c.dni || c.documento)).filter(Boolean))];

  const { batchByDoc } = await fetchNodusMaestriaData(uniqueDnis);

  const seenEmails = new Set();
  const leaders = [];
  const participants = [];
  const excluded = [];

  const activeMaestriaTeamNumber = cycleInfo.activeMaestria
    ? extractTeamNumber(cycleInfo.activeMaestria.name || cycleInfo.activeMaestria.id)
    : null;

  for (const c of contracts) {
    const email = normalizeStr(c.email || c.correo);
    const name = String(c.nombreCompleto || c.nombre || c.participante || '').trim();
    const dni = normalizeDni(c.identificacion || c.dni || c.documento);

    if (!email || !email.includes('@')) {
      excluded.push({ name, email: '(sin email)', reason: 'SIN_EMAIL' });
      continue;
    }
    if (seenEmails.has(email)) {
      excluded.push({ name, email, reason: 'DUPLICADO_CONTRATO' });
      continue;
    }
    seenEmails.add(email);

    if (alreadySentEmails.has(email)) {
      excluded.push({ name, email, reason: 'YA_ENVIADO_HOY' });
      continue;
    }

    const nodusRecord = dni ? batchByDoc[dni] || null : null;
    const decision = classifyContractAndNodus(c, nodusRecord, activeMaestriaTeamNumber);
    if (decision.action === 'exclude') {
      excluded.push({ name, email, reason: decision.reason });
      continue;
    }

    const target = { name, email, dni, roleLabel: decision.roleLabel, segment: decision.segment };
    if (decision.segment === 'leader') leaders.push(target);
    else participants.push(target);
  }

  console.log(`\n📊 RESUMEN DE AUDITORÍA (${opts.dryRun ? 'DRY-RUN / SIMULACIÓN' : 'ENVÍO REAL'}):`);
  console.log(`   📱 WhatsApp Joyce: ${joycePhone || 'NO ENCONTRADO EN DIRECTORIO'}`);
  console.log(`   📱 WhatsApp Diana: ${dianaPhone || 'NO ENCONTRADO EN DIRECTORIO'}`);
  console.log(`   👑 Líderes (Managers/Capitanes · S/ 505): ${leaders.length}`);
  console.log(`   ✨ Participantes (S/ 900 / S/ 720): ${participants.length}`);
  console.log(`   🛡️ Excluidos (Desertores / Staff / Duplicados): ${excluded.length}`);

  if (opts.dryRun) {
    console.log('\n👑 Muestra Líderes:', leaders.slice(0, 10));
    console.log('✨ Muestra Participantes:', participants.slice(0, 10));
    console.log('🛡️ Muestra Excluidos:', excluded.slice(0, 15));
    return;
  }

  const gmailUser = process.env.LIMA_GMAIL_USER;
  const gmailPass = process.env.LIMA_GMAIL_PASS;
  if (!gmailUser || !gmailPass) {
    throw new Error('Faltan LIMA_GMAIL_USER o LIMA_GMAIL_PASS para realizar el envío real.');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  });

  const mailConfig = {
    teamNumber: cycleInfo.teamNumber,
    ...(joycePhone
      ? { joyceWhatsappUrl: `https://wa.me/${joycePhone}?text=${encodeURIComponent('Hola Joyce, te escribo desde Maestría Lima por una inscripción al Capítulo Uno.')}` }
      : {}),
    ...(dianaPhone
      ? { dianaWhatsappUrl: `https://wa.me/${dianaPhone}?text=${encodeURIComponent('Hola Diana, te escribo desde Maestría Lima por una inscripción al Capítulo Uno.')}` }
      : {}),
  };

  let sentCount = 0;
  for (const person of [...leaders, ...participants]) {
    const built =
      person.segment === 'leader'
        ? buildMaestriaLeaderEmail({ recipientName: person.name, roleLabel: person.roleLabel, config: mailConfig })
        : buildMaestriaParticipantEmail({ recipientName: person.name, config: mailConfig });

    await transporter.sendMail({
      from: `"Maestría Lima · CREAR Poder Sin Límites" <${gmailUser}>`,
      to: person.email,
      subject: built.subject,
      html: built.html,
    });

    await db
      .collection(LOG_COLLECTION)
      .doc(`${lima.dateStr}_${person.email.replace(/[^a-z0-9]/g, '_')}`)
      .set({
        dateStr: lima.dateStr,
        email: person.email,
        name: person.name,
        segment: person.segment,
        roleLabel: person.roleLabel,
        teamNumber: cycleInfo.teamNumber,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    sentCount++;
  }

  console.log(`\n✅ Envío completado: ${sentCount} correos enviados desde ${gmailUser}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error('❌ Error en sendMaestriaLimaSaturdayEnrollmentMail:', err);
    process.exit(1);
  });
}
