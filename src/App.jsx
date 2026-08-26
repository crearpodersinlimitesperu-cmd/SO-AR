import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useUI } from './context/UIContext'
import './index.css'

import LearningDashboard from './pages/LearningDashboard'
import ExcellenceDashboard from './pages/ExcellenceDashboard'
import Login from './pages/Login'
import Home from './pages/Home'
import RoleSelector from './pages/RoleSelector'
import ChecklistBoard from './pages/ChecklistBoard'
import GerenteDashboard from './pages/GerenteDashboard'
import GoalsBoard from './pages/GoalsBoard'
import ReportesBoard from './pages/ReportesBoard'
import SuperAdminPanel from './pages/SuperAdminPanel'
import ManualGuia from './pages/ManualGuia'
import ManualNodus from './pages/ManualNodus'
import MisKPIs from './pages/MisKPIs'
import AuditoriaKPIs from './pages/AuditoriaKPIs'
import CentroManagers from './pages/CentroManagers'
import DirectorioQT from './pages/DirectorioQT'
import ProtocoloEmergencias from './pages/ProtocoloEmergencias'
import PortfolioBoard from './pages/PortfolioBoard'
import StrategyBoard from './pages/StrategyBoard'
import OfficialAgreements from './pages/OfficialAgreements'
import TeamCalendar from './pages/TeamCalendar'
import EmbudoConversionBoard from './pages/EmbudoConversionBoard'
import AICopilot from './components/AICopilot'
import PromptModal from './components/PromptModal'
import HelpModal from './components/HelpModal'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

// Componente para proteger autenticación básica
function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p className="text-gold">Cargando...</p></div>;
  }
  
  return currentUser ? children : <Navigate to="/login" replace />;
}

// Componente para proteger autorización por Roles (S3 / Audit Fix)
function RoleRoute({ children, allowedRoles = [], requireSuperAdmin = false }) {
  const { currentUser, loading } = useAuth();
  const { showToast } = useUI();
  
  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p className="text-gold">Verificando permisos...</p></div>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Verificación de Super Admin
  if (requireSuperAdmin) {
    if (currentUser.isSuperAdmin) {
      return children;
    }
    showToast("ACCESO DENEGADO: Esta sección requiere privilegios de Super Administrador.", "error");
    return <Navigate to="/home" replace />;
  }

  // Verificación de Roles permitidos
  if (allowedRoles.length > 0) {
    const hasRole = allowedRoles.includes(currentUser.appRole) || 
                    currentUser.isSuperAdmin || 
                    currentUser.isDireccion || 
                    (currentUser.roles || []).some(r => allowedRoles.includes(r));
    if (!hasRole) {
      showToast(`ACCESO DENEGADO: Tu rol actual (${currentUser.appRole}) no tiene acceso a esta sección.`, "error");
      return <Navigate to="/home" replace />;
    }
  }
  
  return children;
}

function App() {
  const { originalAdminUser, currentUser, stopSimulation } = useAuth();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {originalAdminUser && (
        <div style={{
          background: 'var(--crear-gold)',
          color: '#000',
          padding: '0.8rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 'bold',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          position: 'sticky',
          top: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠️ MODO SIMULADOR ACTIVO:</span>
            <span>Estás viendo la plataforma como <strong>{currentUser?.name}</strong></span>
          </div>
          <button 
            onClick={stopSimulation}
            style={{
              background: '#000',
              color: 'var(--crear-gold)',
              border: 'none',
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            ❌ Terminar Simulación
          </button>
        </div>
      )}
      <PromptModal />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<Navigate to="/home" replace />} />
          
          <Route path="/home" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />

          <Route path="/manual" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'qt', 'superadmin', 'consolidado']} requireSuperAdmin={false}>
              <ManualGuia />
            </RoleRoute>
          } />

          <Route path="/manual-nodus" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'superadmin', 'consolidado']} requireSuperAdmin={false}>
              <ManualNodus />
            </RoleRoute>
          } />

          <Route path="/roles" element={
            <PrivateRoute>
              <RoleSelector />
            </PrivateRoute>
          } />
          
          <Route path="/learning" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'director_maestria']}>
              <LearningDashboard />
            </RoleRoute>
          } />

          <Route path="/manual" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'qt']}>
              <ManualGuia />
            </RoleRoute>
          } />

          <Route path="/excelencia" element={
            <PrivateRoute>
              <ExcellenceDashboard />
            </PrivateRoute>
          } />
          
          <Route path="/gerente" element={
            <RoleRoute allowedRoles={['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'superadmin', 'consolidado']}>
              <GerenteDashboard />
            </RoleRoute>
          } />
          
          <Route path="/checklist/:roleId" element={
            <PrivateRoute>
              <ChecklistBoard />
            </PrivateRoute>
          } />

          <Route path="/metas" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado']} requireSuperAdmin={false}>
              <GoalsBoard />
            </RoleRoute>
          } />

          <Route path="/reportes" element={
            <RoleRoute allowedRoles={['gerente', 'coord_c1', 'coord_maestria', 'capitan', 'qt', 'direccion', 'director_maestria']}>
              <ReportesBoard />
            </RoleRoute>
          } />

          <Route path="/mis-kpis" element={
            <RoleRoute allowedRoles={['coord_c1', 'coord_maestria', 'qt', 'capitan']} requireSuperAdmin={false}>
              <MisKPIs />
            </RoleRoute>
          } />

          <Route path="/auditoria-kpis" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado']} requireSuperAdmin={false}>
              <AuditoriaKPIs />
            </RoleRoute>
          } />

          <Route path="/superadmin" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado']} requireSuperAdmin={false}>
              <SuperAdminPanel />
            </RoleRoute>
          } />
          
          <Route path="/centro-managers" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'coordinador_mj', 'coord_maestria', 'entrenador', 'entrenador_llamadas']} requireSuperAdmin={false}>
              <CentroManagers />
            </RoleRoute>
          } />

          <Route path="/directorio-qt" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'qt']} requireSuperAdmin={false}>
              <DirectorioQT />
            </RoleRoute>
          } />

          <Route path="/protocolo-emergencias" element={
            <PrivateRoute>
              <ProtocoloEmergencias />
            </PrivateRoute>
          } />

          {/* PMO Culture Integrations */}
          <Route path="/portafolio" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado']} requireSuperAdmin={false}>
              <PortfolioBoard />
            </RoleRoute>
          } />
          
          <Route path="/estrategia" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado']} requireSuperAdmin={false}>
              <StrategyBoard />
            </RoleRoute>
          } />

          <Route path="/embudo-conversion" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'entrenador', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coordinador_mj']} requireSuperAdmin={false}>
              <EmbudoConversionBoard />
            </RoleRoute>
          } />

          <Route path="/acuerdos" element={
            <PrivateRoute>
              <OfficialAgreements />
            </PrivateRoute>
          } />

          <Route path="/calendario-equipo" element={
            <PrivateRoute>
              <TeamCalendar />
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      
      {/* Botón flotante de ayuda */}
      {currentUser && (
        <>
          <AICopilot />
          <button
            onClick={() => setShowHelp(true)}
            title="Manual y Ayuda"
            style={{
              position: 'fixed',
              bottom: '2rem',
              right: '6.5rem',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--crear-gold)',
              color: '#000',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              cursor: 'pointer',
              zIndex: 9000,
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <HelpCircle size={28} />
          </button>
        </>
      )}

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}

export default App
