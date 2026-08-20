// src/services/auditService.js
// Servicio Centralizado de Auditoría de Accesos y Rastreo de Conexión de Usuarios

import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const LOCAL_AUDIT_KEY = 'cpsl_audit_logs';
const LOCAL_CONNECTIONS_KEY = 'cpsl_user_connections';

/**
 * Obtiene la IP y ubicación aproximada de forma segura
 */
export async function fetchNetworkInfo() {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return {
      ip: data.ip || '127.0.0.1',
      location: data.city && data.country_name ? `${data.city}, ${data.country_name}` : 'Local / Seguro'
    };
  } catch (e) {
    return { ip: '127.0.0.1 (Local)', location: 'Acceso Directo' };
  }
}

/**
 * Registra un evento de auditoría en Firestore y en localStorage simultáneamente
 */
export async function recordAuditEvent({ email, name, role, sede, action, details = '', ip, location, userAgent }) {
  if (!email) return;

  const netInfo = (ip && location) ? { ip, location } : await fetchNetworkInfo();
  const agent = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Desconocido');
  const nowIso = new Date().toISOString();

  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

  // 1. Guardar localmente para disponibilidad inmediata
  try {
    const localLogs = JSON.parse(localStorage.getItem(LOCAL_AUDIT_KEY) || '[]');
    localLogs.unshift(logEntry);
    if (localLogs.length > 300) localLogs.length = 300;
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(localLogs));
  } catch (e) {}

  // 2. Guardar estado de conexión del usuario
  try {
    const connections = JSON.parse(localStorage.getItem(LOCAL_CONNECTIONS_KEY) || '{}');
    connections[email.toLowerCase().trim()] = {
      email: email.toLowerCase().trim(),
      name: name || 'Colaborador',
      role: role || 'miembro',
      sede: sede || 'Sede Global',
      lastLoginAt: nowIso,
      lastAction: action,
      lastActionAt: nowIso,
      ip: netInfo.ip,
      location: netInfo.location,
      userAgent: agent,
      isConnected: true
    };
    localStorage.setItem(LOCAL_CONNECTIONS_KEY, JSON.stringify(connections));
  } catch (e) {}

  // 3. Sincronizar en Firestore
  try {
    await addDoc(collection(db, 'audit_logs'), {
      ...logEntry,
      timestamp: serverTimestamp()
    });

    const userProfileRef = doc(db, 'user_profiles', email.toLowerCase().trim());
    await setDoc(userProfileRef, {
      email: email.toLowerCase().trim(),
      name: name || 'Colaborador',
      role: role || 'miembro',
      sede: sede || 'Sede Global',
      lastLoginAt: serverTimestamp(),
      lastLoginAtIso: nowIso,
      lastAction: action,
      lastIp: netInfo.ip,
      lastLocation: netInfo.location,
      lastUserAgent: agent
    }, { merge: true });
  } catch (e) {
    console.warn("Firestore audit sync fallback to local storage:", e.message);
  }

  return logEntry;
}

/**
 * Obtiene todos los logs de auditoría combinando Firestore y localStorage
 */
export async function getAllAuditLogs() {
  const localLogs = JSON.parse(localStorage.getItem(LOCAL_AUDIT_KEY) || '[]');
  let firestoreLogs = [];

  try {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(150));
    const snap = await getDocs(q);
    firestoreLogs = snap.docs.map(docSnap => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        ...d,
        timestamp: d.timestamp ? (d.timestamp.toDate ? d.timestamp.toDate().toISOString() : d.timestamp) : new Date().toISOString()
      };
    });
  } catch (e) {
    console.warn("Error fetching audit logs from Firestore, using local logs:", e.message);
  }

  // Fusionar y deduplicar
  const map = new Map();
  for (const log of [...firestoreLogs, ...localLogs]) {
    const key = `${log.email}_${log.timestamp}_${log.action}`;
    if (!map.has(key) && log.email) {
      map.set(key, log);
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return merged;
}

/**
 * Obtiene el mapa completo de conexiones de todos los usuarios
 */
export async function getAllUserConnections() {
  const localConnections = JSON.parse(localStorage.getItem(LOCAL_CONNECTIONS_KEY) || '{}');
  let firestoreConnections = {};

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
      firestoreConnections[em] = {
        ...data,
        lastLoginAt: lastLoginDate || localConnections[em]?.lastLoginAt || null
      };
    });
  } catch (e) {}

  return {
    ...localConnections,
    ...firestoreConnections
  };
}
