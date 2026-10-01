import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (Using ADC in GitHub Actions / GCP)
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function runSentinel() {
  console.log("🤖 [Seguros Sentinel] Iniciando Bot Zero-Touch de escaneo de Drive...");

  // We use ADC (Application Default Credentials) which GitHub Actions can provide via google-github-actions/auth
  // or via a Service Account Key in env var GOOGLE_APPLICATION_CREDENTIALS.
  let auth;
  try {
    auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });
    console.log("✅ [Seguros Sentinel] Autenticado en Google Drive con Service Account.");
  } catch (error) {
    console.error("❌ [Seguros Sentinel] Falló la autenticación con Drive:", error.message);
    process.exit(1);
  }

  const drive = google.drive({ version: 'v3', auth });

  // 1. Find folders named "SEGUROS" or "PASAPORTES Y SEGUROS ENTRENADORES"
  console.log("🔍 Buscando repositorios de documentos...");
  const folderQuery = "mimeType = 'application/vnd.google-apps.folder' and (name = 'SEGUROS' or name = 'PASAPORTES Y SEGUROS ENTRENADORES') and trashed = false";
  
  let folders;
  try {
    const res = await drive.files.list({ q: folderQuery, fields: 'files(id, name)' });
    folders = res.data.files;
  } catch (err) {
    console.error("❌ [Seguros Sentinel] No se pudo consultar Drive. ¿Compartió la carpeta con la Service Account?", err.message);
    process.exit(1);
  }

  if (!folders || folders.length === 0) {
    console.warn("⚠️ [Seguros Sentinel] No se encontraron carpetas con los nombres indicados.");
    return;
  }

  // 2. Fetch files from these folders
  const allFiles = [];
  for (const folder of folders) {
    console.log(`📂 Escaneando carpeta: ${folder.name} (${folder.id})`);
    const fileQuery = `'${folder.id}' in parents and (mimeType contains 'image/' or mimeType = 'application/pdf') and trashed = false`;
    const res = await drive.files.list({ q: fileQuery, fields: 'files(id, name, mimeType, modifiedTime)' });
    if (res.data.files) {
      allFiles.push(...res.data.files);
    }
  }

  console.log(`📑 Se encontraron ${allFiles.length} documentos para procesar.`);

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  for (const file of allFiles) {
    console.log(`\n📄 Procesando: ${file.name} (Modificado: ${file.modifiedTime})`);
    
    try {
      // 3. Download file content
      const fileRes = await drive.files.get({ fileId: file.id, alt: 'media' }, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(fileRes.data);
      
      const mimeType = file.mimeType;
      // Convert buffer to base64 for Gemini
      const filePart = {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType
        }
      };

      // 4. Extract data using Gemini Multimodal OCR
      const prompt = `
        Eres un auditor de documentos para una empresa. Extrae los siguientes datos de este documento (seguro de viaje o pasaporte):
        Devuelve SOLO un JSON puro con esta estructura:
        {
          "entrenador_nombre": "Nombre completo extraído o inferido",
          "tipo_documento": "Seguro de Viaje" o "Pasaporte",
          "fecha_inicio_vigencia": "YYYY-MM-DD",
          "fecha_fin_vigencia": "YYYY-MM-DD",
          "alcance_geografico": "Ej: Mundial, Europa, etc.",
          "requiere_revision_manual": false // Pon true si el documento es ilegible, dudoso o las fechas no son claras
        }
        Si no puedes leer algo, déjalo vacío o pon null, pero si es dudoso marca requiere_revision_manual en true.
      `;

      const result = await model.generateContent([prompt, filePart]);
      let responseText = result.response.text();
      // Limpiar markdown json tags si existen
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const extractedData = JSON.parse(responseText);
      console.log(`   🧠 Datos extraídos:`, extractedData);

      if (!extractedData.entrenador_nombre) {
         console.warn(`   ⚠️ No se pudo identificar al entrenador en ${file.name}`);
         continue;
      }

      // 5. Validar estado y actualizar Firestore
      let status = "🔴 Bloqueado"; // Default: Vencido o Inválido
      const today = new Date();
      let vigenciaDate = null;

      if (extractedData.fecha_fin_vigencia) {
        vigenciaDate = new Date(extractedData.fecha_fin_vigencia);
        if (!isNaN(vigenciaDate)) {
          const diffTime = vigenciaDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays > 30) {
            status = "🟢 Activo";
          } else if (diffDays > 0 && diffDays <= 30) {
            status = "🟡 Preventivo";
          } else {
            status = "🔴 Bloqueado";
          }
        }
      }

      if (extractedData.requiere_revision_manual) {
        status = "🔴 Requiere Revisión";
      }

      // Buscar al entrenador en Firestore por nombre (búsqueda aproximada)
      // Primero obtenemos todos los entrenadores y filtramos en JS para mayor flexibilidad
      const staffRef = db.collection('staff_directory');
      const staffSnapshot = await staffRef.get();
      
      let matchedTrainer = null;
      const searchName = extractedData.entrenador_nombre.toLowerCase().replace(/[^\w\s]/g, '');

      for (const doc of staffSnapshot.docs) {
         const dbName = (doc.data().nombre || '').toLowerCase().replace(/[^\w\s]/g, '');
         if (dbName && (searchName.includes(dbName) || dbName.includes(searchName))) {
             matchedTrainer = doc;
             break;
         }
      }

      if (matchedTrainer) {
        // Actualizar perfil
        await matchedTrainer.ref.update({
          "documentos_viaje.seguro_status": status,
          "documentos_viaje.seguro_vencimiento": extractedData.fecha_fin_vigencia || null,
          "documentos_viaje.ultima_revision_ia": new Date().toISOString()
        });

        console.log(`   ☁️ [CAUSA] Perfil de ${matchedTrainer.data().nombre} actualizado: ${status}`);

        // Sistema de Alertas (Trigger)
        if (status.includes("Preventivo") || status.includes("Bloqueado") || status.includes("Revisión")) {
          await db.collection('alertas_operativas').add({
             tipo: "Riesgo Logístico",
             entrenador: matchedTrainer.data().nombre,
             entrenador_id: matchedTrainer.id,
             mensaje: `Atención: El seguro de ${matchedTrainer.data().nombre} está en estado: ${status}. Vence: ${extractedData.fecha_fin_vigencia}`,
             fecha_alerta: new Date().toISOString(),
             estado: "Pendiente",
             robot_signature: "Zero-Touch Sentinel"
          });
          console.log(`   🚨 Alerta generada en CAUSA Dashboard.`);
        }

      } else {
         console.warn(`   ⚠️ No se encontró perfil en CAUSA para: ${extractedData.entrenador_nombre}`);
      }

    } catch (e) {
      console.error(`   ❌ Error procesando ${file.name}:`, e.message);
    }
  }

  console.log("🏁 [Seguros Sentinel] Escaneo completado.");
}

runSentinel().catch(console.error);
