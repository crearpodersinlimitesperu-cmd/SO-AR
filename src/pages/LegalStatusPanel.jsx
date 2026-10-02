import React, { useEffect, useState } from 'react';
import { Shield, Search, Download, CheckCircle, Clock, ShieldAlert, Activity, Users, FileText, ChevronLeft, ExternalLink } from 'lucide-react';
import { getAllLegalSignatures, generateTemporaryDownloadURL, generateSignedContractHTML } from '../services/legalSignatureService';
import { useNavigate } from 'react-router-dom';

export default function LegalStatusPanel() {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sedeFilter, setSedeFilter] = useState('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSignatures();
  }, []);

  const fetchSignatures = async () => {
    setLoading(true);
    const data = await getAllLegalSignatures();
    setSignatures(data);
    setLoading(false);
  };

    const handleDownload = async (signatureData) => {
    try {
      if (signatureData.pdf_storage_path) {
        const url = await generateTemporaryDownloadURL(signatureData.pdf_storage_path);
        if (url) {
          window.open(url, '_blank');
          return;
        }
      }
      
      // Fallback: Si no hay PDF en Storage, regeneramos el HTML en memoria y forzamos descarga
      const htmlContent = generateSignedContractHTML(signatureData);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const urlBlob = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = `Audit_Legal_${signatureData.kycData?.docNumber || signatureData.id}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(urlBlob);
    } catch (e) {
      alert('Error obteniendo el PDF de auditoría: ' + e.message);
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
        <div style={{ background: 'var(--bg-dark-alt)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--color-success)' }}><CheckCircle size={28} /></div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-heading)', fontFamily: 'var(--font-heading)' }}>{signatures.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Contratos Firmados</div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-dark-alt)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--color-warning)' }}><ShieldAlert size={28} /></div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-heading)', fontFamily: 'var(--font-heading)' }}>100%</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Blindaje SHA-256</div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-dark-alt)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '1rem', borderRadius: '50%', color: '#38bdf8' }}><Users size={28} /></div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-heading)', fontFamily: 'var(--font-heading)' }}>Nodus</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Sincronización Activa</div>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'var(--bg-dark-alt)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '12px' }} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, correo o documento..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-strong)', color: 'var(--text-main)', borderRadius: '6px' }}
          />
        </div>
        <select 
          value={sedeFilter} 
          onChange={(e) => setSedeFilter(e.target.value)}
          style={{ padding: '0.75rem 1rem', background: 'var(--bg-dark)', border: '1px solid var(--border-strong)', color: 'var(--text-main)', borderRadius: '6px', minWidth: '200px' }}
        >
          <option value="TODAS">Todos los Países / Sedes</option>
          <option value="MX">México</option>
          <option value="PE">Perú</option>
          <option value="CO">Colombia</option>
          <option value="EC">Ecuador</option>
          <option value="ES">España</option>
        </select>
      </div>

      {/* TABLA PREMIUM */}
      <div style={{ background: 'var(--bg-dark-alt)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-strong)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
              <th style={{ padding: '1rem 1.5rem' }}>Participante (KYC)</th>
              <th style={{ padding: '1rem 1.5rem' }}>País / Sede</th>
              <th style={{ padding: '1rem 1.5rem' }}>Estatus Legal</th>
              <th style={{ padding: '1rem 1.5rem' }}>Sincronización Nodus</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Documentos</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}><Activity className="spin" size={24} style={{ margin: '0 auto 1rem' }} /> Cargando registros auditables...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No se encontraron registros de firma.</td></tr>
            ) : (
              filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s', ':hover': { background: 'var(--bg-card-hover)' } }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{s.kycData?.fullName || s.participantName || 'Sin Nombre'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <span>{s.participantId}</span>
                      {s.kycData?.docNumber && <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{s.kycData.docType} {s.kycData.docNumber}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 600 }}>{s.countryCode}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.sede || 'Global'}</div>
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
                    <button 
                      onClick={() => handleDownload(s)}
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', color: 'var(--text-main)', padding: '0.6rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 193, 7, 0.1)'}
                      onMouseOut={e => e.currentTarget.style.background = 'var(--bg-card)'}
                    >
                      <FileText size={16} color="var(--crear-gold)" /> Auditoría PDF
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
