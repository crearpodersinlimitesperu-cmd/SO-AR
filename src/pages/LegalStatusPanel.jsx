import React, { useEffect, useState } from 'react';
import { Shield, Search, Download, FileText, CheckCircle, Clock } from 'lucide-react';
import { getAllLegalSignatures, generateTemporaryDownloadURL } from '../services/legalSignatureService';

export default function LegalStatusPanel() {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sedeFilter, setSedeFilter] = useState('TODAS');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSignatures();
  }, []);

  const fetchSignatures = async () => {
    setLoading(true);
    const data = await getAllLegalSignatures();
    setSignatures(data);
    setLoading(false);
  };

  const handleDownload = async (sig) => {
    if (!sig.pdfStoragePath) {
      alert("El documento aún se está procesando o no tiene ruta de PDF válida.");
      return;
    }
    try {
      const url = await generateTemporaryDownloadURL(sig.pdfStoragePath);
      if (url) {
        window.open(url, '_blank');
      } else {
        alert("No se pudo generar el enlace. Verifica permisos de Storage.");
      }
    } catch (e) {
      alert("Error al descargar: " + e.message);
    }
  };

  const filtered = signatures.filter(s => {
    if (sedeFilter !== 'TODAS' && s.countryCode !== sedeFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (s.participantName || '').toLowerCase().includes(q) || 
             (s.participantId || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              Panel de Control Legal (Data Admins)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Monitoreo y auditoría de documentos legales y firmas digitales.
            </p>
          </div>
          <button 
            onClick={fetchSignatures}
            className="px-4 py-2 bg-white border border-slate-200 rounded shadow-sm text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Actualizar
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <select 
            value={sedeFilter}
            onChange={(e) => setSedeFilter(e.target.value)}
            className="py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="TODAS">Todos los Países</option>
            <option value="MX">México (MX)</option>
            <option value="PE">Perú (PE)</option>
            <option value="CO">Colombia (CO)</option>
            <option value="EC">Ecuador (EC)</option>
            <option value="ES">España (ES)</option>
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Cargando firmas...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No se encontraron firmas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                    <th className="px-4 py-3">Participante</th>
                    <th className="px-4 py-3">País</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Fecha Firma</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map(sig => (
                    <tr key={sig.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{sig.participantName || 'Sin Nombre'}</div>
                        <div className="text-xs text-slate-500">{sig.participantId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                          {sig.countryCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {sig.termsAccepted && sig.ndaSigned ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium bg-emerald-50 px-2 py-1 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Completado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium bg-amber-50 px-2 py-1 rounded-full">
                            <Clock className="w-3 h-3" /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {sig.signed_at?.toDate ? new Date(sig.signed_at.toDate()).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleDownload(sig)}
                          className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-semibold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Descargar PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
