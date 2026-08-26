import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Database, Search, ShieldCheck, Users, 
  BarChart3, Settings, TrendingUp, CheckCircle, Zap,
  FolderSync, UserCheck, Key, FileText, Anchor, Activity, Server
} from 'lucide-react';

export default function ManualNodus() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('directores'); 
  // Tabs: directores | gerentes | coordinadores | cmj

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '2rem 1rem' }}>
      
      {/* Botón Volver */}
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
              fontSize: '0.75rem', fontWeight: 800, letterSpacing: '2px', 
              color: 'var(--crear-blue)', textTransform: 'uppercase' 
            }}>
              SISTEMA CENTRAL DE DATOS • CREAR PODER SIN LÍMITES
            </span>
            <h1 style={{ margin: 0, fontSize: '1.85rem', color: 'var(--text-heading)', fontWeight: 900, letterSpacing: '-0.5px' }}>
              Manual Práctico Oficial de Uso: NODUS
            </h1>
          </div>
        </div>

        <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: 'var(--text-main)', margin: 0, maxWidth: '880px' }}>
          El <strong>NODUS</strong> es el núcleo de trazabilidad de toda la organización. Como líder estratégico, tu responsabilidad es asegurar "Cero Pérdida de Información", manteniendo todos los datos de enrolamiento, pagos y estado de participantes estrictamente actualizados en el sistema.
        </p>

        {/* Cita de Activación */}
        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1.1rem 1.4rem', 
          background: 'rgba(0, 210, 255, 0.1)', 
          borderLeft: '4px solid var(--crear-blue)',
          borderRadius: '0 10px 10px 0',
          fontSize: '1rem',
          fontStyle: 'italic',
          color: 'var(--text-main)',
          fontWeight: 600
        }}>
          "Lo que no se registra en Nodus, no existe. La excelencia operativa comienza con la integridad de los datos."
        </div>
      </div>

      {/* Navegación por Pestañas Principales */}
      <div style={{ 
        display: 'flex', 
        gap: '0.75rem', 
        marginBottom: '2rem', 
        borderBottom: '1px solid var(--border-subtle)', 
        paddingBottom: '0.75rem',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('directores')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.4rem',
            borderRadius: '10px',
            border: activeTab === 'directores' ? '1px solid #ec4899' : '1px solid var(--border-subtle)',
            background: activeTab === 'directores' ? 'rgba(236, 72, 153, 0.12)' : 'transparent',
            color: activeTab === 'directores' ? '#ec4899' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <TrendingUp size={18} /> Nodus para Directores
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gerentes')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.4rem',
            borderRadius: '10px',
            border: activeTab === 'gerentes' ? '1px solid var(--crear-gold)' : '1px solid var(--border-subtle)',
            background: activeTab === 'gerentes' ? 'var(--crear-gold-light)' : 'transparent',
            color: activeTab === 'gerentes' ? 'var(--crear-gold)' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <ShieldCheck size={18} /> Nodus para Gerentes
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('coordinadores')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.4rem',
            borderRadius: '10px',
            border: activeTab === 'coordinadores' ? '1px solid var(--crear-blue)' : '1px solid var(--border-subtle)',
            background: activeTab === 'coordinadores' ? 'rgba(0, 210, 255, 0.12)' : 'transparent',
            color: activeTab === 'coordinadores' ? 'var(--crear-blue)' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <Users size={18} /> Nodus C1 & C2
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cmj')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.4rem',
            borderRadius: '10px',
            border: activeTab === 'cmj' ? '1px solid #a855f7' : '1px solid var(--border-subtle)',
            background: activeTab === 'cmj' ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
            color: activeTab === 'cmj' ? '#a855f7' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <Activity size={18} /> Nodus Maestría (CMJ)
        </button>
      </div>

      {/* ========================================================= */}
      {/* PESTAÑA 1: DIRECTORES                                     */}
      {/* ========================================================= */}
      {activeTab === 'directores' && (
        <div style={{ display: 'grid', gap: '2.25rem' }}>
          <div className="glass-panel" style={{ padding: '2.5rem 2rem', borderRadius: '16px', borderLeft: '5px solid #ec4899' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <TrendingUp size={28} color="#ec4899" />
              <h2 style={{ margin: 0, fontSize: '1.45rem', color: '#ec4899', fontWeight: 900 }}>
                Guía Nodus: Dirección Global & Nacional
              </h2>
            </div>

            <p style={{ margin: '0 0 1.5rem 0', lineHeight: '1.7', color: 'var(--text-main)', fontSize: '1rem' }}>
              Como Director(a), tu uso de Nodus es primordialmente de <strong>Auditoría Macro y Toma de Decisiones</strong>. No ingresas datos individuales, sino que auditas volúmenes, proyecciones financieras y retención en las diferentes sedes (Quito, Guayaquil, Cuenca, Medellín, México, Lima).
            </p>

            <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ color: '#ec4899', margin: '0 0 0.8rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={20} /> 1. Dashboard Corporativo (Consolidado)
                </h3>
                <ul style={{ paddingLeft: '1.5rem', margin: 0, color: 'var(--text-muted)', lineHeight: '1.8' }}>
                  <li><strong>Monitoreo de Enrolamiento en Vivo:</strong> Usa el panel global de Nodus para ver las métricas de personas matriculadas vs. meta en tiempo real.</li>
                  <li><strong>Auditoría de Cajas Consolidadas:</strong> Revisa el reporte de ingresos general filtrando por sede y verificando la congruencia entre el flujo en Nodus y las cuentas bancarias.</li>
                  <li><strong>Desviaciones:</strong> Cualquier diferencia mayor a cero entre el número de sentados en sala y los confirmados en Nodus es una bandera roja que debe comunicarse inmediatamente al Gerente de Sede.</li>
                </ul>
                <button 
                  onClick={() => navigate('/estrategia')}
                  className="btn-primary" 
                  style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', border: '1px solid #ec4899', borderRadius: '8px' }}
                >
                  <TrendingUp size={16} /> Ir a Estrategia y OKRs
                </button>
              </div>

              <div style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ color: '#ec4899', margin: '0 0 0.8rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings size={20} /> 2. Gestión de Permisos & Apertura de Eventos
                </h3>
                <ul style={{ paddingLeft: '1.5rem', margin: 0, color: 'var(--text-muted)', lineHeight: '1.8' }}>
                  <li>Asegúrate de que los eventos de cada nuevo ciclo sean configurados en el sistema central antes de arrancar el enrolamiento (C1, C2, MJ).</li>
                  <li>Aprobar y auditar la creación de roles administrativos (Cajeros, Coordinadores) verificando que sus accesos correspondan a la sede física pertinente.</li>
                </ul>
                <button 
                  onClick={() => navigate('/auditoria')}
                  className="btn-primary" 
                  style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', border: '1px solid #ec4899', borderRadius: '8px' }}
                >
                  <Users size={16} /> Panel de Super Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 2: GERENTES                                       */}
      {/* ========================================================= */}
      {activeTab === 'gerentes' && (
        <div style={{ display: 'grid', gap: '2.25rem' }}>
          <div className="glass-panel" style={{ padding: '2.5rem 2rem', borderRadius: '16px', borderLeft: '5px solid var(--crear-gold)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <ShieldCheck size={28} color="var(--crear-gold)" />
              <h2 style={{ margin: 0, fontSize: '1.45rem', color: 'var(--crear-gold)', fontWeight: 900 }}>
                Guía Nodus: Gerentes de Sede
              </h2>
            </div>

            <p style={{ margin: '0 0 1.5rem 0', lineHeight: '1.7', color: 'var(--text-main)', fontSize: '1rem' }}>
              El Gerente de Sede es el <strong>Custodio Local de Nodus</strong>. Eres el responsable directo de que los números ingresados por caja y coordinación reflejen la realidad operativa y financiera de tu ciudad.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              
              <div style={{ padding: '1.5rem', background: 'var(--bg-card-hover)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ color: 'var(--crear-gold)', margin: '0 0 0.8rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                  <Anchor size={18} /> 1. Cierre de Caja Diario
                </h4>
                <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: '1.6', fontSize: '0.9rem' }}>
                  Todos los días, al finalizar la jornada de ventas/enrolamiento, el Gerente debe exportar el reporte de caja de Nodus. Cada recibo emitido físicamente y cada transferencia bancaria debe hacer <i>match</i> perfecto con las transacciones grabadas en el sistema.
                </p>
                <button 
                  onClick={() => navigate('/gerente')}
                  className="btn-primary" 
                  style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--crear-gold)', border: '1px solid var(--crear-gold)', borderRadius: '8px' }}
                >
                  <BarChart3 size={16} /> Ver Dashboard Gerencial
                </button>
              </div>

              <div style={{ padding: '1.5rem', background: 'var(--bg-card-hover)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ color: 'var(--crear-gold)', margin: '0 0 0.8rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                  <UserCheck size={18} /> 2. Validación de Participantes Activos
                </h4>
                <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: '1.6', fontSize: '0.9rem' }}>
                  Antes del inicio de cualquier nivel (C1 o C2), el Gerente valida junto al Coordinador la "Lista Oficial de Nodus". <strong>Ninguna persona sin contrato firmado y estado "Activo" en Nodus puede ingresar a sala.</strong>
                </p>
                <button 
                  onClick={() => navigate('/checklist/gerente')}
                  className="btn-primary" 
                  style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--crear-gold)', border: '1px solid var(--crear-gold)', borderRadius: '8px' }}
                >
                  <CheckCircle size={16} /> Validar Checklists
                </button>
              </div>

              <div style={{ padding: '1.5rem', background: 'var(--bg-card-hover)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ color: 'var(--crear-gold)', margin: '0 0 0.8rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                  <FolderSync size={18} /> 3. Casos Especiales (Traslados y Bajas)
                </h4>
                <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: '1.6', fontSize: '0.9rem' }}>
                  Solo la Gerencia autoriza y ejecuta traslados de participantes entre ciclos o sedes dentro de Nodus. Todo reembolso o baja definitiva requiere la justificación correspondiente en el historial del participante en el sistema.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 3: COORDINADORES C1 & C2                          */}
      {/* ========================================================= */}
      {activeTab === 'coordinadores' && (
        <div style={{ display: 'grid', gap: '2.25rem' }}>
          <div className="glass-panel" style={{ padding: '2.5rem 2rem', borderRadius: '16px', borderLeft: '5px solid var(--crear-blue)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Users size={28} color="var(--crear-blue)" />
              <h2 style={{ margin: 0, fontSize: '1.45rem', color: 'var(--crear-blue)', fontWeight: 900 }}>
                Guía Nodus: Coordinación C1 & C2
              </h2>
            </div>

            <p style={{ margin: '0 0 1.5rem 0', lineHeight: '1.7', color: 'var(--text-main)', fontSize: '1rem' }}>
              Como Coordinador(a), tú eres el <strong>usuario principal y más activo del Nodus</strong> operativo. Tu labor garantiza que los entrenadores tengan datos reales y que la logística fluya sin errores de identificación en los eventos masivos.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              <div style={{ padding: '1.2rem', background: 'rgba(0, 210, 255, 0.05)', borderRadius: '10px', border: '1px solid rgba(0, 210, 255, 0.2)' }}>
                <strong style={{ color: 'var(--crear-blue)', display: 'block', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                  🏷️ Flujo de Registro Inicial y Gafetes
                </strong>
                <ul style={{ paddingLeft: '1.5rem', margin: 0, color: 'var(--text-main)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                  <li>Toda persona enrolada pasa inmediatamente al Nodus con sus datos personales: Nombres completos, Cédula/ID, Teléfono y Correo Electrónico correctos.</li>
                  <li><strong>Exportación de Gafetes:</strong> Los gafetes para C1/C2 se generan EXCLUSIVAMENTE exportando la data de Nodus. No se usa Excel manual. Esto previene que se filtren personas no matriculadas o con deudas.</li>
                </ul>
                <button 
                  onClick={() => navigate('/checklist/coord_c1')}
                  className="btn-primary" 
                  style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', background: 'rgba(0, 210, 255, 0.15)', color: 'var(--crear-blue)', border: '1px solid var(--crear-blue)', borderRadius: '6px', fontSize: '0.85rem' }}
                >
                  <Database size={14} /> Ir a Checklist de C1/C2
                </button>
              </div>

              <div style={{ padding: '1.2rem', background: 'rgba(0, 210, 255, 0.05)', borderRadius: '10px', border: '1px solid rgba(0, 210, 255, 0.2)' }}>
                <strong style={{ color: 'var(--crear-blue)', display: 'block', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                  ✅ Lista de Asistencia (Check-In de Sala)
                </strong>
                <ul style={{ paddingLeft: '1.5rem', margin: 0, color: 'var(--text-main)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                  <li>El ingreso de participantes en la puerta del hotel/sala se cruza directamente con el reporte de "Activos" del Nodus.</li>
                  <li>Cualquier participante marcado en rojo por pago incompleto debe ser derivado a la mesa financiera de Gerencia/Caja. <strong>No puede ingresar a sala sin autorización del sistema.</strong></li>
                </ul>
              </div>

              <div style={{ padding: '1.2rem', background: 'rgba(0, 210, 255, 0.05)', borderRadius: '10px', border: '1px solid rgba(0, 210, 255, 0.2)' }}>
                <strong style={{ color: 'var(--crear-blue)', display: 'block', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                  🔗 Actualización de Estatus Post-Evento
                </strong>
                <ul style={{ paddingLeft: '1.5rem', margin: 0, color: 'var(--text-main)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                  <li>Finalizado el domingo de C1, debes actualizar masivamente el estado en Nodus de quienes se enrolaron exitosamente a C2.</li>
                  <li>Cargar notas relevantes si un participante abandonó (Walk-Out) para registro del entrenador.</li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 4: COORDINADORES CMJ (MAESTRÍA)                   */}
      {/* ========================================================= */}
      {activeTab === 'cmj' && (
        <div style={{ display: 'grid', gap: '2.25rem' }}>
          <div className="glass-panel" style={{ padding: '2.5rem 2rem', borderRadius: '16px', borderLeft: '5px solid #a855f7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Activity size={28} color="#a855f7" />
              <h2 style={{ margin: 0, fontSize: '1.45rem', color: '#a855f7', fontWeight: 900 }}>
                Guía Nodus: Coordinación Maestría del Juego (CMJ)
              </h2>
            </div>

            <p style={{ margin: '0 0 1.5rem 0', lineHeight: '1.7', color: 'var(--text-main)', fontSize: '1rem' }}>
              En los 100 días, Nodus es la herramienta fundamental para el <strong>Control de Deserción y Seguimiento de EAIs (Equipos de Alto Impacto)</strong>. Tu gestión aquí determina las estadísticas de retención final.
            </p>

            <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
              
              <div style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ color: '#a855f7', margin: '0 0 0.8rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} /> 1. Estructuración de EAIs y Asignación
                </h3>
                <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: '1.6', fontSize: '0.95rem' }}>
                  El primer paso post-C2 es registrar en Nodus la división de los Equipos de Alto Impacto. Debes asignar a cada EAI su Capitán/Líder correspondiente en el sistema para que las vistas de control tengan sentido.
                </p>
                <button 
                  onClick={() => navigate('/checklist/coord_maestria')}
                  className="btn-primary" 
                  style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: '1px solid #a855f7', borderRadius: '8px' }}
                >
                  <Activity size={16} /> Checklist Maestría
                </button>
              </div>

              <div style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ color: '#a855f7', margin: '0 0 0.8rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={20} /> 2. Registro de Llamadas y Seguimiento (Managers)
                </h3>
                <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: '1.6', fontSize: '0.95rem' }}>
                  Audita semanalmente que los entrenadores/capitanes estén registrando la asistencia a las llamadas de maestría. Si el registro en Nodus (o en el módulo de Causa OS conectado) está en blanco, el participante se considera en riesgo de deserción por falta de <em>tracking</em>.
                </p>
              </div>

              <div style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ color: '#a855f7', margin: '0 0 0.8rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={20} /> 3. Los 4 Fines de Semana (FDS)
                </h3>
                <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: '1.6', fontSize: '0.95rem' }}>
                  Al igual que en C1/C2, el <i>Check-in</i> físico a cada Fin de Semana (1FDS a 4FDS) debe actualizar el estado del participante en Nodus, confirmando que cumple con los contratos y pagos de maestría vigentes.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
