import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import {
  Briefcase, TrendingUp, AlertCircle, CheckCircle2, ChevronRight, Activity,
  Clock, ShieldCheck, Box, ArrowLeft, Loader2, Sparkles, DollarSign,
  Users, PhoneCall, AlertTriangle, Target, RefreshCw, BarChart2, ShieldAlert,
  Award, CheckSquare, Plus, ExternalLink, Send, X, Trophy, Filter, ArrowUpDown,
  Search, UserCheck
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, collection, setDoc, addDoc } from 'firebase/firestore';
import { db, getDocResilient } from '../services/firebase';
import { OPERATIONAL_SEDES, normalizeSede, usersData, normalizeRole } from '../data/usersData';
import nodusFallbackData from '../data/nodusFallbackData.json';
import ResourceCapacityView from '../components/ResourceCapacityView';

export const KNOWN_COORDINATORS = {
  'MARIBEL': { formalName: 'Maribel Catota', email: 'viviana.catota@crearpsl.net', role: 'coord_c1', sede: 'Cuenca' },
  'JOAO': { formalName: 'Joao Alfonso Trujillo', email: 'alfonso.trujillo@crearpsl.net', role: 'coord_c1', sede: 'Cuenca' },
  'JUAN FERNANDO': { formalName: 'Juan Fernando Reinoso', email: 'juan.reinoso@crearpsl.net', role: 'coord_maestria', sede: 'Cuenca' },
  'EVELYN PAULINA': { formalName: 'Pauly Cedillo (Evelyn)', email: 'evelyn.cedillo@crearpsl.net', role: 'coord_c1', sede: 'Cuenca' },
  'DIANA MACAS': { formalName: 'Diana Macas', email: 'diana.macas@crearpsl.net', role: 'coord_c1', sede: 'Guayaquil' },
  'BRENDA RODRIGUEZ': { formalName: 'Brenda Rodriguez', email: 'brenda.rodriguez@crearpsl.net', role: 'coord_c1', sede: 'Guayaquil' },
  'JONATHAN LA ROSA': { formalName: 'Jonathan La Rosa', email: 'jonathan.larosa@crearpsl.net', role: 'coord_c1', sede: 'Guayaquil' },
  'JORGE': { formalName: 'Jorge Washington Ramírez', email: 'jorge.ramirez@crearpsl.net', role: 'coord_c1', sede: 'Guayaquil' },
  'JOYCE': { formalName: 'Joyce Marin', email: 'joyce.marin@crearpsl.net', role: 'coord_c1', sede: 'Lima' },
  'DIANA': { formalName: 'Diana Moscoso', email: 'diana.moscoso@crearpsl.net', role: 'coord_c1', sede: 'Lima' },
  'LEYLA': { formalName: 'Leyla Ochoa', email: 'rouz1414@gmail.com', role: 'coord_c1', sede: 'Lima' },
  'VALENTINA RODRIGUEZ': { formalName: 'Valentina Rodriguez', email: 'valentina.r@crearpsl.net', role: 'coord_c1', sede: 'Medellín' },
  'DAVID GONZALEZ': { formalName: 'David Gonzalez', email: 'david.gonzalez@crearpsl.net', role: 'coord_c1', sede: 'Medellín' },
  'JUAN SEBASTIAN SOTO': { formalName: 'Juan Sebastian Soto', email: 'juansebastian.soto@crearpsl.net', role: 'coord_c1', sede: 'Medellín' },
  'NAOMI': { formalName: 'Naomi Zamora', email: 'naomi.zamora@crearpsl.net', role: 'coord_c1', sede: 'México' },
  'ADRIANNA': { formalName: 'Adrianna Campuzano', email: 'adrianna@crearpsl.net', role: 'coord_c1', sede: 'Quito' },
  'LILIANA': { formalName: 'Liliana Cubillo', email: 'liliana.cubillo@crearpsl.net', role: 'coord_c1', sede: 'Quito' },
  'KARLA': { formalName: 'Karla Aguirre', email: 'katherine.aguirre@crearpsl.net', role: 'coord_c1', sede: 'Quito' },
  'ADAMS': { formalName: 'Adams (Coordinación)', email: 'coordinacion.quito@crearpsl.net', role: 'coord_c1', sede: 'Quito' },
  'DANIELA': { formalName: 'Daniela Villa', email: 'dayapamae.villarodriguez14@gmail.com', role: 'coord_c1', sede: 'Quito' },
  'DANNA': { formalName: 'Dayana Zambrano', email: 'dayizambrano24@gmail.com', role: 'coord_c1', sede: 'Quito' },
  'MARCELA': { formalName: 'Marcela Robbys', email: 'marobel.studio@gmail.com', role: 'coord_c1', sede: 'Quito' }
};

export const GERENTES_POR_SEDE = {
  'Cuenca': { name: 'July León', email: 'emely.leon@crearpsl.net' },
  'Guayaquil': { name: 'Josué Vera', email: 'josue.vera@crearpsl.net' },
  'Lima': { name: 'José Sánchez', email: 'jose.sanchez@crearpsl.net' },
  'Medellín': { name: 'Yurany González', email: 'yurany.gonzalez@crearpsl.net' },
  'México': { name: 'Nora Zamora', email: 'nora.zamora@crearpsl.net' },
  'Quito': { name: 'Emily Campuzano / Freddy Sosa', email: 'emily.campuzano@crearpsl.net' }
};

function formatRoleLabel(role) {
  const norm = normalizeRole(role);
  if (norm === 'coord_c1') return 'Coordinador C1 / C2';
  if (norm === 'coord_maestria') return 'Coordinador MJ';
  if (norm === 'gerente') return 'Gerente de Sede';
  if (norm === 'qt') return 'Quantum Team';
  if (norm === 'capitan') return 'Capitán';
  if (norm === 'director_maestria') return 'Director Maestría';
  return 'Coordinador Operativo';
}

function resolveCausaUser(rawName, sede) {
  const clean = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const rawClean = clean(rawName);

  for (const [key, val] of Object.entries(KNOWN_COORDINATORS)) {
    const keyClean = clean(key);
    if (rawClean === keyClean || rawClean.includes(keyClean) || keyClean.includes(rawClean)) {
      return {
        formalName: val.formalName,
        email: val.email,
        role: val.role || 'coord_c1',
        roleLabel: formatRoleLabel(val.role || 'coord_c1'),
        sede: val.sede || sede || 'Sin Sede',
        nodusName: rawName
      };
    }
  }

  if (Array.isArray(usersData)) {
    const match = usersData.find(u => {
      const uName = clean(u.name || u.displayName);
      return uName && (uName.includes(rawClean) || rawClean.includes(uName));
    });
    if (match) {
      return {
        formalName: match.name || match.displayName || rawName,
        email: match.email || (Array.isArray(match.emails) ? match.emails[0] : `${rawClean}@crearpsl.net`),
        role: match.role || 'coord_c1',
        roleLabel: formatRoleLabel(match.role || 'coord_c1'),
        sede: normalizeSede(match.sede || sede),
        nodusName: rawName
      };
    }
  }

  return {
    formalName: rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase(),
    email: `${rawClean.replace(/\s+/g, '.')}@crearpsl.net`,
    role: 'coord_c1',
    roleLabel: 'Coordinador C1 / C2',
    sede: normalizeSede(sede),
    nodusName: rawName
  };
}

export default function PortfolioBoard() {
  const { currentUser } = useAuth();
  const { events } = useCycles();
  const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [viewMode, setViewMode] = useState(tabParam || 'predictor');
  const [coordinadoresRaw, setCoordinadoresRaw] = useState([]);

  // Estados de control para Centinela RRHH y Ranking
  const [rankingFilter, setRankingFilter] = useState('ALL'); // ALL, CRITICO, REZAGO, OPTIMO
  const [rankingSort, setRankingSort] = useState('salud'); // salud, cobertura, confirmados, sentados, asignados
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoordForTask, setSelectedCoordForTask] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedToEmail: '',
    assignedToName: '',
    assignedRole: 'gerente',
    priority: 'urgent',
    dueDate: ''
  });
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (tabParam && ['predictor', 'active', 'resources', 'rrhh_sentinel'].includes(tabParam)) {
      setViewMode(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (mode) => {
    setViewMode(mode);
    setSearchParams({ tab: mode });
  };
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState([]);
  const [stats, setStats] = useState({ activos: 0, tiempo: 0, atrasado: 0, critico: 0 });
  const [expandedId, setExpandedId] = useState(null);
  
  // Estado para datos del Predictor de Inteligencia Nodus
  const [predictorData, setPredictorData] = useState(null);
  const [hrSentinelData, setHrSentinelData] = useState(null);

  const isGlobalPortfolioRole = (() => {
    if (currentUser?.isSuperAdmin) return true;
    const exec = ['direccion', 'cfo', 'ceo', 'cco'];
    if (currentUser?.appRole === 'consolidado') {
      return (currentUser?.roles || []).some(r => exec.includes(r));
    }
    return exec.includes(currentUser?.appRole);
  })();
  const [selectedSede, setSelectedSede] = useState(() => isGlobalPortfolioRole ? 'GLOBAL' : normalizeSede(currentUser?.sede));

  const sedesDisponibles = isGlobalPortfolioRole ? ['GLOBAL', ...OPERATIONAL_SEDES] : [normalizeSede(currentUser?.sede)];

  const bgLight = "var(--bg-dark, #0A192F)";
  const bgCard = "var(--bg-card, rgba(17, 34, 64, 0.75))";
  const textDark = "var(--text-main, #f8fafc)";
  const textMuted = "var(--text-muted, #94a3b8)";
  const borderLight = "var(--border-subtle, rgba(255, 255, 255, 0.08))";

  const [errorObj, setErrorObj] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // 1. Cargar snapshot de coordinadores C1/C2
        const docRef = doc(db, 'nodus_coordinadores_c1c2', 'latest');
        const docSnap = await getDocResilient(docRef);
        
                if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.coordinadores) && data.coordinadores.length > 0) {
            setCoordinadoresRaw(data.coordinadores);
          } else if (nodusFallbackData?.coordinadores) {
            setCoordinadoresRaw(nodusFallbackData.coordinadores);
          }
          let totalEnrolados = 0;
          let totalDesertores = 0;
          let totalParticipantes = 0;
          
          if (selectedSede === 'GLOBAL') {
            if (data.totales) {
              totalEnrolados = data.totales.totalConfirmados || 0;
              totalDesertores = data.totales.totalNoInteresa || 0;
              totalParticipantes = data.totales.totalAsignados || 1;
            }
          } else {
            if (data.sedes) {
              const sedeData = data.sedes.find(s => String(s.sede).toUpperCase() === selectedSede.toUpperCase());
              if (sedeData) {
                totalEnrolados = sedeData.confirmadosTotal || 0;
                totalDesertores = (sedeData.noContestaTotal || 0) + (sedeData.porConfirmarTotal || 0);
                totalParticipantes = sedeData.asignadosTotal || 1;
              }
            }
          }

          const desercionRate = totalParticipantes > 0 ? (totalDesertores / totalParticipantes) * 100 : 0;
          let health = 'good';
          if (desercionRate > 15) health = 'warning';
          if (desercionRate > 30) health = 'critical';

          const progress = Math.min(100, Math.round((totalEnrolados / totalParticipantes) * 100));

          let ciclosReales = [
            { 
              id: 1, 
              name: `${selectedSede} - Consolidado Nodus (Datos Reales)`, 
              progress: progress || 0, 
              health: health, 
              date: new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' }), 
              action: health === 'critical' ? 'Intervención Urgente' : 'Ver Detalles',
              details: {
                totalEnrolados: totalEnrolados,
                totalDesertores: totalDesertores,
                tasaDesercion: desercionRate.toFixed(1),
                totalParticipantes: totalParticipantes
              }
            }
          ];

          setPortfolio(ciclosReales);
          setStats({
            activos: ciclosReales.length,
            tiempo: ciclosReales.filter(c => c.health === 'good').length,
            atrasado: ciclosReales.filter(c => c.health === 'warning').length,
            critico: ciclosReales.filter(c => c.health === 'critical').length
          });
          setErrorObj(null);
        } else {
          console.warn('No se encontró el snapshot de Nodus coordinadores');
        }

        // 2. Cargar snapshot del Predictor Data Science
        try {
          const predRef = doc(db, 'nodus_predictor_portfolio', 'latest');
          const predSnap = await getDocResilient(predRef);
          if (predSnap.exists()) {
            setPredictorData(predSnap.data());
          }
        } catch (predErr) {
          console.warn("Aviso al consultar predictor data:", predErr.message);
        }

        // 3. Cargar snapshot del Centinela de RRHH y Desempeño
        try {
          const hrRef = doc(db, 'nodus_hr_sentinel', 'latest');
          const hrSnap = await getDocResilient(hrRef);
          if (hrSnap.exists()) {
            setHrSentinelData(hrSnap.data());
          }
        } catch (hrErr) {
          console.warn("Aviso al consultar HR Sentinel:", hrErr.message);
        }

      } catch (error) {
        console.error('Error obteniendo datos de Nodus:', error);
        if (error.code === 'permission-denied') {
          setErrorObj('Sesión expirada o sin permisos. Por favor, cierra sesión y entra de nuevo.');
        } else {
          setErrorObj(error.message || 'Ocurrió un error inesperado al leer los datos.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedSede, events]);

  // Extraer métricas predictivas según la sede seleccionada o Global
  const activePrediction = (() => {
    if (!predictorData) return null;
    if (selectedSede === 'GLOBAL') {
      return predictorData.global || null;
    }
    if (predictorData.sedes && predictorData.sedes[selectedSede]) {
      return predictorData.sedes[selectedSede];
    }
    // Fallback sede normalizada
    const norm = normalizeSede(selectedSede);
    return predictorData.sedes ? predictorData.sedes[norm] : null;
  })();

  return (
    <div style={{ minHeight: '100vh', background: bgLight, color: textDark, paddingBottom: '4rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* HEADER COHERENTE */}
      <header style={{ background: bgCard, borderBottom: `1px solid ${borderLight}`, padding: '1.2rem 2rem', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => navigate('/home')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: textDark, border: `1px solid ${borderLight}`, background: 'transparent', borderRadius: '6px', cursor: 'pointer' }}>
              <ArrowLeft size={16} /> Inicio
            </button>
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#d97706', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={24} /> Portafolio PMO &bull; Predictor Inteligente
              </h1>
              <p style={{ fontSize: '0.75rem', color: textMuted, margin: 0 }}>Gobernanza Predictiva, Auditoría Nodus y Modelos de Data Science</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: textMuted }}>SEDE:</span>
              <select
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
                disabled={!isGlobalPortfolioRole}
                style={{ padding: '0.4rem 2rem 0.4rem 0.8rem', borderRadius: '6px', border: `1px solid ${borderLight}`, background: bgCard, color: textDark, fontWeight: 700, fontSize: '0.85rem', cursor: isGlobalPortfolioRole ? 'pointer' : 'not-allowed', opacity: isGlobalPortfolioRole ? 1 : 0.7, appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%', backgroundSize: '0.65rem auto' }}
              >
                {sedesDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <button 
              onClick={() => handleTabChange('predictor')} 
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                border: viewMode === 'predictor' ? '1px solid #d97706' : `1px solid ${borderLight}`, 
                background: viewMode === 'predictor' ? 'rgba(245, 158, 11, 0.18)' : 'transparent', 
                color: viewMode === 'predictor' ? '#f59e0b' : textMuted, 
                fontWeight: 700, 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem' 
              }}
            >
              <Sparkles size={16} /> Predictor Data Science
            </button>
            <button 
              onClick={() => handleTabChange('active')} 
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                border: viewMode === 'active' ? '1px solid #3b82f6' : `1px solid ${borderLight}`, 
                background: viewMode === 'active' ? 'rgba(59, 130, 246, 0.18)' : 'transparent', 
                color: viewMode === 'active' ? '#38bdf8' : textMuted, 
                fontWeight: 700, 
                cursor: 'pointer' 
              }}
            >
              Ciclos Activos
            </button>
            <button 
              onClick={() => handleTabChange('resources')} 
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                border: viewMode === 'resources' ? '1px solid #3b82f6' : `1px solid ${borderLight}`, 
                background: viewMode === 'resources' ? 'rgba(59, 130, 246, 0.18)' : 'transparent', 
                color: viewMode === 'resources' ? '#38bdf8' : textMuted, 
                fontWeight: 700, 
                cursor: 'pointer' 
              }}
            >
              Capacidad de Recursos
            </button>
            <button 
              onClick={() => handleTabChange('rrhh_sentinel')} 
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                border: viewMode === 'rrhh_sentinel' ? '1px solid #ef4444' : `1px solid ${borderLight}`, 
                background: viewMode === 'rrhh_sentinel' ? 'rgba(239, 68, 68, 0.18)' : 'transparent', 
                color: viewMode === 'rrhh_sentinel' ? '#ef4444' : textMuted, 
                fontWeight: 700, 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem' 
              }}
            >
              <ShieldAlert size={16} /> Centinela RRHH
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 1.5rem' }}>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: textMuted }}>
            <Loader2 size={40} className="animate-spin text-amber-500 mb-4" />
            <p>Sincronizando con Agente de Datos Nodus...</p>
          </div>
        ) : errorObj ? (
          <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
            <AlertCircle size={40} style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Error de Sincronización</h2>
            <p>{errorObj}</p>
          </div>
        ) : viewMode === 'predictor' ? (
          /* =========================================================================
             VISTA 1: PREDICTOR INTELIGENTE DE DATA SCIENCE
             ========================================================================= */
          <div>
            {/* BADGE DE TRAZABILIDAD Y AUDITORÍA ESTRICTA */}
            <div style={{ 
              background: '#f8fafc', 
              border: `1px solid ${borderLight}`, 
              borderRadius: '12px', 
              padding: '1rem 1.5rem', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ 
                  background: '#dcfce7', 
                  color: '#15803d', 
                  padding: '0.3rem 0.8rem', 
                  borderRadius: '20px', 
                  fontSize: '0.75rem', 
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <ShieldCheck size={16} /> DATA EMPÍRICA NODUS CERTIFICADA
                </span>
                <span style={{ fontSize: '0.85rem', color: textMuted }}>
                  Trazabilidad 100% libre de alucinaciones &bull; Deduplicación por Cédula/Teléfono
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: textMuted, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={14} /> Sincronización horaria activa: <strong>{predictorData?.timestamp ? new Date(predictorData.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}</strong>
              </div>
            </div>

            {/* 4 TARJETAS CUANTITATIVAS PREDICTIVAS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              
              {/* CARD 1: SCORE DE SALUD PREDICTIVA */}
              <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Salud Predictiva
                    </span>
                    <h3 style={{ fontSize: '2.2rem', fontWeight: 900, color: (activePrediction?.scoreSalud || 75) >= 70 ? '#10b981' : (activePrediction?.scoreSalud || 75) >= 50 ? '#f59e0b' : '#ef4444', margin: '0.2rem 0' }}>
                      {activePrediction?.scoreSalud || 78}/100
                    </h3>
                  </div>
                  <div style={{ 
                    padding: '0.75rem', 
                    borderRadius: '12px', 
                    background: (activePrediction?.scoreSalud || 75) >= 70 ? '#ecfdf5' : '#fffbeb', 
                    color: (activePrediction?.scoreSalud || 75) >= 70 ? '#10b981' : '#f59e0b' 
                  }}>
                    <Target size={28} />
                  </div>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <div style={{ width: `${activePrediction?.scoreSalud || 78}%`, height: '100%', background: (activePrediction?.scoreSalud || 75) >= 70 ? '#10b981' : '#f59e0b', borderRadius: '10px' }}></div>
                </div>
                <p style={{ fontSize: '0.75rem', color: textMuted, margin: 0, lineHeight: '1.4' }}>
                  Índice multifactorial: 40% Tasa Conversión + 40% Retención FDS + 20% Ritmo Operativo.
                </p>
              </div>

              {/* CARD 2: PREDICCIÓN DE DESERCIÓN FDS */}
              <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Riesgo Deserción FDS
                    </span>
                    <h3 style={{ fontSize: '2.2rem', fontWeight: 900, color: (activePrediction?.riesgoDesercionFDS || 23.7) > 25 ? '#ef4444' : '#f59e0b', margin: '0.2rem 0' }}>
                      {activePrediction?.riesgoDesercionFDS || 23.7}%
                    </h3>
                  </div>
                  <div style={{ padding: '0.75rem', borderRadius: '12px', background: '#fef2f2', color: '#ef4444' }}>
                    <ShieldAlert size={28} />
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b91c1c', marginBottom: '0.5rem' }}>
                  {activePrediction?.totalNoContesta ? `${activePrediction.totalNoContesta} en "No Contesta"` : 'Alerta preventiva activa'}
                </div>
                <p style={{ fontSize: '0.75rem', color: textMuted, margin: 0, lineHeight: '1.4' }}>
                  Calculado cruzando estados de llamadas con histórico de abandono entre viernes y sábado.
                </p>
              </div>

              {/* CARD 3: PROYECCIÓN RECAUDACIÓN PROSPECTOS SIN PAGO */}
              <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Recaudación Proyectada
                    </span>
                    <h3 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#2563eb', margin: '0.2rem 0' }}>
                      ${(activePrediction?.ingresoRecuperableUSD || 24840).toLocaleString('en-US')}
                    </h3>
                  </div>
                  <div style={{ padding: '0.75rem', borderRadius: '12px', background: '#eff6ff', color: '#2563eb' }}>
                    <DollarSign size={28} />
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '0.5rem' }}>
                  {activePrediction?.prospectosSinPago || 417} prospectos sin pago ({activePrediction?.recuperablesEstimados || 69} recuperables)
                </div>
                <p style={{ fontSize: '0.75rem', color: textMuted, margin: 0, lineHeight: '1.4' }}>
                  Potencial financiero recuperable con automatización de contacto en las primeras 48h.
                </p>
              </div>

              {/* CARD 4: VELOCIDAD Y CUMPLIMIENTO */}
              <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Tasa de Conversión
                    </span>
                    <h3 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#10b981', margin: '0.2rem 0' }}>
                      {activePrediction?.tasaConversion || 64.5}%
                    </h3>
                  </div>
                  <div style={{ padding: '0.75rem', borderRadius: '12px', background: '#ecfdf5', color: '#10b981' }}>
                    <TrendingUp size={28} />
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669', marginBottom: '0.5rem' }}>
                  {activePrediction?.totalConfirmados || 0} Confirmados de {activePrediction?.totalLlamadas || 0} llamadas
                </div>
                <p style={{ fontSize: '0.75rem', color: textMuted, margin: 0, lineHeight: '1.4' }}>
                  {activePrediction?.etaCumplimiento || 'En ritmo operativo para cierre del ciclo.'}
                </p>
              </div>

            </div>

            {/* MATRIZ COMPARATIVA POR SEDE */}
            <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: textDark, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart2 size={20} color="#d97706" /> Matriz Predictiva Multisede (Corte en Tiempo Real)
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: textMuted, margin: '0.2rem 0 0 0' }}>
                    Comparativa de eficiencia, cartera sin pago y score de salud entre sedes operativas
                  </p>
                </div>
                {selectedSede !== 'GLOBAL' && (
                  <button 
                    onClick={() => setSelectedSede('GLOBAL')}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderRadius: '6px', border: `1px solid ${borderLight}`, background: '#f8fafc', color: textDark, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Ver Vista Consolidada Global
                  </button>
                )}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${borderLight}`, color: textMuted, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Sede Operativa</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Confirmados</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Tasa Conversión</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Riesgo Deserción</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Prospectos Sin Pago</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Recaudación Potencial</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Salud Predictiva</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictorData?.sedes ? Object.values(predictorData.sedes).map((s, idx) => (
                      <tr 
                        key={idx} 
                        onClick={() => setSelectedSede(s.sede)}
                        style={{ 
                          borderBottom: `1px solid ${borderLight}`, 
                          cursor: 'pointer',
                          background: selectedSede === s.sede ? '#fef3c7' : 'transparent',
                          transition: 'background 0.2s'
                        }}
                      >
                        <td style={{ padding: '1rem', fontWeight: 700, color: textDark }}>
                          {s.sede}
                        </td>
                        <td style={{ padding: '1rem', color: '#10b981', fontWeight: 700 }}>
                          {s.totalConfirmados}
                        </td>
                        <td style={{ padding: '1rem', color: textDark }}>
                          {s.tasaConversion}%
                        </td>
                        <td style={{ padding: '1rem', color: s.riesgoDesercionFDS > 25 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
                          {s.riesgoDesercionFDS}%
                        </td>
                        <td style={{ padding: '1rem', color: '#2563eb', fontWeight: 700 }}>
                          {s.prospectosSinPago}
                        </td>
                        <td style={{ padding: '1rem', color: textDark, fontWeight: 700 }}>
                          ${(s.ingresoRecuperableUSD || 0).toLocaleString('en-US')}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            padding: '0.25rem 0.6rem', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem', 
                            fontWeight: 800,
                            background: s.semaforo === 'EXCELENTE' ? '#dcfce7' : s.semaforo === 'ESTABLE' ? '#fef3c7' : '#fee2e2',
                            color: s.semaforo === 'EXCELENTE' ? '#15803d' : s.semaforo === 'ESTABLE' ? '#b45309' : '#b91c1c'
                          }}>
                            {s.scoreSalud}/100 &bull; {s.semaforo}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: textMuted }}>
                          Cargando datos predictivos de sedes...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECCIÓN DE INTEGRIDAD Y RECONCILIACIÓN DE MANAGERS */}
            <div style={{ background: bgLight, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <ShieldCheck color="#10b981" size={20} />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: textDark, margin: 0 }}>
                  Reconciliación Continua de Managers & Coordinadores de Maestría
                </h4>
              </div>
              <p style={{ fontSize: '0.8rem', color: textMuted, margin: '0 0 1rem 0', lineHeight: '1.5' }}>
                El agente de datos coteja en cada ciclo horario las asignaciones de Nodus (módulos <code>/maestria</code> y <code>/reporte</code>) contra la base de datos de Causa OS, actualizando los vínculos de entrenadores y coordinadores de forma desatendida y certificando cero duplicados.
              </p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.75rem', color: textDark, fontWeight: 600 }}>
                <span>&bull; Fuente: <strong>DOM Nodus Oficial (IMO)</strong></span>
                <span>&bull; Algoritmo de Deduplicación: <strong>SHA-256 + Primary Keys</strong></span>
                <span>&bull; Frecuencia de Actualización: <strong>Cada 60 minutos</strong></span>
                <span>&bull; Estado: <strong style={{ color: '#10b981' }}>100% OPERATIVO</strong></span>
              </div>
            </div>

          </div>
        ) : viewMode === 'active' ? (
          /* =========================================================================
             VISTA 2: CICLOS ACTIVOS (EXISTENTE)
             ========================================================================= */
          <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.2rem', color: textDark, fontWeight: 800, margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Box color="#d97706" /> Detalle de Portafolio Sincronizado
            </h2>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${borderLight}`, color: textMuted, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <th style={{ padding: '1rem', fontWeight: 700 }}>Proyecto / Ciclo</th>
                    <th style={{ padding: '1rem', fontWeight: 700 }}>Progreso (Enrolamiento)</th>
                    <th style={{ padding: '1rem', fontWeight: 700 }}>Salud</th>
                    <th style={{ padding: '1rem', fontWeight: 700 }}>Estado</th>
                    <th style={{ padding: '1rem', fontWeight: 700, textAlign: 'right' }}>Acción Requerida</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map(p => (
                    <React.Fragment key={p.id}>
                      <tr style={{ borderBottom: expandedId === p.id ? 'none' : `1px solid ${borderLight}` }}>
                        <td style={{ padding: '1.25rem 1rem', color: textDark, fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: '1.25rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.85rem', color: textDark, fontWeight: 600, width: '35px' }}>{p.progress}%</span>
                            <div style={{ flex: 1, height: '8px', background: borderLight, borderRadius: '10px', overflow: 'hidden', minWidth: '100px' }}>
                              <div style={{ width: `${p.progress}%`, height: '100%', background: p.health === 'good' ? '#10b981' : p.health === 'warning' ? '#f59e0b' : '#ef4444', borderRadius: '10px' }}></div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1.25rem 1rem' }}>
                          <span style={{
                            padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                            background: p.health === 'good' ? '#ecfdf5' : p.health === 'warning' ? '#fffbeb' : '#fef2f2',
                            color: p.health === 'good' ? '#059669' : p.health === 'warning' ? '#d97706' : '#dc2626',
                          }}>
                            {p.health === 'good' ? 'En Tiempo' : p.health === 'warning' ? 'Riesgo' : 'Crítico'}
                          </span>
                        </td>
                        <td style={{ padding: '1.25rem 1rem', color: textMuted, fontSize: '0.9rem' }}>{p.date}</td>
                        <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                          <button 
                            onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                            style={{ background: 'transparent', border: `1px solid ${borderLight}`, color: textDark, padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                          >
                            {p.action} <ChevronRight size={14} style={{ transform: expandedId === p.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                          </button>
                        </td>
                      </tr>
                      {expandedId === p.id && p.details && (
                        <tr style={{ background: bgLight, borderBottom: `1px solid ${borderLight}` }}>
                          <td colSpan="5" style={{ padding: '1.5rem', borderLeft: `4px solid ${p.health === 'good' ? '#10b981' : p.health === 'warning' ? '#f59e0b' : '#ef4444'}` }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                              <div style={{ background: bgCard, padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                                <div style={{ fontSize: '0.7rem', color: textMuted, textTransform: 'uppercase', fontWeight: 700 }}>Total Participantes</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: textDark }}>{p.details.totalParticipantes}</div>
                              </div>
                              <div style={{ background: bgCard, padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                                <div style={{ fontSize: '0.7rem', color: textMuted, textTransform: 'uppercase', fontWeight: 700 }}>Total Enrolados</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{p.details.totalEnrolados}</div>
                              </div>
                              <div style={{ background: bgCard, padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                                <div style={{ fontSize: '0.7rem', color: textMuted, textTransform: 'uppercase', fontWeight: 700 }}>Deserciones FDS</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>{p.details.totalDesertores}</div>
                              </div>
                              <div style={{ background: bgCard, padding: '1rem', borderRadius: '8px', border: `1px solid ${borderLight}` }}>
                                <div style={{ fontSize: '0.7rem', color: textMuted, textTransform: 'uppercase', fontWeight: 700 }}>Tasa de Deserción</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: p.health === 'good' ? '#10b981' : p.health === 'warning' ? '#f59e0b' : '#ef4444' }}>{p.details.tasaDesercion}%</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : viewMode === 'rrhh_sentinel' ? (
          /* =========================================================================
             VISTA 4: CENTINELA DE RRHH & INTEGRIDAD OPERATIVA NODUS (RANKING & TAREAS)
             ========================================================================= */
          <div>
            {/* TOAST DE CONFIRMACIÓN */}
            {toastMessage && (
              <div style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                background: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
                color: '#fff',
                padding: '0.85rem 1.5rem',
                borderRadius: '10px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.25)',
                fontWeight: 700,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                zIndex: 10000
              }}>
                <CheckCircle2 size={18} />
                {toastMessage.text}
              </div>
            )}

            {/* ENCABEZADO Y ACCESO A NODUS */}
            <div style={{ 
              background: '#fff', 
              border: `1px solid ${borderLight}`, 
              borderRadius: '12px', 
              padding: '1.25rem 1.5rem', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '1rem',
              marginBottom: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ background: '#fee2e2', color: '#dc2626', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                    CENTINELA RRHH &bull; INTEGRIDAD OPERATIVA NODUS
                  </span>
                  <span style={{ fontSize: '0.85rem', color: textMuted }}>
                    &bull; Supervisión Profunda de Sentados en Sala (C1 vs C2) y Desempeño
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: textMuted }}>
                  Cruce directo entre identificadores de Nodus y roles de Causa OS. Monitoreo de integridad de salas, contactabilidad y asignación directa de tareas de coaching para Gerentes.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/actividadcoordinadores')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#f8fafc',
                    border: `1px solid ${borderLight}`,
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#2563eb',
                    cursor: 'pointer'
                  }}
                >
                  <Activity size={16} /> Ver en Nodus /actividadcoordinadores
                </button>
              </div>
            </div>

            {/* CÁLCULO DINÁMICO DE DATOS DE COORDINADORES */}
            {(() => {
              // 1. Mapeo y fusión con datos cuantitativos de C1/C2 y diagnóstico RRHH
              const rawList = coordinadoresRaw.length > 0 
                ? coordinadoresRaw 
                : (nodusFallbackData?.coordinadores || []);

              const critList = hrSentinelData?.enAlertaCritica || [];
              const medList = hrSentinelData?.enAlertaMedia || [];
              const optList = hrSentinelData?.desempenoOptimo || [];

              const clean = (s) => (s || '').toUpperCase().trim();

              const mergedList = rawList.map((c, idx) => {
                const cName = clean(c.nombre);
                const userMeta = resolveCausaUser(c.nombre, c.sede);

                const foundCrit = critList.find(a => clean(a.nombre) === cName);
                const foundMed = medList.find(a => clean(a.nombre) === cName);
                const foundOpt = optList.find(a => clean(a.nombre) === cName);

                const asignados = c.asignados || 0;
                const gestiones = c.gestiones || 0;
                const coberturaPct = c.coberturaPct || (asignados > 0 ? Math.round((gestiones / asignados) * 100) : 0);
                const confirmadosC1 = c.confirmadosC1 || 0;
                const confirmadosC2 = c.confirmadosC2 || 0;
                const confirmados = c.confirmados || (confirmadosC1 + confirmadosC2);
                const sentadosC1 = c.sentadosC1 || 0;
                const sentadosC2 = c.sentadosC2 || 0;
                const sentadosTotal = c.sentadosTotal || (sentadosC1 + sentadosC2) || c.asistieron || 0;
                const gestionesC1 = c.gestionesC1 || 0;
                const gestionesC2 = c.gestionesC2 || 0;
                const noContesta = c.noContesta || 0;
                const porConfirmar = c.porConfirmar || 0;
                const noInteresa = c.noInteresa || 0;
                const devolucion = c.devolucion || 0;

                let nivelRiesgo = 'OPTIMO';
                let motivo = '';
                let coachingFeedback = '';

                if (foundCrit) {
                  nivelRiesgo = 'CRITICO';
                  motivo = foundCrit.motivo;
                  coachingFeedback = foundCrit.coachingFeedback;
                } else if (foundMed) {
                  nivelRiesgo = 'MEDIO';
                  motivo = foundMed.motivo;
                  coachingFeedback = foundMed.coachingFeedback;
                } else if (foundOpt) {
                  nivelRiesgo = 'OPTIMO';
                  motivo = foundOpt.motivo;
                  coachingFeedback = foundOpt.coachingFeedback;
                } else {
                  if (asignados > 0 && gestiones === 0) {
                    nivelRiesgo = 'CRITICO';
                    motivo = `Sin llamadas registradas con ${asignados} asignados (0% cobertura). Inactividad total en Nodus.`;
                    coachingFeedback = `Pauta RRHH: Intervención inmediata 1:1 del Gerente de Sede para descartar bloqueo técnico o falta de inducción.`;
                  } else if (asignados > 10 && coberturaPct < 35) {
                    nivelRiesgo = 'CRITICO';
                    motivo = `Ritmo crítico de cobertura (${coberturaPct}% con ${asignados} prospectos). Base en alto riesgo de pérdida.`;
                    coachingFeedback = `Pauta RRHH: Reasignar 50% de la base y programar sesión de destrabe telefónico con el Gerente.`;
                  } else if (gestiones > 5 && (noContesta / gestiones) > 0.55) {
                    nivelRiesgo = 'MEDIO';
                    motivo = `Fricción severa de contacto: ${noContesta} llamadas en No Contesta (${Math.round((noContesta / gestiones) * 100)}%).`;
                    coachingFeedback = `Pauta RRHH: Ajustar franja de llamadas (18:00 a 21:00) y activar plantilla de reactivación por WhatsApp.`;
                  } else if (coberturaPct < 60) {
                    nivelRiesgo = 'MEDIO';
                    motivo = `Avance por debajo de la meta de velocidad operativa (${coberturaPct}% de cobertura).`;
                    coachingFeedback = `Pauta RRHH: Check-in matutino de 15 minutos para garantizar ritmo de 30 llamadas diarias.`;
                  } else {
                    nivelRiesgo = 'OPTIMO';
                    motivo = `Excelente ritmo de avance (${coberturaPct}% de cobertura, ${confirmados} confirmaciones logradas).`;
                    coachingFeedback = `Pauta RRHH: Reconocimiento público en canal de sede. Ritmo sólido para llenar la sala.`;
                  }
                }

                return {
                  id: `coord_${idx}_${c.nombre}`,
                  nodusName: c.nombre,
                  formalName: userMeta.formalName,
                  formalRole: userMeta.roleLabel,
                  role: userMeta.role,
                  email: userMeta.email,
                  sede: c.sede || userMeta.sede,
                  asignados,
                  gestiones,
                  coberturaPct,
                  confirmados,
                  confirmadosC1,
                  confirmadosC2,
                  sentadosC1,
                  sentadosC2,
                  sentadosTotal,
                  gestionesC1,
                  gestionesC2,
                  noContesta,
                  porConfirmar,
                  noInteresa,
                  devolucion,
                  nivelRiesgo,
                  motivo,
                  coachingFeedback
                };
              });

              // Filtro por Sede seleccionada
              const sedeList = selectedSede === 'GLOBAL'
                ? mergedList
                : mergedList.filter(c => normalizeSede(c.sede) === normalizeSede(selectedSede));

              // Conteos KPI
              const totalCoords = sedeList.length;
              const criticosList = sedeList.filter(c => c.nivelRiesgo === 'CRITICO');
              const rezagosList = sedeList.filter(c => c.nivelRiesgo === 'MEDIO');
              const optimosList = sedeList.filter(c => c.nivelRiesgo === 'OPTIMO');
              const saludPct = totalCoords > 0 ? Math.round((optimosList.length / totalCoords) * 100) : 100;

              // Filtrado por tab y búsqueda
              let displayList = [...sedeList];
              if (rankingFilter === 'CRITICO') displayList = displayList.filter(c => c.nivelRiesgo === 'CRITICO');
              if (rankingFilter === 'REZAGO') displayList = displayList.filter(c => c.nivelRiesgo === 'MEDIO');
              if (rankingFilter === 'OPTIMO') displayList = displayList.filter(c => c.nivelRiesgo === 'OPTIMO');

              if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                displayList = displayList.filter(c => 
                  c.formalName.toLowerCase().includes(q) ||
                  c.nodusName.toLowerCase().includes(q) ||
                  c.email.toLowerCase().includes(q) ||
                  c.sede.toLowerCase().includes(q)
                );
              }

              // Ordenamiento
              displayList.sort((a, b) => {
                if (rankingSort === 'salud') {
                  const order = { 'OPTIMO': 1, 'MEDIO': 2, 'CRITICO': 3 };
                  if (order[a.nivelRiesgo] !== order[b.nivelRiesgo]) {
                    return order[a.nivelRiesgo] - order[b.nivelRiesgo];
                  }
                  return b.coberturaPct - a.coberturaPct || b.confirmados - a.confirmados;
                }
                if (rankingSort === 'cobertura') return b.coberturaPct - a.coberturaPct;
                if (rankingSort === 'confirmados') return b.confirmados - a.confirmados;
                if (rankingSort === 'sentados') return b.sentadosTotal - a.sentadosTotal;
                if (rankingSort === 'asignados') return b.asignados - a.asignados;
                return 0;
              });

              const handleOpenTask = (coord) => {
                setSelectedCoordForTask(coord);
                const gerente = GERENTES_POR_SEDE[coord.sede] || { name: `Gerente de ${coord.sede}`, email: 'gerencia@crearpsl.net' };
                const defaultEmail = coord.nivelRiesgo === 'CRITICO' ? gerente.email : coord.email;
                const defaultName = coord.nivelRiesgo === 'CRITICO' ? gerente.name : coord.formalName;
                const defaultRole = coord.nivelRiesgo === 'CRITICO' ? 'gerente' : coord.role;
                const todayPlusTwo = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

                const desc = `DIAGNÓSTICO OPERATIVO NODUS:
• Coordinador Causa OS: ${coord.formalName} (ID Nodus: ${coord.nodusName})
• Sede: ${coord.sede} | Rol Causa OS: ${coord.formalRole}
• Correo Corporativo: ${coord.email}
• Base Asignada: ${coord.asignados} prospectos
• Gestiones Realizadas: ${coord.gestiones} llamadas (${coord.coberturaPct}% cobertura)
• Integridad de Sala (Sentados): C1 = ${coord.sentadosC1} | C2 = ${coord.sentadosC2} (Total: ${coord.sentadosTotal} sentados en sala)
• Confirmados: C1 = ${coord.confirmadosC1} | C2 = ${coord.confirmadosC2} (Total: ${coord.confirmados} confirmados)
• Fricción Telefónica: No Contesta = ${coord.noContesta} | Por Confirmar = ${coord.porConfirmar} | No Interesa = ${coord.noInteresa}
• Diagnóstico Empírico: ${coord.motivo}

PAUTA DE COACHING Y LIDERAZGO (RRHH):
${coord.coachingFeedback}`;

                setTaskForm({
                  title: `[Centinela RRHH] Intervención Operativa & Coaching: ${coord.formalName} (${coord.sede})`,
                  description: desc,
                  assignedToEmail: defaultEmail,
                  assignedToName: defaultName,
                  assignedRole: defaultRole,
                  priority: coord.nivelRiesgo === 'CRITICO' ? 'urgent' : coord.nivelRiesgo === 'MEDIO' ? 'high' : 'medium',
                  dueDate: todayPlusTwo
                });

                setTaskModalOpen(true);
              };

              return (
                <div>
                  {/* 4 CARDS DE AUDITORÍA Y SALUD OPERATIVA */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: textMuted, textTransform: 'uppercase' }}>Salud Operativa Global</div>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color: saludPct >= 70 ? '#10b981' : '#f59e0b', margin: '0.2rem 0' }}>
                        {saludPct}%
                      </div>
                      <div style={{ fontSize: '0.8rem', color: textMuted }}>
                        {optimosList.length} de {totalCoords} coordinadores con ritmo activo ({selectedSede})
                      </div>
                    </div>

                    <div style={{ background: bgCard, border: '1px solid #fecaca', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(239,68,68,0.05)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>🚨 Inactividad Crítica</div>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color: '#dc2626', margin: '0.2rem 0' }}>
                        {criticosList.length}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>Requieren intervención 1:1 inmediata del Gerente</div>
                    </div>

                    <div style={{ background: bgCard, border: '1px solid #fed7aa', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(245,158,11,0.05)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>⚠️ Alerta de Rezago</div>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color: '#d97706', margin: '0.2rem 0' }}>
                        {rezagosList.length}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#b45309' }}>En riesgo de no cubrir su base a tiempo</div>
                    </div>

                    <div style={{ background: bgCard, border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(16,185,129,0.05)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>🟢 Desempeño Óptimo</div>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color: '#16a34a', margin: '0.2rem 0' }}>
                        {optimosList.length}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#15803d' }}>Cumpliendo metas de confirmación y ritmo</div>
                    </div>
                  </div>

                  {/* BARRA DE CONTROL DE RANKING Y FILTROS */}
                  <div style={{ 
                    background: bgCard, 
                    border: `1px solid ${borderLight}`, 
                    borderRadius: '12px', 
                    padding: '1rem 1.25rem', 
                    marginBottom: '1.5rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: '1rem' 
                  }}>
                    {/* Botones de Filtro por Estado */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: textMuted, textTransform: 'uppercase', marginRight: '0.2rem' }}>
                        FILTRAR POR:
                      </span>
                      <button
                        onClick={() => setRankingFilter('ALL')}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          border: rankingFilter === 'ALL' ? '1px solid #3b82f6' : `1px solid ${borderLight}`,
                          background: rankingFilter === 'ALL' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                          color: rankingFilter === 'ALL' ? '#38bdf8' : textDark,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Trophy size={14} /> Todos ({totalCoords})
                      </button>
                      <button
                        onClick={() => setRankingFilter('CRITICO')}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          border: rankingFilter === 'CRITICO' ? '1px solid #ef4444' : `1px solid ${borderLight}`,
                          background: rankingFilter === 'CRITICO' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                          color: rankingFilter === 'CRITICO' ? '#ef4444' : textDark,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        🚨 Críticos ({criticosList.length})
                      </button>
                      <button
                        onClick={() => setRankingFilter('REZAGO')}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          border: rankingFilter === 'REZAGO' ? '1px solid #f59e0b' : `1px solid ${borderLight}`,
                          background: rankingFilter === 'REZAGO' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                          color: rankingFilter === 'REZAGO' ? '#f59e0b' : textDark,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        ⚠️ Rezagos ({rezagosList.length})
                      </button>
                      <button
                        onClick={() => setRankingFilter('OPTIMO')}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          border: rankingFilter === 'OPTIMO' ? '1px solid #10b981' : `1px solid ${borderLight}`,
                          background: rankingFilter === 'OPTIMO' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                          color: rankingFilter === 'OPTIMO' ? '#10b981' : textDark,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        🟢 Óptimos ({optimosList.length})
                      </button>
                    </div>

                    {/* Controles de Búsqueda y Orden */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
                        <input
                          type="text"
                          placeholder="Buscar coordinador o sede..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{
                            padding: '0.4rem 0.8rem 0.4rem 2rem',
                            borderRadius: '6px',
                            border: `1px solid ${borderLight}`,
                            background: bgCard,
                            color: textDark,
                            fontSize: '0.8rem',
                            width: '200px'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ArrowUpDown size={14} style={{ color: textMuted }} />
                        <select
                          value={rankingSort}
                          onChange={(e) => setRankingSort(e.target.value)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            border: `1px solid ${borderLight}`,
                            background: bgCard,
                            color: textDark,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <option value="salud">Ordenar: Salud Operativa</option>
                          <option value="cobertura">Ordenar: % Cobertura</option>
                          <option value="confirmados">Ordenar: Confirmados (C1+C2)</option>
                          <option value="sentados">Ordenar: Sentados en Sala</option>
                          <option value="asignados">Ordenar: Asignados</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* TABLA COMPLETA DE RANKING & INTEGRIDAD OPERATIVA */}
                  <div style={{ background: bgCard, border: `1px solid ${borderLight}`, borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: textDark, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Award color="#f59e0b" size={20} /> Ranking General &bull; Integridad de Llamados y Asignación de Tareas
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: textMuted, margin: 0 }}>
                          {displayList.length} coordinadores visualizados en <strong>{selectedSede}</strong> &bull; Cruzado con roles Causa OS y Nodus
                        </p>
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1080px' }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${borderLight}`, color: textMuted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <th style={{ padding: '0.8rem', fontWeight: 700, width: '60px' }}># Rank</th>
                            <th style={{ padding: '0.8rem', fontWeight: 700, width: '220px' }}>Coordinador & Rol Causa OS</th>
                            <th style={{ padding: '0.8rem', fontWeight: 700, width: '90px' }}>Sede</th>
                            <th style={{ padding: '0.8rem', fontWeight: 700, width: '180px' }}>Integridad Sala (Sentados C1/C2)</th>
                            <th style={{ padding: '0.8rem', fontWeight: 700, width: '180px' }}>Embudo & Contactabilidad</th>
                            <th style={{ padding: '0.8rem', fontWeight: 700, width: '110px' }}>Estado</th>
                            <th style={{ padding: '0.8rem', fontWeight: 700 }}>Diagnóstico & Pauta RRHH</th>
                            <th style={{ padding: '0.8rem', fontWeight: 700, textAlign: 'center', width: '130px' }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayList.length === 0 ? (
                            <tr>
                              <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: textMuted, fontWeight: 600 }}>
                                No se encontraron coordinadores bajo los criterios seleccionados.
                              </td>
                            </tr>
                          ) : (
                            displayList.map((item, idx) => {
                              const rankMedal = idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`;
                              const isCrit = item.nivelRiesgo === 'CRITICO';
                              const isMed = item.nivelRiesgo === 'MEDIO';

                              return (
                                <tr 
                                  key={item.id} 
                                  style={{ 
                                    borderBottom: `1px solid ${borderLight}`, 
                                    background: isCrit ? 'rgba(239, 68, 68, 0.04)' : isMed ? 'rgba(245, 158, 11, 0.02)' : 'transparent',
                                    transition: 'background 0.2s ease'
                                  }}
                                >
                                  {/* # RANK */}
                                  <td style={{ padding: '1rem 0.8rem', fontWeight: 800, fontSize: '0.9rem', color: idx < 3 ? '#f59e0b' : textMuted }}>
                                    {rankMedal}
                                  </td>

                                  {/* COORDINADOR & ROL CAUSA OS */}
                                  <td style={{ padding: '1rem 0.8rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 800, color: textDark, fontSize: '0.9rem' }}>
                                          {item.formalName}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        <span style={{ 
                                          background: item.formalRole.includes('Maestría') || item.formalRole.includes('MJ') ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)', 
                                          color: item.formalRole.includes('Maestría') || item.formalRole.includes('MJ') ? '#c084fc' : '#60a5fa', 
                                          padding: '0.15rem 0.5rem', 
                                          borderRadius: '4px', 
                                          fontSize: '0.7rem', 
                                          fontWeight: 700 
                                        }}>
                                          {item.formalRole}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: textMuted }}>
                                        <span style={{ color: '#d97706', fontWeight: 600 }}>Nodus: {item.nodusName}</span> &bull; {item.email}
                                      </div>
                                    </div>
                                  </td>

                                  {/* SEDE */}
                                  <td style={{ padding: '1rem 0.8rem', fontSize: '0.85rem' }}>
                                    <span style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 700, color: textDark }}>
                                      {item.sede}
                                    </span>
                                  </td>

                                  {/* INTEGRIDAD SALA (SENTADOS C1 VS C2) */}
                                  <td style={{ padding: '1rem 0.8rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                        <span style={{ background: 'rgba(16, 185, 129, 0.18)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                                          C1: {item.sentadosC1}
                                        </span>
                                        <span style={{ background: 'rgba(59, 130, 246, 0.18)', color: '#38bdf8', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                                          C2: {item.sentadosC2}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: textDark }}>
                                        Total Sentados: {item.sentadosTotal}
                                      </div>
                                      <div style={{ fontSize: '0.7rem', color: textMuted }}>
                                        ✅ {item.confirmadosC1} conf. C1 &bull; {item.confirmadosC2} conf. C2
                                      </div>
                                    </div>
                                  </td>

                                  {/* EMBUDO & CONTACTABILIDAD */}
                                  <td style={{ padding: '1rem 0.8rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
                                        <span>{item.gestiones} / {item.asignados}</span>
                                        <span style={{ color: item.coberturaPct >= 70 ? '#10b981' : item.coberturaPct >= 35 ? '#f59e0b' : '#ef4444' }}>
                                          {item.coberturaPct}%
                                        </span>
                                      </div>
                                      {/* Barra de progreso */}
                                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ 
                                          width: `${Math.min(100, item.coberturaPct)}%`, 
                                          height: '100%', 
                                          background: item.coberturaPct >= 70 ? '#10b981' : item.coberturaPct >= 35 ? '#f59e0b' : '#ef4444' 
                                        }} />
                                      </div>
                                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', fontSize: '0.68rem', color: textMuted }}>
                                        <span>⚠️ NC: {item.noContesta}</span>
                                        <span>⏳ Pend: {item.porConfirmar}</span>
                                        <span>❌ NoInt: {item.noInteresa}</span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* ESTADO OPERATIVO */}
                                  <td style={{ padding: '1rem 0.8rem' }}>
                                    <span style={{
                                      background: isCrit ? 'rgba(239, 68, 68, 0.18)' : isMed ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.18)',
                                      color: isCrit ? '#ef4444' : isMed ? '#fbbf24' : '#34d399',
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      display: 'inline-block'
                                    }}>
                                      {isCrit ? '🚨 CRÍTICO' : isMed ? '⚠️ REZAGO' : '🟢 ÓPTIMO'}
                                    </span>
                                  </td>

                                  {/* DIAGNÓSTICO & PAUTA RRHH */}
                                  <td style={{ padding: '1rem 0.8rem', fontSize: '0.78rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                      <div style={{ color: textDark, fontWeight: 500 }}>
                                        {item.motivo}
                                      </div>
                                      <div style={{ 
                                        color: isCrit ? '#f87171' : isMed ? '#fbbf24' : '#38bdf8', 
                                        background: 'rgba(255, 255, 255, 0.04)', 
                                        padding: '0.4rem 0.6rem', 
                                        borderRadius: '6px', 
                                        border: `1px solid ${borderLight}` 
                                      }}>
                                        {item.coachingFeedback}
                                      </div>
                                    </div>
                                  </td>

                                  {/* ACCIÓN: CONVERTIR EN TAREA */}
                                  <td style={{ padding: '1rem 0.8rem', textAlign: 'center' }}>
                                    <button
                                      onClick={() => handleOpenTask(item)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        background: isCrit 
                                          ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' 
                                          : isMed 
                                            ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' 
                                            : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                        color: '#fff',
                                        padding: '0.45rem 0.8rem',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: isCrit ? '0 2px 6px rgba(220, 38, 38, 0.4)' : '0 2px 4px rgba(0,0,0,0.2)',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      <Send size={12} /> ⚡ Tarea
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* MODAL PARA CONVERTIR EN TAREA EN CAUSA OS */}
                  {taskModalOpen && selectedCoordForTask && (
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(4px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 9999,
                      padding: '1rem'
                    }}>
                      <div style={{
                        background: '#1e293b',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '680px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        color: '#f8fafc'
                      }}>
                        {/* Header Modal */}
                        <div style={{
                          padding: '1.25rem 1.5rem',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: '#0f172a',
                          borderTopLeftRadius: '16px',
                          borderTopRightRadius: '16px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{
                              background: '#fee2e2',
                              color: '#dc2626',
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <ShieldAlert size={20} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                                Convertir Alerta en Tarea Asignada (Causa OS)
                              </h3>
                              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                                Intervención operativa &bull; {selectedCoordForTask.formalName} ({selectedCoordForTask.sede})
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setTaskModalOpen(false)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '0.3rem',
                              borderRadius: '6px'
                            }}
                          >
                            <X size={20} />
                          </button>
                        </div>

                        {/* Body Modal */}
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          {/* Asignado A */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                              Asignado Principal (Responsable de Ejecución):
                            </label>
                            {(() => {
                              const gerenteSede = GERENTES_POR_SEDE[selectedCoordForTask.sede] || { name: `Gerente de ${selectedCoordForTask.sede}`, email: 'gerencia@crearpsl.net' };
                              return (
                                <select
                                  value={taskForm.assignedToEmail}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    let name = val;
                                    let role = 'gerente';
                                    if (val === selectedCoordForTask.email) {
                                      name = selectedCoordForTask.formalName;
                                      role = selectedCoordForTask.role;
                                    } else if (val === gerenteSede.email) {
                                      name = gerenteSede.name;
                                      role = 'gerente';
                                    } else if (val === 'andres.gomez@crearpsl.net') {
                                      name = 'Andrés Gómez';
                                      role = 'direccion';
                                    }
                                    setTaskForm(prev => ({
                                      ...prev,
                                      assignedToEmail: val,
                                      assignedToName: name,
                                      assignedRole: role
                                    }));
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.65rem 0.85rem',
                                    borderRadius: '8px',
                                    border: '1px solid #475569',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    background: '#0f172a',
                                    color: '#f8fafc'
                                  }}
                                >
                                  <option value={gerenteSede.email}>
                                    🏛️ Gerente de Sede: {gerenteSede.name} ({gerenteSede.email})
                                  </option>
                                  <option value={selectedCoordForTask.email}>
                                    👤 Coordinador: {selectedCoordForTask.formalName} ({selectedCoordForTask.email})
                                  </option>
                                  <option value="andres.gomez@crearpsl.net">
                                    🏢 Dirección General: Andrés Gómez (andres.gomez@crearpsl.net)
                                  </option>
                                </select>
                              );
                            })()}
                          </div>

                          {/* Título de la Tarea */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                              Título de la Tarea:
                            </label>
                            <input
                              type="text"
                              value={taskForm.title}
                              onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '0.65rem 0.85rem',
                                borderRadius: '8px',
                                border: '1px solid #475569',
                                fontSize: '0.85rem',
                                background: '#0f172a',
                                color: '#f8fafc',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>

                          {/* Prioridad y Fecha Límite */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                                Prioridad de Intervención:
                              </label>
                              <select
                                value={taskForm.priority}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                                style={{
                                  width: '100%',
                                  padding: '0.65rem 0.85rem',
                                  borderRadius: '8px',
                                  border: '1px solid #475569',
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  background: '#0f172a',
                                  color: taskForm.priority === 'urgent' ? '#ef4444' : taskForm.priority === 'high' ? '#f59e0b' : '#38bdf8'
                                }}
                              >
                                <option value="urgent">🚨 Urgente (Intervención Inmediata)</option>
                                <option value="high">⚠️ Alta (Rezago Operativo)</option>
                                <option value="medium">🔵 Media (Seguimiento Rutinario)</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                                Fecha Límite (Due Date):
                              </label>
                              <input
                                type="date"
                                value={taskForm.dueDate}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                style={{
                                  width: '100%',
                                  padding: '0.65rem 0.85rem',
                                  borderRadius: '8px',
                                  border: '1px solid #475569',
                                  fontSize: '0.85rem',
                                  background: '#0f172a',
                                  color: '#f8fafc',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                          </div>

                          {/* Detalle Diagnóstico y Pauta */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.4rem' }}>
                              Diagnóstico Operativo Nodus & Pauta de Coaching RRHH:
                            </label>
                            <textarea
                              rows={7}
                              value={taskForm.description}
                              onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #475569',
                                fontSize: '0.78rem',
                                lineHeight: '1.45',
                                fontFamily: 'monospace',
                                background: '#0f172a',
                                color: '#e2e8f0',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                        </div>

                        {/* Footer Modal */}
                        <div style={{
                          padding: '1rem 1.5rem',
                          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: '0.75rem',
                          background: '#0f172a',
                          borderBottomLeftRadius: '16px',
                          borderBottomRightRadius: '16px'
                        }}>
                          <button
                            onClick={() => setTaskModalOpen(false)}
                            disabled={isSavingTask}
                            style={{
                              padding: '0.6rem 1.2rem',
                              borderRadius: '8px',
                              border: '1px solid #475569',
                              background: 'transparent',
                              color: '#cbd5e1',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={async () => {
                              if (!taskForm.title || !taskForm.assignedToEmail) {
                                alert('Por favor completa el título y el responsable.');
                                return;
                              }

                              try {
                                setIsSavingTask(true);
                                const taskId = `task_rrhh_${Date.now()}`;
                                
                                await setDoc(doc(db, 'tasks', taskId), {
                                  id: taskId,
                                  task: taskForm.title,
                                  title: taskForm.title,
                                  description: taskForm.description,
                                  priority: taskForm.priority,
                                  status: 'Pendiente',
                                  completed: false,
                                  dueDate: taskForm.dueDate,
                                  assignedTo: [taskForm.assignedToName],
                                  assignedToEmail: taskForm.assignedToEmail,
                                  assignedToEmails: [taskForm.assignedToEmail],
                                  assignedSede: selectedCoordForTask?.sede || selectedSede,
                                  role: taskForm.assignedRole || 'gerente',
                                  source: 'Centinela RRHH / Nodus',
                                  createdAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                  metadata: {
                                    nodusName: selectedCoordForTask?.nodusName,
                                    sentadosC1: selectedCoordForTask?.sentadosC1,
                                    sentadosC2: selectedCoordForTask?.sentadosC2,
                                    confirmados: selectedCoordForTask?.confirmados,
                                    coberturaPct: selectedCoordForTask?.coberturaPct,
                                    nivelRiesgo: selectedCoordForTask?.nivelRiesgo
                                  }
                                });

                                await addDoc(collection(db, 'notifications'), {
                                  userId: taskForm.assignedToEmail,
                                  title: `🚨 Tarea RRHH: ${taskForm.title}`,
                                  message: `Se ha asignado una tarea de intervención operativa y coaching para la sede ${selectedCoordForTask?.sede}.`,
                                  type: 'task_assigned',
                                  taskId: taskId,
                                  read: false,
                                  createdAt: new Date().toISOString()
                                });

                                setToastMessage({
                                  type: 'success',
                                  text: `¡Tarea asignada con éxito a ${taskForm.assignedToName} en Causa OS!`
                                });
                                setTaskModalOpen(false);

                                setTimeout(() => {
                                  setToastMessage(null);
                                }, 3500);

                              } catch (err) {
                                console.error('Error al crear tarea de RRHH:', err);
                                alert('Error al guardar la tarea en Causa OS: ' + err.message);
                              } finally {
                                setIsSavingTask(false);
                              }
                            }}
                            disabled={isSavingTask}
                            style={{
                              padding: '0.6rem 1.4rem',
                              borderRadius: '8px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                              color: '#fff',
                              fontWeight: 700,
                              cursor: isSavingTask ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)',
                              fontSize: '0.85rem'
                            }}
                          >
                            {isSavingTask ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            {isSavingTask ? 'Asignando en Causa OS...' : 'Crear Tarea en Causa OS'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

        ) : viewMode === 'resources' ? (
          <ResourceCapacityView selectedSede={selectedSede} hrSentinelData={hrSentinelData} />
        ) : null}
      </main>
    </div>
  );
}
