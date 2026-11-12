import { addDoc, collection } from 'firebase/firestore';
import {
  MAESTRIA_CONTRACT_SECTIONS,
  FIREWALK_CONTRACT_SECTIONS,
  buildMaestriaContractPdfAttachment,
  buildFirewalkContractPdfAttachment,
  renderContractSectionsHtml
} from './contractPdfGenerator.js';

/**
 * Genera el Pase Oficial Digital (1080x1440) de Compromiso y Reglas de Maestría del Juego
 * Incluye IP Pública y Geolocalización forense sin excepción.
 * @param {Object} params
 * @returns {Promise<string>} Data URL en formato image/png
 */
export async function generateMaestriaPassCanvas({
  nombre,
  doc,
  rol = 'Participante',
  equipo = 'Equipo 32',
  sede = 'Lima',
  fecha,
  codigo,
  ip = 'No detectada',
  geoLocation = 'Lima, Perú 🇵🇪',
  coordinates = '',
  verificationUrl
}) {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1440;
      const ctx = canvas.getContext('2d');
      const W = 1080;
      const H = 1440;

      // 1. Fondo degradado Noche & Maestría (Azul Real Profundo, Oro y Negro Ejecutivo)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#060b17');
      bgGrad.addColorStop(0.3, '#0b162c');
      bgGrad.addColorStop(0.7, '#131b2e');
      bgGrad.addColorStop(1, '#05070d');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // 2. Resplandor dorado radial central
      const goldGlow = ctx.createRadialGradient(W / 2, 420, 50, W / 2, 420, 600);
      goldGlow.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
      goldGlow.addColorStop(0.4, 'rgba(217, 119, 6, 0.12)');
      goldGlow.addColorStop(0.8, 'rgba(41, 171, 226, 0.06)');
      goldGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = goldGlow;
      ctx.fillRect(0, 0, W, H);

      // Constelación de partículas de maestría
      const particles = [
        { x: 160, y: 180, r: 3, a: 0.7 }, { x: 280, y: 320, r: 4, a: 0.8 }, { x: 880, y: 220, r: 3, a: 0.6 },
        { x: 920, y: 380, r: 5, a: 0.9 }, { x: 120, y: 680, r: 3, a: 0.5 }, { x: 960, y: 720, r: 4, a: 0.6 },
        { x: 180, y: 1100, r: 4, a: 0.7 }, { x: 890, y: 1120, r: 5, a: 0.8 }, { x: 340, y: 1280, r: 3, a: 0.6 },
        { x: 740, y: 1290, r: 4, a: 0.7 }, { x: 540, y: 1350, r: 3, a: 0.5 }
      ];
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 191, 36, ${p.a})`;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // 3. Marcos Decorativos Ejecutivos
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, W - 80, H - 80);

      ctx.strokeStyle = 'rgba(41, 171, 226, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(52, 52, W - 104, H - 104);

      // Esquinas ornamentales
      const cSize = 44;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(40, 40 + cSize); ctx.lineTo(40, 40); ctx.lineTo(40 + cSize, 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - 40 - cSize, 40); ctx.lineTo(W - 40, 40); ctx.lineTo(W - 40, 40 + cSize); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(40, H - 40 - cSize); ctx.lineTo(40, H - 40); ctx.lineTo(40 + cSize, H - 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - 40 - cSize, H - 40); ctx.lineTo(W - 40, H - 40); ctx.lineTo(W - 40, H - 40 - cSize); ctx.stroke();

      // 4. Cabecera Institucional
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f59e0b';
      ctx.font = '700 22px Montserrat, -apple-system, sans-serif';
      ctx.fillText('CREACIÓN CUÁNTICA • PROGRAMA CREAR PODER SIN LÍMITES', W / 2, 102);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px Montserrat, -apple-system, sans-serif';
      ctx.fillText('MAESTRÍA DEL JUEGO & COMUNIDAD CREAR · SEDE LIMA', W / 2, 134);

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(180, 154); ctx.lineTo(W - 180, 154); ctx.stroke();

      // 5. Emblema y Título
      ctx.font = '74px Arial, sans-serif';
      ctx.fillText('👑', W / 2, 240);

      const titleGrad = ctx.createLinearGradient(120, 0, W - 120, 0);
      titleGrad.addColorStop(0, '#fef3c7');
      titleGrad.addColorStop(0.3, '#f59e0b');
      titleGrad.addColorStop(0.7, '#d97706');
      titleGrad.addColorStop(1, '#38bdf8');

      ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
      ctx.shadowBlur = 24;
      ctx.fillStyle = titleGrad;
      ctx.font = '900 52px Montserrat, -apple-system, sans-serif';
      ctx.fillText('PASE DE VALIDACIÓN', W / 2, 315);

      ctx.font = '900 46px Montserrat, -apple-system, sans-serif';
      ctx.fillText('REGLAS DE MAESTRÍA', W / 2, 375);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 16px Montserrat, -apple-system, sans-serif';
      ctx.fillText('CREDENCIAL DE ACREDITACIÓN · CONTRATO ÍNTEGRO EN PDF ADJUNTO', W / 2, 418);

      // 6. Tarjeta Central del Titular
      const boxX = 75;
      const boxY = 450;
      const boxW = W - 150;
      const boxH = 670;

      ctx.fillStyle = 'rgba(10, 18, 38, 0.92)';
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 20);
      ctx.fill();
      ctx.stroke();

      // Nombre del Titular
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 15px Montserrat, -apple-system, sans-serif';
      ctx.fillText('TITULAR DECLARANTE', W / 2, boxY + 42);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 34px Montserrat, -apple-system, sans-serif';
      let displayNombre = (nombre || '').toUpperCase();
      if (displayNombre.length > 32) {
        ctx.font = '800 26px Montserrat, -apple-system, sans-serif';
      }
      ctx.fillText(displayNombre, W / 2, boxY + 84);

      // Documento & Rol en píldora
      ctx.font = '700 20px Montserrat, -apple-system, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`${doc}  •  ${rol.toUpperCase()}`, W / 2, boxY + 122);

      // Equipo / Cohorte
      ctx.fillStyle = '#fef08a';
      ctx.font = '800 22px Montserrat, -apple-system, sans-serif';
      ctx.fillText(`COHORTE / EQUIPO: ${equipo.toUpperCase()}`, W / 2, boxY + 158);

      // Línea divisoria
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(boxX + 40, boxY + 182);
      ctx.lineTo(boxX + boxW - 40, boxY + 182);
      ctx.stroke();

      // Declaraciones Aceptadas (Checkboxes Clickwrap 1, 2, 3)
      const checks = [
        {
          num: 'DOC 1',
          title: 'Aceptación de Términos, Reglas y Confidencialidad NDA',
          desc: 'Marco Metodológico de Alto Rendimiento, Secreto de Comunidad y Cero Grabaciones.'
        },
        {
          num: 'DOC 2',
          title: 'Declaración Jurada de Salud y Asunción de Responsabilidad',
          desc: 'Aptitud física/mental y deslinde amplio de responsabilidad a Creación Cuántica E.I.R.L.'
        },
        {
          num: 'DOC 3',
          title: 'Consentimiento de Datos Personales y Derechos de Imagen',
          desc: 'Autorización estricta bajo Ley N° 29733 y uso exclusivo promocional/institucional.'
        }
      ];

      let checkY = boxY + 218;
      checks.forEach((c) => {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(boxX + 35, checkY - 20, boxW - 70, 74, 12);
        ctx.fill();
        ctx.stroke();

        // Check Icon
        ctx.fillStyle = '#10b981';
        ctx.font = '800 22px Arial, sans-serif';
        ctx.fillText('✓', boxX + 65, checkY + 24);

        // Check Text
        ctx.textAlign = 'left';
        ctx.fillStyle = '#34d399';
        ctx.font = '800 15.5px Montserrat, -apple-system, sans-serif';
        ctx.fillText(`[${c.num}]  ${c.title}`, boxX + 95, checkY + 10);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '500 13px Montserrat, -apple-system, sans-serif';
        ctx.fillText(c.desc, boxX + 95, checkY + 34);

        checkY += 86;
      });

      // Metadatos Forenses: IP y Geolocalización en el Pase
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 14px "Courier New", monospace';
      const geoDisplay = coordinates ? `${geoLocation} (${coordinates})` : geoLocation;
      ctx.fillText(`IP: ${ip}  |  GEO: ${geoDisplay}`, W / 2, boxY + 505);

      // Banner de Estado: HABILITADO
      const badgeY = boxY + 530;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 290, badgeY, 580, 50, 25);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = '900 19px Montserrat, -apple-system, sans-serif';
      ctx.fillText('🏛️ ESTADO: CONTRATO VINCULANTE FIRMADO', W / 2, badgeY + 32);

      // 7. Bloque de QR y Validación (con carga CORS-safe por Blob para evitar canvas taint)
      const qrSize = 155;
      const qrX = W / 2 - qrSize / 2;
      const qrY = 1145;

      const drawFallbackQrBadge = () => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(qrX, qrY, qrSize, qrSize);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
        ctx.lineWidth = 2;
        ctx.strokeRect(qrX, qrY, qrSize, qrSize);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 14px sans-serif';
        ctx.fillText('QR VALIDADO', W / 2, qrY + 72);
        ctx.fillStyle = '#fbbf24';
        ctx.font = '600 11px monospace';
        ctx.fillText(String(codigo || '').slice(0, 18), W / 2, qrY + 96);
      };

      let finished = false;
      const finishCanvas = () => {
        if (finished) return;
        finished = true;
        try {
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fbbf24';
          ctx.font = '800 20px "Courier New", monospace';
          ctx.fillText(`CÓDIGO DIGITAL: ${codigo}`, W / 2, 1335);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '600 15px Montserrat, -apple-system, sans-serif';
          ctx.fillText(`Suscrito electrónicamente: ${fecha} (Lima, Perú)`, W / 2, 1365);

          ctx.fillStyle = '#64748b';
          ctx.font = '500 13px Montserrat, -apple-system, sans-serif';
          ctx.fillText('Creación Cuántica E.I.R.L. · RUC 20612592811 · Ley N° 27269', W / 2, 1395);

          resolve(canvas.toDataURL('image/png'));
        } catch (exportErr) {
          console.warn('Fallback de exportación de pase Maestría:', exportErr);
          resolve(null);
        }
      };

      const encodedUrl = encodeURIComponent(verificationUrl || `https://centro-operativo-cpsl.web.app/reglas-maestria?c=${codigo}`);
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodedUrl}`;

      const timeoutId = setTimeout(() => {
        drawFallbackQrBadge();
        finishCanvas();
      }, 2200);

      if (typeof fetch === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        fetch(qrApiUrl, { mode: 'cors' })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.blob();
          })
          .then((blob) => {
            const objUrl = URL.createObjectURL(blob);
            const qrImg = new Image();
            qrImg.onload = () => {
              clearTimeout(timeoutId);
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.roundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12);
              ctx.fill();
              ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
              URL.revokeObjectURL(objUrl);
              finishCanvas();
            };
            qrImg.onerror = () => {
              clearTimeout(timeoutId);
              URL.revokeObjectURL(objUrl);
              drawFallbackQrBadge();
              finishCanvas();
            };
            qrImg.src = objUrl;
          })
          .catch(() => {
            clearTimeout(timeoutId);
            drawFallbackQrBadge();
            finishCanvas();
          });
      } else {
        clearTimeout(timeoutId);
        drawFallbackQrBadge();
        finishCanvas();
      }

    } catch (e) {
      console.error('Error al generar canvas de Maestria:', e);
      resolve(null);
    }
  });
}

/**
 * Comprime cualquier Data URL (PNG/JPEG) a un adjunto JPEG optimizado (< 350 KB)
 * para garantizar que el documento `mail` en Firestore jamás supere el límite de 1 MiB (1,048,576 bytes).
 */
export async function preparePassEmailAttachment(passDataUrl, filenamePrefix, codigo, cid) {
  if (!passDataUrl || typeof passDataUrl !== 'string') return null;

  const MAX_SAFE_BASE64_LENGTH = 520000;

  if (typeof document !== 'undefined') {
    try {
      const compressedDataUrl = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const w = img.width || 1080;
            const h = img.height || 1440;
            const offCanvas = document.createElement('canvas');
            offCanvas.width = w;
            offCanvas.height = h;
            const offCtx = offCanvas.getContext('2d');
            offCtx.fillStyle = '#060b17';
            offCtx.fillRect(0, 0, w, h);
            offCtx.drawImage(img, 0, 0, w, h);

            let jpegUrl = offCanvas.toDataURL('image/jpeg', 0.85);
            if (jpegUrl.length > MAX_SAFE_BASE64_LENGTH) {
              jpegUrl = offCanvas.toDataURL('image/jpeg', 0.72);
            }
            if (jpegUrl.length > MAX_SAFE_BASE64_LENGTH) {
              const scale = 0.75;
              const smallCanvas = document.createElement('canvas');
              smallCanvas.width = Math.round(w * scale);
              smallCanvas.height = Math.round(h * scale);
              const smallCtx = smallCanvas.getContext('2d');
              smallCtx.fillStyle = '#060b17';
              smallCtx.fillRect(0, 0, smallCanvas.width, smallCanvas.height);
              smallCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);
              jpegUrl = smallCanvas.toDataURL('image/jpeg', 0.75);
            }
            resolve(jpegUrl);
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = passDataUrl;
      });

      if (compressedDataUrl && compressedDataUrl.startsWith('data:image/jpeg;base64,')) {
        const base64Content = compressedDataUrl.replace(/^data:image\/jpeg;base64,/, '');
        return {
          filename: `${filenamePrefix}_${codigo}.jpg`,
          content: base64Content,
          contentType: 'image/jpeg',
          encoding: 'base64',
          cid
        };
      }
    } catch (err) {
      console.warn('Compresión JPEG en navegador no disponible, evaluando fallback:', err);
    }
  }

  const mimeMatch = passDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const rawBase64 = passDataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

  if (rawBase64.length > MAX_SAFE_BASE64_LENGTH) {
    console.warn(`Adjunto base64 demasiado grande (${rawBase64.length} chars) sin compresor DOM; se enviará correo sin imagen pesada para no exceder 1 MiB en Firestore.`);
    return null;
  }

  return {
    filename: `${filenamePrefix}_${codigo}.${ext}`,
    content: rawBase64,
    contentType,
    encoding: 'base64',
    cid
  };
}

export function buildMaestriaEmailHtml({
  nombre,
  doc,
  email = '',
  rol,
  equipo,
  codigo,
  fecha,
  telefono,
  ip = 'No detectada',
  geoLocation = 'Lima, Perú 🇵🇪',
  coordinates = '',
  device = '',
  firmaTexto = '',
  sha256Hash = '',
  hasInlinePass = false
}) {
  const safeName = nombre || 'Participante';
  const safeSignature = firmaTexto || safeName;
  const fullClausesHtml = renderContractSectionsHtml(MAESTRIA_CONTRACT_SECTIONS, '#d97706');

  return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 14px; overflow: hidden; background-color: #ffffff; color: #1e293b;">
        <!-- Cabecera Institucional -->
        <div style="background: linear-gradient(135deg, #091124 0%, #172554 100%); color: #ffffff; padding: 30px 24px; text-align: center; border-bottom: 4px solid #f59e0b;">
          <span style="display: inline-block; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #fbbf24; font-weight: 800; margin-bottom: 8px;">CREACIÓN CUÁNTICA E.I.R.L. · RUC 20612592811</span>
          <h1 style="margin: 0; font-size: 23px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">📄 CONTRATO FIRMADO + PASE DE VALIDACIÓN</h1>
          <p style="margin: 8px 0 0 0; font-size: 14.5px; color: #93c5fd; font-weight: 600;">Maestría del Juego &amp; Comunidad CREAR · Sede Lima · Código ${codigo}</p>
        </div>

        <!-- Contenido Principal -->
        <div style="padding: 28px 24px;">
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 0;">
            Estimado(a) <strong>${safeName}</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Adjunto a este correo encontrarás <strong>ambos documentos oficiales diferenciados</strong> correspondientes a tu suscripción electrónica del <strong>Contrato Unificado y Reglas de Sala y Comunidad</strong> de <strong>Maestría del Juego (Sede Lima)</strong>:
          </p>

          <!-- Guía Clara de los 2 Archivos Adjuntos -->
          <div style="background-color: #fffbeb; border: 1.5px solid #f59e0b; border-radius: 10px; padding: 16px 18px; margin: 18px 0;">
            <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #92400e; margin-bottom: 10px;">
              📎 Documentos Oficiales Incluidos en este Correo:
            </div>
            <div style="margin-bottom: 10px; padding: 10px 12px; background-color: #ffffff; border: 1px solid #fde68a; border-radius: 8px; font-size: 13px; color: #1e293b;">
              <strong style="color: #b45309;">1. 📄 CONTRATO LEGAL ÍNTEGRO FIRMADO (PDF):</strong><br/>
              <span style="font-family: monospace; font-weight: 700; color: #0f172a;">CONTRATO_FIRMADO_MAESTRIA_LIMA_${codigo}.pdf</span><br/>
              <span style="color: #475569; font-size: 12.5px;">Documento jurídico A4 completo con todas las cláusulas (Secciones I a VI), las 3 casillas Clickwrap aceptadas, tu firma electrónica vinculante y el sello criptográfico SHA-256.</span>
            </div>
            <div style="padding: 10px 12px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; color: #1e293b;">
              <strong style="color: #0369a1;">2. 🪪 PASE VISUAL DE VALIDACIÓN / ACREDITACIÓN (JPG):</strong><br/>
              <span style="font-family: monospace; font-weight: 700; color: #0f172a;">PASE_VALIDACION_MAESTRIA_LIMA_${codigo}.jpg</span><br/>
              <span style="color: #475569; font-size: 12.5px;">Credencial gráfica con código QR únicamente para verificación ágil de ingreso en puerta/sala.</span>
            </div>
          </div>

          <!-- Tarjeta de Datos Registrados y Auditoría Forense -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 14px 0; color: #0f172a; font-size: 15px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
              📋 Datos del Suscriptor, Firma Electrónica y Trazabilidad Forense
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 42%;">Titular Declarante:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Documento de Identidad:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${doc}</td>
              </tr>
              ${email ? `<tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Correo Registrado:</td>
                <td style="padding: 6px 0; color: #0f172a;">${email}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Teléfono / WhatsApp:</td>
                <td style="padding: 6px 0; color: #0f172a;">${telefono || 'Registrado'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Rol en Sala:</td>
                <td style="padding: 6px 0; color: #2563eb; font-weight: 700;">${rol}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Cohorte / Equipo:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${equipo}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Firma Electrónica Vinculante:</td>
                <td style="padding: 6px 0; color: #15803d; font-weight: 800; font-style: italic;">"${safeSignature}"</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Código Digital Único:</td>
                <td style="padding: 6px 0; color: #d97706; font-weight: 800; font-family: monospace;">${codigo}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Fecha y Hora Exacta:</td>
                <td style="padding: 6px 0; color: #0f172a;">${fecha} (Hora Oficial de Lima)</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Dirección IP Pública:</td>
                <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 700;">${ip}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Geolocalización:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${geoLocation} ${coordinates ? `(${coordinates})` : ''}</td>
              </tr>
              ${device ? `<tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Dispositivo / Entorno:</td>
                <td style="padding: 6px 0; color: #475569;">${device}</td>
              </tr>` : ''}
              ${sha256Hash ? `<tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Huella SHA-256:</td>
                <td style="padding: 6px 0; color: #475569; font-family: monospace; font-size: 11px; word-break: break-all;">${sha256Hash}</td>
              </tr>` : ''}
            </table>
          </div>

          <!-- Bloque de Cláusulas Clickwrap Aceptadas -->
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 8px; padding: 16px 18px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #166534; font-size: 14px; font-weight: 700;">
              ✓ Tres (3) Declaraciones Vinculantes Aceptadas (Clickwrap):
            </h4>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #166534; line-height: 1.6;">
              <li><strong>Casilla 1 (DOC 1) · Términos, Reglas de Maestría y Confidencialidad NDA:</strong> Aceptación del diseño educativo de inmersión de alto rendimiento (no equivale a terapia psicológica ni médica), pacto de no divulgación de contenidos y secreto de comunidad vigentes durante toda Maestría del Juego, después de Maestría como integrantes de la comunidad CREAR y por todo el tiempo que la ley peruana lo considere vigente; prohibición de grabaciones, cero alcohol/sustancias, prohibición de préstamos/negocios/apuestas entre miembros, cero nuevas relaciones sentimentales durante el proceso y asistencia mínima &gt;80%.</li>
              <li><strong>Casilla 2 (DOC 2) · Declaración Jurada de Salud y Exoneración:</strong> Declaración jurada de aptitud física y psicológica, y exoneración amplia e irrevocable de responsabilidad a Creación Cuántica E.I.R.L. (RUC 20612592811).</li>
              <li><strong>Casilla 3 (DOC 3) · Tratamiento de Datos e Imagen:</strong> Autorización de tratamiento de datos personales conforme a la Ley N° 29733 y D.S. N° 016-2024-JUS, uso de imagen institucional y registro probatorio de IP pública y geolocalización.</li>
            </ul>
          </div>

          <!-- Texto Íntegro del Contrato Firmado en el Cuerpo del Correo -->
          <div style="margin: 26px 0;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #f59e0b; padding-bottom: 6px;">
              📜 Texto Íntegro del Contrato Unificado y Reglas de Sala Firmado (Secciones I a VI)
            </h3>
            <p style="font-size: 12.5px; color: #475569; margin: 0 0 14px 0;">
              A continuación se transcribe íntegramente el texto contractual aceptado (idéntico al archivo <strong>CONTRATO_FIRMADO_MAESTRIA_LIMA_${codigo}.pdf</strong> adjunto):
            </p>
            ${fullClausesHtml}
          </div>

          <!-- Pase Oficial de Validación Adjunto -->
          ${hasInlinePass ? `<div style="text-align: center; margin: 28px 0; padding: 18px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px;">
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0369a1; margin-bottom: 4px;">🪪 Credencial Visual de Validación para Sala</div>
            <p style="font-size: 12.5px; color: #64748b; margin: 0 0 12px 0;">Usa esta imagen para acreditar tu ingreso en puerta (tu contrato legal completo es el PDF adjunto):</p>
            <img src="cid:pase_maestria_oficial" alt="Pase de Validación de Maestría" style="max-width: 320px; width: 100%; height: auto; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); border: 2px solid #f59e0b;" />
          </div>` : ''}

          <p style="font-size: 12.5px; color: #64748b; line-height: 1.5; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
            Este es un expediente probatorio oficial emitido para Creación Cuántica E.I.R.L. (RUC 20612592811 · Cal. Berlín Nro. 965 Int. 302, Miraflores, Lima – Perú). La firma electrónica con registro de IP y geolocalización goza de plena eficacia jurídica conforme a la Ley N° 27269 y el Código Civil Peruano (Arts. 141 y 141-A).
          </p>
        </div>

        <!-- Pie de página -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 20px; text-align: center; font-size: 11px; color: #94a3b8;">
          CREACIÓN CUÁNTICA E.I.R.L. · RUC 20612592811 · Lima, Perú<br/>
          Programa de Potencial Humano CREAR Poder Sin Límites
        </div>
      </div>
    `;
}

/**
 * Envía el correo formal con AMBOS adjuntos oficiales:
 * 1) CONTRATO_FIRMADO_MAESTRIA_LIMA_${codigo}.pdf (Contrato legal íntegro firmado en A4)
 * 2) PASE_VALIDACION_MAESTRIA_LIMA_${codigo}.jpg (Pase visual de validación con QR)
 */
export async function sendMaestriaConfirmationEmail({
  db,
  toEmail,
  nombre,
  doc,
  rol,
  equipo,
  codigo,
  fecha,
  passDataUrl,
  telefono,
  ip = 'No detectada',
  geoLocation = 'Lima, Perú 🇵🇪',
  coordinates = '',
  device = '',
  firmaTexto = '',
  sha256Hash = ''
}) {
  const cleanEmail = String(toEmail || '').trim().toLowerCase();
  if (!db || !cleanEmail || !cleanEmail.includes('@')) return false;

  try {
    const safeName = nombre || 'Participante';
    const safeCode = codigo || 'VERIFIED';

    const contractPdfAttachment = buildMaestriaContractPdfAttachment({
      nombre: safeName,
      doc,
      email: cleanEmail,
      telefono,
      rol,
      equipo,
      codigo: safeCode,
      fecha,
      ip,
      geoLocation,
      coordinates,
      device,
      firmaTexto: firmaTexto || safeName,
      sha256Hash
    });

    const passAttachment = await preparePassEmailAttachment(
      passDataUrl,
      'PASE_VALIDACION_MAESTRIA_LIMA',
      safeCode,
      'pase_maestria_oficial'
    );

    const attachments = [contractPdfAttachment, ...(passAttachment ? [passAttachment] : [])];

    const emailHtml = buildMaestriaEmailHtml({
      nombre: safeName,
      doc,
      email: cleanEmail,
      rol,
      equipo,
      codigo: safeCode,
      fecha,
      telefono,
      ip,
      geoLocation,
      coordinates,
      device,
      firmaTexto: firmaTexto || safeName,
      sha256Hash,
      hasInlinePass: Boolean(passAttachment)
    });

    const nowIso = new Date().toISOString();
    const mailDoc = {
      to: [cleanEmail],
      robot_token: 'NODUS_ROBOT_CPSL_2026_SECRET',
      createdAt: nowIso,
      created_at: nowIso,
      delivery: {
        state: 'PENDING',
        attemptCount: 0
      },
      type: 'contrato_maestria_confirmacion',
      hasFullContractPdf: true,
      recipientEmail: cleanEmail,
      recipientName: safeName,
      codigoRegistro: safeCode,
      ip,
      geoLocation,
      message: {
        subject: `📄 CONTRATO FIRMADO (PDF) + PASE DE VALIDACIÓN: Maestría del Juego (Lima) — ${safeCode}`,
        html: emailHtml,
        attachments
      }
    };

    const docRef = await addDoc(collection(db, 'mail'), mailDoc);
    return { ok: true, mailId: docRef.id };
  } catch (error) {
    console.error('Error enviando correo de confirmación de Maestría:', error);
    return false;
  }
}

/**
 * Genera el Pase Oficial Digital (1080x1440) de Caminata sobre Fuego ("SÍ VOY A CAMINAR SOBRE FUEGO")
 * Incluye IP Pública y Geolocalización forense sin excepción.
 */
export async function generateFirewalkPassCanvas({
  nombre,
  documento,
  rolActividad = 'Participante',
  lugar = 'Casona Blanca · Calle Las Perdices 1126, Huachipa (Lima)',
  fecha,
  codigo,
  ip = 'No detectada',
  geoLocation = 'Lima, Perú 🇵🇪',
  coordinates = ''
}) {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1440;
      const ctx = canvas.getContext('2d');
      const W = 1080;
      const H = 1440;

      // 1. Fondo degradado noche & fuego
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#050914');
      bgGrad.addColorStop(0.3, '#120702');
      bgGrad.addColorStop(0.65, '#220b02');
      bgGrad.addColorStop(1, '#050201');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // 2. Resplandor radial de brasas
      const fireGlow = ctx.createRadialGradient(W / 2, H - 160, 40, W / 2, H - 220, 680);
      fireGlow.addColorStop(0, 'rgba(255, 115, 0, 0.45)');
      fireGlow.addColorStop(0.3, 'rgba(234, 88, 12, 0.28)');
      fireGlow.addColorStop(0.6, 'rgba(185, 28, 28, 0.14)');
      fireGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fireGlow;
      ctx.fillRect(0, 0, W, H);

      // Chispas fijas
      const sparks = [
        { x: 180, y: 1200, r: 4, a: 0.8 }, { x: 240, y: 1050, r: 6, a: 0.9 }, { x: 320, y: 1280, r: 3, a: 0.7 },
        { x: 450, y: 1150, r: 5, a: 0.85 }, { x: 620, y: 1100, r: 6, a: 0.9 }, { x: 750, y: 1240, r: 4, a: 0.75 },
        { x: 880, y: 1120, r: 5, a: 0.8 }, { x: 920, y: 1290, r: 3, a: 0.6 }, { x: 140, y: 880, r: 3, a: 0.5 },
        { x: 290, y: 780, r: 4, a: 0.6 }, { x: 820, y: 820, r: 4, a: 0.55 }, { x: 940, y: 920, r: 3, a: 0.5 },
        { x: 520, y: 980, r: 7, a: 0.95 }, { x: 580, y: 1220, r: 5, a: 0.85 }, { x: 410, y: 1330, r: 4, a: 0.7 }
      ];
      sparks.forEach((s) => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 183, 3, ${s.a})`;
        ctx.shadowColor = '#ea580c';
        ctx.shadowBlur = 15;
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // 3. Marcos
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, W - 80, H - 80);

      ctx.strokeStyle = 'rgba(234, 88, 12, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(52, 52, W - 104, H - 104);

      const cornerSize = 40;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(40, 40 + cornerSize); ctx.lineTo(40, 40); ctx.lineTo(40 + cornerSize, 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - 40 - cornerSize, 40); ctx.lineTo(W - 40, 40); ctx.lineTo(W - 40, 40 + cornerSize); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(40, H - 40 - cornerSize); ctx.lineTo(40, H - 40); ctx.lineTo(40 + cornerSize, H - 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - 40 - cornerSize, H - 40); ctx.lineTo(W - 40, H - 40); ctx.lineTo(W - 40, H - 40 - cornerSize); ctx.stroke();

      // 4. Header
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f59e0b';
      ctx.font = '700 24px Montserrat, system-ui, sans-serif';
      ctx.fillText('CREACIÓN CUÁNTICA • MAESTRÍA DEL JUEGO', W / 2, 105);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 17px Montserrat, system-ui, sans-serif';
      ctx.fillText('SEDE LIMA · HUACHIPA · NOVIEMBRE 2026', W / 2, 136);

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(180, 158); ctx.lineTo(W - 180, 158); ctx.stroke();

      // 5. TÍTULO PRINCIPAL
      ctx.font = '85px Arial, sans-serif';
      ctx.fillText('🔥', W / 2, 260);

      const textGrad = ctx.createLinearGradient(150, 0, W - 150, 0);
      textGrad.addColorStop(0, '#fef08a');
      textGrad.addColorStop(0.3, '#f59e0b');
      textGrad.addColorStop(0.7, '#ea580c');
      textGrad.addColorStop(1, '#dc2626');

      ctx.shadowColor = 'rgba(234, 88, 12, 0.85)';
      ctx.shadowBlur = 25;
      ctx.fillStyle = textGrad;
      ctx.font = '900 62px Montserrat, system-ui, sans-serif';
      ctx.fillText('SÍ VOY A CAMINAR', W / 2, 345);

      ctx.font = '900 76px Montserrat, system-ui, sans-serif';
      ctx.fillText('SOBRE FUEGO', W / 2, 430);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#fdba74';
      ctx.font = '700 19px Montserrat, system-ui, sans-serif';
      ctx.fillText('HABILITACIÓN Y REGISTRO OFICIAL DE FUEGO', W / 2, 480);

      // 6. Tarjeta Titular
      const boxX = 80;
      const boxY = 515;
      const boxW = W - 160;
      const boxH = 625;

      ctx.fillStyle = 'rgba(10, 16, 30, 0.88)';
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.55)';
      ctx.lineWidth = 2;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 24);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeRect(boxX, boxY, boxW, boxH);
      }

      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffedd5';
      ctx.font = '800 18px Montserrat, system-ui, sans-serif';
      ctx.fillText('⚡ ACREDITADO EN SALA', boxX + 40, boxY + 50);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#fb923c';
      ctx.font = '900 22px Montserrat, system-ui, sans-serif';
      ctx.fillText((rolActividad || 'PARTICIPANTE').toUpperCase(), boxX + boxW - 40, boxY + 50);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath(); ctx.moveTo(boxX + 30, boxY + 80); ctx.lineTo(boxX + boxW - 30, boxY + 80); ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 18px Montserrat, system-ui, sans-serif';
      ctx.fillText('TITULAR DECLARANTE:', boxX + 40, boxY + 125);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 38px Montserrat, system-ui, sans-serif';
      const cleanNombre = (nombre || 'PARTICIPANTE').toUpperCase();
      ctx.fillText(cleanNombre.slice(0, 32), boxX + 40, boxY + 178);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 18px Montserrat, system-ui, sans-serif';
      ctx.fillText('DOCUMENTO DE IDENTIFICACIÓN:', boxX + 40, boxY + 265);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '900 34px Montserrat, system-ui, sans-serif';
      ctx.fillText((documento || '').toUpperCase(), boxX + 40, boxY + 312);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 18px Montserrat, system-ui, sans-serif';
      ctx.fillText('LOCACIÓN CONFIRMADA:', boxX + 40, boxY + 385);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 22px Montserrat, system-ui, sans-serif';
      ctx.fillText(lugar.slice(0, 56), boxX + 40, boxY + 422);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 15px "Courier New", monospace';
      const geoDisplay = coordinates ? `${geoLocation} (${coordinates})` : geoLocation;
      ctx.fillText(`IP: ${ip} | GEO: ${geoDisplay}`, boxX + 40, boxY + 478);

      ctx.fillStyle = '#10b981';
      ctx.font = '800 20px Montserrat, system-ui, sans-serif';
      ctx.fillText('✓ Instrumento Legal Firmado · Responsabilidad y Salud Aceptadas', boxX + 40, boxY + 540);

      // 7. Footer Criptográfico
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(80, 1165, W - 160, 155);

      ctx.fillStyle = '#fdba74';
      ctx.font = '800 22px "Courier New", monospace';
      ctx.fillText(`CÓDIGO DIGITAL: ${codigo}`, W / 2, 1210);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 17px Montserrat, system-ui, sans-serif';
      ctx.fillText(`Firma Registrada el: ${fecha} (Lima)`, W / 2, 1248);

      ctx.fillStyle = '#64748b';
      ctx.font = '500 14px Montserrat, system-ui, sans-serif';
      ctx.fillText('Creación Cuántica E.I.R.L. · RUC 20612592811 · Ley N° 27269', W / 2, 1285);

      resolve(canvas.toDataURL('image/png'));
    } catch (e) {
      console.error('Error al generar canvas de Caminata sobre Fuego:', e);
      resolve(null);
    }
  });
}

export function buildFirewalkEmailHtml({
  nombre,
  documento,
  email = '',
  telefono = '',
  rolActividad,
  lugar,
  codigo,
  fecha,
  ip = 'No detectada',
  geoLocation = 'Lima, Perú 🇵🇪',
  coordinates = '',
  device = '',
  aceptoImagen = false,
  firmaTexto = '',
  sha256Hash = '',
  hasInlinePass = false
}) {
  const safeName = nombre || 'Participante';
  const safeSignature = firmaTexto || safeName;
  const fullClausesHtml = renderContractSectionsHtml(FIREWALK_CONTRACT_SECTIONS, '#ea580c');

  return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 14px; overflow: hidden; background-color: #ffffff; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #120702 0%, #431407 100%); color: #ffffff; padding: 30px 24px; text-align: center; border-bottom: 4px solid #ea580c;">
          <span style="display: inline-block; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #fbbf24; font-weight: 800; margin-bottom: 8px;">CREACIÓN CUÁNTICA E.I.R.L. · RUC 20612592811</span>
          <h1 style="margin: 0; font-size: 23px; font-weight: 900; color: #ffffff;">📄 CONTRATO FIRMADO + PASE DE VALIDACIÓN</h1>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #fdba74; font-weight: 600;">Caminata sobre Fuego (Firewalk) · Sede Lima · Código ${codigo}</p>
        </div>

        <div style="padding: 28px 24px;">
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 0;">
            Hola <strong>${safeName}</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Tu suscripción electrónica del <strong>Instrumento Integrado de Exoneración de Responsabilidad, Declaración de Salud y Tratamiento de Datos</strong> para la dinámica <strong>Caminata sobre Fuego (Sede Lima)</strong> ha sido registrada de manera exitosa. En este correo te entregamos <strong>ambos documentos oficiales diferenciados</strong>:
          </p>

          <!-- Guía Clara de los 2 Archivos Adjuntos -->
          <div style="background-color: #fff7ed; border: 1.5px solid #ea580c; border-radius: 10px; padding: 16px 18px; margin: 18px 0;">
            <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #9a3412; margin-bottom: 10px;">
              📎 Documentos Oficiales Incluidos en este Correo:
            </div>
            <div style="margin-bottom: 10px; padding: 10px 12px; background-color: #ffffff; border: 1px solid #fed7aa; border-radius: 8px; font-size: 13px; color: #1e293b;">
              <strong style="color: #c2410c;">1. 📄 CONTRATO LEGAL ÍNTEGRO FIRMADO (PDF):</strong><br/>
              <span style="font-family: monospace; font-weight: 700; color: #0f172a;">CONTRATO_FIRMADO_CAMINATA_FUEGO_${codigo}.pdf</span><br/>
              <span style="color: #475569; font-size: 12.5px;">Documento jurídico A4 completo con todas las cláusulas de exoneración, salud y protección de datos, casillas aceptadas, firma electrónica y huella SHA-256.</span>
            </div>
            <div style="padding: 10px 12px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; color: #1e293b;">
              <strong style="color: #0369a1;">2. 🪪 PASE VISUAL DE VALIDACIÓN / ACREDITACIÓN (JPG):</strong><br/>
              <span style="font-family: monospace; font-weight: 700; color: #0f172a;">PASE_VALIDACION_CAMINATA_FUEGO_${codigo}.jpg</span><br/>
              <span style="color: #475569; font-size: 12.5px;">Credencial visual para validación ágil de acceso al área de Caminata sobre Fuego.</span>
            </div>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 14px 0; color: #0f172a; font-size: 15px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
              🔥 Resumen del Suscriptor, Firma Electrónica y Trazabilidad Forense
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 42%;">Titular Declarante:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Documento:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${documento}</td>
              </tr>
              ${email ? `<tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Correo Registrado:</td>
                <td style="padding: 6px 0; color: #0f172a;">${email}</td>
              </tr>` : ''}
              ${telefono ? `<tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Teléfono / WhatsApp:</td>
                <td style="padding: 6px 0; color: #0f172a;">${telefono}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Rol en la Actividad:</td>
                <td style="padding: 6px 0; color: #ea580c; font-weight: 700;">${rolActividad}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Locación Confirmada:</td>
                <td style="padding: 6px 0; color: #0f172a;">${lugar}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Uso de Imagen (Opt-In):</td>
                <td style="padding: 6px 0; color: ${aceptoImagen ? '#15803d' : '#475569'}; font-weight: 700;">${aceptoImagen ? 'AUTORIZADO (5 años)' : 'NO AUTORIZADO (Distintivo de privacidad en sala)'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Firma Electrónica Vinculante:</td>
                <td style="padding: 6px 0; color: #15803d; font-weight: 800; font-style: italic;">"${safeSignature}"</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Código Digital Único:</td>
                <td style="padding: 6px 0; color: #ea580c; font-weight: 800; font-family: monospace;">${codigo}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Fecha y Hora Exacta:</td>
                <td style="padding: 6px 0; color: #0f172a;">${fecha} (Lima)</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Dirección IP Pública:</td>
                <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 700;">${ip}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Geolocalización:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${geoLocation} ${coordinates ? `(${coordinates})` : ''}</td>
              </tr>
              ${device ? `<tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Dispositivo:</td>
                <td style="padding: 6px 0; color: #475569;">${device}</td>
              </tr>` : ''}
              ${sha256Hash ? `<tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Huella SHA-256:</td>
                <td style="padding: 6px 0; color: #475569; font-family: monospace; font-size: 11px; word-break: break-all;">${sha256Hash}</td>
              </tr>` : ''}
            </table>
          </div>

          <!-- Texto Íntegro del Contrato Firmado en el Cuerpo del Correo -->
          <div style="margin: 26px 0;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #ea580c; padding-bottom: 6px;">
              📜 Texto Íntegro del Instrumento Legal Firmado (Caminata sobre Fuego)
            </h3>
            <p style="font-size: 12.5px; color: #475569; margin: 0 0 14px 0;">
              A continuación se transcribe íntegramente el contrato suscrito (idéntico al archivo <strong>CONTRATO_FIRMADO_CAMINATA_FUEGO_${codigo}.pdf</strong> adjunto):
            </p>
            ${fullClausesHtml}
          </div>

          ${hasInlinePass ? `<div style="text-align: center; margin: 28px 0; padding: 18px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px;">
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #c2410c; margin-bottom: 4px;">🪪 Credencial Visual de Validación para Sala</div>
            <p style="font-size: 12.5px; color: #64748b; margin: 0 0 12px 0;">Usa esta imagen para acreditar tu ingreso en sala (tu contrato legal completo es el PDF adjunto):</p>
            <img src="cid:pase_fuego_oficial" alt="Pase de Validación Caminata sobre Fuego" style="max-width: 320px; width: 100%; height: auto; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); border: 2px solid #ea580c;" />
          </div>` : ''}

          <p style="font-size: 12.5px; color: #64748b; line-height: 1.5; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
            Expediente probatorio oficial emitido para Creación Cuántica E.I.R.L. (RUC 20612592811 · Cal. Berlín Nro. 965 Int. 302, Miraflores, Lima – Perú) conforme a la Ley N° 27269, Código Civil Peruano y Ley N° 29733.
          </p>
        </div>
      </div>
    `;
}

/**
 * Envía inmediatamente por correo AMBOS adjuntos oficiales de la Caminata sobre Fuego:
 * 1) CONTRATO_FIRMADO_CAMINATA_FUEGO_${codigo}.pdf (Instrumento legal íntegro firmado en A4)
 * 2) PASE_VALIDACION_CAMINATA_FUEGO_${codigo}.jpg (Pase visual de validación)
 */
export async function sendFirewalkConfirmationEmail({
  db,
  toEmail,
  nombre,
  documento,
  rolActividad,
  lugar,
  codigo,
  fecha,
  passDataUrl,
  telefono,
  ip = 'No detectada',
  geoLocation = 'Lima, Perú 🇵🇪',
  coordinates = '',
  device = '',
  aceptoImagen = false,
  firmaTexto = '',
  sha256Hash = ''
}) {
  const cleanEmail = String(toEmail || '').trim().toLowerCase();
  if (!db || !cleanEmail || !cleanEmail.includes('@')) return false;

  try {
    const safeName = nombre || 'Participante';
    const safeCode = codigo || 'VERIFIED';

    const contractPdfAttachment = buildFirewalkContractPdfAttachment({
      nombre: safeName,
      documento,
      email: cleanEmail,
      telefono: telefono || '',
      rolActividad,
      lugar,
      codigo: safeCode,
      fecha,
      ip,
      geoLocation,
      coordinates,
      device,
      aceptoImagen: Boolean(aceptoImagen),
      firmaTexto: firmaTexto || safeName,
      sha256Hash
    });

    const passAttachment = await preparePassEmailAttachment(
      passDataUrl,
      'PASE_VALIDACION_CAMINATA_FUEGO',
      safeCode,
      'pase_fuego_oficial'
    );

    const attachments = [contractPdfAttachment, ...(passAttachment ? [passAttachment] : [])];

    const emailHtml = buildFirewalkEmailHtml({
      nombre: safeName,
      documento,
      email: cleanEmail,
      telefono: telefono || '',
      rolActividad,
      lugar,
      codigo: safeCode,
      fecha,
      ip,
      geoLocation,
      coordinates,
      device,
      aceptoImagen: Boolean(aceptoImagen),
      firmaTexto: firmaTexto || safeName,
      sha256Hash,
      hasInlinePass: Boolean(passAttachment)
    });

    const nowIso = new Date().toISOString();
    const mailDoc = {
      to: [cleanEmail],
      robot_token: 'NODUS_ROBOT_CPSL_2026_SECRET',
      createdAt: nowIso,
      created_at: nowIso,
      delivery: {
        state: 'PENDING',
        attemptCount: 0
      },
      type: 'contrato_fuego_confirmacion',
      hasFullContractPdf: true,
      recipientEmail: cleanEmail,
      recipientName: safeName,
      codigoRegistro: safeCode,
      telefono: telefono || '',
      ip,
      geoLocation,
      message: {
        subject: `📄 CONTRATO FIRMADO (PDF) + PASE DE VALIDACIÓN: Caminata sobre Fuego (Lima) — ${safeCode}`,
        html: emailHtml,
        attachments
      }
    };

    const docRef = await addDoc(collection(db, 'mail'), mailDoc);
    return { ok: true, mailId: docRef.id };
  } catch (error) {
    console.error('Error enviando correo de confirmación de Caminata sobre Fuego:', error);
    return false;
  }
}
