import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { CheckCircle2, TrendingUp, AlertCircle, ArrowLeft } from 'lucide-react';
import { recordAuditEvent } from '../services/auditService';

export default function MisKPIs() {
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  
  // Para la Fase 1, soportamos C1/C2 y QT
  const isC1 = currentUser?.appRole === 'coord_c1';
  const isQT = currentUser?.appRole === 'qt';
  
  // Estado del formulario C1
  const [c1Data, setC1Data] = useState({
    asistencia: '',
    retencion: '',
    conversionC1C2: '',
    conversionC2MJ: '',
    declaracionBreakthrough: '',
    declaracionAliados: '',
    palabrasRotas: '',
    eficienciaGestion: ''
  });

  // Estado del formulario QT
  const [qtData, setQtData] = useState({
    efectividadLlamadas: '',
    futurosImposibles: '',
    resolucionQuiebres: ''
  });

  useEffect(() => {
    fetchHistory();
  }, [currentUser]);

  const getLocalReports = () => {
    try {
      const saved = localStorage.getItem('cpsl_kpi_reports_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(r => r && !r.id?.startsWith('kpi_seed_'));
        }
      }
    } catch (e) {}
    return [];
  };

  const saveLocalReports = (list) => {
    try {
      const cleanList = (list || []).filter(r => r && !r.id?.startsWith('kpi_seed_'));
      localStorage.setItem('cpsl_kpi_reports_v1', JSON.stringify(cleanList));
    } catch (e) {}
  };

  const fetchHistory = async () => {
    if (!currentUser) return;
    const uid = currentUser.uid || currentUser.id || currentUser.email;
    let local = getLocalReports().filter(r => r.userId === uid || r.userEmail === currentUser.email);

    try {
      const baseQuery = collection(db, 'kpi_reports');
      const snapshot = await getDocs(baseQuery);
      if (snapshot && !snapshot.empty) {
        const remoteData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt
          }))
          .filter(r => r.userId === uid || r.userEmail === currentUser.email);
        
        const ids = new Set(remoteData.map(r => r.id));
        local = [...remoteData, ...local.filter(r => !ids.has(r.id))];
      }
    } catch (error) {
      console.warn("Aviso: usando historial local de KPIs:", error);
    }

    local.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    setHistory(local);
  };

  const handleSubmitC1 = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    const newReport = {
      id: 'kpi_' + Date.now(),
      userId: currentUser.uid || currentUser.id || currentUser.email,
      userEmail: currentUser.email || '',
      userName: currentUser.name || currentUser.displayName || 'Coordinador',
      sede: currentUser.sede || 'Quito',
      role: 'coord_c1',
      data: { ...c1Data },
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Guardar localmente
    const currentList = getLocalReports();
    saveLocalReports([newReport, ...currentList]);
    setHistory(prev => [newReport, ...prev]);

    // Intentar sync en Firestore en background
    try {
      await addDoc(collection(db, 'kpi_reports'), {
        ...newReport,
        createdAt: serverTimestamp()
      });
      await recordAuditEvent({
        email: currentUser.email,
        name: currentUser.name || 'Coordinador',
        role: 'coord_c1',
        sede: currentUser.sede || 'Quito',
        action: 'REPORTE_KPI_ENVIADO',
        details: `Envío de reporte KPI C1/C2 para sede ${currentUser.sede || 'Quito'}`
      });
    } catch (error) {
      console.warn("Reporte guardado localmente (Firestore offline):", error);
    }

    showToast("¡Reporte de KPIs enviado exitosamente al Gerente!", "success");
    setC1Data({
      asistencia: '', retencion: '', conversionC1C2: '', conversionC2MJ: '',
      declaracionBreakthrough: '', declaracionAliados: '', palabrasRotas: '', eficienciaGestion: ''
    });
    setLoading(false);
  };

  const handleSubmitQT = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    const newReport = {
      id: 'kpi_' + Date.now(),
      userId: currentUser.uid || currentUser.id || currentUser.email,
      userEmail: currentUser.email || '',
      userName: currentUser.name || currentUser.displayName || 'Quantum Team',
      sede: currentUser.sede || 'Quito',
      role: 'qt',
      data: { ...qtData },
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Guardar localmente
    const currentList = getLocalReports();
    saveLocalReports([newReport, ...currentList]);
    setHistory(prev => [newReport, ...prev]);

    // Intentar sync en Firestore en background
    try {
      await addDoc(collection(db, 'kpi_reports'), {
        ...newReport,
        createdAt: serverTimestamp()
      });
      await recordAuditEvent({
        email: currentUser.email,
        name: currentUser.name || 'Quantum Team',
        role: 'qt',
        sede: currentUser.sede || 'Quito',
        action: 'REPORTE_KPI_ENVIADO',
        details: `Envío de reporte KPI Quantum Team para sede ${currentUser.sede || 'Quito'}`
      });
    } catch (error) {
      console.warn("Reporte guardado localmente (Firestore offline):", error);
    }

    showToast("¡Reporte de KPIs del Quantum Team enviado exitosamente!", "success");
    setQtData({
      efectividadLlamadas: '', futurosImposibles: '', resolucionQuiebres: ''
    });
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate('/home')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 className="text-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.8rem', marginBottom: '0.5rem' }}>
          <TrendingUp /> Reporte de KPIs Operativos
        </h2>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>
          Ingresa tus métricas al finalizar el ciclo. Estos datos serán auditados directamente por la Gerencia de tu sede.
        </p>

        {isC1 && (
          <form onSubmit={handleSubmitC1} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label>Asistencia C1 / C2 (%) <span className="text-gold" style={{ fontSize: '0.8rem' }}>(Meta: 95%)</span></label>
              <input type="number" required value={c1Data.asistencia} onChange={e => setC1Data({...c1Data, asistencia: e.target.value})} placeholder="Ej: 96" />
            </div>
            <div className="form-group">
              <label>Retención C1 (%) <span className="text-gold" style={{ fontSize: '0.8rem' }}>(Meta: Menos de 10%)</span></label>
              <input type="number" required value={c1Data.retencion} onChange={e => setC1Data({...c1Data, retencion: e.target.value})} placeholder="Ej: 8" />
            </div>
            <div className="form-group">
              <label>Conversión C1 a C2 (%) <span className="text-gold" style={{ fontSize: '0.8rem' }}>(Meta: 50%)</span></label>
              <input type="number" required value={c1Data.conversionC1C2} onChange={e => setC1Data({...c1Data, conversionC1C2: e.target.value})} placeholder="Ej: 52" />
            </div>
            <div className="form-group">
              <label>Movimiento C2 a MJ (%) <span className="text-gold" style={{ fontSize: '0.8rem' }}>(Meta: 70%)</span></label>
              <input type="number" required value={c1Data.conversionC2MJ} onChange={e => setC1Data({...c1Data, conversionC2MJ: e.target.value})} placeholder="Ej: 71" />
            </div>
            <div className="form-group">
              <label>Declaración Breakthrough (%) <span className="text-gold" style={{ fontSize: '0.8rem' }}>(Meta: 90%)</span></label>
              <input type="number" required value={c1Data.declaracionBreakthrough} onChange={e => setC1Data({...c1Data, declaracionBreakthrough: e.target.value})} placeholder="Ej: 92" />
            </div>
            <div className="form-group">
              <label>Conversión a Aliados C2 (%) <span className="text-gold" style={{ fontSize: '0.8rem' }}>(Meta: 40%)</span></label>
              <input type="number" required value={c1Data.declaracionAliados} onChange={e => setC1Data({...c1Data, declaracionAliados: e.target.value})} placeholder="Ej: 45" />
            </div>
            <div className="form-group">
              <label>Palabras Rotas (%) <span className="text-gold" style={{ fontSize: '0.8rem' }}>(Meta: Menos de 5%)</span></label>
              <input type="number" required value={c1Data.palabrasRotas} onChange={e => setC1Data({...c1Data, palabrasRotas: e.target.value})} placeholder="Ej: 3" />
            </div>
            <div className="form-group">
              <label>Eficiencia en Gestión (%) <span className="text-gold" style={{ fontSize: '0.8rem' }}>(Meta: 100%)</span></label>
              <input type="number" required value={c1Data.eficienciaGestion} onChange={e => setC1Data({...c1Data, eficienciaGestion: e.target.value})} placeholder="Ej: 100" />
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                {loading ? 'Enviando...' : 'Enviar Reporte a Gerencia'}
              </button>
            </div>
          </form>
        )}

        {isQT && (
          <form onSubmit={handleSubmitQT} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label>Efectividad Llamadas C1 (%) <span className="text-gold" style={{ fontSize: '0.8rem' }}>(Meta: 60%)</span></label>
              <input type="number" required value={qtData.efectividadLlamadas} onChange={e => setQtData({...qtData, efectividadLlamadas: e.target.value})} placeholder="Ej: 65" />
            </div>
            <div className="form-group">
              <label>Futuros Imposibles Mapeados <span className="text-gold" style={{ fontSize: '0.8rem' }}>(Meta: 2/ciclo min)</span></label>
              <input type="number" required value={qtData.futurosImposibles} onChange={e => setQtData({...qtData, futurosImposibles: e.target.value})} placeholder="Ej: 3" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Resumen de Quiebres y Rescates Operativos</label>
              <textarea required rows="3" value={qtData.resolucionQuiebres} onChange={e => setQtData({...qtData, resolucionQuiebres: e.target.value})} placeholder="Describe brevemente cuántos aliados desconectados rescataste y qué quiebres resolviste..." style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--crear-gold)', color: 'white', borderRadius: '8px' }}></textarea>
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                {loading ? 'Enviando...' : 'Enviar Reporte a Gerencia'}
              </button>
            </div>
          </form>
        )}

        {(!isC1 && !isQT) && (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,0,0,0.1)', borderRadius: '8px' }}>
            <AlertCircle size={48} className="text-gold" style={{ margin: '0 auto 1rem' }} />
            <h3 className="text-white">Formulario no disponible</h3>
            <p className="text-muted">Tu rol actual no tiene un formulario de KPIs asignado en esta versión.</p>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 className="text-gold" style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Tus Reportes Anteriores</h3>
        {history.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: '2rem' }}>Aún no has enviado ningún reporte de KPIs.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {history.map(rep => (
              <div key={rep.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: rep.status === 'reviewed' ? '4px solid #10b981' : '4px solid #f59e0b' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem', color: 'white' }}>Reporte de {rep.role === 'qt' ? 'Quantum Team' : 'C1/C2'}</h4>
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                    Enviado el {rep.createdAt?.toDate().toLocaleDateString() || '...'}
                  </p>
                </div>
                <div>
                  {rep.status === 'reviewed' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold' }}><CheckCircle2 size={16} /> Revisado por Gerencia</span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 'bold' }}><AlertCircle size={16} /> Pendiente de Revisión</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
