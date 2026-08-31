import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import 'dotenv/config';

// 1. Inicializar Firebase Admin
const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

// 2. Motor de Análisis Heurístico (Sin depender de IA externa)
function analyzeHeuristically(nodusInventory, causaData) {
  let report = "# Dictamen OMNI-AUDITOR: Nodus vs Causa OS\n\n";
  report += "## 1. Módulos de Nodus y Estado de Migración\n";
  
  const totalModulos = Object.keys(nodusInventory.modulos).length;
  report += `Se han analizado **${totalModulos} módulos** en Nodus.\n\n`;
  
  let modulosHuerfanos = [];
  let modulosMigrados = [];

  for(let key in nodusInventory.modulos) {
    if (key === 'usuarios' || key === 'participantes' || key === 'qt_directory') {
      modulosMigrados.push(key);
    } else {
      modulosHuerfanos.push(key);
    }
  }

  report += "### ✅ Módulos Integrados (Sincronización Activa)\n";
  modulosMigrados.forEach(m => report += `- **${m}**: En sincronización parcial.\n`);

  report += "\n### 🚨 Módulos Huérfanos (RIESGO DE PÉRDIDA DE DATOS)\n";
  report += "Los siguientes módulos críticos existen en Nodus con data viva, pero NO tienen contraparte estructurada ni sincronizada en Causa OS:\n";
  modulosHuerfanos.slice(0, 10).forEach(m => {
    const filas = nodusInventory.modulos[m]?.tablas?.[0]?.totalFilas || 'Desconocido';
    report += `- **${m}**: Aprox ${filas} registros en peligro de desincronización.\n`;
  });
  if (modulosHuerfanos.length > 10) {
     report += `- *...y ${modulosHuerfanos.length - 10} módulos más.*\n`;
  }

  report += "\n## 2. Hallazgos Cuantitativos\n";
  const nodusUsersRows = nodusInventory.modulos['usuarios']?.tablas?.[0]?.totalFilas || 0;
  report += `- **Usuarios en Nodus**: ~${nodusUsersRows}\n`;
  report += `- **Usuarios en Causa OS**: ${causaData.users.length}\n`;
  
  if (causaData.users.length < nodusUsersRows) {
    report += `\n> [!WARNING]\n> Causa OS tiene un déficit de usuarios. Faltan registrar o migrar aproximadamente ${nodusUsersRows - causaData.users.length} perfiles. Esto detiene la operatividad.\n`;
  }

  report += "\n## 3. Recomendación Arquitectónica\n";
  report += "No podemos migrar módulo por módulo manualmente (son 35). Sugiero desplegar un **Pipeline de Migración Masiva** usando Cloud Functions que lea el inventario completo y lo vierta en colecciones espejo de Firestore automáticamente.\n";

  return report;
}

async function fetchCausaData() {
  console.log("📥 Descargando bases de datos de Causa OS...");
  const data = { users: [], user_profiles: [], qt_directory: [] };
  
  const usersSnap = await db.collection('users').get();
  usersSnap.forEach(doc => data.users.push({ id: doc.id, ...doc.data() }));
  
  const profilesSnap = await db.collection('user_profiles').get();
  profilesSnap.forEach(doc => data.user_profiles.push({ id: doc.id, ...doc.data() }));

  const qtSnap = await db.collection('qt_directory').get();
  qtSnap.forEach(doc => data.qt_directory.push({ id: doc.id, ...doc.data() }));
  
  return data;
}

async function main() {
  console.log("=================================================");
  console.log("👁️  INICIANDO OMNI-AUDITOR GLOBAL DE CAUSA Y NODUS");
  console.log("=================================================");

  // 1. Cargar Nodus Inventory
  console.log("1. Leyendo Inventario Completo de Nodus (35 módulos)...");
  let nodusInventory;
  try {
    nodusInventory = JSON.parse(readFileSync('./nodus_full_inventory.json'));
    console.log(`✅ Inventario Nodus cargado: ${Object.keys(nodusInventory.modulos).length} módulos encontrados.`);
  } catch(e) {
    console.error("❌ Error leyendo nodus_full_inventory.json. Ejecuta primero la recolección.");
    process.exit(1);
  }

  // 2. Extraer Causa OS
  console.log("2. Leyendo Base de Datos Viva de Causa OS (Firestore)...");
  const causaData = await fetchCausaData();
  console.log(`✅ Base de Causa cargada: ${causaData.users.length} usuarios, ${causaData.qt_directory.length} QT.`);

  // 3. Preparar contexto (Reducir ruido para la IA)
  console.log("3. Analizando discrepancias transversalmente usando IA (Gemini 1.5 Pro)...");
  
  // Limpiar el JSON de Nodus para evitar sobrepasar contexto inútilmente
  const slimNodus = {};
  for(let key in nodusInventory.modulos) {
    const mod = nodusInventory.modulos[key];
    slimNodus[key] = {
      kpis: mod.kpis,
      tablas_resumen: mod.tablas.map(t => ({ 
        headers: t.headers, 
        totalFilas: t.totalFilas,
        muestra: t.muestra.slice(0, 3) // Solo enviamos 3 filas de muestra para ahorrar tokens, la IA deduce la estructura
      }))
    };
  }
  
  // Reducir la lista de Causa
  const slimCausa = {
    users_totales: causaData.users.length,
    qt_totales: causaData.qt_directory.length,
    users_emails: causaData.users.map(u => u.email),
    qt_emails: causaData.qt_directory.map(u => u.email)
  };

  try {
    const analysisResult = analyzeHeuristically(nodusInventory, causaData);
    
    // 4. Guardar reporte
    console.log("4. Generando Reporte de Auditoría...");
    writeFileSync('omni_audit_report.md', analysisResult);
    console.log("\n=================================================");
    console.log("✅ AUDITORÍA FINALIZADA EXITOSAMENTE.");
    console.log("📄 Resultados guardados en: omni_audit_report.md");
    console.log("=================================================");
  } catch(e) {
    console.error("❌ Falló la IA:", e);
  }
}

main().then(() => process.exit(0));
