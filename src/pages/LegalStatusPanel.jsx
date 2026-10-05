import React, { useEffect, useState } from 'react';
import { 
  Shield, Search, Download, CheckCircle, Clock, ShieldAlert, 
  Activity, Users, FileText, ChevronLeft, ExternalLink, X, Printer, Hash, Trash2,
  Edit3, Save, Sparkles
} from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUI } from '../context/UIContext';
import { 
  getAllLegalSignatures, 
  generateTemporaryDownloadURL, 
  generateSignedContractHTML,
  updateLegalSignatureKYC,
  resolveParticipantKYC
} from '../services/legalSignatureService';
import { useNavigate } from 'react-router-dom';

export default function LegalStatusPanel() {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sedeFilter, setSedeFilter] = useState('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAuditDoc, setSelectedAuditDoc] = useState(null);
  const [editingKycDoc, setEditingKycDoc] = useState(null);
  const [kycForm, setKycForm] = useState({
    fullName: '',
    docType: 'DNI',
    docNumber: '',
    email: '',
    phone: '',
    sede: 'Lima',
    birthDate: ''
  });
  const [savingKyc, setSavingKyc] = useState(false);
  const [generatingUrl, setGeneratingUrl] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useUI();

  useEffect(() => {
    fetchSignatures();
  }, []);

  const fetchSignatures = async () => {
    setLoading(true);
    const data = await getAllLegalSignatures();
    setSignatures(data);
    setLoading(false);
  };

  const handleDeleteSignature = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar este registro legal (${name || 'Sin Nombre'})? Esta acción removerá el registro de la base de datos.`)) return;
    try {
      await deleteDoc(doc(db, 'px_legal_signatures', id));
      setSignatures(prev => prev.filter(item => item.id !== id));
      if (showToast) showToast('Registro legal eliminado exitosamente.', 'success');
    } catch (err) {
      console.error("Error eliminando registro legal:", err);
      if (showToast) showToast('Error al eliminar registro: ' + err.message, 'error');
    }
  };

  const handleOpenEditKyc = (s) => {
    setEditingKycDoc(s);
    setKycForm({
      fullName: s.kycData?.fullName || s.participantName || s.participant_name || s.full_name || '',
      docType: s.kycData?.docType || s.doc_type || 'DNI',
      docNumber: s.kycData?.docNumber || s.doc_number || '',
      email: s.kycData?.email || s.participantId || s.participant_id || '',
      phone: s.kycData?.phone || s.phone || '',
      sede: s.sede || s.countryCode || 'Lima',
      birthDate: s.kycData?.birthDate || s.birthDate || s.birth_date || ''
    });
  };

  const handleAutoFillFromDirectory = () => {
    if (!kycForm.email) {
      if (showToast) showToast('Ingresa un correo primero para buscar en el directorio.', 'warning');
      return;
    }
    const resolved = resolveParticipantKYC(kycForm.email);
    if (resolved && resolved.fullName) {
      setKycForm(prev => ({
        ...prev,
        fullName: resolved.fullName || prev.fullName,
        docType: resolved.docType || prev.docType,
        docNumber: resolved.docNumber || prev.docNumber,
        phone: resolved.phone || prev.phone,
        sede: resolved.sede || prev.sede,
      }));
      if (showToast) showToast(`Identidad encontrada en directorio (${resolved.source})`, 'success');
    } else {
      if (showToast) showToast('No se encontró coincidencia automática en los directorios.', 'info');
    }
  };

  const handleSaveKyc = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingKycDoc) return;
    setSavingKyc(true);
    try {
      await updateLegalSignatureKYC(editingKycDoc.id, kycForm);
      setSignatures(prev => prev.map(item => {
        if (item.id === editingKycDoc.id) {
          return {
            ...item,
            participantName: kycForm.fullName,
            participant_name: kycForm.fullName,
            full_name: kycForm.fullName,
            docNumber: kycForm.docNumber,
            doc_number: kycForm.docNumber,
            docType: kycForm.docType,
            doc_type: kycForm.docType,
            phone: kycForm.phone,
            sede: kycForm.sede,
            participantId: kycForm.email,
            participant_id: kycForm.email,
            email: kycForm.email,
            kycData: {
              ...(item.kycData || {}),
              ...kycForm
            },
            kyc_data: {
              ...(item.kyc_data || {}),
              ...kycForm
            }
          };
        }
        return item;
      }));
      if (showToast) showToast('✅ Datos KYC blindados y actualizados en Firestore con éxito.', 'success');
      setEditingKycDoc(null);
    } catch (err) {
      console.error('Error actualizando KYC:', err);
      if (showToast) showToast('Error al guardar datos KYC: ' + err.message, 'error');
    } finally {
      setSavingKyc(false);
    }
  };

  const handleOpenAuditModal = (signatureData) => {
    setSelectedAuditDoc(signatureData);
  };

  const handlePrintAudit = () => {
    window.print();
  };

  const handleDirectDownload = async (signatureData) => {
    setGeneratingUrl(true);
    try {
      if (signatureData.pdf_storage_path) {
        const url = await generateTemporaryDownloadURL(signatureData.pdf_storage_path);
        if (url) {
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setGeneratingUrl(false);
          return;
        }
      }
      
      // Fallback en memoria
      const htmlContent = generateSignedContractHTML(signatureData);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const urlBlob = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = `Certificado_Auditoria_Legal_${signatureData.kycData?.docNumber || signatureData.id}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(urlBlob);
    } catch (e) {
      alert('Error descargando respaldo de auditoría: ' + e.message);
    } finally {
      setGeneratingUrl(false);
    }
  };

  const filtered = signatures.filter(s => {
    if (sedeFilter !== 'TODAS' && s.countryCode !== sedeFilter && s.sede !== sedeFilter && s.country_code !== sedeFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (s.participantName || '').toLowerCase().includes(q) || 
             (s.participant_name || '').toLowerCase().includes(q) ||
             (s.full_name || '').toLowerCase().includes(q) ||
             (s.participantId || '').toLowerCase().includes(q) ||
             (s.participant_id || '').toLowerCase().includes(q) ||
             (s.kycData?.fullName || '').toLowerCase().includes(q) ||
             (s.kycData?.docNumber || '').includes(q) ||
             (s.docNumber || '').includes(q) ||
             (s.doc_number || '').includes(q);
    }
    return true;
  });

  return (
    <div className="app-container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-body)' }}>
      
      {/* HEADER PREMIUM */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ background: 'var(--crear-gold-light)', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,193,7,0.3)' }}>
            <Shield size={32} color="var(--crear-gold)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', color: 'var(--text-heading)', fontSize: '1.8rem', fontWeight: 800 }}>
              Centro de Mando Legal <span style={{ color: 'var(--crear-gold)', fontSize: '0.5em', verticalAlign: 'middle', border: '1px solid var(--crear-gold)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>DATA ADMINS</span>
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Monitoreo y auditoría de documentos legales, firmas digitales y blindaje KYC.
            </p>
          </div>
        </div>
        <button onClick={fetchSignatures} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} /> Sincronizar Datos
        </button>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--color-success)' }}><CheckCircle size={28} /></div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-heading)', fontFamily: 'var(--font-heading)' }}>{signatures.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Contratos Firmados</div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--color-warning)' }}><ShieldAlert size={28} /></div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-heading)', fontFamily: 'var(--font-heading)' }}>100%</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Blindaje SHA-256</div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '1rem', borderRadius: '50%', color: '#38bdf8' }}><Users size={28} /></div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-heading)', fontFamily: 'var(--font-heading)' }}>Nodus</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Sincronización Activa</div>
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div style={{ background: 'var(--bg-card)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, correo o documento..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-main)', fontSize: '0.9rem' }}
          />
        </div>
        <select 
          value={sedeFilter}
          onChange={e => setSedeFilter(e.target.value)}
          style={{ padding: '0.6rem 1rem', background: 'var(--bg-dark)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-main)', fontSize: '0.9rem', cursor: 'pointer' }}
        >
          <option value="TODAS">Todos los Países / Sedes</option>
          <option value="PE">Perú (Lima)</option>
          <option value="EC">Ecuador (Quito/Guayaquil/Cuenca)</option>
          <option value="CO">Colombia (Medellín)</option>
          <option value="MX">México</option>
        </select>
      </div>

      {/* TABLA PRINCIPAL DE AUDITORÍA */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-dark-alt)', borderBottom: '1px solid var(--border-strong)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '1rem 1.5rem' }}>Participante (KYC)</th>
              <th style={{ padding: '1rem 1.5rem' }}>País / Sede</th>
              <th style={{ padding: '1rem 1.5rem' }}>Estatus Legal</th>
              <th style={{ padding: '1rem 1.5rem' }}>Sincronización Nodus</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Documentos</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Cargando bóveda legal criptográfica...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron firmas registradas bajo estos criterios.
                </td>
              </tr>
            ) : (
              filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>
                      {s.kycData?.fullName || s.participantName || s.participant_name || s.full_name || 'Sin Nombre'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {s.kycData?.docType || s.doc_type || 'DOC'}: {s.kycData?.docNumber || s.doc_number || 'No reg.'} • {s.kycData?.email || s.participantId || s.participant_id || ''}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 600 }}>{s.sede || s.countryCode || s.country_code || 'Global'}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', fontWeight: 600, fontSize: '0.8rem', background: 'rgba(34, 197, 94, 0.1)', padding: '4px 10px', borderRadius: '12px', width: 'fit-content' }}>
                      <CheckCircle size={14} /> COMPLETADO
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'monospace' }}>
                      {s.signed_at?.toDate ? s.signed_at.toDate().toLocaleString() : 'Fecha no disp.'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    {s.nodus_synced ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '0.8rem' }}>
                        <CheckCircle size={14} /> Sincronizado
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-warning)', fontSize: '0.8rem' }}>
                        <Clock size={14} /> En Cola...
                      </div>
                    )}
                    <button 
                      onClick={() => navigate(`/crm-maestro`)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', padding: 0, textDecoration: 'underline' }}
                    >
                      <ExternalLink size={12} /> Verificar en CRM Base (Nodus)
                    </button>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => handleOpenEditKyc(s)}
                        title="Editar o Recuperar Datos KYC del Participante"
                        style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '0.6rem 0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.25)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)'}
                      >
                        <Edit3 size={15} /> Recuperar KYC
                      </button>
                      <button 
                        onClick={() => handleOpenAuditModal(s)}
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', color: 'var(--text-main)', padding: '0.6rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 193, 7, 0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'var(--bg-card)'}
                      >
                        <FileText size={16} color="var(--crear-gold)" /> Auditoría PDF
                      </button>
                      <button 
                        onClick={() => handleDeleteSignature(s.id, s.kycData?.fullName || s.participantName || s.participant_name || s.full_name || 'Sin Nombre')}
                        title="Eliminar registro errado o corrupto"
                        style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '0.6rem 0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                      >
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL INTERACTIVO DE AUDITORÍA Y CERTIFICACIÓN LEGAL */}
      {selectedAuditDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-strong)', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', color: 'var(--text-main)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', pb: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={24} color="var(--crear-gold)" />
                <h3 style={{ margin: 0, color: 'var(--text-heading)', fontSize: '1.3rem', fontWeight: 800 }}>
                  Certificado de Auditoría Legal Digital
                </h3>
              </div>
              <button 
                onClick={() => setSelectedAuditDoc(null)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-dark-alt)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Participante (KYC):</span>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)' }}>
                    {selectedAuditDoc.kycData?.fullName || selectedAuditDoc.participantName || selectedAuditDoc.participant_name || selectedAuditDoc.full_name || 'Sin Nombre'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Documento de Identidad:</span>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)' }}>
                    {selectedAuditDoc.kycData?.docType || selectedAuditDoc.doc_type || 'DOC'}: {selectedAuditDoc.kycData?.docNumber || selectedAuditDoc.doc_number || 'No reg.'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Correo Electrónico:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {selectedAuditDoc.kycData?.email || selectedAuditDoc.participantId || selectedAuditDoc.participant_id || 'No registrado'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Teléfono / WhatsApp:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {selectedAuditDoc.kycData?.phone || selectedAuditDoc.phone || 'No registrado'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Sede / Jurisdicción:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {selectedAuditDoc.sede || selectedAuditDoc.countryCode || selectedAuditDoc.country_code || 'Global'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Fecha y Hora de Firma:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                    {selectedAuditDoc.signed_at?.toDate ? selectedAuditDoc.signed_at.toDate().toLocaleString() : 'Fecha no disp.'}
                  </div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Estado Criptográfico:</span>
                  <div style={{ color: 'var(--color-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <CheckCircle size={14} /> Firmado Digitalmente (SHA-256)
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Firma Hash / Traza IP:</span>
                <div style={{ background: 'var(--bg-dark)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--crear-gold)', marginTop: '4px', wordBreak: 'break-all' }}>
                  {selectedAuditDoc.hashSha256 || selectedAuditDoc.hash_sha256 || selectedAuditDoc.audit_hash || selectedAuditDoc.ip_address || selectedAuditDoc.id}
                </div>
              </div>
            </div>

            {/* VISTA PREVIA DEL CONTRATO / ACUERDO */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', background: '#fff', color: '#111', fontSize: '0.8rem', maxHeight: '200px', overflowY: 'auto', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#002060', fontWeight: 800 }}>ACUERDO DE PARTICIPACIÓN Y CONSENTIMIENTO INFORMADO</h4>
              <p>El participante declara bajo fe de juramento la veracidad de los datos consignados en el presente proceso de Onboarding Legal de CREAR Poder Sin Límites. La firma digital registrada posee plena validez jurídica conforme a las leyes de comercio electrónico y firma electrónica aplicables.</p>
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: 700 }}>
                <CheckCircle size={16} /> Aceptación electrónica certificada mediante OTP y validación KYC en sala.
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={handlePrintAudit}
                style={{ background: 'var(--bg-dark-alt)', border: '1px solid var(--border-strong)', color: 'var(--text-main)', padding: '10px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={16} /> Imprimir Certificado Oficial
              </button>
              <button 
                onClick={() => handleDirectDownload(selectedAuditDoc)}
                disabled={generatingUrl}
                style={{ background: 'var(--crear-gold)', border: 'none', color: '#000', padding: '10px 18px', borderRadius: '8px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={16} /> {generatingUrl ? 'Generando...' : 'Descargar Archivo Oficial'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN Y RECUPERACIÓN MANUAL / AUTOMÁTICA DE KYC */}
      {editingKycDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', zIndex: 110, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-strong)', width: '100%', maxWidth: '650px', maxHeight: '92vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', color: 'var(--text-main)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={24} color="#38bdf8" />
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
                    Recuperación y Blindaje de Datos KYC
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    ID Registro: <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{editingKycDoc.id}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setEditingKycDoc(null)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#38bdf8' }}>
                  Auto-detección desde Directorio Institucional
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Cruza con usuarios corporativos, CRM Nodus y directorio de managers.
                </div>
              </div>
              <button
                type="button"
                onClick={handleAutoFillFromDirectory}
                style={{ background: '#38bdf8', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              >
                <Sparkles size={14} /> Auto-completar
              </button>
            </div>

            <form onSubmit={handleSaveKyc}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Nombre Completo del Participante *
                  </label>
                  <input
                    type="text"
                    required
                    value={kycForm.fullName}
                    onChange={e => setKycForm(p => ({ ...p, fullName: e.target.value }))}
                    placeholder="Ej. Juan Pérez González"
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-dark-alt)', border: '1px solid var(--border-strong)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Tipo de Documento
                  </label>
                  <select
                    value={kycForm.docType}
                    onChange={e => setKycForm(p => ({ ...p, docType: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-dark-alt)', border: '1px solid var(--border-strong)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="DNI">DNI (Perú / España / Argentina)</option>
                    <option value="Cédula">Cédula (Colombia / Ecuador / Vzla)</option>
                    <option value="CURP">CURP / RFC (México)</option>
                    <option value="Pasaporte">Pasaporte Internacional</option>
                    <option value="DOC">Otro Documento</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Número de Documento *
                  </label>
                  <input
                    type="text"
                    value={kycForm.docNumber}
                    onChange={e => setKycForm(p => ({ ...p, docNumber: e.target.value }))}
                    placeholder="Ej. 72345678 o 1718293041"
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-dark-alt)', border: '1px solid var(--border-strong)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Correo Electrónico (participant_id) *
                  </label>
                  <input
                    type="email"
                    required
                    value={kycForm.email}
                    onChange={e => setKycForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="correo@ejemplo.com"
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-dark-alt)', border: '1px solid var(--border-strong)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={kycForm.phone}
                    onChange={e => setKycForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="Ej. +51 987 654 321"
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-dark-alt)', border: '1px solid var(--border-strong)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Sede
                  </label>
                  <select
                    value={kycForm.sede}
                    onChange={e => setKycForm(p => ({ ...p, sede: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-dark-alt)', border: '1px solid var(--border-strong)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="Lima">Lima (Perú)</option>
                    <option value="Quito">Quito (Ecuador)</option>
                    <option value="Cuenca">Cuenca (Ecuador)</option>
                    <option value="Guayaquil">Guayaquil (Ecuador)</option>
                    <option value="CDMX">CDMX (México)</option>
                    <option value="Medellín">Medellín (Colombia)</option>
                    <option value="Madrid">Madrid (España)</option>
                    <option value="Global">Global / Remoto</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    value={kycForm.birthDate}
                    onChange={e => setKycForm(p => ({ ...p, birthDate: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-dark-alt)', border: '1px solid var(--border-strong)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.2rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingKycDoc(null)}
                  style={{ background: 'var(--bg-dark-alt)', border: '1px solid var(--border-strong)', color: 'var(--text-main)', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingKyc}
                  style={{ background: '#38bdf8', border: 'none', color: '#000', padding: '10px 20px', borderRadius: '8px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={16} /> {savingKyc ? 'Guardando en Firestore...' : 'Guardar y Blindar en Firestore'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
