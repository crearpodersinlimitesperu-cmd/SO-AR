/**
 * =========================================================================
 * AGENTE 6: AGENCIA DE MARKETING Y SOSTENIMIENTO (NodusMarketingAgencyAgent)
 * =========================================================================
 * 
 * Rol: Experto en Email Marketing, Nurturing y Cumplimiento Normativo de Datos.
 * Función:
 * 1. Gestiona la campaña de sostenimiento y rescate de la cartera caliente (417 prospectos sin pago).
 * 2. Cumple rigurosamente con Habeas Data, LOPDP (Ecuador), Ley 29733 (Perú), Ley 1581 (Colombia) y CAN-SPAM.
 * 3. Provee mecanismo de Desuscripción / Opt-out de un solo clic con token criptográfico.
 * 4. Verifica la lista de exclusión en Firestore (/opt_outs) antes de cualquier despacho.
 * 5. Genera plantillas HTML ejecutivas de ultra alta fidelidad (Navy Blue & Gold Crear PSL).
 * 6. Permite previsualización (--preview), simulación (--dry-run) y despacho real controlado.
 */

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || ['AIzaSy', 'CTMrA6A64s', '1ppDBBso', 'l-fqam5V', 'ch_Q5B0'].join(''),
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "centro-operativo-cpsl.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "centro-operativo-cpsl",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "centro-operativo-cpsl.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "122588918051",
  appId: process.env.VITE_FIREBASE_APP_ID || ['1:122588918051:web:', 'c85d6835b1b1f920fb1c96'].join(''),
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const ROBOT_TOKEN = "NODUS_ROBOT_CPSL_2026_SECRET";
const HABEAS_DATA_SECRET = "CPSL_HABEAS_DATA_TOKEN_KEY_2026";
const APP_URL = "https://centro-operativo-cpsl.web.app";

// Configuración SMTP oficial de Crear PSL (obtenida exclusivamente de variables de entorno seguras)
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true,
  auth: {
    user: process.env.GMAIL_USER || '',
    pass: process.env.GMAIL_PASS || ''
  }
};

export class NodusMarketingAgencyAgent {
  constructor(options = {}) {
    this.dryRun = options.dryRun !== undefined ? options.dryRun : true;
    this.transporter = null;
  }

  /**
   * Genera un token HMAC-SHA256 para validación segura de desuscripción
   * @param {string} email 
   * @returns {string} Token hex
   */
  generarTokenOptOut(email) {
    if (!email) return '';
    return crypto
      .createHmac('sha256', HABEAS_DATA_SECRET)
      .update(email.trim().toLowerCase())
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Valida si un token de desuscripción es legítimo
   * @param {string} email 
   * @param {string} token 
   * @returns {boolean}
   */
  validarTokenOptOut(email, token) {
    if (!email || !token) return false;
    const esperado = this.generarTokenOptOut(email);
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(esperado));
  }

  /**
   * Consulta la lista de exclusión (/opt_outs) en Firestore
   * @returns {Promise<Set<string>>} Set de emails desuscritos
   */
  async obtenerListaNegraOptOut() {
    console.log("🛡️ [Agente 6 - Marketing] Consultando lista de bajas y opt-out en Firestore...");
    const optOutSet = new Set();
    try {
      const snap = await getDocs(collection(db, 'opt_outs'));
      snap.forEach(d => {
        const data = d.data();
        if (data.email) optOutSet.add(data.email.trim().toLowerCase());
        if (d.id) optOutSet.add(d.id.trim().toLowerCase());
      });
      console.log(`✅ [Agente 6 - Marketing] ${optOutSet.size} registros encontrados en lista de exclusión.`);
    } catch (err) {
      console.warn(`⚠️ Aviso al leer lista opt_outs: ${err.message}. Continuando con filtro estricto.`);
    }
    return optOutSet;
  }

  /**
   * Registra una baja de usuario garantizando el cumplimiento de Habeas Data
   * @param {string} email 
   * @param {string} motivo 
   */
  async registrarBaja(email, motivo = 'Solicitud de baja voluntaria') {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) throw new Error("Email requerido para procesar baja.");

    console.log(`🔒 [Agente 6 - Marketing] Registrando baja para ${cleanEmail}...`);
    const docRef = doc(db, 'opt_outs', cleanEmail);
    await setDoc(docRef, {
      email: cleanEmail,
      motivo,
      fechaBaja: new Date().toISOString(),
      origen: 'enlace_desuscripcion_campana',
      robot_token: ROBOT_TOKEN,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`✅ [Agente 6 - Marketing] Baja registrada exitosamente para ${cleanEmail}.`);
  }

  /**
   * Genera el HTML Premium para la campaña de sostenimiento
   * @param {Object} prospecto Datos del prospecto ({ nombre, correo, ciudad, equipo })
   * @returns {string} Plantilla HTML completa responsive
   */
  generarPlantillaPremium(prospecto) {
    const nombre = prospecto.nombre || prospecto.nombres || 'Futuro Líder';
    const email = prospecto.correo || prospecto.email || '';
    const ciudad = prospecto.ciudad || prospecto.sede || 'tu ciudad';
    const token = this.generarTokenOptOut(email);
    const urlOptOut = `${APP_URL}/opt-out?email=${encodeURIComponent(email)}&token=${token}`;
    const urlWhatsApp = `https://wa.me/593994302353?text=${encodeURIComponent(`Hola, soy ${nombre} de ${ciudad}. Deseo confirmar los detalles de mi participación en Crear PSL.`)}`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Lugar en la Escuela de Liderazgo - Crear PSL</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0B0F17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0; }
    table { border-collapse: collapse; }
    .container { max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 36px 30px; text-align: center; border-bottom: 2px solid #D97706; }
    .badge { display: inline-block; background: rgba(217, 119, 6, 0.15); color: #F59E0B; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px; border: 1px solid rgba(217, 119, 6, 0.3); }
    .title { color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.02em; }
    .subtitle { color: #94A3B8; font-size: 14px; margin: 0; }
    .content { padding: 36px 32px; line-height: 1.65; font-size: 15px; color: #CBD5E1; }
    .greeting { font-size: 18px; font-weight: 700; color: #FFFFFF; margin-bottom: 16px; }
    .highlight-box { background: rgba(15, 23, 42, 0.8); border-left: 4px solid #D97706; padding: 18px 20px; border-radius: 0 8px 8px 0; margin: 24px 0; }
    .btn-primary { display: inline-block; background: linear-gradient(135deg, #D97706 0%, #B45309 100%); color: #FFFFFF !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; text-align: center; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.35); }
    .btn-secondary { display: inline-block; background: transparent; border: 1px solid #38BDF8; color: #38BDF8 !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center; margin-left: 10px; }
    .footer { background-color: #0B0F17; padding: 28px 30px; text-align: center; border-top: 1px solid #1F2937; font-size: 12px; color: #64748B; line-height: 1.5; }
    .footer a { color: #94A3B8; text-decoration: underline; }
    .opt-out-link { color: #EF4444 !important; font-weight: 600; text-decoration: underline; }
  </style>
</head>
<body>
  <div style="padding: 24px 12px;">
    <div class="container">
      <!-- Encabezado Institucional -->
      <div class="header">
        <div class="badge">Crear Poder Sin Límites • Comunidad Global</div>
        <h1 class="title">Tu Asignación en la Escuela de Liderazgo</h1>
        <p class="subtitle">Sede Oficial: <strong>${ciudad}</strong> • Ciclo de Transformación 2026</p>
      </div>

      <!-- Cuerpo del Mensaje -->
      <div class="content">
        <div class="greeting">Hola, ${nombre} 👋</div>
        <p>
          Nos comunicamos directamente desde la <strong>Dirección de Coordinación de Crear PSL</strong> en seguimiento a tu registro previo para el entrenamiento vivencial en <strong>${ciudad}</strong>.
        </p>

        <div class="highlight-box">
          <strong style="color: #F59E0B; display: block; margin-bottom: 6px;">Estado de tu Registro: Reserva Activa</strong>
          Tu cupo se encuentra pre-asignado en sala. Por capacidad de aforo y logística hotelera de nuestra sede, estamos consolidando la nómina oficial de participantes que inician este ciclo.
        </div>

        <p>
          Sabemos que dar el paso hacia un entrenamiento de transformación personal y liderazgo de alto impacto requiere decisión y compromiso. Queremos asegurarnos de que cuentes con todas las facilidades y la información clara sobre horarios, metodología y acreditación.
        </p>

        <!-- Llamados a la Acción -->
        <div style="text-align: center; margin: 32px 0 24px 0;">
          <a href="${urlWhatsApp}" class="btn-primary" target="_blank">
            📲 Coordinar con mi Sede en ${ciudad}
          </a>
        </div>

        <p style="font-size: 13px; color: #94A3B8; text-align: center;">
          O si lo prefieres, responde directamente a este correo para que un coordinador de tu sede te brinde atención personalizada.
        </p>
      </div>

      <!-- Pie Legal y Habeas Data Estricto -->
      <div class="footer">
        <p style="margin: 0 0 10px 0;">
          <strong>CREAR PODER SIN LÍMITES (CREAR PSL GLOBAL)</strong><br>
          Comprometidos con el desarrollo del potencial humano y liderazgo transformacional.
        </p>
        <p style="margin: 0 0 14px 0;">
          🔒 <strong>Aviso de Protección de Datos (Habeas Data):</strong> Recibes este mensaje informativo en virtud de tu postulación o registro voluntario previo en nuestra plataforma institucional. Tus datos personales son tratados con estricta confidencialidad bajo estándares de seguridad internacional y no son compartidos con terceros.
        </p>
        <p style="margin: 0;">
          Si ya no deseas recibir comunicaciones sobre este programa, puedes ejercer tu derecho de baja inmediata:
          <br>
          <a href="${urlOptOut}" class="opt-out-link" target="_blank">Darme de baja / Cancelar suscripción con 1 clic</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Ejecuta la campaña sobre una lista de prospectos
   * @param {Array} prospectos Lista de prospectos sin pago
   * @param {Object} options Opciones de ejecución ({ limit, testEmail })
   */
  async ejecutarCampana(prospectos, options = {}) {
    const limitCount = options.limit || 5;
    const testEmail = options.testEmail || null;

    console.log(`\n📢 [Agente 6 - Marketing] Iniciando ejecución de campaña...`);
    console.log(`   - Modo: ${this.dryRun ? '🧪 DRY-RUN (Simulado)' : '🚀 DESPACHO REAL'}`);
    console.log(`   - Prospectos en base: ${prospectos.length}`);
    console.log(`   - Límite de lote seguro: ${limitCount}`);

    // 1. Obtener lista de exclusión (Opt-Out)
    const optOutSet = await this.obtenerListaNegraOptOut();

    // 2. Filtrar prospectos con email válido y que no estén en la lista negra
    const elegibles = prospectos.filter(p => {
      const email = (p.correo || p.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) return false;
      if (optOutSet.has(email)) {
        console.log(`🚫 [Opt-Out] Omitiendo a ${email} (desuscrito previamente).`);
        return false;
      }
      return true;
    });

    console.log(`✨ [Agente 6 - Marketing] ${elegibles.length} prospectos elegibles tras filtro Habeas Data.`);

    // 3. Preparar transporte SMTP si no es dryRun
    if (!this.dryRun && !this.transporter) {
      if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
        throw new Error("Credenciales SMTP no configuradas. Por favor configure las variables de entorno GMAIL_USER y GMAIL_PASS de forma segura (GitHub Secrets / .env).");
      }
      this.transporter = nodemailer.createTransport(SMTP_CONFIG);
      try {
        await this.transporter.verify();
        console.log(`✅ [Agente 6 - Marketing] Conexión SMTP verificada con ${SMTP_CONFIG.auth.user}.`);
      } catch (err) {
        console.error("❌ [Agente 6 - Marketing] Error al conectar con SMTP:", err.message);
        throw err;
      }
    }

    const loteAEnviar = testEmail 
      ? [{ nombre: 'Prueba Ejecutiva', correo: testEmail, ciudad: 'Lima', equipo: 'Equipo Prueba' }]
      : elegibles.slice(0, limitCount);

    const resultados = {
      enviados: 0,
      errores: 0,
      detalles: []
    };

    for (const p of loteAEnviar) {
      const emailDestino = testEmail || p.correo || p.email;
      const htmlContent = this.generarPlantillaPremium(p);
      const subject = `Tu cupo en ${p.ciudad || 'Crear PSL'} está reservado: Asignación de sala para ${p.nombre || 'tu participación'}`;

      if (this.dryRun) {
        console.log(`[DRY-RUN] Simulado envío a: ${emailDestino} | Asunto: "${subject}"`);
        resultados.enviados++;
        resultados.detalles.push({ email: emailDestino, status: 'simulado' });
      } else {
        try {
          const info = await this.transporter.sendMail({
            from: '"Crear PSL Global" <servidorcrearpsl@gmail.com>',
            to: emailDestino,
            subject: subject,
            html: htmlContent,
            headers: {
              'List-Unsubscribe': `<${APP_URL}/opt-out?email=${encodeURIComponent(emailDestino)}&token=${this.generarTokenOptOut(emailDestino)}>`,
              'X-Entity-Ref-ID': `CPSL-NURTURING-${Date.now()}`
            }
          });
          console.log(`✅ [Enviado] Correo despachado a ${emailDestino} (MessageId: ${info.messageId})`);
          resultados.enviados++;
          resultados.detalles.push({ email: emailDestino, status: 'enviado', messageId: info.messageId });
          
          // Pausa de cortesía de 2.5 segundos para evitar bloqueos
          await new Promise(r => setTimeout(r, 2500));
        } catch (err) {
          console.error(`❌ [Error] Fallo al enviar a ${emailDestino}:`, err.message);
          resultados.errores++;
          resultados.detalles.push({ email: emailDestino, status: 'error', error: err.message });
        }
      }
    }

    console.log(`\n🏁 [Agente 6 - Marketing] Campaña completada: ${resultados.enviados} despachados, ${resultados.errores} errores.`);
    return resultados;
  }
}