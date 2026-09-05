import React from 'react';
import CMJDiagnosticsDashboard from './CMJDiagnosticsDashboard';

/**
 * CMJDashboard - Wrapper de compatibilidad para Diagnóstico de CMJs (Maestría del Juego)
 * CREAR PODER SIN LÍMITES - Causa OS
 */
export default function CMJDashboard({ globalFilterSede }) {
  return <CMJDiagnosticsDashboard globalFilterSede={globalFilterSede} />;
}
