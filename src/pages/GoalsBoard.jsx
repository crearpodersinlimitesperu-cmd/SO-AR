import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where, orderBy, writeBatch, runTransaction } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import { ArrowLeft, Target, Settings, GitMerge, Users, UserPlus, Award, CheckCircle2, Plus, Edit3 } from 'lucide-react';
import GoalDivisionModal from '../components/GoalDivisionModal';
import { normalizeSede } from '../data/usersData';

export default function GoalsBoard() {
  const { currentUser } = useAuth();
  const { currentCycle } = useCycles();
  const { showToast, showPrompt } = useUI();
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSedeFilter, setSelectedSedeFilter] = useState('Todas');

  // Modal de Asignación / División de Metas
  const [selectedGoalForAssignment, setSelectedGoalForAssignment] = useState(null);
  const [showDivisionModal, setShowDivisionModal] = useState(false);

  // Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyData, setDailyData] = useState({ parentId: '', title: '', kpi: '', targetValue: 1 });
  
  const stages = [
    { id: 'C1', name: 'Capítulo 1' },
    { id: 'C2', name: 'Capítulo 2' },
    { id: 'MJ_CREACION', name: 'MJ - Creación' },
    { id: 'MJ_RELACION', name: 'MJ - Relación' },
    { id: 'MJ_GRATITUD', name: 'MJ - Gratitud' },
    { id: 'MJ_VIAJE', name: 'MJ - El Viaje' }
  ];

  // Estructura para guardar las metas del wizard
  const [wizardData, setWizardData] = useState(
    stages.reduce((acc, stage) => {
      acc[stage.id] = { px: '', aliados: '', managers: '', apoyos: '' };
      return acc;
    }, {})
  );
  
  const [quitoCycle, setQuitoCycle] = useState('C1');


  useEffect(() => {
    // Cargar caché local inmediato si existe
    try {
      const cached = localStorage.getItem('cpsl_goals_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGoals(parsed);
          setLoading(false);
        }
      }
    } catch (e) {
      console.warn("Error leyendo cpsl_goals_cache:", e);
    }

    const goalsRef = collection(db, 'goals');

    const unsubscribe = onSnapshot(
      goalsRef,
      (snapshot) => {
        let loadedGoals = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Ordenar en memoria por createdAt descendente
        loadedGoals.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        // Filtrar por sede si no es SuperAdmin ni Dirección ni Consolidado
        const isSuper = currentUser?.isSuperAdmin || currentUser?.appRole === 'direccion' || currentUser?.appRole === 'consolidado' || currentUser?.isDireccion;
        if (!isSuper && currentUser?.sede) {
          const mySedeNorm = normalizeSede(currentUser.sede);
          loadedGoals = loadedGoals.filter(g => !g.sede || normalizeSede(g.sede) === mySedeNorm || g.sede === 'Global');
        }

        setGoals(loadedGoals);
        try {
          localStorage.setItem('cpsl_goals_cache', JSON.stringify(loadedGoals));
        } catch(e) {}
        setLoading(false);
      },
      (error) => {
        console.warn("Error en onSnapshot de goals (fallback a caché):", error);
        setLoading(false);
      }
    );

    // Timeout de seguridad: Si Firestore tarda más de 2.5s, quitar spinner
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [currentUser?.sede, currentUser?.isSuperAdmin, currentUser?.appRole, currentUser?.isDireccion]);

  const handleWizardChange = (stageId, field, value) => {
    setWizardData(prev => ({
      ...prev,
      [stageId]: { ...prev[stageId], [field]: value }
    }));
  };

  const handleGenerateGoals = async () => {
    try {
      const batch = writeBatch(db);
      const cycleGoalRef = doc(collection(db, 'goals'));
      const suffix = currentUser?.sede === 'Quito' ? ` (${quitoCycle})` : '';
      const currentUserId = currentUser?.uid || currentUser?.id || 'admin';
      const currentUserName = currentUser?.displayName || currentUser?.name || 'Administrador';
      const userSede = currentUser?.sede || '';
      
      // 1. Crear Meta Maestra del Ciclo
      batch.set(cycleGoalRef, {
        title: `Meta Global del Ciclo ${currentCycle?.name || ''}${suffix}`,
        kpi: 'Cumplimiento General (%)',
        progress: 0,
        targetValue: 100,
        currentValue: 0,
        scope: 'CICLO',
        parentId: null,
        ownerId: currentUserId,
        ownerName: currentUserName,
        sede: userSede,
        createdAt: new Date().toISOString()
      });

      // 2. Crear las metas de ENTRENAMIENTO basadas en el Wizard
      for (const stage of stages) {
        const data = wizardData[stage.id];
        const phaseCode = stage.id.startsWith('MJ') ? 'MJ' : stage.id;
        
        if (data.px && Number(data.px) > 0) {
          batch.set(doc(collection(db, 'goals')), {
             title: `Sentados (Px) - ${stage.name}`,
             kpi: 'Cantidad de Px',
             targetValue: Number(data.px),
             currentValue: 0,
             progress: 0,
             scope: 'ENTRENAMIENTO',
             cyclePhase: phaseCode,
             parentId: cycleGoalRef.id,
             stage: stage.id,
             ownerId: currentUserId,
             sede: userSede,
             assignedCoordinators: [],
             createdAt: new Date().toISOString()
          });
        }
        if (data.aliados && Number(data.aliados) > 0) {
          batch.set(doc(collection(db, 'goals')), {
             title: `Aliados - ${stage.name}`,
             kpi: 'Cantidad de Aliados',
             targetValue: Number(data.aliados),
             currentValue: 0,
             progress: 0,
             scope: 'ENTRENAMIENTO',
             cyclePhase: phaseCode,
             parentId: cycleGoalRef.id,
             stage: stage.id,
             ownerId: currentUserId,
             sede: userSede,
             assignedCoordinators: [],
             createdAt: new Date().toISOString()
          });
        }
        if (data.managers && Number(data.managers) > 0) {
          batch.set(doc(collection(db, 'goals')), {
             title: `Managers - ${stage.name}${suffix}`,
             kpi: 'Cantidad de Managers',
             targetValue: Number(data.managers),
             currentValue: 0,
             progress: 0,
             scope: 'ENTRENAMIENTO',
             cyclePhase: phaseCode,
             parentId: cycleGoalRef.id,
             stage: stage.id,
             ownerId: currentUserId,
             sede: userSede,
             assignedCoordinators: [],
             createdAt: new Date().toISOString()
          });
        }
        if (data.apoyos && Number(data.apoyos) > 0) {
          batch.set(doc(collection(db, 'goals')), {
             title: `Apoyos en Mesa - ${stage.name}${suffix}`,
             kpi: 'Cantidad de Apoyos',
             targetValue: Number(data.apoyos),
             currentValue: 0,
             progress: 0,
             scope: 'ENTRENAMIENTO',
             cyclePhase: phaseCode,
             parentId: cycleGoalRef.id,
             stage: stage.id,
             ownerId: currentUserId,
             sede: userSede,
             assignedCoordinators: [],
             createdAt: new Date().toISOString()
          });
        }
      }

      await batch.commit();
      showToast('Metas de Ciclo generadas correctamente.', 'success');
      setShowWizard(false);
    } catch (e) {
      console.error(e);
      showToast('Error generando metas.', 'error');
    }
  };

  const handleCreateDailyGoal = async (e) => {
    e.preventDefault();
    if (!dailyData.parentId || !dailyData.title || dailyData.targetValue <= 0) {
      showToast('Por favor completa todos los campos correctamente.', 'error');
      return;
    }
    
    try {
      const parentGoal = goals.find(g => g.id === dailyData.parentId);
      await addDoc(collection(db, 'goals'), {
        title: dailyData.title,
        kpi: dailyData.kpi || parentGoal?.kpi || 'Unidades',
        targetValue: Number(dailyData.targetValue),
        currentValue: 0,
        progress: 0,
        scope: 'DIARIA',
        cyclePhase: parentGoal?.cyclePhase || 'DIA',
        parentId: dailyData.parentId,
        ownerId: currentUser?.uid || currentUser?.id || 'admin',
        sede: currentUser?.sede || '',
        assignedCoordinators: [],
        createdAt: new Date().toISOString()
      });
      showToast('Meta Diaria creada exitosamente.', 'success');
      setShowDailyModal(false);
      setDailyData({ parentId: '', title: '', kpi: '', targetValue: 1 });
    } catch (error) {
      console.error(error);
      showToast('Error creando Meta Diaria', 'error');
    }
  };

  // GUARDAR ASIGNACIÓN Y DIVISIÓN DE CUOTAS A COORDINADORAS
  const handleSaveAssignment = async (goalId, assignedList) => {
    try {
      const goalRef = doc(db, 'goals', goalId);
      const totalReported = assignedList.reduce((sum, item) => sum + (Number(item.currentQuota) || 0), 0);
      const targetVal = Number(selectedGoalForAssignment?.targetValue || 1);
      const newProgress = Math.min(100, Math.round((totalReported / targetVal) * 100));

      await updateDoc(goalRef, {
        assignedCoordinators: assignedList,
        isAssigned: true,
        currentValue: totalReported,
        progress: newProgress,
        updatedAt: new Date().toISOString()
      });

      // Roll-up hacia metas superiores
      await performRollUp(goalId, newProgress);

      showToast(`¡Meta dividida y asignada con éxito a ${assignedList.length} coordinadoras!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar la asignación de meta.', 'error');
    }
  };

  // ACTUALIZAR EL AVANCE INDIVIDUAL DE UNA COORDINADORA
  const handleUpdateCoordinatorProgress = async (goal, coordEmail, currentQuota, targetQuota, coordName) => {
    const newVal = await showPrompt(
      `📊 Reportar Avance de ${coordName}:\nCuota Asignada: ${targetQuota}\nIngresa el nuevo total alcanzado:`,
      currentQuota || 0
    );

    if (newVal !== null && newVal !== '' && !isNaN(newVal)) {
      try {
        const numericVal = Math.max(0, Number(newVal));
        const updatedCoordinators = (goal.assignedCoordinators || []).map(c => {
          if (c.email === coordEmail) {
            return { ...c, currentQuota: numericVal };
          }
          return c;
        });

        // Sumar avances de todas las coordinadoras
        const totalSum = updatedCoordinators.reduce((sum, c) => sum + (Number(c.currentQuota) || 0), 0);
        const targetVal = Number(goal.targetValue || 1);
        const newProgress = Math.min(100, Math.round((totalSum / targetVal) * 100));

        const goalRef = doc(db, 'goals', goal.id);
        await updateDoc(goalRef, {
          assignedCoordinators: updatedCoordinators,
          currentValue: totalSum,
          progress: newProgress,
          updatedAt: new Date().toISOString()
        });

        await performRollUp(goal.id, newProgress);
        showToast(`Avance de ${coordName} actualizado a ${numericVal}/${targetQuota} (Total acumulado: ${totalSum}/${targetVal})`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Error al actualizar el avance.', 'error');
      }
    }
  };

  const performRollUp = async (goalId, newProgress) => {
    try {
      const currentGoal = goals.find(g => g.id === goalId);
      if (currentGoal && currentGoal.parentId) {
        const siblings = goals.filter(g => g.parentId === currentGoal.parentId && g.id !== goalId);
        let totalProgress = newProgress;
        siblings.forEach(s => totalProgress += (s.progress || 0));
        const avgProgress = Math.round(totalProgress / (siblings.length + 1));
        
        const parentRef = doc(db, 'goals', currentGoal.parentId);
        await updateDoc(parentRef, { 
          progress: avgProgress,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error("Rollup error:", e);
    }
  };

  const updateProgressManual = async (id, currentVal, targetVal) => {
    const newVal = await showPrompt(`Ingresa nuevo valor acumulado global (Meta: ${targetVal}):`, currentVal);
    if (newVal !== null && newVal !== '' && !isNaN(newVal)) {
      try {
        const numericVal = Number(newVal);
        const newProgress = Math.min(100, Math.round((numericVal / targetVal) * 100));
        
        const goalRef = doc(db, 'goals', id);
        await updateDoc(goalRef, { 
          currentValue: numericVal,
          progress: newProgress,
          updatedAt: new Date().toISOString()
        });

        await performRollUp(id, newProgress);
        showToast('Avance global actualizado', 'success');
      } catch (e) {
        console.error("Error actualizando meta:", e);
        showToast('Error actualizando meta', 'error');
      }
    }
  };

  const openAssignmentModal = (goal) => {
    setSelectedGoalForAssignment(goal);
    setShowDivisionModal(true);
  };

  const renderGoal = (goal) => {
    const parentGoal = goals.find(g => g.id === goal.parentId);
    const isAssigned = goal.assignedCoordinators && Array.isArray(goal.assignedCoordinators) && goal.assignedCoordinators.length > 0;
    
    return (
      <div key={goal.id} className="glass-panel" style={{ padding: '1.5rem', transition: 'all 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ 
                fontSize: '0.7rem', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '4px',
                background: goal.scope === 'CICLO' ? 'var(--crear-gold)' : goal.scope === 'ENTRENAMIENTO' ? 'var(--crear-blue)' : 'var(--color-success)',
                color: '#000', letterSpacing: '1px'
              }}>
                {goal.scope}
              </span>

              {goal.sede && (
                <span style={{
                  fontSize: '0.7rem', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)'
                }}>
                  📍 {goal.sede}
                </span>
              )}
              
              {isAssigned && (
                <span style={{
                  fontSize: '0.7rem', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '9999px',
                  background: 'rgba(0, 210, 255, 0.15)', color: 'var(--crear-blue)', border: '1px solid rgba(0, 210, 255, 0.3)',
                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                }}>
                  <Users size={12} /> Dividido en {goal.assignedCoordinators.length} Coordinadoras
                </span>
              )}

              {parentGoal && (
                <span className="text-muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <GitMerge size={12} /> Aporta a: {parentGoal.title}
                </span>
              )}
            </div>

            <h3 className="text-main" style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem' }}>{goal.title}</h3>
            
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              {goal.targetValue ? (
                <>
                  Avance Acumulado: <strong style={{ color: 'var(--crear-gold)', fontSize: '1.05rem' }}>{goal.currentValue || 0}</strong> de <strong>{goal.targetValue}</strong> {goal.kpi || ''}
                </>
              ) : `KPI: ${goal.kpi}`}
            </p>
          </div>

          {/* BOTONES DE ACCIÓN PARA GERENTES Y COORDINADORAS */}
          {goal.targetValue && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                type="button"
                onClick={() => openAssignmentModal(goal)}
                className="btn-neon-action"
                style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                title="Dividir la meta equitativamente entre las coordinadoras de la sede"
              >
                <Users size={14} />
                <span>{isAssigned ? 'Modificar Reparto' : '👥 Asignar / Dividir Meta'}</span>
              </button>

              <button 
                type="button"
                className="btn-secondary" 
                onClick={() => updateProgressManual(goal.id, goal.currentValue, goal.targetValue)} 
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
              >
                Ajuste Manual
              </button>
            </div>
          )}
        </div>
        
        {/* BARRA DE PROGRESO GLOBAL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: isAssigned ? '1.25rem' : '0' }}>
          <div style={{ flex: 1, height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: `${Math.min(goal.progress, 100)}%`, 
              background: goal.progress >= 100 
                ? 'linear-gradient(90deg, #22c55e, #16a34a)' 
                : 'linear-gradient(90deg, #00d2ff, #0284c7)', 
              transition: 'width 0.4s ease' 
            }} />
          </div>
          <span className="text-gold" style={{ fontWeight: 'bold', minWidth: '45px', fontSize: '1.05rem' }}>
            {goal.progress}%
          </span>
        </div>

        {/* DESGLOSE INDIVIDUAL DE COORDINADORAS ASIGNADAS CON REPORTE EN 1 CLIC */}
        {isAssigned && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            marginTop: '0.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📌 Cuotas Individuales & Reporte de Avance en Tiempo Real:
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--crear-blue)' }}>
                Suma total: {goal.currentValue || 0} / {goal.targetValue}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {goal.assignedCoordinators.map(coord => {
                const current = Number(coord.currentQuota || 0);
                const target = Number(coord.targetQuota || 1);
                const pct = Math.min(100, Math.round((current / target) * 100));
                const isC1 = coord.role === 'coord_c1';

                return (
                  <div
                    key={coord.email}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-heading)' }}>
                          {coord.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: isC1 ? 'var(--crear-blue)' : 'var(--role-mj)', fontWeight: 'bold' }}>
                          {isC1 ? 'Coordinadora C1/C2' : 'Coordinadora CMJ'} ({coord.sede || 'Sede'})
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpdateCoordinatorProgress(goal, coord.email, current, target, coord.name)}
                        className="btn-secondary"
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.6rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          background: 'rgba(0, 210, 255, 0.1)',
                          borderColor: 'var(--crear-blue)',
                          color: 'var(--crear-blue)'
                        }}
                      >
                        <Edit3 size={11} /> Reportar
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      <span className="text-muted">Avance:</span>
                      <span>
                        <strong style={{ color: current >= target ? '#22c55e' : 'var(--crear-gold)' }}>{current}</strong> / {target} ({pct}%)
                      </span>
                    </div>

                    {/* Barra individual */}
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: pct >= 100 ? '#22c55e' : 'var(--crear-blue)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Target size={32} className="text-gold" />
          <div>
            <h1 className="text-gold uppercase" style={{ margin: 0, fontSize: '1.8rem' }}>Gestión de Metas</h1>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              Seguimiento, asignación equitativa a coordinadoras y acumulación operativa
            </p>
          </div>
        </div>
        {currentUser?.appRole === 'gerente' && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-secondary" onClick={() => setShowDailyModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem' }}>
              <Plus size={18} /> Meta Diaria
            </button>
            <button className="btn-primary" onClick={() => setShowWizard(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem' }}>
              <Settings size={18} /> Setup de Ciclo
            </button>
          </div>
        )}
      </div>

        {(currentUser?.isSuperAdmin || currentUser?.isDireccion) && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Filtro de Sede (Vista Global):</label>
            <select 
              className="form-select" 
              value={selectedSedeFilter} 
              onChange={e => setSelectedSedeFilter(e.target.value)} 
              style={{ width: '100%', maxWidth: '300px', padding: '0.5rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-subtle)' }}
            >
              <option value="Todas">Todas las Sedes</option>
              <option value="Lima">Lima</option>
              <option value="Quito">Quito</option>
              <option value="Medellín">Medellín</option>
              <option value="Guayaquil">Guayaquil</option>
              <option value="Cuenca">Cuenca</option>
              <option value="México">México</option>
            </select>
          </div>
        )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {loading ? <p className="text-muted text-center">Cargando metas...</p> : (() => {
          if (goals.length === 0) {
            return <p className="text-muted" style={{ textAlign: 'center' }}>No hay metas configuradas. Inicia el Setup de Ciclo.</p>;
          }
          const filteredGoals = goals.filter(g => selectedSedeFilter === 'Todas' || normalizeSede(g.sede || '') === normalizeSede(selectedSedeFilter));
          if (filteredGoals.length === 0) {
            return <p className="text-muted" style={{ textAlign: 'center' }}>No se encontraron metas para la sede <strong>{selectedSedeFilter}</strong>.</p>;
          }
          return filteredGoals.map(renderGoal);
        })()}
      </div>

      {/* MODAL PARA DIVIDIR Y ASIGNAR METAS ENTRE COORDINADORAS */}
      <GoalDivisionModal
        isOpen={showDivisionModal}
        onClose={() => setShowDivisionModal(false)}
        goal={selectedGoalForAssignment}
        onSaveAssignment={handleSaveAssignment}
        currentUser={currentUser}
      />

      {/* MODAL WIZARD SETUP DE CICLO */}
      {showWizard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="text-gold" style={{ marginTop: 0 }}>Wizard: Setup de Ciclo</h2>
            <p className="text-muted">Define las metas de Entrenamiento para cada fase.</p>
            
            {currentUser?.sede === 'Quito' && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255, 215, 0, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 215, 0, 0.3)' }}>
                <label style={{ display: 'block', color: 'var(--crear-gold)', fontWeight: 'bold', marginBottom: '0.5rem' }}>Aplica para (Sede Quito):</label>
                <select className="form-select" value={quitoCycle} onChange={e => setQuitoCycle(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-subtle)' }}>
                  <option value="C1">Ciclo 1</option>
                  <option value="C2">Ciclo 2</option>
                  <option value="C1 y C2">Ambos Ciclos</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
              {stages.map(stage => (
                <div key={stage.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: 'var(--crear-cyan)' }}>{stage.name}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Px</label>
                      <input type="number" min="0" className="form-input" value={wizardData[stage.id].px} onChange={e => handleWizardChange(stage.id, 'px', e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aliados</label>
                      <input type="number" min="0" className="form-input" value={wizardData[stage.id].aliados} onChange={e => handleWizardChange(stage.id, 'aliados', e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Managers</label>
                      <input type="number" min="0" className="form-input" value={wizardData[stage.id].managers} onChange={e => handleWizardChange(stage.id, 'managers', e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} title="6 apoyos por coordinador">Apoyos (Mesa)</label>
                      <input type="number" min="0" className="form-input" value={wizardData[stage.id].apoyos} onChange={e => handleWizardChange(stage.id, 'apoyos', e.target.value)} placeholder="0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn-secondary" onClick={() => setShowWizard(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleGenerateGoals}>Generar Metas</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL META DIARIA */}
      {showDailyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h2 className="text-gold" style={{ marginTop: 0 }}>Crear Meta Diaria</h2>
            <form onSubmit={handleCreateDailyGoal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Meta de Entrenamiento (Padre)</label>
                <select className="form-select" value={dailyData.parentId} onChange={e => setDailyData({...dailyData, parentId: e.target.value})} required style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-subtle)' }}>
                  <option value="">Selecciona una meta...</option>
                  {goals.filter(g => g.scope === 'ENTRENAMIENTO').map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Título de la Meta Diaria</label>
                <input type="text" className="form-input" value={dailyData.title} onChange={e => setDailyData({...dailyData, title: e.target.value})} placeholder="Ej. Cerrar 5 Px hoy" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Objetivo (Número)</label>
                  <input type="number" min="1" className="form-input" value={dailyData.targetValue} onChange={e => setDailyData({...dailyData, targetValue: e.target.value})} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>KPI (Opcional)</label>
                  <input type="text" className="form-input" value={dailyData.kpi} onChange={e => setDailyData({...dailyData, kpi: e.target.value})} placeholder="Ej. Px" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowDailyModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Crear Meta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
