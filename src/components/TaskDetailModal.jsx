import React, { useState, useEffect, useRef } from 'react';
import { 
  X, CheckCircle2, Clock, Calendar, AlertCircle, 
  ExternalLink, Link as LinkIcon, Plus, Trash2, Edit3, 
  Send, Sparkles, User, FileText, Check, ShieldCheck,
  TrendingUp, RefreshCw, UploadCloud, Paperclip, FileCheck,
  FolderPlus, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';
import { useUI } from '../context/UIContext';
import { getFlagForSede } from '../utils/flags';
import { uploadEvidenceDocument } from '../services/googleDriveService';
import { celebrateVictory } from '../utils/neuroFeedback';

const getCountdown = (deadlineIso) => {
  if (!deadlineIso) return { label: 'Sin fecha límite', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: '#9ca3af', overdue: false };
  const deadline = new Date(deadlineIso).getTime();
  if (isNaN(deadline)) return { label: 'Fecha inválida', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: '#9ca3af', overdue: false };

  const now = Date.now();
  const diffMs = deadline - now;
  const absMs = Math.abs(diffMs);
  const totalHours = Math.floor(absMs / 3600000);
  const days = Math.floor(totalHours / 24);
  const mins = Math.floor((absMs % 3600000) / 60000);
  const timeStr = days > 0 ? `${days}d ${totalHours % 24}h` : (totalHours > 0 ? `${totalHours}h ${mins}m` : `${mins}m`);

  if (diffMs <= 0) return { label: `⏰ VENCIDA hace ${timeStr}`, color: '#ffffff', bg: '#dc2626', border: '#7f1d1d', overdue: true };
  if (diffMs < 3 * 3600000) return { label: `🔴 ${timeStr} restantes`, color: '#ffffff', bg: '#ef4444', border: '#b91c1c', overdue: false };
  if (diffMs < 24 * 3600000) return { label: `🟠 ${timeStr} restantes`, color: '#ffffff', bg: '#f97316', border: '#c2410c', overdue: false };
  if (diffMs < 72 * 3600000) return { label: `🟡 ${timeStr} restantes`, color: '#1a1300', bg: '#facc15', border: '#a16207', overdue: false };
  return { label: `🟢 ${timeStr} restantes`, color: '#ffffff', bg: '#16a34a', border: '#166534', overdue: false };
};

const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getEvidenceCategory = (url = '', fileName = '', provider = '') => {
  const text = `${url} ${fileName} ${provider}`.toLowerCase();
  if (text.includes('drive.google.com') || provider === 'google_drive') {
    return { icon: '📁', label: 'Google Drive', color: '#00d2ff', bg: 'rgba(0, 210, 255, 0.12)', border: 'rgba(0, 210, 255, 0.35)' };
  }
  if (text.includes('.pdf')) {
    return { icon: '📄', label: 'PDF', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)' };
  }
  if (text.includes('.xls') || text.includes('.xlsx') || text.includes('.csv') || text.includes('sheet')) {
    return { icon: '📊', label: 'Excel / Planilla', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)' };
  }
  if (text.includes('.doc') || text.includes('.docx') || text.includes('docs.google.com/document')) {
    return { icon: '📝', label: 'Word / Doc', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.35)' };
  }
  if (text.includes('.png') || text.includes('.jpg') || text.includes('.jpeg') || text.includes('.webp') || text.includes('image')) {
    return { icon: '🖼️', label: 'Imagen', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.35)' };
  }
  if (provider === 'firebase_storage' || text.includes('firebasestorage')) {
    return { icon: '☁️', label: 'Almacenamiento Cloud', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)' };
  }
  return { icon: '🔗', label: 'Enlace', color: 'var(--crear-gold)', bg: 'rgba(212, 175, 55, 0.12)', border: 'rgba(212, 175, 55, 0.35)' };
};

export default function TaskDetailModal({ 
  isOpen, 
  onClose, 
  task, 
  onEditTaskParams = null,
  resolveAssigneeName = null 
}) {
  const { currentUser, reauthenticateGoogle } = useAuth();
  const { updateTaskDetails, toggleTask } = useChecklist();
  const { showToast } = useUI();

  // Estados locales editables para avances y evidencias
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [evidencesList, setEvidencesList] = useState([]);
  const [newEvidenceUrl, setNewEvidenceUrl] = useState('');
  const [newEvidenceTitle, setNewEvidenceTitle] = useState('');
  const [showAddEvidence, setShowAddEvidence] = useState(false);

  // Estados para subida de archivos y Google Drive
  const [evidenceMode, setEvidenceMode] = useState('upload'); // 'upload' | 'link'
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [notesList, setNotesList] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar estado cuando se abre el modal o cambia la tarea
  useEffect(() => {
    if (task && isOpen) {
      const initialProgress = typeof task.progressPercentage === 'number' 
        ? task.progressPercentage 
        : (task.completed || task.status === 'Completada' ? 100 : 0);
      
      setProgress(initialProgress);
      setIsCompleted(task.completed === true || task.status === 'Completada' || initialProgress === 100);

      // Normalizar lista de evidencias existentes (soporte para array `evidences` y campo legacy `evidenceUrl`)
      let list = [];
      if (Array.isArray(task.evidences) && task.evidences.length > 0) {
        list = [...task.evidences];
      } else if (task.evidenceUrl || task.evidence_url) {
        const legacyUrl = task.evidenceUrl || task.evidence_url;
        list = [{
          id: 'ev_legacy',
          url: legacyUrl,
          title: 'Evidencia principal',
          createdAt: task.date || new Date().toISOString(),
          addedByName: 'Adjunto'
        }];
      }
      setEvidencesList(list);

      // Normalizar bitácora de notas
      let notes = [];
      if (Array.isArray(task.progressNotes) && task.progressNotes.length > 0) {
        notes = [...task.progressNotes];
      } else if (task.comments && typeof task.comments === 'string' && task.comments.trim()) {
        notes = [{
          id: 'note_legacy',
          text: task.comments,
          createdAt: new Date().toISOString(),
          authorName: 'Nota existente',
          progressPercentage: initialProgress
        }];
      }
      setNotesList(notes);
      setNewEvidenceUrl('');
      setNewEvidenceTitle('');
      setShowAddEvidence(false);
      setSelectedFile(null);
      setIsUploadingFile(false);
      setUploadProgress('');
      setIsDragging(false);
      setEvidenceMode('upload');
      setNewNoteText('');
    }
  }, [task, isOpen]);

  // Manejadores para adjuntar documentos (Google Drive / Cloud)
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!newEvidenceTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        setNewEvidenceTitle(cleanName);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!newEvidenceTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        setNewEvidenceTitle(cleanName);
      }
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile) {
      showToast('Por favor selecciona o arrastra un archivo primero.', 'error');
      return;
    }

    setIsUploadingFile(true);
    setUploadProgress('Conectando...');

    try {
      let accessToken = sessionStorage.getItem('googleAccessToken');
      if (!accessToken && reauthenticateGoogle) {
        setUploadProgress('Solicitando acceso a Google Drive...');
        accessToken = await reauthenticateGoogle();
      }

      setUploadProgress(accessToken ? 'Subiendo documento a Google Drive...' : 'Subiendo documento a la nube...');
      
      const result = await uploadEvidenceDocument(selectedFile, {
        accessToken,
        taskId: task.id
      });

      const newEvidence = {
        id: `ev_${Date.now()}`,
        url: result.url,
        title: newEvidenceTitle.trim() || selectedFile.name,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        provider: result.provider,
        createdAt: new Date().toISOString(),
        addedByName: currentUser?.displayName || currentUser?.name || currentUser?.email || 'Usuario',
        addedByEmail: currentUser?.email || ''
      };

      setEvidencesList(prev => [newEvidence, ...prev]);
      setSelectedFile(null);
      setNewEvidenceTitle('');
      setShowAddEvidence(false);
      showToast(
        result.provider === 'google_drive' 
          ? '📁 Documento guardado en Google Drive exitosamente.' 
          : '☁️ Documento guardado en la nube exitosamente.',
        'success'
      );
    } catch (err) {
      console.error('Error al subir documento:', err);
      showToast(err.message || 'Error al subir el archivo.', 'error');
    } finally {
      setIsUploadingFile(false);
      setUploadProgress('');
    }
  };

  if (!isOpen || !task) return null;

  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const taskCreatorEmail = (task.createdBy || '').toLowerCase().trim();
  const isCreator = Boolean(taskCreatorEmail && userEmail === taskCreatorEmail);

  // Formateo de asignados
  const assignedList = task.assignedToEmails || (task.assignedToEmail ? [task.assignedToEmail] : []);
  const getDisplayName = (email) => {
    if (resolveAssigneeName && typeof resolveAssigneeName === 'function') {
      return resolveAssigneeName(email);
    }
    return email;
  };

  const countdown = getCountdown(task.deadline);

  // Selector rápido de porcentajes
  const handleSetQuickProgress = (val) => {
    setProgress(val);
    if (val === 100) {
      setIsCompleted(true);
    } else if (val < 100 && isCompleted) {
      setIsCompleted(false);
    }
  };

  // Agregar una nueva evidencia
  const handleAddEvidenceItem = () => {
    const trimmedUrl = newEvidenceUrl.trim();
    if (!trimmedUrl) {
      showToast('Por favor introduce la URL o link de la evidencia.', 'error');
      return;
    }

    // Asegurar prefijo de protocolo si no lo tiene
    let finalUrl = trimmedUrl;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const newEvidence = {
      id: `ev_${Date.now()}`,
      url: finalUrl,
      title: newEvidenceTitle.trim() || 'Evidencia de cumplimiento',
      createdAt: new Date().toISOString(),
      addedByName: currentUser?.displayName || currentUser?.name || currentUser?.email || 'Usuario',
      addedByEmail: currentUser?.email || ''
    };

    setEvidencesList(prev => [newEvidence, ...prev]);
    setNewEvidenceUrl('');
    setNewEvidenceTitle('');
    setShowAddEvidence(false);
    showToast('Evidencia adjuntada a la lista. Guarda los avances para confirmar.', 'info');
  };

  const handleRemoveEvidence = (idToRemove) => {
    setEvidencesList(prev => prev.filter(e => e.id !== idToRemove));
    showToast('Evidencia removida de la lista.', 'info');
  };

  // Agregar nota de avance
  const handleAddNote = () => {
    const text = newNoteText.trim();
    if (!text) {
      showToast('Por favor escribe el detalle de tu avance.', 'error');
      return;
    }

    const note = {
      id: `note_${Date.now()}`,
      text: text,
      createdAt: new Date().toISOString(),
      authorName: currentUser?.displayName || currentUser?.name || currentUser?.email || 'Usuario',
      authorEmail: currentUser?.email || '',
      progressPercentage: progress
    };

    setNotesList(prev => [note, ...prev]);
    setNewNoteText('');
    showToast('Avance registrado en la bitácora.', 'info');
  };

  // Alternar estado completada
  const handleToggleCompleted = () => {
    const nextCompleted = !isCompleted;
    setIsCompleted(nextCompleted);
    if (nextCompleted && progress < 100) {
      setProgress(100);
    } else if (!nextCompleted && progress === 100) {
      setProgress(75);
    }
  };

  // Guardar todos los cambios en Firestore
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const mainEvidenceUrl = evidencesList.length > 0 ? evidencesList[0].url : '';
      const latestComment = notesList.length > 0 ? notesList[0].text : (task.comments || '');

      const updates = {
        progressPercentage: progress,
        completed: isCompleted,
        status: isCompleted ? 'Completada' : (progress > 0 ? 'En progreso' : 'Pendiente'),
        evidenceUrl: mainEvidenceUrl,
        evidence_url: mainEvidenceUrl,
        evidences: evidencesList,
        comments: latestComment,
        progressNotes: notesList,
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: currentUser?.email || ''
      };

      await updateTaskDetails(task.id, updates);
      if (isCompleted || progress === 100) {
        celebrateVictory();
      }
      showToast('🎉 ¡Tarea actualizada y avances guardados exitosamente!', 'success');
      onClose();
    } catch (err) {
      console.error('Error guardando avances:', err);
      showToast('No se pudieron guardar los avances.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(3, 7, 18, 0.88)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }}>
      <div 
        className="glass-panel task-detail-modal-card"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          border: '1px solid rgba(41, 171, 226, 0.35)',
          background: 'linear-gradient(145deg, rgba(13, 21, 45, 0.96) 0%, rgba(6, 11, 25, 0.98) 100%)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(41, 171, 226, 0.15)',
          overflow: 'hidden'
        }}
      >
        {/* CABECERA DEL MODAL */}
        <div style={{
          padding: '1.2rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* BADGES SUPERIORES */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.2rem 0.6rem',
                borderRadius: '12px',
                background: isCreator ? 'rgba(41, 171, 226, 0.2)' : 'rgba(255, 193, 7, 0.2)',
                color: isCreator ? 'var(--crear-cyan)' : '#ffc107',
                border: `1px solid ${isCreator ? 'rgba(41, 171, 226, 0.45)' : 'rgba(255, 193, 7, 0.45)'}`,
                letterSpacing: '0.5px'
              }}>
                {isCreator ? '→ TÚ ASIGNASTE ESTA TAREA' : '← TE ASIGNARON ESTA TAREA'}
              </span>

              {task.priority && (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: task.priority.includes('ROJO') ? '#ef4444' : task.priority.includes('AMARILLO') ? '#facc15' : '#10b981',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {task.priority}
                </span>
              )}

              {task.sede && (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '10px',
                  background: 'rgba(212, 175, 55, 0.12)',
                  color: 'var(--crear-gold)',
                  border: '1px solid rgba(212, 175, 55, 0.25)'
                }}>
                  {getFlagForSede(task.sede)} {task.sede}
                </span>
              )}
            </div>

            {/* TÍTULO DE LA TAREA */}
            <h2 style={{
              margin: '0.3rem 0 0.5rem 0',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.35,
              wordBreak: 'break-word'
            }}>
              {isCompleted ? '✅ ' : ''}{task.task || task.title}
            </h2>

            {/* ASIGNADOR Y ASIGNADOS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {task.createdBy && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>👤 Asignada por: </span>
                  <strong style={{ color: 'var(--crear-cyan)' }}>{getDisplayName(task.createdBy)}</strong>
                </div>
              )}
              {assignedList.length > 0 && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>👥 Asignada a: </span>
                  <strong style={{ color: '#ffffff' }}>
                    {assignedList.map(getDisplayName).join(', ')}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* BOTÓN CERRAR */}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              borderRadius: '8px',
              padding: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            title="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL CON SCROLL */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.4rem'
        }}>
          {/* BARRA DE TIEMPO LÍMITE Y ESTADO */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            flexWrap: 'wrap',
            gap: '0.6rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <Clock size={16} className="text-gold" />
              <span style={{ color: 'var(--text-muted)' }}>Fecha límite:</span>
              <strong style={{ color: '#ffffff' }}>
                {task.deadline ? new Date(task.deadline).toLocaleString('es-ES', { 
                  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                }) : 'Sin fecha fijada'}
              </strong>
            </div>

            <span style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              padding: '0.3rem 0.8rem',
              borderRadius: '16px',
              color: countdown.color,
              background: countdown.bg,
              border: `1.5px solid ${countdown.border}`,
              letterSpacing: '0.3px'
            }}>
              {countdown.label}
            </span>
          </div>

          {/* 1. SECCIÓN DE AVANCE (%) */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(41, 171, 226, 0.2)',
            borderRadius: '12px',
            padding: '1.2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <TrendingUp size={18} style={{ color: 'var(--crear-cyan)' }} />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#ffffff' }}>
                  Porcentaje de Avance
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  color: progress === 100 ? '#10b981' : (progress >= 50 ? 'var(--crear-cyan)' : 'var(--crear-gold)')
                }}>
                  {progress}%
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                  color: isCompleted ? '#10b981' : '#facc15',
                  border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 193, 7, 0.3)'}`,
                  fontWeight: 700
                }}>
                  {isCompleted ? 'COMPLETADA' : (progress > 0 ? 'EN PROCESO' : 'PENDIENTE')}
                </span>
              </div>
            </div>

            {/* Barra visual de progreso */}
            <div style={{
              width: '100%',
              height: '10px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '1rem',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: progress === 100 
                  ? 'linear-gradient(90deg, #10b981, #34d399)' 
                  : 'linear-gradient(90deg, #29abe2, #d4af37)',
                transition: 'width 0.35s ease-out'
              }} />
            </div>

            {/* Botones de selección rápida y slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                {[0, 25, 50, 75, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSetQuickProgress(val)}
                    style={{
                      padding: '0.45rem 0.2rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: progress === val ? 800 : 600,
                      cursor: 'pointer',
                      border: `1px solid ${progress === val ? 'var(--crear-cyan)' : 'rgba(255,255,255,0.1)'}`,
                      background: progress === val ? 'rgba(41, 171, 226, 0.25)' : 'rgba(255,255,255,0.03)',
                      color: progress === val ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {val === 100 ? '✅ 100%' : `${val}%`}
                  </button>
                ))}
              </div>

              {/* Slider interactivo */}
              <input 
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={(e) => handleSetQuickProgress(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  cursor: 'pointer',
                  accentColor: 'var(--crear-cyan)'
                }}
              />
            </div>
          </div>

          {/* 2. SECCIÓN DE ADJUNTAR Y VER EVIDENCIAS */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            borderRadius: '12px',
            padding: '1.2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <LinkIcon size={18} style={{ color: 'var(--crear-gold)' }} />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#ffffff' }}>
                  Evidencias de Cumplimiento ({evidencesList.length})
                </h3>
              </div>

              {!showAddEvidence && (
                <button
                  type="button"
                  onClick={() => setShowAddEvidence(true)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: 'rgba(212, 175, 55, 0.15)',
                    color: 'var(--crear-gold)',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Plus size={14} /> + Adjuntar Evidencia
                </button>
              )}
            </div>

            {/* Formulario para añadir nueva evidencia (Subida a Drive / Enlace) */}
            {showAddEvidence && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px dashed rgba(212, 175, 55, 0.45)',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem'
              }}>
                {/* Pestañas de modo: Subir Archivo vs Pegar Enlace */}
                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => setEvidenceMode('upload')}
                    style={{
                      padding: '0.35rem 0.8rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: evidenceMode === 'upload' ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                      color: evidenceMode === 'upload' ? 'var(--crear-cyan)' : 'var(--text-muted)',
                      borderBottom: evidenceMode === 'upload' ? '2px solid var(--crear-cyan)' : '2px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <UploadCloud size={14} /> 📁 Subir Archivo (Google Drive / Nube)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceMode('link')}
                    style={{
                      padding: '0.35rem 0.8rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: evidenceMode === 'link' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                      color: evidenceMode === 'link' ? 'var(--crear-gold)' : 'var(--text-muted)',
                      borderBottom: evidenceMode === 'link' ? '2px solid var(--crear-gold)' : '2px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <LinkIcon size={14} /> 🔗 Pegar Enlace
                  </button>
                </div>

                {/* MODO SUBIR ARCHIVO */}
                {evidenceMode === 'upload' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,image/*"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />

                    {/* Zona Dropzone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: selectedFile ? '0.9rem' : '1.4rem 1rem',
                        border: isDragging ? '2px dashed var(--crear-cyan)' : '1px dashed rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        background: isDragging ? 'rgba(0, 210, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      {selectedFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', justifyContent: 'center' }}>
                          <FileCheck size={24} style={{ color: 'var(--crear-cyan)' }} />
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.88rem' }}>
                              {selectedFile.name}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              Tamaño: {formatFileSize(selectedFile.size)} • Clic para cambiar
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <UploadCloud size={30} style={{ color: 'var(--crear-cyan)', opacity: 0.85 }} />
                          <div style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 600 }}>
                            Haz clic para examinar o arrastra aquí tu documento
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                            PDF, Excel, Word, Fotos o Comprobantes (máx. 25MB)
                          </div>
                        </>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Nombre o descripción de la evidencia (opcional)"
                      value={newEvidenceTitle}
                      onChange={(e) => setNewEvidenceTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.8rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />

                    {isUploadingFile && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--crear-cyan)', fontSize: '0.82rem', padding: '0.2rem 0' }}>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>{uploadProgress || 'Subiendo archivo...'}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.2rem' }}>
                      <button
                        type="button"
                        disabled={isUploadingFile}
                        onClick={() => { setShowAddEvidence(false); setSelectedFile(null); }}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          cursor: isUploadingFile ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!selectedFile || isUploadingFile}
                        onClick={handleUploadFile}
                        style={{
                          padding: '0.45rem 1rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          background: selectedFile && !isUploadingFile ? 'var(--crear-cyan)' : 'rgba(255,255,255,0.1)',
                          color: selectedFile && !isUploadingFile ? '#000000' : 'var(--text-muted)',
                          border: 'none',
                          cursor: selectedFile && !isUploadingFile ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isUploadingFile ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Guardando...
                          </>
                        ) : (
                          <>
                            <UploadCloud size={14} /> ☁️ Subir y Guardar en Google Drive
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* MODO PEGAR ENLACE MANUAL */}
                {evidenceMode === 'link' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Ingresa el enlace de Google Drive, Google Sheets, Docs o cualquier recurso web:
                    </div>

                    <input 
                      type="url"
                      placeholder="https://drive.google.com/file/... o enlace web"
                      value={newEvidenceUrl}
                      onChange={(e) => setNewEvidenceUrl(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.8rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />

                    <input 
                      type="text"
                      placeholder="Descripción de la evidencia (ej: Presupuesto Agosto final, Foto de asistencia)"
                      value={newEvidenceTitle}
                      onChange={(e) => setNewEvidenceTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.8rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.2rem' }}>
                      <button
                        type="button"
                        onClick={() => { setShowAddEvidence(false); setNewEvidenceUrl(''); }}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          cursor: 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddEvidenceItem}
                        style={{
                          padding: '0.45rem 1rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          background: 'var(--crear-gold)',
                          color: '#000000',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <Plus size={14} /> Añadir a la lista
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Listado de evidencias adjuntas */}
            {evidencesList.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '1.4rem',
                background: 'rgba(0, 0, 0, 0.18)',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                border: '1px dashed rgba(255,255,255,0.06)'
              }}>
                Sin evidencias adjuntas todavía. Haz clic en <strong>"+ Adjuntar Evidencia"</strong> para subir un archivo a Google Drive o ingresar tu enlace.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {evidencesList.map((ev, idx) => {
                  const category = getEvidenceCategory(ev.url, ev.fileName || ev.title, ev.provider);
                  return (
                    <div
                      key={ev.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '0.7rem 0.95rem',
                        gap: '0.8rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.1rem' }}>{category.icon}</span>
                          <span>{ev.title || ev.fileName || 'Evidencia adjunta'}</span>
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '0.12rem 0.45rem',
                            borderRadius: '10px',
                            background: category.bg,
                            color: category.color,
                            border: `1px solid ${category.border}`,
                            fontWeight: 700
                          }}>
                            {category.label}
                          </span>
                          {ev.fileSize && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              ({formatFileSize(ev.fileSize)})
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', wordBreak: 'break-all' }}>
                          {ev.url}
                        </div>
                        {ev.addedByName && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            Adjuntado por: {ev.addedByName} {ev.createdAt ? `• ${new Date(ev.createdAt).toLocaleDateString()}` : ''}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <a 
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'rgba(41, 171, 226, 0.18)',
                            color: 'var(--crear-cyan)',
                            border: '1px solid rgba(41, 171, 226, 0.4)',
                            padding: '0.38rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <ExternalLink size={13} /> Abrir Evidencia ↗
                        </a>

                        <button
                          type="button"
                          onClick={() => handleRemoveEvidence(ev.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '0.38rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Eliminar evidencia"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. SECCIÓN DE BITÁCORA DE AVANCES Y NOTAS */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1.2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.8rem' }}>
              <Edit3 size={18} style={{ color: 'var(--crear-cyan)' }} />
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#ffffff' }}>
                Bitácora de Avances y Notas
              </h3>
            </div>

            {/* Caja para registrar nuevo avance */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <textarea 
                rows="2"
                placeholder="Escribe un avance u observación (ej: Se actualizó la columna de viáticos, pendiente validación final...)"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  lineHeight: 1.4
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!newNoteText.trim()}
                  style={{
                    padding: '0.4rem 0.9rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: newNoteText.trim() ? 'var(--crear-cyan)' : 'rgba(255,255,255,0.08)',
                    color: newNoteText.trim() ? '#000000' : 'var(--text-muted)',
                    border: 'none',
                    cursor: newNoteText.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Send size={13} /> Registrar Avance
                </button>
              </div>
            </div>

            {/* Historial de avances */}
            {notesList.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                Aún no hay notas de avance registradas.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                {notesList.map((n, i) => (
                  <div 
                    key={n.id || i}
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderLeft: '3px solid var(--crear-cyan)',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '0 6px 6px 0',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <strong style={{ color: 'var(--crear-cyan)', fontSize: '0.75rem' }}>
                        {n.authorName || 'Usuario'} {n.progressPercentage !== undefined ? `(${n.progressPercentage}% avance)` : ''}
                      </strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-main)', lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>
                      {n.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER CON ACCIONES */}
        <div style={{
          padding: '1.2rem 1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.8rem'
        }}>
          {/* BOTÓN COMPLETAR O REABRIR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={handleToggleCompleted}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: `1px solid ${isCompleted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                background: isCompleted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.18)',
                color: isCompleted ? '#f87171' : '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckCircle2 size={16} />
              {isCompleted ? 'Reabrir Tarea' : 'Marcar Completada'}
            </button>

            {isCreator && onEditTaskParams && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditTaskParams(task);
                }}
                style={{
                  padding: '0.55rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                title="Editar fecha, asignados o rol de la tarea"
              >
                <Edit3 size={14} /> Editar Configuración
              </button>
            )}
          </div>

          {/* BOTONES GUARDAR Y CANCELAR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'transparent',
                color: 'var(--text-muted)'
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="btn-neon-action"
              style={{
                padding: '0.55rem 1.4rem',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              {isSaving ? (
                <>
                  <RefreshCw size={15} className="spin" /> Guardando...
                </>
              ) : (
                <>
                  <Sparkles size={15} /> Guardar Avances
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
