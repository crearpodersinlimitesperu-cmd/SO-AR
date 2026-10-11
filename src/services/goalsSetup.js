import { goalsAccess } from './goalsVisibility.js';
import { canonicalSede, explicitGoalTeam } from './goalsTimeline.js';

export function buildTeamGoalPlan({ user, sede, team, goals, stages, targets, cycleName = '', createdAt }) {
  if (!goalsAccess(user).canManage) throw new Error('Tu rol no permite configurar metas.');
  const selectedSede = canonicalSede(sede);
  if (!selectedSede || /^(todas|global|sede global)$/i.test(selectedSede)) {
    throw new Error('Selecciona una sede antes de configurar el equipo.');
  }
  if (!goalsAccess(user).isGlobal && selectedSede !== canonicalSede(user?.sede)) {
    throw new Error('Solo puedes configurar metas de tu sede.');
  }
  if (!/^[1-9]\d{0,2}$/.test(String(team))) throw new Error('Indica un número de equipo válido.');
  if (goals.some(g => g.scope === 'CICLO' && !g.parentId &&
      canonicalSede(g.sede) === selectedSede && explicitGoalTeam(g) === String(team))) {
    throw new Error('Este equipo ya tiene un ciclo de metas. Revisa sus metas existentes.');
  }
  const common = {
    sede: selectedSede, teamNumber: String(team), ownerId: user.uid || user.id,
    createdAt
  };
  const metrics = [
    ['px', 'Sentados (Px)', 'Cantidad de Px'],
    ['aliados', 'Aliados', 'Cantidad de Aliados'],
    ['managers', 'Managers', 'Cantidad de Managers'],
    ['apoyos', 'Apoyos en Mesa', 'Cantidad de Apoyos']
  ];
  const children = stages.flatMap(stage => metrics.flatMap(([key, label, kpi]) => {
    const raw = targets[stage.id]?.[key];
    if (raw === '' || raw == null || Number(raw) === 0) return [];
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`El objetivo de ${label} en ${stage.name} debe ser un entero positivo.`);
    return [{
      ...common, title: `${label} - ${stage.name}`, kpi, targetValue: value,
      currentValue: 0, progress: 0, scope: 'ENTRENAMIENTO', stage: stage.id,
      cyclePhase: stage.id.startsWith('MJ') ? 'MJ' : stage.id, assignedCoordinators: []
    }];
  }));
  if (!children.length) throw new Error('Define al menos un objetivo aprobado por gerencia. No se copian cuotas de otros equipos.');
  return {
    cycle: {
      ...common, title: `Meta Global del Equipo ${team} (${selectedSede})${cycleName ? ` · ${cycleName}` : ''}`,
      kpi: 'Cumplimiento General (%)', progress: 0, targetValue: 100, currentValue: 0,
      scope: 'CICLO', parentId: null, ownerName: user.displayName || user.name || 'Administrador'
    },
    children
  };
}
