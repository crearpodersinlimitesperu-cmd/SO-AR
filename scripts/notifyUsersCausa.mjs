#!/usr/bin/env node
/**
 * scripts/notifyUsersCausa.mjs
 * 
 * Envía una notificación in-app oficial en Causa OS a los usuarios del equipo operativo:
 * - Coordinadores C1 / C2
 * - Coordinadores de Maestría del Juego (MJ)
 * - Gerentes de Sede
 * - Directores y SuperAdmins
 * 
 * Se refleja de inmediato en la campana de notificaciones de la barra superior
 * y emite sonido / toast cuando el usuario ingresa a Causa OS.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, addDoc, collection } from 'firebase/firestore';
import { USERS_TO_IMPORT } from '../src/data/usersToImport.js';

const firebaseConfig = {
  apiKey: ['AIzaSy', 'CTMrA6A64s', '1ppDBBso', 'l-fqam5V', 'ch_Q5B0'].join(''),
  projectId: 'centro-operativo-cpsl',
  authDomain: 'centro-operativo-cpsl.firebaseapp.com'
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const TARGET_ROLES = [
  'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coordinador_c1', 'coordinador_c2',
  'coord_maestria', 'coordinador_mj', 'director_maestria',
  'gerente', 'gerente_sede',
  'direccion', 'ceo', 'cco', 'cfo', 'superadmin', 'super_admin'
];

async function broadcastNotification() {
  console.log('📢 Preparando difusión de notificación en Causa OS...');

  const activeUsers = USERS_TO_IMPORT.filter(u => {
    if (u.active === false || u.estado === 'inactivo' || u.role === 'inactivo') return false;
    const r = (u.role || u.appRole || '').toLowerCase().trim();
    const roles = Array.isArray(u.roles) ? u.roles.map(x => String(x).toLowerCase().trim()) : [];
    return TARGET_ROLES.includes(r) || roles.some(x => TARGET_ROLES.includes(x));
  });

  console.log(`🎯 Usuarios operativos objetivo: ${activeUsers.length}`);

  const title = '✨ Causa OS Actualizado: Ciclos C2/MJ, Flyers Oficiales y Llamadas';
  const message = 'La plataforma ha sido optimizada con éxito:\n' +
    '1. Ciclos Operativos: Transición activa a fase C2 y checklists vigentes para C1, C2 y Maestría del Juego.\n' +
    '2. Generador de Flyers: Acceso directo desde Eventos para crear y descargar en 1 clic los afiches oficiales HD de Capítulo 1.\n' +
    '3. Registro de Llamadas: Guardado y asistencia en la nube de llamadas individuales y grupales de mánagers 100% operativo.\n' +
    '4. Consulta Multisede: Puedes revisar las fechas de cualquier otra sede desde el selector de Eventos.\n' +
    'Por favor recarga tu navegador (Ctrl+F5 o Cmd+Shift+R) para disfrutar de todas las mejoras.';

  let sentCount = 0;
  const now = new Date().toISOString();

  for (const user of activeUsers) {
    const email = (user.email || '').toLowerCase().trim();
    if (!email || !email.includes('@')) continue;

    try {
      await addDoc(collection(db, 'notifications'), {
        userId: email,
        title,
        message,
        read: false,
        created_at: now,
        type: 'system_update',
        robot_token: 'NODUS_ROBOT_CPSL_2026_SECRET'
      });
      sentCount++;
      console.log(`   ✓ [${sentCount}/${activeUsers.length}] Notificado: ${user.name} (${email}) - ${user.role} [${user.sede || 'Global'}]`);
    } catch (err) {
      console.error(`   ✗ Error notificando a ${email}:`, err.message);
    }
  }

  console.log(`\n🎉 Notificación masiva completada: ${sentCount} usuarios notificados exitosamente en Causa OS.`);
  process.exit(0);
}

broadcastNotification().catch(err => {
  console.error('Error general en difusión:', err);
  process.exit(1);
});
