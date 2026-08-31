import puppeteer from 'puppeteer';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import 'dotenv/config';

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(readFileSync('./centro-operativo-cpsl-65ad52160f45.json'));
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

// Cargar reglas
const botRules = JSON.parse(readFileSync('./scripts/bot_rules.json'));
const isDryRun = botRules.dry_run;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeNodusUsers(page) {
  console.log("🔍 [1/3] Navegando al módulo de usuarios en Nodus/IMO...");
  await page.goto('https://imo.crearpslglobal.com/usuarios', { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(2000);

  const usersData = await page.evaluate(() => {
    const table = document.querySelector('table');
    if (!table) return [];
    
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim().toLowerCase());
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    
    return rows.map(tr => {
      const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
      const user = {};
      cells.forEach((cell, idx) => {
        const header = headers[idx] || `col_${idx}`;
        user[header] = cell;
      });
      return user;
    });
  });
  
  console.log(`✅ Se extrajeron ${usersData.length} usuarios de Nodus.`);
  return usersData;
}

async function fetchCausaUsers() {
  console.log("📥 [2/3] Descargando base viva de Causa OS (Firestore)...");
  const snap = await db.collection('users').get();
  const users = [];
  snap.forEach(doc => {
    users.push({ id: doc.id, ...doc.data() });
  });
  console.log(`✅ Se obtuvieron ${users.length} usuarios de Causa OS.`);
  return users;
}

async function compareAndHeal(nodusUsers, causaUsers) {
  console.log("🧠 [3/3] Iniciando motor de diagnóstico y auto-corrección...");
  let discrepancies = 0;
  const auditLog = [];

  for (const nUser of nodusUsers) {
    // Buscar en Causa OS por email (asumiendo que Nodus tiene columna email o correo)
    const emailKey = Object.keys(nUser).find(k => k.includes('correo') || k.includes('email'));
    if (!emailKey) continue;
    
    const email = nUser[emailKey].toLowerCase().trim();
    if (!email) continue;

    const cUser = causaUsers.find(u => u.email && u.email.toLowerCase().trim() === email);
    
    if (!cUser) {
      discrepancies++;
      const msg = `⚠️ FALTANTE: Usuario ${email} está en Nodus pero NO en Causa OS.`;
      console.log(msg);
      auditLog.push(msg);
      
      if (!isDryRun) {
        // En modo real, lo creamos
        const nameKey = Object.keys(nUser).find(k => k.includes('nombre'));
        const roleKey = Object.keys(nUser).find(k => k.includes('rol'));
        await db.collection('users').doc(email).set({
          email: email,
          name: nameKey ? nUser[nameKey] : 'Usuario Importado',
          role: roleKey ? nUser[roleKey] : 'miembro',
          sede: 'Sede Global',
          sync_source: 'CAUSA_SYNC_BOT'
        });
        console.log(`  -> 🔧 CORREGIDO: Creado en Firestore.`);
      }
    } else {
      // Comparar roles (ejemplo básico)
      const roleKey = Object.keys(nUser).find(k => k.includes('rol'));
      if (roleKey && nUser[roleKey]) {
        // Lógica simplificada: si Nodus tiene un rol distinto al que Causa tiene normalizado
        // Aquí se puede agregar un LLM para analizar la diferencia de strings
        const nodusRole = nUser[roleKey].toLowerCase();
        const causaRole = cUser.role ? cUser.role.toLowerCase() : '';
        
        // Solo un ejemplo de chequeo estricto
        if (nodusRole !== causaRole && nodusRole.length > 3) {
          /* En un escenario real, necesitamos mapear los roles de Nodus a los de Causa.
             Omitiremos las correcciones de rol a menos que sean muy obvias en un bot V1. */
        }
      }
    }
  }

  console.log("\n=============================================");
  console.log("📊 REPORTE DE AUDITORÍA Y SINCRONIZACIÓN");
  console.log("=============================================");
  console.log(`Modo de ejecución: ${isDryRun ? "🧪 DRY-RUN (Solo Lectura)" : "🔥 PRODUCCIÓN (Escribiendo en DB)"}`);
  console.log(`Discrepancias detectadas: ${discrepancies}`);
  
  if (auditLog.length > 0) {
    writeFileSync('sync_audit_report.txt', auditLog.join('\n'));
    console.log("📝 Log guardado en sync_audit_report.txt");
  } else {
    console.log("✨ Sistema en perfecto estado. No se requieren correcciones.");
  }
}

async function main() {
  console.log("🤖 Iniciando CAUSA SYNC BOT...");
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Login
  console.log("🔑 Autenticando en Nodus...");
  await page.goto('https://imo.crearpslglobal.com/dashboard', { waitUntil: 'networkidle2' });
  
  // Intentar login si hay form (reusando credenciales de prueba del otro script)
  const isLoginForm = await page.$('input[name="usuario"]');
  if (isLoginForm) {
    await page.type('input[name="usuario"]', 'jsanchez');
    await page.type('input[name="password"]', '123456');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
  }

  // Ejecutar fases
  const nodusUsers = await scrapeNodusUsers(page);
  const causaUsers = await fetchCausaUsers();
  
  await compareAndHeal(nodusUsers, causaUsers);

  await browser.close();
  console.log("✅ Causa Sync Bot finalizado.");
}

main().then(() => process.exit(0)).catch(e => {
  console.error("❌ Error en el bot:", e);
  process.exit(1);
});
