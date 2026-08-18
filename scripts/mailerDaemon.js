import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import sanitizeHtml from 'sanitize-html';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, updateDoc, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

dotenv.config();

// --- 1. CONFIGURACIÓN DE FIREBASE CLIENT ---
// NOTA: Para ejecutar esto necesitas "npm install nodemailer firebase dotenv"
// Reemplaza esto con los datos de tu src/services/firebase.js
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 2. CONFIGURACIÓN DE GMAIL (NODEMAILER) ---
if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
  console.error("❌ Faltan credenciales de Gmail (GMAIL_USER o GMAIL_PASS). El daemon no puede iniciar.");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

console.log("🚀 Mailer Daemon Iniciado. Escuchando nuevos correos en Firestore...");

// --- 3. ESCUCHAR LA COLECCIÓN 'mail' ---
onSnapshot(collection(db, 'mail'), (snapshot) => {
  snapshot.docChanges().forEach(async (change) => {
    if (change.type === 'added') {
      const data = change.doc.data();
      
      // Si el correo ya tiene estado (como SUCCESS), ignorarlo
      if (data.delivery && data.delivery.state) return;

      const isCorporate = ['@crearpsl.net', '@crearpsl.com'].some(d => data.to?.toLowerCase().endsWith(d));
      
      if (!isCorporate) {
        // Para correos externos (gmail, hotmail, etc.), verificar que existan en el directorio
        try {
          const q = query(collection(db, "users"), where("emails", "array-contains", data.to?.toLowerCase().trim()));
          const snap = await getDocs(q);
          if (snap.empty) {
            console.warn(`⚠️ Intento de envío a correo no registrado en el directorio: ${data.to}`);
            await updateDoc(doc(db, 'mail', change.doc.id), { 
              'delivery.state': 'REJECTED', 
              reason: 'Correo externo no pertenece a ningún usuario registrado' 
            });
            return;
          }
        } catch (error) {
          console.error("Error validando correo contra la base de datos:", error);
          // Si hay error validando, rechazamos por seguridad
          return;
        }
      }

      console.log(`📧 Nuevo correo detectado para: ${data.to}`);

      const rawHtml = data.message?.html || '<p>Tienes una notificación.</p>';
      const cleanHtml = sanitizeHtml(rawHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          'a': ['href', 'name', 'target'],
          'img': ['src', 'alt']
        }
      });

      const mailOptions = {
        from: '"CREAR Poder Sin Límites" <servidorcrearpsl@gmail.com>',
        to: data.to,
        subject: data.message?.subject || 'Notificación SO-AR',
        html: cleanHtml
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Correo enviado a ${data.to}`);
        
        // Marcar como enviado en Firestore
        await updateDoc(doc(db, 'mail', change.doc.id), {
          'delivery.state': 'SUCCESS',
          'delivery.endTime': new Date().toISOString()
        });
      } catch (error) {
        console.error(`❌ Error al enviar a ${data.to}:`, error);
        await updateDoc(doc(db, 'mail', change.doc.id), {
          'delivery.state': 'ERROR',
          'delivery.error': error.message
        });
      }
    }
  });
});

// --- 4. VERIFICACIÓN DE INACTIVIDAD (CADA 1 HORA) ---
const INACTIVITY_LIMIT_HOURS = 72;
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

async function checkInactivity() {
  console.log("🔍 Iniciando chequeo de inactividad de usuarios...");
  try {
    const profilesSnap = await getDocs(collection(db, 'user_profiles'));
    const now = new Date();
    
    for (const docSnap of profilesSnap.docs) {
      const data = docSnap.data();
      if (!data.lastLoginAt) continue; // Si nunca ha logueado en la nueva versión, ignorar

      const email = docSnap.id;
      const lastLoginDate = data.lastLoginAt.toDate ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt);
      
      const hoursSinceLogin = (now - lastLoginDate) / (1000 * 60 * 60);

      if (hoursSinceLogin > INACTIVITY_LIMIT_HOURS) {
        // Verificar si ya le enviamos alerta para este periodo
        const lastAlertDate = data.lastInactivityAlertAt?.toDate ? data.lastInactivityAlertAt.toDate() : (data.lastInactivityAlertAt ? new Date(data.lastInactivityAlertAt) : new Date(0));
        
        if (lastAlertDate < lastLoginDate) {
          console.log(`⚠️ Usuario ${email} inactivo por más de ${INACTIVITY_LIMIT_HOURS} horas. Programando alerta.`);
          
          // Generar correo
          await addDoc(collection(db, 'mail'), {
            to: email,
            message: {
              subject: '⚠️ Aviso de Inactividad en SO-AR',
              html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                  <div style="background-color: #ef4444; color: #fff; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">Aviso de Inactividad</h1>
                  </div>
                  <div style="padding: 30px; background-color: #f9fafb;">
                    <p style="font-size: 16px;">Hola,</p>
                    <p style="font-size: 16px;">Hemos notado que no has ingresado a la plataforma <strong>SO-AR</strong> en más de 72 horas.</p>
                    <p style="font-size: 16px;">Recuerda que es vital mantener tu matriz operativa actualizada para el cumplimiento de las metas globales.</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://crearpsl-soar.web.app" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ingresar ahora a SO-AR</a>
                    </div>
                    <p style="font-size: 14px; color: #666; text-align: center; margin-top: 20px;">CREAR Poder Sin Límites - Sistema SO-AR</p>
                  </div>
                </div>
              `
            }
          });

          // Actualizar lastInactivityAlertAt
          await updateDoc(doc(db, 'user_profiles', email), {
            lastInactivityAlertAt: serverTimestamp()
          });
        }
      }
    }
  } catch (error) {
    console.error("❌ Error verificando inactividad:", error);
  }
}

// Ejecutar el chequeo inmediatamente al iniciar y luego cada intervalo
checkInactivity();
setInterval(checkInactivity, CHECK_INTERVAL_MS);

