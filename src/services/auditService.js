// src/services/auditService.js
// Servicio Centralizado de Auditoría de Accesos Reales y Rastreo de Conexión de Usuarios

import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';

const LOCAL_CONNECTIONS_KEY = 'cpsl_user_connections';

/**
 * Obtiene la IP y ubicación geográfica real del usuario
 */
export async function fetchNetworkInfo() {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      return {
        ip: data.ip || 'Desconocida',
        location: data.city && data.country_name ? `${data.city}, ${data.country_name}` : (data.country_name || 'Ubicación Segura')
      };
    }
  } catch (e) {
    try {
      const res2 = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) });
      const data2 = await res2.json();
      return { ip: data2.ip || '127.0.0.1', location: 'Acceso Conectado' };
    } catch (e2) {}
  }
  return { ip: 'IP Directa', location: 'Conexión Segura' };
}

/**
 * Registra un evento de auditoría REAL en Cloud Firestore
 */
export async function recordAuditEvent({ email, name, role, sede, action, details = '', ip, location, userAgent, isSimulation = false }) {
  if (!email) return null;

  const netInfo = (ip && location) ? { ip, location } : await fetchNetworkInfo();
  const agent = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Desconocido');
  const nowIso = new Date().toISOString();

  const logEntry = {
    email: email.toLowerCase().trim(),
    name: name || 'Colaborador',
    role: role || 'miembro',
    sede: sede || 'Sede Global',
    action: action || 'ACCESO',
    details: details || '',
    ip: netInfo.ip,
    location: netInfo.location,
    userAgent: agent,
    timestamp: nowIso
  };

  try {
    // 1. Guardar log inmutable en Firestore
    await addDoc(collection(db, 'audit_logs'), {
      ...logEntry,
      timestamp: serverTimestamp(),
      createdAtIso: nowIso
    });

    // 2. Si es un LOGIN REAL (no simulación), actualizar perfil de conexión del usuario
    if (action === 'LOGIN' && !isSimulation) {
      const userProfileRef = doc(db, 'user_profiles', email.toLowerCase().trim());
      await setDoc(userProfileRef, {
        email: email.toLowerCase().trim(),
        name: name || 'Colaborador',
        role: role || 'miembro',
        sede: sede || 'Sede Global',
        lastLoginAt: serverTimestamp(),
        lastLoginAtIso: nowIso,
        lastAction: 'LOGIN_REAL',
        lastIp: netInfo.ip,
        lastLocation: netInfo.location,
        lastUserAgent: agent
      }, { merge: true });
    }
  } catch (e) {
    console.warn("Firestore audit sync error:", e.message);
  }

  return logEntry;
}

/**
 * Obtiene los logs de auditoría 100% REALES directamente de Firestore
 */
export async function getAllAuditLogs() {
  try {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(200));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      return [];
    }

    const firestoreLogs = snap.docs.map(docSnap => {
      const d = docSnap.data();
      let isoDate = d.createdAtIso;
      if (!isoDate && d.timestamp?.toDate) {
        isoDate = d.timestamp.toDate().toISOString();
      } else if (!isoDate && typeof d.timestamp === 'string') {
        isoDate = d.timestamp;
      }

      return {
        id: docSnap.id,
        ...d,
        timestamp: isoDate || new Date().toISOString()
      };
    });

    return firestoreLogs;
  } catch (e) {
    console.error("Error al obtener logs de auditoría de Firestore:", e.message);
    return [];
  }
}

/**
 * Obtiene el mapa completo de perfiles y conexiones reales de usuarios
 */
export async function getAllUserConnections() {
  const connections = {};

  try {
    const snap = await getDocs(collection(db, 'user_profiles'));
    snap.forEach(d => {
      const data = d.data();
      const em = (data.email || d.id).toLowerCase().trim();
      let lastLoginDate = null;
      if (data.lastLoginAt?.toDate) {
        lastLoginDate = data.lastLoginAt.toDate().toISOString();
      } else if (data.lastLoginAtIso) {
        lastLoginDate = data.lastLoginAtIso;
      }
      connections[em] = {
        ...data,
        lastLoginAt: lastLoginDate || null
      };
    });
  } catch (e) {
    console.error("Error fetching user connections:", e);
  }

  return connections;
}

/**
 * Limpia la colección de logs de prueba si el administrador lo solicita
 */
export async function clearTestLogs() {
  try {
    localStorage.removeItem('cpsl_audit_logs');
    localStorage.removeItem(LOCAL_CONNECTIONS_KEY);
  } catch (e) {}
}
