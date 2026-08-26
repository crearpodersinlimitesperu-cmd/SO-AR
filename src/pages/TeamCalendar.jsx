import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Users, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TeamCalendar() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const timeBlocks = [
    { id: 1, title: 'Deep Work: Revisión Portafolio', time: '09:00 - 11:00', type: 'Foco', owner: 'Gerente Lima' },
    { id: 2, title: 'Sincronización Operativa', time: '11:30 - 12:30', type: 'Reunión', owner: 'Equipo QT' },
    { id: 3, title: 'Revisión de Presupuestos', time: '15:00 - 16:30', type: 'Bloqueo', owner: 'Finanzas' },
  ];

  return (
    <div className="calendar-container p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 flex items-center gap-3">
            <CalendarIcon className="text-orange-400" size={32} />
            Time Boxing & Disponibilidad
          </h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-wider font-bold">
            Gestión del Tiempo del Equipo SO-AR
          </p>
        </div>
        <div className="flex gap-4">
          <button className="btn-primary flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 border-none text-white font-bold px-4 py-2 rounded-xl hover:from-orange-400 hover:to-red-500 transition-all shadow-lg shadow-orange-500/25">
            <Plus size={20} /> Agendar Bloque
          </button>
          <button onClick={() => navigate('/home')} className="btn-secondary">
            Volver al Home
          </button>
        </div>
      </div>

      <div className="glass-panel p-6 border border-gray-800 rounded-2xl shadow-xl flex flex-col md:flex-row gap-8">
        
        {/* Left Side: Mini Calendar and Users */}
        <div className="w-full md:w-1/3 border-r border-gray-800/50 pr-0 md:pr-8">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Agosto 2026</h3>
              <div className="flex gap-2">
                <button className="p-1 rounded bg-gray-800 text-gray-400 hover:text-white"><ChevronLeft size={20}/></button>
                <button className="p-1 rounded bg-gray-800 text-gray-400 hover:text-white"><ChevronRight size={20}/></button>
              </div>
            </div>
            {/* Dummy Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 text-center text-sm mb-2">
              <div className="text-gray-500 font-bold">L</div><div className="text-gray-500 font-bold">M</div><div className="text-gray-500 font-bold">X</div><div className="text-gray-500 font-bold">J</div><div className="text-gray-500 font-bold">V</div><div className="text-gray-500 font-bold">S</div><div className="text-gray-500 font-bold">D</div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-sm">
              {[...Array(31)].map((_, i) => (
                <div key={i} className={`p-2 rounded-full cursor-pointer font-bold ${i === 21 ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50' : 'text-gray-300 hover:bg-gray-800'}`}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users size={16}/> Calendarios Compartidos
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
                <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                <span className="text-sm font-medium text-white">Mi Agenda (Time Boxing)</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                <span className="text-sm font-medium text-gray-400">Agenda Dirección</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                <span className="text-sm font-medium text-gray-400">Equipo Quantum</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Timeline */}
        <div className="w-full md:w-2/3">
          <h2 className="text-xl font-bold text-white mb-6">Agenda de Hoy - 22 de Agosto</h2>
          <div className="relative border-l-2 border-gray-800 ml-4 space-y-8">
            
            {timeBlocks.map((block, idx) => (
              <div key={block.id} className="relative pl-6">
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-[#0b1622] ${block.type === 'Foco' ? 'bg-cyan-500' : block.type === 'Reunión' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                
                <div className="glass-panel p-4 border border-gray-800 rounded-xl hover:-translate-y-1 transition-transform">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-bold text-white leading-tight">{block.title}</h4>
                    <span className="text-xs font-bold px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-700">
                      {block.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1 font-bold text-cyan-400">
                      <Clock size={14} /> {block.time}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={14} /> {block.owner}
                    </div>
                  </div>
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>
    </div>
  );
}
