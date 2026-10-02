// ============================================================================
// SERVICIO DE RIESGO Y CUMPLIMIENTO (LEGAL GLOBAL)
// ============================================================================

export async function getArcoTickets() {
  return [
    { id: 'arco_101', requester: 'María López', type: 'Cancelación de Datos', daysLeft: 3, status: 'CRITICAL', sede: 'Lima' },
    { id: 'arco_102', requester: 'Juan Pérez', type: 'Acceso y Rectificación', daysLeft: 12, status: 'WARNING', sede: 'Bogotá' },
    { id: 'arco_103', requester: 'Carlos Ruiz', type: 'Oposición (Mailing)', daysLeft: 18, status: 'HEALTHY', sede: 'Quito' }
  ];
}

export async function getIpTracker() {
  return {
    preparation: [
      { id: 'ip_01', asset: 'Perfil Oficial Wikipedia', type: 'Defensa IP', status: 'Drafting' }
    ],
    filing: [
      { id: 'ip_02', asset: 'Marca "Noda"', type: 'Registro Comercial', status: 'En Trámite (Indecopi/IMPI)' },
      { id: 'ip_03', asset: 'Marca "Neck"', type: 'Registro Comercial', status: 'En Trámite' }
    ],
    secured: [
      { id: 'ip_04', asset: 'Tecnología NEC', type: 'Patente / Derechos', status: 'Asegurado' }
    ]
  };
}

export async function getNdaMatrix() {
  return [
    { id: 'nda_101', staffName: 'Entrenador A. Díaz', role: 'Entrenador', ndaStatus: 'SIGNED', canTrain: true },
    { id: 'nda_102', staffName: 'Coordinador M. Ruiz', role: 'Maestría', ndaStatus: 'EXPIRED', canTrain: false },
    { id: 'nda_103', staffName: 'Entrenador F. Aragón', role: 'Entrenador', ndaStatus: 'SIGNED', canTrain: true },
    { id: 'nda_104', staffName: 'Gerencia Bogotá', role: 'Gerente', ndaStatus: 'MISSING', canTrain: false }
  ];
}
