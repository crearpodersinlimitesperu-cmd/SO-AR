// ============================================================================
// SERVICIO DE TALENTO HUMANO GLOBAL (HR COMMAND CENTER)
// ============================================================================

export async function getAttentionIndex() {
  return [
    { id: 'usr_101', name: 'Marco Perez', role: 'QT Lima', fallosTotales: 3, lastFallo: 'Hace 2 días', status: 'CRITICAL' },
    { id: 'usr_102', name: 'Laura Gómez', role: 'Coord. C1 Quito', fallosTotales: 1, lastFallo: 'Hace 1 semana', status: 'WARNING' },
    { id: 'usr_103', name: 'Equipo QT Guayaquil', role: 'Staff General', fallosTotales: 0, lastFallo: 'N/A', status: 'HEALTHY' }
  ];
}

export async function getUltimatums() {
  return [
    { id: 'ult_01', name: 'Mauricio R.', reason: 'Acondicionamiento Físico y Técnico', deadline: '2026-10-15', status: 'ACTIVE', supervisor: 'Andrés Gómez' },
    { id: 'ult_02', name: 'Carlos T.', reason: 'SLA de Reclutamiento Incumplido', deadline: '2026-10-05', status: 'URGENT', supervisor: 'Dirección' }
  ];
}

export async function getLegalRadar() {
  return [
    { id: 'leg_01', name: 'Andrés Idrobo', type: 'Seguro Internacional', expiry: '2026-10-10', status: 'EXPIRES_SOON' },
    { id: 'leg_02', name: 'Erica Logacho', type: 'Renovación Contrato', expiry: '2026-10-01', status: 'EXPIRED' },
    { id: 'leg_03', name: 'Alejandro Díaz', type: 'Pasaporte', expiry: '2028-05-20', status: 'VALID' }
  ];
}

export async function getRecruitmentPipeline() {
  return {
    sourcing: [
      { id: 'req_01', position: 'Logística de Piso (QT)', location: 'Bogotá', urgency: 'HIGH' }
    ],
    interview: [
      { id: 'req_02', position: 'Analista Financiero', location: 'Medellín', urgency: 'MEDIUM' }
    ],
    onboarding: [
      { id: 'req_03', position: 'Asistente Comercial', location: 'Lima', pendingNDAs: true }
    ]
  };
}
