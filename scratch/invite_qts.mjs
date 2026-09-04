import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./centro-operativo-cpsl-65ad52160f45.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth();
const db = getFirestore();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'servidorcrearpsl@gmail.com',
    pass: 'oaqx kewm uirh bwuo'
  }
});

const qtsToInvite = [
  { name: 'Gina Cardenas Lopez', email: 'cardenaslopezgina@gmail.com', sede: 'Lima' },
  { name: 'Rosmery Ochoa Ferrer', email: 'rouz1414@gmail.com', sede: 'Lima' }
];

async function run() {
  for (const qt of qtsToInvite) {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(qt.email);
      console.log('User ' + qt.email + ' already exists in Auth.');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('Creating user ' + qt.email + ' in Auth...');
        userRecord = await auth.createUser({
          email: qt.email,
          displayName: qt.name,
          password: 'Causa' + Math.floor(1000 + Math.random() * 9000), 
        });
      } else {
        console.error('Error fetching user ' + qt.email + ':', error);
        continue;
      }
    }

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, { role: 'qt' });

    // Create/update Firestore document
    console.log('Updating Firestore for ' + qt.email + '...');
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: qt.name,
      displayName: qt.name,
      email: qt.email,
      role: 'qt',
      appRole: 'qt',
      roles: ['qt'],
      sede: qt.sede,
      status: 'active',
      createdAt: new Date().toISOString()
    }, { merge: true });

    // Generate password reset link
    const resetLink = await auth.generatePasswordResetLink(qt.email);

    // Send email
    console.log('Sending invite email to ' + qt.email + '...');
    const mailOptions = {
      from: 'Causa OS - Crear Poder Sin Límites <servidorcrearpsl@gmail.com>',
      to: qt.email,
      subject: '¡Bienvenida al Quantum Team en Causa OS! ',
      html: '<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">' +
            '<div style="background-color: #0d152d; padding: 20px; text-align: center;">' +
            '<h1 style="color: #fff; margin: 0;">Causa OS</h1>' +
            '</div>' +
            '<div style="padding: 30px;">' +
            '<h2 style="color: #10b981;">¡Hola ' + qt.name + '!</h2>' +
            '<p>Bienvenida a <strong>Causa OS</strong>, el Sistema Operativo oficial de Crear Poder Sin Límites.</p>' +
            '<p>Tu perfil de <strong>Quantum Team (QT) - Sede ' + qt.sede + '</strong> ha sido configurado y está listo para usarse.</p>' +
            '<p>Para ingresar por primera vez y establecer tu contraseña, haz clic en el siguiente enlace seguro:</p>' +
            '<div style="text-align: center; margin: 30px 0;">' +
            '<a href="' + resetLink + '" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Configurar mi contraseña e ingresar</a>' +
            '</div>' +
            '<p>Una vez dentro, podrás acceder al <strong>Manual QT</strong>, registrar tus métricas y revisar los tableros de tu sede.</p>' +
            '<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />' +
            '<p style="font-size: 12px; color: #777;">Este es un mensaje automático de la plataforma Causa OS. Si necesitas ayuda, responde a sistemas@crearpsl.net.</p>' +
            '</div></div>'
    };

    await transporter.sendMail(mailOptions);
    console.log('Invite sent to ' + qt.email + ' successfully.');
  }
  process.exit(0);
}

run().catch(console.error);