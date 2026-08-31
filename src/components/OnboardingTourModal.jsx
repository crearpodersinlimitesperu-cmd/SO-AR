import { useState } from 'react';
import { 
  Compass, CheckCircle2, X, AlertTriangle, ArrowRight, ArrowLeft, 
  Sparkles, Zap, ShieldAlert, Sliders, CheckSquare, PhoneCall, HelpCircle,
  Eye, Lock, Layers
} from 'lucide-react';
import { useUI } from '../context/UIContext';

export default function OnboardingTourModal({ isOpen, onClose, user }) {
  const { setViewMode } = useUI();
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      id: 'bienvenida',
      badge: '👋 BIENVENIDO AL SISTEMA',
      badgeColor: 'var(--crear-gold)',
      title: 'Tu Centro Operativo de Liderazgo (Causa OS)',
      subtitle: 'Crear Poder Sin Límites • Excelencia y Trazabilidad Operativa',
      icon: <Sparkles size={36} color="var(--crear-gold)" />,
      description: 'Causa OS es la plataforma corporativa diseñada para acompañarte en tu labor diaria, garantizando que cada entrenamiento, sede y equipo opere con máxima sincronía y cero pérdida de información.',
      canDo: [
        'Gestionar tus responsabilidades operativas diarias y semanales.',
        'Ver el calendario de eventos y fechas clave de tu sede.',
        'Consultar métricas y avance de equipo en tiempo real.'
      ],
      cannotDo: [
        'No debes compartir tus credenciales de acceso con terceras personas.',
        'No dejes tareas marcadas sin haber completado la acción requerida.'
      ],
      tip: 'La plataforma guarda todo automáticamente en la nube de Google Cloud Firestore.'
    },
    {
      id: 'vistas',
      badge: '🎯 SIMPLICIDAD Y ENFOQUE',
      badgeColor: '#38bdf8',
      title: 'Elige tu Modo de Vista Ideal (Lite, Compacto o Pro)',
      subtitle: 'Evita la sobrecarga de botones según tu preferencia',
      icon: <Sliders size={36} color="#38bdf8" />,
      description: 'Para que no te compliques con demasiadas opciones en pantalla, puedes cambiar la vista en cualquier momento desde el selector superior:',
      modes: [
        { name: '🌱 Modo Lite', desc: 'Solo lo esencial: tu checklist diario, metas y accesos directos principales. Cero distracciones.' },
        { name: '⚖️ Modo Compacto', desc: 'Equilibrio perfecto: tareas, calendario local y menú desplegable ordenado de herramientas.' },
        { name: '⚡ Modo Pro', desc: 'Visibilidad total: todas las herramientas, métricas globales y barra de personalización activa.' }
      ],
      canDo: [
        'Cambiar de vista cuantas veces quieras según tu comodidad.',
        'Ocultar o mostrar módulos específicos en el modo Pro.'
      ],
      cannotDo: [
        'No te preocupes por perder funciones: todas las herramientas siguen accesibles en el menú desplegable "Más Módulos".'
      ],
      tip: 'Si es tu primera vez, te recomendamos empezar con el Modo Lite o Compacto.'
    },
    {
      id: 'checklist',
      badge: '📋 MATRIZ DE RESPONSABILIDADES',
      badgeColor: '#22c55e',
      title: 'Tu Checklist Operativo y Seguimiento',
      subtitle: 'La guía exacta de lo que debes realizar cada semana',
      icon: <CheckSquare size={36} color="#22c55e" />,
      description: 'El botón principal "📋 Abrir Mi Checklist" te lleva a tu matriz de tareas. Las tareas se dividen en Tareas Base (de tu rol) y Tareas Asignadas específicamente para ti.',
      canDo: [
        'Marcar como completada cada tarea haciendo clic en su casilla.',
        'Subir enlaces de evidencia (Google Drive, fotos, actas) si la tarea lo requiere.',
        'Colaborar y compartir avance con compañeros de equipo.'
      ],
      cannotDo: [
        'No modifiques ni borres tareas base institucionales asignadas por Dirección.',
        'No acumules tareas vencidas; el sistema alerta inactividad superior a 72 horas.'
      ],
      tip: 'Revisa tu checklist a primera hora del día para planificar tus prioridades.'
    },
    {
      id: 'tareas_rapidas',
      badge: '⚡ ACCIÓN INMEDIATA',
      badgeColor: 'var(--crear-gold)',
      title: 'Botón "+ Tarea" & Asignación Rápida',
      subtitle: 'Crea compromisos operativos en segundos',
      icon: <Zap size={36} color="var(--crear-gold)" />,
      description: 'Ubicado en la barra superior, el botón verde brillante "+ TAREA" te permite crear compromisos ágiles para ti o para miembros de tu equipo.',
      canDo: [
        'Crear recordatorios operativos puntuales.',
        'Asignar fecha límite y prioridad (Normal, Alta, Urgente).',
        'Vincular la tarea a una sede o rol específico.'
      ],
      cannotDo: [
        'No uses "+ Tarea" para sustituir las tareas maestras ya programadas en el sistema.',
        'No asignes tareas a roles fuera de tu alcance de coordinación.'
      ],
      tip: 'Las tareas asignadas generan notificaciones directas al colaborador.'
    },
    {
      id: 'protocolo',
      badge: '🚨 SEGURIDAD INVIOLABLE',
      badgeColor: '#ef4444',
      title: 'Protocolo Global de Emergencias Médicas',
      subtitle: 'Los 7 Pasos de Oro y Actuación Inmediata en Salón',
      icon: <ShieldAlert size={36} color="#ef4444" />,
      description: 'La seguridad de los participantes y el equipo es la prioridad #1 de Crear Poder Sin Límites. Tienes acceso al módulo interactivo del protocolo desde el menú y el centro de ayuda.',
      canDo: [
        'Consultar los 7 pasos de actuación y la cadena de mando.',
        'Verificar el checklist de seguridad de la sede antes de abrir puertas.',
        'Llamar de emergencia con 1 clic a los números locales (911 / 106 / 123).'
      ],
      cannotDo: [
        '⛔ REGLA DE ORO: El entrenador NUNCA abandona el salón para atender una emergencia.',
        '⛔ CERO MEDICAMENTOS: No administrar fármacos sin prescripción médica oficial.',
        '⛔ CERO FOTOS/VIDEOS: Prohibido grabar o divulgar el estado de salud del paciente.'
      ],
      tip: 'Solo el Coordinador o Capitán designado asume la ÚNICA voz de mando en una emergencia.'
    },
    {
      id: 'comunicacion',
      badge: '💬 COMUNICACIÓN ÁGIL',
      badgeColor: '#25D366',
      title: 'Enlaces Directos a WhatsApp en Todo el Sistema',
      subtitle: 'Contacto instantáneo con prefijos internacionales automáticos',
      icon: <PhoneCall size={36} color="#25D366" />,
      description: 'Todos los números de teléfono en perfiles, directorios y tarjetas de equipo son enlaces directos e inteligentes a WhatsApp.',
      canDo: [
        'Hacer clic en el teléfono de cualquier colaborador para chatear de inmediato.',
        'El sistema formatea automáticamente el código de país (+51 Perú, +593 Ecuador, +57 Colombia, +52 México).'
      ],
      cannotDo: [
        'No utilices los canales directos para fines ajenos a la operación y valores de CREAR.'
      ],
      tip: 'Verás un distintivo verde "💬 WhatsApp" junto a cada teléfono verificado.'
    },
    {
      id: 'ayuda',
      badge: '🆘 SOPORTE Y MANUALES',
      badgeColor: 'var(--crear-cyan)',
      title: 'Centro de Ayuda y Botón Flotante (?)',
      subtitle: 'Asistencia y documentación siempre al alcance de tu mano',
      icon: <HelpCircle size={36} color="var(--crear-cyan)" />,
      description: 'En la esquina inferior derecha encontrarás siempre el botón flotante dorado de Ayuda (?). Ábrelo cuando tengas cualquier duda operativa.',
      canDo: [
        'Consultar el Manual y Guía detallado por rol.',
        'Enviar sugerencias o reportes técnicos al equipo de Sistemas (sistemas@crearpsl.net).',
        'Volver a abrir este Tour Guiado cuando lo desees.'
      ],
      cannotDo: [
        'No te quedes con dudas operativas; recurre a tu Coordinador o al Centro de Ayuda.'
      ],
      tip: '¡Has completado el recorrido introductorio con éxito!'
    }
  ];

  const step = tourSteps[currentStep];

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    if (user?.email) {
      try {
        localStorage.setItem(`cpsl_onboarding_completed_${user.email.toLowerCase().trim()}`, 'true');
      } catch (e) {}
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1rem'
    }}>
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          border: `2px solid ${step.badgeColor}`,
          boxShadow: `0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px ${step.badgeColor}33`,
          background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.98) 0%, rgba(10, 10, 15, 0.98) 100%)',
          overflow: 'hidden',
          animation: 'fadeIn 0.25s ease'
        }}
      >
        {/* Cabecera del Tour */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{
              background: `${step.badgeColor}22`,
              color: step.badgeColor,
              border: `1px solid ${step.badgeColor}55`,
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.5px'
            }}>
              {step.badge}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              Paso {currentStep + 1} de {tourSteps.length}
            </span>
          </div>

          <button
            onClick={handleFinish}
            className="btn-secondary"
            style={{
              padding: '4px 10px',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              borderRadius: '6px'
            }}
            title="Omitir guía interactiva"
          >
            <span>Omitir Guía</span>
            <X size={14} />
          </button>
        </div>

        {/* Cuerpo del Paso */}
        <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{
              background: `${step.badgeColor}15`,
              border: `1px solid ${step.badgeColor}40`,
              borderRadius: '12px',
              padding: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {step.icon}
            </div>
            <div>
              <h2 style={{ margin: '0 0 0.25rem 0', color: '#ffffff', fontSize: '1.35rem', fontWeight: 800 }}>
                {step.title}
              </h2>
              <p style={{ margin: 0, color: step.badgeColor, fontSize: '0.88rem', fontWeight: 600 }}>
                {step.subtitle}
              </p>
            </div>
          </div>

          <p style={{ color: 'var(--text-body)', fontSize: '0.92rem', lineHeight: '1.55', margin: '0 0 1.25rem 0' }}>
            {step.description}
          </p>

          {/* Si tiene modos de vista */}
          {step.modes && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
              {step.modes.map((m, i) => (
                <div key={i} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <strong style={{ color: '#fff', fontSize: '0.9rem', display: 'block', marginBottom: '0.2rem' }}>{m.name}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: '1.4' }}>{m.desc}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tarjeta doble: Qué puedes hacer vs Qué NO puedes hacer */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem', marginBottom: '1.25rem' }}>
            {/* Qué puedes hacer */}
            <div style={{
              padding: '1rem',
              borderRadius: '10px',
              background: 'rgba(34, 197, 94, 0.06)',
              border: '1px solid rgba(34, 197, 94, 0.25)'
            }}>
              <h4 style={{ margin: '0 0 0.6rem 0', color: '#22c55e', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
                <CheckCircle2 size={16} /> ¿QUÉ PUEDES HACER?
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: '#e2e8f0', fontSize: '0.82rem', lineHeight: '1.45' }}>
                {step.canDo.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            </div>

            {/* Qué NO puedes hacer */}
            <div style={{
              padding: '1rem',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.25)'
            }}>
              <h4 style={{ margin: '0 0 0.6rem 0', color: '#ef4444', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
                <AlertTriangle size={16} /> ¿QUÉ NO DEBES HACER?
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: '#e2e8f0', fontSize: '0.82rem', lineHeight: '1.45' }}>
                {step.cannotDo.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            </div>
          </div>

          {/* Consejo de Oro */}
          {step.tip && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(255, 183, 3, 0.08)',
              border: '1px solid rgba(255, 183, 3, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <span style={{ fontSize: '1.1rem' }}>💡</span>
              <span style={{ fontSize: '0.82rem', color: '#fde68a', lineHeight: '1.4' }}>
                <strong>Consejo Clave:</strong> {step.tip}
              </span>
            </div>
          )}
        </div>

        {/* Footer con Controles de Navegación */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.2)',
          flexWrap: 'wrap',
          gap: '0.8rem'
        }}>
          {/* Indicadores de Progreso (Dots) */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            {tourSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                style={{
                  width: currentStep === i ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: currentStep === i ? step.badgeColor : 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.25s ease'
                }}
                title={`Ir al paso ${i + 1}`}
              />
            ))}
          </div>

          {/* Botones Anterior y Siguiente */}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="btn-secondary"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <ArrowLeft size={16} /> Anterior
              </button>
            )}

            <button
              onClick={handleNext}
              className="btn-primary"
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: currentStep === tourSteps.length - 1 ? 'var(--crear-gold)' : undefined,
                color: currentStep === tourSteps.length - 1 ? '#000' : undefined
              }}
            >
              <span>{currentStep === tourSteps.length - 1 ? '🎉 ¡Comenzar Ahora!' : 'Siguiente'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
