#!/usr/bin/env node
/**
 * notify_apdayc_gerente_lima.mjs
 * 
 * Script de recordatorio urgente para el pago de derechos de autor APDAYC.
 * Destinatario: José Sánchez (Gerente de Sede Lima)
 * 
 * Reglas de disparo:
 * 1. Urgente inmediato: Mañana a las 9:00 AM (04/09/2026).
 * 2. Regla mensual: 3 días antes de finalizar cada mes.
 * Canales: Correo Electrónico, WhatsApp, Google Chat.
 */

const APDAYC_CONFIG = {
  destinatario: "José Luis Sánchez Moreno (Gerente de Lima)",
  email: "jose.sanchez@crearpsl.net",
  telefonoWhatsApp: "51919563284",
  entidad: "APDAYC (Asociación Peruana de Autores y Compositores)",
  rucApdayc: "20100538203",
  usuarioCodigo: "248509",
  razonSocial: "CREACION CUANTICA E.I.R.L.",
  rucEmpresa: "20612592811",
  local: "Hotel Jose Antonio Deluxe (Calle Bellavista 133, Miraflores, Lima)",
  cuentas: [
    { banco: "BCP", numero: "191 0046905 0 86", cci: "00219100004690508658" },
    { banco: "BBVA", numero: "0011 0368 01 00002525", cci: "011 368 000100002525 82" },
    { banco: "Interbank", numero: "200 3000831059", cci: "003 200 003000831059 38" },
    { banco: "Scotiabank", numero: "000 4501799", cci: "009 04300000450179913" }
  ]
};

function checkIsAlertActive(targetDate = new Date()) {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const day = targetDate.getDate();

  // Días totales del mes
  const lastDay = new Date(year, month + 1, 0).getDate();
  const daysRemaining = lastDay - day;

  // Condición especial urgente: Mañana 4 de Septiembre 2026
  const isSept4Urgent = (year === 2026 && month === 8 && (day === 3 || day === 4));
  // Condición recurrente fin de mes: 3 días antes de finalizar
  const isEndOfMonthWindow = daysRemaining <= 3;

  return {
    isActive: isSept4Urgent || isEndOfMonthWindow,
    reason: isSept4Urgent ? "Alerta Urgente Mañana 9:00 AM" : "Ventana Fin de Mes (3 días antes del cierre)",
    daysRemaining,
    lastDay
  };
}

function generatePayloads() {
  const whatsappMsg = `🚨 *RECORDATORIO URGENTE: PAGO APDAYC - LIMA* 🚨\n\n` +
    `Estimado *José Sánchez* (Gerente de Lima):\n\n` +
    `De acuerdo a la programación de *CREAR PODER SIN LÍMITES*, se debe realizar el pago de derechos de autor APDAYC para los entrenamientos en *Hotel Jose Antonio*.\n\n` +
    `⏰ *Plazo Límite:* Mañana a las 9:00 AM\n` +
    `🏢 *Entidad:* APDAYC (RUC: ${APDAYC_CONFIG.rucApdayc})\n` +
    `👤 *Código Usuario APDAYC:* ${APDAYC_CONFIG.usuarioCodigo}\n` +
    `📍 *Sede:* Hotel Jose Antonio Deluxe (Miraflores)\n\n` +
    `💳 *Cuentas Oficiales para Transferencia:*\n` +
    `• BCP Cta Cte: 191 0046905 0 86 (CCI: 00219100004690508658)\n` +
    `• BBVA Cta Cte: 0011 0368 01 00002525 (CCI: 01136800010000252582)\n` +
    `• Interbank Cta Cte: 200 3000831059 (CCI: 00320000300083105938)\n` +
    `• Scotiabank Cta Cte: 000 4501799 (CCI: 00904300000450179913)\n\n` +
    `Por favor remitir el comprobante de transferencia a administración para su archivo legal.`;

  const emailSubject = `[URGENTE] PAGO MENSUAL APDAYC LIMA - MAÑANA 9:00 AM - GERENCIA DE LIMA`;
  const emailBody = `Estimado José Sánchez,\n\n` +
    `Te recordamos que de acuerdo al protocolo operativo de CREAR PODER SIN LÍMITES, mañana a las 9:00 AM vence el plazo para efectuar el pago de derechos de autor a APDAYC correspondiente a los eventos en el Hotel Jose Antonio.\n\n` +
    `DETALLES DE PAGO:\n` +
    `-----------------------------------------\n` +
    `Entidad: APDAYC (RUC 20100538203)\n` +
    `Oficina: AGECOFER - Miraflores\n` +
    `Código Usuario: 248509\n` +
    `Empresa Facturada: CREACION CUANTICA E.I.R.L. (RUC 20612592811)\n` +
    `Local: Hotel Jose Antonio Deluxe (Calle Bellavista 133, Miraflores)\n\n` +
    `CUENTAS BANCARIAS AUTORIZADAS:\n` +
    `1. BCP Cta. Cte.: 191 0046905 0 86 (CCI: 00219100004690508658)\n` +
    `2. BBVA Cta. Cte.: 0011 0368 01 00002525 (CCI: 011 368 000100002525 82)\n` +
    `3. Interbank Cta. Cte.: 200 3000831059 (CCI: 003 200 003000831059 38)\n` +
    `4. Scotiabank Cta. Cte.: 000 4501799 (CCI: 009 04300000450179913)\n\n` +
    `Favor confirmar el pago y remitir el comprobante a administración.\n\n` +
    `CREAR PODER SIN LÍMITES`;

  const googleChatPayload = {
    cardsV2: [{
      cardId: "apdayc_urgent_card",
      card: {
        header: {
          title: "🚨 URGENTE: PAGO APDAYC LIMA - 9:00 AM",
          subtitle: "Exclusivo para José Sánchez (Gerente de Lima)",
          imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczPhG...",
          imageType: "CIRCLE"
        },
        sections: [
          {
            header: "Detalles del Requerimiento",
            widgets: [
              {
                textParagraph: {
                  text: `<b>Entidad:</b> APDAYC (RUC: 20100538203)<br>` +
                        `<b>Código de Usuario:</b> 248509<br>` +
                        `<b>Local:</b> Hotel Jose Antonio Deluxe<br>` +
                        `<b>Vence:</b> Mañana a las 9:00 AM (y 3 días antes de cada fin de mes)`
                }
              },
              {
                textParagraph: {
                  text: `<b>💳 Cuentas Bancarias:</b><br>` +
                        `• <b>BCP:</b> 191 0046905 0 86 (CCI: 00219100004690508658)<br>` +
                        `• <b>BBVA:</b> 0011 0368 01 00002525 (CCI: 01136800010000252582)<br>` +
                        `• <b>Interbank:</b> 200 3000831059 (CCI: 00320000300083105938)`
                }
              }
            ]
          }
        ]
      }
    }]
  };

  return {
    whatsappUrl: `https://wa.me/${APDAYC_CONFIG.telefonoWhatsApp}?text=${encodeURIComponent(whatsappMsg)}`,
    mailtoUrl: `mailto:${APDAYC_CONFIG.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
    whatsappMsg,
    emailSubject,
    emailBody,
    googleChatPayload
  };
}

// Ejecución
const evalStatus = checkIsAlertActive();
console.log("==================================================");
console.log("🔔 SISTEMA DE ALERTA APDAYC - CAUSA OS / CPSL");
console.log(`👤 Destinatario: ${APDAYC_CONFIG.destinatario}`);
console.log(`📅 Estado de activación: ${evalStatus.isActive ? 'ACTIVO ✅' : 'INACTIVO ⏳'}`);
console.log(`📌 Razón: ${evalStatus.reason}`);
console.log("==================================================");

const payloads = generatePayloads();
console.log("\n📱 LINK DIRECTO WHATSAPP:");
console.log(payloads.whatsappUrl);

console.log("\n✉️ LINK DIRECTO CORREO:");
console.log(payloads.mailtoUrl);

console.log("\n💬 GOOGLE CHAT PAYLOAD:");
console.log(JSON.stringify(payloads.googleChatPayload, null, 2));

console.log("\n✅ Notificación preparada con éxito.");
