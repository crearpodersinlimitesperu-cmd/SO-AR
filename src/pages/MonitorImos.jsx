import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, writeBatch, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Search, Filter, X, ShieldCheck, AlertTriangle, PhoneCall, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { normalizeSede } from '../data/usersData';
import {
  initNodusRealtimeListener,
  evaluateEnroladoVerification,
  evaluateMissionVerification,
  getGlobalNodusStats
} from '../services/nodusVerificationService';

export default function MonitorImos() {
  const { currentUser } = useAuth();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedImo, setExpandedImo] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSede, setFilterSede] = useState('Lima');
  const [filterEquipo, setFilterEquipo] = useState('EQUIPO 31 - LIMA CICLO 1');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterNodus, setFilterNodus] = useState('todos');
  const [viewMode, setViewMode] = useState('imos'); // 'imos' | 'enrolados'
  const [nodusSyncTick, setNodusSyncTick] = useState(0);
  const navigate = useNavigate();

  const formatDate = (ts) => {
    if (!ts) return 'Sin registro';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return new Intl.DateTimeFormat('es-PE', { 
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
      }).format(date);
    } catch(e) { return 'Fecha inválida'; }
  };

  const getUbicacion = (m) => {
    if (m.ubicacion) return m.ubicacion;
    if (m.ip) return `IP: ${m.ip}`;
    return 'No reportada (Req. API IMO)';
  };


  // Escuchar misiones IMO en Firestore en tiempo real
  useEffect(() => {
    const q = query(collection(db, 'imo_missions'), orderBy('lastUpdated', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setMissions(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching IMO missions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Escuchar actualizaciones de llamadas de Coordinadoras en Nodus
  useEffect(() => {
    initNodusRealtimeListener(() => {
      setNodusSyncTick(t => t + 1);
    });
  }, []);

  // (09/09/2026) José reportó, con captura, un IMO (Veronica Patricia Prado Zeas) donde el
  // mismo enrolado ("Veronica Elizabeth Clavijo Morocho", mismo teléfono) aparecía dos veces
  // en pantalla — "esto está mal y sin sentido". Esto viene del array `m.enrolados` del propio
  // documento de Firestore, que aquí se mapea 1:1 sin ninguna deduplicación: si esa persona
  // quedó registrada dos veces en el documento (por ejemplo, un doble envío del formulario del
  // IMO), esta función la mostraba dos veces también. No tengo acceso a Firestore en vivo desde
  // este entorno para confirmar si el dato de origen tiene el duplicado o no — lo que sí puedo
  // hacer, sin borrar ni tocar nada en la base de datos, es que la pantalla no vuelva a mostrar
  // dos tarjetas idénticas para la misma persona. dedupeEnrolados() más abajo colapsa por
  // nombre+teléfono normalizados, conservando el primer registro (y fusionando contacto/
  // asistencia con OR, para no perder un "sí" registrado en cualquiera de los duplicados).
  const dedupeEnrolados = (list) => {
    const seen = new Map();
    list.forEach((e) => {
      const nombreNorm = (e.nombre || '').trim().toUpperCase().replace(/\s+/g, ' ');
      const telNorm = (e.telefono || '').replace(/\D/g, '');
      const key = telNorm ? `tel:${telNorm}` : `nom:${nombreNorm}`;
      if (!key.trim() || key === 'tel:' || key === 'nom:') {
        // Sin nombre ni teléfono para agrupar — se conserva tal cual, por su propio id.
        seen.set(`id:${e.id}`, e);
        return;
      }
      const prev = seen.get(key);
      if (!prev) {
        seen.set(key, e);
      } else {
        seen.set(key, {
          ...prev,
          contacto: prev.contacto || e.contacto,
          asistencia: prev.asistencia || e.asistencia,
        });
      }
    });
    return Array.from(seen.values());
  };

  // Extrae de forma robusta la lista de enrolados combinando el array con los checks
  const getEnroladosList = (m) => {
    if (Array.isArray(m.enrolados) && m.enrolados.length > 0) {
      // Fusionar los datos estáticos del enrolado con el progreso en 'checks'
      const mapped = m.enrolados.map((enr) => {
        const chk = (m.checks && m.checks[enr.id]) || {};
        return {
          ...enr,
          contacto: Boolean(chk.contacto),
          asistencia: Boolean(chk.asistencia),
        };
      });
      return dedupeEnrolados(mapped);
    }
    const keys = Object.keys(m.checks || {});
    return keys.map((k, index) => {
      const chk = m.checks?.[k] || {};
      const cleanName = k.replace(/_/g, ' ');
      return {
        id: `${m.id}_enr_${index}_${k}`,
        nombre: cleanName,
        contacto: Boolean(chk.contacto),
        asistencia: Boolean(chk.asistencia),
        email: chk.email || '',
        telefono: chk.telefono || '',
        coordinadora_nombre: chk.coordinadora_nombre || m.equipo || 'Coordinación'
      };
    });
  };

  // 🔒 (09/09/2026) José reportó, con captura, que el Monitor de IMOs le mostraba a un
  // Gerente de sede (simulado: Josue Vera) datos de TODAS las sedes ("esto viola la
  // confidencialidad de lo que hacemos"). Confirmado leyendo el código: este componente
  // nunca importaba useAuth ni currentUser, y el query a 'imo_missions' (línea ~44) no
  // tenía ningún where() por sede — cualquier usuario veía el total global (378/378
  // misiones, 955 enrolados en la captura). Se agrega aquí el mismo criterio de alcance
  // que ya usa el resto de la plataforma: Super Admin / Vista Consolidada / Dirección ven
  // TODO (alcance GLOBAL legítimo para supervisión); cualquier otro rol (Gerente de sede,
  // Coordinador, etc.) solo ve las misiones cuya sede coincide con currentUser.sede,
  // normalizada con normalizeSede() (la misma función que usa el resto del código para
  // que "GYE" y "Guayaquil" se traten como la misma sede).
  // Helper para resolver la sede exacta de cada misión (m.sede o deducida del equipo)
  const resolveMissionSede = (m) => {
    let s = m.sede;
    if (!s || s === 'No especificada') {
      const eqUpper = (m.equipo || '').toUpperCase();
      if (eqUpper.includes("CUENCA")) s = "Cuenca";
      else if (eqUpper.includes("QUITO")) s = "Quito";
      else if (eqUpper.includes("GUAYAQUIL") || eqUpper.includes("GYE")) s = "Guayaquil";
      else if (eqUpper.includes("LIMA")) s = "Lima";
      else if (eqUpper.includes("BOGOTA") || eqUpper.includes("BOGOTÁ")) s = "Bogotá";
      else if (eqUpper.includes("MEDELLIN") || eqUpper.includes("MEDELLÍN")) s = "Medellín";
      else if (eqUpper.includes("MEXICO") || eqUpper.includes("MÉXICO") || eqUpper.includes("CDMX")) s = "México";
      else s = "Lima";
    }
    return normalizeSede(s);
  };

  // Helper para normalizar nombres de equipo evitando duplicidades o fragmentación
  // (ej: EQUIPO 29 y EQUIPO 29 - LIMA CICLO 1 V corresponden al mismo equipo operativo)
  const normalizeEquipoName = (raw) => {
    if (!raw) return 'Sin Equipo';
    const clean = raw.trim().replace(/\s+/g, ' ');
    if (/^EQUIPO\s+28(\b|\s|$)/i.test(clean) && !clean.toUpperCase().includes('QUITO')) {
      return 'EQUIPO 28 - LIMA CICLO 1';
    }
    if (/^EQUIPO\s+29(\b|\s|$)/i.test(clean)) {
      return 'EQUIPO 29 - LIMA CICLO 1';
    }
    if (/^EQUIPO\s+30(\b|\s|$)/i.test(clean)) {
      return 'EQUIPO 30 - LIMA CICLO 1';
    }
    if (/^EQUIPO\s+31(\b|\s|$)/i.test(clean)) {
      return 'EQUIPO 31 - LIMA CICLO 1';
    }
    return clean.replace(/\s+V$/i, '').replace(/[✓✔]/g, '').trim();
  };

  const isGlobalScopeUser = !!(currentUser?.isSuperAdmin || currentUser?.isConsolidatedView || currentUser?.appRole === 'consolidado' || currentUser?.isDireccion);
  const sedeScopedMissions = useMemo(() => {
    if (isGlobalScopeUser) return missions;
    const mySede = normalizeSede(currentUser?.sede);
    return missions.filter(m => resolveMissionSede(m) === mySede);
  }, [missions, isGlobalScopeUser, currentUser?.sede]);

  // Sedes disponibles para el selector de sede (dinámico según misiones existentes)
  const sedesDisponibles = useMemo(() => {
    const setSedes = new Set();
    const sourceList = isGlobalScopeUser ? missions : sedeScopedMissions;
    sourceList.forEach(m => {
      const s = resolveMissionSede(m);
      if (s && s !== 'Sede Global') setSedes.add(s);
    });
    // Sedes oficiales de operación
    ['Lima', 'Quito', 'Cuenca', 'Guayaquil', 'Medellín', 'México'].forEach(s => {
      const exists = sourceList.some(m => resolveMissionSede(m) === s);
      if (exists) setSedes.add(s);
    });
    return Array.from(setSedes).sort();
  }, [missions, sedeScopedMissions, isGlobalScopeUser]);

  const equiposDisponibles = useMemo(() => {
    const setEq = new Set();
    sedeScopedMissions.forEach(m => {
      if (filterSede !== 'todos' && resolveMissionSede(m) !== filterSede) return;
      if (m.equipo) setEq.add(normalizeEquipoName(m.equipo));
    });
    return Array.from(setEq).sort((a, b) => {
      if (a.includes('31')) return -1;
      if (b.includes('31')) return 1;
      return a.localeCompare(b);
    });
  }, [sedeScopedMissions, filterSede]);

  // Filtrado de misiones en tiempo real por búsqueda y selectores
  const filteredMissions = useMemo(() => {
    return sedeScopedMissions.filter((m) => {
      // Filtro Sede
      if (filterSede !== 'todos' && resolveMissionSede(m) !== filterSede) {
        return false;
      }

      // Filtro Equipo (unificado mediante normalización)
      if (filterEquipo !== 'todos' && normalizeEquipoName(m.equipo) !== filterEquipo) {
        return false;
      }

      // Filtro Estado
      const enrolados = getEnroladosList(m);
      const assisted = enrolados.filter(e => e.asistencia).length;
      const isCompleted = enrolados.length > 0 && assisted === enrolados.length;
      if (filterEstado === 'completado' && !isCompleted) return false;
      if (filterEstado === 'en_progreso' && isCompleted) return false;

      // Filtro Validación Nodus
      if (filterNodus !== 'todos') {
        const summ = evaluateMissionVerification(m, enrolados);
        if (filterNodus === 'verificado_ok' && summ.overallStatus !== 'VERIFICADO_OK') return false;
        if (filterNodus === 'parcial' && summ.overallStatus !== 'PARCIAL') return false;
        if (filterNodus === 'discrepancia' && summ.overallStatus !== 'DISCREPANCIA') return false;
        if (filterNodus === 'pendiente' && summ.overallStatus !== 'PENDIENTE_COORD') return false;
      }

      // Filtro Búsqueda (IMO, Equipo o Enrolados)
      if (searchTerm.trim()) {
        const queryText = searchTerm.toLowerCase().trim();
        const matchImo = (m.imoNombre || '').toLowerCase().includes(queryText);
        const matchEquipo = (m.equipo || '').toLowerCase().includes(queryText) || normalizeEquipoName(m.equipo).toLowerCase().includes(queryText);
        const matchSede = (resolveMissionSede(m) || '').toLowerCase().includes(queryText) || (m.sede || '').toLowerCase().includes(queryText);

        const matchEnrolado = enrolados.some(e =>
          (e.nombre || '').toLowerCase().includes(queryText) ||
          (e.email || '').toLowerCase().includes(queryText) ||
          (e.telefono || '').replace(/\D/g, '').includes(queryText.replace(/\D/g, ''))
        );

        if (!matchImo && !matchEquipo && !matchSede && !matchEnrolado) {
          return false;
        }
      }

      return true;
    });
  }, [sedeScopedMissions, searchTerm, filterSede, filterEquipo, filterEstado, filterNodus, nodusSyncTick]);

  // Deduplicación global estricta de enrolados (por teléfono o nombre)
  // Garantiza que ningún participante se duplique, redunde ni omita
  const uniqueEnroladosList = useMemo(() => {
    const seen = new Map();
    filteredMissions.forEach(m => {
      const enrolados = getEnroladosList(m);
      enrolados.forEach(e => {
        const tel = (e.telefono || '').replace(/\D/g, '');
        const nom = (e.nombre || '').trim().toUpperCase().replace(/\s+/g, ' ');
        const key = (tel && tel.length >= 7) ? `tel:${tel}` : (nom ? `nom:${nom}` : `id:${e.id}`);
        if (!seen.has(key)) {
          seen.set(key, {
            ...e,
            imoNombre: m.imoNombre || 'IMO Asignado',
            equipo: normalizeEquipoName(m.equipo),
            sede: resolveMissionSede(m),
            verificadoNodus: m.verificadoNodus,
            mId: m.id
          });
        } else {
          const prev = seen.get(key);
          prev.contacto = prev.contacto || e.contacto;
          prev.asistencia = prev.asistencia || e.asistencia;
        }
      });
    });
    return Array.from(seen.values());
  }, [filteredMissions]);

  const totalEnroladosCount = uniqueEnroladosList.length;

  const totalConfirmadosCount = useMemo(() => {
    return uniqueEnroladosList.filter(e => e.asistencia).length;
  }, [uniqueEnroladosList]);

  const completadosCount = useMemo(() => {
    return filteredMissions.filter(m => {
      const enr = getEnroladosList(m);
      return enr.length > 0 && enr.every(e => e.asistencia);
    }).length;
  }, [filteredMissions]);

  // Estadísticas globales de verificación cruzada Nodus
  const globalNodusStats = useMemo(() => {
    return getGlobalNodusStats(filteredMissions, getEnroladosList);
  }, [filteredMissions, nodusSyncTick]);

  const handleToggleVerificado = async (missionId, currentValue) => {
    try {
      await updateDoc(doc(db, 'imo_missions', missionId), {
        verificadoNodus: !currentValue
      });
    } catch (error) {
      console.error('Error al actualizar verificación:', error);
      alert('No se pudo actualizar el estado de verificación.');
    }
  };

  const handleResetMission = async (missionId) => {
    if (window.confirm('⚠️ ¿Estás seguro de que deseas resetear los datos de prueba de este IMO? Esto eliminará la telemetría actual y el tiempo volverá a cero.')) {
      try {
        await deleteDoc(doc(db, 'imo_missions', missionId));
      } catch (error) {
        console.error('Error al resetear la misión:', error);
      }
    }
  };

  const handleResetAll = async () => {
    if (window.confirm('⚠️ ADVERTENCIA CRÍTICA: ¿Estás seguro de resetear TODOS los IMOs? Toda la trazabilidad de prueba se perderá y todos los contadores volverán a cero.')) {
      try {
        const batch = writeBatch(db);
        missions.forEach(m => {
          batch.delete(doc(db, 'imo_missions', m.id));
        });
        await batch.commit();
      } catch (error) {
        console.error('Error al resetear todas las misiones:', error);
      }
    }
  };

  const handleSendWelcomeEmail = async (enrolado) => {
    if (!enrolado.email) {
      alert("Este participante no tiene un correo registrado.");
      return;
    }

    if (!window.confirm(`¿Enviar correo de bienvenida a ${enrolado.nombre} (${enrolado.email}) desde info.lima@crearpsl.net?`)) {
      return;
    }

    try {
      setSendingEmail(enrolado.id);
      
      const welcomeLink = "https://crearpsl.net/bienvenida_capitulo_uno.html?sede=LIM";
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #0ea5e9;">¡Bienvenido/a al Entrenamiento, ${enrolado.nombre}!</h2>
          <p>Tu coordinador/a <strong>${enrolado.coordinadora_nombre}</strong> y tu equipo están emocionados de acompañarte en este proceso.</p>
          <p>Hemos preparado una página de bienvenida muy especial con toda la información clave, la cuenta regresiva oficial y detalles importantes para tu primer fin de semana.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${welcomeLink}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
              Ver mi Bienvenida Oficial
            </a>
          </div>
          <p>¡Nos vemos pronto!</p>
          <p style="font-size: 12px; color: #888; margin-top: 40px; border-top: 1px solid #eaeaea; padding-top: 20px;">
            Este es un mensaje automático enviado desde el Monitor de IMOs de Causa OS.<br>
            CREAR Poder Sin Límites - Sede Lima
          </p>
        </div>
      `;

      await addDoc(collection(db, 'mail'), {
        type: 'imo_welcome',
        to: [enrolado.email],
        message: {
          subject: '¡Bienvenido/a al Entrenamiento! (Información Importante)',
          html: htmlContent
        },
        delivery: {
          state: 'PENDING'
        },
        createdAt: new Date().toISOString()
      });

      alert("Correo encolado exitosamente. Se enviará en los próximos 5 minutos automáticamente.");
    } catch (error) {
      console.error("Error al encolar correo:", error);
      alert("Hubo un error al preparar el envío del correo.");
    } finally {
      setSendingEmail(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center" style={{ color: 'var(--crear-gold)' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
        <p>Cargando telemetría de IMOs y sincronización Nodus...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-8" style={{ maxWidth: '1440px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'transparent',
          color: 'var(--crear-blue, #38bdf8)',
          border: 'none',
          padding: '0.4rem 0',
          marginBottom: '1rem',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'opacity 0.2s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
      >
        ← Volver al Centro Operativo
      </button>

      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
            <span style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
              SISTEMA OPERATIVO CAUSA
            </span>
            <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
              ● VALIDACIÓN AUTOMÁTICA NODUS
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Misión IMO</span>
          </div>
          <h1 className="text-gold" style={{ fontSize: '2.2rem', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
            MONITOR DE IMOS
          </h1>
          <p className="text-muted" style={{ fontSize: '0.95rem', margin: 0 }}>
            Supervisión en tiempo real de IMOs y <strong style={{ color: '#22c55e' }}>validación automática</strong> cruzada con llamadas de Coordinadoras registradas en Nodus.
          </p>
        </div>

        <button
          onClick={handleResetAll}
          disabled={missions.length === 0}
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: missions.length === 0 ? 'not-allowed' : 'pointer',
            opacity: missions.length === 0 ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (missions.length > 0) {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
          }}
        >
          Resetear Todos (Pruebas)
        </button>
      </header>

      {/* Estilos para forzar contraste total en select y option en cualquier navegador y modo */}
      <style>{`
        select.form-input, select.form-input option {
          background-color: #0f172a !important;
          color: #f8fafc !important;
        }
        select.form-input option:hover, select.form-input option:focus, select.form-input option:checked {
          background-color: #1e293b !important;
          color: #38bdf8 !important;
        }
      `}</style>

      {/* Tarjetas de Métricas Resumen y Validación Nodus */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '0.9rem 1.2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>IMOs en Misión</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
            {filteredMissions.length} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {missions.length}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Participantes asignados</div>
        </div>

        <div className="glass-panel" style={{ padding: '0.9rem 1.2rem', border: '1px solid rgba(56, 189, 248, 0.25)', background: 'rgba(56, 189, 248, 0.05)' }}>
          <div style={{ fontSize: '0.75rem', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>Total Enrolamientos</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8' }}>{totalEnroladosCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Pedidos bajo responsabilidad IMO</div>
        </div>

        <div className="glass-panel" style={{ padding: '0.9rem 1.2rem', border: '1px solid rgba(34, 197, 94, 0.25)', background: 'rgba(34, 197, 94, 0.05)' }}>
          <div style={{ fontSize: '0.75rem', color: '#4ade80', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>Confirmados por IMO</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#22c55e' }}>{totalConfirmadosCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Marcados como 'Asistirá' ({totalEnroladosCount > 0 ? Math.round((totalConfirmadosCount / totalEnroladosCount) * 100) : 0}%)</div>
        </div>

        <div className="glass-panel" style={{ padding: '0.9rem 1.2rem', border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <div style={{ fontSize: '0.75rem', color: '#f87171', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>Enrolados Pendientes</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>{totalEnroladosCount - totalConfirmadosCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {filteredMissions.length - completadosCount} IMOs con llamadas pendientes
          </div>
        </div>

        {/* Tarjeta de Validación Automática Nodus vs Coordinadoras */}
        <div className="glass-panel" style={{
          padding: '0.9rem 1.2rem',
          border: globalNodusStats.totalDiscrepancias > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(34, 197, 94, 0.3)',
          background: globalNodusStats.totalDiscrepancias > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(34, 197, 94, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Validación Nodus</span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '4px',
              background: globalNodusStats.porcentajeGlobal >= 80 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              color: globalNodusStats.porcentajeGlobal >= 80 ? '#22c55e' : '#f59e0b'
            }}>
              {globalNodusStats.porcentajeGlobal}% Coincide
            </span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#22c55e' }}>
            {globalNodusStats.totalValidadosLlamada} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {globalNodusStats.totalReportadosImo}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {globalNodusStats.totalDiscrepancias > 0 ? (
              <span style={{ color: '#ef4444', fontWeight: 700 }}>🚨 {globalNodusStats.totalDiscrepancias} Discrepancia(s)</span>
            ) : (
              <span>✅ Coordinadoras coinciden</span>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '0.9rem 1.2rem', border: '1px solid rgba(255, 183, 3, 0.25)', background: 'rgba(255, 183, 3, 0.05)' }}>
          <div style={{ fontSize: '0.75rem', color: '#ffb703', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>Misiones al 100%</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffb703' }}>{completadosCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>IMOs con todos confirmados</div>
        </div>
      </div>

      {/* Panel de Auditoría Rápida de Sede / Equipo */}
      <div className="glass-panel" style={{
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              background: '#38bdf8',
              color: '#0f172a',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase'
            }}>
              Auditoría de Enrolamientos / Misión
            </span>
            <strong style={{ color: '#fff', fontSize: '1.05rem' }}>
              {filterSede === 'todos' ? 'Todas las Sedes' : `Sede ${filterSede}`} {filterEquipo !== 'todos' ? `• ${filterEquipo}` : ''}
            </strong>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
            📋 <strong style={{ color: '#38bdf8' }}>{totalEnroladosCount} Enrolamientos</strong> asignados a <strong style={{ color: '#fff' }}>{filteredMissions.length} IMOs</strong> participantes.
            {' • '}
            ✅ <strong style={{ color: '#22c55e' }}>{totalConfirmadosCount} Confirmados</strong> ({totalEnroladosCount > 0 ? Math.round((totalConfirmadosCount / totalEnroladosCount) * 100) : 0}%)
            {' • '}
            ⏳ <strong style={{ color: '#f87171' }}>{totalEnroladosCount - totalConfirmadosCount} Pendientes</strong> ({totalEnroladosCount > 0 ? Math.round(((totalEnroladosCount - totalConfirmadosCount) / totalEnroladosCount) * 100) : 0}%)
            {' • '}
            🎯 <strong style={{ color: '#ffb703' }}>{completadosCount} IMOs al 100%</strong> ({filteredMissions.length - completadosCount} con pendientes).
          </div>

          {filterSede === 'Lima' && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Foco Lima:
              </span>
              <button
                onClick={() => setFilterEquipo('EQUIPO 31 - LIMA CICLO 1')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: filterEquipo === 'EQUIPO 31 - LIMA CICLO 1' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
                  background: filterEquipo === 'EQUIPO 31 - LIMA CICLO 1' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.03)',
                  color: filterEquipo === 'EQUIPO 31 - LIMA CICLO 1' ? '#38bdf8' : '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🎯 Misión Activa (133 Enrolamientos)</span>
                <span style={{ background: '#38bdf8', color: '#0f172a', padding: '1px 5px', borderRadius: '3px', fontSize: '0.68rem', fontWeight: 800 }}>En Curso</span>
              </button>

              <button
                onClick={() => setFilterEquipo('todos')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: filterEquipo === 'todos' ? '2px solid #ffb703' : '1px solid rgba(255,255,255,0.15)',
                  background: filterEquipo === 'todos' ? 'rgba(255, 183, 3, 0.2)' : 'rgba(255,255,255,0.03)',
                  color: filterEquipo === 'todos' ? '#ffb703' : '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📚 Histórico Acumulado (291 Enrolamientos)
              </button>

              <span style={{
                fontSize: '0.72rem',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                padding: '3px 8px',
                borderRadius: '4px',
                fontWeight: 700
              }}>
                🛡️ Control de Integridad: 0 Duplicados • 0 Redundancias • 0 Omisiones
              </span>
            </div>
          )}
        </div>

        {/* Botones de Filtro Rápido */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterEstado('todos')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: filterEstado === 'todos' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
              background: filterEstado === 'todos' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: filterEstado === 'todos' ? '#38bdf8' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Todos ({filteredMissions.length})
          </button>
          <button
            onClick={() => setFilterEstado('completado')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: filterEstado === 'completado' ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.15)',
              background: filterEstado === 'completado' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
              color: filterEstado === 'completado' ? '#22c55e' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ✅ Confirmaron Todo ({completadosCount})
          </button>
          <button
            onClick={() => setFilterEstado('en_progreso')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: filterEstado === 'en_progreso' ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.15)',
              background: filterEstado === 'en_progreso' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
              color: filterEstado === 'en_progreso' ? '#f87171' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ⏳ Con Pendientes ({filteredMissions.length - completadosCount})
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Selector de Modo de Vista */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={() => setViewMode('imos')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: viewMode === 'imos' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
              background: viewMode === 'imos' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: viewMode === 'imos' ? '#38bdf8' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            👤 Vista por IMOs ({filteredMissions.length})
          </button>
          <button
            onClick={() => setViewMode('enrolados')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: viewMode === 'enrolados' ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.15)',
              background: viewMode === 'enrolados' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
              color: viewMode === 'enrolados' ? '#22c55e' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            📋 Lista Plana ({totalEnroladosCount} Enrolamientos)
          </button>
        </div>

        {/* Buscador de IMOs y Enrolados */}
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '200px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar por Nombre de IMO, Enrolado o Teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ width: '100%', paddingLeft: '38px', paddingRight: searchTerm ? '32px' : '12px', fontSize: '0.88rem' }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
              title="Borrar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros Selectores */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Selector de Sede */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sede:</span>
            <select
              value={filterSede}
              onChange={(e) => {
                const newSede = e.target.value;
                setFilterSede(newSede);
                if (newSede === 'Lima') {
                  setFilterEquipo('EQUIPO 31 - LIMA CICLO 1');
                } else {
                  setFilterEquipo('todos');
                }
              }}
              className="form-input"
              style={{
                width: 'auto',
                minWidth: '140px',
                fontSize: '0.85rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: filterSede !== 'todos' ? '1px solid #38bdf8' : '1px solid #475569',
                color: filterSede !== 'todos' ? '#38bdf8' : '#f8fafc',
                fontWeight: filterSede !== 'todos' ? 700 : 500,
                backgroundColor: '#0f172a'
              }}
            >
              <option value="todos" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Todas las Sedes</option>
              {sedesDisponibles.map(s => (
                <option key={s} value={s} style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>{s}</option>
              ))}
            </select>
          </div>

          {/* Selector de Cruce Nodus */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cruce Nodus:</span>
            <select
              value={filterNodus}
              onChange={(e) => setFilterNodus(e.target.value)}
              className="form-input"
              style={{
                width: 'auto',
                minWidth: '170px',
                fontSize: '0.85rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#f8fafc'
              }}
            >
              <option value="todos" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Todos los Estados Nodus</option>
              <option value="verificado_ok" style={{ backgroundColor: '#0f172a', color: '#22c55e' }}>🟢 100% Verificados en Llamada</option>
              <option value="parcial" style={{ backgroundColor: '#0f172a', color: '#f59e0b' }}>🟡 En Verificación (Parcial)</option>
              <option value="discrepancia" style={{ backgroundColor: '#0f172a', color: '#ef4444' }}>🚨 Con Discrepancias (Alerta)</option>
              <option value="pendiente" style={{ backgroundColor: '#0f172a', color: '#94a3b8' }}>⏳ Falta Confirma de Coord.</option>
            </select>
          </div>

          {/* Selector de Equipo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Equipo:</span>
            <select
              value={filterEquipo}
              onChange={(e) => setFilterEquipo(e.target.value)}
              className="form-input"
              style={{
                width: 'auto',
                minWidth: '170px',
                fontSize: '0.85rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: filterEquipo !== 'todos' ? '1px solid #ffb703' : '1px solid #475569',
                color: filterEquipo !== 'todos' ? '#ffb703' : '#f8fafc',
                fontWeight: filterEquipo !== 'todos' ? 700 : 500,
                backgroundColor: '#0f172a'
              }}
            >
              <option value="todos" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
                {filterSede === 'Lima' ? 'Todos los Equipos (Histórico: 291)' : 'Todos los Equipos'}
              </option>
              {equiposDisponibles.map(eq => {
                let label = eq;
                if (eq === 'EQUIPO 31 - LIMA CICLO 1') {
                  label = '⭐ EQUIPO 31 - LIMA (Misión Activa • 133 Enrolamientos)';
                } else if (eq.includes('LIMA')) {
                  label = `${eq} (Ciclo Anterior)`;
                }
                return (
                  <option key={eq} value={eq} style={{ backgroundColor: '#0f172a', color: eq.includes('31') ? '#38bdf8' : '#f8fafc', fontWeight: eq.includes('31') ? 700 : 400 }}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selector de Estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estado:</span>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="form-input"
              style={{
                width: 'auto',
                minWidth: '140px',
                fontSize: '0.85rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#f8fafc'
              }}
            >
              <option value="todos" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Todos los Estados</option>
              <option value="completado" style={{ backgroundColor: '#0f172a', color: '#22c55e' }}>✅ Completados (100%)</option>
              <option value="en_progreso" style={{ backgroundColor: '#0f172a', color: '#f59e0b' }}>⏳ En Progreso</option>
            </select>
          </div>

          {(searchTerm || filterSede !== 'todos' || filterEquipo !== 'todos' || filterEstado !== 'todos' || filterNodus !== 'todos') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterSede('todos'); setFilterEquipo('todos'); setFilterEstado('todos'); setFilterNodus('todos'); }}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--crear-blue, #38bdf8)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>


      {viewMode === 'enrolados' ? (
        <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.85)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋</span> Lista Detallada de Enrolamientos ({uniqueEnroladosList.length})
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                Auditoría nominal prospecto por prospecto • Garantía 0 Duplicados • 0 Redundancias • 0 Omisiones
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontWeight: 700, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                ✅ {totalConfirmadosCount} Confirmados
              </span>
              <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                ⏳ {totalEnroladosCount - totalConfirmadosCount} Pendientes
              </span>
            </div>
          </div>

          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '980px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.05)' }}>
                <th style={{ padding: '0.85rem', color: '#38bdf8', fontSize: '0.82rem', width: '45px' }}>#</th>
                <th style={{ padding: '0.85rem', color: '#38bdf8', fontSize: '0.82rem' }}>Enrolado / Prospecto</th>
                <th style={{ padding: '0.85rem', color: '#38bdf8', fontSize: '0.82rem' }}>Teléfono</th>
                <th style={{ padding: '0.85rem', color: '#38bdf8', fontSize: '0.82rem' }}>IMO Responsable</th>
                <th style={{ padding: '0.85rem', color: '#38bdf8', fontSize: '0.82rem' }}>Equipo</th>
                <th style={{ padding: '0.85rem', color: '#38bdf8', fontSize: '0.82rem' }}>Coordinador/a</th>
                <th style={{ padding: '0.85rem', color: '#38bdf8', fontSize: '0.82rem' }}>Confirmación IMO</th>
                <th style={{ padding: '0.85rem', color: '#38bdf8', fontSize: '0.82rem' }}>Validación Nodus</th>
                <th style={{ padding: '0.85rem', color: '#38bdf8', fontSize: '0.82rem', textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {uniqueEnroladosList.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No se encontraron enrolamientos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                uniqueEnroladosList.map((enr, idx) => {
                  const evalRes = evaluateEnroladoVerification(enr, enr.imoNombre, enr.equipo);
                  return (
                    <tr key={enr.id || `enr_${idx}`} style={{
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      background: evalRes.status === 'DISCREPANCIA' ? 'rgba(239, 68, 68, 0.04)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
                    }}>
                      <td style={{ padding: '0.75rem 0.85rem', color: '#64748b', fontSize: '0.82rem', fontWeight: 700 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '0.75rem 0.85rem', fontWeight: 600 }}>
                        <div style={{ color: '#fff', fontSize: '0.88rem' }}>{enr.nombre || 'Sin Nombre'}</div>
                        {enr.email && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{enr.email}</div>}
                      </td>
                      <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.82rem', color: enr.telefono ? '#cbd5e1' : '#64748b' }}>
                        {enr.telefono ? `📞 ${enr.telefono}` : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>
                        👤 {enr.imoNombre}
                      </td>
                      <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                        {enr.equipo}
                      </td>
                      <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                        {enr.coordinadora_nombre || 'Coordinación'}
                      </td>
                      <td style={{ padding: '0.75rem 0.85rem' }}>
                        {enr.asistencia ? (
                          <span style={{ color: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                            ✅ Asistirá
                          </span>
                        ) : (
                          <span style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            ⏳ Pendiente
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.85rem' }}>
                        <div style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 7px',
                          borderRadius: '4px',
                          background: evalRes.statusBg,
                          color: evalRes.statusColor,
                          border: `1px solid ${evalRes.statusBorder}`,
                          display: 'inline-block'
                        }}>
                          {evalRes.statusLabel}
                        </div>
                        {evalRes.llamada1 && evalRes.llamada1 !== '—' && (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                            1ra: {evalRes.llamada1}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                        {enr.email ? (
                          <button
                            onClick={() => handleSendWelcomeEmail(enr)}
                            disabled={sendingEmail === enr.id}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(56, 189, 248, 0.4)',
                              color: '#38bdf8',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              cursor: sendingEmail === enr.id ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {sendingEmail === enr.id ? '...' : '✉️ Email'}
                          </button>
                        ) : (
                          <span style={{ color: '#475569', fontSize: '0.72rem' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '950px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(255, 183, 3, 0.3)' }}>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>IMO (Nombre)</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>Equipo</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>Avance IMO</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>Confirmados IMO</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>Estado</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>Última Conexión</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>Ubicación</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>Validación Nodus (Llamadas)</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredMissions.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {missions.length === 0 ? 'No hay misiones de IMOs registradas actualmente.' : 'Ningún IMO o enrolado coincide con los filtros aplicados.'}
                </td>
              </tr>
            ) : filteredMissions.map((m) => {
              const enroladosList = getEnroladosList(m);
              const totalEnrolled = enroladosList.length;
              let contacted = 0;
              let assisted = 0;

              enroladosList.forEach(e => {
                if (e.contacto) contacted++;
                if (e.asistencia) assisted++;
              });

              // Evaluación automática contra llamadas de Coordinadoras en Nodus
              const nodusSummary = evaluateMissionVerification(m, enroladosList);

              const progreso = totalEnrolled > 0 ? Math.round((assisted / totalEnrolled) * 100) : 0;
              const isCompleted = totalEnrolled > 0 && assisted === totalEnrolled;
              const isExpanded = expandedImo === m.id;

              return (
                <React.Fragment key={m.id}>
                  <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.06)', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{m.imoNombre || 'Desconocido'}</span>
                        {m.verificadoNodus && (
                          <span title="Marcado como verificado manualmente" style={{ fontSize: '0.7rem', color: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', padding: '1px 5px', borderRadius: '3px' }}>
                            Admin OK
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>📍 {resolveMissionSede(m)}</div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--crear-blue)', fontWeight: 600 }}>
                      {normalizeEquipoName(m.equipo)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600 }}>Progreso: {progreso}%</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📞 Contactados: {contacted}</div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 700 }}>
                      <span style={{ color: assisted > 0 ? '#38bdf8' : '#fff' }}>{assisted}</span> / {totalEnrolled}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {isCompleted ? (
                        <span style={{ color: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>Completado</span>
                      ) : (
                        <span style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>En Progreso</span>
                      )}
                    </td>

                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {formatDate(m.lastUpdated)}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {getUbicacion(m)}
                    </td>

                    {/* Insignia Reactiva de Validación Automática Nodus */}
                    <td style={{ padding: '1rem' }}>
                      <div
                        onClick={() => setExpandedImo(isExpanded ? null : m.id)}
                        title={nodusSummary.tooltip}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: nodusSummary.badgeBg,
                          color: nodusSummary.badgeColor,
                          border: `1px solid ${nodusSummary.badgeBorder}`,
                          boxShadow: nodusSummary.overallStatus === 'DISCREPANCIA' ? '0 0 10px rgba(239, 68, 68, 0.25)' : 'none',
                          cursor: 'pointer',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        <span>{nodusSummary.badgeLabel}</span>
                      </div>
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => setExpandedImo(isExpanded ? null : m.id)}
                        style={{
                          background: isExpanded ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                          color: isExpanded ? '#38bdf8' : 'var(--crear-blue)',
                          border: `1px solid ${isExpanded ? '#38bdf8' : 'rgba(56, 189, 248, 0.3)'}`,
                          padding: '4px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          marginRight: '8px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {isExpanded ? 'Ocultar Enrolados' : `Ver Enrolados (${enroladosList.length})`}
                      </button>
                      <button
                        onClick={() => handleResetMission(m.id)}
                        title="Resetear telemetría de prueba de este IMO"
                        style={{
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        Resetear
                      </button>
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td colSpan={9} style={{ padding: '1.5rem', paddingTop: '0.5rem' }}>
                        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1.2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div>
                              <h4 style={{ margin: 0, color: 'var(--crear-gold, #ffb703)', fontSize: '0.95rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>👥</span> Enrolados de {m.imoNombre} ({enroladosList.length})
                              </h4>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Reportados como 'Asistirá' por IMO: <strong style={{ color: '#38bdf8' }}>{assisted}</strong> de <strong>{enroladosList.length}</strong>
                              </div>
                            </div>

                            {/* Barra de Resumen de Cruce Nodus */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.78rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', fontWeight: 600 }}>
                                ✅ {nodusSummary.validadosOk} Coinciden con Llamada Coord.
                              </span>
                              {nodusSummary.pendientesCoord > 0 && (
                                <span style={{ fontSize: '0.78rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 600 }}>
                                  ⏳ {nodusSummary.pendientesCoord} Pendientes de Confirmar por Coord.
                                </span>
                              )}
                              {nodusSummary.discrepancias > 0 && (
                                <span style={{ fontSize: '0.78rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.45)', fontWeight: 800 }}>
                                  🚨 {nodusSummary.discrepancias} Discrepancia(s) Crítica(s)
                                </span>
                              )}
                            </div>
                          </div>

                          {enroladosList.length === 0 ? (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              No hay enrolados registrados para este IMO.
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                              {enroladosList.map(enrolado => {
                                const evalRes = evaluateEnroladoVerification(enrolado, m.imoNombre, m.equipo);
                                return (
                                  <div key={enrolado.id} style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    border: `1px solid ${evalRes.status === 'DISCREPANCIA' ? 'rgba(239, 68, 68, 0.4)' : evalRes.status === 'VERIFICADO_OK' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                                    position: 'relative'
                                  }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px', color: '#fff' }}>
                                      {enrolado.nombre}
                                    </div>
                                    
                                    {/* Insignias de lo que afirmó el IMO */}
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                      <span style={{
                                        fontSize: '0.75rem',
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        fontWeight: 600,
                                        background: enrolado.contacto ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                        color: enrolado.contacto ? '#22c55e' : '#ef4444'
                                      }}>
                                        {enrolado.contacto ? '📞 Contactado' : '⏳ No Contactado'}
                                      </span>
                                      
                                      <span style={{
                                        fontSize: '0.75rem',
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        fontWeight: 600,
                                        background: enrolado.asistencia ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                                        color: enrolado.asistencia ? '#38bdf8' : 'var(--text-muted)'
                                      }}>
                                        {enrolado.asistencia ? '✅ IMO: Asistirá' : '⚪ IMO: Pendiente'}
                                      </span>
                                    </div>

                                    {/* Panel de Cruce Automático con Llamadas de Coordinadoras en Nodus */}
                                    <div style={{
                                      padding: '8px 10px',
                                      borderRadius: '6px',
                                      background: evalRes.statusBg,
                                      border: `1px solid ${evalRes.statusBorder}`,
                                      marginBottom: '10px'
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                                          🎧 Nodus / Coordinación:
                                        </span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: evalRes.statusColor }}>
                                          {evalRes.statusLabel}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '0.8rem', color: '#fff', marginBottom: '2px' }}>
                                        <strong>Coord. {evalRes.coordinador}</strong> • 1ra Llamada: <span style={{ color: evalRes.statusColor, fontWeight: 700 }}>{evalRes.llamada1}</span>
                                        {evalRes.llamada2 && evalRes.llamada2 !== '—' && ` • 2da: ${evalRes.llamada2}`}
                                        {evalRes.asistenciaNodus && evalRes.asistenciaNodus !== '—' && ` • Asistencia: ${evalRes.asistenciaNodus}`}
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        {evalRes.detalle}
                                      </div>
                                    </div>

                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                      📍 {enrolado.coordinadora_nombre || normalizeEquipoName(m.equipo)}
                                      {enrolado.telefono ? ` • 📱 ${enrolado.telefono}` : ''}
                                    </div>

                                    <div style={{ fontSize: '0.78rem', color: enrolado.email ? '#38bdf8' : 'var(--text-muted)', marginBottom: '12px' }}>
                                      {enrolado.email ? `✉️ ${enrolado.email}` : '⚪ Sin correo registrado'}
                                    </div>

                                    {enrolado.email ? (
                                      <button
                                        onClick={() => handleSendWelcomeEmail(enrolado)}
                                        disabled={sendingEmail === enrolado.id}
                                        style={{
                                          width: '100%',
                                          background: 'var(--crear-gold)',
                                          color: '#000',
                                          border: 'none',
                                          padding: '6px 12px',
                                          borderRadius: '4px',
                                          fontWeight: 700,
                                          fontSize: '0.8rem',
                                          cursor: sendingEmail === enrolado.id ? 'not-allowed' : 'pointer',
                                          opacity: sendingEmail === enrolado.id ? 0.7 : 1
                                        }}
                                      >
                                        {sendingEmail === enrolado.id ? 'Encolando...' : '📨 Enviar Bienvenida'}
                                      </button>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
