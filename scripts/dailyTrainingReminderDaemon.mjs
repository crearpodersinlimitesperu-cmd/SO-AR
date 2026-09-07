import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inicializar Firebase Admin
try {
  const serviceAccount = JSON.parse(readFileSync(join(__dirname, '..', 'firebase-service-account.json'), 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  console.error("Error al cargar firebase-service-account.json.");
  process.exit(1);
}

const db = admin.firestore();
const API_URL = 'https://script.google.com/macros/s/AKfycbxSZFhddMYyspZpkW-qPHEi8hycLGfnhFeCPSYc4VbckWIeiiZAbxyJY71XRb2-Ya4U/exec?action=getEventos';

const TARGET_EVENTS = ['CAPITULO UNO', 'CAPITULO DOS', 'MAESTRIA DEL JUEGO'];
const TARGET_ROLES = ['gerente', 'coordinador', 'coord_c1', 'coordinador_maestria'];

const sedeMap = {
  'LIM': 'lima', 'UIO': 'quito', 'GYE': 'guayaquil', 'MEX': 'mexico',
  'CDMX': 'mexico', 'MED': 'medellin', 'CUE': 'cuenca', 'BOG': 'bogota'
};

async function sendReminders() {
  console.log("Iniciando escaneo de eventos de entrenamiento para hoy...");
  try {
    const res = await fetch(API_URL);
    const json = await res.json();
    const events = json.data || json;

    const today = new Date();
    // Ajustar -5 horas para zona horaria local LATAM en caso de ejecutarse en UTC
    today.setHours(today.getHours() - 5);
    const todayStr = today.toISOString().substring(0, 10);
    
    const todayEvents = events.filter(e => {
      if (!TARGET_EVENTS.includes(e.nombre || e.name)) return false;
      const fInicio = (e.fecha_inicio || e.start || '').substring(0, 10);
      const fFin = (e.fecha_fin || e.end || fInicio).substring(0, 10);
      if (!fInicio) return false;
      return todayStr >= fInicio && todayStr <= fFin;
    });

    if (todayEvents.length === 0) return console.log("No hay eventos hoy.");
    
    for (const event of todayEvents) {
      const sedeAbr = event.sede;
      const sedeFirebase = sedeMap[sedeAbr] || sedeAbr.toLowerCase();
      const eventName = event.nombre || event.name;
      
      const usersSnap = await db.collection('users').where('sede', '==', sedeFirebase).get();
      const emailsToNotify = [];
      
      usersSnap.forEach(doc => {
        const u = doc.data();
        if (TARGET_ROLES.includes(u.role) || TARGET_ROLES.includes(u.appRole)) {
          if (u.email) emailsToNotify.push(u.email);
        }
      });
      
      if (emailsToNotify.length > 0) {
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #d4af37; color: #fff; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">¡Hoy es día de ${eventName}!</h1>
              <p style="margin: 5px 0 0 0; font-size: 16px;">Sede: ${sedeAbr.toUpperCase()} | Equipo: ${event.equipo}</p>
            </div>
            
            <div style="padding: 20px; background-color: #fcfcfc;">
              <p style="font-size: 16px; line-height: 1.5;">Hola equipo,</p>
              <p style="font-size: 16px; line-height: 1.5;">Este es un recordatorio del <strong>Causa OS</strong> previo al inicio de sala del día de hoy.</p>
              
              <div style="background-color: #fff; border-left: 4px solid #d4af37; padding: 15px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <h3 style="margin-top: 0; color: #d4af37;">Checklist Rápido de Salón:</h3>
                <ul style="font-size: 15px; line-height: 1.6; padding-left: 20px;">
                  <li><strong>Sonido e Iluminación:</strong> Verificar micrófonos, música y luces funcionales.</li>
                  <li><strong>Limpieza:</strong> Salón impecable, sillas alineadas y baños limpios.</li>
                  <li><strong>Climatización:</strong> Aire acondicionado encendido y ajustado.</li>
                  <li><strong>Materiales:</strong> Baúles, hojas, esferos y herramientas listas según el módulo.</li>
                  <li><strong>Staff:</strong> Apoyos y equipo logístico en posición antes del ingreso.</li>
                </ul>
              </div>
              <p style="font-size: 16px; line-height: 1.5;">¡Vamos por un entrenamiento extraordinario!</p>
            </div>
          </div>
        `;
        
        await db.collection('mail').add({
          to: emailsToNotify,
          message: {
            subject: `🚨 Recordatorio Operativo: ${eventName} - Salón Impecable`,
            html: htmlContent
          }
        });
        console.log(`Enviado a ${emailsToNotify.length} personas en ${sedeFirebase}.`);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
sendReminders().then(() => process.exit(0));
