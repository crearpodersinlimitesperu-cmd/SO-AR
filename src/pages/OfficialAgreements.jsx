import React, { useState } from 'react';
import { Mail, CheckCircle2, FileText, Lock, Plus, Search, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function OfficialAgreements() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const agreements = [
    { id: 1, title: 'Aprobación Presupuesto E29', author: 'Gerencia General', date: '2026-08-20', status: 'Aprobado Formal', category: 'Finanzas' },
    { id: 2, title: 'Cambio de Hotel Sede Medellín', author: 'Logística', date: '2026-08-21', status: 'Pendiente Firma', category: 'Operaciones' },
    { id: 3, title: 'Validación de Entrenadores C1', author: 'Dirección', date: '2026-08-22', status: 'Aprobado Formal', category: 'Recursos' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#a855f7' }}>
            <Mail size={32} color="#a855f7" />
            Acuerdos y Trazabilidad (Oficial)
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
            Lo que no está aquí, no existe. (Sustituto de Correo Interno)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)' }}
          >
            <Plus size={20} /> Nuevo Acuerdo
          </button>
          <button 
            onClick={() => navigate('/home')} 
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            <ArrowLeft size={18} /> Volver al Home
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Search color="#6b7280" />
        <input 
          type="text"
          placeholder="Buscar por título, autor o categoría..."
          style={{ background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none', fontSize: '1rem' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {agreements.map(agr => (
          <div key={agr.id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', position: 'relative', overflow: 'hidden', transition: 'transform 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0.05 }}>
              <Lock size={64} color="#a855f7" />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', position: 'relative', zIndex: 10 }}>
              <span style={{ padding: '4px 10px', background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.4)', color: '#d8b4fe', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '20px' }}>
                {agr.category}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280' }}>{agr.date}</span>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.5rem', position: 'relative', zIndex: 10, lineHeight: 1.3 }}>{agr.title}</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', position: 'relative', zIndex: 10 }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#fff' }}>
                {agr.author.charAt(0)}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#9ca3af' }}>{agr.author}</span>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {agr.status.includes('Aprobado') ? (
                  <CheckCircle2 color="#10b981" size={16} />
                ) : (
                  <FileText color="#f59e0b" size={16} />
                )}
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: agr.status.includes('Aprobado') ? '#34d399' : '#fbbf24' }}>
                  {agr.status}
                </span>
              </div>
              <button style={{ background: 'transparent', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', color: '#a855f7', cursor: 'pointer', textTransform: 'uppercase' }}>
                Ver Documento
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
