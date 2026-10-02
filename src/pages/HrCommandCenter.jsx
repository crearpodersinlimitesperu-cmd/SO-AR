import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChecklistBoard from './ChecklistBoard';
import { 
  Users, Activity, ShieldCheck, FileSignature, 
  ChevronLeft, Briefcase, UserCheck, CheckSquare, Sparkles
} from 'lucide-react';

export default function HrCommandCenter() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'overview'

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f17', color: '#f8fafc', fontFamily: 'var(--font-body)', paddingBottom: '4rem' }}>
      
      {/* HEADER CORPORATIVO */}
      <div style={{ background: '#0f172a', padding: '1.5rem 3rem', borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => navigate('/home')} 
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '8px' }}
              title="Volver al inicio"
            >
              <ChevronLeft size={22} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Briefcase size={26} color="var(--crear-gold, #f59e0b)" /> Talento Humano Global
                <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--crear-gold, #f59e0b)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '4px 10px', borderRadius: '12px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Gestión Operativa
                </span>
              </h1>
              <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                Responsable: <strong style={{ color: '#e2e8f0' }}>{currentUser?.name || 'Talento Humano'}</strong> · Sede: <strong style={{ color: '#e2e8f0' }}>{currentUser?.sede || 'Global'}</strong>
              </p>
            </div>
          </div>

          {/* ACCESOS DIRECTOS */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/admin')}
              style={{
                background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa', padding: '0.6rem 1rem', borderRadius: '8px',
                fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
              }}
            >
              <Users size={16} /> Directorio y Colaboradores
            </button>
            <button
              onClick={() => navigate('/legal-audit')}
              style={{
                background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399', padding: '0.6rem 1rem', borderRadius: '8px',
                fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
              }}
            >
              <FileSignature size={16} /> Firmas & Legal
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 3rem' }}>
        
        {/* TABS DE VISTA */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('tasks')}
            style={{
              background: activeTab === 'tasks' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              border: activeTab === 'tasks' ? '1px solid var(--crear-gold)' : '1px solid transparent',
              color: activeTab === 'tasks' ? 'var(--crear-gold)' : '#94a3b8',
              padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.9rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <CheckSquare size={18} /> Tablero de Tareas y Checklists
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              background: activeTab === 'overview' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              border: activeTab === 'overview' ? '1px solid var(--crear-gold)' : '1px solid transparent',
              color: activeTab === 'overview' ? 'var(--crear-gold)' : '#94a3b8',
              padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.9rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <UserCheck size={18} /> Resumen de Roles y Protocolos
          </button>
        </div>

        {/* TAB 1: TAREAS (CHECKLIST BOARD OPERATIVO) */}
        {activeTab === 'tasks' && (
          <div style={{ background: '#111827', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckSquare size={20} color="var(--crear-gold)" /> Asignación y Cumplimiento de Tareas de Staff
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Gestiona las tareas asignadas al personal de cada sede, ciclos de entrega y estatus en tiempo real.
                </p>
              </div>
            </div>
            <ChecklistBoard />
          </div>
        )}

        {/* TAB 2: RESUMEN DE ROLES Y PROTOCOLOS */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: '#111827', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1rem 0' }}>
                <ShieldCheck size={20} color="#10b981" /> Control de Altas y Bajas
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                El registro y desvinculación de personal se gestiona de forma centralizada con acceso restringido exclusivo para Dirección y Talento Humano.
              </p>
              <div style={{ marginTop: '1.2rem' }}>
                <button
                  onClick={() => navigate('/admin')}
                  style={{
                    width: '100%', padding: '0.75rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  Abrir Panel de Colaboradores →
                </button>
              </div>
            </div>

            <div style={{ background: '#111827', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1rem 0' }}>
                <FileSignature size={20} color="var(--crear-gold)" /> Documentación y Acuerdos
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                Monitoreo continuo de firmas de acuerdos de confidencialidad (NDA), contratos de prestación de servicios y regularización de expedientes.
              </p>
              <div style={{ marginTop: '1.2rem' }}>
                <button
                  onClick={() => navigate('/legal-audit')}
                  style={{
                    width: '100%', padding: '0.75rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  Ver Auditoría de Firmas Digitales →
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
