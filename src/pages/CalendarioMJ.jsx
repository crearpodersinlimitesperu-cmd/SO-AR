import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useCycles } from '../context/CyclesContext';
import { db } from '../services/firebase';
import {
  collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import {
  Calendar, Plus, ArrowLeft, Printer, Trash2, Edit3, Save, X, Copy, Lock, RefreshCw
} from 'lucide-react';

// Busca, en el calendario oficial ya cargado por CyclesContext (misma fuente
// que usa toda la app para saber en qué etapa está cada equipo), el evento
// "MAESTRIA DEL JUEGO" de una sede+equipo. Se usa SOLO para precargar la
// fecha del Primer FDS (Creación) — el resto de fechas (Segundo/Tercer FDS,
// Barco, Caminata sobre fuego, etc.) no vienen en esta fuente y siguen
// siendo 100% manuales (confirmado con José: no hay fórmula fija de offsets).
function findOfficialMJEvent(events, sede, equipoNumero) {
  if (!sede?.trim() || !equipoNumero?.trim() || !events?.length) return null;
  const sedeNorm = sede.trim().toLowerCase();
  const equipoNorm = String(equipoNumero).trim();
  const sedeAliases = [
    ['lima', 'lim'], ['quito', 'uio'], ['guayaquil', 'gye'],
    ['cuenca', 'cue'], ['medell', 'med'], ['mexico', 'mex'], ['méxico', 'mex'], ['cdmx', 'mex']
  ];
  return events.find(e => {
    const nombre = e.nombre || e.name || '';
    if (nombre !== 'MAESTRIA DEL JUEGO') return false;
    const evSede = (e.sede || e.sedeTag || e.place || e.address || '').toLowerCase();
    if (!evSede) return false;
    const sedeMatches = evSede.includes(sedeNorm) || sedeNorm.includes(evSede) ||
      sedeAliases.some(([a, b]) => (sedeNorm.includes(a) && evSede.includes(b)));
    if (!sedeMatches) return false;
    const evEquipo = String(e.equipo || '').trim();
    return evEquipo === equipoNorm || evEquipo.includes(equipoNorm) || (equipoNorm && equipoNorm.includes(evEquipo));
  }) || null;
}

function addDaysISO(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ============================================================================
// CalendarioMJ.jsx (29/08/2026)
// "Máquina" de calendarios de Maestría del Juego por equipo, pedida por José
// a partir de 3 PDF de ejemplo reales (Equipo 27 "Kay Theron", Equipo 28
// "Ubuntu", Equipo 29 "Quantum Phoenix" — Lima). Los 3 comparten EXACTAMENTE
// la misma plantilla de actividades (Reunión, Entrega de FI, Entrega de
// directorio, Entrenamiento, Pase de Antorcha, Barco, Vuelos, Caminata sobre
// fuego, etc.) organizada en 3 bloques (PRIMER/SEGUNDO/TERCER FDS), pero las
// FECHAS de cada actividad NO siguen un offset fijo entre equipos (confirmado
// comparando los 3 PDF: p.ej. "Entrega de directorio" cae +7 días del viernes
// del FDS en el Equipo 27, pero +14 días en el Equipo 28). José confirmó que
// no hay una fórmula automática — las fechas se ingresan/ajustan por equipo.
// Por eso esta herramienta NO calcula fechas solas: parte de la MISMA
// plantilla de actividades ya probada (para no reescribirla cada vez) y deja
// cada fecha/hora 100% editable, igual que le pidió José ("similar a las
// cartas de bienvenida de los entrenadores": autogenerar + poder editar).
// ============================================================================

const COLLECTION_NAME = 'mj_calendars';

// Roles que pueden VER el listado y exportar PDF.
const VIEW_ROLES = [
  'direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado',
  'director_maestria', 'coord_maestria', 'coordinador_mj'
];
// Roles que pueden CREAR / EDITAR / ELIMINAR calendarios (no solo verlos).
const EDIT_ROLES = [
  'direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado',
  'director_maestria', 'coord_maestria', 'coordinador_mj'
];

const canEdit = (currentUser) => {
  if (!currentUser) return false;
  if (currentUser.isSuperAdmin) return true;
  return EDIT_ROLES.includes(currentUser.appRole);
};

// Plantilla de actividades — texto EXACTO tomado de los 3 PDF de ejemplo
// (CALENDARIO_E27.pdf, CALENDARIO_E28.pdf, CALENDARIO_E29_1.pdf). "fecha" y
// "hora" quedan vacías a propósito: no hay fórmula, se llenan por equipo.
const DEFAULT_FDS = [
  {
    id: 'creacion',
    titulo: 'PRIMER FDS: CREACIÓN.',
    fechaInicio: '',
    fechaFin: '',
    horario: 'Viernes: 5 pm registro – 11 pm aprox.\n(asistencia obligatoria todo el fin de semana, sin negociación de tiempo)\nSábado: 8 am – 10 pm aprox.\nDomingo: 9 am – 9 pm aprox.'
  },
  {
    id: 'relacion',
    titulo: 'SEGUNDO FDS: RELACIÓN.',
    fechaInicio: '',
    fechaFin: '',
    horario: 'Viernes: 6 pm registro – 11 pm aprox.\n(asistencia obligatoria todo el fin de semana, sin negociación de tiempo)\nSábado: 8 am – 10 pm aprox.\nDomingo: 9 am – 9 pm aprox.'
  },
  {
    id: 'gratitud',
    titulo: 'TERCER FDS: GRATITUD.',
    fechaInicio: '',
    fechaFin: '',
    horario: 'Viernes: 6 pm registro – 11 pm aprox.\n(asistencia obligatoria todo el fin de semana, sin negociación de tiempo)\nSábado: 8 am – 10 pm aprox.\nDomingo: 8 am – 9 pm aprox.'
  }
];

const DEFAULT_ACTIVITIES = [
  { seccion: 'creacion', actividad: 'Reunión maestría de juego\nindicaciones sobre:\n(DIRECTORIO, CAMISETAS Y ESTANDARTE)\nVIA ZOOM', fecha: '', hora: '8:00 PM' },
  { seccion: 'creacion', actividad: 'Entrega de futuros imposibles al correo:\nhttps://crearpslglobal.com/admin/login.php\nUsuario: invitadoFI\nContraseña: invitadofi', fecha: '', hora: 'Hasta 11:59 pm' },
  { seccion: 'creacion', actividad: 'Entrega de directorio: físico y digital.', fecha: '', hora: 'Hasta las 2:00 pm, lo entrega un representante del equipo.' },
  { seccion: 'creacion', actividad: 'Entrenamiento de confianza', fecha: '', hora: '11:00 am a 2:00 pm.' },
  { seccion: 'creacion', actividad: 'Impacto Creación', fecha: '', hora: '3:00 pm a 5:00 pm' },
  { seccion: 'creacion', actividad: 'Revisión de Futuros Imposibles', fecha: '', hora: '6:00 pm a 7:00 pm' },
  { seccion: 'creacion', actividad: 'Línea de Elección y\nEntrega de souvenirs a\nparticipantes del Capítulo 1', fecha: '', hora: '8:00 pm a 10:30 pm aprox.' },
  { seccion: 'creacion', actividad: 'Pase de Antorcha y\nCaminata de Equipos', fecha: '', hora: '6:00 PM' },
  { seccion: 'creacion', actividad: 'Barco', fecha: '', hora: '6:00 PM' },
  { seccion: 'creacion', actividad: 'Entrenamiento\nTanque', fecha: '', hora: '1:00 pm a 4:00 pm.' },
  { seccion: 'creacion', actividad: 'Revisión de Futuros Imposibles', fecha: '', hora: '5:00 pm a 6:00 pm' },
  { seccion: 'creacion', actividad: 'Vuelos', fecha: '', hora: '6:00 pm a 11:00 pm aprox.' },
  { seccion: 'creacion', actividad: 'Caminata sobre fuego', fecha: '', hora: '6:00 pm a 11:00 pm aprox.', destacado: true },

  { seccion: 'relacion', actividad: 'Línea de Elección', fecha: '', hora: '8:00 pm a 10:30 pm aprox.' },
  { seccion: 'relacion', actividad: 'Pase de Antorcha y\nCaminata de Equipos', fecha: '', hora: '6:00 PM' },
  { seccion: 'relacion', actividad: 'Barco', fecha: '', hora: '6:00 PM' },
  { seccion: 'relacion', actividad: 'Entrenamiento\nRompimiento de Barreras', fecha: '', hora: '9:00 am a 12:00 pm' },
  { seccion: 'relacion', actividad: 'Impacto Relación', fecha: '', hora: '' },
  { seccion: 'relacion', actividad: 'Revisión de Futuros Imposibles', fecha: '', hora: '5:00 pm a 6:00 pm' },
  { seccion: 'relacion', actividad: 'Vuelos', fecha: '', hora: '6:30 pm a 11:00 pm aprox.' },

  { seccion: 'gratitud', actividad: '(Actividades del tercer FDS — completar según corresponda)', fecha: '', hora: '' }
];

// Texto fijo de la página "Fin de tu entrenamiento" — IDÉNTICO en los 3 PDF
// de ejemplo, editable por si en el futuro cambian las reglas.
const DEFAULT_INFO_TEXT = `Puntualidad y Asistencia:
Los horarios de ingreso son puntuales. Si llegas tarde, no podrás continuar con tu equipo en los fines de semana marcados como obligatorios.
Para los entrenamientos complementarios, también se requiere puntualidad. Si llegas tarde, no podrás participar en ese entrenamiento específico, pero podrás incorporarte a la siguiente actividad.
Los Managers deben estar presentes 30 minutos antes de cada entrenamiento complementario. Si no estás en tiempo y forma en el grounding de un entrenamiento obligatorio o complementario, no podrás formar parte.
Los Managers, Si fallas en dos llamadas con tu entrenador, estarás fuera del equipo.

Restricciones y Vestimenta:
No se permite la asistencia de niños en las actividades y entrenamientos, excepto en las graduaciones del Capítulo 1 y Capítulo 2.
Es indispensable presentar tus carpetas de futuros imposibles con evidencias actualizadas para ingresar a los fines de semana.
Para participar en actividades, debes vestir la camiseta de tu equipo de color y pantalón jean azul.
Durante los vuelos, utiliza la camiseta negra de equipo y pantalón negro.
La vestimenta para los fines de semana es la siguiente:
    Viernes: Formal.
    Sábado: Vestimenta de vuelos (camiseta negra y jean negro).
    Domingo: Camiseta de color del equipo y jean azul.

Invitación Especial:
El cuarto fin de semana es una invitación exclusiva de la empresa Crear Poder sin Límites.

¡Sigue comprometido/a con tu NUEVO ESTILO DE VIDA y éxito! Si tienes más preguntas o necesitas más información, no dudes en preguntar. 🙂`;

const emptyForm = () => ({
  sede: '',
  equipoNumero: '',
  equipoNombre: '',
  fds: DEFAULT_FDS.map(f => ({ ...f })),
  actividades: DEFAULT_ACTIVITIES.map(a => ({ ...a })),
  infoText: DEFAULT_INFO_TEXT
});

const slugify = (s) => (s || '').toString().trim().toUpperCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const FDS_LABELS = { creacion: 'PRIMER FDS: CREACIÓN', relacion: 'SEGUNDO FDS: RELACIÓN', gratitud: 'TERCER FDS: GRATITUD' };

export default function CalendarioMJ() {
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const { events } = useCycles();
  const navigate = useNavigate();

  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = lista; 'new' o docId = editor
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const [autoFilledOnce, setAutoFilledOnce] = useState(false);

  const userCanEdit = canEdit(currentUser);

  // Precarga automática de la fecha del Primer FDS al escribir sede + equipo
  // (solo una vez por sesión de edición, para no pelear con lo que el
  // usuario ya haya escrito a mano después).
  useEffect(() => {
    if (editing !== 'new' || autoFilledOnce) return;
    if (!form.sede.trim() || !form.equipoNumero.trim()) return;
    const match = findOfficialMJEvent(events, form.sede, form.equipoNumero);
    if (match) {
      const start = (match.fecha_inicio || match.start || '').replace('Z', '').slice(0, 10);
      if (start) {
        const end = addDaysISO(start, 2);
        setForm(f => ({ ...f, fds: f.fds.map((fb, i) => i === 0 ? { ...fb, fechaInicio: start, fechaFin: end } : fb) }));
        showToast('Fecha del Primer FDS precargada desde el calendario oficial — verifica que sea correcta.', 'success');
        setAutoFilledOnce(true);
      }
    }
  }, [form.sede, form.equipoNumero, events, editing, autoFilledOnce, showToast]);

  const buscarEnCalendarioOficial = () => {
    const match = findOfficialMJEvent(events, form.sede, form.equipoNumero);
    if (!match) {
      showToast('No se encontró este equipo en el calendario oficial. Ingresa las fechas manualmente.', 'error');
      return;
    }
    const start = (match.fecha_inicio || match.start || '').replace('Z', '').slice(0, 10);
    if (!start) {
      showToast('El equipo se encontró pero sin fecha de inicio registrada.', 'error');
      return;
    }
    const end = addDaysISO(start, 2);
    setForm(f => ({ ...f, fds: f.fds.map((fb, i) => i === 0 ? { ...fb, fechaInicio: start, fechaFin: end } : fb) }));
    showToast('Fecha del Primer FDS actualizada desde el calendario oficial.', 'success');
  };

  useEffect(() => {
    const q = query(collection(db, COLLECTION_NAME));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (a.sede || '').localeCompare(b.sede || '') || (Number(a.equipoNumero) || 0) - (Number(b.equipoNumero) || 0));
      setCalendars(rows);
      setLoading(false);
    }, (err) => {
      console.error('Error cargando calendarios MJ:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const visibleCalendars = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.isSuperAdmin || ['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'consolidado', 'director_maestria'].includes(currentUser.appRole)) {
      return calendars;
    }
    // Coordinador de Maestría: solo su sede
    const userSede = (currentUser.sede || '').trim().toLowerCase();
    return calendars.filter(c => (c.sede || '').trim().toLowerCase() === userSede);
  }, [calendars, currentUser]);

  const startNew = () => {
    setForm(emptyForm());
    setAutoFilledOnce(false);
    setEditing('new');
  };

  const startEdit = (cal) => {
    setForm({
      sede: cal.sede || '',
      equipoNumero: cal.equipoNumero || '',
      equipoNombre: cal.equipoNombre || '',
      fds: (cal.fds && cal.fds.length === 3) ? cal.fds.map(f => ({ ...f })) : DEFAULT_FDS.map(f => ({ ...f })),
      actividades: (cal.actividades || []).map(a => ({ ...a })),
      infoText: cal.infoText || DEFAULT_INFO_TEXT
    });
    setEditing(cal.id);
  };

  const startFromTemplate = (cal) => {
    // "Duplicar" un calendario existente como base para un equipo nuevo —
    // mismo patrón de actividades, fechas en blanco para no arrastrar las
    // fechas del equipo anterior por error.
    setForm({
      sede: cal.sede || '',
      equipoNumero: '',
      equipoNombre: '',
      fds: (cal.fds || DEFAULT_FDS).map(f => ({ ...f, fechaInicio: '', fechaFin: '' })),
      actividades: (cal.actividades || DEFAULT_ACTIVITIES).map(a => ({ ...a, fecha: '' })),
      infoText: cal.infoText || DEFAULT_INFO_TEXT
    });
    setAutoFilledOnce(false);
    setEditing('new');
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm());
    setAutoFilledOnce(false);
  };

  const updateFdsField = (idx, field, value) => {
    setForm(f => {
      const fds = [...f.fds];
      fds[idx] = { ...fds[idx], [field]: value };
      return { ...f, fds };
    });
  };

  const updateActividad = (idx, field, value) => {
    setForm(f => {
      const actividades = [...f.actividades];
      actividades[idx] = { ...actividades[idx], [field]: value };
      return { ...f, actividades };
    });
  };

  const addActividad = (seccion) => {
    setForm(f => ({ ...f, actividades: [...f.actividades, { seccion, actividad: '', fecha: '', hora: '' }] }));
  };

  const removeActividad = (idx) => {
    setForm(f => ({ ...f, actividades: f.actividades.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!form.sede.trim() || !form.equipoNumero.trim() || !form.equipoNombre.trim()) {
      showToast('Completa sede, número de equipo y nombre de equipo antes de guardar.', 'error');
      return;
    }
    setSaving(true);
    try {
      const docId = editing !== 'new' ? editing : `${slugify(form.sede)}-EQ-${slugify(form.equipoNumero)}`;
      const payload = {
        sede: form.sede.trim(),
        equipoNumero: form.equipoNumero.trim(),
        equipoNombre: form.equipoNombre.trim(),
        fds: form.fds,
        actividades: form.actividades,
        infoText: form.infoText,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.email || 'desconocido'
      };
      if (editing === 'new') {
        payload.createdAt = serverTimestamp();
        payload.createdBy = currentUser?.email || 'desconocido';
      }
      await setDoc(doc(db, COLLECTION_NAME, docId), payload, { merge: true });
      showToast('Calendario guardado correctamente.', 'success');
      setEditing(null);
      setForm(emptyForm());
    } catch (err) {
      console.error('Error guardando calendario MJ:', err);
      showToast('No se pudo guardar el calendario. Revisa los permisos de Firestore.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cal) => {
    if (!window.confirm(`¿Eliminar el calendario del Equipo ${cal.equipoNumero} (${cal.equipoNombre})? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, cal.id));
      showToast('Calendario eliminado.', 'success');
    } catch (err) {
      console.error('Error eliminando calendario MJ:', err);
      showToast('No se pudo eliminar. Revisa los permisos de Firestore.', 'error');
    }
  };

  const previewCal = previewId ? calendars.find(c => c.id === previewId) : null;

  // ---------------------------------------------------------------------
  // Vista de impresión / exportación PDF
  // ---------------------------------------------------------------------
  if (previewCal) {
    return <CalendarioPreview cal={previewCal} onClose={() => setPreviewId(null)} />;
  }

  return (
    <div className="calendar-container p-4 md:p-8 max-w-6xl mx-auto min-h-screen" style={{ color: 'var(--text-main)' }}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="flex justify-between items-center mb-6 flex-wrap gap-4 no-print">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calendar color="#1a75bc" size={30} />
            Calendarios de Maestría del Juego
          </h1>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.2rem' }}>
            Genera, edita y exporta el calendario oficial de cada equipo (formato CREAR).
          </p>
        </div>
        <div className="flex gap-3">
          {userCanEdit && (
            <button onClick={startNew} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', borderRadius: '10px', background: '#1a75bc', color: 'white', border: 'none', fontWeight: 700 }}>
              <Plus size={18} /> Nuevo calendario
            </button>
          )}
          <button onClick={() => navigate('/home')} className="btn-secondary" style={{ padding: '0.6rem 1rem', borderRadius: '10px' }}>
            <ArrowLeft size={16} style={{ display: 'inline', marginRight: '0.3rem' }} /> Volver
          </button>
        </div>
      </div>

      {!userCanEdit && (
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', borderRadius: '10px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', marginBottom: '1.2rem', fontSize: '0.85rem' }}>
          <Lock size={16} color="#d97706" /> Solo puedes ver y exportar. La edición está reservada a Coordinación de Maestría del Juego y gerencia/dirección.
        </div>
      )}

      {editing ? (
        <CalendarioEditor
          form={form}
          setForm={setForm}
          updateFdsField={updateFdsField}
          updateActividad={updateActividad}
          addActividad={addActividad}
          removeActividad={removeActividad}
          onBuscarOficial={buscarEnCalendarioOficial}
          onCancel={cancelEdit}
          onSave={handleSave}
          saving={saving}
          isNew={editing === 'new'}
        />
      ) : (
        <div className="no-print">
          {loading ? (
            <p>Cargando calendarios...</p>
          ) : visibleCalendars.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
              Todavía no hay calendarios guardados{userCanEdit ? ' — crea el primero con "Nuevo calendario".' : '.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {visibleCalendars.map(cal => (
                <div key={cal.id} className="glass-panel" style={{ border: '1px solid rgba(128,128,128,0.25)', borderRadius: '14px', padding: '1.1rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Equipo {cal.equipoNumero} — {cal.equipoNombre}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.8rem' }}>{cal.sede}</div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setPreviewId(cal.id)} className="btn-secondary" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Printer size={14} /> Ver / Exportar PDF
                    </button>
                    {userCanEdit && (
                      <>
                        <button onClick={() => startEdit(cal)} className="btn-secondary" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Edit3 size={14} /> Editar
                        </button>
                        <button onClick={() => startFromTemplate(cal)} className="btn-secondary" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Copy size={14} /> Usar como plantilla
                        </button>
                        <button onClick={() => handleDelete(cal)} style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', cursor: 'pointer' }}>
                          <Trash2 size={14} /> Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Editor
// ============================================================================
function CalendarioEditor({ form, setForm, updateFdsField, updateActividad, addActividad, removeActividad, onBuscarOficial, onCancel, onSave, saving, isNew }) {
  const inputStyle = { width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(128,128,128,0.3)', background: 'transparent', color: 'inherit', fontSize: '0.85rem' };
  const textareaStyle = { ...inputStyle, minHeight: '60px', fontFamily: 'inherit', resize: 'vertical' };

  return (
    <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ border: '1px solid rgba(128,128,128,0.25)', borderRadius: '14px', padding: '1.2rem' }}>
        <h3 style={{ fontWeight: 800, marginBottom: '0.8rem' }}>{isNew ? 'Nuevo calendario' : 'Editar calendario'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Sede</label>
            <input style={inputStyle} value={form.sede} onChange={e => setForm(f => ({ ...f, sede: e.target.value }))} placeholder="Lima" />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Número de equipo</label>
            <input style={inputStyle} value={form.equipoNumero} onChange={e => setForm(f => ({ ...f, equipoNumero: e.target.value }))} placeholder="30" />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Nombre de equipo</label>
            <input style={inputStyle} value={form.equipoNombre} onChange={e => setForm(f => ({ ...f, equipoNombre: e.target.value }))} placeholder="Ej. Kay Theron" />
          </div>
        </div>
        {onBuscarOficial && (
          <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button onClick={onBuscarOficial} className="btn-secondary" style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <RefreshCw size={14} /> Buscar fecha en el calendario oficial
            </button>
            <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>
              Con sede + número de equipo se precarga sola la fecha del Primer FDS desde el calendario oficial de la plataforma. El resto de fechas (Segundo/Tercer FDS y cada actividad) no vienen ahí y se ajustan a mano.
            </span>
          </div>
        )}
      </div>

      {form.fds.map((fdsBlock, idx) => (
        <div key={fdsBlock.id} className="glass-panel" style={{ border: '1px solid rgba(128,128,128,0.25)', borderRadius: '14px', padding: '1.2rem' }}>
          <h4 style={{ fontWeight: 800, marginBottom: '0.6rem', color: '#1a75bc' }}>{FDS_LABELS[fdsBlock.id]}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem', marginBottom: '0.8rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Fecha inicio (viernes)</label>
              <input type="date" style={inputStyle} value={fdsBlock.fechaInicio} onChange={e => updateFdsField(idx, 'fechaInicio', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Fecha fin (domingo)</label>
              <input type="date" style={inputStyle} value={fdsBlock.fechaFin} onChange={e => updateFdsField(idx, 'fechaFin', e.target.value)} />
            </div>
          </div>
          <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Horario (texto libre)</label>
          <textarea style={textareaStyle} value={fdsBlock.horario} onChange={e => updateFdsField(idx, 'horario', e.target.value)} />

          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '0.4rem' }}>Actividades de este bloque</div>
            {form.actividades.map((act, aIdx) => act.seccion !== fdsBlock.id ? null : (
              <div key={aIdx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.3fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'start' }}>
                <textarea style={{ ...textareaStyle, minHeight: '40px' }} value={act.actividad} onChange={e => updateActividad(aIdx, 'actividad', e.target.value)} placeholder="Actividad" />
                <input type="date" style={inputStyle} value={act.fecha} onChange={e => updateActividad(aIdx, 'fecha', e.target.value)} />
                <input style={inputStyle} value={act.hora} onChange={e => updateActividad(aIdx, 'hora', e.target.value)} placeholder="Hora" />
                <button onClick={() => removeActividad(aIdx)} title="Eliminar actividad" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>
            ))}
            <button onClick={() => addActividad(fdsBlock.id)} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Plus size={14} /> Agregar actividad
            </button>
          </div>
        </div>
      ))}

      <div className="glass-panel" style={{ border: '1px solid rgba(128,128,128,0.25)', borderRadius: '14px', padding: '1.2rem' }}>
        <h4 style={{ fontWeight: 800, marginBottom: '0.6rem' }}>Página "Fin de tu entrenamiento" (información importante)</h4>
        <textarea style={{ ...textareaStyle, minHeight: '220px' }} value={form.infoText} onChange={e => setForm(f => ({ ...f, infoText: e.target.value }))} />
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="btn-secondary" style={{ padding: '0.6rem 1.2rem', borderRadius: '10px' }}>Cancelar</button>
        <button onClick={onSave} disabled={saving} className="btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', background: '#1a75bc', color: 'white', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Save size={16} /> {saving ? 'Guardando...' : 'Guardar calendario'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Vista previa / impresión — replica el diseño de los PDF de ejemplo
// ============================================================================
function formatFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${parseInt(d, 10)}-${meses[parseInt(m, 10) - 1]}`;
}

function formatRangoFds(fdsBlock) {
  if (!fdsBlock.fechaInicio || !fdsBlock.fechaFin) return '(fechas por definir)';
  const [, mi, di] = fdsBlock.fechaInicio.split('-');
  const [, mf, df] = fdsBlock.fechaFin.split('-');
  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  if (mi === mf) {
    return `DEL ${parseInt(di, 10)} AL ${parseInt(df, 10)} DE ${meses[parseInt(mi, 10) - 1]}`;
  }
  return `DEL ${parseInt(di, 10)} DE ${meses[parseInt(mi, 10) - 1]} AL ${parseInt(df, 10)} DE ${meses[parseInt(mf, 10) - 1]}`;
}

function CalendarioPreview({ cal, onClose }) {
  const headerBg = '#1a75bc';
  const rowAlt = '#eaf3fb';

  return (
    <div style={{ background: '#f3f4f6', minHeight: '100vh', padding: '1.5rem' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .mj-page { box-shadow: none !important; margin: 0 !important; page-break-after: always; }
        }
        .mj-table td, .mj-table th { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 12px; vertical-align: top; white-space: pre-line; }
      `}</style>

      <div className="no-print flex gap-3 mb-4" style={{ maxWidth: '850px', margin: '0 auto 1rem' }}>
        <button onClick={onClose} className="btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}>
          <ArrowLeft size={16} style={{ display: 'inline', marginRight: '0.3rem' }} /> Volver al listado
        </button>
        <button onClick={() => window.print()} className="btn-primary" style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#1a75bc', color: 'white', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Printer size={16} /> Exportar PDF
        </button>
      </div>

      {/* Página 1: calendario */}
      <div className="mj-page" style={{ background: 'white', maxWidth: '850px', margin: '0 auto 2rem', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ color: headerBg, fontSize: '1.3rem', fontWeight: 900, margin: 0 }}>
            CALENDARIO DE MAESTRÍA DEL JUEGO-{(cal.sede || '').toUpperCase()}<br />
            EQUIPO {cal.equipoNumero} – {(cal.equipoNombre || '').toUpperCase()}
          </h1>
          <div style={{ fontWeight: 900, fontSize: '1.4rem', color: '#000' }}>CREAR<div style={{ fontSize: '0.55rem', fontWeight: 400 }}>Poder sin límites</div></div>
        </div>

        <table className="mj-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: headerBg, color: 'white' }}>
              <th style={{ width: '45%' }}>ACTIVIDAD</th>
              <th style={{ width: '25%' }}>FECHA</th>
              <th style={{ width: '30%' }}>HORA</th>
            </tr>
          </thead>
          <tbody>
            {cal.fds.map((fdsBlock) => (
              <React.Fragment key={fdsBlock.id}>
                <tr style={{ background: '#2f6fa8', color: 'white', fontWeight: 700 }}>
                  <td>{fdsBlock.titulo}</td>
                  <td>{formatRangoFds(fdsBlock)}</td>
                  <td style={{ whiteSpace: 'pre-line' }}>{fdsBlock.horario}</td>
                </tr>
                {cal.actividades.filter(a => a.seccion === fdsBlock.id).map((act, i) => (
                  <tr key={i} style={{ background: act.destacado ? '#fef08a' : (i % 2 === 0 ? 'white' : rowAlt) }}>
                    <td style={{ fontWeight: 600 }}>{act.actividad}</td>
                    <td>{formatFecha(act.fecha) || '(sin fecha)'}</td>
                    <td>{act.hora}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Página 2: fin de tu entrenamiento */}
      <div className="mj-page" style={{ background: 'white', maxWidth: '850px', margin: '0 auto', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h1 style={{ color: headerBg, fontSize: '1.1rem', fontWeight: 900, marginBottom: '1rem' }}>
          CALENDARIO DE MAESTRÍA DEL JUEGO-{(cal.sede || '').toUpperCase()}<br />
          EQUIPO {cal.equipoNumero} – {(cal.equipoNombre || '').toUpperCase()}
        </h1>
        <div style={{ background: '#dbeafe', textAlign: 'center', fontWeight: 900, fontSize: '1.3rem', padding: '0.8rem', marginBottom: '1.5rem' }}>
          FIN DE TU ENTRENAMIENTO
        </div>
        <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '1.2rem', fontSize: '0.82rem', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
          {cal.infoText}
        </div>
      </div>
    </div>
  );
}
