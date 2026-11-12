import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import nodemailer from 'nodemailer';

initializeApp();
const db = getFirestore();

const mailUser = defineSecret('IMO_MAIL_USER');
const mailPass = defineSecret('IMO_MAIL_PASS');

const INSTANT_MAIL_TYPES = new Set([
  'contrato_maestria_confirmacion',
  'contrato_fuego_confirmacion',
  'contract_confirmation',
  'system_access_invite',
  'imo_welcome'
]);

const MAIL_CLAIM_LEASE_MS = 10 * 60 * 1000;

export const deliverContractMail = onDocumentCreated(
  {
    region: 'us-central1',
    maxInstances: 4,
    minInstances: 0,
    memory: '256MiB',
    cpu: 'gcf_gen1',
    concurrency: 1,
    timeoutSeconds: 60,
    document: 'mail/{mailId}',
    secrets: [mailUser, mailPass],
    retry: false
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const initialData = snap.data() || {};

    // Solo despachar en tiempo real correos transaccionales/contratos directos sin taskId
    // (los correos ligados a tareas siguen por mailerDaemon.js para respetar presupuestos diarios y cierres).
    const hasTaskBinding = Boolean(initialData.taskId || initialData.calendarEvent?.taskId || initialData.linkedTaskIds);
    const isInstantType =
      INSTANT_MAIL_TYPES.has(initialData.type) ||
      Boolean(
        !hasTaskBinding &&
          initialData.message?.subject &&
          (initialData.message.subject.includes('Caminata sobre Fuego') ||
            initialData.message.subject.includes('Maestría del Juego'))
      );

    if (!isInstantType || hasTaskBinding) return;

    const ref = snap.ref;
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    const claimedData = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      if (!fresh.exists) return null;
      const d = fresh.data() || {};
      const state = d.delivery?.state;
      if (state && state !== 'PENDING') return null;

      const attempts = Number.isInteger(d.delivery?.attemptCount) ? d.delivery.attemptCount : 0;
      tx.update(ref, {
        'delivery.state': 'SENDING',
        'delivery.attemptCount': attempts + 1,
        'delivery.startTime': nowIso,
        'delivery.leaseExpiresAt': new Date(now + MAIL_CLAIM_LEASE_MS).toISOString(),
        'delivery.nextAttemptAt': null
      });
      return d;
    });

    if (!claimedData) return;

    const rawToList = Array.isArray(claimedData.to) ? claimedData.to : [claimedData.to];
    const validRecipients = rawToList
      .filter(Boolean)
      .map((addr) =>
        String(addr)
          .trim()
          .toLowerCase()
          .replace('@crearpls.com', '@crearpsl.net')
      )
      .filter((addr) => addr.includes('@'));

    if (validRecipients.length === 0) {
      await ref.update({
        'delivery.state': 'REJECTED',
        'delivery.endTime': new Date().toISOString(),
        'delivery.reason': 'Destinatario inválido o vacío'
      });
      return;
    }

    try {
      const senderEmail = mailUser.value();
      const transport = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        family: 4,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        auth: {
          user: senderEmail,
          pass: mailPass.value()
        }
      });

      const mailOptions = {
        from: `"CREAR PODER SIN LÍMITES" <${senderEmail}>`,
        to: validRecipients,
        subject: claimedData.message?.subject || 'Confirmación Oficial — CREAR PODER SIN LÍMITES',
        html: claimedData.message?.html || '<p>Confirmación oficial registrada.</p>'
      };

      if (claimedData.cc) {
        mailOptions.cc = Array.isArray(claimedData.cc) ? claimedData.cc : [claimedData.cc];
      }

      const attachments = claimedData.message?.attachments || claimedData.attachments;
      if (Array.isArray(attachments) && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      const info = await transport.sendMail(mailOptions);

      await ref.update({
        'delivery.state': 'SUCCESS',
        'delivery.endTime': new Date().toISOString(),
        'delivery.dispatchedBy': 'cloud_function_realtime',
        'delivery.info': {
          messageId: info?.messageId || null,
          accepted: info?.accepted || [],
          rejected: info?.rejected || []
        }
      });
    } catch (err) {
      await ref.update({
        'delivery.state': 'ERROR',
        'delivery.endTime': new Date().toISOString(),
        'delivery.nextAttemptAt': new Date(Date.now() + 60 * 1000).toISOString(),
        'delivery.error': String(err?.message || 'SMTP_ERROR')
      });
    }
  }
);
