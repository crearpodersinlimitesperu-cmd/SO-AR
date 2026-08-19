import React from 'react';
import { BookOpen, FileText, CheckCircle, ShieldAlert, ArrowLeft, Users, UserCheck, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canChangeManagerStatus, canViewAllManagers, canViewSede, canAssignTrainer } from '../config/permissions';

export default function ManualGuia() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const isEntrenadorLlamadas = currentUser?.appRole === 'entrenador_llamadas' || (currentUser?.roles || []).includes('entrenador_llamadas');
  const canChangeStatus = canChangeManagerStatus(currentUser);
  const canViewAll = canViewAllManagers(currentUser);
  const canViewOwnSede = canViewSede(currentUser);
  const canAssign = canAssignTrainer(currentUser);

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
          <BookOpen size={28} /> Manual Guía Oficial - CREAR PSL
        </h1>
        
        <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
          Bienvenido a la plataforma de gestión del ecosistema CREAR Poder Sin Límites. Esta guía está personalizada para tu rol: <strong>{currentUser?.appRole?.toUpperCase().replace('_', ' ')}</strong>.
        </p>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          
          {/* SECCIÓN GENERAL (PARA TODOS) */}
          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid var(--crear-blue)' }}>
            <h3 style={{ color: 'var(--crear-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
              <FileText size={20} /> 1. Entendiendo tu Rol en el Sistema
            </h3>
            <p className="text-main">
              Tu acceso a la plataforma está dictado por tu rol oficial en CREAR. Dependiendo de tu función (QT, Staff, Entrenador, Coordinador o Director), verás únicamente los módulos, sedes y herramientas que corresponden a tus responsabilidades.
            </p>
          </div>

          {/* SECCIÓN ENTRENADOR DE LLAMADAS */}
          {isEntrenadorLlamadas && (
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
              <h3 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
                <UserCheck size={20} /> Guía para Entrenadores de Llamadas
              </h3>
              <p className="text-main">Como entrenador responsable de llamadas, debes gestionar el seguimiento de tus managers asignados en el <strong>Centro de Managers</strong>:</p>
              <ul className="text-muted" style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li><strong>Visibilidad:</strong> Solo podrás ver a los managers que el Coordinador o Director te hayan asignado específicamente.</li>
                <li><strong>Registro Individual:</strong> Usa los botones de <strong>SÍ / NO</strong> en la tabla para marcar rápidamente si el manager asistió a la llamada programada y la fecha.</li>
                <li><strong>Llamadas Grupales:</strong> En la pestaña <em>"Grupales"</em> verás los equipos donde todos los managers están a tu cargo. Al registrar una llamada grupal, puedes desmarcar individualmente a los que no asistieron.</li>
                <li><strong>Cambio de Estado:</strong> No puedes cambiar si un manager se gradúa o deserta. Si necesitas cambiar un estado, comunícate con tu Coordinador de Maestría.</li>
              </ul>
            </div>
          )}

          {/* SECCIÓN COORDINADOR DE MAESTRÍA */}
          {(canViewOwnSede || canChangeStatus || canAssign) && !canViewAll && (
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
              <h3 style={{ color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
                <Users size={20} /> Guía para Coordinadores de Maestría
              </h3>
              <p className="text-main">Como Coordinador de Maestría de tu sede, tienes permisos elevados sobre los managers de tu ciudad:</p>
              <ul className="text-muted" style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li><strong>Visibilidad de Sede:</strong> Tienes acceso a todos los managers de tu sede, independientemente del entrenador que tengan asignado.</li>
                <li><strong>Asignación de Entrenadores:</strong> Eres el responsable de asignar qué entrenador atenderá a cada manager de tu sede.</li>
                <li><strong>Gestión de Estados:</strong> Solo tú y el Director de Maestría pueden cambiar el estado de un manager a <strong>Graduado</strong> o <strong>Desertor</strong>.</li>
                <li><strong>Agregar Managers:</strong> Puedes registrar nuevos managers manualmente en el sistema para tu sede usando el botón "Nuevo Manager".</li>
              </ul>
            </div>
          )}

          {/* SECCIÓN DIRECCIÓN DE MAESTRÍA Y SUPER ADMIN */}
          {canViewAll && (
             <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
             <h3 style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
               <ShieldAlert size={20} /> Guía para Dirección de Maestría
             </h3>
             <p className="text-main">Como Director de Maestría o SuperAdmin, tienes acceso global y control total sobre el programa a nivel internacional:</p>
             <ul className="text-muted" style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
               <li><strong>Visibilidad Global:</strong> Puedes ver las métricas, equipos y managers de <strong>todas las sedes</strong> y de todos los entrenadores.</li>
               <li><strong>Control Total:</strong> Puedes asignar entrenadores, cambiar estados a Graduado/Desertor, y agregar managers en cualquier sede.</li>
               <li><strong>Auditoría:</strong> Utiliza el panel superior para monitorear el progreso global de la retención y deserción de managers.</li>
             </ul>
           </div>
          )}

          {/* CHECKLIST BASE */}
          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid var(--crear-gold)' }}>
            <h3 className="text-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
              <CheckCircle size={20} /> Gestión Operativa (Checklists y KPIs)
            </h3>
            <p className="text-main">
              El corazón operativo de SO-AR es el Checklist Inteligente. Aquí podrás:
            </p>
            <ul className="text-muted" style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Ver tareas asignadas automáticamente según tu rol y la Etapa del Ciclo.</li>
              <li>Reclamar tareas globales para hacerte responsable de ellas.</li>
              <li>Subir evidencias fotográficas (links) para que Gerencia pueda validar tu progreso.</li>
            </ul>
          </div>
          
        </div>

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <p className="text-muted">
            ¿Encontraste un problema o tienes sugerencias de mejora?
          </p>
          <a 
            href="mailto:sistemas@crearpsl.net?subject=Soporte%20Plataforma%20CREAR"
            className="btn-primary"
            style={{ display: 'inline-block', textDecoration: 'none', padding: '0.75rem 1.5rem', marginTop: '1rem' }}
          >
            Contactar a Sistemas
          </a>
        </div>
      </div>
    </div>
  );
}
