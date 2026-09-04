import { FlagIcon, getFlagForSede } from '../utils/flags';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, HelpCircle, Mail, Send, CheckCircle2, BookOpen, AlertTriangle, ShieldAlert, HeartPulse, PhoneCall, Zap, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OnboardingTourModal from './OnboardingTourModal';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function HelpModal({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'protocol' | 'suggestions'
  const [showTour, setShowTour] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionImage, setSuggestionImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const isQT = currentUser?.appRole === 'qt' || (currentUser?.roles || []).includes('qt');

  if (!isOpen) return null;

  const handleSendSuggestion = async (e) => {
    e.preventDefault();
    if (!suggestion.trim()) return;

    setIsSubmitting(true);
    let imageUrl = '';
    
    if (suggestionImage) {
      const formData = new FormData();
      formData.append('image', suggestionImage);
      try {
        const res = await fetch('https://api.imgbb.com/1/upload?key=67f13df5d688cf64ec5ba63b0a2bf062', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          imageUrl = data.data.url;
        }
      } catch (err) {
        console.error("Error subiendo imagen:", err);
      }
    }

    try {
      await addDoc(collection(db, 'mail'), {
        to: 'sistemas@crearpsl.net',
        message: {
          subject: `💡 Nueva Sugerencia Causa OS de ${currentUser?.name || 'Usuario'}`,
          html: `
            <h3>Nueva sugerencia/reporte desde la plataforma Causa OS</h3>
            <p><strong>Usuario:</strong> ${currentUser?.name} (${currentUser?.email})</p>
            <p><strong>Rol:</strong> ${currentUser?.appRole}</p>
            <p><strong>Sede:</strong> ${currentUser?.sede}</p>
            <hr />
            <p>${suggestion.replace(/\n/g, '<br>')}</p>
            ${imageUrl ? `<br/><p><strong>Evidencia Adjunta:</strong><br/><a href="${imageUrl}" target="_blank"><img src="${imageUrl}" style="max-width: 500px; max-height: 500px; border-radius: 8px; margin-top: 10px;" /></a></p>` : ''}
          `
        },
        createdAt: serverTimestamp()
      });
      setSuccess(true);
      setSuggestion('');
      setSuggestionImage(null);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 3000);
    } catch (error) {
      console.error("Error enviando sugerencia:", error);
      toast.error("Hubo un error enviando la sugerencia. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '800px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        border: '1px solid var(--crear-gold)',
        overflow: 'hidden',
        background: '#111'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem', background: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--crear-gold)' }}>
            <HelpCircle size={24} />
            Centro de Ayuda Causa OS
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
          <button
            onClick={() => setActiveTab('manual')}
            style={{
              flex: 1, padding: '1rem', border: 'none', background: 'transparent', cursor: 'pointer',
              color: activeTab === 'manual' ? 'var(--crear-gold)' : 'var(--text-muted)',
              borderBottom: activeTab === 'manual' ? '2px solid var(--crear-gold)' : '2px solid transparent',
              fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            <BookOpen size={18} /> Manual de Usuario
          </button>
          <button
            onClick={() => setActiveTab('protocol')}
            style={{
              flex: 1, padding: '1rem', border: 'none', background: 'transparent', cursor: 'pointer',
              color: activeTab === 'protocol' ? '#ef4444' : 'var(--text-muted)',
              borderBottom: activeTab === 'protocol' ? '2px solid #ef4444' : '2px solid transparent',
              fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            <ShieldAlert size={18} /> Protocolo de Emergencias
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            style={{
              flex: 1, padding: '1rem', border: 'none', background: 'transparent', cursor: 'pointer',
              color: activeTab === 'suggestions' ? 'var(--crear-cyan)' : 'var(--text-muted)',
              borderBottom: activeTab === 'suggestions' ? '2px solid var(--crear-cyan)' : '2px solid transparent',
              fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            <Mail size={18} /> Sugerencias y Soporte
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'protocol' ? (
            <div style={{ color: 'var(--text-body)', lineHeight: '1.6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ color: '#ef4444', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldAlert size={22} /> Protocolo Global de Emergencias Médicas
                  </h3>
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    Aplicación obligatoria en todas las sedes de Crear Poder Sin Límites.
                  </p>
                </div>
                <button 
                  onClick={() => { onClose(); navigate('/protocolo-emergencias'); }}
                  className="btn-primary"
                  style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff', padding: '0.4rem 1rem', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Ver Pantalla Completa ↗
                </button>
              </div>

              {/* Principio Operativo */}
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', borderLeft: '4px solid #ef4444', marginBottom: '1.2rem' }}>
                <h4 style={{ color: '#ef4444', margin: '0 0 0.4rem 0', fontWeight: 800 }}>1. Principio Operativo</h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#fff' }}>
                  <strong>El entrenador no detiene ni abandona el entrenamiento.</strong> El coordinador o capitán designado asume el manejo exclusivo dentro del salón, organiza el perímetro, solicita apoyo y retira al paciente cuando proceda.
                </p>
              </div>

              {/* 7 Pasos Breves */}
              <h4 style={{ color: 'var(--crear-gold)', marginBottom: '0.6rem' }}>2. Los 7 Pasos de Oro</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.2rem' }}>
                <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}><strong>1. Detectar y avisar:</strong> El entrenador avisa con voz firme: "Emergencia en [lugar], coordinador requerido".</div>
                <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}><strong>2. Asumir el salón:</strong> El coordinador toma el control y es la única voz de mando.</div>
                <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}><strong>3. Proteger:</strong> Crear perímetro humano, despejar oxígeno y evitar grabaciones.</div>
                <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}><strong>4. Evaluar y solicitar apoyo:</strong> Solicitar enfermera o brigadista certificado.</div>
                <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}><strong>5. Retirar al paciente:</strong> Si es seguro. (NO mover si hay sospecha de cuello/columna).</div>
                <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}><strong>6. Continuar:</strong> El entrenador retoma la atención del grupo con serenidad.</div>
                <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}><strong>7. Trasladar y registrar:</strong> Ambulancia si procede, aviso a familiar y registro en plataforma.</div>
              </div>

              {/* Centrales de Emergencia Rápidas */}
              <h4 style={{ color: 'var(--crear-cyan)', marginBottom: '0.6rem' }}>3. Centrales de Emergencia por Sede</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FlagIcon country="Ecuador" size={16} /> Quito/GYE/CUE: <strong style={{ color: '#ef4444' }}>911</strong></div>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FlagIcon country="Peru" size={16} /> Lima: <strong style={{ color: '#ef4444' }}>106 / 116</strong></div>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FlagIcon country="Colombia" size={16} /> Medellín: <strong style={{ color: '#ef4444' }}>123</strong></div>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FlagIcon country="Mexico" size={16} /> México: <strong style={{ color: '#ef4444' }}>911</strong></div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <button 
                  onClick={() => { onClose(); navigate('/protocolo-emergencias'); }}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem', background: '#ef4444', borderColor: '#ef4444', color: '#fff', fontWeight: 800 }}
                >
                  🚨 Ir al Módulo Interactivo de Emergencias y Checklist
                </button>
              </div>
            </div>
          ) : activeTab === 'manual' ? (
            <div style={{ color: 'var(--text-body)', lineHeight: '1.6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1.2rem', padding: '1rem', background: 'rgba(255, 183, 3, 0.08)', borderRadius: '10px', border: '1px solid rgba(255, 183, 3, 0.3)' }}>
                <div>
                  <h3 style={{ color: 'var(--crear-gold)', margin: '0 0 0.3rem 0' }}>¿Primera vez en Causa OS?</h3>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)' }}>Aprende qué hace cada botón, qué está permitido y qué no en un recorrido interactivo de 1 minuto.</p>
                </div>
                <button 
                  onClick={() => setShowTour(true)}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.2rem', fontSize: '0.85rem', fontWeight: 800 }}
                >
                  🧭 Iniciar Tour de Botones ↗
                </button>
              </div>

              <h3 style={{ color: 'var(--crear-gold)', marginTop: 0 }}>Bienvenido a Causa OS</h3>
              <p>Esta herramienta centraliza todas las tareas, reportes y métricas de CREAR Poder Sin Límites para lograr una operación eficiente y transparente en todas las sedes.</p>

              {/* ENLACE DIRECTO MANUAL QUANTUM TEAM (SOLO PARA QT) */}
              {isQT && (
                <div style={{ background: 'rgba(255, 183, 3, 0.1)', border: '1px solid var(--crear-gold)', padding: '1rem', margin: '1rem 0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <div>
                    <h4 style={{ color: 'var(--crear-gold)', margin: '0 0 0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <BookOpen size={18} /> Manual Quantum Team (QT) Oficial
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)' }}>Accede al manual interactivo para salas y dinámicas de CREAR.</p>
                  </div>
                  <a 
                    href="https://crearpsl.net/manual_quantum_team.html" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-primary" 
                    style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', textDecoration: 'none', borderRadius: '6px' }}
                  >
                    Abrir Manual QT ↗
                  </a>
                </div>
              )}

              {/* ENLACE DIRECTO MANUAL NODUS & GOBERNANZA SISTÉMICA 2026 */}
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '1.2rem', margin: '1rem 0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div>
                  <h4 style={{ color: '#10b981', margin: '0 0 0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BookOpen size={20} /> Centro de Gobernanza Nodus + Causa OS (2026)
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)' }}>Manifiesto simbiótico, los 9 niveles de excelencia, códigos de vestimenta, 14 KPIs oficiales y los 18 capítulos paso a paso de Nodus.</p>
                </div>
                <button 
                  onClick={() => { onClose(); navigate('/manual-nodus'); }}
                  className="btn-primary" 
                  style={{ background: '#10b981', borderColor: '#10b981', color: '#fff', padding: '0.5rem 1.2rem', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '6px', fontWeight: 800 }}
                >
                  📗 Abrir Manual Nodus ↗
                </button>
              </div>

              {/* RECURSO OFICIAL: PROTOCOLO DE EMERGENCIAS CREAR GLOBAL */}
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', padding: '1.2rem', margin: '1rem 0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div>
                  <h4 style={{ color: '#ef4444', margin: '0 0 0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldAlert size={20} /> Protocolo Global de Emergencias Médicas
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)' }}>Módulo interactivo completo con los 7 pasos de oro, cadena de mando, triage y checklist por sede.</p>
                </div>
                <button 
                  onClick={() => { onClose(); navigate('/protocolo-emergencias'); }}
                  className="btn-primary" 
                  style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff', padding: '0.5rem 1.2rem', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '6px', fontWeight: 800 }}
                >
                  🚨 Abrir Protocolo Interactivo ↗
                </button>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '4px solid #ef4444', padding: '1rem', margin: '1.5rem 0', borderRadius: '4px' }}>
                <h4 style={{ color: '#ef4444', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} /> Regla de Inactividad (72 horas)
                </h4>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>El sistema monitorea tu acceso. Si pasas más de 72 horas sin ingresar a la plataforma, recibirás una alerta automática en tu correo electrónico. Recuerda que la actualización constante es clave para el éxito del equipo.</p>
              </div>

              <h4 style={{ color: 'var(--text-heading)' }}>1. Mi Matriz Operativa (Checklist)</h4>
              <p>Aquí verás todas las tareas que debes cumplir. Tienes tareas <strong>Base</strong> (propias de tu rol y sede) y tareas <strong>Asignadas</strong> (específicas para ti).</p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                <li>Marca el cuadro de verificación a la derecha para completar una tarea.</li>
                <li>Si una tarea tiene un candado <span style={{ color: '#ef4444' }}>🔒</span>, significa que está vencida y no podrás completarla a menos que justifiques la demora o pidas una extensión.</li>
                <li>Usa los filtros superiores para ver tareas vencidas, pendientes, en riesgo o completadas.</li>
              </ul>

              <h4 style={{ color: 'var(--text-heading)' }}>2. Directorios y Comunicación Directa</h4>
              <p>El sistema cuenta con accesos directos para comunicarte y monitorear a los miembros del equipo.</p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                <li><strong>Pantalla de Inicio:</strong> Encontrarás botones rápidos a los directorios principales (Directorio QT y Directorio Equipos).</li>
                <li><strong>Comunicación:</strong> Al ver el perfil de un usuario, tendrás botones rápidos para escribirle por <strong>WhatsApp</strong> o enviarle un <strong>Correo</strong> directamente sin tener que guardarlos.</li>
                <li><strong>Privacidad de Pares:</strong> Los gerentes y directores solo pueden ver las tareas de sus subordinados directos o aquellas en las que colaboran.</li>
              </ul>

              {(currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria') && (
                <>
                  <h4 style={{ color: 'var(--text-heading)' }}>3. Auditoría de KPIs y Dashboard</h4>
                  <p>La sección de KPIs ha sido reconstruida y mejorada para gerentes y directores.</p>
                  <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                    <li><strong>Tab CMJ:</strong> Consolidado automático (desde Drive) que suma la retención, deserción y enrolamiento total de <em>todos</em> los Coordinadores de la Maestría de la sede seleccionada.</li>
                    <li><strong>Tab Entrenadores Maestría:</strong> Métricas operativas de avance, gráficas y cierres enfocadas en el desempeño del Entrenador por sede.</li>
                    <li><strong>Tab Auditoría de KPIs:</strong> Espacio exclusivo para revisar y auditar los formularios semanales cargados manualmente por el Quantum Team (QT y Coordinadores).</li>
                    <li><strong>Horarios de Entrenamiento y Vestimenta:</strong> Consulta el cronograma oficial de sala (Jueves a Domingo) y código de vestimenta haciendo clic en el botón <strong>⏰ Horarios y Vestimenta</strong> en la barra superior de Inicio, en el Dashboard Gerencial o en el Manual Nodus.</li>
                    <li><strong>Flyers Globales:</strong> Acceso a recursos de diseño para Capítulo 1 en la pantalla de inicio.</li>
                  </ul>
                </>
              )}

              {!(currentUser?.appRole === 'gerente' || currentUser?.isDireccion || currentUser?.appRole === 'director_maestria') && (
                <>
                  <h4 style={{ color: 'var(--text-heading)' }}>3. Envío de KPIs y Formularios</h4>
                  <p>Si eres parte del Quantum Team (QT) o Coordinador, deberás enviar tus KPIs semanales mediante los formularios en la sección correspondiente. Asegúrate de reportar fielmente las métricas de tu sala o maestría.</p>
                </>
              )}

              <h4 style={{ color: 'var(--text-heading)' }}>4. Tareas Compartidas y Colaboradores</h4>
              <p>Si necesitas ayuda de otra persona o sede, abre una tarea y selecciona <strong>"Añadir Colaborador"</strong>. La tarea aparecerá en el perfil de ambos. Todos los correos de alertas de tareas atrasadas ahora se envían de forma automática al detectar inactividad.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 style={{ color: 'var(--crear-cyan)', marginTop: 0 }}>Envía tus Sugerencias</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                ¿Encontraste un error? ¿Tienes una idea para mejorar la plataforma? Escríbenos y el equipo de sistemas lo revisará directamente en <strong>sistemas@crearpsl.net</strong>.
              </p>

              {success ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
                  <CheckCircle2 size={48} style={{ marginBottom: '1rem' }} />
                  <h3 style={{ margin: 0 }}>¡Mensaje Enviado!</h3>
                  <p>Gracias por ayudarnos a mejorar Causa OS.</p>
                </div>
              ) : (
                <form onSubmit={handleSendSuggestion} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                  <textarea
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    placeholder="Escribe tu sugerencia, reporte de bug o idea de mejora aquí..."
                    required
                    style={{
                      flex: 1, minHeight: '150px', padding: '1rem', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)',
                      color: '#fff', fontSize: '1rem', resize: 'vertical', fontFamily: 'inherit'
                    }}
                  />
                  
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed var(--border-strong)',
                    padding: '1rem',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <label style={{ color: 'var(--crear-cyan)', fontWeight: 600, fontSize: '0.9rem' }}>
                      📸 Adjunta una captura de pantalla (Opcional pero recomendado)
                    </label>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Si estás reportando un error o caso a corregir, una foto nos ayudará a comprenderlo mucho mejor.
                    </p>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSuggestionImage(e.target.files[0]);
                        }
                      }}
                      style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '0.8rem 1.5rem' }}>Cancelar</button>
                    <button type="submit" className="btn-primary" disabled={isSubmitting || !suggestion.trim()} style={{ background: 'var(--crear-cyan)', color: '#000', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem' }}>
                      {isSubmitting ? 'Enviando...' : <><Send size={18} /> Enviar Mensaje</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      <OnboardingTourModal 
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        user={currentUser}
      />
    </div>
  );
}
