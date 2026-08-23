import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { usersData, normalizeRole } from '../data/usersData';
import { Users, CheckCircle2, Shield, UserCheck, Calculator, X, Sparkles } from 'lucide-react';

export default function GoalDivisionModal({ isOpen, onClose, goal, onSaveAssignment, currentUser }) {
  // Determinar si el usuario es gerente (no superAdmin ni dirección)
  const isGerente = currentUser?.appRole === 'gerente' && !currentUser?.isSuperAdmin && !currentUser?.isDireccion;
  const userSede = currentUser?.sede || 'Lima';

  const [selectedSede, setSelectedSede] = useState(isGerente ? userSede : 'Lima');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL'); // 'ALL' | 'CC1Y2' | 'CMJ' | 'CUSTOM'
  const [assignedCoordinators, setAssignedCoordinators] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Lista única de sedes disponibles
  const sedesList = [...new Set(usersData.map(u => u.sede?.trim()).filter(Boolean))];

  // Obtener coordinadores disponibles
  const availableCoordinators = usersData.filter(u => {
    const roleNorm = normalizeRole(u.role);
    const isCoord = roleNorm === 'coord_c1' || roleNorm === 'coord_maestria';
    const matchSede = selectedSede === 'GLOBAL' || (u.sede && u.sede.toLowerCase() === selectedSede.toLowerCase());
    return isCoord && matchSede;
  });

  // Inicializar o sincronizar selección cuando cambia la meta o filtro
  useEffect(() => {
    // El modal puede estar montado con goal=null mientras isOpen=false; no hay nada que
    // inicializar en ese caso (evita "Cannot read properties of null" ahora que el guard
    // de abajo se movió después de los hooks).
    if (!goal) return;

    // Si la meta ya tenía asignaciones previas, cargarlas
    if (goal.assignedCoordinators && Array.isArray(goal.assignedCoordinators) && goal.assignedCoordinators.length > 0) {
      setAssignedCoordinators(goal.assignedCoordinators);
      if (goal.assignedCoordinators[0]?.sede) {
        setSelectedSede(goal.assignedCoordinators[0].sede);
      }
      return;
    }

    // Si no, pre-seleccionar según el tipo de meta
    applyPreset('AUTO');
  }, [goal, selectedSede]);

  // IMPORTANTE: este guard debe ir DESPUÉS de todos los hooks (useState x4 + useEffect).
  // Antes estaba antes de los hooks, lo que viola las Reglas de Hooks de React: como este
  // componente se monta de forma incondicional (isOpen/goal llegan como props), al abrir el
  // modal React ejecutaba un número distinto de hooks entre renders y lanzaba
  // "Rendered more hooks than during the previous render", tumbando toda la app (solo hay
  // un ErrorBoundary global en main.jsx).
  if (!isOpen || !goal) return null;

  const applyPreset = (presetType) => {
    let filtered = [];
    const roleNorm = (goal.stage || '').toUpperCase();

    if (presetType === 'CC1Y2' || (presetType === 'AUTO' && (roleNorm === 'C1' || roleNorm === 'C2' || goal.title?.includes('C1') || goal.title?.includes('C2')))) {
      setSelectedRoleFilter('CC1Y2');
      filtered = availableCoordinators.filter(u => normalizeRole(u.role) === 'coord_c1');
    } else if (presetType === 'CMJ' || (presetType === 'AUTO' && (roleNorm.startsWith('MJ') || goal.title?.includes('MJ') || goal.title?.includes('Maestría')))) {
      setSelectedRoleFilter('CMJ');
      filtered = availableCoordinators.filter(u => normalizeRole(u.role) === 'coord_maestria');
    } else {
      setSelectedRoleFilter('ALL');
      filtered = availableCoordinators;
    }

    const count = filtered.length || 1;
    const targetVal = Number(goal.targetValue || 0);
    const quotaPerPerson = Math.round((targetVal / count) * 10) / 10;

    const initialAssignments = filtered.map(u => ({
      email: u.email,
      name: u.name,
      role: normalizeRole(u.role),
      sede: u.sede,
      targetQuota: quotaPerPerson,
      currentQuota: 0
    }));

    setAssignedCoordinators(initialAssignments);
  };

  const handleToggleCoordinator = (coord) => {
    setSelectedRoleFilter('CUSTOM');
    const exists = assignedCoordinators.some(a => a.email === coord.email);
    let updated = [];

    if (exists) {
      updated = assignedCoordinators.filter(a => a.email !== coord.email);
    } else {
      updated = [...assignedCoordinators, {
        email: coord.email,
        name: coord.name,
        role: normalizeRole(coord.role),
        sede: coord.sede,
        targetQuota: 0,
        currentQuota: 0
      }];
    }

    // Recalcular división equitativa
    const count = updated.length || 1;
    const targetVal = Number(goal.targetValue || 0);
    const quotaPerPerson = Math.round((targetVal / count) * 10) / 10;

    const recalced = updated.map(item => ({
      ...item,
      targetQuota: quotaPerPerson
    }));

    setAssignedCoordinators(recalced);
  };

  const handleQuotaChange = (email, newQuota) => {
    setAssignedCoordinators(prev => prev.map(item => {
      if (item.email === email) {
        return { ...item, targetQuota: Number(newQuota) || 0 };
      }
      return item;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (assignedCoordinators.length === 0) {
      toast.error("Por favor selecciona al menos una coordinadora para la meta.");
      return;
    }

    setIsSaving(true);
    try {
      await onSaveAssignment(goal.id, assignedCoordinators);
      toast.success("Asignación de cuotas guardada correctamente.");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Hubo un error al guardar la asignación.");
    } finally {
      setIsSaving(false);
    }
  };

  const totalAssignedQuota = assignedCoordinators.reduce((sum, item) => sum + (Number(item.targetQuota) || 0), 0);
  const targetVal = Number(goal.targetValue || 0);
  const isBalanced = Math.abs(totalAssignedQuota - targetVal) < 0.1;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        border: '1px solid rgba(0, 210, 255, 0.3)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 210, 255, 0.15)',
        position: 'relative'
      }}>
        {/* BOTÓN CERRAR */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Users size={28} color="var(--crear-blue)" />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#ffffff' }}>
              Dividir y Asignar Meta a Coordinadoras
            </h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              {goal.title} — Meta Total: <strong style={{ color: 'var(--crear-gold)' }}>{targetVal} {goal.kpi || 'unidades'}</strong>
            </p>
          </div>
        </div>

        <hr style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '1.25rem 0' }} />

        {/* SELECTOR DE SEDE Y PRESETS RÁPIDOS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              Sede Operativa:
            </label>
            <select
              value={isGerente ? userSede : selectedSede}
              onChange={(e) => !isGerente && setSelectedSede(e.target.value)}
              disabled={isGerente}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '8px',
                background: isGerente ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)',
                color: '#fff',
                border: `1px solid ${isGerente ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
                fontSize: '0.85rem',
                fontWeight: 'bold',
                cursor: isGerente ? 'not-allowed' : 'pointer'
              }}
            >
              {sedesList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              {!isGerente && <option value="GLOBAL">Todas las Sedes</option>}
            </select>
            {isGerente && <p style={{ fontSize: '0.7rem', color: '#f59e0b', margin: '0.3rem 0 0 0' }}>🔒 Solo puedes asignar a tu sede</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              División Automática Rápida:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => applyPreset('CC1Y2')}
                className="btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.4rem 0.8rem',
                  background: selectedRoleFilter === 'CC1Y2' ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                  borderColor: selectedRoleFilter === 'CC1Y2' ? 'var(--crear-blue)' : 'rgba(255,255,255,0.1)'
                }}
              >
                Capítulo 1 y 2 (C1/C2)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('CMJ')}
                className="btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.4rem 0.8rem',
                  background: selectedRoleFilter === 'CMJ' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                  borderColor: selectedRoleFilter === 'CMJ' ? 'var(--role-mj)' : 'rgba(255,255,255,0.1)'
                }}
              >
                Maestría del Juego (MJ)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('ALL')}
                className="btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.4rem 0.8rem',
                  background: selectedRoleFilter === 'ALL' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                  borderColor: selectedRoleFilter === 'ALL' ? 'var(--color-success)' : 'rgba(255,255,255,0.1)'
                }}
              >
                Todas (C1/C2 + MJ)
              </button>
            </div>
          </div>
        </div>

        {/* RESUMEN DE LA ECUACIÓN DE DIVISIÓN */}
        <div style={{
          background: 'rgba(0, 210, 255, 0.06)',
          border: '1px solid rgba(0, 210, 255, 0.25)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Ecuación de Reparto
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
              {targetVal} {goal.kpi || 'meta'} ÷ {assignedCoordinators.length || 0} coordinadoras = <span style={{ color: 'var(--crear-gold)' }}>{assignedCoordinators.length > 0 ? (Math.round((targetVal / assignedCoordinators.length) * 10) / 10) : 0} c/u</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.25rem 0.6rem',
              borderRadius: '9999px',
              background: isBalanced ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isBalanced ? '#22c55e' : '#ef4444',
              border: `1px solid ${isBalanced ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {isBalanced ? '✅ Cuotas Balanceadas (100%)' : `⚠️ Suma: ${totalAssignedQuota} de ${targetVal}`}
            </span>
          </div>
        </div>

        {/* LISTADO DE COORDINADORAS SELECCIONABLES */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.6rem' }}>
            Coordinadoras Asignadas ({assignedCoordinators.length} seleccionadas):
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
            {availableCoordinators.map(coord => {
              const assignedItem = assignedCoordinators.find(a => a.email === coord.email);
              const isChecked = !!assignedItem;
              const isC1 = normalizeRole(coord.role) === 'coord_c1';

              return (
                <div
                  key={coord.email}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: isChecked ? 'rgba(0, 210, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isChecked ? 'rgba(0, 210, 255, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleCoordinator(coord)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: 'bold', color: isChecked ? '#ffffff' : 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {coord.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: isC1 ? 'var(--crear-blue)' : 'var(--role-mj)' }}>
                        {isC1 ? 'Coordinadora C1 / C2' : 'Coordinadora Maestría (CMJ)'} • {coord.sede}
                      </div>
                    </div>
                  </label>

                  {isChecked && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cuota:</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={assignedItem.targetQuota}
                        onChange={(e) => handleQuotaChange(coord.email, e.target.value)}
                        style={{
                          width: '75px',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(0, 0, 0, 0.6)',
                          border: '1px solid var(--crear-blue)',
                          color: 'var(--crear-gold)',
                          fontWeight: 800,
                          textAlign: 'center',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ACCIONES */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '0.6rem 1.2rem' }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || assignedCoordinators.length === 0}
            className="btn-neon-action"
            style={{ padding: '0.6rem 1.6rem' }}
          >
            {isSaving ? 'Guardando...' : '🚀 Guardar y Asignar Metas'}
          </button>
        </div>
      </div>
    </div>
  );
}
