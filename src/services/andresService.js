// ============================================================================
// SERVICIO DE COMANDO GLOBAL DE MAESTRÍA (ANDRÉS GÓMEZ)
// ============================================================================

export async function getGlobalSupervision() {
  return [
    { id: 'hq_lima', hq: 'Lima', coordinator: 'Renato M.', status: 'HEALTHY', pendingCritical: 0, compliance: 95 },
    { id: 'hq_mex', hq: 'México', coordinator: 'Cirilo A.', status: 'WARNING', pendingCritical: 2, compliance: 82 },
    { id: 'hq_uio', hq: 'Quito', coordinator: 'Laura G.', status: 'HEALTHY', pendingCritical: 0, compliance: 98 },
    { id: 'hq_bog', hq: 'Bogotá', coordinator: 'TBD', status: 'CRITICAL', pendingCritical: 5, compliance: 45 }
  ];
}

export async function getFuturosImposiblesAudit() {
  return [
    { id: 'audit_01', hq: 'Lima', alertType: 'FAST_APPROVAL', message: 'Tasa de aprobación inusualmente rápida (Sede Lima). 15 futuros aprobados en < 2h. Posible caída de estándar.', severity: 'HIGH' },
    { id: 'audit_02', hq: 'Quito', alertType: 'PENDING_REVIEW', message: 'Retraso de 48h en la revisión de futuros (Sede Quito).', severity: 'MEDIUM' }
  ];
}

export async function getTalentAndUltimatums() {
  return {
    expansion: [
      { id: 'exp_01', mission: 'Estructuración y Contratación Medellín (C1, C2, MJ)', deadline: '2026-10-05', status: 'URGENT', progress: 80 }
    ],
    ultimatums: [
      { id: 'ult_01', name: 'Mauricio Ramírez', reason: 'Metas de salud (peso) y preparación técnica', deadline: '2027-01-15', status: 'ACTIVE' }
    ]
  };
}

export async function getNodusCleanKpis() {
  // Simulando el filtro de "Equipo 1000"
  return [
    { hq: 'Lima', llamadasEfectivas: 88, llamadasSinRespuesta: 12, retencion: 96 },
    { hq: 'Quito', llamadasEfectivas: 92, llamadasSinRespuesta: 8, retencion: 98 },
    { hq: 'Bogotá', llamadasEfectivas: 75, llamadasSinRespuesta: 25, retencion: 85 }
  ];
}
