import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Clock, Shirt, Sparkles, CheckCircle2, ShieldCheck, Calendar, Info, 
  Briefcase, Building, UserCheck, Lock, Eye, Mail, MessageSquare, Send, 
  Save, Plus, Trash2, Edit2, Check, Users, AlertCircle, Copy, UserPlus, 
  ChevronRight, ArrowRight
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

// Personal inicial por defecto (SIN LEYLA PASQUEL - 100% desvinculada)
const INITIAL_STAFF = [
  { id: 'linid', name: 'Linid Valencia', email: 'linid.valencia@crearpsl.net', role: 'Coordinadora Maestría' },
  { id: 'joyce', name: 'Joyce Villanueva', email: 'joyce.villanueva@crearpsl.net', role: 'Coordinadora C1/C2' },
  { id: 'jose', name: 'Jose Sanchez', email: 'jose.sanchez@crearpsl.net', role: 'Gerente de Operaciones' },
  { id: 'diana', name: 'Diana Rodriguez', email: 'diana.rodriguez@crearpsl.net', role: 'Coordinadora Sede' }
];

// Matriz inicial de turnos y tareas por defecto (Nodus / Causa OS)
const INITIAL_SCHEDULE_ROWS = [
  // UNO (C1)
  {
    id: 'uno_jue_1',
    training: 'UNO',
    dia: 'Jueves',
    horario: '4:30 PM - Cierre',
    assignments: {
      linid: '—',
      joyce: '(Grounding)',
      jose: 'Cierre (Grounding C1)',
      diana: '(Grounding)'
    },
    vestimenta: 'Negro',
    nota: 'Grounding Inicial C1'
  },
  {
    id: 'uno_vie_1',
    training: 'UNO',
    dia: 'Viernes',
    horario: '7:30 AM - 3:00 PM',
    assignments: {
      linid: '—',
      joyce: '✓',
      jose: '✓',
      diana: '✓'
    },
    vestimenta: 'Negro formal',
    nota: 'Jornada Mañana'
  },
  {
    id: 'uno_vie_2',
    training: 'UNO',
    dia: 'Viernes',
    horario: '5:00 PM - Cierre',
    assignments: {
      linid: 'Cierre Noche De Confianza',
      joyce: '✓',
      jose: '—',
      diana: '✓'
    },
    vestimenta: 'Negro formal',
    nota: 'Noche de Confianza'
  },
  {
    id: 'uno_sab_1',
    training: 'UNO',
    dia: 'Sábado',
    horario: '8:00 AM - 4:00 PM',
    assignments: {
      linid: 'Caída Confianza',
      joyce: '✓',
      jose: '—',
      diana: '✓'
    },
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Caída de Confianza'
  },
  {
    id: 'uno_sab_2',
    training: 'UNO',
    dia: 'Sábado',
    horario: '3:00 PM - Cierre',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '✓',
      diana: '—'
    },
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Turno Tarde'
  },
  {
    id: 'uno_dom_1',
    training: 'UNO',
    dia: 'Domingo',
    horario: '8:00 AM - Cierre',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '✓',
      diana: '✓'
    },
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Graduación y Cierre Ciclo'
  },

  // DOS (C2)
  {
    id: 'dos_jue_1',
    training: 'DOS',
    dia: 'Jueves',
    horario: '10:30 AM - 4:00 PM',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '✓',
      diana: '✓'
    },
    vestimenta: 'Negro formal',
    nota: 'Apertura Oficial C2'
  },
  {
    id: 'dos_jue_2',
    training: 'DOS',
    dia: 'Jueves',
    horario: '4:00 PM - Cierre',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '—',
      diana: '—'
    },
    vestimenta: 'Negro formal',
    nota: 'Cierre Jueves C2'
  },
  {
    id: 'dos_vie_1',
    training: 'DOS',
    dia: 'Viernes',
    horario: '7:15 AM - 4:00 PM',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '✓',
      diana: '✓'
    },
    vestimenta: 'Polo negro + pantalón negro',
    nota: '14:01 PM Palabra Rota'
  },
  {
    id: 'dos_vie_2',
    training: 'DOS',
    dia: 'Viernes',
    horario: '4:00 PM - Cierre',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '—',
      diana: '—'
    },
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Guardia y Logística'
  },
  {
    id: 'dos_sab_1',
    training: 'DOS',
    dia: 'Sábado',
    horario: '7:30 AM - 3:00 PM',
    assignments: {
      linid: 'TANQUE',
      joyce: '✓',
      jose: 'Rompimiento de Barreras',
      diana: '✓'
    },
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Tanque & Rompimiento de Barreras'
  },
  {
    id: 'dos_sab_2',
    training: 'DOS',
    dia: 'Sábado',
    horario: '3:00 PM - Cierre',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: 'Vuelos',
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
      joyce: '—',
      jose: '—',
      diana: '✓'
    },
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Jornada Dominical C2'
  },
  {
    id: 'dos_dom_2',
    training: 'DOS',
    dia: 'Domingo',
    horario: '3:00 PM - Cierre',
    assignments: {
      linid: '✓',
      joyce: '—',
      jose: '✓',
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
    horario: '3:00 PM - 9:00 PM',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '✓',
      diana: '✓'
    },
    vestimenta: 'Negro formal',
    nota: 'Alineamiento General Maestría'
  },
  {
    id: 'mj_sab_1',
    training: 'MAESTRÍA',
    dia: 'Sábado',
    horario: '8:30 AM - 12:00 PM / 4:00 PM - 9:00 PM',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '✓',
      diana: '✓'
    },
    vestimenta: 'Camiseta negra + pantalón negro',
    nota: 'Jornada Intensiva MJ'
  },
  {
    id: 'mj_dom_1',
    training: 'MAESTRÍA',
    dia: 'Domingo',
    horario: '8:30 AM - 12:00 PM / 4:00 PM - Cierre',
    assignments: {
      linid: '✓',
      joyce: '✓',
      jose: '✓',
      diana: '✓'
    },
    vestimenta: 'Camiseta negra + pantalón negro',
    nota: 'FDS 4 El Viaje con Paul Sosa y Pase de Antorcha a las 18:00 PM'
  }
];

export default function HorariosEntrenamientoModal({ isOpen, onClose, currentUser }) {
  const [activeTab, setActiveTab] = useState('matriz_equipos');
  
  // Estado de la Matriz Nodus
  const [staffList, setStaffList] = useState(INITIAL_STAFF);
  const [scheduleRows, setScheduleRows] = useState(INITIAL_SCHEDULE_ROWS);
  const [filterTraining, setFilterTraining] = useState('TODOS');
  const [highlightPerson, setHighlightPerson] = useState('TODOS');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  
  // Modales de edición profesional
  const [editingRow, setEditingRow] = useState(null); // Fila abierta en modal de edición
  const [showManageStaffModal, setShowManageStaffModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({ name: '', role: '', email: '' });
  const [copyFeedback, setCopyFeedback] = useState('');

  // Identificación de permisos de Gerencia / Dirección
  const isManager = useMemo(() => {
    if (!currentUser) return true;
    const role = (currentUser.role || currentUser.appRole || '').toLowerCase();
    const email = (currentUser.email || '').toLowerCase();
    return Boolean(
      currentUser.isGerente ||
      currentUser.isSuperAdmin ||
      role === 'gerente' ||
      role === 'gerente_sede' ||
      role.includes('gerente') ||
      role === 'superadmin' ||
      role === 'direccion' ||
      role === 'cfo' ||
      role === 'ceo' ||
      email.includes('jose.sanchez') ||
      email.includes('admin') ||
      email.includes('crearpsl')
    );
  }, [currentUser]);

  // Sede normalizada para aislamiento multi-sede
  const userSede = currentUser?.sede || 'Lima';
  const sedeKey = userSede.toLowerCase().trim().replace(/\s+/g, '_');
  const nodusDocId = `${sedeKey}_horarios_equipos`;

  // Sincronización en tiempo real con Nodus (Firestore)
  useEffect(() => {
    if (!isOpen) return;

    try {
      const docRef = doc(db, 'nodus_training_schedules', nodusDocId);
      const unsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.staff && Array.isArray(data.staff) && data.staff.length > 0) {
            // Depuración de seguridad: Leyla Pasquel NUNCA debe aparecer
            const sanitizedStaff = data.staff.filter(s => {
              const name = (s.name || '').toLowerCase();
              const email = (s.email || '').toLowerCase();
              return !name.includes('leyla') && !email.includes('leyla');
            });
            if (sanitizedStaff.length > 0) {
              setStaffList(sanitizedStaff);
            }
          }
          if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
            const sanitizedRows = data.rows.map(r => {
              const newAssignments = { ...(r.assignments || {}) };
              delete newAssignments.leyla;
              return { ...r, assignments: newAssignments };
            });
            setScheduleRows(sanitizedRows);
          }
          if (data.updatedAt) {
            setLastSaved(new Date(data.updatedAt).toLocaleTimeString());
          }
        }
      }, (err) => {
        console.warn('Error leyendo horarios en Nodus:', err);
      });

      return () => unsub();
    } catch (err) {
      console.warn('Error conectando a Nodus:', err);
    }
  }, [isOpen, nodusDocId]);

  // Guardar en Nodus (Firestore)
  const handleSaveToNodus = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const nodusDocRef = doc(db, 'nodus_training_schedules', nodusDocId);
      const payload = {
        sede: userSede,
        rows: scheduleRows,
        staff: staffList,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || currentUser?.email || 'Gerente Nodus',
        updatedByEmail: currentUser?.email || ''
      };

      await setDoc(nodusDocRef, payload, { merge: true });

      setLastSaved(new Date().toLocaleTimeString());
      setHasUnsavedChanges(false);
      setSaveMessage('Horarios sincronizados y guardados en Nodus');
      setTimeout(() => setSaveMessage(''), 4000);
    } catch (err) {
      console.error('Error al guardar en Nodus:', err);
      setSaveMessage('Error al guardar en Nodus. Intente nuevamente.');
      setTimeout(() => setSaveMessage(''), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Guardar cambios de una fila editada en el modal
  const handleSaveRowEdit = (updatedRow) => {
    setScheduleRows(prev => prev.map(r => r.id === updatedRow.id ? updatedRow : r));
    setEditingRow(null);
    setHasUnsavedChanges(true);
  };

  // Agregar nueva fila
  const handleAddNewRow = (trainingType = 'UNO') => {
    const newId = `turno_${trainingType.toLowerCase()}_${Date.now()}`;
    const initialAssignments = {};
    staffList.forEach(s => { initialAssignments[s.id] = '—'; });

    const newRow = {
      id: newId,
      training: trainingType,
      dia: 'Viernes',
      horario: '9:00 AM - 2:00 PM',
      assignments: initialAssignments,
      vestimenta: 'Polo negro + pantalón negro',
      nota: 'Turno Personalizado'
    };

    setScheduleRows(prev => [...prev, newRow]);
    setHasUnsavedChanges(true);
    // Abrir de inmediato el modal de edición de la nueva fila
    setEditingRow(newRow);
  };

  // Eliminar fila
  const handleDeleteRow = (rowId) => {
    if (window.confirm('¿Deseas eliminar este turno de entrenamiento de la matriz?')) {
      setScheduleRows(prev => prev.filter(r => r.id !== rowId));
      setHasUnsavedChanges(true);
      if (editingRow?.id === rowId) setEditingRow(null);
    }
  };

  // Agregar nuevo colaborador
  const handleAddStaffMember = () => {
    if (!newStaffForm.name.trim()) {
      alert('Ingresa el nombre del colaborador');
      return;
    }
    const staffId = newStaffForm.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);
    const newStaff = {
      id: staffId,
      name: newStaffForm.name.trim(),
      role: newStaffForm.role.trim() || 'Coordinador / Staff',
      email: newStaffForm.email.trim() || ''
    };

    setStaffList(prev => [...prev, newStaff]);
    setScheduleRows(prev => prev.map(row => ({
      ...row,
      assignments: {
        ...row.assignments,
        [staffId]: '—'
      }
    })));

    setNewStaffForm({ name: '', role: '', email: '' });
    setHasUnsavedChanges(true);
  };

  // Eliminar colaborador
  const handleDeleteStaffMember = (staffId, staffName) => {
    if (window.confirm(`¿Eliminar al colaborador "${staffName}" y sus asignaciones de la matriz?`)) {
      setStaffList(prev => prev.filter(s => s.id !== staffId));
      setScheduleRows(prev => prev.map(row => {
        const copy = { ...row.assignments };
        delete copy[staffId];
        return { ...row, assignments: copy };
      }));
      setHasUnsavedChanges(true);
    }
  };

  // Renderizador limpio de badges de tareas (conforme al diseño oficial)
  const renderAssignmentBadge = (val) => {
    const rawVal = (val || '—').trim();

    if (rawVal === '✓' || rawVal.toLowerCase() === 'ok' || rawVal.toLowerCase() === 'si') {
      return (
        <span style={{ 
          background: 'rgba(34, 197, 94, 0.12)', 
          color: '#16a34a', 
          border: '1px solid rgba(34, 197, 94, 0.3)', 
          padding: '2px 8px', 
          borderRadius: '12px', 
          fontWeight: 800,
          fontSize: '0.8rem',
          display: 'inline-block'
        }}>
          ✓
        </span>
      );
    }

    if (rawVal === '—' || rawVal === '-' || rawVal === '' || rawVal.toLowerCase() === 'no') {
      return (
        <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem' }}>
          —
        </span>
      );
    }

    // Tareas específicas con la paleta de Causa OS
    let bg = 'rgba(0, 212, 255, 0.1)';
    let color = 'var(--crear-blue, #00d4ff)';
    let border = 'rgba(0, 212, 255, 0.25)';

    if (rawVal.toLowerCase().includes('tanque')) {
      bg = 'var(--crear-gold-light)';
      color = 'var(--crear-gold, #f59e0b)';
      border = 'rgba(255, 193, 7, 0.35)';
    } else if (rawVal.toLowerCase().includes('vuelo')) {
      bg = 'rgba(244, 114, 182, 0.12)';
      color = '#ec4899';
      border = 'rgba(244, 114, 182, 0.3)';
    } else if (rawVal.toLowerCase().includes('barrera')) {
      bg = 'rgba(249, 115, 22, 0.12)';
      color = '#ea580c';
      border = 'rgba(249, 115, 22, 0.3)';
    } else if (rawVal.toLowerCase().includes('confianza')) {
      bg = 'rgba(168, 85, 247, 0.12)';
      color = '#a855f7';
      border = 'rgba(168, 85, 247, 0.3)';
    } else if (rawVal.toLowerCase().includes('grounding')) {
      bg = 'rgba(20, 184, 166, 0.12)';
      color = '#0d9488';
      border = 'rgba(20, 184, 166, 0.3)';
    }

    return (
      <span style={{ 
        background: bg, 
        color: color, 
        border: `1px solid ${border}`, 
        padding: '2px 8px', 
        borderRadius: '6px', 
        fontSize: '0.74rem', 
        fontWeight: 700,
        display: 'inline-block',
        maxWidth: '140px',
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

  // Mensaje nativo para Google Chat
  const generateGoogleChatMessage = () => {
    const assignedNames = staffList.map(s => s.name).join(', ');
    return `📢 *ATENCIÓN EQUIPO OPERATIVO — HORARIOS OFICIALES EN NODUS* 📅\n\n` +
      `Estimado equipo asignado (*${assignedNames}*):\n\n` +
      `La Gerencia de Sede (*${userSede}*) ha actualizado los *Horarios y Turnos Operativos Oficiales* para los entrenamientos UNO, DOS y MAESTRÍA en *Nodus / Causa OS*.\n\n` +
      `🔗 *Consulta tus Turnos en Vivo:* https://centro-operativo-cpsl.web.app\n\n` +
      `📌 *Lineamientos:* \n` +
      `• Revisa tus roles asignados (Groundings, Noches de Confianza, Tanque, Rompimiento de Barreras, Vuelos).\n` +
      `• Cumplir estrictamente el Código de Vestimenta por jornada.\n` +
      `• Cualquier duda de asignación, coordinar directamente con Gerencia.\n\n` +
      `_Equipo Crear Poder Sin Límites — Plataforma Operativa Nodus / Causa OS_`;
  };

  // Copiar mensaje para Google Chat y abrirlo
  const handleOpenGoogleChat = () => {
    const msg = generateGoogleChatMessage();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg).then(() => {
        setCopyFeedback('¡Mensaje copiado al portapapeles!');
        setTimeout(() => setCopyFeedback(''), 3000);
      });
    }
    window.open('https://chat.google.com/u/0/', '_blank');
  };

  // Enviar Correo a todos los asignados
  const handleSendBatchEmail = () => {
    const emails = staffList.map(s => s.email).filter(Boolean).join(',');
    const subject = `📅 Horarios Oficiales de Entrenamiento — Sede ${userSede} (Nodus Causa OS)`;
    const body = `Estimado Equipo Asignado,\n\n` +
      `Se han actualizado y publicado los Horarios y Turnos Operativos de Entrenamiento en Nodus para la sede ${userSede}.\n\n` +
      `Por favor ingresa a la plataforma Causa OS para revisar tus jornadas, salas y tareas específicas asignadas:\n` +
      `👉 https://centro-operativo-cpsl.web.app\n\n` +
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
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
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
          maxWidth: '1240px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--card-shadow)',
          padding: 'clamp(1.2rem, 2.5vw, 1.8rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
          color: 'var(--text-main)'
        }}
      >
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
              <Clock size={24} className="text-gold" />
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-heading)', fontFamily: 'var(--font-heading)' }}>
                Horarios y Turnos Operativos del Equipo
              </h2>
              <span style={{ 
                background: 'var(--crear-gold-light)',
                color: 'var(--crear-gold)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Lock size={11} />
                Sede {userSede}
              </span>
              {hasUnsavedChanges && (
                <span style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: 'var(--color-error)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px'
                }}>
                  ● Cambios pendientes
                </span>
              )}
            </div>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.86rem' }}>
              Protocolo de jornadas, turnos y fisionomía para <strong>Equipo de Oficina, Gerentes de Sede y Coordinadores</strong> — Almacenamiento en <strong>NODUS</strong>.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="btn-icon"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* TABS DE FILTRO */}
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          {[
            { id: 'matriz_equipos', label: '🗓️ Horarios de Equipos (Matriz Nodus)' },
            { id: 'todos_equipo', label: '👥 Resumen del Equipo' },
            { id: 'oficina', label: '🏢 Equipo de Oficina' },
            { id: 'gerentes', label: '👔 Gerentes de Sede' },
            { id: 'coordinadores', label: '🎯 Coordinadores' },
            { id: 'pulsos_reportes', label: '⚡ Pulsos & Reportes Post-FDS' },
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
                    ? '1px solid var(--crear-gold)' 
                    : '1px solid var(--border-subtle)',
                  background: isSelected 
                    ? 'var(--crear-gold-light)' 
                    : 'transparent',
                  color: isSelected 
                    ? 'var(--crear-gold)' 
                    : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* NOTIFICACIÓN O ALERTA */}
        {saveMessage && (
          <div style={{
            background: 'var(--crear-gold-light)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--crear-gold)',
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
          {/* TAB: MATRIZ DE HORARIOS Y TURNOS (DISEÑO LIMPIO Y EJECUTIVO)              */}
          {/* ========================================================================= */}
          {activeTab === 'matriz_equipos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* BARRA SUPERIOR DE ACCIONES */}
              <div 
                style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.8rem',
                  padding: '0.8rem 1rem',
                  background: 'var(--bg-dark-alt, #ffffff)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                    Matriz de Asignaciones y Turnos de Sala
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                    {isManager ? 'Haz clic en "Editar" en cualquier turno para modificar horarios y personas.' : 'Visualización oficial de turnos asignados por Gerencia.'}
                    {lastSaved && ` • Guardado: ${lastSaved}`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {isManager && (
                    <button
                      onClick={() => setShowManageStaffModal(true)}
                      className="btn-secondary"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      title="Administrar colaboradores de la matriz"
                    >
                      <Users size={14} />
                      Equipo ({staffList.length})
                    </button>
                  )}

                  {isManager && (
                    <button
                      onClick={() => handleAddNewRow('UNO')}
                      className="btn-secondary"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      title="Agregar un nuevo turno"
                    >
                      <Plus size={14} />
                      Nuevo Turno
                    </button>
                  )}

                  <button
                    onClick={() => setShowNotifyModal(true)}
                    className="btn-secondary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    title="Notificar disponibilidad por Correo o Google Chat"
                  >
                    <Send size={14} />
                    Notificar
                  </button>

                  {isManager && (
                    <button
                      onClick={handleSaveToNodus}
                      disabled={isSaving}
                      className="btn-primary"
                      style={{ 
                        padding: '0.45rem 1.2rem', 
                        fontSize: '0.8rem', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.4rem' 
                      }}
                    >
                      <Save size={14} />
                      {isSaving ? 'Guardando...' : (hasUnsavedChanges ? 'Guardar Cambios' : 'Guardado en Nodus')}
                    </button>
                  )}
                </div>
              </div>

              {/* FILTROS LIMPIOS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>Entrenamiento:</span>
                  {[
                    { id: 'TODOS', label: 'Todos' },
                    { id: 'UNO', label: 'UNO (C1)' },
                    { id: 'DOS', label: 'DOS (C2)' },
                    { id: 'MAESTRÍA', label: 'Maestría (MJ)' }
                  ].map(f => {
                    const isSel = filterTraining === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFilterTraining(f.id)}
                        style={{
                          padding: '0.3rem 0.7rem',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: isSel ? 700 : 500,
                          cursor: 'pointer',
                          border: isSel ? '1px solid var(--crear-gold)' : '1px solid var(--border-subtle)',
                          background: isSel ? 'var(--crear-gold-light)' : 'transparent',
                          color: isSel ? 'var(--crear-gold)' : 'var(--text-muted)'
                        }}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 600 }}>Destacar persona:</span>
                  <select
                    value={highlightPerson}
                    onChange={(e) => setHighlightPerson(e.target.value)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      borderRadius: '6px',
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.78rem'
                    }}
                  >
                    <option value="TODOS">Ver todos los asignados</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TABLA EJECUTIVA LIMPIA */}
              <div 
                style={{ 
                  overflowX: 'auto', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-subtle)', background: 'var(--bg-dark, #f8fafc)' }}>
                      <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ENTRENAMIENTO
                      </th>
                      <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        DÍA
                      </th>
                      <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        HORARIO
                      </th>

                      {staffList.map(staff => {
                        const isHighlighted = highlightPerson === staff.id;
                        return (
                          <th 
                            key={staff.id} 
                            style={{ 
                              padding: '0.85rem 0.8rem', 
                              textAlign: 'center',
                              background: isHighlighted ? 'var(--crear-gold-light)' : 'transparent',
                              borderLeft: '1px solid var(--border-subtle)',
                              borderRight: '1px solid var(--border-subtle)',
                              minWidth: '130px'
                            }}
                          >
                            <div style={{ fontWeight: 700, color: isHighlighted ? 'var(--crear-gold)' : 'var(--text-heading)', fontSize: '0.86rem' }}>
                              {staff.name}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 400, marginTop: '2px' }}>
                              {staff.role}
                            </div>
                          </th>
                        );
                      })}

                      <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        VESTIMENTA
                      </th>

                      {isManager && (
                        <th style={{ padding: '0.85rem 0.8rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          ACCIONES
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const isUno = row.training === 'UNO';
                      const isDos = row.training === 'DOS';

                      const trainingColor = isUno ? '#0284c7' : (isDos ? '#d97706' : '#9333ea');
                      const trainingBg = isUno ? 'rgba(2, 132, 199, 0.1)' : (isDos ? 'rgba(217, 119, 6, 0.1)' : 'rgba(147, 51, 234, 0.1)');

                      return (
                        <tr 
                          key={row.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        >
                          {/* Entrenamiento */}
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                            <span style={{
                              background: trainingBg,
                              color: trainingColor,
                              border: `1px solid ${trainingColor}30`,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              fontWeight: 800
                            }}>
                              {row.training}
                            </span>
                            {row.nota && (
                              <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: '3px' }}>
                                {row.nota}
                              </div>
                            )}
                          </td>

                          {/* Día */}
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap' }}>
                            {row.dia}
                          </td>

                          {/* Horario */}
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontWeight: 700, color: 'var(--crear-blue, #0284c7)' }}>
                            {row.horario}
                          </td>

                          {/* Celdas de Colaboradores */}
                          {staffList.map(staff => {
                            const val = row.assignments?.[staff.id] || '—';
                            const isHighlighted = highlightPerson === staff.id;
                            return (
                              <td 
                                key={staff.id}
                                style={{ 
                                  padding: '0.75rem 0.8rem', 
                                  textAlign: 'center',
                                  background: isHighlighted ? 'var(--crear-gold-light)' : 'transparent',
                                  borderLeft: '1px solid var(--border-subtle)',
                                  borderRight: '1px solid var(--border-subtle)'
                                }}
                              >
                                {renderAssignmentBadge(val)}
                              </td>
                            );
                          })}

                          {/* Vestimenta */}
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-main)' }}>
                              <Shirt size={14} className="text-muted" />
                              {row.vestimenta}
                            </span>
                          </td>

                          {/* Acciones de Fila (Solo Gerentes) */}
                          {isManager && (
                            <td style={{ padding: '0.75rem 0.8rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <button
                                onClick={() => setEditingRow(row)}
                                className="btn-icon"
                                style={{
                                  background: 'transparent',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)',
                                  fontSize: '0.75rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  marginRight: '4px'
                                }}
                                title="Editar este turno"
                              >
                                <Edit2 size={13} />
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={() => handleDeleteRow(row.id)}
                                className="btn-icon"
                                style={{
                                  background: 'transparent',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '6px',
                                  padding: '4px 6px',
                                  cursor: 'pointer',
                                  color: 'var(--color-error)'
                                }}
                                title="Eliminar este turno"
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

            </div>
          )}

          {/* ========================================================================= */}
          {/* TABS INFORMATIVOS ORIGINALES                                              */}
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
              <h3 style={{ color: '#0284c7', margin: '0 0 0.8rem 0' }}>🏢 Protocolo Operativo del Equipo de Oficina</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                El equipo de oficina garantiza la continuidad del servicio al cliente, cobranzas, emisión de certificados y respaldo logístico durante toda la semana de entrenamiento.
              </p>
            </div>
          )}

          {activeTab === 'gerentes' && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '4px solid #f59e0b', borderRadius: '12px' }}>
              <h3 className="text-gold" style={{ margin: '0 0 0.8rem 0' }}>👔 Directiva para Gerentes de Sede (Nivel 8)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                Los gerentes son los máximos custodios de la experiencia del participante, la integridad de la sede y el cumplimiento de las metas del ciclo.
              </p>
            </div>
          )}

          {activeTab === 'coordinadores' && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '4px solid #10b981', borderRadius: '12px' }}>
              <h3 style={{ color: '#16a34a', margin: '0 0 0.8rem 0' }}>🎯 Turnos y Tareas de Coordinadores (CC1Y2 & CMJ)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                Responsables directos de la ejecución operativa de sala, música, control de tiempo, lista de asistencia y fisionomía de los entrenamientos.
              </p>
            </div>
          )}

          {activeTab === 'pulsos_reportes' && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '4px solid #ec4899', borderRadius: '12px' }}>
              <h3 style={{ color: '#db2777', margin: '0 0 0.8rem 0' }}>⚡ Pulsos & Reportes Post-FDS (Nodus & Causa OS)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                Al finalizar cada fin de semana de entrenamiento, cada sede emite su reporte de asistencia, retención de participantes, recaudación e incidencias para el directorio ejecutivo.
              </p>
            </div>
          )}

          {activeTab === 'sala_c1' && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '4px solid #8b5cf6', borderRadius: '12px' }}>
              <h3 style={{ color: '#7c3aed', margin: '0 0 0.8rem 0' }}>🟣 Horarios de Sala: Capítulo UNO (C1)</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.7' }}>
                • Jueves: 4:30 PM - Cierre (Negro formal / Grounding)<br/>
                • Viernes: 7:30 AM - 3:00 PM y 5:00 PM - Cierre (Noche de Confianza, Negro formal)<br/>
                • Sábado: 8:00 AM - 4:00 PM y 3:00 PM - Cierre (Polo negro + pantalón negro)<br/>
                • Domingo: 8:00 AM - Cierre (Graduación)
              </p>
            </div>
          )}

          {activeTab === 'sala_c2' && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderTop: '4px solid #0284c7', borderRadius: '12px' }}>
              <h3 style={{ color: '#0284c7', margin: '0 0 0.8rem 0' }}>🔵 Horarios de Sala: Capítulo DOS (C2)</h3>
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
              <h3 className="text-gold" style={{ margin: '0 0 0.8rem 0' }}>🟡 Horarios de Sala: Maestría del Juego (MJ)</h3>
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
            background: 'var(--crear-gold-light)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '12px', 
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--crear-gold)', fontWeight: 800, fontSize: '0.88rem' }}>
            <Shirt size={17} />
            <span>CÓDIGO DE VESTIMENTA & AUTORIZACIÓN 2026 — CREAR PODER SIN LÍMITES</span>
          </div>
          <div style={{ fontSize: '0.82rem', lineHeight: '1.5', color: 'var(--text-main)' }}>
            <p style={{ margin: '0 0 0.3rem 0' }}>
              • <strong>Equipo de Oficina:</strong> Jueves y viernes de entrenamiento visten de etiqueta negra formal. Sábados y domingos utilizan polos oficiales combinados con pantalón negro y calzado sobrio.
            </p>
            <p style={{ margin: '0 0 0.3rem 0' }}>
              • <strong>Gerentes y Coordinadores:</strong> Etiqueta negra formal en aperturas, Noches de Confianza y groundings iniciales. Polos oficiales el fin de semana.
            </p>
            <p style={{ margin: 0, color: 'var(--crear-blue, #0284c7)', fontWeight: 600 }}>
              👟 <strong>Entrenador / Coach:</strong> Autorización formal de utilizar <strong>zapatillas deportivas negras limpias</strong> en tarima y salón para cuidar su postura y rendimiento en jornadas de más de 10 horas.
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="text-muted" style={{ fontSize: '0.78rem' }}>
            Sede Operativa: <strong style={{ color: 'var(--text-heading)' }}>{userSede}</strong>
          </div>
          <button 
            onClick={onClose}
            className="btn-primary"
            style={{
              padding: '0.5rem 1.6rem',
              fontSize: '0.85rem'
            }}
          >
            Entendido / Cerrar
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MODAL: EDITAR FILA / TURNO (ELEGANTE, SIN INPUTS CLUNKY EN LA TABLA)      */}
        {/* ========================================================================= */}
        {editingRow && (
          <div 
            onClick={() => setEditingRow(null)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(5px)',
              zIndex: 100002,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <div 
              onClick={e => e.stopPropagation()}
              className="glass-panel"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.6rem',
                maxWidth: '650px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: 'var(--card-shadow)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2rem',
                color: 'var(--text-main)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit2 size={18} className="text-gold" />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                    Editar Turno de Entrenamiento
                  </h3>
                </div>
                <button onClick={() => setEditingRow(null)} className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              {/* CAMPOS PRINCIPALES */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.76rem', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    Entrenamiento:
                  </label>
                  <select
                    value={editingRow.training}
                    onChange={(e) => setEditingRow({ ...editingRow, training: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'var(--bg-dark-alt, #ffffff)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem'
                    }}
                  >
                    <option value="UNO">UNO (C1)</option>
                    <option value="DOS">DOS (C2)</option>
                    <option value="MAESTRÍA">MAESTRÍA (MJ)</option>
                  </select>
                </div>

                <div>
                  <label className="text-muted" style={{ fontSize: '0.76rem', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    Día:
                  </label>
                  <select
                    value={editingRow.dia}
                    onChange={(e) => setEditingRow({ ...editingRow, dia: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'var(--bg-dark-alt, #ffffff)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem'
                    }}
                  >
                    <option value="Jueves">Jueves</option>
                    <option value="Viernes">Viernes</option>
                    <option value="Sábado">Sábado</option>
                    <option value="Domingo">Domingo</option>
                    <option value="Lunes">Lunes</option>
                    <option value="Miércoles">Miércoles</option>
                  </select>
                </div>

                <div>
                  <label className="text-muted" style={{ fontSize: '0.76rem', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    Horario:
                  </label>
                  <input
                    type="text"
                    value={editingRow.horario}
                    onChange={(e) => setEditingRow({ ...editingRow, horario: e.target.value })}
                    placeholder="Ej. 4:30 PM - Cierre"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'var(--bg-dark-alt, #ffffff)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem' }}>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.76rem', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    Código de Vestimenta:
                  </label>
                  <input
                    type="text"
                    value={editingRow.vestimenta}
                    onChange={(e) => setEditingRow({ ...editingRow, vestimenta: e.target.value })}
                    placeholder="Ej. Negro formal / Polo negro + pantalón negro"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'var(--bg-dark-alt, #ffffff)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem'
                    }}
                  />
                </div>

                <div>
                  <label className="text-muted" style={{ fontSize: '0.76rem', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    Actividad / Subtítulo:
                  </label>
                  <input
                    type="text"
                    value={editingRow.nota || ''}
                    onChange={(e) => setEditingRow({ ...editingRow, nota: e.target.value })}
                    placeholder="Ej. Noche de Confianza / Tanque / Vuelos"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'var(--bg-dark-alt, #ffffff)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem'
                    }}
                  />
                </div>
              </div>

              {/* ASIGNACIONES PERSONA POR PERSONA */}
              <div>
                <label className="text-muted" style={{ fontSize: '0.78rem', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
                  Asignación por Colaborador:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.7rem' }}>
                  {staffList.map(staff => {
                    const currentVal = editingRow.assignments?.[staff.id] || '—';
                    return (
                      <div 
                        key={staff.id}
                        style={{
                          background: 'var(--bg-dark-alt, #ffffff)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '0.6rem 0.8rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-heading)' }}>
                            {staff.name}
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {staff.role}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={currentVal === '—' ? '' : currentVal}
                          placeholder="✓, —, o tarea (ej. Grounding)"
                          onChange={(e) => {
                            const val = e.target.value.trim() || '—';
                            setEditingRow({
                              ...editingRow,
                              assignments: {
                                ...editingRow.assignments,
                                [staff.id]: val
                              }
                            });
                          }}
                          style={{
                            width: '100%',
                            padding: '0.4rem 0.6rem',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-main)',
                            fontSize: '0.8rem'
                          }}
                        />
                        {/* Botones de selección rápida */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                          {['✓', '—', 'Grounding', 'Noche Confianza', 'Tanque', 'Vuelos'].map(preset => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setEditingRow({
                                  ...editingRow,
                                  assignments: {
                                    ...editingRow.assignments,
                                    [staff.id]: preset
                                  }
                                });
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '4px',
                                padding: '1px 6px',
                                fontSize: '0.68rem',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                              }}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BOTONERA MODAL */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.8rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 1.2rem', fontSize: '0.82rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveRowEdit(editingRow)}
                  className="btn-primary"
                  style={{ padding: '0.5rem 1.5rem', fontSize: '0.82rem' }}
                >
                  Guardar Turno
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: ADMINISTRAR COLABORADORES DEL EQUIPO                               */}
        {/* ========================================================================= */}
        {showManageStaffModal && (
          <div 
            onClick={() => setShowManageStaffModal(false)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(5px)',
              zIndex: 100002,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <div 
              onClick={e => e.stopPropagation()}
              className="glass-panel"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.6rem',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: 'var(--card-shadow)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2rem',
                color: 'var(--text-main)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} className="text-gold" />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                    Administrar Colaboradores de la Matriz
                  </h3>
                </div>
                <button onClick={() => setShowManageStaffModal(false)} className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              {/* LISTA ACTUAL DE COLABORADORES */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  Colaboradores Actuales ({staffList.length}):
                </label>
                {staffList.map(staff => (
                  <div 
                    key={staff.id}
                    style={{
                      background: 'var(--bg-dark-alt, #ffffff)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.7rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.88rem' }}>
                        {staff.name}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {staff.role} • {staff.email || 'Sin correo asignado'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteStaffMember(staff.id, staff.name)}
                      className="btn-icon"
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        color: 'var(--color-error)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem'
                      }}
                      title="Retirar de la matriz"
                    >
                      <Trash2 size={13} />
                      <span>Retirar</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* FORMULARIO AGREGAR COLABORADOR */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <label className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  ➕ Agregar Nuevo Colaborador a la Matriz:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.6rem' }}>
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={newStaffForm.name}
                    onChange={e => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                    style={{
                      padding: '0.5rem',
                      background: 'var(--bg-dark-alt, #ffffff)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Cargo / Rol"
                    value={newStaffForm.role}
                    onChange={e => setNewStaffForm({ ...newStaffForm, role: e.target.value })}
                    style={{
                      padding: '0.5rem',
                      background: 'var(--bg-dark-alt, #ffffff)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem'
                    }}
                  />
                  <input
                    type="email"
                    placeholder="correo@crearpsl.net"
                    value={newStaffForm.email}
                    onChange={e => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                    style={{
                      padding: '0.5rem',
                      background: 'var(--bg-dark-alt, #ffffff)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.7rem' }}>
                  <button
                    onClick={handleAddStaffMember}
                    className="btn-secondary"
                    style={{ padding: '0.45rem 1.2rem', fontSize: '0.8rem' }}
                  >
                    Agregar a la Matriz
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.8rem' }}>
                <button
                  onClick={() => setShowManageStaffModal(false)}
                  className="btn-primary"
                  style={{ padding: '0.45rem 1.4rem', fontSize: '0.82rem' }}
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: NOTIFICACIONES (CORREO & GOOGLE CHAT)                               */}
        {/* ========================================================================= */}
        {showNotifyModal && (
          <div 
            onClick={() => setShowNotifyModal(false)}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(5px)',
              zIndex: 100002,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <div 
              onClick={e => e.stopPropagation()}
              className="glass-panel"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.6rem',
                maxWidth: '650px',
                width: '100%',
                boxShadow: 'var(--card-shadow)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                color: 'var(--text-main)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.7rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Send size={20} className="text-gold" />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                    Notificar Horarios Disponibles
                  </h3>
                </div>
                <button onClick={() => setShowNotifyModal(false)} className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              {copyFeedback && (
                <div style={{ background: 'var(--crear-gold-light)', color: 'var(--crear-gold)', padding: '0.5rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem', textAlign: 'center', fontWeight: 600 }}>
                  {copyFeedback}
                </div>
              )}

              {/* DESTINATARIOS */}
              <div>
                <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Destinatarios del Equipo ({staffList.length}):
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {staffList.map(s => (
                    <span 
                      key={s.id} 
                      style={{
                        background: 'var(--bg-dark-alt, #ffffff)',
                        border: '1px solid var(--border-subtle)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: 'var(--text-main)'
                      }}
                    >
                      {s.name} ({s.email || 'Sin email'})
                    </span>
                  ))}
                </div>
              </div>

              {/* MENSAJE PARA GOOGLE CHAT */}
              <div>
                <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Mensaje Formateado para Google Chat:
                </div>
                <div 
                  style={{
                    background: 'var(--bg-dark, #f8fafc)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.8rem',
                    fontSize: '0.78rem',
                    lineHeight: '1.45',
                    color: 'var(--text-main)',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace'
                  }}
                >
                  {generateGoogleChatMessage()}
                </div>
              </div>

              {/* BOTONES DE DISPARO */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button
                  onClick={handleOpenGoogleChat}
                  className="btn-primary"
                  style={{
                    padding: '0.65rem 1rem',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <MessageSquare size={16} />
                  Copiar & Abrir Chat
                </button>

                <button
                  onClick={handleSendBatchEmail}
                  className="btn-secondary"
                  style={{
                    padding: '0.65rem 1rem',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Mail size={16} />
                  Enviar Correo Masivo
                </button>

                <button
                  onClick={handleCopyEmails}
                  className="btn-secondary"
                  style={{
                    padding: '0.65rem 1rem',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Copy size={16} />
                  Copiar Correos
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
