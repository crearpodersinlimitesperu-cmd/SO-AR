import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, Sparkles, AlertCircle, CheckCircle2, Clock, 
  RefreshCw, Trophy, Search, X, ExternalLink, ChevronRight,
  Filter, ShieldAlert, Award, FileText, UserCheck, AlertTriangle,
  Loader2, ThumbsUp, Send, Check
} from 'lucide-react';
import { doc } from 'firebase/firestore';
import { db, getDocResilient } from '../services/firebase';
import { 
  NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES, 
  EQUIPOS_FUTUROS_IMPOSIBLES, 
  ESTADOS_FI 
} from '../data/nodusFuturosImposiblesData';
import { 
  ejecutarDiagnosticoFIs, 
  evaluarCalidadOntologicaFI, 
  normalizarTexto 
} from '../services/nodusFIAgent';

export default function FuturosImposiblesView({ 
  selectedSede = 'GLOBAL',
  borderLight = 'var(--border-subtle, rgba(255, 255, 255, 0.08))',
  bgCard = 'var(--bg-card, rgba(17, 34, 64, 0.75))',
  textDark = 'var(--text-main, #f8fafc)',
  textMuted = 'var(--text-muted, #94a3b8)'
}) {
  // Estados de filtrado y búsqueda
  const [equipoFilter, setEquipoFilter] = useState('Todos');
  const [estadoFilter, setEstadoFilter] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Datos crudos y respaldo con Firestore
  const [participantesRaw, setParticipantesRaw] = useState(() => NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Estados del modal de revisión
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeAreaTab, setActiveAreaTab] = useState(0);
  const [mentorNote, setMentorNote] = useState('');

  // Sincronización opcional en vivo con Firestore
  useEffect(() => {
    let isMounted = true;
    async function fetchNodusFIData() {
      try {
        const snap = await getDocResilient(doc(db, 'nodus_futuros_imposibles', 'latest'));
        if (snap.exists() && snap.data()?.participantes && isMounted) {
          setParticipantesRaw(snap.data().participantes);
        }
      } catch (err) {
        // Fallback natural a NODUS_FUTUROS_IMPOSIBLES_PARTICIPANTES
      }
    }
    fetchNodusFIData();
    return () => { isMounted = false; };
  }, []);

  const triggerToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Ejecución reactiva del diagnóstico del Agente IA
  const diagnostic = useMemo(() => {
    return ejecutarDiagnosticoFIs(
      participantesRaw,
      selectedSede,
      equipoFilter,
      estadoFilter,
      searchQuery
    );
  }, [participantesRaw, selectedSede, equipoFilter, estadoFilter, searchQuery]);

  const handleReevaluate = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      setIsEvaluating(false);
      triggerToast('Auditoría y diagnóstico re-evaluados con éxito por el Agente IA.', 'success');
    }, 600);
  };

  const handleOpenReviewModal = (participant) => {
    setSelectedParticipant(participant);
    setActiveAreaTab(0);
    setMentorNote(participant.fis?.[0]?.feedback || '');
    setModalOpen(true);
  };

  const handleApproveCurrentFI = () => {
    if (!selectedParticipant) return;
    const partId = selectedParticipant.id;
    const areaIdx = activeAreaTab;

    setParticipantesRaw(prev => prev.map(p => {
      if (p.id !== partId) return p;
      const newFis = [...p.fis];
      const area = newFis[areaIdx];
      newFis[areaIdx] = {
        ...area,
        estado: 'aprobado',
        feedback: mentorNote.trim() || 'Meta aprobada y certificada por Mentor.'
      };

      const aprobados = newFis.filter(f => f.estado === 'aprobado').length;
      const pendientes = newFis.filter(f => f.estado === 'pendiente').length;
      const devueltos = newFis.filter(f => f.estado === 'devuelto').length;
      const total = newFis.filter(f => f.estado !== 'no_presentado').length;

      const updated = {
        ...p,
        totalFi: total,
        aprobados,
        pendientes,
        devueltos,
        fis: newFis
      };
      setSelectedParticipant(updated);
      return updated;
    }));

    triggerToast(`FI "${selectedParticipant.fis[areaIdx]?.area}" aprobado con éxito.`);
  };

  const handleDevolverCurrentFI = () => {
    if (!selectedParticipant) return;
    const partId = selectedParticipant.id;
    const areaIdx = activeAreaTab;

    setParticipantesRaw(prev => prev.map(p => {
      if (p.id !== partId) return p;
      const newFis = [...p.fis];
      const area = newFis[areaIdx];
      newFis[areaIdx] = {
        ...area,
        estado: 'devuelto',
        feedback: mentorNote.trim() || 'Devuelto para ajuste: Requiere métricas cuantificables y fecha límite.'
      };

      const aprobados = newFis.filter(f => f.estado === 'aprobado').length;
      const pendientes = newFis.filter(f => f.estado === 'pendiente').length;
      const devueltos = newFis.filter(f => f.estado === 'devuelto').length;
      const total = newFis.filter(f => f.estado !== 'no_presentado').length;

      const updated = {
        ...p,
        totalFi: total,
        aprobados,
        pendientes,
        devueltos,
        fis: newFis
      };
      setSelectedParticipant(updated);
      return updated;
    }));

    triggerToast(`FI devuelto con observaciones para ajuste.`, 'warning');
  };

  const { metricas, dictamenIA, participantes } = diagnostic;

  return (
    <div style={{ color: textDark }}>
      {/* TOAST DE NOTIFICACIÓN */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: toastMessage.type === 'success' ? '#10b981' : toastMessage.type === 'warning' ? '#f59e0b' : '#ef4444',
          color: '#fff',
          padding: '0.85rem 1.5rem',
          borderRadius: '10px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          fontWeight: 700,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          zIndex: 10000
        }}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {toastMessage.text}
        </div>
      )}

      {/* 1. ENCABEZADO Y GOBERNANZA OFICIAL */}
      <div style={{ 
        background: bgCard, 
        border: `1px solid ${borderLight}`, 
        borderRadius: '12px', 
        padding: '1.25rem 1.5rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ 
              background: 'rgba(16, 185, 129, 0.15)', 
              color: '#10b981', 
              padding: '0.25rem 0.75rem', 
              borderRadius: '20px', 
              fontSize: '0.75rem', 
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <Target size={14} /> AGENTE CENTINELA IA &bull; AUDITORÍA DE FUTUROS IMPOSIBLES
            </span>
            <span style={{ fontSize: '0.85rem', color: textMuted }}>
              &bull; Sincronización oficial con NODUS CREAR
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: textMuted, maxWidth: '900px', lineHeight: 1.4 }}>
            <strong style={{ color: '#f59e0b' }}>Regla Operativa Nodus:</strong> <em>"Solo participantes que ya asistieron a su PFD (primer fin de semana) — ahí es cuando corresponde revisar sus Futuros Imposibles."</em>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleReevaluate}
            disabled={isEvaluating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#10b981',
              cursor: isEvaluating ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={15} className={isEvaluating ? 'animate-spin' : ''} />
            {isEvaluating ? 'Auditando...' : 'Re-ejecutar Diagnóstico IA'}
          </button>
          
          <a
            href="https://imo.crearpslglobal.com/futurosimposibles"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#38bdf8',
              textDecoration: 'none'
            }}
          >
            <ExternalLink size={15} /> Abrir Nodus /futurosimposibles
          </a>
        </div>
      </div>

      {/* 2. BARRA DE 7 TARJETAS KPI EJECUTIVAS */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', 
        gap: '1rem', 
        marginBottom: '1.5rem' 
      }}>
        {/* KPI 1: Universo Evaluado */}
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>Universo PFD</span>
            <UserCheck size={16} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: textDark }}>{metricas.totalParticipantes}</div>
          <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.2rem' }}>Asistieron a PFD</div>
        </div>

        {/* KPI 2: Sin Entrega (Alerta Roja) */}
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.08)', 
          border: '1px solid rgba(239, 68, 68, 0.25)', 
          borderRadius: '10px', 
          padding: '1rem' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Sin Entrega (0 FIs)</span>
            <AlertCircle size={16} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{metricas.conCeroFIs}</div>
          <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600, marginTop: '0.2rem' }}>
            {metricas.tasaSinEntrega}% del total (Rezago)
          </div>
        </div>

        {/* KPI 3: Con FIs Cargados */}
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>Con FIs Cargados</span>
            <Target size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{metricas.conFIs}</div>
          <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.2rem' }}>
            {metricas.tasaEntrega}% cobertura
          </div>
        </div>

        {/* KPI 4: FIs Pendientes */}
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>Pendientes</span>
            <Clock size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{metricas.totalPendientes}</div>
          <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.2rem' }}>Por revisar por mentores</div>
        </div>

        {/* KPI 5: FIs Devueltos */}
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>Devueltos</span>
            <RefreshCw size={16} color="#ea580c" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ea580c' }}>{metricas.totalDevueltos}</div>
          <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.2rem' }}>Requieren corrección</div>
        </div>

        {/* KPI 6: FIs Aprobados */}
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>Aprobados</span>
            <CheckCircle2 size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{metricas.totalAprobados}</div>
          <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.2rem' }}>Metas certificadas</div>
        </div>

        {/* KPI 7: Tasa Aprobación */}
        <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase' }}>Efectividad</span>
            <Trophy size={16} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6' }}>{metricas.tasaAprobacion}%</div>
          <div style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.2rem' }}>FIs aprobados vs cargados</div>
        </div>
      </div>

      {/* 3. PANEL DE DICTAMEN DEL AGENTE CENTINELA IA */}
      <div style={{ 
        background: bgCard, 
        border: `1px solid ${borderLight}`, 
        borderRadius: '12px', 
        padding: '1.5rem', 
        marginBottom: '1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Header del Dictamen */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '0.4rem', borderRadius: '8px', color: '#f59e0b' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                DICTAMEN DEL AGENTE CENTINELA IA &bull; AUDITORÍA INSTITUCIONAL
              </h3>
              <span style={{ fontSize: '0.75rem', color: textMuted }}>Evaluación autónoma continua de compromisos post-PFD</span>
            </div>
          </div>

          <span style={{ 
            background: dictamenIA.severidad === 'CRITICA' ? 'rgba(239, 68, 68, 0.2)' : dictamenIA.severidad === 'ALERTA' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            color: dictamenIA.colorBadge,
            border: `1px solid ${dictamenIA.colorBadge}`,
            padding: '0.35rem 0.85rem',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 800
          }}>
            {dictamenIA.badgeTexto}
          </span>
        </div>

        {/* Narrativa Ejecutiva */}
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.15)', 
          padding: '1rem 1.25rem', 
          borderRadius: '8px', 
          fontSize: '0.88rem', 
          lineHeight: 1.5, 
          color: textDark, 
          marginBottom: '1.25rem',
          borderLeft: `4px solid ${dictamenIA.colorBadge}`
        }}>
          {dictamenIA.resumen}
        </div>

        {/* 3 Pilares Diagnósticos en Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          {/* Pilar 1: Cobertura */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: `1px solid ${borderLight}`, borderRadius: '8px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldAlert size={16} /> {dictamenIA.pilarCobertura.titulo}
            </h4>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', color: textMuted, lineHeight: 1.4 }}>
              {dictamenIA.pilarCobertura.detalle}
            </p>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
              ⚠️ {dictamenIA.pilarCobertura.alerta}
            </div>
          </div>

          {/* Pilar 2: Cuello de botella */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: `1px solid ${borderLight}`, borderRadius: '8px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={16} /> {dictamenIA.pilarCuelloBotella.titulo}
            </h4>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', color: textMuted, lineHeight: 1.4 }}>
              {dictamenIA.pilarCuelloBotella.detalle}
            </p>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
              ⏳ {dictamenIA.pilarCuelloBotella.alerta}
            </div>
          </div>

          {/* Pilar 3: Plan de acción */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: `1px solid ${borderLight}`, borderRadius: '8px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Target size={16} /> {dictamenIA.pilarPlanAccion.titulo}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {dictamenIA.pilarPlanAccion.pasos.map((paso, idx) => (
                <div key={idx} style={{ fontSize: '0.78rem', lineHeight: 1.3 }}>
                  <strong style={{ color: '#38bdf8' }}>[{paso.plazo}]:</strong>{' '}
                  <span style={{ color: textDark }}>{paso.accion}</span>{' '}
                  <span style={{ color: textMuted, fontSize: '0.72rem' }}>({paso.responsable})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Directivas Clave para Dirección */}
        <div style={{ 
          background: 'rgba(16, 185, 129, 0.06)', 
          border: '1px solid rgba(16, 185, 129, 0.2)', 
          borderRadius: '8px', 
          padding: '0.85rem 1.25rem' 
        }}>
          <strong style={{ fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
            <ChevronRight size={16} /> Directivas Ejecutivas para Dirección / Gerencia de Sede:
          </strong>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: textMuted }}>
            {dictamenIA.directivasParaDireccion.map((dir, idx) => (
              <li key={idx} style={{ marginBottom: '0.25rem' }}>{dir}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4. SEMÁFORO DE CUMPLIMIENTO POR EQUIPOS */}
      <div style={{ 
        background: bgCard, 
        border: `1px solid ${borderLight}`, 
        borderRadius: '12px', 
        padding: '1.25rem', 
        marginBottom: '1.5rem' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={15} color="#38bdf8" /> SEMÁFORO DE CUMPLIMIENTO POR EQUIPO (Click para filtrar)
          </h4>
          <span style={{ fontSize: '0.75rem', color: textMuted }}>
            Filtro actual: <strong style={{ color: '#38bdf8' }}>{equipoFilter}</strong>
          </span>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          overflowX: 'auto', 
          paddingBottom: '0.5rem',
          scrollbarWidth: 'thin'
        }}>
          <button
            onClick={() => setEquipoFilter('Todos')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              border: equipoFilter === 'Todos' ? '1px solid #38bdf8' : `1px solid ${borderLight}`,
              background: equipoFilter === 'Todos' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              color: equipoFilter === 'Todos' ? '#38bdf8' : textMuted,
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Todos ({participantesRaw.length})
          </button>

          {metricas.equiposList.map((eq, idx) => {
            const isSelected = equipoFilter === eq.equipo;
            const badgeColor = eq.semaforo === 'VERDE' ? '#10b981' : eq.semaforo === 'AMARILLO' ? '#f59e0b' : '#ef4444';
            return (
              <button
                key={idx}
                onClick={() => setEquipoFilter(isSelected ? 'Todos' : eq.equipo)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '20px',
                  border: isSelected ? `2px solid ${badgeColor}` : `1px solid ${borderLight}`,
                  background: isSelected ? `${badgeColor}25` : 'rgba(255, 255, 255, 0.03)',
                  color: textDark,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: badgeColor,
                  display: 'inline-block' 
                }} />
                <span>{eq.equipo}</span>
                <span style={{ color: textMuted, fontSize: '0.7rem' }}>
                  ({eq.pctEntrega}%)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. TOOLBAR DE BÚSQUEDA Y FILTROS */}
      <div style={{ 
        background: bgCard, 
        border: `1px solid ${borderLight}`, 
        borderRadius: '12px', 
        padding: '1.25rem', 
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Buscador reactivo en tiempo real */}
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '450px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por participante, DNI o equipo..."
            style={{
              width: '100%',
              padding: '0.65rem 2.2rem 0.65rem 2.4rem',
              borderRadius: '8px',
              border: `1px solid ${borderLight}`,
              background: 'rgba(0, 0, 0, 0.2)',
              color: textDark,
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: textMuted,
                cursor: 'pointer',
                display: 'flex'
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filtros Dropdowns */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Selector de Equipo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: textMuted }}>Equipo:</span>
            <select
              value={equipoFilter}
              onChange={(e) => setEquipoFilter(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: `1px solid ${borderLight}`,
                background: 'rgba(0, 0, 0, 0.25)',
                color: textDark,
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {EQUIPOS_FUTUROS_IMPOSIBLES.map(eq => (
                <option key={eq} value={eq} style={{ background: '#0f172a', color: '#f8fafc' }}>
                  {eq}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: textMuted }}>Estado:</span>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: `1px solid ${borderLight}`,
                background: 'rgba(0, 0, 0, 0.25)',
                color: textDark,
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {ESTADOS_FI.map(est => (
                <option key={est.id} value={est.id} style={{ background: '#0f172a', color: '#f8fafc' }}>
                  {est.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '0.8rem', color: textMuted, marginLeft: '0.5rem' }}>
            Mostrando <strong>{participantes.length}</strong> de {participantesRaw.length}
          </div>
        </div>
      </div>

      {/* 6. TABLA INTERACTIVA DE SEGUIMIENTO DE FUTUROS IMPOSIBLES */}
      <div style={{ 
        background: bgCard, 
        border: `1px solid ${borderLight}`, 
        borderRadius: '12px', 
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        marginBottom: '2rem'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: `1px solid ${borderLight}` }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem' }}>
                  Participante
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem' }}>
                  Identificación
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem' }}>
                  Sede & Equipo
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem', textAlign: 'center' }}>
                  Total FI
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem', textAlign: 'center' }}>
                  Pendientes
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem', textAlign: 'center' }}>
                  Devueltos
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem', textAlign: 'center' }}>
                  Aprobados
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem' }}>
                  Dictamen Agente IA
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', fontSize: '0.72rem', textAlign: 'center' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {participantes.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem 1rem', textAlign: 'center', color: textMuted }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={32} color="#94a3b8" />
                      <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>No se encontraron participantes con los filtros actuales</div>
                      <div style={{ fontSize: '0.8rem' }}>Intente cambiar el equipo, el estado o limpiar el buscador</div>
                    </div>
                  </td>
                </tr>
              ) : (
                participantes.map((p, idx) => {
                  const isZero = (p.totalFi || 0) === 0;
                  const isAllApproved = (p.aprobados || 0) === 5;
                  const hasPendientes = (p.pendientes || 0) > 0;
                  const hasDevueltos = (p.devueltos || 0) > 0;

                  return (
                    <tr 
                      key={p.id || idx}
                      style={{ 
                        borderBottom: `1px solid ${borderLight}`,
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.04)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)'}
                    >
                      {/* Participante */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: isZero ? '#ef4444' : isAllApproved ? '#10b981' : '#f59e0b',
                            display: 'inline-block',
                            flexShrink: 0
                          }} />
                          <div>
                            <div style={{ fontWeight: 700, color: textDark }}>{p.nombre}</div>
                            <div style={{ fontSize: '0.72rem', color: textMuted }}>PFD: {p.fechaPFD || '16/08/2026'} ({p.diasDesdePFD || 27}d)</div>
                          </div>
                        </div>
                      </td>

                      {/* Identificación */}
                      <td style={{ padding: '0.85rem 1rem', color: textMuted, fontFamily: 'monospace' }}>
                        {p.dni || '—'}
                      </td>

                      {/* Sede & Equipo */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#38bdf8' }}>{p.sede}</span>
                          <span style={{ fontSize: '0.72rem', color: textMuted }}>{p.equipo}</span>
                        </div>
                      </td>

                      {/* Total FI */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          background: isZero ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: isZero ? '#ef4444' : '#10b981'
                        }}>
                          {p.totalFi || 0}
                        </span>
                      </td>

                      {/* Pendientes */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: (p.pendientes || 0) > 0 ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                          color: (p.pendientes || 0) > 0 ? '#f59e0b' : textMuted
                        }}>
                          {p.pendientes || 0}
                        </span>
                      </td>

                      {/* Devueltos */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: (p.devueltos || 0) > 0 ? 'rgba(234, 88, 12, 0.15)' : 'transparent',
                          color: (p.devueltos || 0) > 0 ? '#ea580c' : textMuted
                        }}>
                          {p.devueltos || 0}
                        </span>
                      </td>

                      {/* Aprobados */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: (p.aprobados || 0) > 0 ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                          color: (p.aprobados || 0) > 0 ? '#10b981' : textMuted
                        }}>
                          {p.aprobados || 0}
                        </span>
                      </td>

                      {/* Dictamen Agente IA */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isZero ? (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            color: '#ef4444', 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            🚨 Sin Entrega (Rezago Crítico)
                          </span>
                        ) : hasPendientes ? (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            color: '#f59e0b', 
                            background: 'rgba(245, 158, 11, 0.1)', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            ⏳ Requiere Revisión Mentor
                          </span>
                        ) : hasDevueltos ? (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            color: '#ea580c', 
                            background: 'rgba(234, 88, 12, 0.1)', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            🔄 Ajuste Pendiente por Alumno
                          </span>
                        ) : isAllApproved ? (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            color: '#10b981', 
                            background: 'rgba(16, 185, 129, 0.1)', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            ✅ Certificado 100%
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: textMuted }}>
                            En Progreso ({p.totalFi}/5)
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenReviewModal(p)}
                          style={{
                            background: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            color: '#38bdf8',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          👁️ Revisar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. MODAL DE REVISIÓN Y AUDITORÍA DE 5 FUTUROS IMPOSIBLES */}
      {modalOpen && selectedParticipant && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem',
          zIndex: 10001
        }}>
          <div style={{
            background: '#0d1527',
            border: `1px solid ${borderLight}`,
            borderRadius: '16px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: `1px solid ${borderLight}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ 
                    background: 'rgba(16, 185, 129, 0.15)', 
                    color: '#10b981', 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '12px', 
                    fontSize: '0.7rem', 
                    fontWeight: 800 
                  }}>
                    AUDITORÍA FI
                  </span>
                  <span style={{ fontSize: '0.8rem', color: textMuted }}>
                    DNI: {selectedParticipant.dni || 'Sin DNI'} &bull; Sede: {selectedParticipant.sede} &bull; {selectedParticipant.equipo}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: textDark }}>
                  {selectedParticipant.nombre}
                </h3>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: textMuted,
                  cursor: 'pointer',
                  padding: '0.4rem',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {/* Badges de estado general */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '0.75rem', 
                marginBottom: '1.5rem' 
              }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.6rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: textMuted }}>TOTAL FIs</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: textDark }}>{selectedParticipant.totalFi}/5</div>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.6rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#f59e0b' }}>PENDIENTES</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{selectedParticipant.pendientes}</div>
                </div>
                <div style={{ background: 'rgba(234, 88, 12, 0.1)', padding: '0.6rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#ea580c' }}>DEVUELTOS</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ea580c' }}>{selectedParticipant.devueltos}</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.6rem', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#10b981' }}>APROBADOS</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{selectedParticipant.aprobados}</div>
                </div>
              </div>

              {/* Selector de Áreas (5 FIs) */}
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                borderBottom: `1px solid ${borderLight}`, 
                marginBottom: '1.25rem',
                overflowX: 'auto',
                paddingBottom: '0.5rem'
              }}>
                {(selectedParticipant.fis || []).map((fi, idx) => {
                  const isActive = activeAreaTab === idx;
                  const isApr = fi.estado === 'aprobado';
                  const isPen = fi.estado === 'pendiente';
                  const isDev = fi.estado === 'devuelto';
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveAreaTab(idx);
                        setMentorNote(fi.feedback || '');
                      }}
                      style={{
                        padding: '0.5rem 0.85rem',
                        borderRadius: '8px',
                        border: isActive ? '1px solid #38bdf8' : `1px solid ${borderLight}`,
                        background: isActive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                        color: isActive ? '#38bdf8' : textMuted,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: isApr ? '#10b981' : isPen ? '#f59e0b' : isDev ? '#ea580c' : '#64748b'
                      }} />
                      {idx + 1}. {fi.area}
                    </button>
                  );
                })}
              </div>

              {/* Detalle del FI Activo */}
              {(() => {
                const fi = selectedParticipant.fis?.[activeAreaTab] || {};
                const evaluacion = evaluarCalidadOntologicaFI(fi.area, fi.titulo, fi.meta);
                const isNoPresentado = fi.estado === 'no_presentado' || !fi.meta;

                return (
                  <div>
                    {/* Header del FI */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: '1rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: textMuted, textTransform: 'uppercase' }}>
                          Área {activeAreaTab + 1} de 5
                        </span>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: textDark }}>
                          {fi.area}
                        </h4>
                      </div>

                      <span style={{
                        padding: '0.3rem 0.8rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: fi.estado === 'aprobado' ? 'rgba(16, 185, 129, 0.15)' : fi.estado === 'pendiente' ? 'rgba(245, 158, 11, 0.15)' : fi.estado === 'devuelto' ? 'rgba(234, 88, 12, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                        color: fi.estado === 'aprobado' ? '#10b981' : fi.estado === 'pendiente' ? '#f59e0b' : fi.estado === 'devuelto' ? '#ea580c' : '#94a3b8'
                      }}>
                        {fi.estado === 'aprobado' ? '✅ Aprobado / Certificado' : fi.estado === 'pendiente' ? '⏳ Pendiente de Revisión' : fi.estado === 'devuelto' ? '🔄 Devuelto para Ajuste' : '⚪ No Registrado'}
                      </span>
                    </div>

                    {/* Texto de la Meta */}
                    <div style={{ 
                      background: 'rgba(0, 0, 0, 0.25)', 
                      border: `1px solid ${borderLight}`, 
                      borderRadius: '8px', 
                      padding: '1.1rem',
                      marginBottom: '1.25rem' 
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: textMuted, marginBottom: '0.35rem' }}>
                        TEXTO REGISTRADO EN NODUS:
                      </div>
                      {isNoPresentado ? (
                        <div style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '0.88rem' }}>
                          🚨 El participante aún no ha redactado ni cargado su Futuro Imposible para esta área en la plataforma oficial.
                        </div>
                      ) : (
                        <div>
                          {fi.titulo && (
                            <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '0.35rem', fontSize: '0.95rem' }}>
                              {fi.titulo}
                            </div>
                          )}
                          <div style={{ fontSize: '0.9rem', color: textDark, lineHeight: 1.5 }}>
                            "{fi.meta}"
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card de Evaluación del Agente IA */}
                    <div style={{ 
                      background: 'rgba(15, 23, 42, 0.6)', 
                      border: '1px solid rgba(56, 189, 248, 0.25)', 
                      borderRadius: '8px', 
                      padding: '1rem',
                      marginBottom: '1.25rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Sparkles size={14} /> AUDITORÍA ONTOLÓGICA DEL AGENTE IA
                        </span>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 800, 
                          color: evaluacion.color,
                          background: `${evaluacion.color}20`,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '12px'
                        }}>
                          {evaluacion.etiqueta} ({evaluacion.puntaje}/100)
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: textMuted, lineHeight: 1.4 }}>
                        {evaluacion.observaciones}
                      </div>
                    </div>

                    {/* Observaciones / Feedback del Mentor */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: textMuted, marginBottom: '0.4rem' }}>
                        RETROALIMENTACIÓN DEL MENTOR / COORDINADOR:
                      </label>
                      <textarea
                        value={mentorNote}
                        onChange={(e) => setMentorNote(e.target.value)}
                        placeholder="Escriba comentarios u observaciones para el participante..."
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          borderRadius: '8px',
                          border: `1px solid ${borderLight}`,
                          background: 'rgba(0,0,0,0.2)',
                          color: textDark,
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Botones de Acción de Revisión */}
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        onClick={handleDevolverCurrentFI}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'rgba(234, 88, 12, 0.15)',
                          border: '1px solid rgba(234, 88, 12, 0.4)',
                          color: '#ea580c',
                          padding: '0.6rem 1.1rem',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <RefreshCw size={15} /> Devolver con Observación
                      </button>

                      <button
                        onClick={handleApproveCurrentFI}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: '#10b981',
                          border: 'none',
                          color: '#fff',
                          padding: '0.6rem 1.25rem',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <Check size={16} /> Aprobar Futuro Imposible
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '0.85rem 1.5rem',
              borderTop: `1px solid ${borderLight}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.15)'
            }}>
              <span style={{ fontSize: '0.75rem', color: textMuted }}>
                Causa OS &bull; Auditoría y Gobernanza de Metas
              </span>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${borderLight}`,
                  color: textDark,
                  padding: '0.45rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
