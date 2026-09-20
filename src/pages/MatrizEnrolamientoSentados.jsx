import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, Trophy, UserCheck, ArrowLeft, Filter, Search, 
  TrendingUp, Layers, CheckCircle2, Clock, AlertCircle, RefreshCw 
} from 'lucide-react';

export default function MatrizEnrolamientoSentados() {
  const navigate = useNavigate();

  // Estados de Filtros
  const [selectedSede, setSelectedSede] = useState('TODAS');
  const [selectedEquipo, setSelectedEquipo] = useState('TODOS');
  const [selectedEntrenador, setSelectedEntrenador] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  // Matriz Principal de Datos de Equipos y Cadenas de Enrolamiento
  const matrizDatos = useMemo(() => [
    {
      id: 'e31-lima',
      sede: 'Lima',
      equipo: 'EQUIPO 31',
      entrenador: 'Por Asignar (MJ C2)',
      coordinador: 'Joyce / Diana',
      cadenaAlimentacion: 'Enrolados en FDS de MJ por E30, E29, E28',
      enroladosMeta: 133,
      confirmadosLlamada: 25,
      sentadosEfectivos: 118,
      sentadosNuevos: 100,
      sentadosRezagados: 18,
      estadoEntrenamiento: 'Iniciado Hoy (18/09/2026)',
      notas: '¡Iniciado hoy 18/09/2026! 118 Sentados Efectivos en sala (100 Directos/Nuevos + 18 Cambios de Nombre / Reemplazos).'
    },
    {
      id: 'e30-lima',
      sede: 'Lima',
      equipo: 'EQUIPO 30',
      entrenador: 'Andrés Idrovo (MJ Creación)',
      coordinador: 'Joyce Lima (117 llamadas) / Diana C. (132 llamadas)',
      cadenaAlimentacion: 'Enrolados por E29, E28, E27',
      enroladosMeta: 59,
      confirmadosLlamada: 127,
      sentadosEfectivos: 94,
      sentadosNuevos: 29,
      sentadosRezagados: 11,
      estadoEntrenamiento: 'Completado',
      notas: '59 enrolados por Andrés Idrovo -> 29 sentados nuevos directos + 11 clasificados como Rezagados de C1 anteriores.'
    },
    {
      id: 'e29-lima',
      sede: 'Lima',
      equipo: 'EQUIPO 29',
      entrenador: 'Lourdes Patiño (MJ Relación)',
      coordinador: 'Joyce Lima (214 llamadas) / Diana C. (229 llamadas)',
      cadenaAlimentacion: 'Enrolados por E28, E27, E26',
      enroladosMeta: 30,
      confirmadosLlamada: 167,
      sentadosEfectivos: 139,
      sentadosNuevos: 29,
      sentadosRezagados: 0,
      estadoEntrenamiento: 'Completado',
      notas: '30 enrolados por Lourdes Patiño -> 29 sentados nuevos efectivos (96.6% efectividad).'
    },
    {
      id: 'e28-lima',
      sede: 'Lima',
      equipo: 'EQUIPO 28',
      entrenador: 'Alejandro Díaz (MJ Gratitud)',
      coordinador: 'Joyce Lima (121 llamadas) / Diana C. (172 llamadas)',
      cadenaAlimentacion: 'Enrolados por E27, E26, E25',
      enroladosMeta: 44,
      confirmadosLlamada: 123,
      sentadosEfectivos: 110,
      sentadosNuevos: 28,
      sentadosRezagados: 16,
      estadoEntrenamiento: 'Completado',
      notas: '44 enrolados por Alejandro Díaz -> 28 sentados nuevos + 16 clasificados como Rezagados.'
    },
    {
      id: 'e27-lima',
      sede: 'Lima',
      equipo: 'EQUIPO 27',
      entrenador: 'Alonso Solares (MJ)',
      coordinador: 'Joyce Lima / Leyla',
      cadenaAlimentacion: 'Alimentado por E26, E25, E24',
      enroladosMeta: 50,
      confirmadosLlamada: 195,
      sentadosEfectivos: 159,
      sentadosMetaDirecta: 38,
      arrastradosRegularizados: 7,
      estadoEntrenamiento: 'Completado',
      notas: '159 sentados totales en sala.'
    },
    {
      id: 'e37-gye',
      sede: 'Guayaquil',
      equipo: 'EQUIPO 37',
      entrenador: 'María De Lourdes Patiño (MJ)',
      coordinador: 'Brenda Rodríguez / Diana Macas',
      cadenaAlimentacion: 'Alimentado por E36, E35, E34',
      enroladosMeta: 50,
      confirmadosLlamada: 45,
      sentadosEfectivos: 42,
      sentadosMetaDirecta: 42,
      arrastradosRegularizados: 0,
      estadoEntrenamiento: 'En Curso',
      notas: 'Capítulo Activo Guayaquil.'
    },
    {
      id: 'e127-quito',
      sede: 'Quito',
      equipo: 'EQUIPO 127',
      entrenador: 'Alonso Solares Salazar (MJ)',
      coordinador: 'Adrianna / Liliana',
      cadenaAlimentacion: 'Alimentado por E125, E123',
      enroladosMeta: 50,
      confirmadosLlamada: 40,
      sentadosEfectivos: 35,
      sentadosMetaDirecta: 35,
      arrastradosRegularizados: 0,
      estadoEntrenamiento: 'Programado',
      notas: 'Matriz Maestría Quito.'
    },
    {
      id: 'e23-cuenca',
      sede: 'Cuenca',
      equipo: 'EQUIPO 23',
      entrenador: 'Alonso Solares Salazar (MJ)',
      coordinador: 'Maribel / Joao',
      cadenaAlimentacion: 'Alimentado por E22, E21',
      enroladosMeta: 50,
      confirmadosLlamada: 38,
      sentadosEfectivos: 32,
      sentadosMetaDirecta: 32,
      arrastradosRegularizados: 0,
      estadoEntrenamiento: 'Programado',
      notas: 'Matriz Maestría Cuenca.'
    }
  ], []);

  // Filtrado dinámico
  const datosFiltrados = useMemo(() => {
    return matrizDatos.filter(item => {
      const matchSede = selectedSede === 'TODAS' || item.sede.toUpperCase() === selectedSede.toUpperCase();
      const matchEquipo = selectedEquipo === 'TODOS' || item.equipo.toUpperCase().includes(selectedEquipo.toUpperCase());
      const matchEntrenador = selectedEntrenador === 'TODOS' || item.entrenador.toUpperCase().includes(selectedEntrenador.toUpperCase());
      const matchSearch = searchTerm === '' || 
        item.equipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.entrenador.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.coordinador.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sede.toLowerCase().includes(searchTerm.toLowerCase());

      return matchSede && matchEquipo && matchEntrenador && matchSearch;
    });
  }, [matrizDatos, selectedSede, selectedEquipo, selectedEntrenador, searchTerm]);

  // Cálculos consolidados
  const totales = useMemo(() => {
    return datosFiltrados.reduce((acc, curr) => {
      acc.totalEnrolados += curr.enroladosMeta;
      acc.totalSentados += curr.sentadosEfectivos;
      acc.totalConfirmados += curr.confirmadosLlamada;
      return acc;
    }, { totalEnrolados: 0, totalSentados: 0, totalConfirmados: 0 });
  }, [datosFiltrados]);

  const porcentajeEfectividadGlobal = totales.totalEnrolados > 0 
    ? ((totales.totalSentados / totales.totalEnrolados) * 100).toFixed(1) 
    : '0.0';

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* HEADER DE LA SECCIÓN */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button 
            onClick={() => navigate(-1)}
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', 
              border: 'none', color: '#6b7280', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' 
            }}
          >
            <ArrowLeft size={16} /> Volver
          </button>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Layers style={{ color: '#d97706' }} size={28} />
            Matriz de Enrolamientos y Sentados Efectivos
          </h1>
          <p style={{ color: '#4b5563', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
            Consolidado oficial por Sede, Equipo, Entrenador y Coordinador. Seguimiento de cadenas de arrastre y conversión de asistencia.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', 
              background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' 
            }}
          >
            <RefreshCw size={16} /> Actualizar Datos
          </button>
        </div>
      </div>

      {/* TARJETAS DE KPIS SUPERIORES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>
            <span>ENROLADOS TOTALES META</span>
            <Users size={20} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginTop: '0.5rem' }}>
            {totales.totalEnrolados} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>px</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#2563eb', marginTop: '0.25rem', fontWeight: 600 }}>
            Incluye E31 (133), E30 (59), E29 (30), E28 (44)
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>
            <span>SENTADOS EFECTIVOS EN SALA</span>
            <UserCheck size={20} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a', marginTop: '0.5rem' }}>
            {totales.totalSentados} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>px</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '0.25rem', fontWeight: 600 }}>
            Asistencia verificada en Nodus
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>
            <span>CONFORMACIÓN E31 LIMA</span>
            <Clock size={20} style={{ color: '#d97706' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#d97706', marginTop: '0.5rem' }}>
            133 <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>Enrolados</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#d97706', marginTop: '0.25rem', fontWeight: 600 }}>
            Alimentado por E30, E29 y E28 (Inicia 1-4 Oct)
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>
            <span>% EFECTIVIDAD CONVERSIÓN</span>
            <TrendingUp size={20} style={{ color: '#0284c7' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0284c7', marginTop: '0.5rem' }}>
            {porcentajeEfectividadGlobal}%
          </div>
          <div style={{ fontSize: '0.8rem', color: '#0284c7', marginTop: '0.25rem', fontWeight: 600 }}>
            Promedio ponderado de sentados efectivos
          </div>
        </div>

      </div>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          
          <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
            <Search size={18} style={{ color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Buscar por equipo, entrenador, coordinador o sede..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: '#64748b' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Sede:</span>
            <select 
              value={selectedSede} 
              onChange={(e) => setSelectedSede(e.target.value)}
              style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem 0.75rem', fontSize: '0.85rem', background: '#fff', cursor: 'pointer' }}
            >
              <option value="TODAS">Todas las Sedes</option>
              <option value="Lima">Lima</option>
              <option value="Guayaquil">Guayaquil</option>
              <option value="Quito">Quito</option>
              <option value="Cuenca">Cuenca</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Entrenador:</span>
            <select 
              value={selectedEntrenador} 
              onChange={(e) => setSelectedEntrenador(e.target.value)}
              style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem 0.75rem', fontSize: '0.85rem', background: '#fff', cursor: 'pointer' }}
            >
              <option value="TODOS">Todos los Entrenadores</option>
              <option value="Alejandro">Alejandro Díaz (E28 Gratitud)</option>
              <option value="Lourdes">Lourdes Patiño (E29 Relación)</option>
              <option value="Andrés">Andrés Idrovo (E30 Creación)</option>
              <option value="Alonso">Alonso Solares</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Equipo:</span>
            <select 
              value={selectedEquipo} 
              onChange={(e) => setSelectedEquipo(e.target.value)}
              style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem 0.75rem', fontSize: '0.85rem', background: '#fff', cursor: 'pointer' }}
            >
              <option value="TODOS">Todos los Equipos</option>
              <option value="31">Equipo 31</option>
              <option value="30">Equipo 30</option>
              <option value="29">Equipo 29</option>
              <option value="28">Equipo 28</option>
              <option value="27">Equipo 27</option>
            </select>
          </div>

        </div>
      </div>

      {/* TABLA PRINCIPAL REPORTE */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#f8fafc', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Sede / Equipo</th>
              <th style={{ padding: '0.85rem 1rem' }}>Entrenador Asignado</th>
              <th style={{ padding: '0.85rem 1rem' }}>Coordinador Nodus</th>
              <th style={{ padding: '0.85rem 1rem' }}>Cadena de Alimentación</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Meta Enrolados</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Enrolados FDS MJ</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Sentados Nuevos</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Rezagados (De C1 Ant.)</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Total Sentados En Sala</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>% Conversión</th>
              <th style={{ padding: '0.85rem 1rem' }}>Estado / Clasificación</th>
            </tr>
          </thead>
          <tbody>
            {datosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  No se encontraron equipos que coincidan con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              datosFiltrados.map((row, idx) => {
                const porcentaje = row.enroladosMeta > 0 
                  ? ((row.sentadosEfectivos / row.enroladosMeta) * 100).toFixed(1) 
                  : '0.0';

                const isE31 = row.equipo.includes('31');

                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    
                    <td style={{ padding: '1rem', fontWeight: 700 }}>
                      <div style={{ color: '#0f172a' }}>{row.equipo}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Sede: {row.sede}</div>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{row.entrenador}</div>
                    </td>

                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#475569' }}>
                      {row.coordinador}
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '6px', 
                        background: isE31 ? '#fef3c7' : '#e0f2fe', color: isE31 ? '#92400e' : '#0369a1', fontWeight: 600 
                      }}>
                        {row.cadenaAlimentacion}
                      </span>
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, fontSize: '1.05rem', color: '#1e293b' }}>
                      {row.enroladosMeta}
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, fontSize: '1.05rem', color: isE31 ? '#94a3b8' : '#2563eb' }}>
                      {isE31 ? '0' : row.sentadosNuevos}
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, fontSize: '1.05rem', color: isE31 ? '#94a3b8' : '#d97706' }}>
                      {isE31 ? '0' : (row.sentadosRezagados || 0)}
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, fontSize: '1.05rem', color: isE31 ? '#d97706' : '#16a34a' }}>
                      {isE31 ? '0 (Pendiente)' : row.sentadosEfectivos}
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{ 
                        fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.85rem',
                        background: isE31 ? '#fef3c7' : Number(porcentaje) >= 80 ? '#dcfce7' : '#fee2e2',
                        color: isE31 ? '#92400e' : Number(porcentaje) >= 80 ? '#15803d' : '#991b1b'
                      }}>
                        {isE31 ? 'Pre-Inicio' : `${porcentaje}%`}
                      </span>
                    </td>

                    <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#475569' }}>
                      <div>{row.notas}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem' }}>Estado: {row.estadoEntrenamiento}</div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PIE DE NOTA METODOLÓGICO */}
      <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '0.85rem', color: '#1e40af' }}>
        <strong>💡 Criterio de Cadena de Enrolamiento:</strong> Cada equipo nuevo (ej. E31) se construye con el consolidado de enrolamientos generados por las cohortes anteriores inmediatas (E30, E29, E28). El conteo de "Sentados Efectivos" valida la presencia real verificada en la mesa de registro Nodus de cada sede.
      </div>

    </div>
  );
}
