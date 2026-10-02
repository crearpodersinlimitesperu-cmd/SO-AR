// ============================================================================
// SERVICIO DE COMANDO GLOBAL DE MAESTRÍA (ANDRÉS GÓMEZ)
// ============================================================================

export async function getGlobalSupervision() {
  return [
    { id: 'hq_lima', hq: 'Lima', coordinator: 'Renato M.', status: 'HEALTHY', pendingCritical: 0, compliance: 95 },
    { id: 'hq_uio', hq: 'Quito', coordinator: 'Laura G.', status: 'HEALTHY', pendingCritical: 0, compliance: 98 },
    { id: 'hq_mde', hq: 'Medellín', coordinator: 'Andrés G.', status: 'HEALTHY', pendingCritical: 0, compliance: 92 },
    { id: 'hq_gye', hq: 'Guayaquil', coordinator: 'Alexis T.', status: 'HEALTHY', pendingCritical: 1, compliance: 89 },
    { id: 'hq_cue', hq: 'Cuenca', coordinator: 'Diego F.', status: 'HEALTHY', pendingCritical: 0, compliance: 94 },
    { id: 'hq_mex', hq: 'México', coordinator: 'Cirilo A. Martínez', status: 'HEALTHY', pendingCritical: 0, compliance: 96 }
  ];
}

export async function getFuturosImposiblesAudit() {
  return [
    { id: 'audit_01', hq: 'Lima', alertType: 'FAST_APPROVAL', message: 'Tasa de aprobación inusualmente rápida (Sede Lima). 15 futuros aprobados en < 2h. Posible caída de estándar.', severity: 'HIGH' },
    { id: 'audit_02', hq: 'Quito', alertType: 'PENDING_REVIEW', message: 'Retraso de 48h en la revisión de futuros (Sede Quito).', severity: 'MEDIUM' },
    { id: 'audit_03', hq: 'Medellín', alertType: 'NORMAL', message: 'Seguimiento de Futuros Imposibles C1/C2 en ritmo estándar.', severity: 'LOW' }
  ];
}

export async function getTalentAndUltimatums() {
  return {
    expansion: [
      { id: 'exp_01', mission: 'Estructuración y Contratación Medellín (C1, C2, MJ)', deadline: '2026-10-05', status: 'URGENT', progress: 85 },
      { id: 'exp_02', mission: 'Consolidación de Entrenadores México & Perú', deadline: '2026-11-15', status: 'ON_TRACK', progress: 60 }
    ],
    ultimatums: [
      { id: 'ult_01', name: 'Mauricio Ramírez', reason: 'Metas de salud (peso) y preparación técnica', deadline: '2027-01-15', status: 'ACTIVE' }
    ]
  };
}

export async function getNodusCleanKpis() {
  // Sincronización oficial Nodus (con Equipo 1000 excluido)
  return [
    { hq: 'Lima', llamadasEfectivas: 104, llamadasSinRespuesta: 14, retencion: 96 },
    { hq: 'Quito', llamadasEfectivas: 92, llamadasSinRespuesta: 8, retencion: 98 },
    { hq: 'Medellín', llamadasEfectivas: 85, llamadasSinRespuesta: 11, retencion: 91 },
    { hq: 'Guayaquil', llamadasEfectivas: 78, llamadasSinRespuesta: 12, retencion: 89 },
    { hq: 'Cuenca', llamadasEfectivas: 64, llamadasSinRespuesta: 6, retencion: 94 }
  ];
}
