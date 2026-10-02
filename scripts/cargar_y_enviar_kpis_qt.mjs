import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';

const CREDENTIALS_PATH = './centro-operativo-cpsl-65ad52160f45.json';
if (!existsSync(CREDENTIALS_PATH)) {
    console.error("No service account json found!");
    process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const kpis = [
  {
    name: "ROSSMERY OCHOA",
    email: "rouz1414@gmail.com",
    stats: {
      PX: 55, DESERTOR: 9, PX_FIN: 46, DECLARACION: 23,
      C2: 8, C2_MJ: 6, ABONO: 0, ACUERDO: 0, FICHA: 3, PAGOS: 14, PP: "30%"
    }
  },
  {
    name: "GINA CARDENAS",
    email: "cardenaslopezgina@gmail.com",
    stats: {
      PX: 62, DESERTOR: 15, PX_FIN: 47, DECLARACION: 22,
      C2: 12, C2_MJ: 6, ABONO: 1, ACUERDO: 0, FICHA: 3, PAGOS: 18, PP: "38%"
    }
  }
];

async function run() {
  const batch = db.batch();

  for (const person of kpis) {
    // 1. Cargar KPI en Firestore
    const kpiRef = db.collection('qt_kpis').doc();
    batch.set(kpiRef, {
      sede: 'Lima',
      evento: 'C1E31',
      qtEmail: person.email,
      qtName: person.name,
      metrics: person.stats,
      createdAt: FieldValue.serverTimestamp()
    });

    // 2. Queue Email to 'mail' collection
    const mailRef = db.collection('mail').doc();
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #1e1b4b; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0;">Reporte de Feedback QT</h2>
          <p style="margin: 5px 0 0; color: #a5b4fc;">C1E31 LIMA</p>
        </div>
        <div style="padding: 20px;">
          <p>Hola <strong>${person.name}</strong>,</p>
          <p>Te compartimos los KPIs oficiales consolidados de tu gestión en piso para el entrenamiento <strong>C1E31 LIMA</strong>. Estos indicadores ya se encuentran cargados en tu perfil del sistema Causa OS.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; text-align: center;">
            <thead>
              <tr style="background-color: #3b82f6; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd;">KPI</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">PX Iniciales</td><td style="padding: 8px; border: 1px solid #ddd;"><strong>${person.stats.PX}</strong></td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">Desertores</td><td style="padding: 8px; border: 1px solid #ddd;"><strong>${person.stats.DESERTOR}</strong></td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">PX Fin</td><td style="padding: 8px; border: 1px solid #ddd;"><strong>${person.stats.PX_FIN}</strong></td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">Declaración</td><td style="padding: 8px; border: 1px solid #ddd;"><strong>${person.stats.DECLARACION}</strong></td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">C2</td><td style="padding: 8px; border: 1px solid #ddd;"><strong>${person.stats.C2}</strong></td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">C2+MJ</td><td style="padding: 8px; border: 1px solid #ddd;"><strong>${person.stats.C2_MJ}</strong></td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">Abono</td><td style="padding: 8px; border: 1px solid #ddd;"><strong>${person.stats.ABONO}</strong></td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">Acuerdo</td><td style="padding: 8px; border: 1px solid #ddd;"><strong>${person.stats.ACUERDO}</strong></td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">Ficha</td><td style="padding: 8px; border: 1px solid #ddd;"><strong>${person.stats.FICHA}</strong></td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">Pagos</td><td style="padding: 8px; border: 1px solid #ddd;"><strong>${person.stats.PAGOS}</strong></td></tr>
              <tr style="background-color: #f0fdf4;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>PP (Conversión)</strong></td><td style="padding: 8px; border: 1px solid #ddd; color: #16a34a;"><strong>${person.stats.PP}</strong></td></tr>
            </tbody>
          </table>

          <p style="margin-top: 20px; font-size: 0.9em; color: #666;">Por favor revisa estos indicadores en tu perfil de Causa OS (Hub Operativo QT). Si tienes dudas, comunícate con la Gerencia de tu sede.</p>
        </div>
      </div>
    `;

    batch.set(mailRef, {
      to: person.email,
      message: {
        subject: `[Feedback QT] Reporte Oficial C1E31 LIMA - ${person.name}`,
        html: htmlBody
      },
      createdAt: FieldValue.serverTimestamp()
    });

    console.log(`✅ Preparado envío y carga de KPIs para: ${person.name} (${person.email})`);
  }

  await batch.commit();
  console.log("🚀 Lote de correos y datos procesado exitosamente.");
}

run().catch(console.error);
