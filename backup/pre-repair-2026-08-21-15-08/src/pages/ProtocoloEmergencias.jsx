import { FlagIcon, getFlagForSede } from '../utils/flags';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, ShieldAlert, HeartPulse, PhoneCall, CheckSquare, 
  ArrowLeft, Users, FileText, Download, CheckCircle2, AlertOctagon, 
  Compass, Zap, Building2, Flame, UserCheck, Stethoscope, ChevronRight,
  HelpCircle, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProtocoloEmergencias() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState('procedimiento'); // 'procedimiento' | 'cadena' | 'triage' | 'checklist' | 'directorio'
  const [selectedRole, setSelectedRole] = useState('todos');
  const [checklistState, setChecklistState] = useState({
    responsable: false,
    telefono: false,
    botiquin: false,
    ruta: false,
    centroMedico: false,
    brigadistas: false,
    reporte: false
  });

  const toggleCheck = (key) => {
    setChecklistState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const checklistItems = [
    { key: 'responsable', title: 'Responsable del salón y suplente identificados', desc: 'Confirmar quién asume la voz de mando ante una eventualidad antes de abrir puertas.' },
    { key: 'telefono', title: 'Teléfono local de emergencias visible y probado', desc: 'Tener línea activa y número local a la mano (911 / 106 / 123).' },
    { key: 'botiquin', title: 'Enfermería, botiquín, camilla y DEA ubicados y accesibles', desc: 'Verificar inventario de primeros auxilios y ubicación sin obstrucciones.' },
    { key: 'ruta', title: 'Ruta de salida y acceso de ambulancia despejados', desc: 'Asegurar que los accesos vehiculares y pasillos de camilla estén 100% libres.' },
    { key: 'centroMedico', title: 'Centro médico de referencia y seguro definidos', desc: 'Tener la clínica u hospital más cercano identificado por sede.' },
    { key: 'brigadistas', title: 'Personal de coordinación y brigadistas capacitados', desc: 'Asegurar que el equipo conoce sus funciones y el protocolo.' },
    { key: 'reporte', title: 'Formato de reporte de incidentes disponible', desc: 'Tener lista la bitácora física o digital para registrar cualquier suceso.' }
  ];

  const checkedCount = Object.values(checklistState).filter(Boolean).length;
  const checklistPct = Math.round((checkedCount / checklistItems.length) * 100);

  const sedesEmergencia = [
    { sede: 'Quito', pais: 'Ecuador', bandera: '🇪🇨', numero: '911', servicio: 'ECU 911 / Cruz Roja / Bomberos', direccion: 'Cobertura Metropolitana' },
    { sede: 'Guayaquil', pais: 'Ecuador', bandera: '🇪🇨', numero: '911', servicio: 'ECU 911 / Benemérito Cuerpo de Bomberos', direccion: 'Cobertura Costa' },
    { sede: 'Cuenca', pais: 'Ecuador', bandera: '🇪🇨', numero: '911', servicio: 'ECU 911 Austro', direccion: 'Cobertura Austro' },
    { sede: 'Lima', pais: 'Perú', bandera: '🇵🇪', numero: '106 / 116 / 105', servicio: 'SAMU (106) / Bomberos (116) / PNP (105)', direccion: 'Cobertura Lima Metropolitana' },
    { sede: 'Medellín', pais: 'Colombia', bandera: '🇨🇴', numero: '123', servicio: 'Línea Única de Emergencias 123 / Cruz Roja', direccion: 'Valle de Aburrá' },
    { sede: 'México', pais: 'México', bandera: '🇲🇽', numero: '911', servicio: '911 CDMX / ERUM / Cruz Roja', direccion: 'Ciudad de México' },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      
      {/* Botón Volver */}
      <button 
        onClick={() => navigate('/home')} 
        className="btn-secondary" 
        style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={16} /> Volver al Inicio
      </button>

      {/* Header Oficial */}
      <div className="glass-panel" style={{ 
        padding: '2rem', 
        marginBottom: '2rem', 
        borderLeft: '6px solid #ef4444',
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(17, 17, 17, 0.95) 100%)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ 
                background: '#ef4444', 
                color: '#fff', 
                padding: '4px 10px', 
                borderRadius: '6px', 
                fontWeight: 800, 
                fontSize: '0.75rem',
                letterSpacing: '1px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                <ShieldAlert size={14} /> PROTOCOLO OFICIAL ACTIVO
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Crear Poder Sin Límites • Gobernanza Global</span>
            </div>
            <h1 style={{ color: '#fff', margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 800 }}>
              Protocolo Global de Emergencias Médicas
            </h1>
            <p style={{ color: 'var(--text-main)', margin: 0, maxWidth: '800px', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Manual operativo obligatorio y estandarizado para la prevención, contención y actuación inmediata ante emergencias de salud durante los entrenamientos en todas las sedes de <strong>Crear Poder Sin Límites</strong>.
            </p>
          </div>

          <a 
            href="/documents/manual_practico_protocolo_emergencias_crear_global_actualizado.pdf" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              fontSize: '0.85rem', 
              padding: '0.6rem 1.2rem',
              fontWeight: 700,
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.2)'
            }}
          >
            <Download size={16} /> Descargar PDF Oficial
          </a>
        </div>

        {/* Principio Operativo Destacado */}
        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1.2rem', 
          borderRadius: '10px', 
          background: 'rgba(0,0,0,0.5)', 
          border: '1px solid rgba(251, 191, 36, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ 
            background: 'rgba(251, 191, 36, 0.15)', 
            padding: '0.8rem', 
            borderRadius: '50%', 
            color: 'var(--crear-gold)',
            flexShrink: 0
          }}>
            <Zap size={28} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.3rem 0', color: 'var(--crear-gold)', fontSize: '1.05rem', fontWeight: 800 }}>
              1. Principio Operativo Inviolable
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.5' }}>
              <strong>El entrenador no detiene ni abandona el entrenamiento.</strong> Mantiene la conducción del grupo y continúa la actividad. El <strong>coordinador o capitán designado</strong> asume el manejo exclusivo de la emergencia dentro del salón, organiza el perímetro, solicita apoyo y evacúa al paciente cuando sea seguro.
            </p>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación del Protocolo */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('procedimiento')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'procedimiento' ? 'var(--crear-gold)' : 'var(--bg-card)',
            color: activeTab === 'procedimiento' ? '#000' : 'var(--text-muted)',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s'
          }}
        >
          <Zap size={16} /> 7 Pasos de Actuación
        </button>

        <button 
          onClick={() => setActiveTab('cadena')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'cadena' ? 'var(--crear-gold)' : 'var(--bg-card)',
            color: activeTab === 'cadena' ? '#000' : 'var(--text-muted)',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s'
          }}
        >
          <Users size={16} /> Cadena de Mando
        </button>

        <button 
          onClick={() => setActiveTab('triage')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'triage' ? 'var(--crear-gold)' : 'var(--bg-card)',
            color: activeTab === 'triage' ? '#000' : 'var(--text-muted)',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s'
          }}
        >
          <HeartPulse size={16} /> Niveles de Triage
        </button>

        <button 
          onClick={() => setActiveTab('checklist')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'checklist' ? 'var(--crear-gold)' : 'var(--bg-card)',
            color: activeTab === 'checklist' ? '#000' : 'var(--text-muted)',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s'
          }}
        >
          <CheckSquare size={16} /> Checklist Pre-Entrenamiento ({checklistPct}%)
        </button>

        <button 
          onClick={() => setActiveTab('directorio')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'directorio' ? 'var(--crear-gold)' : 'var(--bg-card)',
            color: activeTab === 'directorio' ? '#000' : 'var(--text-muted)',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s'
          }}
        >
          <PhoneCall size={16} /> Directorio de Emergencias
        </button>
      </div>

      {/* TAB 1: PROCEDIMIENTO EN 7 PASOS */}
      {activeTab === 'procedimiento' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            {
              step: '1',
              title: 'Detectar y Avisar',
              role: 'Entrenador',
              color: '#3b82f6',
              desc: 'El entrenador identifica la situación en el salón y comunica de inmediato con serenidad y voz firme: "Emergencia en [fila/lugar], coordinador / capitán requerido".'
            },
            {
              step: '2',
              title: 'Asumir el Salón (Voz Única de Mando)',
              role: 'Coordinador / Capitán',
              color: '#a855f7',
              desc: 'El coordinador o capitán designado se desplaza inmediatamente, toma el control del espacio, asigna funciones específicas y evita que varias personas den órdenes simultáneas.'
            },
            {
              step: '3',
              title: 'Proteger y Acordonar',
              role: 'Coordinación y Capitanes',
              color: '#eab308',
              desc: 'Se controla el área, se crea un perímetro humano respetuoso, se despeja el oxígeno y se evita la exposición del paciente, así como cualquier grabación o distracción del grupo.'
            },
            {
              step: '4',
              title: 'Evaluar y Solicitar Apoyo Médico',
              role: 'Personal Capacitado / Brigadista',
              color: '#ec4899',
              desc: 'El coordinador solicita la presencia de enfermería o brigadistas certificados. La evaluación clínica, toma de signos y primeros auxilios corresponden exclusivamente a personal capacitado.'
            },
            {
              step: '5',
              title: 'Retirar al Paciente cuando Proceda',
              role: 'Coordinación y Brigada',
              color: '#10b981',
              desc: 'Si el paciente puede movilizarse de forma segura y el personal de salud lo indica, se le traslada a enfermería. IMPORTANTE: Ante sospecha de lesión en cabeza, cuello o columna, NO se moviliza salvo peligro inminente.'
            },
            {
              step: '6',
              title: 'Continuar el Entrenamiento',
              role: 'Entrenador',
              color: '#06b6d4',
              desc: 'Aislada la situación, el entrenador retoma el foco y mantiene al grupo informado de forma breve y tranquilizadora, protegiendo en todo momento la privacidad del participante.'
            },
            {
              step: '7',
              title: 'Trasladar, Registrar y Documentar',
              role: 'Logística y Dirección de Sede',
              color: '#ef4444',
              desc: 'El personal de salud define la necesidad de ambulancia. Logística facilita los accesos vehiculares, contacto con familiares, póliza de seguro, documentación y reporte formal en la plataforma.'
            }
          ].map((item) => (
            <div 
              key={item.step} 
              className="glass-panel hover-glow" 
              style={{ 
                padding: '1.25rem 1.5rem', 
                borderLeft: `5px solid ${item.color}`,
                display: 'flex',
                gap: '1.2rem',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '50%', 
                background: `${item.color}25`, 
                color: item.color, 
                border: `1px solid ${item.color}50`,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 800, 
                fontSize: '1.1rem',
                flexShrink: 0
              }}>
                {item.step}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.3rem' }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
                    {item.title}
                  </h3>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    background: `${item.color}20`, 
                    color: item.color,
                    border: `1px solid ${item.color}40`
                  }}>
                    Responsable: {item.role}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}

          {/* 5 Reglas de Seguridad */}
          <div className="glass-panel" style={{ marginTop: '1rem', padding: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
            <h3 style={{ color: '#ef4444', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <AlertOctagon size={20} /> 5 Reglas Inviolables de Seguridad
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#e2e8f0', fontSize: '0.9rem' }}>
              <li><strong>NO administrar medicamentos</strong> ni realizar maniobras clínicas invasivas sin certificación profesional.</li>
              <li><strong>NO levantar ni mover</strong> a una persona con posible trauma en cabeza, cuello o columna.</li>
              <li><strong>NO permitir aglomeraciones, grabaciones de video ni fotos</strong> sobre el estado del paciente.</li>
              <li><strong>NO emitir diagnósticos médicos ni prometer coberturas económicas</strong> en el momento.</li>
              <li><strong>ÚNICA voz de mando operativa:</strong> Todo el equipo sigue las órdenes del coordinador o capitán designado.</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 2: CADENA DE MANDO */}
      {activeTab === 'cadena' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.2rem' }}>
          {[
            {
              role: 'Entrenador',
              icon: <Zap size={22} color="var(--crear-gold)" />,
              borderColor: 'var(--crear-gold)',
              duties: [
                'Mantiene la conducción del entrenamiento y del grupo en todo momento.',
                'Informa de inmediato al coordinador señalando con precisión el lugar.',
                'NO abandona el salón para atender al paciente, salvo relevo autorizado.',
                'Mantiene la calma y da mensajes de tranquilidad al grupo.'
              ]
            },
            {
              role: 'Coordinador / Capitán de Salón',
              icon: <UserCheck size={22} color="#a855f7" />,
              borderColor: '#a855f7',
              duties: [
                'Es la máxima autoridad operativa ante la emergencia dentro del salón.',
                'Se acerca con serenidad, crea el perímetro y evita la aglomeración.',
                'Solicita de inmediato a la enfermera o brigadista calificado.',
                'Coordina la salida segura del paciente y se comunica con el entrenador.'
              ]
            },
            {
              role: 'Enfermería / Brigadista Capacitado',
              icon: <Stethoscope size={22} color="#10b981" />,
              borderColor: '#10b981',
              duties: [
                'Evalúa los signos vitales y brinda primeros auxilios certificados.',
                'Define junto al sistema de emergencias si se requiere ambulancia o traslado.',
                'Determina si el paciente puede ser movilizado de forma segura.',
                'Registra los datos clínicos y horas exactas de atención.'
              ]
            },
            {
              role: 'Logística / Sede',
              icon: <Building2 size={22} color="#06b6d4" />,
              borderColor: '#06b6d4',
              duties: [
                'Despeja los accesos y portones para el ingreso de ambulancias.',
                'Ubica la ficha de contacto de emergencia y se comunica con familiares.',
                'Gestiona la póliza de seguros y transporte autorizado de la sede.',
                'Genera la bitácora y reporte de incidentes en la plataforma.'
              ]
            },
            {
              role: 'Capitanes y Aliados',
              icon: <Users size={22} color="#f59e0b" />,
              borderColor: '#f59e0b',
              duties: [
                'Apoyan disciplinadamente al coordinador asignado.',
                'Despejan rutas de evacuación y contienen preguntas del grupo.',
                'Evitan emitir órdenes contradictorias o diagnósticos especulativos.',
                'Mantienen una sola línea de comunicación y apoyo.'
              ]
            }
          ].map(c => (
            <div key={c.role} className="glass-panel" style={{ padding: '1.5rem', borderTop: `4px solid ${c.borderColor}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                {c.icon}
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>{c.role}</h3>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.88rem', lineHeight: '1.4' }}>
                {c.duties.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: NIVELES DE TRIAGE */}
      {activeTab === 'triage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '6px solid #22c55e', background: 'rgba(34, 197, 94, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem' }}>🟢</span>
              <h3 style={{ margin: 0, color: '#22c55e', fontSize: '1.2rem', fontWeight: 800 }}>
                Nivel 1: Atención en Sede (Riesgo Leve)
              </h3>
            </div>
            <p style={{ color: 'var(--text-main)', margin: '0 0 0.8rem 0', fontSize: '0.92rem' }}>
              <strong>Casos:</strong> Malestar leve, fatiga, mareo pasajero, golpe menor o raspadura superficial.
            </p>
            <div style={{ padding: '0.8rem 1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.88rem' }}>
              <strong>Protocolo:</strong> Atención en sala de enfermería o área de descanso, hidratación y reposo. Requiere valoración y alta por parte del personal de salud de la sede.
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '6px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem' }}>🟡</span>
              <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.2rem', fontWeight: 800 }}>
                Nivel 2: Derivación Médica (Riesgo Moderado)
              </h3>
            </div>
            <p style={{ color: 'var(--text-main)', margin: '0 0 0.8rem 0', fontSize: '0.92rem' }}>
              <strong>Casos:</strong> Desmayo / síncope, probable fractura o esguince importante, herida profunda, golpe en la cabeza, dificultad respiratoria o dolor persistente.
            </p>
            <div style={{ padding: '0.8rem 1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.88rem' }}>
              <strong>Protocolo:</strong> Estabilizar al paciente sin movimientos bruscos, notificar a la coordinación y trasladar al centro médico de referencia con acompañamiento de logística y aviso al familiar.
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '6px solid #ef4444', background: 'rgba(239, 68, 68, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem' }}>🔴</span>
              <h3 style={{ margin: 0, color: '#ef4444', fontSize: '1.2rem', fontWeight: 800 }}>
                Nivel 3: Emergencia Crítica (Riesgo Vital Inmediato)
              </h3>
            </div>
            <p style={{ color: 'var(--text-main)', margin: '0 0 0.8rem 0', fontSize: '0.92rem' }}>
              <strong>Casos:</strong> Persona inconsciente que no responde, ausencia de respiración, sangrado masivo no contenido, convulsión prolongada, dolor torácico agudo o paro cardíaco.
            </p>
            <div style={{ padding: '0.8rem 1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <strong>Protocolo Inmediato:</strong> Llamada urgente al número de emergencia local (911 / 106 / 123), iniciar maniobras de RCP / DEA por personal certificado, despejar acceso vehicular de ambulancia y notificar a la Dirección de Crear.
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CHECKLIST PRE-ENTRENAMIENTO */}
      {activeTab === 'checklist' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.3rem 0', color: 'var(--crear-gold)', fontSize: '1.2rem', fontWeight: 800 }}>
                Lista de Verificación de Seguridad por Sede
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Obligatorio de verificar por la Coordinación y Gerencia antes del inicio de cada fin de semana.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: checklistPct === 100 ? '#22c55e' : 'var(--crear-gold)' }}>{checklistPct}%</span>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{checkedCount} de {checklistItems.length} verificados</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {checklistItems.map(item => {
              const isChecked = checklistState[item.key];
              return (
                <div 
                  key={item.key}
                  onClick={() => toggleCheck(item.key)}
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: '10px',
                    background: isChecked ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: isChecked ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ marginTop: '2px', color: isChecked ? '#22c55e' : 'var(--text-muted)' }}>
                    {isChecked ? <CheckCircle2 size={22} /> : <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '2px solid var(--text-muted)' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.2rem 0', color: isChecked ? '#fff' : 'var(--text-heading)', fontSize: '0.95rem' }}>
                      {item.title}
                    </h4>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button 
              onClick={() => setChecklistState({ responsable: true, telefono: true, botiquin: true, ruta: true, centroMedico: true, brigadistas: true, reporte: true })}
              className="btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              Marcar Todo Verificado
            </button>
            <button 
              onClick={() => setChecklistState({ responsable: false, telefono: false, botiquin: false, ruta: false, centroMedico: false, brigadistas: false, reporte: false })}
              className="btn-secondary"
              style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}
            >
              Reiniciar
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: DIRECTORIO OFICIAL DE EMERGENCIAS */}
      {activeTab === 'directorio' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {sedesEmergencia.map(s => (
            <div key={s.sede} className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FlagIcon country={s.pais} sede={s.sede} size={22} />
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>{s.sede} ({s.pais})</h3>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.direccion}</span>
              </div>
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '0.8rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Central de Emergencia</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ef4444' }}>{s.numero}</div>
                <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>{s.servicio}</div>
              </div>
              <a 
                href={`tel:${s.numero.split('/')[0].trim()}`}
                className="btn-primary"
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', padding: '0.6rem', fontSize: '0.85rem' }}
              >
                <PhoneCall size={16} /> Llamar Inmediatamente
              </a>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
