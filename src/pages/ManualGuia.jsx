import React from 'react';
import { BookOpen, FileText, CheckCircle, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ManualGuia() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button 
        onClick={() => navigate('/')} 
        className="btn-secondary" 
        style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <ArrowLeft size={16} /> Volver al Inicio
      </button>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h1 className="text-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <BookOpen size={28} /> Manual Guía Oficial - SO-AR
        </h1>
        
        <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
          Bienvenido a la plataforma SO-AR del ecosistema CREAR Poder Sin Límites. Esta guía rápida te ayudará a entender cómo navegar por tu perfil y cumplir con tus responsabilidades.
        </p>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid var(--crear-blue)' }}>
            <h3 style={{ color: 'var(--crear-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
              <FileText size={20} /> 1. Entendiendo tu Rol
            </h3>
            <p className="text-main">
              Tu acceso a la plataforma está dictado por tu rol en CREAR. Dependiendo de si eres QT, Staff, Entrenador, Gerente o Director, verás únicamente los eventos, ciclos y herramientas que corresponden a tus funciones específicas.
            </p>
          </div>

          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid var(--crear-gold)' }}>
            <h3 className="text-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
              <CheckCircle size={20} /> 2. Gestión de Tareas (Checklist)
            </h3>
            <p className="text-main">
              El corazón de SO-AR es el Checklist Inteligente. Aquí podrás:
            </p>
            <ul className="text-muted" style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Ver tareas asignadas automáticamente según tu rol y la Etapa del Ciclo.</li>
              <li>Reclamar tareas globales para hacerte responsable de ellas.</li>
              <li>Invitar a otros colaboradores para trabajar en conjunto.</li>
              <li>Subir evidencias fotográficas (links) para que Gerencia pueda validar tu progreso.</li>
            </ul>
          </div>

          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
            <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
              <ShieldAlert size={20} /> 3. Fechas Límite y Notificaciones
            </h3>
            <p className="text-main">
              El sistema calcula los tiempos límite en cuenta regresiva automáticamente (ej. T-30, T-21, C1). Si pasas más de 72 horas sin ingresar al sistema, Gerencia recibirá una alerta automática. Mantente siempre al día revisando tus Notificaciones (icono de campana superior).
            </p>
          </div>
        </div>

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <p className="text-muted">
            ¿Encontraste un problema o tienes sugerencias de mejora para SO-AR?
          </p>
          <a 
            href="mailto:sistemas@crearpsl.net?subject=Sugerencias%20Plataforma%20SO-AR"
            className="btn-primary"
            style={{ display: 'inline-block', textDecoration: 'none', padding: '0.75rem 1.5rem', marginTop: '1rem' }}
          >
            Enviar Feedback a Sistemas
          </a>
        </div>
      </div>
    </div>
  );
}
