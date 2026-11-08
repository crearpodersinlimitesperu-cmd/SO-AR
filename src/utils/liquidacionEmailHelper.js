/**
 * src/utils/liquidacionEmailHelper.js
 * 
 * Generador y orquestador de autorización de pagos para Elizabeth Escobar (CFO / Finanzas Global)
 * y notificaciones en Causa OS al liquidar entrenadores de llamadas (grupales o individuales).
 */

export const ELI_ESCOBAR_EMAIL = 'contabilidad.global@crearpsl.net';
export const FEE_PER_EFFECTIVE_CALL_USD = 25;
export const FEE_PER_GROUP_TEAM_USD = 400;

/**
 * Agrupa los ítems de liquidación seleccionados por entrenador.
 */
export function groupItemsByTrainer(items = []) {
  const groups = new Map();
  for (const it of items) {
    if (!it) continue;
    const trainer = (it.entrenador || 'Sin Asignar').trim();
    if (!groups.has(trainer)) {
      groups.set(trainer, []);
    }
    groups.get(trainer).push(it);
  }
  return groups;
}

/**
 * Genera el cuerpo de texto y HTML para el correo de autorización a Eli Escobar.
 */
export function buildLiquidacionEmailData({
  trainerName,
  trainerEmail = '',
  items = [],
  authorizerUser = {}
}) {
  const cleanTrainer = (trainerName || 'Entrenador de Llamadas').trim();
  const totalMontoUSD = items.reduce((acc, it) => {
    if (it.esPagable === false) return acc;
    const val = it.montoUSD !== undefined ? Number(it.montoUSD) : (it.tipo === 'individual' ? FEE_PER_EFFECTIVE_CALL_USD : FEE_PER_GROUP_TEAM_USD);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);
  const authorizerName = authorizerUser?.name || authorizerUser?.displayName || 'Dirección / Gerencia Operativa';
  const authorizerEmail = authorizerUser?.email || 'direccion@crearpsl.net';
  const authorizerRole = authorizerUser?.appRole || 'Coordinación Operativa';
  const todayStr = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const subject = `AUTORIZACIÓN DE PAGO: Liquidación de Llamadas a Managers — ${cleanTrainer} ($${totalMontoUSD} USD)`;

  const fechaISO = new Date().toISOString().split('T')[0];

  // Filas en texto plano
  const itemsText = items.map((it, idx) => {
    const modalidad = it.tipo === 'individual' ? 'Individual (1 a 1)' : 'Grupal (Equipo)';
    const destinatario = it.tipo === 'individual' ? (it.participanteNombre || 'Manager') : `${it.equipo || 'Equipo'}${it.numEquipo ? ` (#${it.numEquipo})` : ''}`;
    const sede = it.sede || 'Global';
    const entrenador = (it.entrenador || cleanTrainer);
    const itemMonto = it.montoUSD !== undefined ? Number(it.montoUSD) : (it.tipo === 'individual' ? FEE_PER_EFFECTIVE_CALL_USD : FEE_PER_GROUP_TEAM_USD);
    const monto = it.esPagable === false ? '$0 USD (Sin desembolso)' : `$${itemMonto} USD`;
    const autorizadoEl = it.fechaAutorizacion || it.fechaPago || fechaISO;
    const autorizadoPor = it.autorizadoPorNombre || authorizerName;
    return `  ${idx + 1}. [${modalidad}] Destinatario: ${destinatario} | Sede: ${sede} | Entrenador: ${entrenador} | Monto: ${monto} | Autorizado el: ${autorizadoEl} | Autorizado por: ${autorizadoPor}`;
  }).join('\n');

  // Filas en HTML
  const itemsHtml = items.map((it, idx) => {
    const modalidad = it.tipo === 'individual' 
      ? '<span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">👤 Individual</span>' 
      : '<span style="background: #f3e8ff; color: #6b21a8; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">👥 Grupal</span>';
    const destinatario = it.tipo === 'individual' ? `<strong>${it.participanteNombre || 'Manager'}</strong>` : `<strong>${it.equipo || 'Equipo'}</strong>${it.numEquipo ? ` (#${it.numEquipo})` : ''}`;
    const sede = it.sede || 'Global';
    const entrenador = (it.entrenador || cleanTrainer);
    const itemMonto = it.montoUSD !== undefined ? Number(it.montoUSD) : (it.tipo === 'individual' ? FEE_PER_EFFECTIVE_CALL_USD : FEE_PER_GROUP_TEAM_USD);
    const monto = it.esPagable === false ? '<span style="color: #64748b; font-weight: 700;">$0 USD (Sin desembolso)</span>' : `<strong style="color: #059669;">$${itemMonto} USD</strong>`;
    const autorizadoEl = it.fechaAutorizacion || it.fechaPago || fechaISO;
    const autorizadoPor = it.autorizadoPorNombre || authorizerName;
    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <td style="padding: 10px 12px; text-align: center;">${modalidad}</td>
        <td style="padding: 10px 12px; color: #1e293b;">${destinatario}</td>
        <td style="padding: 10px 12px; color: #475569;">${sede}</td>
        <td style="padding: 10px 12px; color: #475569;">${entrenador}</td>
        <td style="padding: 10px 12px; text-align: right;">${monto}</td>
        <td style="padding: 10px 12px; text-align: center; color: #64748b;">${autorizadoEl}</td>
        <td style="padding: 10px 12px; color: #64748b;">${autorizadoPor}</td>
      </tr>
    `;
  }).join('');

  const textBody = `Estimada Eli Escobar,
Finanzas y Contabilidad Global
Crear Poder Sin Límites (CPSL)

Por medio del presente correo, se emite la AUTORIZACIÓN FORMAL DE PAGO correspondiente a la liquidación de llamadas de acompañamiento a Managers, debidamente registrada y conciliada en la plataforma Causa OS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATOS DEL BENEFICIARIO Y LIQUIDACIÓN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Entrenador: ${cleanTrainer}${trainerEmail ? `\n• Correo del Entrenador: ${trainerEmail}` : ''}
• Concepto: Liquidación de Llamadas Efectivas a Equipos de Managers
• Tarifa Aplicada: Tarifa oficial fija de Causa OS ($25 USD por llamada efectiva / equipo)
• Total de Registros Autorizados: ${items.length}
• MONTO TOTAL AUTORIZADO: $${totalMontoUSD} USD

DESGLOSE DETALLADO DE EQUIPOS / LLAMADAS:
${itemsText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTADO EN PLATAFORMA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Validado en el Centro de Managers (Causa OS).
✓ Cumplimiento de registros y acompañamiento verificado.
✓ Notificación registrada en el sistema Causa OS para trazabilidad y auditoría.

Por favor proceder con la transferencia bancaria / desembolso correspondiente y registrar el comprobante.

Atentamente,

${authorizerName}
${authorizerRole} | Crear Poder Sin Límites
Correo: ${authorizerEmail}
Fecha: ${todayStr}
Plataforma: Causa OS — Centro Operativo CPSL
`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .card { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; padding: 24px; border-bottom: 3px solid #10b981; }
    .header h2 { margin: 0 0 6px 0; font-size: 20px; color: #f8fafc; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 13px; color: #94a3b8; }
    .content { padding: 24px; font-size: 14px; line-height: 1.6; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 18px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f1f5f9; padding: 8px 12px; font-size: 12px; text-transform: uppercase; color: #475569; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
    .total-row { background: #ecfdf5; font-size: 15px; font-weight: 800; color: #065f46; }
    .footer { background: #f8fafc; padding: 18px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">💰 AUTORIZACIÓN DE PAGO</span>
      <h2 style="margin-top: 10px;">Liquidación de Acompañamiento a Managers</h2>
      <p>Crear Poder Sin Límites — Plataforma Causa OS</p>
    </div>
    <div class="content">
      <p>Estimada <strong>Nancy Elizabeth Escobar Pérez</strong> (Eli Escobar),<br>
      Finanzas y Contabilidad Global CPSL,</p>

      <p>Por medio del presente comunicado formal generado desde <strong>Causa OS</strong>, se autoriza el pago por concepto de llamadas de acompañamiento a Managers correspondientes a los siguientes equipos y sedes:</p>

      <div class="box">
        <table style="margin: 0; font-size: 13px;">
          <tr>
            <td style="padding: 4px 0; color: #64748b; width: 140px;"><strong>Entrenador:</strong></td>
            <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">${cleanTrainer}</td>
          </tr>
          ${trainerEmail ? `
          <tr>
            <td style="padding: 4px 0; color: #64748b;"><strong>Correo:</strong></td>
            <td style="padding: 4px 0; color: #2563eb;">${trainerEmail}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 4px 0; color: #64748b;"><strong>Tarifa por llamada:</strong></td>
            <td style="padding: 4px 0;">$${FEE_PER_EFFECTIVE_CALL_USD} USD (Tarifa fija oficial)</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;"><strong>Total a desembolsar:</strong></td>
            <td style="padding: 4px 0; font-size: 16px; font-weight: 800; color: #059669;">$${totalMontoUSD} USD</td>
          </tr>
        </table>
      </div>

      <h4 style="margin: 18px 0 8px 0; color: #0f172a; font-size: 14px;">Detalle de Equipos / Llamadas Liquidadas:</h4>
      <table>
        <thead>
          <tr>
            <th style="text-align: center; width: 95px;">Modalidad</th>
            <th style="text-align: left;">Destinatario</th>
            <th style="text-align: left;">Sede</th>
            <th style="text-align: left;">Entrenador</th>
            <th style="text-align: right;">Monto</th>
            <th style="text-align: center;">Autorizado el</th>
            <th style="text-align: left;">Autorizado por</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          <tr class="total-row">
            <td colspan="4" style="padding: 12px; text-align: right;">TOTAL GENERAL AUTORIZADO:</td>
            <td style="padding: 12px; text-align: right;">$${totalMontoUSD} USD</td>
            <td colspan="2" style="padding: 12px; font-size: 11px; text-align: center; color: #047857;">Validado Causa OS</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 20px; padding: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 13px; color: #1e40af;">
        ℹ️ <strong>Trazabilidad en Causa OS:</strong> Los registros han sido validados en el Centro de Managers y marcados como liquidados bajo la sesión oficial de <strong>${authorizerName}</strong> (${authorizerEmail}).
      </div>
    </div>
    <div class="footer">
      <strong>Autorizado por:</strong> ${authorizerName} (${authorizerRole})<br>
      <strong>Fecha de emisión:</strong> ${todayStr}<br>
      Crear Poder Sin Límites — Centro Operativo Causa OS
    </div>
  </div>
</body>
</html>
  `.trim();

  const mailtoUrl = `mailto:${encodeURIComponent(ELI_ESCOBAR_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(textBody)}`;

  return {
    subject,
    text: textBody,
    html: htmlBody,
    mailtoUrl,
    totalMontoUSD,
    trainerName: cleanTrainer,
    itemsCount: items.length
  };
}

/**
 * Envía las notificaciones en Causa OS y encola los correos oficiales para Eli Escobar.
 * Funciona de forma segura y no bloqueante.
 */
export async function dispatchLiquidacionNotifications({
  db,
  addDocFn,
  collectionFn,
  items = [],
  authorizerUser = {}
}) {
  if (!db || !addDocFn || !collectionFn || !items.length) {
    return { successCount: 0, errors: [] };
  }

  const grouped = groupItemsByTrainer(items);
  let successCount = 0;
  const errors = [];

  for (const [trainer, trainerItems] of grouped.entries()) {
    try {
      const emailData = buildLiquidacionEmailData({
        trainerName: trainer,
        items: trainerItems,
        authorizerUser
      });

      // 1. Notificación In-App en Causa OS para Eli Escobar
      const sedesList = [...new Set(trainerItems.map(it => it.sede).filter(Boolean))].join(', ') || 'Global';
      const equiposList = trainerItems.map(it => it.equipo ? `${it.equipo}${it.numEquipo ? ` (#${it.numEquipo})` : ''}` : it.participanteNombre).join(', ');

      await addDocFn(collectionFn(db, 'notifications'), {
        userId: ELI_ESCOBAR_EMAIL,
        title: `💰 Autorización de Pago: ${trainer} ($${emailData.totalMontoUSD} USD)`,
        message: `Se ha registrado y autorizado la liquidación de llamadas para ${trainer} por un total de $${emailData.totalMontoUSD} USD (${trainerItems.length} registro(s) en ${sedesList}): ${equiposList}. Autorizado por ${authorizerUser?.name || authorizerUser?.email || 'Dirección'}.`,
        type: 'liquidacion_pago_autorizado',
        entrenador: trainer,
        montoUSD: emailData.totalMontoUSD,
        itemsCount: trainerItems.length,
        read: false,
        created_at: new Date().toISOString()
      });

      // 2. Encolado de correo oficial en la colección 'mail' (para mailerDaemon / Firebase Trigger Email)
      await addDocFn(collectionFn(db, 'mail'), {
        to: [ELI_ESCOBAR_EMAIL],
        type: 'liquidacion_autorizacion_pago',
        delivery: { state: 'PENDING', attemptCount: 0 },
        message: {
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        },
        metadata: {
          entrenador: trainer,
          montoUSD: emailData.totalMontoUSD,
          itemsCount: trainerItems.length,
          authorizerEmail: authorizerUser?.email || '',
          authorizerName: authorizerUser?.name || ''
        },
        created_at: new Date().toISOString()
      });

      successCount++;
    } catch (err) {
      console.error(`Error enviando notificación/correo para ${trainer}:`, err);
      errors.push({ trainer, error: err.message });
    }
  }

  return { successCount, errors };
}

