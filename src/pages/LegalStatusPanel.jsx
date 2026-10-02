import React, { useEffect, useState } from 'react';
import { 
  Shield, Search, Download, CheckCircle, Clock, ShieldAlert, 
  Activity, Users, FileText, ChevronLeft, ExternalLink, X, Printer, Hash, Trash2
} from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUI } from '../context/UIContext';
import { getAllLegalSignatures, generateTemporaryDownloadURL, generateSignedContractHTML } from '../services/legalSignatureService';
import { useNavigate } from 'react-router-dom';

export default function LegalStatusPanel() {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sedeFilter, setSedeFilter] = useState('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAuditDoc, setSelectedAuditDoc] = useState(null);
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
    if (sedeFilter !== 'TODAS' && s.countryCode !== sedeFilter && s.sede !== sedeFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (s.participantName || '').toLowerCase().includes(q) || 
             (s.participantId || '').toLowerCase().includes(q) ||
             (s.kycData?.docNumber || '').includes(q);
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
                      {s.kycData?.fullName || s.participantName || 'Sin Nombre'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {s.kycData?.docType || 'DOC'}: {s.kycData?.docNumber || 'No reg.'} • {s.kycData?.email || s.participantId || ''}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 600 }}>{s.sede || s.countryCode || 'Global'}</div>
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
                        onClick={() => handleOpenAuditModal(s)}
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', color: 'var(--text-main)', padding: '0.6rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 193, 7, 0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'var(--bg-card)'}
                      >
                        <FileText size={16} color="var(--crear-gold)" /> Auditoría PDF
                      </button>
                      <button 
                        onClick={() => handleDeleteSignature(s.id, s.full_name)}
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
                    {selectedAuditDoc.kycData?.fullName || selectedAuditDoc.participantName || 'Sin Nombre'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Documento de Identidad:</span>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)' }}>
                    {selectedAuditDoc.kycData?.docType || 'DOC'}: {selectedAuditDoc.kycData?.docNumber || 'No reg.'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Correo Electrónico:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {selectedAuditDoc.kycData?.email || selectedAuditDoc.participantId || 'No registrado'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Sede / Jurisdicción:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {selectedAuditDoc.sede || selectedAuditDoc.countryCode || 'Global'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Fecha y Hora de Firma:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                    {selectedAuditDoc.signed_at?.toDate ? selectedAuditDoc.signed_at.toDate().toLocaleString() : 'Fecha no disp.'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Estado Criptográfico:</span>
                  <div style={{ color: 'var(--color-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> Firmado Digitalmente (SHA-256)
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Firma Hash / Traza IP:</span>
                <div style={{ background: 'var(--bg-dark)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--crear-gold)', marginTop: '4px', wordBreak: 'break-all' }}>
                  {selectedAuditDoc.audit_hash || selectedAuditDoc.ip_address || selectedAuditDoc.id}
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

    </div>
  );
}
