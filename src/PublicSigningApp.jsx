import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import OnboardingLegal from './pages/OnboardingLegal'

// Entrada ligera para el link público de firma (/dna, /onboarding-legal): no carga
// el resto de Causa OS (módulos, contextos de tareas/ciclos), solo lo necesario
// para firmar. Así abre en una fracción del tiempo, sobre todo en celular.
export default function PublicSigningApp() {
  return (
    <Routes>
      <Route path="/dna" element={<OnboardingLegal />} />
      <Route path="/onboarding-legal" element={<OnboardingLegal />} />
      <Route path="*" element={<Navigate to="/onboarding-legal" replace />} />
    </Routes>
  )
}
