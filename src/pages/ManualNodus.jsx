import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Database, Search, ShieldCheck, Users, 
  BarChart3, Settings, TrendingUp, CheckCircle, Zap,
  FolderSync, UserCheck, Key, FileText, Anchor, Activity, Server,
  MousePointer2, ExternalLink
} from 'lucide-react';

// Fuente: Manual Oficial de Usuario NODUS - Edición 2026 (manual_nodus_soar_completo.pdf/html),
// integrado y verificado 02/09/2026. Los pasos siguen literalmente los módulos, botones y
// campos descritos en el manual oficial (Capítulos 3 a 18); no se inventan rutas de navegación.
const NODUS_KNOWLEDGE_BASE = [
  {
    id: 'n1',
    role: 'directores',
    title: 'Configurar Sedes, Usuarios y Programas (Módulo Configuración)',
    description: 'El módulo de Configuración es accesible principalmente para Gerentes de Sede y Administradores: gestión de sedes, usuarios/contraseñas y programas/precios.',
    steps: [
      'Haz clic en "Configuración" en el menú lateral izquierdo.',
      'Para crear un usuario: entra a "Usuarios" y presiona "Nuevo Usuario".',
      'Escribe el Nombre Completo, el Nombre de Usuario y una Contraseña inicial.',
      'Selecciona su Rol de acceso (Mesa de Registro, Caja, Coordinación o Gerencia) y su Sede.',
      'Haz clic en "Guardar Usuario" y comparte las credenciales de forma segura.',
      'Gestión de Sedes y Programas y Precios (matrícula, promociones, calendario) están en las otras pestañas del mismo módulo.'
    ],
    tags: ['configuracion', 'usuarios', 'sedes', 'precios', 'director']
  },
  {
    id: 'n2',
    role: 'directores',
    title: 'Resetear una Contraseña Olvidada',
    description: 'Procedimiento oficial cuando un colaborador no puede ingresar a su cuenta de NODUS.',
    steps: [
      'El Gerente de Sede ingresa a "Configuración" → "Usuarios".',
      'Busca el nombre del colaborador en la lista y presiona "Editar".',
      'En la casilla "Nueva Contraseña", escribe una clave temporal clara (ej: Nodus2026*).',
      'Haz clic en "Guardar Cambios" y pide al usuario que pruebe su ingreso de inmediato.'
    ],
    tags: ['contraseña', 'usuarios', 'soporte', 'reset']
  },
  {
    id: 'n3',
    role: 'directores',
    title: 'Auditar el Reporte de Entrenadores y la Brecha Enrolados vs. Sentados',
    description: 'Cómo cruzar el Reporte de Entrenadores contra la Mesa de Registro para detectar no-shows.',
    steps: [
      'Ve al módulo "Reportes" en el menú lateral.',
      'Abre el "Reporte de Entrenadores y Maestrías": columnas TIPO IMO/DNI, PARTICIPANTES EN JUEGO, DECLARACIÓN, TOTAL ENROLADOS y DESERTOR FDS.',
      '"Enrolados" muestra cuántos pagaron su inscripción en el sistema.',
      '"Sentados" muestra cuántos fueron efectivamente marcados con "Marcar en Sala" el viernes por la noche.',
      'Si hay brecha (ej: 15 enrolados pero 8 sentados), coordinación debe contactar a los 7 ausentes y coordinar su ingreso en la cohorte inmediata.'
    ],
    tags: ['reportes', 'auditoria', 'entrenadores', 'brecha', 'no-show']
  },
  {
    id: 'n4',
    role: 'gerentes',
    title: 'Leer el Dashboard Principal e Indicadores en Vivo',
    description: 'Dónde ver el resumen operativo y los contadores en tiempo real durante días de evento.',
    steps: [
      'Al iniciar sesión, el sistema muestra el "Dashboard" con Contadores de Resumen en la parte superior (entrenadores, eventos activos, participantes registrados, sedes operando).',
      'Durante el evento, el Dashboard actualiza en vivo: "Inscritos Totales", "Presentes en Sala" y "Pendientes de Llegada".',
      'La Barra Lateral Izquierda da acceso a Dashboard, Mesa Registro, Participantes, Contabilidad, Cierre de Caja, Reportes y Configuración.',
      'Para volver al inicio desde cualquier módulo, haz clic en "Dashboard" o en el logotipo (esquina superior izquierda).'
    ],
    tags: ['dashboard', 'indicadores', 'tiempo real', 'gerente']
  },
  {
    id: 'n5',
    role: 'gerentes',
    title: 'Realizar el Cierre y Arqueo Diario de Caja',
    description: 'Procedimiento oficial de 3 pasos para cuadrar el dinero físico contra las transacciones registradas.',
    steps: [
      'Haz clic en "Cierre de Caja" en el menú lateral. Selecciona la fecha de hoy y la sede.',
      'Compara el "Total Efectivo Esperado" (calculado por NODUS) contra el conteo físico real y escríbelo en "Efectivo Real en Caja".',
      'Si hay sobrante o faltante, documenta la justificación en el campo "Observaciones".',
      'Presiona "Cerrar Caja Oficialmente" para generar el acta; los registros del día quedan bloqueados.',
      'Solo el Gerente de Sede o el Administrador general pueden reabrir una caja ya cerrada.'
    ],
    tags: ['cierre de caja', 'arqueo', 'contabilidad', 'gerente']
  },
  {
    id: 'n6',
    role: 'gerentes',
    title: 'Autorizar un Traslado de Sede de un Participante',
    description: 'Caso especial de Mesa de Registro que solo puede resolver el Gerente de Sede.',
    steps: [
      'Cuando un participante estaba registrado para otra sede pero pide cursar en la sede actual, entra a "Participantes".',
      'Busca al alumno en el listado general.',
      'Modifica el campo "Sede Asignada" seleccionando la sede actual.',
      'Al guardar, el alumno aparecerá automáticamente en la Mesa de Registro local.'
    ],
    tags: ['traslado', 'sede', 'participantes', 'gerente']
  },
  {
    id: 'n7',
    role: 'coordinadores',
    title: 'Registrar a un Participante en la Mesa de Registro (3 Pasos)',
    description: 'El procedimiento más usado durante los días de evento, en el vestíbulo o puerta de entrada.',
    steps: [
      'Pide su DNI/Cédula/Pasaporte, escríbelo en la barra de búsqueda de Mesa de Registro y presiona Enter (si no aparece, busca solo por apellido).',
      'Verifica el estado: si figura "Completo" continúa; si está "Pendiente", solicita comprobante o deriva a la caja.',
      'Haz clic en "Marcar en Sala": el participante queda contabilizado como Sentado. Entrégale su gafete oficial y material de bienvenida.',
      'Si marcaste por error, vuelve a buscar por DNI y desmarca la casilla de asistencia.'
    ],
    tags: ['mesa de registro', 'check-in', 'asistencia', 'gafete', 'coordinador']
  },
  {
    id: 'n8',
    role: 'coordinadores',
    title: 'Resolver Casos Especiales en Mesa de Registro',
    description: 'Protocolos oficiales para walk-ins, participantes extranjeros y traslados de sede.',
    steps: [
      'Walk-in (inscrito el mismo día): pide comprobante → "Participantes" → "Nuevo Participante" → registra nombres/DNI/teléfono/correo → "Contabilidad" → "Registrar Pago" → vuelve a Mesa de Registro y márcalo con gafete provisional.',
      'Extranjero con pasaporte: escribe la serie alfanumérica del pasaporte tal como fue registrada; si no aparece, busca por apellido materno o paterno.',
      'Traslado de sede: debe resolverlo el Gerente de Sede desde "Participantes", cambiando el campo "Sede Asignada".'
    ],
    tags: ['casos especiales', 'walk-in', 'pasaporte', 'traslado', 'coordinador']
  },
  {
    id: 'n9',
    role: 'coordinadores',
    title: 'Registrar un Nuevo Participante y Asentar su Pago',
    description: 'Alta completa de un participante en el módulo Participantes y su cobro en Contabilidad.',
    steps: [
      'En el menú lateral, entra a "Participantes" y presiona "Nuevo Participante".',
      'Completa Tipo y Número de Documento, Nombres y Apellidos completos (tal como el documento, para certificados), Teléfono/WhatsApp, Correo, Sede y Entrenamiento.',
      'Haz clic en "Guardar": el registro se genera de inmediato.',
      'Para cobrar: "Contabilidad" → "Registrar Pago" → busca por DNI → elige tipo de pago (Total o Abono Parcial) y forma de pago (Efectivo, Transferencia o Tarjeta) → escribe el número de comprobante/operación → "Guardar Pago".'
    ],
    tags: ['participantes', 'nuevo participante', 'pago', 'contabilidad', 'coordinador']
  },
  {
    id: 'n10',
    role: 'cmj',
    title: 'Leer el Reporte de Entrenadores y Maestrías (5 Columnas)',
    description: 'El reporte más consultado por Centro de Managers para evaluar rendimiento por bloque/equipo.',
    steps: [
      'Ve a "Reportes" → "Reporte de Entrenadores y Maestrías".',
      'TIPO IMO/DNI: rol (Capitán, Manager, Participante) o documento — permite auditar por bloque o buscar a alguien.',
      'PARTICIPANTES EN JUEGO: personas activas en sala o nombre del participante.',
      'DECLARACIÓN: la meta numérica que el líder se comprometió a enrolar.',
      'TOTAL ENROLADOS: personas nuevas registradas y pagadas (en 0 = sin cobros registrados aún).',
      'DESERTOR FDS: alumnos que abandonaron durante el fin de semana — alerta de fuga a reportar de inmediato a coordinación.'
    ],
    tags: ['reporte de entrenadores', 'kpi', 'cmj', 'declaracion', 'desertor']
  },
  {
    id: 'n11',
    role: 'cmj',
    title: 'Gestionar Equipos, Cohortes y Asignación de Entrenadores',
    description: 'Módulo "Equipos y Maestrías" para estructurar las cohortes de cada sede (ej: Equipos 27, 28, 29 de Lima).',
    steps: [
      'Creación de cohortes: define número de equipo, sede y fechas de inicio y graduación.',
      'Asignación de entrenadores: asocia al entrenador oficial responsable del proceso.',
      'Distribución de alumnos: asigna a cada participante nuevo a su cohorte y equipo.',
      'Buena práctica del manual: asegúrate de que cada participante tenga cohorte asignada antes del viernes de registro — sin equipo asignado, no aparece en el reporte de entrenadores de su sede.'
    ],
    tags: ['equipos', 'cohortes', 'asignacion', 'cmj', 'entrenadores']
  },
  {
    id: 'n12',
    role: 'cmj',
    title: 'Auditar la Brecha entre Enrolados y Sentados',
    description: 'Función clave de Centro de Managers para detectar no-shows cruzando Reportes contra Mesa de Registro.',
    steps: [
      '"Enrolados": personas que han pagado su inscripción en el sistema (columna TOTAL ENROLADOS del Reporte de Entrenadores).',
      '"Sentados": personas efectivamente marcadas con "Marcar en Sala" el viernes por la noche.',
      'Si un equipo reporta 15 enrolados pero solo 8 sentados, comunícate con los 7 ausentes para conocer el motivo y coordinar su ingreso en la cohorte inmediata.'
    ],
    tags: ['brecha', 'no-show', 'auditoria', 'cmj', 'seguimiento']
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
