import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Clock, Shirt, Sparkles, CheckCircle2, ShieldCheck, Calendar, Info, 
  Briefcase, Building, UserCheck, Lock, Eye, Mail, MessageSquare, Send, 
  Save, Plus, Trash2, Edit2, Check, Users, AlertCircle, Copy, UserPlus, 
  ChevronRight, MapPin
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { USERS_TO_IMPORT } from '../data/usersToImport';
import { normalizeRole, normalizeSede, OPERATIONAL_SEDES } from '../data/usersData';
import { useCycles } from '../context/CyclesContext';
import { useAuth } from '../context/AuthContext';
import { 
  checkScheduleAuthority, 
  notifyTeamScheduleUpdated, 
  recordStaffAcknowledgement, 
  auditAcknowledgements 
} from '../services/scheduleGovernanceAgent';

// Helper para obtener los gerentes y coordinadores reales de una sede
function getLeadershipForSede(sedeName) {
  const normSede = normalizeSede(sedeName);
  const cleanTarget = normSede.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let leaders = USERS_TO_IMPORT.filter(u => {
    // Excluir personal desvinculado
    const email = (u.email || '').toLowerCase();
    const name = (u.name || '').toLowerCase();
    if (email.includes('leyla') || name.includes('leyla')) return false;

    const uSede = normalizeSede(u.sede || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const uRole = (u.role || u.appRole || '').toLowerCase();
    const isThisSede = uSede.includes(cleanTarget);
    const isLeader = uRole.includes('gerente') || uRole.includes('coord') || uRole.includes('director');
    return isThisSede && isLeader;
  });

  // Especial Quito: asegurar inclusión de Marcela Robbys (coord_c1 oficial de Quito)
  if (cleanTarget.includes('quito')) {
    const hasMarcela = leaders.some(u => (u.email || '').toLowerCase().includes('marobel'));
    if (!hasMarcela) {
      leaders.push({
        id: 'coord_marcela_quito',
        name: 'Marcela Robbys',
        role: 'coord_c1',
        sede: 'Quito',
        email: 'marobel.studio@gmail.com'
      });
    }
  }

  const mapped = leaders.map(u => {
    let cleanName = u.name;
    let cleanRole = 'Coordinador';
    const r = (u.role || u.appRole || '').toLowerCase();
    const email = (u.email || '').toLowerCase();

    // Mapeo riguroso de coordinadores y gerentes de Quito y sedes
    if (email.includes('katherine.aguirre')) {
      cleanName = 'Karla Aguirre';
      cleanRole = 'Coord. C1/C2';
    } else if (email.includes('karla.pastrano')) {
      cleanName = 'Karla Pastrano';
      cleanRole = 'Coord. C1';
    } else if (email.includes('adrianna.guarochico') || email.includes('adrianna@')) {
      cleanName = 'Adrianna Guarochico';
      cleanRole = 'Coord. C1';
    } else if (email.includes('marco.gonzalez') || email.includes('adams')) {
      cleanName = 'Adams Gonzalez';
      cleanRole = 'Coord. C2';
    } else if (email.includes('daniela.esposito')) {
      cleanName = 'Daniela Esposito';
      cleanRole = 'Coord. C2';
    } else if (email.includes('danna.guaman')) {
      cleanName = 'Danna Guaman';
      cleanRole = 'Coord. C2';
    } else if (email.includes('marobel')) {
      cleanName = 'Marcela Robbys';
      cleanRole = 'Coord. C1/C2';
    } else if (email.includes('erika.gavilanez')) {
      cleanName = 'Erika Gavilanez';
      cleanRole = 'Coord. Maestría';
    } else if (email.includes('liliana.cubillo')) {
      cleanName = 'Liliana Cubillo';
      cleanRole = 'Coord. Maestría';
    } else if (email.includes('emily.campuzano')) {
      cleanName = 'Emily Campuzano';
      cleanRole = 'Gerente de Sede';
    } else if (email.includes('freddy.sosa')) {
      cleanName = 'David Sosa';
      cleanRole = 'Gerente de Sede';
    } else if (r.includes('gerente')) {
      cleanRole = 'Gerente de Sede';
    } else if (r.includes('maestria') || r.includes('mj')) {
      cleanRole = 'Coord. Maestría';
    } else if (r.includes('c1') || r.includes('c2')) {
      cleanRole = 'Coord. C1/C2';
    }

    return {
      id: u.id || u.email.split('@')[0],
      name: cleanName,
      role: cleanRole,
      email: u.email
    };
  });

  // Orden ejecutivo de columnas en el cuadro:
  // 1. Gerentes
  // 2. Coord. Maestría
  // 3. Coord. C1/C2 y C1
  // 4. Coord. C2
  const rolePriority = (role) => {
    if (role.includes('Gerente')) return 1;
    if (role.includes('Maestría')) return 2;
    if (role.includes('C1/C2')) return 3;
    if (role.includes('C1')) return 4;
    if (role.includes('C2')) return 5;
    return 6;
  };

  return mapped.sort((a, b) => rolePriority(a.role) - rolePriority(b.role));
}

// Plantilla de filas iniciales por entrenamiento
const DEFAULT_SCHEDULE_TEMPLATE = [
  // UNO (C1)
  {
    id: 'uno_jue_1',
    training: 'UNO',
    dia: 'Jueves',
    horario: '4:30 PM - Cierre',
    assignments: {},
    vestimenta: 'Negro',
    nota: 'Grounding Inicial C1'
  },
  {
    id: 'uno_vie_1',
    training: 'UNO',
    dia: 'Viernes',
    horario: '7:30 AM - 3:00 PM',
    assignments: {},
    vestimenta: 'Negro formal',
    nota: 'Jornada Mañana'
  },
  {
    id: 'uno_vie_2',
    training: 'UNO',
    dia: 'Viernes',
    horario: '5:00 PM - Cierre',
    assignments: {},
    vestimenta: 'Negro formal',
    nota: 'Noche de Confianza'
  },
  {
    id: 'uno_sab_1',
    training: 'UNO',
    dia: 'Sábado',
    horario: '8:00 AM - 4:00 PM',
    assignments: {},
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Caída de Confianza'
  },
  {
    id: 'uno_sab_2',
    training: 'UNO',
    dia: 'Sábado',
    horario: '3:00 PM - Cierre',
    assignments: {},
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Turno Tarde'
  },
  {
    id: 'uno_dom_1',
    training: 'UNO',
    dia: 'Domingo',
    horario: '8:00 AM - Cierre',
    assignments: {},
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Graduación y Cierre Ciclo'
  },

  // DOS (C2)
  {
    id: 'dos_jue_1',
    training: 'DOS',
    dia: 'Jueves',
    horario: '10:30 AM - 4:00 PM',
    assignments: {},
    vestimenta: 'Negro formal',
    nota: 'Apertura Oficial C2'
  },
  {
    id: 'dos_jue_2',
    training: 'DOS',
    dia: 'Jueves',
    horario: '4:00 PM - Cierre',
    assignments: {},
    vestimenta: 'Negro formal',
    nota: 'Cierre Jueves C2'
  },
  {
    id: 'dos_vie_1',
    training: 'DOS',
    dia: 'Viernes',
    horario: '7:15 AM - 4:00 PM',
    assignments: {},
    vestimenta: 'Polo negro + pantalón negro',
    nota: '14:01 PM Palabra Rota'
  },
  {
    id: 'dos_vie_2',
    training: 'DOS',
    dia: 'Viernes',
    horario: '4:00 PM - Cierre',
    assignments: {},
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Guardia y Logística'
  },
  {
    id: 'dos_sab_1',
    training: 'DOS',
    dia: 'Sábado',
    horario: '7:30 AM - 3:00 PM',
    assignments: {},
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Tanque & Rompimiento de Barreras'
  },
  {
    id: 'dos_sab_2',
    training: 'DOS',
    dia: 'Sábado',
    horario: '3:00 PM - Cierre',
    assignments: {},
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Vuelos C2'
  },
  {
    id: 'dos_dom_1',
    training: 'DOS',
    dia: 'Domingo',
    horario: 'Inicio - Cierre',
    assignments: {},
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Jornada Dominical C2'
  },
  {
    id: 'dos_dom_2',
    training: 'DOS',
    dia: 'Domingo',
    horario: '3:00 PM - Cierre',
    assignments: {},
    vestimenta: 'Polo negro + pantalón negro',
    nota: 'Cierre General C2'
  },

  // MAESTRÍA (MJ)
  {
    id: 'mj_vie_1',
    training: 'MAESTRÍA',
    dia: 'Viernes',
    horario: '3:00 PM - 9:00 PM',
    assignments: {},
    vestimenta: 'Negro formal',
    nota: 'Alineamiento General Maestría'
  },
  {
    id: 'mj_sab_1',
    training: 'MAESTRÍA',
    dia: 'Sábado',
    horario: '8:30 AM - 12:00 PM / 4:00 PM - 9:00 PM',
    assignments: {},
    vestimenta: 'Camiseta negra + pantalón negro',
    nota: 'Jornada Intensiva MJ'
  },
  {
    id: 'mj_dom_1',
    training: 'MAESTRÍA',
    dia: 'Domingo',
    horario: '8:30 AM - 12:00 PM / 4:00 PM - Cierre',
    assignments: {},
    vestimenta: 'Camiseta negra + pantalón negro',
    nota: 'FDS 4 El Viaje con Paul Sosa y Pase de Antorcha'
  }
];

export default function HorariosEntrenamientoModal({ isOpen, onClose, currentUser }) {
  const [activeTab, setActiveTab] = useState('matriz_equipos');
  
  // Usuario activo (vía prop o fallback desde AuthContext)
  const auth = useAuth?.() || {};
  const activeUser = currentUser || auth.currentUser;

  // Contexto de Ciclos y Fechas Oficiales
  const cyclesContext = useCycles?.() || {};
  const { currentCycle, currentStage } = cyclesContext;

  // Sede seleccionada (auto-detecta la sede del usuario)
  const initialSede = useMemo(() => {
    const norm = normalizeSede(activeUser?.sede);
    return OPERATIONAL_SEDES.includes(norm) ? norm : 'Lima';
  }, [activeUser]);

  const [selectedSede, setSelectedSede] = useState(initialSede);

  // Sede key para Firestore
  const sedeKey = selectedSede.toLowerCase().trim().replace(/\s+/g, '_');
  const nodusDocId = `${sedeKey}_horarios_equipos`;

  // Control de Gobernanza y Mando Organizacional vía ScheduleGovernanceAgent:
  // Solo los Gerentes de Sede, Dirección General y SuperAdmins pueden editar.
  // El resto del equipo accede en Modo Consulta Oficial (Solo Lectura).
  const authority = useMemo(() => {
    return checkScheduleAuthority(activeUser, selectedSede);
  }, [activeUser, selectedSede]);

  const isManager = authority.canEdit;

  // Aislamiento y Privacidad Estricta de Sede:
  // "en los horarios los gerentes y equipos solo pueden ver su sede"
  // Solo SuperAdmins y Dirección Global tienen visibilidad multi-sede.
  const canSwitchSedes = Boolean(authority.isSuperAdmin);

  // Asegurar que si el usuario no tiene permisos globales, permanezca fijado en su sede asignada
  useEffect(() => {
    if (!canSwitchSedes && initialSede && selectedSede !== initialSede) {
      setSelectedSede(initialSede);
    }
  }, [canSwitchSedes, initialSede, selectedSede]);

  // Lista de colaboradores y filas por sede
  const [staffList, setStaffList] = useState([]);
  const [scheduleRows, setScheduleRows] = useState([]);
  const [filterTraining, setFilterTraining] = useState('TODOS');
  const [highlightPerson, setHighlightPerson] = useState('TODOS');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [lastSaved, setLastSaved] = useState(null);

  // Acuses de Recibo ("Leído y Enterado")
  const [acknowledgements, setAcknowledgements] = useState({});
  const [isConfirmingAck, setIsConfirmingAck] = useState(false);
  const [showAckAuditModal, setShowAckAuditModal] = useState(false);

  // Popover rápido de celda activa
  const [activeCellPicker, setActiveCellPicker] = useState(null); // { rowId, staffId }

  // Modales
  const [showManageStaffModal, setShowManageStaffModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({ name: '', role: '', email: '' });
  const [copyFeedback, setCopyFeedback] = useState('');

  // Cargar colaboradores y horarios de la sede seleccionada
  useEffect(() => {
    if (!isOpen) return;

    // 1. Cargar el equipo real de esta sede desde el catálogo oficial
    const realLeadership = getLeadershipForSede(selectedSede);

    // 2. Suscribirse a Firestore para la sede elegida
    try {
      const docRef = doc(db, 'nodus_training_schedules', nodusDocId);
      const unsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.staff && Array.isArray(data.staff) && data.staff.length > 0) {
            // Filtrar y sanear desvinculados
            const clean = data.staff.filter(s => {
              const name = (s.name || '').toLowerCase();
              const email = (s.email || '').toLowerCase();
              return !name.includes('leyla') && !email.includes('leyla');
            });
            setStaffList(clean);
          } else {
            setStaffList(realLeadership);
          }

          if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
            setScheduleRows(data.rows);
          } else {
            // Inicializar filas con el equipo de la sede
            setScheduleRows(DEFAULT_SCHEDULE_TEMPLATE);
          }

          if (data.acknowledgements && typeof data.acknowledgements === 'object') {
            setAcknowledgements(data.acknowledgements);
          } else {
            setAcknowledgements({});
          }

          if (data.updatedAt) {
            setLastSaved(new Date(data.updatedAt).toLocaleTimeString());
          }
        } else {
          // Documento no existe en Firestore aún para esta sede
          setStaffList(realLeadership);
          setScheduleRows(DEFAULT_SCHEDULE_TEMPLATE);
          setAcknowledgements({});
        }
      }, (err) => {
        console.warn(`Error leyendo horarios para ${selectedSede}:`, err);
        setStaffList(realLeadership);
        setScheduleRows(DEFAULT_SCHEDULE_TEMPLATE);
        setAcknowledgements({});
      });

      return () => unsub();
    } catch (err) {
      console.warn('Error en conexión Firestore:', err);
      setStaffList(realLeadership);
      setScheduleRows(DEFAULT_SCHEDULE_TEMPLATE);
      setAcknowledgements({});
    }
  }, [isOpen, selectedSede, nodusDocId]);

  // Guardar en Causa OS y notificar por correo con copia a Eli Escobar y Lennin (y Gabriela Rivadeneyra en Lima)
  const handleSaveToCausa = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const docRef = doc(db, 'nodus_training_schedules', nodusDocId);
      const payload = {
        sede: selectedSede,
        rows: scheduleRows,
        staff: staffList,
        acknowledgements: acknowledgements || {},
        updatedAt: new Date().toISOString(),
        updatedBy: activeUser?.name || activeUser?.displayName || activeUser?.email || 'Gerente Causa OS',
        updatedByEmail: activeUser?.email || ''
      };

      const cleanPayload = JSON.parse(JSON.stringify(payload));
      await setDoc(docRef, cleanPayload, { merge: true });

      // 1. Disparar Notificaciones In-App en Causa OS para todo el equipo de la sede
      try {
        await notifyTeamScheduleUpdated({
          sede: selectedSede,
          updatedBy: activeUser?.name || activeUser?.displayName || 'Gerencia de Sede',
          staffList: staffList
        });
      } catch (notifErr) {
        console.warn('Error enviando notificaciones in-app:', notifErr);
      }

      // Enviar correo a los colaboradores asignados con copia a Eli Escobar y Lennin Chasi
      // Y si la sede es LIMA (SOLO EN LIMA), incluir con copia a Gabriela Rivadeneyra (Contadora Lima)
      const isLima = selectedSede.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('lima');
      try {
        const staffEmails = staffList.map(s => s.email).filter(Boolean);
        const ccEmails = ['contabilidad.global@crearpsl.net', 'talento.humano@crearpsl.net'];
        if (isLima) {
          ccEmails.push('contabilidad.lima@crearpsl.net');
          ccEmails.push('grivadeneira@crearpsl.com');
        }
        const recipientList = Array.from(new Set([...staffEmails, ...ccEmails]));

        const rowsHtml = scheduleRows.map(r => {
          const staffAssignments = staffList.map(s => {
            const asg = r.assignments?.[s.id] || '—';
            return `<td style="padding: 6px 10px; text-align: center; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 600;">${asg}</td>`;
          }).join('');

          return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 10px; font-weight: 700; border: 1px solid #e2e8f0;">${r.training} - ${r.nota || ''}</td>
              <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${r.dia}</td>
              <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: 600; color: #0284c7;">${r.horario}</td>
              ${staffAssignments}
              <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 12px;">${r.vestimenta || 'Oficial'}</td>
            </tr>
          `;
        }).join('');

        const staffHeadersHtml = staffList.map(s => 
          `<th style="padding: 8px 10px; background: #f1f5f9; border: 1px solid #cbd5e1; font-size: 11px; text-align: center;">${s.name}<br/><span style="font-weight: normal; color: #64748b;">${s.role}</span></th>`
        ).join('');

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 900px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 20px; border-radius: 8px; color: #ffffff; margin-bottom: 20px;">
              <h2 style="margin: 0 0 6px 0; color: #f59e0b;">📢 Horarios y Turnos de Entrenamiento — Sede ${selectedSede.toUpperCase()}</h2>
              <p style="margin: 0; font-size: 14px; color: #94a3b8;">Actualizado en <strong>Causa OS</strong> por ${currentUser?.name || currentUser?.email || 'Gerencia de Sede'}</p>
            </div>

            <p style="font-size: 14px; line-height: 1.6;">
              Estimado equipo de <strong>${selectedSede}</strong>,<br/>
              Se han guardado y actualizado oficialmente los horarios, dinámicas y turnos de sala en <strong>Causa OS</strong> para los entrenamientos UNO, DOS y MAESTRÍA.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left;">Entrenamiento</th>
                  <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left;">Día</th>
                  <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left;">Horario</th>
                  ${staffHeadersHtml}
                  <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left;">Vestimenta</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div style="background: #f8fafc; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 4px; font-size: 13px;">
              <strong>📌 Copia oficial enviada a:</strong><br/>
              • <strong>Eli Escobar</strong> (Jefa Financiera): <code>contabilidad.global@crearpsl.net</code><br/>
              • <strong>Lennin Chasi</strong> (Talento Humano): <code>talento.humano@crearpsl.net</code><br/>
              ${isLima ? '• <strong>Gabriela Rivadeneyra</strong> (Contadora Lima): <code>contabilidad.lima@crearpsl.net</code><br/>' : ''}
            </div>

            <p style="text-align: center; margin-top: 25px;">
              <a href="https://centro-operativo-cpsl.web.app" style="background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                Ver en Causa OS
              </a>
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">CREAR Poder Sin Límites — Plataforma Operativa Causa OS</p>
          </div>
        `;

        await addDoc(collection(db, 'mail'), {
          to: recipientList,
          cc: ccEmails,
          message: {
            subject: `📅 [Causa OS] Horarios y Turnos Actualizados — Sede ${selectedSede}`,
            html: emailHtml
          },
          createdAt: serverTimestamp()
        });
      } catch (mailErr) {
        console.warn('Error despachando correo de notificación:', mailErr);
      }

      setLastSaved(new Date().toLocaleTimeString());
      setHasUnsavedChanges(false);
      const notifMsg = isLima 
        ? 'Guardado en Causa OS y notificado por correo a Eli Escobar, Lennin y Gabriela Rivadeneyra (Lima)' 
        : 'Guardado en Causa OS y notificado por correo a Eli Escobar y Lennin';
      setSaveMessage(notifMsg);
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (err) {
      console.error('Error al guardar en Causa OS:', err);
      setSaveMessage(err?.message ? `Error al guardar: ${err.message}` : 'Error al guardar. Intente nuevamente.');
      setTimeout(() => setSaveMessage(''), 6000);
    } finally {
      setIsSaving(false);
    }
  };

  // Alias retrocompatible
  const handleSaveToNodus = handleSaveToCausa;

  // Comprobación de Acuse de Recibo del Colaborador en sesión
  const activeUserEmail = (activeUser?.email || '').toLowerCase().trim();
  const isUserInCurrentStaff = staffList.some(s => (s.email || '').toLowerCase().trim() === activeUserEmail);
  const userAckKey = activeUserEmail.replace(/[\.\@\-]/g, '_');
  const userAck = acknowledgements[userAckKey] || Object.values(acknowledgements).find(a => (a.email || '').toLowerCase().trim() === activeUserEmail);

  // Auditoría logística de Acuses de Recibo para Gerencia
  const ackAudit = useMemo(() => {
    return auditAcknowledgements(acknowledgements, staffList);
  }, [acknowledgements, staffList]);

  // Manejador del botón "Confirmar de Leído y Enterado"
  const handleConfirmAck = async () => {
    if (!activeUser?.email) {
      alert('Debes tener una sesión activa con correo oficial para confirmar tu acuse de recibo.');
      return;
    }
    setIsConfirmingAck(true);
    try {
      await recordStaffAcknowledgement({
        sedeDocId: nodusDocId,
        user: activeUser,
        sede: selectedSede
      });
      setSaveMessage('✅ ¡Acuse de recibo registrado con éxito! Has confirmado de Leído y Enterado.');
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (err) {
      console.error('Error al registrar acuse de recibo:', err);
      alert('Error registrando acuse de recibo: ' + (err.message || 'Error de conexión'));
    } finally {
      setIsConfirmingAck(false);
    }
  };

  // Modificar campo in-line de una fila (horario, nota, vestimenta, día)
  const handleInlineRowUpdate = (rowId, field, value) => {
    setScheduleRows(prev => prev.map(row => {
      if (row.id === rowId) {
        return { ...row, [field]: value };
      }
      return row;
    }));
    setHasUnsavedChanges(true);
  };

  // Modificar celda de asignación de una persona
  const handleCellAssignment = (rowId, staffId, value) => {
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
    setHasUnsavedChanges(true);
    setActiveCellPicker(null);
  };

  // Agregar nuevo turno
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
      nota: 'Nueva Dinámica'
    };

    setScheduleRows(prev => [...prev, newRow]);
    setHasUnsavedChanges(true);
  };

  // Eliminar fila
  const handleDeleteRow = (rowId) => {
    if (window.confirm('¿Deseas eliminar este turno de entrenamiento de la matriz?')) {
      setScheduleRows(prev => prev.filter(r => r.id !== rowId));
      setHasUnsavedChanges(true);
    }
  };

  // Agregar nuevo colaborador a la sede
  const handleAddStaffMember = () => {
    if (!newStaffForm.name.trim()) {
      alert('Ingresa el nombre del colaborador');
      return;
    }
    const staffId = newStaffForm.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);
    const newStaff = {
      id: staffId,
      name: newStaffForm.name.trim(),
      role: newStaffForm.role.trim() || 'Coordinador',
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

  // Incorporar coordinador oficial de la sede a la matriz activa
  const handleAddExistingStaff = (staff) => {
    if (staffList.some(s => s.id === staff.id || (s.email && s.email.toLowerCase() === staff.email.toLowerCase()))) {
      return;
    }
    setStaffList(prev => [...prev, staff]);
    setScheduleRows(prev => prev.map(row => ({
      ...row,
      assignments: {
        ...row.assignments,
        [staff.id]: '—'
      }
    })));
    setHasUnsavedChanges(true);
  };

  // Retirar colaborador de la sede
  const handleDeleteStaffMember = (staffId, staffName) => {
    if (window.confirm(`¿Retirar a "${staffName}" de la matriz de horarios de ${selectedSede}?`)) {
      setStaffList(prev => prev.filter(s => s.id !== staffId));
      setScheduleRows(prev => prev.map(row => {
        const copy = { ...row.assignments };
        delete copy[staffId];
        return { ...row, assignments: copy };
      }));
      setHasUnsavedChanges(true);
    }
  };

  // Badges limpios y visibles para asignación en celdas
  const renderCellBadge = (val) => {
    const rawVal = (val || '—').trim();

    let bg = 'rgba(2, 132, 199, 0.1)';
    let color = '#0284c7';
    let border = 'rgba(2, 132, 199, 0.3)';

    if (rawVal === '✓' || rawVal.toLowerCase() === 'ok' || rawVal.toLowerCase() === 'si') {
      bg = 'rgba(34, 197, 94, 0.14)';
      color = '#16a34a';
      border = 'rgba(34, 197, 94, 0.35)';
    } else if (rawVal === '—' || rawVal === '-' || rawVal === '') {
      bg = 'var(--bg-dark, #f8fafc)';
      color = 'var(--text-muted)';
      border = '1px dashed var(--border-subtle)';
    } else if (rawVal.toLowerCase().includes('tanque')) {
      bg = 'var(--crear-gold-light)';
      color = 'var(--crear-gold, #d97706)';
      border = 'rgba(255, 193, 7, 0.4)';
    } else if (rawVal.toLowerCase().includes('vuelo')) {
      bg = 'rgba(244, 114, 182, 0.15)';
      color = '#db2777';
      border = 'rgba(244, 114, 182, 0.35)';
    } else if (rawVal.toLowerCase().includes('barrera')) {
      bg = 'rgba(249, 115, 22, 0.15)';
      color = '#ea580c';
      border = 'rgba(249, 115, 22, 0.35)';
    } else if (rawVal.toLowerCase().includes('confianza')) {
      bg = 'rgba(168, 85, 247, 0.15)';
      color = '#9333ea';
      border = 'rgba(168, 85, 247, 0.35)';
    } else if (rawVal.toLowerCase().includes('grounding')) {
      bg = 'rgba(20, 184, 166, 0.15)';
      color = '#0d9488';
      border = 'rgba(20, 184, 166, 0.35)';
    }

    const isUnassigned = rawVal === '—' || rawVal === '-' || rawVal === '';

    return (
      <div 
        style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 8px', 
          borderRadius: '6px', 
          fontSize: '0.74rem', 
          fontWeight: 700,
          background: bg,
          color: color,
          border: isUnassigned ? border : `1px solid ${border}`,
          maxWidth: '130px',
          lineHeight: '1.2',
          userSelect: 'none',
          pointerEvents: 'none',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        {isUnassigned ? '— Asignar' : rawVal}
      </div>
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
    return `📢 *HORARIOS Y TURNOS DE ENTRENAMIENTO — SEDE ${selectedSede.toUpperCase()}* 📅\n\n` +
      `Estimado equipo de *${selectedSede}* (*${assignedNames}*):\n\n` +
      `Se han actualizado los *Horarios y Turnos Operativos Oficiales* para los entrenamientos UNO, DOS y MAESTRÍA en *Causa OS*.\n\n` +
      `🔗 *Consulta tus Turnos:* https://centro-operativo-cpsl.web.app\n\n` +
      `📌 *Lineamientos Clave:* \n` +
      `• Revisa tus horas asignadas y tareas en sala (Groundings, Noches de Confianza, Tanque, Rompimiento de Barreras, Vuelos).\n` +
      `• Cumplir estrictamente el Código de Vestimenta por jornada.\n` +
      `• Coordinar cualquier ajuste directamente con la Gerencia de Sede.\n\n` +
      `_Equipo Crear Poder Sin Límites — Plataforma Operativa Causa OS_`;
  };

  // Copiar mensaje para Google Chat
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

  // Enviar Correo masivo
  const handleSendBatchEmail = () => {
    const isLima = selectedSede.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('lima');
    const staffEmails = staffList.map(s => s.email).filter(Boolean);
    const ccList = ['contabilidad.global@crearpsl.net', 'talento.humano@crearpsl.net'];
    if (isLima) {
      ccList.push('contabilidad.lima@crearpsl.net');
    }
    const emails = staffEmails.join(',');
    const cc = ccList.join(',');
    const subject = `📅 Horarios Oficiales de Entrenamiento — Sede ${selectedSede} (Causa OS)`;
    const body = `Estimado Equipo de ${selectedSede},\n\n` +
      `Se han actualizado los Horarios y Turnos Operativos de Entrenamiento en Causa OS para la sede ${selectedSede}.\n\n` +
      `Por favor ingresa a la plataforma Causa OS para revisar tus jornadas, salas y tareas específicas:\n` +
      `👉 https://centro-operativo-cpsl.web.app\n\n` +
      `Saludos cordiales,\n` +
      `Gerencia de Sede ${selectedSede}\n` +
      `Crear Poder Sin Límites`;

    window.location.href = `mailto:${emails}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
        onClick={e => {
          e.stopPropagation();
        }}
        style={{
          width: '100%',
          maxWidth: '1260px',
          maxHeight: '94vh',
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
        {/* HEADER & SELECTOR CONTAINER */}
        <div 
          className="glass-panel"
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem', 
            padding: '1.2rem', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-subtle)', 
            background: 'var(--bg-glass, rgba(255, 255, 255, 0.02))',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            marginBottom: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <MapPin size={11} />
                  Sede Activa: {selectedSede}
                </span>
                <span style={{ 
                  background: isManager ? 'var(--crear-gold-light)' : 'rgba(2, 132, 199, 0.12)',
                  color: isManager ? 'var(--crear-gold)' : '#0284c7',
                  border: isManager ? '1px solid var(--border-subtle)' : '1px solid rgba(2, 132, 199, 0.3)',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {isManager ? <ShieldCheck size={11} /> : <Eye size={11} />}
                  {isManager ? '👑 Modo Gerencia: Edición Habilitada' : '🛡️ Modo Oficial: Solo Lectura'}
                </span>
                {hasUnsavedChanges && (
                  <span style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: 'var(--color-error)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '4px 10px'
                  }}>
                    ● Cambios pendientes
                  </span>
                )}
              </div>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.86rem' }}>
                Planificación operativa multi-sede de jornadas, horarios y fisionomía de sala — Almacenamiento y sincronización en <strong>Causa OS</strong>.
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
                transition: 'all 0.2s',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* SELECTOR DE SEDE */}
          {canSwitchSedes ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} className="text-gold" />
                Vista Global:
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {OPERATIONAL_SEDES.map(s => {
                  const isSel = selectedSede === s;
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        setSelectedSede(s);
                        setActiveCellPicker(null);
                      }}
                      className={isSel ? "sede-pill active" : "sede-pill"}
                      style={{
                        padding: '0.4rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: isSel ? 700 : 500,
                        cursor: 'pointer',
                        border: isSel ? '1px solid var(--crear-gold)' : '1px solid var(--border-subtle)',
                        background: isSel ? 'var(--crear-gold-light)' : 'transparent',
                        color: isSel ? 'var(--crear-gold)' : 'var(--text-muted)',
                        boxShadow: isSel ? '0 2px 8px rgba(217, 119, 6, 0.15)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => { if(!isSel) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                      onMouseLeave={e => { if(!isSel) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
              padding: '0.6rem 0.9rem',
              background: 'rgba(234, 179, 8, 0.06)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(234, 179, 8, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} className="text-gold" />
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  Sede Operativa Asignada: <span style={{ color: 'var(--crear-gold)', textTransform: 'uppercase' }}>{selectedSede}</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                <ShieldCheck size={14} style={{ color: '#10b981' }} />
                <span>Privacidad y Aislamiento de Sede Activo</span>
              </div>
            </div>
          )}
        </div>

        {/* TABS DE FILTRO (SEGMENTED CONTROL) */}
        <div style={{ 
          display: 'inline-flex', 
          gap: '0.2rem', 
          flexWrap: 'wrap',
          background: 'var(--bg-dark, #f1f5f9)',
          padding: '0.3rem',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.05)'
        }}>
          {[
            { id: 'matriz_equipos', label: `🗓️ Matriz de Horarios (${selectedSede})` },
            { id: 'todos_equipo', label: '👥 Resumen del Equipo' },
            { id: 'oficina', label: '🏢 Equipo de Oficina' },
            { id: 'gerentes', label: '👔 Gerentes de Sede' },
            { id: 'coordinadores', label: '🎯 Coordinadores' },
            { id: 'pulsos_reportes', label: '⚡ Pulsos & Reportes' },
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
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  border: 'none',
                  background: isSelected 
                    ? 'var(--bg-card)' 
                    : 'transparent',
                  color: isSelected 
                    ? 'var(--crear-gold)' 
                    : 'var(--text-muted)',
                  boxShadow: isSelected ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* MENSAJE DE CONFIRMACIÓN */}
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
          {/* TAB: MATRIZ DE HORARIOS Y TURNOS (100% EDITABLE IN-LINE & MULTI-SEDE)     */}
          {/* ========================================================================= */}
          {activeTab === 'matriz_equipos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* BARRA SUPERIOR DE ACCIONES (ACTION BAR) */}
              <div 
                className="glass-panel"
                style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  padding: '1rem 1.2rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={18} className="text-gold" />
                    Horarios y Dinámicas de Entrenamiento — Sede {selectedSede}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'var(--bg-dark)', padding: '2px 8px', borderRadius: '4px' }}>
                      <Activity size={12} /> {currentCycle?.name ? `Ciclo: ${currentCycle.name}` : 'UNO / DOS / MJ'}
                    </span>
                    {currentStage && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'var(--bg-dark)', padding: '2px 8px', borderRadius: '4px' }}>
                        <Target size={12} /> Etapa: {currentStage}
                      </span>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: lastSaved ? 'var(--text-muted)' : '#f59e0b' }}>
                      <Clock size={12} /> {lastSaved ? `Guardado: ${lastSaved}` : 'Sin cambios guardados'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {!isManager && (
                    <span style={{ 
                      fontSize: '0.78rem', 
                      color: 'var(--text-muted)', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      padding: '0.45rem 0.85rem',
                      background: 'var(--bg-dark, #f8fafc)',
                      border: '1px dashed var(--border-subtle)',
                      borderRadius: '8px'
                    }}>
                      <Lock size={12} /> Modo Consulta
                    </span>
                  )}

                  {isManager && (
                    <button
                      onClick={() => setShowManageStaffModal(true)}
                      className="btn-secondary"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'transparent', border: '1px solid var(--border-subtle)' }}
                    >
                      <Users size={14} /> Equipo ({staffList.length})
                    </button>
                  )}

                  <button
                    onClick={() => setShowAckAuditModal(true)}
                    className="btn-secondary"
                    style={{ 
                      padding: '0.45rem 0.85rem', 
                      fontSize: '0.8rem', 
                      borderRadius: '8px', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.35rem',
                      borderColor: ackAudit.percentage === 100 ? 'rgba(34, 197, 94, 0.4)' : 'var(--border-subtle)',
                      background: ackAudit.percentage === 100 ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                      color: ackAudit.percentage === 100 ? '#16a34a' : 'var(--text-main)'
                    }}
                  >
                    <CheckCircle2 size={14} color={ackAudit.percentage === 100 ? '#16a34a' : '#f59e0b'} />
                    <span>Acuses ({ackAudit.confirmed}/{ackAudit.total})</span>
                  </button>

                  {isManager && (
                    <button
                      onClick={() => handleAddNewRow('UNO')}
                      className="btn-secondary"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'transparent', border: '1px solid var(--border-subtle)' }}
                    >
                      <Plus size={14} /> Nuevo Turno
                    </button>
                  )}

                  <button
                    onClick={() => setShowNotifyModal(true)}
                    className="btn-secondary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'transparent', border: '1px solid var(--border-subtle)' }}
                  >
                    <Send size={14} /> Notificar
                  </button>

                  {isManager && (
                    <button
                      onClick={handleSaveToCausa}
                      disabled={isSaving}
                      className="btn-primary"
                      style={{ 
                        padding: '0.45rem 1.2rem', 
                        fontSize: '0.82rem', 
                        borderRadius: '8px', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.4rem',
                        background: hasUnsavedChanges ? 'linear-gradient(135deg, var(--crear-gold), #d97706)' : 'var(--bg-dark)',
                        color: hasUnsavedChanges ? '#fff' : 'var(--text-muted)',
                        border: hasUnsavedChanges ? 'none' : '1px solid var(--border-subtle)',
                        boxShadow: hasUnsavedChanges ? '0 2px 10px rgba(217, 119, 6, 0.3)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Save size={14} />
                      {isSaving ? 'Guardando...' : (hasUnsavedChanges ? 'Guardar Cambios' : 'Guardado')}
                    </button>
                  )}
                </div>
              </div>

              {/* BANNER DE ACUSE DE RECIBO (LEÍDO Y ENTERADO) PARA EL COLABORADOR */}
              {isUserInCurrentStaff && (
                <div style={{
                  background: userAck 
                    ? 'rgba(34, 197, 94, 0.08)' 
                    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.07))',
                  border: userAck 
                    ? '1px solid rgba(34, 197, 94, 0.35)' 
                    : '1px solid rgba(245, 158, 11, 0.45)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {userAck ? (
                      <CheckCircle2 size={24} color="#16a34a" />
                    ) : (
                      <AlertCircle size={24} color="#f59e0b" />
                    )}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: userAck ? '#16a34a' : '#f59e0b' }}>
                        {userAck ? '✅ Acuse de Recibo Registrado (Leído y Enterado)' : '📢 Acuse de Recibo Obligatorio de Horarios — Causa OS'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', marginTop: '2px' }}>
                        {userAck ? (
                          <>Confirmaste formalmente estar <strong>Leído y Enterado</strong> de tus horarios y vestimenta el <strong>{new Date(userAck.confirmedAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}</strong>.</>
                        ) : (
                          <>Revisa tus jornadas de sala, horarios y código de vestimenta. Por directiva de Gerencia, debes certificar tu disponibilidad:</>
                        )}
                      </div>
                    </div>
                  </div>

                  {!userAck && (
                    <button
                      onClick={handleConfirmAck}
                      disabled={isConfirmingAck}
                      className="btn-primary"
                      style={{
                        padding: '0.55rem 1.3rem',
                        fontSize: '0.84rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #16a34a, #15803d)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 10px rgba(22, 163, 74, 0.35)'
                      }}
                    >
                      <Check size={16} />
                      {isConfirmingAck ? 'Registrando...' : '✍️ Confirmar de Leído y Enterado'}
                    </button>
                  )}
                </div>
              )}

              {/* ALERTA DE SEGUIMIENTO PARA GERENTES */}
              {isManager && ackAudit.pendingList.length > 0 && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                  color: 'var(--text-main)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={14} color="#f59e0b" />
                    <span><strong>Control Logístico:</strong> Hay <strong>{ackAudit.pendingList.length}</strong> colaboradores pendientes de confirmar "Leído y Enterado" en {selectedSede}.</span>
                  </div>
                  <button
                    onClick={() => setShowAckAuditModal(true)}
                    style={{ background: 'transparent', border: 'none', color: '#0284c7', fontWeight: 700, cursor: 'pointer', fontSize: '0.76rem', textDecoration: 'underline' }}
                  >
                    Ver control de acuses
                  </button>
                </div>
              )}

              {/* FILTROS Y RESALTADO */}
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

              {/* TABLA EJECUTIVA EDITABLE IN-LINE */}
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
                      <th style={{ padding: '0.85rem 0.9rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ENTRENAMIENTO & DINÁMICA
                      </th>
                      <th style={{ padding: '0.85rem 0.7rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        DÍA
                      </th>
                      <th style={{ padding: '0.85rem 0.8rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '135px' }}>
                        HORARIO
                      </th>

                      {/* Columnas dinámicas de Gerentes y Coordinadores de esta Sede */}
                      {staffList.map(staff => {
                        const isHighlighted = highlightPerson === staff.id;
                        const isGerente = staff.role.includes('Gerente');
                        const isMaestria = staff.role.includes('Maestría');
                        const badgeBg = isGerente ? 'rgba(217, 119, 6, 0.12)' : (isMaestria ? 'rgba(147, 51, 234, 0.12)' : 'rgba(2, 132, 199, 0.12)');
                        const badgeColor = isGerente ? '#d97706' : (isMaestria ? '#9333ea' : '#0284c7');

                        return (
                          <th 
                            key={staff.id} 
                            style={{ 
                              padding: '0.75rem 0.6rem', 
                              textAlign: 'center',
                              background: isHighlighted ? 'var(--crear-gold-light)' : 'transparent',
                              borderLeft: '1px solid var(--border-subtle)',
                              borderRight: '1px solid var(--border-subtle)',
                              minWidth: '130px',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                              <div style={{ fontWeight: 700, color: isHighlighted ? 'var(--crear-gold)' : 'var(--text-heading)', fontSize: '0.85rem' }}>
                                {staff.name}
                              </div>
                              {isManager && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteStaffMember(staff.id, staff.name);
                                  }}
                                  title={`Ocultar ${staff.name} de esta matriz`}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    opacity: 0.45,
                                    borderRadius: '4px'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                  onMouseLeave={e => e.currentTarget.style.opacity = '0.45'}
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                            <div style={{
                              display: 'inline-block',
                              marginTop: '3px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: badgeBg,
                              color: badgeColor
                            }}>
                              {staff.role}
                            </div>
                          </th>
                        );
                      })}

                      {isManager && (
                        <th style={{ padding: '0.5rem', textAlign: 'center', borderLeft: '1px dashed var(--border-subtle)', borderRight: '1px dashed var(--border-subtle)', minWidth: '70px' }}>
                          <button
                            type="button"
                            onClick={() => setShowManageStaffModal(true)}
                            className="btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title="Incorporar otro coordinador o colaborador"
                          >
                            <Plus size={12} />
                            <span>Staff</span>
                          </button>
                        </th>
                      )}

                      <th style={{ padding: '0.85rem 0.9rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '150px' }}>
                        VESTIMENTA
                      </th>

                      {isManager && (
                        <th style={{ padding: '0.85rem 0.6rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                          className="matrix-row"
                          style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s ease' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover, rgba(0,0,0,0.02))'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* Entrenamiento y Actividad (Editable in-line) */}
                          <td style={{ padding: '0.7rem 0.9rem', whiteSpace: 'nowrap' }}>
                            <span style={{
                              background: trainingBg,
                              color: trainingColor,
                              border: `1px solid ${trainingColor}30`,
                              padding: '2px 7px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 800
                            }}>
                              {row.training}
                            </span>
                            {/* Campo de Actividad / Subtítulo editable in-line */}
                            <input
                              type="text"
                              value={row.nota || ''}
                              placeholder="Editar actividad..."
                              disabled={!isManager}
                              onChange={(e) => handleInlineRowUpdate(row.id, 'nota', e.target.value)}
                              onFocus={(e) => e.currentTarget.style.borderBottom = '1px dotted var(--crear-gold)'}
                              onBlur={(e) => e.currentTarget.style.borderBottom = '1px dotted transparent'}
                              style={{
                                display: 'block',
                                marginTop: '4px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: isManager ? '1px dotted transparent' : 'none',
                                color: 'var(--text-muted)',
                                fontSize: '0.74rem',
                                width: '140px',
                                outline: 'none'
                              }}
                            />
                          </td>

                          {/* Día (Editable in-line) */}
                          <td style={{ padding: '0.7rem 0.7rem', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap' }}>
                            {isManager ? (
                              <select
                                value={row.dia}
                                onChange={(e) => handleInlineRowUpdate(row.id, 'dia', e.target.value)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  borderBottom: '1px dotted var(--border-subtle)',
                                  color: 'var(--text-heading)',
                                  fontSize: '0.84rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  padding: '2px 0'
                                }}
                              >
                                <option value="Jueves">Jueves</option>
                                <option value="Viernes">Viernes</option>
                                <option value="Sábado">Sábado</option>
                                <option value="Domingo">Domingo</option>
                                <option value="Lunes">Lunes</option>
                                <option value="Miércoles">Miércoles</option>
                              </select>
                            ) : (
                              row.dia
                            )}
                          </td>

                          {/* Horario (Editable in-line sin cajas clunky) */}
                          <td style={{ padding: '0.7rem 0.8rem', whiteSpace: 'nowrap' }}>
                            <input
                              type="text"
                              value={row.horario || ''}
                              disabled={!isManager}
                              onChange={(e) => handleInlineRowUpdate(row.id, 'horario', e.target.value)}
                              onFocus={(e) => e.currentTarget.style.borderBottom = '1px dashed var(--crear-gold)'}
                              onBlur={(e) => e.currentTarget.style.borderBottom = '1px dashed transparent'}
                              placeholder="Ej. 4:30 PM - Cierre"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                borderBottom: isManager ? '1px dashed transparent' : 'none',
                                color: 'var(--crear-blue, #0284c7)',
                                fontWeight: 700,
                                fontSize: '0.84rem',
                                width: '130px',
                                outline: 'none',
                                padding: '2px 0'
                              }}
                            />
                          </td>

                          {/* Celdas de Colaboradores de esta Sede (Clickeable in-line) */}
                          {staffList.map(staff => {
                            const val = row.assignments?.[staff.id] || '—';
                            const isHighlighted = highlightPerson === staff.id;
                            return (
                              <td 
                                key={staff.id}
                                onClick={(e) => {
                                  if (!isManager) return;
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setActiveCellPicker({
                                    rowId: row.id,
                                    staffId: staff.id,
                                    staffName: staff.name,
                                    training: row.training,
                                    dia: row.dia,
                                    currentVal: val,
                                    top: Math.min(Math.max(10, rect.bottom + 4), window.innerHeight - 380),
                                    left: Math.max(10, Math.min(window.innerWidth - 260, rect.left - 20))
                                  });
                                }}
                                style={{ 
                                  padding: '0.6rem 0.5rem', 
                                  textAlign: 'center',
                                  cursor: isManager ? 'pointer' : 'default',
                                  background: isHighlighted ? 'var(--crear-gold-light)' : 'transparent',
                                  borderLeft: '1px solid var(--border-subtle)',
                                  borderRight: '1px solid var(--border-subtle)'
                                }}
                                title={isManager ? `Clic para asignar turno o rol a ${staff.name}` : `${staff.name}: ${val}`}
                              >
                                {renderCellBadge(val)}
                              </td>
                            );
                          })}

                          {/* Celda de alineación para la columna de acción de Staff */}
                          {isManager && (
                            <td style={{ padding: '0.5rem', textAlign: 'center', borderLeft: '1px dashed var(--border-subtle)', borderRight: '1px dashed var(--border-subtle)' }}>
                              <span className="text-muted" style={{ fontSize: '0.7rem' }}>—</span>
                            </td>
                          )}

                          {/* Vestimenta (Editable in-line) */}
                          <td style={{ padding: '0.7rem 0.9rem', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', width: '100%' }}>
                              <Shirt size={14} className="text-muted" />
                              <input
                                type="text"
                                value={row.vestimenta || ''}
                                disabled={!isManager}
                                onChange={(e) => handleInlineRowUpdate(row.id, 'vestimenta', e.target.value)}
                                placeholder="Vestimenta..."
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  borderBottom: isManager ? '1px dotted transparent' : 'none',
                                  color: 'var(--text-main)',
                                  fontSize: '0.78rem',
                                  width: '135px',
                                  outline: 'none',
                                  padding: '2px 0'
                                }}
                              />
                            </div>
                          </td>

                          {/* Acciones de Fila (Eliminar Turno) */}
                          {isManager && (
                            <td style={{ padding: '0.7rem 0.6rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
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
            Sede Operativa: <strong style={{ color: 'var(--text-heading)' }}>{selectedSede}</strong> • {staffList.length} colaboradores activos
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
        {/* MODAL: ADMINISTRAR COLABORADORES DE ESTA SEDE                             */}
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
                    Equipo de {selectedSede} ({staffList.length})
                  </h3>
                </div>
                <button onClick={() => setShowManageStaffModal(false)} className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              {/* LISTA ACTUAL DE COLABORADORES DE ESTA SEDE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  Gerentes y Coordinadores de {selectedSede}:
                </label>
                {staffList.map(staff => (
                  <div 
                    key={staff.id}
                    style={{
                      background: 'var(--bg-dark-alt, #ffffff)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.9rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.88rem' }}>
                        {staff.name}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                        {staff.role} • {staff.email || 'Sin correo registrado'}
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
                        fontSize: '0.74rem'
                      }}
                      title="Retirar de esta sede"
                    >
                      <Trash2 size={13} />
                      <span>Retirar</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* COORDINADORES Y GERENTES OFICIALES DISPONIBLES PARA INCORPORAR */}
              {(() => {
                const availableOfficial = getLeadershipForSede(selectedSede).filter(
                  off => !staffList.some(s => s.id === off.id || (s.email && s.email.toLowerCase() === off.email.toLowerCase()))
                );
                if (availableOfficial.length === 0) return null;

                return (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.9rem' }}>
                    <label className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                      📋 Coordinadores y Gerentes Oficiales de {selectedSede} para incorporar:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
                      {availableOfficial.map(official => (
                        <div 
                          key={official.id}
                          style={{
                            background: 'var(--bg-dark, #f8fafc)',
                            border: '1px dashed var(--border-subtle)',
                            borderRadius: '6px',
                            padding: '0.5rem 0.8rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-heading)' }}>
                              {official.name}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                              ({official.role})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddExistingStaff(official)}
                            className="btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            <Plus size={12} />
                            <span>Agregar</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* AGREGAR NUEVO INTEGRANTE A LA SEDE */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <label className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  ➕ Agregar Nuevo Integrante a {selectedSede}:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.6rem' }}>
                  <input
                    type="text"
                    placeholder="Nombre y Apellido"
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
                    placeholder="Cargo (ej. Coordinador C1)"
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
                    Agregar a {selectedSede}
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
                    Notificar Horarios — Sede {selectedSede}
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
                  Destinatarios en {selectedSede} ({staffList.length}):
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
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: AUDITORÍA DE ACUSES DE RECIBO LOGÍSTICOS ("LEÍDO Y ENTERADO")      */}
        {/* ========================================================================= */}
        {showAckAuditModal && (
          <div 
            onClick={() => setShowAckAuditModal(false)}
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
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <ShieldCheck size={22} className="text-gold" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                      Auditoría de Acuses de Recibo — Sede {selectedSede}
                    </h3>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Control de confirmación operativa de sala (Principio de Responsabilidad Compartida)
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowAckAuditModal(false)} className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Indicadores de Cumplimiento */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
                <div style={{ background: 'var(--bg-dark, #f8fafc)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL ASIGNADOS</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-heading)', marginTop: '2px' }}>{ackAudit.total}</div>
                </div>
                <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>LEÍDO Y ENTERADO</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>{ackAudit.confirmed} <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>({ackAudit.percentage}%)</span></div>
                </div>
                <div style={{ background: ackAudit.pendingList.length > 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-dark, #f8fafc)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: ackAudit.pendingList.length > 0 ? '#d97706' : 'var(--text-muted)', fontWeight: 600 }}>PENDIENTES</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: ackAudit.pendingList.length > 0 ? '#d97706' : 'var(--text-heading)', marginTop: '2px' }}>{ackAudit.pendingList.length}</div>
                </div>
              </div>

              {/* Lista de Colaboradores Confirmados */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#16a34a', marginBottom: '6px' }}>
                  <CheckCircle2 size={16} />
                  <span>Personal Confirmado ({ackAudit.confirmed})</span>
                </div>
                {ackAudit.confirmedList.length === 0 ? (
                  <div style={{ padding: '0.8rem', background: 'var(--bg-dark, #f8fafc)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Aún no hay acuses de recibo registrados para esta sede en Causa OS.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
                    {ackAudit.confirmedList.map(item => (
                      <div 
                        key={item.id}
                        style={{
                          background: 'rgba(34, 197, 94, 0.05)',
                          border: '1px solid rgba(34, 197, 94, 0.2)',
                          borderRadius: '6px',
                          padding: '0.5rem 0.8rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{item.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.role} • {item.email}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.68rem', background: 'rgba(34, 197, 94, 0.15)', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            ✓ Confirmado
                          </span>
                          {item.confirmedAt && (
                            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {new Date(item.confirmedAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de Colaboradores Pendientes */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: ackAudit.pendingList.length > 0 ? '#d97706' : 'var(--text-muted)', marginBottom: '6px' }}>
                  <AlertCircle size={16} />
                  <span>Personal Pendiente de Confirmar ({ackAudit.pendingList.length})</span>
                </div>
                {ackAudit.pendingList.length === 0 ? (
                  <div style={{ padding: '0.8rem', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '6px', fontSize: '0.8rem', color: '#16a34a', textAlign: 'center', fontWeight: 700 }}>
                    🎉 ¡Todo el equipo de {selectedSede} ha confirmado sus horarios! Cumplimiento 100%.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
                    {ackAudit.pendingList.map(item => (
                      <div 
                        key={item.id}
                        style={{
                          background: 'rgba(245, 158, 11, 0.05)',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          borderRadius: '6px',
                          padding: '0.5rem 0.8rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{item.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.role} • {item.email || 'Sin correo registrado'}</div>
                        </div>
                        <span style={{ fontSize: '0.68rem', background: 'rgba(245, 158, 11, 0.15)', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          ⏳ Pendiente en Causa OS
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones de Cierre */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.8rem' }}>
                <button
                  onClick={() => setShowAckAuditModal(false)}
                  className="btn-primary"
                  style={{ padding: '0.45rem 1.4rem', fontSize: '0.82rem' }}
                >
                  Cerrar Auditoría
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* POPOVER FLOTANTE (FIXED) DE ASIGNACIÓN RÁPIDA DE ROL / TAREA              */}
        {/* ========================================================================= */}
        {activeCellPicker && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setActiveCellPicker(null);
            }}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 999999,
              background: 'rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(2px)'
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="glass-panel"
              style={{
                position: 'fixed',
                top: Math.min(activeCellPicker.top || 200, window.innerHeight - 440),
                left: Math.max(10, Math.min(activeCellPicker.left || 300, window.innerWidth - 250)),
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
                padding: '10px',
                width: '230px',
                zIndex: 1000000,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                color: 'var(--text-main)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '4px' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                    👤 {activeCellPicker.staffName}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {activeCellPicker.training} • {activeCellPicker.dia}
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setActiveCellPicker(null)} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                >
                  <X size={14} />
                </button>
              </div>

              {[
                { label: '✓ Presente', val: '✓', color: '#16a34a' },
                { label: '— Libre / Desasignar', val: '—', color: '#64748b' },
                { label: 'Grounding Inicial', val: '(Grounding)', color: '#0d9488' },
                { label: 'Cierre Grounding', val: 'Cierre (Grounding C1)', color: '#0d9488' },
                { label: 'Noche de Confianza', val: 'Noche De Confianza', color: '#9333ea' },
                { label: 'Cierre Confianza', val: 'Cierre Noche De Confianza', color: '#9333ea' },
                { label: 'Caída Confianza', val: 'Caída Confianza', color: '#9333ea' },
                { label: 'TANQUE', val: 'TANQUE', color: '#d97706' },
                { label: 'Rompimiento Barreras', val: 'Rompimiento de Barreras', color: '#ea580c' },
                { label: 'Vuelos C2', val: 'Vuelos', color: '#db2777' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => {
                    handleCellAssignment(activeCellPicker.rowId, activeCellPicker.staffId, opt.val);
                    setActiveCellPicker(null);
                  }}
                  style={{
                    background: activeCellPicker.currentVal === opt.val ? 'var(--crear-gold-light)' : 'transparent',
                    border: activeCellPicker.currentVal === opt.val ? '1px solid var(--crear-gold)' : 'none',
                    borderRadius: '6px',
                    padding: '5px 8px',
                    fontSize: '0.76rem',
                    color: opt.color || 'var(--text-main)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.1s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 193, 7, 0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = activeCellPicker.currentVal === opt.val ? 'var(--crear-gold-light)' : 'transparent'}
                >
                  <span>{opt.label}</span>
                  {activeCellPicker.currentVal === opt.val && <Check size={12} />}
                </button>
              ))}

              {/* Input personalizado para escribir texto libre */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', marginTop: '4px' }}>
                <input 
                  type="text"
                  placeholder="Escribir tarea personalizada..."
                  defaultValue={!['✓', '—'].includes(activeCellPicker.currentVal) ? activeCellPicker.currentVal : ''}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      handleCellAssignment(activeCellPicker.rowId, activeCellPicker.staffId, e.target.value.trim());
                      setActiveCellPicker(null);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    fontSize: '0.74rem',
                    background: 'var(--bg-dark, #f8fafc)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Presiona Enter para asignar
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
