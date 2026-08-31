import React, { useState } from 'react';
import { Mail, CheckCircle2, FileText, Lock, Plus, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function OfficialAgreements() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const agreements = [
    { id: 1, title: 'Aprobación Presupuesto E29', author: 'Gerencia General', date: '2026-08-20', status: 'Aprobado Formal', category: 'Finanzas' },
    { id: 2, title: 'Cambio de Hotel Sede Medellín', author: 'Logística', date: '2026-08-21', status: 'Pendiente Firma', category: 'Operaciones' },
    { id: 3, title: 'Validación de Entrenadores C1', author: 'Dirección', date: '2026-08-22', status: 'Aprobado Formal', category: 'Recursos' },
  ];

  return (
    <div className="agreements-container p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 flex items-center gap-3">
            <Mail className="text-purple-400" size={32} />
            Acuerdos y Trazabilidad (Oficial)
          </h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-wider font-bold">
            Lo que no está aquí, no existe. (Sustituto de Correo Interno)
          </p>
        </div>
        <div className="flex gap-4">
          <button className="btn-primary flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 border-none text-white font-bold px-4 py-2 rounded-xl hover:from-purple-400 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/25">
            <Plus size={20} /> Nuevo Acuerdo
          </button>
          <button onClick={() => navigate('/home')} className="btn-secondary">
            Volver al Home
          </button>
        </div>
      </div>

      <div className="glass-panel p-6 border border-gray-800 rounded-2xl mb-8 flex items-center gap-4 shadow-xl">
        <Search className="text-gray-500" />
        <input 
          type="text"
          placeholder="Buscar por título, autor o categoría..."
          className="bg-transparent border-none text-white w-full focus:outline-none placeholder-gray-600 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {agreements.map(agr => (
          <div key={agr.id} className="glass-panel p-6 border border-gray-800 rounded-2xl shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Lock size={64} className="text-purple-400" />
            </div>
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="px-3 py-1 bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider rounded-full">
                {agr.category}
              </span>
              <span className="text-xs font-bold text-gray-500">{agr.date}</span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2 relative z-10 leading-tight">{agr.title}</h3>
            
            <div className="flex items-center gap-2 mb-6 relative z-10">
              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                {agr.author.charAt(0)}
              </div>
              <span className="text-sm font-medium text-gray-400">{agr.author}</span>
            </div>

            <div className="border-t border-gray-800 pt-4 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                {agr.status.includes('Aprobado') ? (
                  <CheckCircle2 className="text-emerald-500" size={18} />
                ) : (
                  <FileText className="text-amber-500" size={18} />
                )}
                <span className={`text-sm font-bold ${agr.status.includes('Aprobado') ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {agr.status}
                </span>
              </div>
              <button className="text-xs font-bold text-purple-400 hover:text-purple-300 uppercase tracking-wider">
                Ver Documento
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
