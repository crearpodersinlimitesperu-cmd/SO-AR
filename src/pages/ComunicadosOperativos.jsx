import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Mail, Send, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getAllCompanyUsers } from '../services/userService';
import { canSendOperationalCommunications } from '../config/permissions';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

const normal = value => String(value || '').trim().toLowerCase();
const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export default function ComunicadosOperativos() {
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [mode, setMode] = useState('persona');
  const [value, setValue] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getAllCompanyUsers().then(users => {
      const seen = new Set();
      setPeople((users || []).filter(user => {
        const email = normal(user.email || user.corporateEmail);
        if (!email || seen.has(email) || user.isActive === false || user.status === 'inactive') return false;
        seen.add(email); return true;
      }).map(user => ({ ...user, email: normal(user.email || user.corporateEmail) })));
    }).catch(error => showToast(`No se pudo cargar el directorio: ${error.message}`, 'error'));
  }, [showToast]);

  const options = useMemo(() => {
    if (mode === 'persona') return people.map(person => ({ key: person.email, label: `${person.name || person.email} · ${person.email}` }));
    const values = new Set();
    people.forEach(person => {
      if (mode === 'rol') (Array.isArray(person.roles) ? person.roles : [person.role || person.appRole]).filter(Boolean).forEach(role => values.add(String(role)));
      if (mode === 'sede' && person.sede) values.add(String(person.sede));
      if (mode === 'equipo') (Array.isArray(person.equipos) ? person.equipos : [person.equipo]).filter(Boolean).forEach(team => values.add(String(team)));
    });
    return [...values].sort().map(item => ({ key: item, label: item.replace(/_/g, ' ') }));
  }, [people, mode]);

  const recipients = useMemo(() => people.filter(person => {
    if (!value) return false;
    if (mode === 'persona') return person.email === value;
    if (mode === 'rol') return (Array.isArray(person.roles) ? person.roles : [person.role || person.appRole]).map(normal).includes(normal(value));
    if (mode === 'sede') return normal(person.sede) === normal(value);
    return (Array.isArray(person.equipos) ? person.equipos : [person.equipo]).map(String).includes(value);
  }), [people, mode, value]);

  const send = async () => {
    if (!canSendOperationalCommunications(currentUser)) return showToast('Acceso restringido a Dirección Operativa.', 'error');
    if (!subject.trim() || !body.trim() || !recipients.length) return showToast('Define destinatarios, asunto y mensaje.', 'error');
    setSending(true);
    try {
      const now = new Date().toISOString();
      const senderName = currentUser?.displayName || currentUser?.name || currentUser?.email;
      const emails = recipients.map(person => person.email);
      const batch = writeBatch(db);
      const communication = doc(collection(db, 'operational_communications'));
      batch.set(communication, { type: 'broadcast', audience: { mode, value }, recipients: emails, subject: subject.trim(), body: body.trim(), senderEmail: currentUser.email, senderName, createdAt: now, immutable: true });
      emails.forEach(email => {
        batch.set(doc(collection(db, 'mail')), { to: [email], type: 'operational_broadcast', delivery: { state: 'PENDING' }, createdAt: now,
          message: { subject: `${subject.trim()} — Causa OS`, html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033"><h2 style="color:#078ac6">${escapeHtml(subject)}</h2><div style="white-space:pre-wrap;line-height:1.5">${escapeHtml(body)}</div><p style="margin-top:24px;color:#5b6673;font-size:12px">Enviado por ${escapeHtml(senderName)} desde Causa OS.</p></div>` } });
        batch.set(doc(collection(db, 'notifications')), { userId: email, title: subject.trim(), message: body.trim(), type: 'operational_broadcast', communicationId: communication.id, read: false, created_at: now });
      });
      await batch.commit();
      showToast(`Comunicado encolado para ${emails.length} persona${emails.length === 1 ? '' : 's'}.`, 'success');
      setSubject(''); setBody('');
    } catch (error) { showToast(`No se pudo encolar el comunicado: ${error.message}`, 'error'); }
    finally { setSending(false); }
  };

  if (!canSendOperationalCommunications(currentUser)) return <div style={{ padding: '3rem', textAlign: 'center' }}><h2>Acceso restringido</h2><p>Este centro está disponible para Fer, Paul, José y Andrés.</p></div>;
  const field = { width: '100%', boxSizing: 'border-box', padding: '.65rem .75rem', borderRadius: 8, color: 'var(--text-heading)', background: 'var(--bg-input)', border: '1px solid var(--border-color)' };
  return <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
    <button onClick={() => navigate('/home')} style={{ border: 0, background: 'transparent', color: 'var(--crear-cyan)', cursor: 'pointer', display: 'inline-flex', gap: 6, alignItems: 'center' }}><ArrowLeft size={17} /> Inicio</button>
    <div className="glass-panel" style={{ marginTop: 14, padding: '1.3rem', border: '1px solid rgba(41,171,226,.35)' }}>
      <h1 style={{ margin: 0, color: 'var(--text-heading)', fontSize: '1.35rem' }}><Mail size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />Comunicados operativos</h1>
      <p className="text-muted">Envía un comunicado institucional por persona, rol, sede o equipo. Cada envío queda trazado y se entrega por correo y notificación en Causa OS.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 12 }}>
        <select value={mode} onChange={event => { setMode(event.target.value); setValue(''); }} style={field}><option value="persona">Persona</option><option value="rol">Rol / área</option><option value="sede">Sede</option><option value="equipo">Equipo</option></select>
        <select value={value} onChange={event => setValue(event.target.value)} style={field}><option value="">Selecciona destinatario</option>{options.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}</select>
      </div>
      <div style={{ marginTop: 12, padding: '.6rem .75rem', background: 'rgba(41,171,226,.08)', borderRadius: 8, color: 'var(--text-muted)', fontSize: '.85rem' }}><Users size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />{recipients.length} destinatario{recipients.length === 1 ? '' : 's'} seleccionado{recipients.length === 1 ? '' : 's'}</div>
      <input value={subject} onChange={event => setSubject(event.target.value)} placeholder="Asunto del comunicado" style={{ ...field, marginTop: 12 }} />
      <textarea rows="7" value={body} onChange={event => setBody(event.target.value)} placeholder="Escribe el comunicado institucional…" style={{ ...field, marginTop: 12, resize: 'vertical' }} />
      <button onClick={send} disabled={sending || !recipients.length || !subject.trim() || !body.trim()} style={{ marginTop: 12, padding: '.7rem 1rem', borderRadius: 8, border: 0, fontWeight: 800, cursor: sending ? 'wait' : 'pointer', background: 'var(--crear-cyan)', color: '#06121a', display: 'inline-flex', alignItems: 'center', gap: 7 }}><Send size={16} />{sending ? 'Encolando…' : 'Enviar comunicado'}</button>
    </div>
  </div>;
}
