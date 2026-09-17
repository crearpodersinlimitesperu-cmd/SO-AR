import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Clock, Shirt, Sparkles, CheckCircle2, ShieldCheck, Calendar, Info, 
  Briefcase, Building, UserCheck, Lock, Eye, Mail, MessageSquare, Send, 
  Save, Plus, Trash2, Edit2, Check, RefreshCw, ExternalLink, Users, AlertCircle,
  Copy, ChevronDown, Award
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1AQlrvs7bWY7p9YmmnaCqnw7jDeAdmaMv/edit?gid=1887145916#gid=1887145916';

const DEFAULT_STAFF = [
  { id: 'linid', name: 'Linid', email: 'linid.valencia@crearpsl.net', role: 'Coordinadora Maestría' },
  { id: 'joyce', name: 'Joyce', email: 'joyce.villanueva@crearpsl.net', role: 'Coordinadora C1/C2' },
  { id: 'jose', name: 'Jose', email: 'jose.sanchez@crearpsl.net', role: 'Gerente de Operaciones' },
  { id: 'leyla', name: 'Leyla', email: 'leyla.pasquel@crearpsl.net', role: 'Coordinadora Maestría' },
  { id: 'diana', name: 'Diana', email: 'diana.rodriguez@crearpsl.net', role: 'Coordinadora Sede' }
];

const DEFAULT_SCHEDULE_ROWS = [
  // UNO (C1)
  {
    id: 'uno_jue_1',
    training: 'UNO',
    dia: 'Jueves',
    horario: '4:30 PM - Cierre',
    assignments: {
      linid: '-',
      joyce: '(Grounding)',
      jose: 'Cierre (Grounding C1)',
      leyla: '(Grounding)',
      diana: '(Grounding)'
    },
    vestimenta: 'Negro',
    nota: 'Grounding Inicial C1'
  },
  {
    id: 'uno_vie_1',
    training: 'UNO',
    dia: 'Viernes',
    horario: '7:30 AM - 3 PM',
    assignments: {
      linid: '-',
      joyce: '✓',
      jose: '✓',
      leyla: '-',
      diana: '✓'
    },
    vestimenta: 'Negro formal',
    nota: 'Jornada Mañana'
  },
  {
    id: 'uno_vie_2',
    training: 'UNO',
    dia: 'Viernes',
    horario: '5 PM - Cierre',
    assignments: {
      linid: 'Cierre Noche De Confianza',
      joyce: '✓',
      jose: '-',
      leyla: 'Noche De Confianza',
      diana: '✓'
    },
    vestimenta: 'Negro formal',
    nota: 'Noche de Confianza'
  },
  {
    id: 'uno_sab_1',
    training: 'UNO',
    dia: 'Sábado',
    horario: '8 AM - 4 PM',
    assignments: {
      linid: 'Caída Confianza',
      joyce: '✓',
      jose: '-',
      leyla: 'Caída Confianza',
      diana: '✓'
    },
    vestimenta: 'Polo negro + pantalón Negro',
    nota: 'Caída de Confianza'
  },
  {
    id: 'uno_sab_2',
    training: 'UNO',
    dia: 'Sábado',
    horario: '3 PM - Cierre',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '✓',
      leyla: '✓',
      diana: '-'
    },
    vestimenta: 'Polo negro + pantalón Negro',
    nota: 'Turno Tarde'
  },
  {
    id: 'uno_dom_1',
    training: 'UNO',
    dia: 'Domingo',
    horario: '8 AM - Cierre',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '✓',
      leyla: '✓',
      diana: '✓'
    },
    vestimenta: 'Polo Negro + Pantalón Negro',
    nota: 'Graduación y Cierre Ciclo'
  },

  // DOS (C2)
  {
    id: 'dos_jue_1',
    training: 'DOS',
    dia: 'Jueves',
    horario: '10:30 AM - 4 PM',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '✓',
      leyla: '✓',
      diana: '✓'
    },
    vestimenta: 'Negro formal',
    nota: 'Apertura Oficial C2'
  },
  {
    id: 'dos_jue_2',
    training: 'DOS',
    dia: 'Jueves',
    horario: '4 PM - Cierre',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '-',
      leyla: '-',
      diana: '-'
    },
    vestimenta: 'Negro formal',
    nota: 'Cierre Jueves C2'
  },
  {
    id: 'dos_vie_1',
    training: 'DOS',
    dia: 'Viernes',
    horario: '7:15 AM - 4 PM',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '✓',
      leyla: '✓',
      diana: '✓'
    },
    vestimenta: 'Polo negro + pantalón negro',
    nota: '14:01 PM Palabra Rota'
  },
  {
    id: 'dos_vie_2',
    training: 'DOS',
    dia: 'Viernes',
    horario: '4 PM - Cierre',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '-',
      leyla: '-',
      diana: '-'
    },
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Guardia y Logística'
  },
  {
    id: 'dos_sab_1',
    training: 'DOS',
    dia: 'Sábado',
    horario: '7:30 AM - 3 PM',
    assignments: {
      linid: 'TANQUE',
      joyce: '✓',
      jose: 'Rompimiento de Barreras',
      leyla: '✓',
      diana: '✓'
    },
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Tanque & Rompimiento de Barreras'
  },
  {
    id: 'dos_sab_2',
    training: 'DOS',
    dia: 'Sábado',
    horario: '3 PM - Cierre',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: 'Vuelos',
      leyla: '✓',
      diana: '✓'
    },
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Vuelos C2'
  },
  {
    id: 'dos_dom_1',
    training: 'DOS',
    dia: 'Domingo',
    horario: 'Inicio - Cierre',
    assignments: {
      linid: '✓',
      joyce: '-',
      jose: '-',
      leyla: '-',
      diana: '✓'
    },
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Jornada Dominical C2'
  },
  {
    id: 'dos_dom_2',
    training: 'DOS',
    dia: 'Domingo',
    horario: '3 PM - Cierre',
    assignments: {
      linid: '✓',
      joyce: '-',
      jose: '✓',
      leyla: '-',
      diana: '✓'
    },
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Cierre General C2'
  },

  // MAESTRÍA (MJ)
  {
    id: 'mj_vie_1',
    training: 'MAESTRÍA',
    dia: 'Viernes',
    horario: '3:00 PM - 9 PM',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '✓',
      leyla: '✓',
      diana: '✓'
    },
    vestimenta: 'Negro formal',
    nota: 'Alineamiento General Maestría'
  },
  {
    id: 'mj_sab_1',
    training: 'MAESTRÍA',
    dia: 'Sábado',
    horario: '8:30 AM - 12 M / 4 PM - 9 PM',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '✓',
      leyla: '✓',
      diana: '✓'
    },
    vestimenta: 'Camiseta Negra + pantalón negro',
    nota: 'Jornada Intensiva MJ'
  },
  {
    id: 'mj_dom_1',
    training: 'MAESTRÍA',
    dia: 'Domingo',
    horario: '8:30 AM - 12 M / 4 PM - CIERRE',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '✓',
      leyla: '✓',
      diana: '✓'
    },
    vestimenta: 'Camiseta Negra + pantalón negro',
    nota: 'FDS 4 El Viaje con Paul Sosa y Pase de Antorcha a las 18:00 PM'
  }
];

export default function HorariosEntrenamientoModal({ isOpen, onClose, currentUser }) {
  const [activeTab, setActiveTab] = useState('matriz_equipos'); // Por defecto abre en la matriz oficial si está disponible
  
  // Estados de la Matriz Oficial
  const [staffList, setStaffList] = useState(DEFAULT_STAFF);
  const [scheduleRows, setScheduleRows] = useState(DEFAULT_SCHEDULE_ROWS);
  const [filterTraining, setFilterTraining] = useState('TODOS');
  const [highlightPerson, setHighlightPerson] = useState('TODOS');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  
  // Estado para Modal de Notificaciones
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  // Identificación de permisos de Gerencia
  const isManager = useMemo(() => {
    if (!currentUser) return false;
    const role = (currentUser.role || currentUser.appRole || '').toLowerCase();
    return Boolean(
      currentUser.isGerente ||
      currentUser.isSuperAdmin ||
      role === 'gerente' ||
      role === 'gerente_sede' ||
      role.includes('gerente') ||
      role === 'superadmin' ||
      role === 'direccion' ||
      role === 'cfo' ||
      role === 'ceo'
    );
  }, [currentUser]);

  // Sede normalizada para aislamiento multi-sede
  const userSede = currentUser?.sede || 'Lima';
  const sedeKey = userSede.toLowerCase().trim().replace(/\s+/g, '_');
  const sedeDocId = `${sedeKey}_matriz_oficial`;

  // Sincronización en tiempo real con Firestore
  useEffect(() => {
    if (!isOpen) return;

    try {
      const docRef = doc(db, 'training_team_schedules', sedeDocId);
      const unsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
            setScheduleRows(data.rows);
          }
          if (data.staff && Array.isArray(data.staff) && data.staff.length > 0) {
            setStaffList(data.staff);
          }
          if (data.updatedAt) {
            setLastSaved(new Date(data.updatedAt).toLocaleTimeString());
          }
        }
      }, (err) => {
        console.warn('Error leyendo horarios en Firestore:', err);
      });

      return () => unsub();
    } catch (err) {
      console.warn('Error conectando a Firestore:', err);
    }
  }, [isOpen, sedeDocId]);

  // Guardar en Firestore (Exclusivo Gerentes)
  const handleSaveToFirestore = async () => {
    if (!isManager) return;
    setIsSaving(true);
    setSaveMessage('');
    try {
      const docRef = doc(db, 'training_team_schedules', sedeDocId);
      await setDoc(docRef, {
        sede: userSede,
        rows: scheduleRows,
        staff: staffList,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || currentUser?.email || 'Gerente de Sede',
        updatedByEmail: currentUser?.email || ''
      }, { merge: true });

      setLastSaved(new Date().toLocaleTimeString());
      setSaveMessage('✅ Horarios guardados y sincronizados con todos los asignados');
      setTimeout(() => setSaveMessage(''), 4000);
      setIsEditing(false);
    } catch (err) {
      console.error('Error al guardar en Firestore:', err);
      setSaveMessage('❌ Error al guardar en el servidor. Intente nuevamente.');
      setTimeout(() => setSaveMessage(''), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Restablecer a plantilla base del Sheet
  const handleResetToDefault = () => {
    if (!isManager) return;
    if (window.confirm('¿Deseas restablecer la matriz de horarios al formato original de la planilla oficial?')) {
      setScheduleRows(DEFAULT_SCHEDULE_ROWS);
      setStaffList(DEFAULT_STAFF);
      setSaveMessage('🔄 Matriz restablecida a la planilla oficial. Recuerda guardar cambios.');
    }
  };

  // Modificar celda de asignación
  const handleCellChange = (rowId, staffId, value) => {
    if (!isManager || !isEditing) return;
    setScheduleRows(prev => prev.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          assignments: {
            ...row.assignments,
            [staffId]: value
          }
        };
      }
      return row;
    }));
  };

  // Modificar campo de fila (horario, vestimenta, nota)
  const handleRowFieldChange = (rowId, field, value) => {
    if (!isManager || !isEditing) return;
    setScheduleRows(prev => prev.map(row => {
      if (row.id === rowId) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  // Agregar fila
  const handleAddRow = (trainingType = 'UNO') => {
    if (!isManager) return;
    const newId = `custom_${trainingType.toLowerCase()}_${Date.now()}`;
    const initialAssignments = {};
    staffList.forEach(s => { initialAssignments[s.id] = '-'; });

    const newRow = {
      id: newId,
      training: trainingType,
      dia: 'Viernes',
      horario: '9:00 AM - 2:00 PM',
      assignments: initialAssignments,
      vestimenta: 'Polo negro + pantalón negro',
      nota: 'Turno Adicional'
    };

    setScheduleRows(prev => [...prev, newRow]);
    setIsEditing(true);
  };

  // Eliminar fila
  const handleDeleteRow = (rowId) => {
    if (!isManager || !isEditing) return;
    setScheduleRows(prev => prev.filter(r => r.id !== rowId));
  };

  // Helper de badges para tareas especiales
  const renderAssignmentBadge = (val, isInteractive = false, rowId = '', staffId = '') => {
    const rawVal = (val || '-').trim();
    
    if (isInteractive && isEditing && isManager) {
      return (
        <input
          type="text"
          value={rawVal}
          onChange={(e) => handleCellChange(rowId, staffId, e.target.value)}
          placeholder="✓, -, o tarea"
          style={{
            width: '100%',
            maxWidth: '120px',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(41, 171, 226, 0.4)',
            color: '#fff',
            borderRadius: '6px',
            padding: '4px 6px',
            fontSize: '0.78rem',
            textAlign: 'center'
          }}
        />
      );
    }

    if (rawVal === '✓' || rawVal.toLowerCase() === 'ok' || rawVal.toLowerCase() === 'si') {
      return (
        <span style={{ 
          background: 'rgba(16, 185, 129, 0.2)', 
          color: '#34d399', 
          border: '1px solid rgba(16, 185, 129, 0.4)', 
          padding: '2px 8px', 
          borderRadius: '12px', 
          fontWeight: 800,
          fontSize: '0.82rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px'
        }}>
          ✓
        </span>
      );
    }

    if (rawVal === '-' || rawVal === '' || rawVal.toLowerCase() === 'no') {
      return (
        <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 600, fontSize: '0.85rem' }}>
          —
        </span>
      );
    }

    // Tareas específicas
    let bg = 'rgba(59, 130, 246, 0.2)';
    let color = '#60a5fa';
    let border = 'rgba(59, 130, 246, 0.4)';

    if (rawVal.toLowerCase().includes('tanque')) {
      bg = 'rgba(245, 158, 11, 0.25)';
      color = '#fbbf24';
      border = 'rgba(245, 158, 11, 0.6)';
    } else if (rawVal.toLowerCase().includes('vuelo')) {
      bg = 'rgba(236, 72, 153, 0.25)';
      color = '#f472b6';
      border = 'rgba(236, 72, 153, 0.6)';
    } else if (rawVal.toLowerCase().includes('barrera')) {
      bg = 'rgba(239, 68, 68, 0.25)';
      color = '#f87171';
      border = 'rgba(239, 68, 68, 0.6)';
    } else if (rawVal.toLowerCase().includes('confianza')) {
      bg = 'rgba(139, 92, 246, 0.25)';
      color = '#c084fc';
      border = 'rgba(139, 92, 246, 0.6)';
    } else if (rawVal.toLowerCase().includes('grounding')) {
      bg = 'rgba(20, 184, 166, 0.25)';
      color = '#2dd4bf';
      border = 'rgba(20, 184, 166, 0.6)';
    }

    return (
      <span style={{ 
        background: bg, 
        color: color, 
        border: `1px solid ${border}`, 
        padding: '2px 8px', 
        borderRadius: '8px', 
        fontSize: '0.74rem', 
        fontWeight: 700,
        display: 'inline-block',
        maxWidth: '140px',
        whiteSpace: 'normal',
        lineHeight: '1.2'
      }}>
        {rawVal}
      </span>
    );
  };

  // Filtrado de filas
  const filteredRows = useMemo(() => {
    return scheduleRows.filter(row => {
      if (filterTraining !== 'TODOS' && row.training !== filterTraining) {
        return false;
      }
      return true;
    });
  }, [scheduleRows, filterTraining]);

  // Mensaje para Google Chat
  const generateGoogleChatMessage = () => {
    const assignedNames = staffList.map(s => s.name).join(', ');
    return `📢 *ATENCIÓN EQUIPO OPERATIVO — HORARIOS DE ENTRENAMIENTO OFICIALES PUBLICADOS* 📅\n\n` +
      `Estimado equipo asignado (*${assignedNames}*):\n\n` +
      `La Gerencia de Sede (*${userSede}*) ha configurado y puesto a disposición los *Horarios y Turnos Operativos Oficiales* para los entrenamientos UNO, DOS y MAESTRÍA.\n\n` +
      `🔗 *Consulta la Matriz en Vivo:* https://centro-operativo-cpsl.web.app\n` +
      `📄 *Planilla Oficial de Referencia:* ${SPREADSHEET_URL}\n\n` +
      `📌 *Puntos Clave:* \n` +
      `• Revisa tus roles asignados (Groundings, Noches de Confianza, Tanque, Rompimiento de Barreras, Vuelos).\n` +
      `• Cumplir estrictamente el Código de Vestimenta por jornada (Negro formal / Polo oficial).\n` +
      `• Cualquier duda de asignación, coordinar directamente con Gerencia.\n\n` +
      `_Equipo Crear Poder Sin Límites — Plataforma Causa OS_`;
  };

  // Copiar mensaje para Google Chat y abrirlo
  const handleOpenGoogleChat = () => {
    const msg = generateGoogleChatMessage();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg).then(() => {
        setCopyFeedback('¡Mensaje copiado! Abriendo Google Chat...');
        setTimeout(() => setCopyFeedback(''), 3000);
      });
    }
    window.open('https://chat.google.com/u/0/', '_blank');
  };

  // Enviar Correo a todos los asignados
  const handleSendBatchEmail = () => {
    const emails = staffList.map(s => s.email).filter(Boolean).join(',');
    const subject = `📅 Horarios Oficiales de Entrenamiento Asignados — Sede ${userSede} (Causa OS)`;
    const body = `Estimado Equipo Asignado,\n\n` +
      `Se han actualizado y publicado oficialmente los Horarios y Turnos Operativos de Entrenamiento en la sede ${userSede}.\n\n` +
      `Por favor ingresa a la plataforma Causa OS para revisar el detalle de tus jornadas, salas y tareas específicas asignadas:\n` +
      `👉 https://centro-operativo-cpsl.web.app\n\n` +
      `Planilla Oficial de Turnos:\n` +
      `${SPREADSHEET_URL}\n\n` +
      `Saludos cordiales,\n` +
      `Gerencia de Sede ${userSede}\n` +
      `Crear Poder Sin Límites`;

    window.location.href = `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Copiar correos al portapapeles
  const handleCopyEmails = () => {
    const emails = staffList.map(s => s.email).filter(Boolean).join(', ');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(emails).then(() => {
        setCopyFeedback('¡Correos copiados al portapapeles!');
        setTimeout(() => setCopyFeedback(''), 3000);
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div 
        className="glass-panel" 
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg-card, #0f172a)',
          borderRadius: '16px',
          border: '1px solid rgba(41, 171, 226, 0.3)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(41, 171, 226, 0.15)',
          padding: 'clamp(1rem, 2.5vw, 1.8rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
          color: 'var(--text-main, #f8fafc)'
        }}
      >
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
              <Clock size={28} color="var(--crear-cyan, #29abe2)" />
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-heading, #fff)', letterSpacing: '-0.5px' }}>
                Horarios y Turnos Operativos del Equipo
              </h2>
              <span style={{ 
                background: isManager ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: isManager ? '#f59e0b' : '#60a5fa',
                border: `1px solid ${isManager ? 'rgba(245, 158, 11, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {isManager ? <Lock size={12} /> : <Eye size={12} />}
                {isManager ? `Gestión Gerencial (${userSede})` : `Vista Oficial Asignados (${userSede})`}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted, #94a3b8)' }}>
              Protocolo de jornadas, turnos, asignación de salas y fisionomía para <strong>Equipo de Oficina, Gerentes de Sede y Coordinadores</strong> — <strong>CREAR PODER SIN LÍMITES</strong>.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="btn-icon"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted, #94a3b8)',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* TABS DE FILTRO */}
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          {[
            { id: 'matriz_equipos', label: '🗓️ Horarios de Equipos (Matriz Oficial)', highlight: true },
            { id: 'todos_equipo', label: '👥 Resumen de Todo el Equipo' },
            { id: 'oficina', label: '🏢 Equipo de Oficina (Soporte)' },
            { id: 'gerentes', label: '👔 Gerentes de Sede (Nivel 8)' },
            { id: 'coordinadores', label: '🎯 Coordinadores (CC1Y2 & CMJ)' },
            { id: 'pulsos_reportes', label: '⚡ Pulsos & Reportes Post-FDS (Nodus & Causa OS)' },
            { id: 'sala_c1', label: '🟣 Sala C1' },
            { id: 'sala_c2', label: '🔵 Sala C2' },
            { id: 'sala_mj', label: '🟡 Sala Maestría' }
          ].map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  border: isSelected 
                    ? (tab.highlight ? '1px solid #f59e0b' : '1px solid var(--crear-cyan, #29abe2)') 
                    : (tab.highlight ? '1px dashed rgba(245, 158, 11, 0.4)' : '1px solid rgba(255,255,255,0.08)'),
                  background: isSelected 
                    ? (tab.highlight ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(41, 171, 226, 0.2))' : 'rgba(41, 171, 226, 0.15)') 
                    : (tab.highlight ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.03)'),
                  color: isSelected 
                    ? (tab.highlight ? '#fbbf24' : 'var(--crear-cyan, #29abe2)') 
                    : (tab.highlight ? '#f59e0b' : 'var(--text-muted, #94a3b8)'),
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* FEEDBACK DE GUARDADO O COPIADO */}
        {saveMessage && (
          <div style={{
            background: saveMessage.includes('❌') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            border: `1px solid ${saveMessage.includes('❌') ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            color: saveMessage.includes('❌') ? '#fca5a5' : '#6ee7b7',
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Sparkles size={16} />
            <span>{saveMessage}</span>
          </div>
        )}

        {/* CONTENIDO PRINCIPAL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* ========================================================================= */}
          {/* TAB: MATRIZ OFICIAL DE HORARIOS DE EQUIPOS (PLANILLA GOOGLE SHEETS)        */}
          {/* ========================================================================= */}
          {activeTab === 'matriz_equipos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* BARRA SUPERIOR DE ACCIONES Y ENLACE AL SHEET */}
              <div 
                style={{ 
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <Calendar size={18} color="#f59e0b" />
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                      Planilla Oficial de Horarios & Turnos de Equipos
                    </h3>
                    <a 
                      href={SPREADSHEET_URL} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.74rem',
                        color: 'var(--crear-cyan, #29abe2)',
                        textDecoration: 'none',
                        background: 'rgba(41, 171, 226, 0.12)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(41, 171, 226, 0.25)'
                      }}
                      title="Abrir hoja de cálculo oficial en Google Sheets"
                    >
                      <ExternalLink size={11} />
                      Ver Google Sheet
                    </a>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                    {isManager 
                      ? `Como Gerente de Sede, tienes permisos exclusivos para editar horarios, guardar cambios y notificar a los asignados.`
                      : `Matriz oficial sincronizada con la Gerencia. Consulta tus turnos y código de vestimenta asignado.`}
                    {lastSaved && ` • Última sincronización: ${lastSaved}`}
                  </p>
                </div>

                {/* BOTONERAS DE ACCIÓN */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {/* Botón de Notificación (para Gerentes) */}
                  {isManager && (
                    <button
                      onClick={() => setShowNotifyModal(true)}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.45rem 0.9rem',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}
                      title="Notificar a los asignados por Correo y Google Chat"
                    >
                      <Send size={14} />
                      📢 Notificar Disponibilidad
                    </button>
                  )}

                  {/* Botón de Edición (para Gerentes) */}
                  {isManager && (
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      style={{
                        background: isEditing ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                        color: isEditing ? '#f87171' : '#fbbf24',
                        border: `1px solid ${isEditing ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                        borderRadius: '8px',
                        padding: '0.45rem 0.9rem',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Edit2 size={14} />
                      {isEditing ? 'Bloquear Edición' : 'Editar Horarios'}
                    </button>
                  )}

                  {/* Guardar en Firestore (para Gerentes) */}
                  {isManager && (
                    <button
                      onClick={handleSaveToFirestore}
                      disabled={isSaving}
                      style={{
                        background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.45rem 0.9rem',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: isSaving ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                      }}
                    >
                      <Save size={14} />
                      {isSaving ? 'Guardando...' : 'Guardar en Servidor'}
                    </button>
                  )}

                  {/* Botón para restablecer plantilla base */}
                  {isManager && isEditing && (
                    <button
                      onClick={handleResetToDefault}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        color: 'var(--text-muted, #94a3b8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '0.45rem 0.7rem',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                      title="Restablecer a valores iniciales de la planilla de Google Sheets"
                    >
                      <RefreshCw size={13} />
                      Plantilla Base
                    </button>
                  )}
                </div>
              </div>

              {/* FILTROS Y CONTROLES DE VISTA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
                {/* Filtro por Entrenamiento */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Entrenamiento:</span>
                  {[
                    { id: 'TODOS', label: 'Todos' },
                    { id: 'UNO', label: '🟣 UNO (C1)' },
                    { id: 'DOS', label: '🔵 DOS (C2)' },
                    { id: 'MAESTRÍA', label: '🟡 Maestría (MJ)' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilterTraining(f.id)}
                      style={{
                        padding: '0.3rem 0.7rem',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: filterTraining === f.id ? 700 : 500,
                        cursor: 'pointer',
                        border: filterTraining === f.id ? '1px solid var(--crear-cyan)' : '1px solid rgba(255,255,255,0.1)',
                        background: filterTraining === f.id ? 'rgba(41, 171, 226, 0.2)' : 'rgba(255,255,255,0.04)',
                        color: filterTraining === f.id ? '#fff' : 'var(--text-muted)'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Filtro / Resaltado por Colaborador */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Destacar persona:</span>
                  <select
                    value={highlightPerson}
                    onChange={(e) => setHighlightPerson(e.target.value)}
                    style={{
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      borderRadius: '6px',
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.78rem'
                    }}
                  >
                    <option value="TODOS">Ver todos los asignados</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TABLA PRINCIPAL DE HORARIOS */}
              <div 
                className="custom-scrollbar"
                style={{ 
                  overflowX: 'auto', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.6)'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                      <th style={{ padding: '0.75rem 0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>ENTRENAMIENTO</th>
                      <th style={{ padding: '0.75rem 0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>DÍA</th>
                      <th style={{ padding: '0.75rem 0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>HORARIO</th>
                      
                      {/* Columnas dinámicas de Personas */}
                      {staffList.map(staff => {
                        const isHighlighted = highlightPerson === staff.id;
                        return (
                          <th 
                            key={staff.id} 
                            style={{ 
                              padding: '0.75rem 0.8rem', 
                              textAlign: 'center',
                              color: isHighlighted ? '#fbbf24' : '#fff',
                              fontWeight: 800,
                              background: isHighlighted ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                              borderLeft: '1px solid rgba(255,255,255,0.05)',
                              borderRight: '1px solid rgba(255,255,255,0.05)'
                            }}
                          >
                            <div>{staff.name}</div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                              {staff.role || 'Staff'}
                            </div>
                          </th>
                        );
                      })}

                      <th style={{ padding: '0.75rem 0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>VESTIMENTA</th>
                      {isEditing && isManager && (
                        <th style={{ padding: '0.75rem 0.8rem', textAlign: 'center', color: 'var(--text-muted)' }}>ACCIONES</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, idx) => {
                      const isUno = row.training === 'UNO';
                      const isDos = row.training === 'DOS';
                      const isMj = row.training === 'MAESTRÍA';

                      const trainingColor = isUno ? '#a78bfa' : isDos ? 'var(--crear-cyan, #29abe2)' : '#f59e0b';
                      const trainingBg = isUno ? 'rgba(139, 92, 246, 0.15)' : isDos ? 'rgba(41, 171, 226, 0.15)' : 'rgba(245, 158, 11, 0.15)';

                      return (
                        <tr 
                          key={row.id}
                          style={{ 
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'
                          }}
                        >
                          {/* Entrenamiento */}
                          <td style={{ padding: '0.65rem 0.8rem', whiteSpace: 'nowrap' }}>
                            <span style={{
                              background: trainingBg,
                              color: trainingColor,
                              border: `1px solid ${trainingColor}40`,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 800
                            }}>
                              {row.training}
                            </span>
                            {row.nota && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {row.nota}
                              </div>
                            )}
                          </td>

                          {/* Día */}
                          <td style={{ padding: '0.65rem 0.8rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
                            {row.dia}
                          </td>

                          {/* Horario */}
                          <td style={{ padding: '0.65rem 0.8rem', whiteSpace: 'nowrap' }}>
                            {isEditing && isManager ? (
                              <input
                                type="text"
                                value={row.horario}
                                onChange={(e) => handleRowFieldChange(row.id, 'horario', e.target.value)}
                                style={{
                                  background: 'rgba(0,0,0,0.3)',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  color: '#fff',
                                  borderRadius: '6px',
                                  padding: '4px 6px',
                                  fontSize: '0.78rem',
                                  width: '140px'
                                }}
                              />
                            ) : (
                              <span style={{ color: 'var(--crear-cyan, #29abe2)', fontWeight: 700 }}>
                                {row.horario}
                              </span>
                            )}
                          </td>

                          {/* Asignaciones por persona */}
                          {staffList.map(staff => {
                            const val = row.assignments?.[staff.id] || '-';
                            const isHighlighted = highlightPerson === staff.id;
                            return (
                              <td 
                                key={staff.id}
                                style={{ 
                                  padding: '0.65rem 0.8rem', 
                                  textAlign: 'center',
                                  background: isHighlighted ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                                  borderLeft: '1px solid rgba(255,255,255,0.03)',
                                  borderRight: '1px solid rgba(255,255,255,0.03)'
                                }}
                              >
                                {renderAssignmentBadge(val, true, row.id, staff.id)}
                              </td>
                            );
                          })}

                          {/* Vestimenta */}
                          <td style={{ padding: '0.65rem 0.8rem', whiteSpace: 'nowrap' }}>
                            {isEditing && isManager ? (
                              <input
                                type="text"
                                value={row.vestimenta}
                                onChange={(e) => handleRowFieldChange(row.id, 'vestimenta', e.target.value)}
                                style={{
                                  background: 'rgba(0,0,0,0.3)',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  color: '#fff',
                                  borderRadius: '6px',
                                  padding: '4px 6px',
                                  fontSize: '0.78rem',
                                  width: '160px'
                                }}
                              />
                            ) : (
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                color: row.vestimenta?.toLowerCase().includes('formal') ? '#e2e8f0' : '#cbd5e1',
                                fontSize: '0.76rem'
                              }}>
                                <Shirt size={13} color="var(--crear-cyan)" />
                                {row.vestimenta}
                              </span>
                            )}
                          </td>

                          {/* Acciones de eliminación */}
                          {isEditing && isManager && (
                            <td style={{ padding: '0.65rem 0.8rem', textAlign: 'center' }}>
                              <button
                                onClick={() => handleDeleteRow(row.id)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  color: '#f87171',
                                  borderRadius: '6px',
                                  padding: '3px 6px',
                                  cursor: 'pointer'
                                }}
                                title="Eliminar fila"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* BOTÓN PARA AGREGAR FILA (SOLO GERENTES) */}
              {isManager && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Agregar nuevo turno:</span>
                  <button
                    onClick={() => handleAddRow('UNO')}
                    style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      color: '#c084fc',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={13} /> Fila UNO (C1)
                  </button>
                  <button
                    onClick={() => handleAddRow('DOS')}
                    style={{
                      background: 'rgba(41, 171, 226, 0.15)',
                      border: '1px solid rgba(41, 171, 226, 0.4)',
                      color: 'var(--crear-cyan)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={13} /> Fila DOS (C2)
                  </button>
                  <button
                    onClick={() => handleAddRow('MAESTRÍA')}
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#fbbf24',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={13} /> Fila Maestría (MJ)
                  </button>
                </div>
              )}

              {/* LEYENDA Y NOTAS IMPORTANTES DE SALA */}
              <div 
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: '10px', 
                  padding: '0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.8rem'
                }}
              >
                <div style={{ fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Info size={15} color="var(--crear-cyan)" />
                  <span>Referencias Operativas de la Planilla Oficial</span>
                </div>
                <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', color: 'var(--text-muted)' }}>
                  <div>• <strong>C1 (UNO):</strong> Jueves Cierre (Grounding) • Viernes Noche de Confianza • Sábado Caída de Confianza.</div>
                  <div>• <strong>C2 (DOS):</strong> Viernes 14:01 Palabra Rota • Sábado Tanque, Rompimiento de Barreras y Vuelos.</div>
                  <div>• <strong>Maestría (MJ):</strong> Domingo FDS 4 "El Viaje" con Paul Sosa y Pase de Antorcha a las 18:00 PM.</div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TABS ORIGINALES DE HORARIOS OPERATIVOS (PRESERVADOS ÍNTEGRAMENTE)          */}
          {/* ========================================================================= */}
          {activeTab === 'todos_equipo' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem', color: '#60a5fa' }}>
                  <Building size={20} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Equipo de Oficina</h3>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.84rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                  <li><strong>Lunes a Miércoles:</strong> 09:00 - 18:00 (Oficina regular).</li>
                  <li><strong>Jueves a Viernes:</strong> 08:30 - 20:00 (Soporte integral y aperturas de sala).</li>
                  <li><strong>Sábado:</strong> 08:00 - 14:00 (Guardias logísticas y enrolamiento).</li>
                  <li><strong>Domingo:</strong> Descanso / Cierre remoto si aplica.</li>
                </ul>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem', color: '#f59e0b' }}>
                  <Briefcase size={20} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Gerentes de Sede (Nivel 8)</h3>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.84rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                  <li><strong>Presencia Clave:</strong> Miércoles (alineamiento) a Domingo (cierre).</li>
                  <li><strong>Noche de Confianza:</strong> Viernes en sala hasta finalizar dinámica.</li>
                  <li><strong>Monitoreo de Quotas:</strong> Seguimiento diario de enrolamiento de sedes.</li>
                  <li><strong>Reportes FDS:</strong> Cierre de auditoría y pulso el domingo noche.</li>
                </ul>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem', color: '#34d399' }}>
                  <UserCheck size={20} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Coordinadores (CC1Y2 & CMJ)</h3>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.84rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                  <li><strong>CC1 / CC2:</strong> Apertura de sala 07:30 AM, control de asistencia y logística.</li>
                  <li><strong>CMJ:</strong> Acompañamiento en salón, música, fisionomía y atención a participantes.</li>
                  <li><strong>Graduación:</strong> Domingo 18:00 - 21:30 en tarima.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'oficina' && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '4px solid #3b82f6', borderRadius: '12px' }}>
              <h3 style={{ color: '#60a5fa', margin: '0 0 0.8rem 0' }}>🏢 Protocolo Operativo del Equipo de Oficina</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                El equipo de oficina garantiza la continuidad del servicio al cliente, cobranzas, emisión de certificados y respaldo logístico durante toda la semana de entrenamiento.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', fontSize: '0.82rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px' }}>
                  <strong style={{ color: '#fff' }}>Atención al Participante:</strong><br/>
                  09:00 - 13:00 y 14:00 - 18:00 (Lunes a Viernes)
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px' }}>
                  <strong style={{ color: '#fff' }}>Soporte de Sala:</strong><br/>
                  Jueves y Viernes hasta las 20:30 PM en rotación de guardias.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gerentes' && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '4px solid #f59e0b', borderRadius: '12px' }}>
              <h3 style={{ color: '#f59e0b', margin: '0 0 0.8rem 0' }}>👔 Directiva para Gerentes de Sede (Nivel 8)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                Los gerentes son los máximos custodios de la experiencia del participante, la integridad de la sede y el cumplimiento de las metas del ciclo.
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.84rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                <li>Supervisión presencial de cada apertura y pase de confianza.</li>
                <li>Auditoría continua del tablero de metas y pulso de IMOs por sede.</li>
                <li>Validación y publicación de la Planilla Oficial de Horarios en Causa OS.</li>
              </ul>
            </div>
          )}

          {activeTab === 'coordinadores' && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '4px solid #10b981', borderRadius: '12px' }}>
              <h3 style={{ color: '#34d399', margin: '0 0 0.8rem 0' }}>🎯 Turnos y Tareas de Coordinadores (CC1Y2 & CMJ)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                Responsables directos de la ejecución operativa de sala, música, control de tiempo, lista de asistencia y fisionomía de los entrenamientos.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <strong>C1:</strong> Grounding, Noche de Confianza, Caída de Confianza y Graduación.
                </div>
                <div style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <strong>C2:</strong> Palabra Rota (14:01 PM), Tanque, Rompimiento de Barreras y Vuelos.
                </div>
                <div style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <strong>Maestría:</strong> Alineamiento, El Viaje y Pase de Antorcha dominical.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pulsos_reportes' && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '4px solid #ec4899', borderRadius: '12px' }}>
              <h3 style={{ color: '#f472b6', margin: '0 0 0.8rem 0' }}>⚡ Pulsos & Reportes Post-FDS (Nodus & Causa OS)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                Al finalizar cada fin de semana de entrenamiento, cada sede emite su reporte de asistencia, retención de participantes, recaudación e incidencias para el directorio ejecutivo.
              </p>
            </div>
          )}

          {activeTab === 'sala_c1' && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '4px solid #8b5cf6', borderRadius: '12px' }}>
              <h3 style={{ color: '#a78bfa', margin: '0 0 0.8rem 0' }}>🟣 Horarios de Sala: Capítulo UNO (C1)</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.7' }}>
                • Jueves: 4:30 PM - Cierre (Negro formal / Grounding)<br/>
                • Viernes: 7:30 AM - 3:00 PM y 5:00 PM - Cierre (Noche de Confianza, Negro formal)<br/>
                • Sábado: 8:00 AM - 4:00 PM y 3:00 PM - Cierre (Polo negro + pantalón negro)<br/>
                • Domingo: 8:00 AM - Cierre (Graduación)
              </p>
            </div>
          )}

          {activeTab === 'sala_c2' && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '4px solid #29abe2', borderRadius: '12px' }}>
              <h3 style={{ color: 'var(--crear-cyan)', margin: '0 0 0.8rem 0' }}>🔵 Horarios de Sala: Capítulo DOS (C2)</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.7' }}>
                • Jueves: 10:30 AM - 4:00 PM y 4:00 PM - Cierre (Negro formal)<br/>
                • Viernes: 7:15 AM - 4:00 PM y 4:00 PM - Cierre (14:01 PM Palabra Rota)<br/>
                • Sábado: 7:30 AM - 3:00 PM y 3:00 PM - Cierre (Polo negro + pantalón negro - Tanque / Rompimiento / Vuelos)<br/>
                • Domingo: Inicio - Cierre y 3:00 PM - Cierre
              </p>
            </div>
          )}

          {activeTab === 'sala_mj' && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '4px solid #f59e0b', borderRadius: '12px' }}>
              <h3 style={{ color: '#f59e0b', margin: '0 0 0.8rem 0' }}>🟡 Horarios de Sala: Maestría del Juego (MJ)</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.7' }}>
                • Viernes: 3:00 PM - 9:00 PM (Alineamiento, Negro formal)<br/>
                • Sábado: 8:30 AM - 12:00 PM y 4:00 PM - 9:00 PM (Camiseta negra + pantalón negro)<br/>
                • Domingo: 8:30 AM - 12:00 PM y 4:00 PM - Cierre (FDS 4 El Viaje con Paul Sosa y Pase de Antorcha a las 18:00 PM)
              </p>
            </div>
          )}

        </div>

        {/* NOTA DE VESTIMENTA OFICIAL Y SNEAKERS */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(41, 171, 226, 0.05))', 
            border: '1px solid rgba(245, 158, 11, 0.35)', 
            borderRadius: '12px', 
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f59e0b', fontWeight: 800, fontSize: '0.9rem' }}>
            <Shirt size={18} />
            <span>CÓDIGO DE VESTIMENTA & AUTORIZACIÓN 2026 — CREAR PODER SIN LÍMITES</span>
          </div>
          <div style={{ fontSize: '0.82rem', lineHeight: '1.5', color: 'var(--text-main)' }}>
            <p style={{ margin: '0 0 0.3rem 0' }}>
              • <strong>Equipo de Oficina:</strong> Jueves y viernes de entrenamiento visten de etiqueta negra formal. Sábados y domingos utilizan polos oficiales combinados con pantalón negro y calzado sobrio.
            </p>
            <p style={{ margin: '0 0 0.3rem 0' }}>
              • <strong>Gerentes y Coordinadores:</strong> Etiqueta negra formal en aperturas, Noches de Confianza y groundings iniciales. Polos oficiales el fin de semana.
            </p>
            <p style={{ margin: 0, color: 'var(--crear-cyan)', fontWeight: 600 }}>
              👟 <strong>Entrenador / Coach:</strong> Autorización formal de utilizar <strong>zapatillas deportivas negras limpias</strong> en tarima y salón para cuidar su postura y rendimiento en jornadas de más de 10 horas.
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Sede Operativa: <strong style={{ color: '#fff' }}>{userSede}</strong>
          </div>
          <button 
            onClick={onClose}
            className="btn-primary"
            style={{
              padding: '0.55rem 1.6rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Entendido / Cerrar
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MODAL DE NOTIFICACIÓN MULTI-CANAL (CORREO & GOOGLE CHAT)                   */}
        {/* ========================================================================= */}
        {showNotifyModal && (
          <div 
            onClick={() => setShowNotifyModal(false)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(5px)',
              zIndex: 100000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <div 
              onClick={e => e.stopPropagation()}
              style={{
                background: '#0f172a',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '16px',
                padding: '1.5rem',
                maxWidth: '650px',
                width: '100%',
                boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(16, 185, 129, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                color: '#fff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.7rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Send size={22} color="#10b981" />
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                    Notificar Horarios a Asignados
                  </h3>
                </div>
                <button 
                  onClick={() => setShowNotifyModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              {copyFeedback && (
                <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '0.5rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem', textAlign: 'center' }}>
                  {copyFeedback}
                </div>
              )}

              {/* LISTA DE DESTINATARIOS */}
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
                  👥 Colaboradores Asignados en la Planilla ({staffList.length}):
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {staffList.map(s => (
                    <span 
                      key={s.id} 
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: '#cbd5e1'
                      }}
                    >
                      {s.name} ({s.email})
                    </span>
                  ))}
                </div>
              </div>

              {/* VISTA PREVIA DEL MENSAJE PARA GOOGLE CHAT */}
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
                  💬 Mensaje Formateado para Google Chat:
                </div>
                <div 
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '0.8rem',
                    fontSize: '0.78rem',
                    lineHeight: '1.45',
                    color: '#e2e8f0',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace'
                  }}
                >
                  {generateGoogleChatMessage()}
                </div>
              </div>

              {/* BOTONES DE DISPARO */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem', marginTop: '0.5rem' }}>
                {/* Google Chat */}
                <button
                  onClick={handleOpenGoogleChat}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.7rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  <MessageSquare size={16} />
                  Copiar & Abrir Google Chat
                </button>

                {/* Enviar Correo */}
                <button
                  onClick={handleSendBatchEmail}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.7rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Mail size={16} />
                  Enviar Correo Masivo
                </button>

                {/* Copiar Correos */}
                <button
                  onClick={handleCopyEmails}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '0.7rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Copy size={16} />
                  Copiar Lista de Emails
                </button>
              </div>

              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.2rem' }}>
                💡 Al hacer clic en "Abrir Google Chat", el mensaje completo queda en tu portapapeles para pegarlo directamente en el espacio o grupo de sala.
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
