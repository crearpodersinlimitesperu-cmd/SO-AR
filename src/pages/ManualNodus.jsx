import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Database, Search, ShieldCheck, Users, 
  BarChart3, Settings, TrendingUp, CheckCircle, Zap,
  FolderSync, UserCheck, Key, FileText, Anchor, Activity, Server,
  MousePointer2, ExternalLink
} from 'lucide-react';

const NODUS_KNOWLEDGE_BASE = [
  {
    id: 'n1',
    role: 'directores',
    title: 'Aprobar Presupuestos y Gastos',
    description: 'Ruta exacta para aprobar las solicitudes de gastos semanales de las sedes.',
    steps: [
      'Ingresa a imo.crearpslglobal.com/auth/login e inicia sesión.',
      'En el menú lateral izquierdo, haz clic en el módulo "Finanzas".',
      'Selecciona el submenú "Aprobaciones".',
      'Usa el filtro superior derecho para seleccionar la Sede (ej: "Lima").',
      'Haz clic en el botón azul "Ver Detalles" junto al gasto.',
      'En la ventana emergente, verifica el monto y haz clic en el botón verde "Aprobar" en la esquina inferior derecha.'
    ],
    tags: ['finanzas', 'gastos', 'aprobar', 'presupuesto']
  },
  {
    id: 'n2',
    role: 'gerentes',
    title: 'Visualizar Asistencias y Alertas (Tablero Principal)',
    description: 'Dónde encontrar el resumen de asistencia y deserciones del fin de semana.',
    steps: [
      'Ingresa a imo.crearpslglobal.com/auth/login.',
      'Al entrar, estarás en el "Dashboard Principal".',
      'Desplázate hacia abajo hasta la sección "Alertas de Deserción".',
      'Haz clic en la pestaña "Asistencia C1" o "Asistencia C2" según el ciclo activo.',
      'El sistema mostrará en rojo los participantes que no han registrado su Check-In.'
    ],
    tags: ['asistencia', 'alertas', 'desercion', 'dashboard']
  },
  {
    id: 'n3',
    role: 'gerentes',
    title: 'Cargar Matrículas y Tickets Verdes',
    description: 'Procedimiento para registrar el pago de un participante y liberar su Ticket Verde.',
    steps: [
      'En el menú lateral izquierdo, selecciona "Participantes".',
      'Usa la barra de búsqueda superior para ingresar el DNI o Nombre del participante.',
      'Haz clic en el icono de "Lápiz" (Editar) junto al nombre.',
      'Ve a la pestaña "Pagos y Finanzas".',
      'En la sección de pagos, haz clic en "+ Añadir Transacción".',
      'Ingresa el monto, método de pago y haz clic en "Guardar".',
      'Automáticamente, la etiqueta superior cambiará a "Ticket Verde Habilitado".'
    ],
    tags: ['pagos', 'matricula', 'ticket verde', 'finanzas']
  },
  {
    id: 'n4',
    role: 'coordinadores',
    title: 'Registrar Check-In en Puerta (Día del Evento)',
    description: 'La forma más rápida de escanear o marcar asistencia en sala.',
    steps: [
      'En tu dispositivo móvil o tablet, ingresa a imo.crearpslglobal.com.',
      'En el menú principal, toca el ícono de "Escáner / Check-In".',
      'Selecciona el ciclo activo (Ej: "Lima - C1 - Fin de Semana 1").',
      'Aparecerá la lista completa. Puedes buscar por nombre o marcar la casilla "Presente" del lado derecho.',
      'Si el recuadro está bloqueado en rojo, significa que no tiene Ticket Verde (Debe ir a mesa de finanzas).'
    ],
    tags: ['check-in', 'asistencia', 'puerta', 'sala']
  },
  {
    id: 'n5',
    role: 'cmj',
    title: 'Control de Retos y Seguimiento (Managers)',
    description: 'Dónde registrar las llamadas y el seguimiento de los entrenos asignados.',
    steps: [
      'En el menú lateral, haz clic en "Mi Equipo" o "Mis Asignados".',
      'Verás una lista con tus participantes a cargo.',
      'Haz clic en el nombre del participante.',
      'Selecciona la pestaña "Bitácora de Seguimiento".',
      'Haz clic en "+ Nuevo Registro".',
      'Escribe un breve resumen de la llamada (Ej: "Llamada de retos completada. Brecha: 20%") y pulsa "Guardar".'
    ],
    tags: ['retos', 'seguimiento', 'llamadas', 'bitacora']
  }
];

export default function ManualNodus() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('directores'); 
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-seleccionar tab segun rol
  React.useEffect(() => {
    if (currentUser?.appRole) {
      if (currentUser.appRole === 'gerente') setActiveTab('gerentes');
      else if (['coord_c1', 'coord_c2', 'coordinador_c1c2'].includes(currentUser.appRole)) setActiveTab('coordinadores');
      else if (['coord_maestria', 'coordinador_mj'].includes(currentUser.appRole)) setActiveTab('cmj');
      else setActiveTab('directores');
    }
  }, [currentUser]);

  const filteredKnowledge = useMemo(() => {
    return NODUS_KNOWLEDGE_BASE.filter(item => {
      const matchTab = item.role === activeTab;
      const matchSearch = searchTerm === '' || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchTab && matchSearch;
    });
  }, [activeTab, searchTerm]);

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '2rem 1rem' }}>
      
      {/* Boton Volver */}
      <button 
        onClick={() => navigate('/')} 
        className="btn-secondary" 
        style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', fontWeight: 600 }}
      >
        <ArrowLeft size={16} /> Volver al Centro Operativo
      </button>

      {/* Hero Banner Transformacional Nodus */}
      <div className="glass-panel" style={{ 
        padding: '2.5rem 2rem', 
        marginBottom: '2rem', 
        position: 'relative', 
        overflow: 'hidden',
        border: '2px solid var(--crear-blue)',
        borderRadius: '16px'
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.08, pointerEvents: 'none' }}>
          <Database size={220} color="var(--crear-blue)" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ 
            width: '52px', height: '52px', borderRadius: '12px', 
            background: 'rgba(0, 210, 255, 0.15)', border: '1px solid var(--crear-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Server size={30} className="text-blue" />
          </div>
          <div>
            <span style={{ 
              background: 'var(--crear-blue)', color: '#fff', fontSize: '0.75rem', fontWeight: 800,
              padding: '0.3rem 0.8rem', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '1px'
            }}>
              Sistema Central
            </span>
            <h1 style={{ margin: '0.5rem 0 0 0', fontSize: '2.2rem', color: '#fff', fontWeight: 800 }}>
              Manual Interactivo NODUS
            </h1>
          </div>
        </div>
        
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', maxWidth: '800px', lineHeight: 1.6 }}>
          Explora paso a paso cómo realizar cada operación crítica en la plataforma Nodus. 
          Encuentra rápidamente dónde hacer clic y qué módulos utilizar.
        </p>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '12px' }}>
            <Search className="text-gray" size={24} />
            <input 
              type="text" 
              placeholder="Ej: cargar pago, ticket verde, asistencia, aprobar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '1.1rem',
                outline: 'none'
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                style={{ background: 'transparent', border: 'none', color: 'var(--crear-gold)', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Limpiar
              </button>
            )}
        </div>
      </div>

      {/* TABS DE ROLES */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {[
          { id: 'directores', label: 'Directores & Finanzas', icon: ShieldCheck },
          { id: 'gerentes', label: 'Gerentes de Sede', icon: BarChart3 },
          { id: 'coordinadores', label: 'Coordinadores C1/C2', icon: Zap },
          { id: 'cmj', label: 'Centro de Managers (CMJ)', icon: Users }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              border: activeTab === tab.id ? '2px solid var(--crear-gold)' : '1px solid rgba(255,255,255,0.1)',
              background: activeTab === tab.id ? 'rgba(212, 175, 55, 0.1)' : 'rgba(0,0,0,0.3)',
              color: activeTab === tab.id ? 'var(--crear-gold)' : '#fff',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              fontWeight: 600, fontSize: '1rem',
              cursor: 'pointer', transition: 'all 0.3s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <tab.icon size={20} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* RESULTADOS DEL KNOWLEDGE BASE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {filteredKnowledge.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: '16px' }}>
            <Search size={48} className="text-gray" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h3 style={{ color: '#fff', fontSize: '1.4rem' }}>No se encontraron guías</h3>
            <p className="text-gray">Intenta buscar con otros términos o revisa el tab de otro rol.</p>
          </div>
        ) : (
          filteredKnowledge.map(guide => (
            <div key={guide.id} className="glass-panel hover-scale" style={{ 
              padding: '2rem', 
              borderRadius: '16px',
              borderLeft: '4px solid var(--crear-blue)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--crear-blue)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {guide.title}
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', margin: 0 }}>
                    {guide.description}
                  </p>
                </div>
                <a 
                  href="https://imo.crearpslglobal.com/auth/login" 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  <ExternalLink size={16} /> Abrir Nodus
                </a>
              </div>

              <div style={{ 
                background: 'rgba(0,0,0,0.3)', 
                padding: '1.5rem', 
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <h4 style={{ color: '#fff', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MousePointer2 size={18} className="text-gold" /> Pasos Exactos de Navegación:
                </h4>
                <ol style={{ margin: 0, paddingLeft: '1.5rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.8, fontSize: '1.05rem' }}>
                  {guide.steps.map((step, idx) => {
                    const parts = step.split(/(".*?")/);
                    return (
                      <li key={idx} style={{ marginBottom: '0.5rem' }}>
                        {parts.map((part, i) => {
                          if (part.startsWith('"') && part.endsWith('"')) {
                            return <strong key={i} style={{ color: 'var(--crear-gold)' }}>{part}</strong>;
                          }
                          return part;
                        })}
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                {guide.tags.map(t => (
                  <span key={t} style={{ 
                    background: 'rgba(255,255,255,0.1)', color: '#fff', 
                    padding: '0.2rem 0.8rem', borderRadius: '12px', fontSize: '0.8rem' 
                  }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
