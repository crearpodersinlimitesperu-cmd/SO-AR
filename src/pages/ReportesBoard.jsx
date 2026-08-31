import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import { ArrowLeft, FileText, Send } from 'lucide-react';

export default function ReportesBoard() {
  const { currentUser } = useAuth();
  const { currentCycle, currentStage } = useCycles();
  const { showToast } = useUI();
  const navigate = useNavigate();

  const [reportType, setReportType] = useState('');
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  // Limpiar form al cambiar tipo
  useEffect(() => {
    setFormData({});
  }, [reportType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Intentar parsear a número si aplica
    const val = isNaN(value) || value === '' ? value : Number(value);
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const calculateTotalLlamadas = (seccion) => {
    const keys = ['OK', 'XC', 'NC', 'NI', 'SIG', 'OS', 'PENDIENTES'];
    let total = 0;
    keys.forEach(k => {
      total += (formData[`${seccion}_${k}`] || 0);
    });
    return total;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reportType) return;
    setLoading(true);

    try {
      // 1. Guardar el reporte
      await addDoc(collection(db, 'reports'), {
        type: reportType,
        cycle_id: currentCycle?.id || 'unknown',
        stage: currentStage,
        submitted_by: currentUser.displayName || currentUser.email,
        created_at: new Date().toISOString(),
        data: formData
      });

      // 2. Regla de Negocio Crítica: Acumulación de Metas para "Llamadas"
      if (reportType === 'Llamadas') {
        const totalOkNuevos = formData['nuevos_OK'] || 0;
        const totalOkRezagados = formData['rezagados_OK'] || 0;
        const totalOk = totalOkNuevos + totalOkRezagados;

        if (totalOk > 0) {
          // Buscar metas activas de tipo ENTRENAMIENTO (simplificado para MVP: sumamos a la de C1 por ser llamadas, o a todas aplicables)
          const goalsQ = query(collection(db, 'goals'), where('scope', '==', 'ENTRENAMIENTO'));
          const snapshot = await getDocs(goalsQ);
          
          // Buscar meta correspondiente a la etapa operativa y KPI de Sentados/Px (P11)
          const entGoalDoc = snapshot.docs.find(d => {
            const dData = d.data();
            const stageMatches = dData.stage === currentStage || (currentStage.includes('C1') && dData.stage === 'C1');
            return stageMatches && (dData.title?.includes('Px') || dData.title?.includes('Sentados') || dData.kpi?.includes('Px'));
          });
          
          if (entGoalDoc) {
            const data = entGoalDoc.data();
            const currentVal = data.currentValue || 0;
            const newVal = currentVal + totalOk;
            const target = data.targetValue || 1;
            const newProgress = Math.min(100, Math.round((newVal / target) * 100));

            await updateDoc(doc(db, 'goals', entGoalDoc.id), {
              currentValue: newVal,
              progress: newProgress,
              updatedAt: new Date().toISOString()
            });

            // Roll-up hacia CICLO (Opcional en MVP, el Gerente lo verá reflejado en la propia meta)
            const parentId = data.parentId;
            if (parentId) {
               // En una app completa, aquí iteraríamos los hermanos para promediar, similar a GoalsBoard
            }
          }
        }
      }

      showToast('¡Reporte enviado exitosamente!', 'success');
      setReportType('');
      setFormData({});
    } catch (err) {
      console.error(err);
      showToast('Hubo un error al enviar el reporte.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    if (reportType === 'FDS') {
      return (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <h4 className="text-blue">Reporte FDS (Sede C1)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input type="number" name="px_nuevos" placeholder="PX Nuevos Sentados" onChange={handleChange} className="form-input" />
            <input type="number" name="px_rezagados" placeholder="PX Rezagados Sentados" onChange={handleChange} className="form-input" />
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px', gridColumn: '1 / -1' }}>
                <span className="text-gold font-bold">Total PX Sentados: </span> 
                <span className="text-white">{(parseInt(formData.px_nuevos) || 0) + (parseInt(formData.px_rezagados) || 0)}</span>
            </div>
            <input type="number" name="aliados_sentados" placeholder="Aliados Sentados" onChange={handleChange} className="form-input" />
            {((parseInt(formData.aliados_sentados) || 0) < ((parseInt(formData.px_nuevos) || 0) + (parseInt(formData.px_rezagados) || 0)) / 6) && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.5rem', borderRadius: '4px', gridColumn: '1 / -1', fontSize: '0.85rem' }}>
                   ⚠️ Ratio de contención insuficiente (mínimo 1 aliado por cada 6 PX).
                </div>
            )}
            <input type="number" name="px_bajaron" placeholder="Px que se bajaron durante fds" onChange={handleChange} className="form-input" />
            <input type="number" name="declaracion_px" placeholder="Declaración Px" onChange={handleChange} className="form-input" />
            <input type="number" name="enrolamiento" placeholder="Enrolamiento" onChange={handleChange} className="form-input" />
            <input type="number" name="px_en_0" placeholder="Px en 0" onChange={handleChange} className="form-input" />
            <input type="text" name="capitan" placeholder="Nombre Capitán" onChange={handleChange} className="form-input" />
            <input type="number" name="managers_llegaron" placeholder="Managers que llegaron" onChange={handleChange} className="form-input" />
            <input type="number" name="capitan_quedo" placeholder="Capitanes que quedaron" onChange={handleChange} className="form-input" />
            <input type="number" name="managers_quedaron" placeholder="Managers que quedaron" onChange={handleChange} className="form-input" />
            <input type="text" name="declaracion" placeholder="Declaración" onChange={handleChange} className="form-input" />
            <input type="number" name="total" placeholder="Total" onChange={handleChange} className="form-input" />
            <input type="number" name="promedio" placeholder="Promedio fin de semana" onChange={handleChange} className="form-input" step="0.01" />
          </div>
          <textarea name="comentarios" placeholder="Comentarios adicionales" onChange={handleChange} className="form-input" rows="3"></textarea>
        </div>
      );
    }

    if (reportType === 'Llamadas') {
      const metrics = ['OK', 'XC', 'NC', 'NI', 'SIG', 'OS', 'PENDIENTES'];
      return (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <div>
            <h4 className="text-blue" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(0,212,255,0.2)' }}>Nuevos</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {metrics.map(m => (
                <div key={`nuevos_${m}`}>
                  <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>{m}</label>
                  <input type="number" name={`nuevos_${m}`} onChange={handleChange} className="form-input" placeholder="0" />
                </div>
              ))}
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                 <label className="text-gold" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>TOTAL NUEVOS</label>
                 <span className="text-white font-bold">{calculateTotalLlamadas('nuevos')}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-blue" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(0,212,255,0.2)' }}>Rezagados</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {metrics.filter(m => m !== 'OS').map(m => (
                <div key={`rezagados_${m}`}>
                  <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>{m}</label>
                  <input type="number" name={`rezagados_${m}`} onChange={handleChange} className="form-input" placeholder="0" />
                </div>
              ))}
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                 <label className="text-gold" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>TOTAL REZAGADOS</label>
                 <span className="text-white font-bold">{calculateTotalLlamadas('rezagados')}</span>
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(52, 168, 83, 0.1)', border: '1px solid #34a853', padding: '1rem', borderRadius: '8px' }}>
            <p style={{ margin: 0, color: '#34a853', fontSize: '0.9rem' }}>
              💡 Al enviar este reporte, los "OK" se sumarán automáticamente a la Meta de Entrenamiento activa para evitar doble digitación.
            </p>
          </div>
        </div>
      );
    }

    if (reportType === 'C2') {
      return (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <h4 className="text-blue">Reporte Capítulo Dos</h4>
          <textarea name="detalle" placeholder="Detalle: (Px, Aliados, Capitán, Entrenador, Desertores)" onChange={handleChange} className="form-input" rows="4"></textarea>
          
          <h5 className="text-gold" style={{ margin: '1rem 0 0.5rem 0' }}>Registro Financiero C2 (Obligatorio)</h5>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <select name="nomenclatura_pago" onChange={handleChange} className="form-input" required>
                <option value="">-- Nomenclatura --</option>
                <option value="C2">C2 (Solo Capítulo 2)</option>
                <option value="C2+MJ">C2+MJ (Paquete Completo)</option>
                <option value="MJ">MJ (Solo Maestría)</option>
             </select>
             <select name="via_pago" onChange={handleChange} className="form-input" required>
                <option value="">-- Vía de Pago --</option>
                <option value="TRANSF">TRANSF (Transferencia)</option>
                <option value="TC">TC (Tarjeta Crédito)</option>
                <option value="LINK">LINK (Botón Pagos)</option>
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="USDT">USDT (Crypto)</option>
                <option value="PAYPHONE">PAYPHONE</option>
                <option value="PAYPAL">PAYPAL</option>
             </select>
             <input type="number" name="pagos_c2_mj" placeholder="Monto Total Procesado" onChange={handleChange} className="form-input" />
             <input type="number" name="pagos_rotos" placeholder="Pagos Rotos / Desertores" onChange={handleChange} className="form-input" />
          </div>
        </div>
      );
    }

    if (reportType === 'MJ') {
      return (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <h4 className="text-blue">Reporte Maestría del Juego</h4>
          <select name="subtipo" onChange={handleChange} className="form-input">
            <option value="">Selecciona sección...</option>
            <option value="Asistencia">Asistencia</option>
            <option value="Declaracion">Declaración</option>
            <option value="Enrolamiento">Enrolamiento</option>
          </select>
          {formData.subtipo && (
             <textarea name="contenido" placeholder={`Contenido para ${formData.subtipo}...`} onChange={handleChange} className="form-input" rows="5"></textarea>
          )}
        </div>
      );
    }

    if (reportType === 'QT_Contexto') {
      return (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <h4 className="text-blue">Reporte de Contexto (QT)</h4>
          <textarea name="contexto" placeholder="Escribe aquí lo que estás viendo en el contexto..." onChange={handleChange} className="form-input" rows="8"></textarea>
        </div>
      );
    }

    return <p className="text-muted">Selecciona un tipo de reporte para ver el formato.</p>;
  };

  const role = currentUser?.activeRole || currentUser?.appRole || '';
  const isDireccion = role === 'direccion';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <style>{`
        .form-input {
          width: 100%; padding: 0.8rem; background: rgba(0,0,0,0.5); 
          border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px;
        }
      `}</style>
      
      <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <FileText size={32} className="text-gold" />
          <div>
            <h1 className="text-gold uppercase" style={{ margin: 0 }}>Reportes Operativos</h1>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Digitalización de Formatos de Comunicación</p>
          </div>
        </div>

        {isDireccion ? (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <p className="text-muted">Rol de Dirección Global: Solo recibes y monitoreas reportes, no envías. (Modo Lectura)</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '2rem' }}>
              <label className="text-white" style={{ display: 'block', marginBottom: '0.5rem' }}>Tipo de Reporte a Enviar:</label>
              <select 
                value={reportType} 
                onChange={e => setReportType(e.target.value)} 
                className="form-input"
              >
                <option value="">-- Selecciona Formato Oficial Autorizado --</option>
                {(() => {
                  const isSuper = currentUser?.isSuperAdmin || currentUser?.isGerente || ['superadmin', 'gerente'].includes(role);
                  const options = [];

                  if (role === 'qt') {
                    options.push(<option key="QT" value="QT_Contexto">Reporte de Contexto (QT)</option>);
                  } else {
                    if (isSuper || ['coord_c1', 'coordinador_c1c2'].includes(role)) {
                      options.push(<option key="Llamadas" value="Llamadas">1. Reporte de Llamadas (C1)</option>);
                      options.push(<option key="C2" value="C2">3. Reporte Capítulo Dos</option>);
                    }
                    if (isSuper || ['capitan'].includes(role)) {
                      options.push(<option key="FDS" value="FDS">2. Reporte FDS (Sede)</option>);
                    }
                    if (isSuper || ['coord_maestria', 'coordinador_mj', 'director_maestria'].includes(role)) {
                      options.push(<option key="MJ" value="MJ">4. Reporte Maestría del Juego</option>);
                    }
                  }

                  return options.length > 0 ? options : [
                    <option key="FDS" value="FDS">2. Reporte FDS (Sede)</option>
                  ];
                })()}
              </select>
            </div>

            {reportType && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '2rem' }}>
                {renderFormFields()}
              </div>
            )}

            {reportType && (
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <Send size={20} /> {loading ? 'Enviando...' : 'Enviar Reporte y Acumular Datos'}
              </button>
            )}
          </form>
        )}
      </div>

    </div>
  );
}
