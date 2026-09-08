import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, writeBatch, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function MonitorImos() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedImo, setExpandedImo] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(null);
  const navigate = useNavigate();

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
      alert("Este participante no tiene un correo registrado en la base de datos de IMOs. Por favor, actualiza los datos en la app de IMOs (imos_data.json) primero.");
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
        <p>Cargando telemetría de IMOs...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-8" style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
            <span style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
              SISTEMA OPERATIVO CAUSA
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Misión IMO</span>
          </div>
          <h1 className="text-gold" style={{ fontSize: '2.4rem', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
            MONITOR DE IMOS
          </h1>
          <p className="text-muted" style={{ fontSize: '1.05rem', margin: 0 }}>
            Supervisión en tiempo real de los IMOs conectados, sus enrolados y su progreso de llamadas.
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

      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(255, 183, 3, 0.3)' }}>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>IMO (Nombre)</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>Inicio Misión</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>Avance Enrolados</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>Total Confirmados</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem' }}>Estado</th>
              <th style={{ padding: '1rem', color: 'var(--crear-gold)', fontSize: '0.85rem', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {missions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay misiones de IMOs registradas actualmente.
                </td>
              </tr>
            ) : missions.map((m) => {
              const enrolledKeys = Object.keys(m.checks || {});
              const totalEnrolled = m.totalEnrolados || 0;
              const confirmed = m.completados || 0;
              let contacted = 0;
              let assisted = 0;
              enrolledKeys.forEach(k => {
                if (m.checks[k]?.contacto) contacted++;
                if (m.checks[k]?.asistencia) assisted++;
              });

              const isCompleted = m.progreso === 100;
              const dateStarted = m.lastUpdated?.toDate ? m.lastUpdated.toDate().toLocaleString() : 'Reciente';
              const isExpanded = expandedImo === m.id;

              return (
                <React.Fragment key={m.id}>
                  <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.06)', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                      {m.imoNombre || 'Desconocido'}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.equipo || ''}</div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }} className="text-muted">{dateStarted}</td>
                    <td style={{ padding: '1rem' }}>
                      <div>Progreso: {m.progreso || 0}%</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--crear-blue)' }}>Contactados: {contacted} | Asistirán: {assisted}</div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 700 }}>
                      {confirmed} / {totalEnrolled}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {isCompleted ? (
                        <span style={{ color: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>Completado</span>
                      ) : (
                        <span style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>En Progreso</span>
                      )}
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
                        {isExpanded ? 'Ocultar Enrolados' : 'Ver Enrolados'}
                      </button>
                      <button
                        onClick={() => handleResetMission(m.id)}
                        title="Resetear IMO"
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
                  
                  {isExpanded && m.enrolados && (
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td colSpan={6} style={{ padding: '1.5rem', paddingTop: '0.5rem' }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--crear-gold)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Lista de Enrolados</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                            {m.enrolados.map(enrolado => (
                              <div key={enrolado.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>{enrolado.nombre}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Coord: {enrolado.coordinadora_nombre} ({enrolado.coordinadora_telefono})</div>
                                <div style={{ fontSize: '0.8rem', color: enrolado.email ? '#38bdf8' : '#ef4444', marginBottom: '12px' }}>
                                  {enrolado.email ? `✉️ ${enrolado.email}` : '⚠️ Sin correo registrado'}
                                </div>
                                
                                <button
                                  onClick={() => handleSendWelcomeEmail(enrolado)}
                                  disabled={sendingEmail === enrolado.id || !enrolado.email}
                                  style={{
                                    width: '100%',
                                    background: enrolado.email ? 'var(--crear-gold)' : 'rgba(255,255,255,0.1)',
                                    color: enrolado.email ? '#000' : 'rgba(255,255,255,0.3)',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: (sendingEmail === enrolado.id || !enrolado.email) ? 'not-allowed' : 'pointer',
                                    opacity: sendingEmail === enrolado.id ? 0.7 : 1
                                  }}
                                >
                                  {sendingEmail === enrolado.id ? 'Encolando...' : '📨 Enviar Bienvenida'}
                                </button>
                              </div>
                            ))}
                          </div>
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
    </div>
  );
}
