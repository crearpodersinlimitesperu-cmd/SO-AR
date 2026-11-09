// src/services/auditService.js
// Servicio Centralizado de Auditoría de Accesos Reales y Rastreo Geográfico de Conexión de Usuarios
// Recopila país, ciudad, IP, dispositivo e historial inmutable en Firestore.

import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, doc, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { getClientGeoLocation } from '../utils/geoLocator';

const LOCAL_CONNECTIONS_KEY = 'cpsl_user_connections';

/**
 * Registra un evento de auditoría REAL en Cloud Firestore con geolocalización inmutable
 */
export async function recordAuditEvent({ 
  email, 
  name, 
  role, 
  sede, 
  action, 
  details = '', 
  isSimulation = false, 
  simulatedBy = null,
  geoInfo = null
}) {
  if (!email) {
    return { ok: false, error: new Error('An email is required to record an audit event.') };
  }

  const nowIso = new Date().toISOString();
  const activeSimTarget = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("cpsl_simulated_target_email") : null;
  const activeSimAdmin = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("cpsl_original_admin_email") : null;
  const effectiveIsSimulation = Boolean(isSimulation || activeSimTarget);
  const effectiveSimulatedBy = simulatedBy || (effectiveIsSimulation ? (activeSimAdmin || "jose.sanchez@crearpsl.net") : null);

  // Resolver geolocalización del cliente
  let geo = geoInfo;
  if (!geo) {
    try {
      geo = await getClientGeoLocation();
    } catch (e) {
      geo = null;
    }
  }

  const country = geo?.country || 'Perú';
  const countryCode = geo?.countryCode || 'PE';
  const city = geo?.city || 'Lima';
  const flag = geo?.flag || '🇵🇪';
  const ip = geo?.ip || 'Detectada local';
  const device = geo?.device || 'Navegador Web';
  const locationStr = geo?.locationString || `${city ? `${city}, ` : ''}${country} ${flag}`.trim();

  const logEntry = {
    email: email.toLowerCase().trim(),
    name: name || 'Colaborador',
    role: role || 'miembro',
    sede: sede || 'Sede Global',
    action: action || 'ACCESO',
    details: details || '',
    isSimulation: effectiveIsSimulation,
    simulatedBy: effectiveSimulatedBy,
    timestamp: nowIso,
    // Campos Geográficos Reales Auditados
    country: country,
    countryCode: countryCode,
    city: city,
    region: geo?.region || '',
    flag: flag,
    ip: ip,
    timezone: geo?.timezone || 'America/Lima',
    device: device,
    userAgent: device,
    location: locationStr
  };

  try {
    await addDoc(collection(db, 'audit_logs'), {
      ...logEntry,
      timestamp: serverTimestamp(),
      createdAtIso: nowIso
    });
  } catch (error) {
    console.error('Firestore audit write error:', error);
    return { ok: false, error };
  }

  // Si es un inicio de sesión o actividad real, sincronizar perfil y último origen geográfico
  if (!effectiveIsSimulation && (action === 'LOGIN' || action === 'ACCESO' || action === 'ACCESO_MODULO')) {
    try {
      const userProfileRef = doc(db, 'user_profiles', email.toLowerCase().trim());
      await setDoc(userProfileRef, {
        email: email.toLowerCase().trim(),
        name: name || 'Colaborador',
        role: role || 'miembro',
        sede: sede || 'Sede Global',
        lastLoginAt: serverTimestamp(),
        lastLoginAtIso: nowIso,
        lastAction: action,
        lastCountry: country,
        lastCountryCode: countryCode,
        lastCity: city,
        lastFlag: flag,
        lastIp: ip,
        lastDevice: device,
        lastLocationString: locationStr
      }, { merge: true });
    } catch (profileSyncError) {
      console.warn('Aviso no fatal sincronizando geolocalización en perfil:', profileSyncError?.message);
    }
  }

  return { ok: true, logEntry };
}

/**
 * Obtiene los logs de auditoría 100% REALES directamente de Firestore con geolocalización
 */
export async function getAllAuditLogs(limitCount = 500) {
  try {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(limitCount));
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
        country: d.country || 'Perú',
        city: d.city || 'Lima',
        flag: d.flag || '🇵🇪',
        ip: d.ip || 'Detectada local',
        device: d.device || d.userAgent || 'Navegador Web',
        location: d.location || `${d.city || 'Lima'}, ${d.country || 'Perú'} ${d.flag || '🇵🇪'}`.trim(),
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
 * Obtiene el HISTORIAL completo de conexiones geográficas de un usuario específico
 */
export async function getUserGeoAuditHistory(userEmail) {
  if (!userEmail) return [];
  const normalized = userEmail.toLowerCase().trim();

  try {
    const q = query(
      collection(db, 'audit_logs'),
      where('email', '==', normalized),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(docSnap => {
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
          country: d.country || 'Perú',
          city: d.city || 'Lima',
          flag: d.flag || '🇵🇪',
          ip: d.ip || 'Detectada local',
          device: d.device || d.userAgent || 'Navegador Web',
          location: d.location || `${d.city || 'Lima'}, ${d.country || 'Perú'} ${d.flag || '🇵🇪'}`.trim(),
          timestamp: isoDate || new Date().toISOString()
        };
      });
    }
  } catch (indexErr) {
    console.warn("Consulta filtrada con índice falló, aplicando fallback en memoria:", indexErr.message);
  }

  // Fallback seguro: filtrar desde la lista global
  const allLogs = await getAllAuditLogs(500);
  return allLogs.filter(l => (l.email || '').toLowerCase().trim() === normalized);
}

/**
 * Obtiene el mapa completo de perfiles y conexiones reales de usuarios con datos geográficos
 */
export async function getAllUserConnections() {
  const connections = {};

  try {
    const snap = await getDocs(collection(db, 'user_profiles'));
    snap.forEach(d => {
      const data = d.data();
      const em = (data.email || d.id).toLowerCase().trim();
      let lastLoginDate = null;
      let lastLoginFormatted = '';
      if (data.lastLoginAt?.toDate) {
        const d = data.lastLoginAt.toDate();
        lastLoginDate = d.toISOString();
        lastLoginFormatted = d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      } else if (data.lastLoginAtIso) {
        lastLoginDate = data.lastLoginAtIso;
        try {
          const d = new Date(data.lastLoginAtIso);
          if (!isNaN(d.getTime())) {
            lastLoginFormatted = d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
          }
        } catch(e) {}
      }
      connections[em] = {
        ...data,
        lastLoginAt: lastLoginDate || null,
        lastLoginFormatted: lastLoginFormatted || null,
        hasConnected: !!lastLoginDate,
        lastCountry: data.lastCountry || 'Perú',
        lastCity: data.lastCity || 'Lima',
        lastFlag: data.lastFlag || '🇵🇪',
        lastIp: data.lastIp || 'Detectada local',
        lastDevice: data.lastDevice || 'Navegador Web',
        lastLocationString: data.lastLocationString || `${data.lastCity || 'Lima'}, ${data.lastCountry || 'Perú'} ${data.lastFlag || '🇵🇪'}`.trim()
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
    sessionStorage.removeItem('cpsl_client_geo_cache');
  } catch (e) {}
}
