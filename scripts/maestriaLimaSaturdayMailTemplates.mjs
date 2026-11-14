/**
 * Plantillas HTML ultra premium y 100% responsivas (Gmail, Apple Mail, Outlook, iOS, Android)
 * para el envío automático de los sábados de Maestría en Lima (9:00 AM).
 * Dos ediciones estrictamente separadas por rol:
 *  - 'leader' (Manager / Capitán): Tarifa exclusiva S/ 505 + regla de uso estricto del enlace.
 *  - 'participant' (Participante): Tarifa regular S/ 900 y Promoción Familiar S/ 720 + BCP + Culqi + PayPal.
 */

const DEFAULT_CONFIG = {
  teamNumber: 33,
  cityLabel: 'LIMA, PERÚ 🇵🇪',
  logoWhiteUrl: 'https://centro-operativo-cpsl.web.app/logo_crear_blanco.png',
  imoUrl: 'https://imo.crearpslglobal.com/registro/ciudad/lima',
  bcpHolder: 'CREACIÓN CUÁNTICA E.I.R.L',
  bcpAccount: '1934218307060',
  bcpCci: '00219300421830706018',
  managerCulqiUrl: 'https://express.culqi.com/pago/UWQZ951G41',
  participantCulqiUrl: 'https://express.culqi.com/pago/50FZYQ87V0',
  familyCulqiUrl: 'https://express.culqi.com/pago/U7K3CBISZX',
  paypalEmail: 'facturacion.cartera@crearpsl.com',
  paypalHolder: 'QUANTUM COACHING TECHNOLOGY BSV CIA LTDA.',
  joyceWhatsappUrl: 'https://wa.me/51XXXXXXXXX?text=Hola%20Joyce%2C%20te%20escribo%20desde%20Maestr%C3%ADa%20Lima%20por%20una%20inscripci%C3%B3n%20al%20Cap%C3%ADtulo%20Uno.',
  dianaWhatsappUrl: 'https://wa.me/51YYYYYYYYY?text=Hola%20Diana%2C%20te%20escribo%20desde%20Maestr%C3%ADa%20Lima%20por%20una%20inscripci%C3%B3n%20al%20Cap%C3%ADtulo%20Uno.',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function firstNameOf(fullName) {
  const clean = String(fullName || '').trim();
  if (!clean) return 'Líder';
  const first = clean.split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function renderShell({ cfg, preheader, badge, headline, subheadline, bodyHtml, footerNote }) {
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="dark" />
  <title>${escapeHtml(headline)}</title>
  <style>
    html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #050811 !important; }
    * { box-sizing: border-box; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    table { border-collapse: collapse !important; mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
    a { text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .outer-wrap { padding: 14px 8px !important; }
      .email-shell { width: 100% !important; border-radius: 16px !important; }
      .hero-pad { padding: 26px 18px 22px 18px !important; }
      .body-pad { padding: 22px 16px 8px 16px !important; }
      .footer-pad { padding: 20px 16px 26px 16px !important; }
      .hero-title { font-size: 23px !important; line-height: 1.24 !important; }
      .price-big { font-size: 32px !important; }
      .stack-box { width: 100% !important; max-width: 100% !important; display: block !important; margin-bottom: 12px !important; }
      .stack-spacer { display: none !important; width: 0 !important; height: 0 !important; }
      .cta-full { display: block !important; width: 100% !important; text-align: center !important; padding: 14px 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#050811;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="outer-wrap" style="background-color:#050811;padding:28px 12px;width:100%;">
    <tr>
      <td align="center" valign="top">
        <!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-shell" style="max-width:640px;width:100%;background-color:#0B1120;border:1px solid #2A2312;border-radius:20px;overflow:hidden;">
          <!-- Top Gold Accent -->
          <tr>
            <td style="height:4px;background-color:#D4AF37;background:linear-gradient(90deg,#9A7B2C 0%,#F5D061 50%,#9A7B2C 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Hero Header with Official CREAR Logo -->
          <tr>
            <td class="hero-pad" style="padding:32px 30px 24px 30px;background-color:#0D1426;background:radial-gradient(circle at top center,#171D34 0%,#0B1120 75%);text-align:center;border-bottom:1px solid #1E293B;">
              <img src="${cfg.logoWhiteUrl}" alt="CREAR Poder Sin Límites" width="164" style="display:block;margin:0 auto 16px auto;width:164px;max-width:55%;height:auto;" />
              <div style="display:inline-block;padding:6px 14px;border-radius:999px;background-color:#1D190D;border:1px solid #6E581E;color:#F5D061;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;margin-bottom:12px;">
                ${escapeHtml(badge)}
              </div>
              <div style="font-size:11.5px;font-weight:700;letter-spacing:2px;color:#94A3B8;text-transform:uppercase;margin-bottom:8px;">
                EQUIPO LIMA, PERÚ 🇵🇪
              </div>
              <h1 class="hero-title" style="margin:0 0 10px 0;font-size:26px;line-height:1.22;font-weight:800;color:#FFFFFF;letter-spacing:-0.3px;">
                ${headline}
              </h1>
              <p style="margin:0 auto;font-size:15px;line-height:1.55;color:#CBD5E1;max-width:500px;">
                ${subheadline}
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td class="body-pad" style="padding:26px 28px 10px 28px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer with CREAR Logo -->
          <tr>
            <td class="footer-pad" style="padding:24px 28px 28px 28px;border-top:1px solid #1E293B;background-color:#070B16;text-align:center;">
              <img src="${cfg.logoWhiteUrl}" alt="CREAR Poder Sin Límites" width="96" style="display:block;margin:0 auto 10px auto;width:96px;height:auto;opacity:0.9;" />
              <p style="margin:0 0 6px 0;font-size:12.5px;font-weight:700;color:#F5D061;letter-spacing:1px;">
                CREAR PODER SIN LÍMITES · LIMA, PERÚ 🇵🇪
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748B;">
                ${escapeHtml(footerNote)}
              </p>
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderBcpCard(cfg) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0F172A;border:1px solid #24324D;border-radius:14px;margin-bottom:16px;table-layout:fixed;">
    <tr>
      <td style="padding:18px 18px;">
        <div style="font-size:12px;font-weight:800;letter-spacing:1.1px;color:#F5D061;text-transform:uppercase;margin-bottom:10px;">
          🏦 Transferencia Bancaria · Banco BCP (Soles) o Efectivo
        </div>
        <div style="font-size:14px;line-height:1.65;color:#E2E8F0;">
          <div><span style="color:#94A3B8;">Titular:</span> <strong style="color:#FFFFFF;">${escapeHtml(cfg.bcpHolder)}</strong></div>
          <div><span style="color:#94A3B8;">Cuenta BCP Soles:</span> <strong style="color:#F5D061;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(cfg.bcpAccount)}</strong></div>
          <div><span style="color:#94A3B8;">CCI Interbancaria:</span> <strong style="color:#F5D061;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;">${escapeHtml(cfg.bcpCci)}</strong></div>
        </div>
      </td>
    </tr>
  </table>`;
}

function renderWhatsappSupportCard(cfg) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0B1C19;border:1px solid #14532D;border-radius:14px;margin-bottom:16px;">
    <tr>
      <td style="padding:18px 18px;text-align:center;">
        <div style="font-size:12px;font-weight:800;letter-spacing:1.1px;color:#4ADE80;text-transform:uppercase;margin-bottom:6px;">
          📲 Atención Directa y Confirmación de Comprobantes
        </div>
        <p style="margin:0 0 14px 0;font-size:13.5px;line-height:1.55;color:#CBD5E1;">
          ¿Tienes dudas o ya realizaste tu transferencia BCP / PayPal? Envía tu constancia directo por WhatsApp a nuestro equipo en Lima:
        </p>
        <div style="text-align:center;font-size:0;">
          <div class="stack-box" style="display:inline-block;width:48%;max-width:260px;vertical-align:top;">
            <a href="${cfg.joyceWhatsappUrl}" class="cta-full" style="display:block;padding:12px 14px;border-radius:10px;background-color:#16A34A;color:#FFFFFF;font-size:13.5px;font-weight:800;text-align:center;">
              💬 WhatsApp Joyce
            </a>
          </div>
          <div class="stack-spacer" style="display:inline-block;width:4%;height:1px;"></div>
          <div class="stack-box" style="display:inline-block;width:48%;max-width:260px;vertical-align:top;">
            <a href="${cfg.dianaWhatsappUrl}" class="cta-full" style="display:block;padding:12px 14px;border-radius:10px;background-color:#15803D;border:1px solid #22C55E;color:#FFFFFF;font-size:13.5px;font-weight:800;text-align:center;">
              💬 WhatsApp Diana
            </a>
          </div>
        </div>
      </td>
    </tr>
  </table>`;
}

function renderRulesCard({ cfg, isLeader = false, extraRuleHtml = '' }) {
  const firstStepText = isLeader
    ? `Realiza la inscripción de <strong style="color:#FFFFFF;">tu enrolado</strong> para el <strong style="color:#FFFFFF;">Capítulo Uno – Equipo ${cfg.teamNumber} (${cfg.cityLabel})</strong> en `
    : `Realiza el registro oficial para el <strong style="color:#FFFFFF;">Capítulo Uno – Equipo ${cfg.teamNumber} (${cfg.cityLabel})</strong> en `;

  const fourthStepText = isLeader
    ? `<strong style="color:#FFFFFF;">Requisito del enrolado:</strong> Tu enrolado debe completar íntegramente su entrenamiento del <strong style="color:#FFFFFF;">Capítulo Uno</strong>.`
    : `<strong style="color:#FFFFFF;">Requisito del participante:</strong> Quien se inscribe debe completar íntegramente su entrenamiento del <strong style="color:#FFFFFF;">Capítulo Uno</strong>.`;

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0D1322;border:1px solid #1E293B;border-radius:14px;margin-bottom:18px;">
    <tr>
      <td style="padding:18px 18px;">
        <div style="font-size:12px;font-weight:800;letter-spacing:1.1px;color:#F5D061;text-transform:uppercase;margin-bottom:12px;">
          📌 Reglas Oficiales de Inscripción y Uso
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13.5px;line-height:1.58;color:#CBD5E1;">
          <tr>
            <td style="padding:5px 0;vertical-align:top;width:22px;color:#F5D061;font-weight:800;">1.</td>
            <td style="padding:5px 0;"><strong style="color:#FFFFFF;">Inscripción en el sistema CREAR (Nodus):</strong> ${firstStepText}<a href="${cfg.imoUrl}" style="color:#F5D061;text-decoration:underline;word-break:break-all;">imo.crearpslglobal.com/registro/ciudad/lima</a>.</td>
          </tr>
          <tr>
            <td style="padding:5px 0;vertical-align:top;color:#F5D061;font-weight:800;">2.</td>
            <td style="padding:5px 0;"><strong style="color:#FFFFFF;">Pago de la inscripción:</strong> Puedes realizarlo en efectivo, transferencia al Banco BCP o mediante el enlace oficial con tarjeta de crédito en soles.</td>
          </tr>
          <tr>
            <td style="padding:5px 0;vertical-align:top;color:#F5D061;font-weight:800;">3.</td>
            <td style="padding:5px 0;"><strong style="color:#FFFFFF;">Política de devolución:</strong> Una vez realizado el pago a CREAR, el monto <strong style="color:#FFFFFF;">no es reembolsable ni transferible</strong>. La promoción es válida únicamente para asistir en la fecha programada.</td>
          </tr>
          <tr>
            <td style="padding:5px 0;vertical-align:top;color:#F5D061;font-weight:800;">4.</td>
            <td style="padding:5px 0;">${fourthStepText}</td>
          </tr>
          ${extraRuleHtml}
        </table>
      </td>
    </tr>
  </table>`;
}

export function buildMaestriaLeaderEmail({ recipientName, roleLabel = 'Manager / Capitán', config = {} }) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const firstName = firstNameOf(recipientName);
  const cleanRole = String(roleLabel || 'Manager / Capitán').trim();

  const subject = `👑 ${firstName} (${cleanRole}), herramienta oficial de enrolamiento · Equipo ${cfg.teamNumber} (S/ 505)`;

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#F8FAFC;">
      Hola <strong style="color:#F5D061;">${escapeHtml(firstName)}</strong>,
    </p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#CBD5E1;">
      Hoy sábado de Maestría abre mesa y tú, como <strong style="color:#FFFFFF;">${escapeHtml(cleanRole)}</strong>, marcas el ritmo de creación de tu equipo. Ya estás dentro liderando la sala; ahora es momento de <strong style="color:#F5D061;">traer a tus enrolados al Capítulo Uno – Equipo ${cfg.teamNumber}</strong> con claridad, velocidad y cero fricción.
    </p>
    <p style="margin:0 0 22px 0;font-size:15px;line-height:1.65;color:#CBD5E1;">
      Un líder extraordinario facilita el "sí" de las personas que elige sumar a crear una vida sin límites. Aquí tienes los accesos oficiales para registrar y gestionar la inversión <strong style="color:#FFFFFF;">exclusiva de ${escapeHtml(cleanRole)} (S/ 505)</strong>:
    </p>

    <!-- Exclusive Price Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#16140C;background:linear-gradient(135deg,#1C1608 0%,#0F172A 100%);border:1px solid #B6902E;border-radius:16px;margin-bottom:18px;">
      <tr>
        <td style="padding:22px 18px;text-align:center;">
          <div style="font-size:11px;font-weight:800;letter-spacing:1.6px;color:#F5D061;text-transform:uppercase;margin-bottom:6px;">
            Inversión Exclusiva ${escapeHtml(cleanRole)}
          </div>
          <div class="price-big" style="font-size:38px;font-weight:900;color:#FFFFFF;line-height:1.1;margin-bottom:6px;">
            S/ 505 <span style="font-size:15px;font-weight:600;color:#CBD5E1;">soles</span>
          </div>
          <div style="font-size:13px;color:#94A3B8;margin-bottom:18px;">
            Link de tarjeta de crédito habilitado exclusivamente para Managers y Capitanes
          </div>
          <a href="${cfg.managerCulqiUrl}" class="cta-full" style="display:inline-block;padding:14px 24px;border-radius:10px;background-color:#EAB308;background:linear-gradient(90deg,#D4AF37 0%,#F5D061 100%);font-size:14px;font-weight:800;color:#050811;letter-spacing:0.3px;">
            💳 LINK DE PAGO S/ 505 (SOLO MANAGERS)
          </a>
          <div style="margin-top:12px;">
            <a href="${cfg.imoUrl}" class="cta-full" style="display:inline-block;padding:11px 18px;font-size:13px;font-weight:700;color:#F5D061;border:1px solid #6E581E;border-radius:9px;">
              📝 Inscribir en Nodus (Equipo ${cfg.teamNumber})
            </a>
          </div>
        </td>
      </tr>
    </table>

    <!-- Strict Usage Warning -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#261216;border:1px solid #7F1D1D;border-radius:12px;margin-bottom:18px;">
      <tr>
        <td style="padding:14px 16px;font-size:13.5px;line-height:1.55;color:#FECACA;">
          <strong style="color:#FFFFFF;">⚠️ Regla estricta de uso (solo ${escapeHtml(cleanRole)}):</strong> Este enlace de <strong style="color:#FFFFFF;">S/ 505</strong> es de uso exclusivo para ti como <strong style="color:#FFFFFF;">${escapeHtml(cleanRole)}</strong>. <strong style="color:#FFFFFF;">No debe reenviarse a participantes</strong> ni publicarse en grupos abiertos (los participantes manejan sus tarifas oficiales de S/ 900 o S/ 720 promoción familiar).
        </td>
      </tr>
    </table>

    ${renderBcpCard(cfg)}
    ${renderWhatsappSupportCard(cfg)}
    ${renderRulesCard({ cfg, isLeader: true })}
  `;

  const html = renderShell({
    cfg,
    preheader: `Herramienta de creación ${cleanRole}: S/ 505 · Capítulo Uno Equipo ${cfg.teamNumber} Lima Perú`,
    badge: `Edición Liderazgo · ${cleanRole}`,
    headline: `Lidera hoy el Equipo ${cfg.teamNumber}`,
    subheadline: `Accesos oficiales para inscribir en el Capítulo Uno · Tarifa ${cleanRole} (S/ 505)`,
    bodyHtml,
    footerNote: `Correo oficial automático de Maestría Lima · Enviado exclusivamente a ${cleanRole} activos en sistema.`,
  });

  return { subject, html };
}

export function buildMaestriaParticipantEmail({ recipientName, config = {} }) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const firstName = firstNameOf(recipientName);

  const subject = `✨ ${firstName}, crea, vive y comparte el Capítulo Uno – Equipo ${cfg.teamNumber} (Lima, Perú)`;

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#F8FAFC;">
      Hola <strong style="color:#F5D061;">${escapeHtml(firstName)}</strong>,
    </p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#CBD5E1;">
      Hoy sábado de Maestría abre mesa con una pregunta poderosa: <strong style="color:#FFFFFF;">¿qué nueva realidad quieres crear, vivir y compartir desde este fin de semana?</strong> Cada persona que llega al <strong style="color:#FFFFFF;">Capítulo Uno – Equipo ${cfg.teamNumber}</strong> entra a un contexto diseñado para despertar su máximo potencial y crear una vida extraordinaria.
    </p>
    <p style="margin:0 0 22px 0;font-size:15px;line-height:1.65;color:#CBD5E1;">
      En <strong style="color:#F5D061;">CREAR Poder Sin Límites</strong> creemos en los espacios que se viven con el corazón y se comparten con las personas que más importan. Aquí tienes toda la información oficial —clara y lista para compartir— para completar la inscripción al <strong style="color:#FFFFFF;">Capítulo Uno – Equipo ${cfg.teamNumber}</strong> en 2 pasos simples:
    </p>

    <!-- Step 1 Nodus -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0F172A;border:1px solid #24324D;border-radius:14px;margin-bottom:16px;">
      <tr>
        <td style="padding:18px 18px;">
          <div style="font-size:12px;font-weight:800;letter-spacing:1.1px;color:#F5D061;text-transform:uppercase;margin-bottom:6px;">
            Paso 1 · Registro oficial en el sistema CREAR (Nodus)
          </div>
          <p style="margin:0 0 14px 0;font-size:14px;line-height:1.55;color:#CBD5E1;">
            Completa el registro en línea para el <strong style="color:#FFFFFF;">Capítulo Uno – Equipo ${cfg.teamNumber} de Lima, Perú</strong>:
          </p>
          <a href="${cfg.imoUrl}" class="cta-full" style="display:inline-block;padding:12px 20px;border-radius:9px;background-color:#1E293B;border:1px solid #F5D061;color:#F5D061;font-size:13.5px;font-weight:800;">
            📝 REGISTRARSE EN NODUS →
          </a>
        </td>
      </tr>
    </table>

    <!-- Step 2 Responsive Fluid Cards (stack cleanly on mobile & all email clients) -->
    <div style="text-align:center;font-size:0;margin-bottom:16px;">
      <div class="stack-box" style="display:inline-block;width:48.5%;max-width:280px;vertical-align:top;background-color:#11192E;border:1px solid #334155;border-radius:14px;padding:18px 14px;text-align:center;">
        <div style="font-size:11px;font-weight:800;letter-spacing:1.2px;color:#94A3B8;text-transform:uppercase;margin-bottom:6px;">
          Inversión Regular
        </div>
        <div class="price-big" style="font-size:32px;font-weight:900;color:#FFFFFF;line-height:1.1;margin-bottom:8px;">
          S/ 900
        </div>
        <div style="font-size:12.5px;line-height:1.45;color:#CBD5E1;margin-bottom:14px;">
          Inscripción al Capítulo Uno · Equipo ${cfg.teamNumber}
        </div>
        <a href="${cfg.participantCulqiUrl}" class="cta-full" style="display:block;padding:12px 14px;border-radius:9px;background-color:#EAB308;background:linear-gradient(90deg,#D4AF37 0%,#F5D061 100%);color:#050811;font-size:13px;font-weight:800;">
          💳 LINK DE PAGO S/ 900
        </a>
      </div>

      <div class="stack-spacer" style="display:inline-block;width:3%;height:1px;"></div>

      <div class="stack-box" style="display:inline-block;width:48.5%;max-width:280px;vertical-align:top;background-color:#1B170B;border:1px solid #B6902E;border-radius:14px;padding:18px 14px;text-align:center;">
        <div style="font-size:11px;font-weight:800;letter-spacing:1.2px;color:#F5D061;text-transform:uppercase;margin-bottom:6px;">
          Promoción Familiar
        </div>
        <div class="price-big" style="font-size:32px;font-weight:900;color:#F5D061;line-height:1.1;margin-bottom:8px;">
          S/ 720
        </div>
        <div style="font-size:12.5px;line-height:1.45;color:#CBD5E1;margin-bottom:14px;">
          Desde la 2.ª inscripción familiar (1.er grado de consanguinidad*)
        </div>
        <a href="${cfg.familyCulqiUrl}" class="cta-full" style="display:block;padding:12px 14px;border-radius:9px;background-color:#F5D061;color:#050811;font-size:13px;font-weight:800;">
          💳 LINK FAMILIAR S/ 720
        </a>
      </div>
    </div>

    ${renderBcpCard(cfg)}

    <!-- PayPal Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0F172A;border:1px solid #24324D;border-radius:14px;margin-bottom:16px;">
      <tr>
        <td style="padding:16px 18px;">
          <div style="font-size:12px;font-weight:800;letter-spacing:1.1px;color:#60A5FA;text-transform:uppercase;margin-bottom:8px;">
            🌐 Pago Internacional vía PayPal
          </div>
          <div style="font-size:13.5px;line-height:1.6;color:#E2E8F0;">
            <div><span style="color:#94A3B8;">Correo PayPal:</span> <strong style="color:#FFFFFF;word-break:break-all;">${escapeHtml(cfg.paypalEmail)}</strong></div>
            <div><span style="color:#94A3B8;">Titular:</span> <strong style="color:#FFFFFF;">${escapeHtml(cfg.paypalHolder)}</strong></div>
          </div>
        </td>
      </tr>
    </table>

    ${renderWhatsappSupportCard(cfg)}

    ${renderRulesCard({
      cfg,
      isLeader: false,
      extraRuleHtml: `
        <tr>
          <td style="padding:5px 0;vertical-align:top;color:#F5D061;font-weight:800;">5.</td>
          <td style="padding:5px 0;"><strong style="color:#FFFFFF;">Uso de la Promoción Familiar (S/ 720):</strong> Aplica únicamente a partir de la segunda inscripción familiar acreditando <strong style="color:#FFFFFF;">primer grado de consanguinidad</strong> (padres, hijos o hermanos).</td>
        </tr>
      `,
    })}
  `;

  const html = renderShell({
    cfg,
    preheader: `Crea, vive y comparte el Capítulo Uno – Equipo ${cfg.teamNumber}: S/ 900 o Familiar S/ 720 · Lima, Perú`,
    badge: `Capítulo Uno · Equipo ${cfg.teamNumber}`,
    headline: `Crea, vive y comparte el Capítulo Uno`,
    subheadline: `Información oficial de inscripción para el Equipo ${cfg.teamNumber} en Lima, Perú 🇵🇪`,
    bodyHtml,
    footerNote: `Correo oficial automático de Maestría Lima · CREAR Poder Sin Límites.`,
  });

  return { subject, html };
}
