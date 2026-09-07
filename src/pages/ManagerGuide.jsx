import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Link as LinkIcon, Database, BarChart2, HelpCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ManagerGuide() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--text-color)' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--crear-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', fontSize: '2rem' }}>
          <BookOpen size={32} />
          Domina el Nuevo Sistema de Gestión de Managers
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>
          Todo lo que necesitas saber para registrar, asignar y dar seguimiento a los Managers de Maestría del Juego y sus llamadas de entrenamiento.
        </p>
      </header>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem', background: 'rgba(41, 171, 226, 0.05)', border: '1px solid rgba(41, 171, 226, 0.2)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, color: '#29abe2' }}>
          <Database size={24} />
          Sección 1: El Nuevo Estándar Operativo ⚙️
        </h2>
        <p style={{ lineHeight: '1.6' }}>
          A partir de hoy, la gestión de Managers se centraliza. Ya no utilizamos formatos externos ni registros aislados. La sinergia entre <strong>Nodus</strong> (nuestra matriz de datos) y <strong>Causa OS</strong> (nuestro centro operativo) te dará visibilidad instantánea sobre la salud de tu equipo de Managers.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
          <LinkIcon size={24} />
          Sección 2: Paso a Paso — ¿Cómo ingresar a Nodus? 🔑
        </h2>
        <ol style={{ lineHeight: '1.8', margin: 0, paddingLeft: '1.5rem' }}>
          <li><strong>Acceso al Portal:</strong> Ingresa al enlace oficial de tu matriz Nodus (Google Sheets / Portal CRM) correspondiente a tu sede.</li>
          <li><strong>Autenticación:</strong> Asegúrate de estar utilizando tu correo corporativo o cuenta autorizada de CREAR.</li>
          <li><strong>Ubicación:</strong> Dirígete a la pestaña o módulo designado como <strong>"Gestión de Managers"</strong> o <strong>"Llamadas Maestría"</strong>.</li>
        </ol>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, color: 'var(--crear-gold)' }}>
          <BarChart2 size={24} />
          Sección 3: Creación y Seguimiento de Managers 📊
        </h2>
        <p style={{ marginBottom: '1rem' }}>Sigue este proceso riguroso para cada nuevo Manager y sesión de entrenamiento:</p>
        
        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Paso 1: Alta del Manager</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Registra el nombre completo, equipo y fecha de inicio del Manager en la matriz de Nodus.</p>
        </div>

        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Paso 2: Asignación de Entrenador</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>En la misma fila, selecciona en el menú desplegable el "Entrenador Asignado" que se encargará del seguimiento de llamadas.</p>
        </div>

        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Paso 3: Registro de Llamadas (Gestiones)</h3>
          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)' }}>Cada vez que el Entrenador realice la llamada de seguimiento, debe registrarse en Nodus (fecha, estatus de la llamada y observaciones).</p>
          <div style={{ padding: '0.5rem 0.8rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid #ef4444', color: '#ef4444', fontSize: '0.9rem' }}>
            <strong>Nota Crítica:</strong> Solo las llamadas registradas formalmente aquí impactarán el porcentaje de cumplimiento y los OKRs en tu tablero de Causa OS.
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', background: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, color: 'var(--crear-gold)' }}>
          <ArrowRight size={24} />
          Sección 4: Visualización en Causa OS 👁️‍🗨️
        </h2>
        <p style={{ marginBottom: '1rem' }}>Tus registros en Nodus viajarán automáticamente a la plataforma.</p>
        <ol style={{ lineHeight: '1.8', margin: 0, paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Inicia sesión en Causa OS.</li>
          <li>Dirígete a tu Tablero de Estrategia y OKRs.</li>
          <li>Revisa en tiempo real la sumatoria de "Gestiones Realizadas", el índice de contactabilidad y la salud de las llamadas de los Managers.</li>
        </ol>
        <button 
          onClick={() => navigate('/estrategia')}
          style={{ padding: '0.8rem 1.5rem', background: 'var(--crear-gold)', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          Ir al Tablero de Estrategia <ArrowRight size={18} />
        </button>
      </div>

      <footer style={{ textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <HelpCircle size={16} /> ¿Tienes problemas para acceder a Nodus? Consulta a tu administrador de sede.
        </p>
        <h3 style={{ margin: '1rem 0 0 0', color: '#fff', fontSize: '1rem', letterSpacing: '2px' }}>CREAR PODER SIN LÍMITES</h3>
      </footer>
    </div>
  );
}
