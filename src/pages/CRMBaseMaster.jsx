import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, limit, getDocs, where, getCountFromServer } from 'firebase/firestore';
import { Search, RefreshCw, ArrowLeft, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function CRMBaseMaster() {
  const navigate = useNavigate();
  const { currentUser, isSuperAdmin } = useAuth();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, sentados: 0, pendientes: 0 });

  useEffect(() => {
    fetchStats();
    fetchData();
  }, []);

  const fetchStats = async () => {
    try {
      const coll = collection(db, 'participants');
      const totalSnap = await getCountFromServer(coll);
      
      const sentadosQ = query(coll, where('estadoC1', '==', 'SENTADO'));
      const sentadosSnap = await getCountFromServer(sentadosQ);
      
      const pendientesQ = query(coll, where('estadoC1', '==', 'PENDIENTE'));
      const pendientesSnap = await getCountFromServer(pendientesQ);

      setStats({
        total: totalSnap.data().count,
        sentados: sentadosSnap.data().count,
        pendientes: pendientesSnap.data().count
      });
    } catch (e) {
      console.error("Error fetching stats:", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'participants'), limit(150));
      const snap = await getDocs(q);
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      setData(docs);
    } catch (e) {
      toast.error('Error al cargar la base de datos');
    }
    setLoading(false);
  };

  const getStatusBadge = (estado) => {
    if (estado === 'SENTADO') return <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> SENTADO</span>;
    if (estado === 'DESERTOR') return <span className="bg-rose-500/20 text-rose-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><XCircle size={12}/> DESERTOR</span>;
    if (estado === 'REZAGADO') return <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><Clock size={12}/> REZAGADO</span>;
    return <span className="bg-slate-500/20 text-slate-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><Clock size={12}/> {estado || 'PENDIENTE'}</span>;
  };

  const filteredData = data.filter(p => 
    p.nombreCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.dni?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-300" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 flex items-center gap-2">
                <Users size={28} className="text-amber-400" /> Base Maestra CRM (Nodus)
              </h1>
              <p className="text-slate-400 mt-1">Conexión directa con todos los registros sincronizados de tu CRM</p>
            </div>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-colors border border-slate-700">
            <RefreshCw size={16} /> Refrescar
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Total Registros</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-800 border border-emerald-900/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Sentados</p>
            <p className="text-3xl font-bold text-emerald-400">{stats.sentados}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Pendientes</p>
            <p className="text-3xl font-bold text-slate-300">{stats.pendientes}</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-700 flex flex-wrap gap-4 items-center bg-slate-800/50">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por DNI o Nombres..." 
                className="w-full bg-slate-900 border border-slate-700 rounded py-2 pl-10 pr-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-sm uppercase tracking-wider">
                  <th className="p-4 border-b border-slate-700 font-medium">Participante</th>
                  <th className="p-4 border-b border-slate-700 font-medium">Contacto</th>
                  <th className="p-4 border-b border-slate-700 font-medium">Estado C1</th>
                  <th className="p-4 border-b border-slate-700 font-medium">Coordinadora</th>
                  <th className="p-4 border-b border-slate-700 font-medium">IMO Enrolador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                      Cargando base de datos...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      No se encontraron resultados en la vista actual.
                    </td>
                  </tr>
                ) : (
                  filteredData.map(p => (
                    <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white">{p.nombreCompleto}</div>
                        <div className="text-xs text-slate-400 mt-1">DNI: {p.dni || 'Sin DNI'}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">{p.telefono || '-'}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[150px]">{p.email || '-'}</div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(p.estadoC1)}
                      </td>
                      <td className="p-4 text-sm text-slate-300">
                        {p.coordinadora || '-'}
                      </td>
                      <td className="p-4 text-sm text-slate-400">
                        {p.imoEnrolador || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-700 text-xs text-slate-500 text-center">
            Mostrando hasta 150 registros recientes. Usa la barra de busqueda para filtrar localmente.
          </div>
        </div>
      </div>
    </div>
  );
}
