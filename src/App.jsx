import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import ManagerGuide from './pages/ManagerGuide'
import DirectorioQT from './pages/DirectorioQT'
import ProtocoloEmergencias from './pages/ProtocoloEmergencias'
import PortfolioBoard from './pages/PortfolioBoard'
import StrategyBoard from './pages/StrategyBoard'
import OfficialAgreements from './pages/OfficialAgreements'
import TeamCalendar from './pages/TeamCalendar'
import EmbudoConversionBoard from './pages/EmbudoConversionBoard'
import BrandScriptBoard from './pages/BrandScriptBoard'
import NodusDataMap from './pages/NodusDataMap'
import CalendarioMJ from './pages/CalendarioMJ'
import GeneradorFlyer from './pages/GeneradorFlyer'
import MonitorVuelosCartas from './pages/MonitorVuelosCartas'
import VendeSinVender from './pages/VendeSinVender'
import MasterclassDistinciones from './pages/MasterclassDistinciones'
import DashboardKpisLima from './pages/DashboardKpisLima'
import CRMBaseMaster from './pages/CRMBaseMaster'
import MonitorImos from './pages/MonitorImos'
import AICopilot from './components/AICopilot'
import PromptModal from './components/PromptModal'
import BirthdayAlert from './components/BirthdayAlert'
import ApdaycPaymentAlert from './components/ApdaycPaymentAlert'
import HelpModal from './components/HelpModal'
import ThemeToggle from './components/ThemeToggle'

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
// NOTA (08/09/2026): "currentUser.isDireccion" es, por defecto, un bypass general —
// cualquier usuario con ese flag en true pasa CUALQUIER RoleRoute, sin importar lo
// que diga allowedRoles. Esto es intencional y se conserva para la enorme mayoría
// de rutas (Dirección normalmente debe poder entrar a todo). Pero hay un puñado de
// rutas donde la Matriz Oficial pide excluir explícitamente a Directivos (p. ej.
// /calendario-mj, /generador-flyer) — para esas, se agregó el prop opcional
// `excludeDireccionBypass` (default false, así que NINGUNA ruta existente cambia de
// comportamiento a menos que lo declare explícitamente). Con
// excludeDireccionBypass=true, isDireccion deja de ser un pase libre y el usuario
// debe estar literalmente en `allowedRoles` (o en su array `roles` para multi-rol) —
// isSuperAdmin SIGUE siendo un bypass total incluso con esta bandera, porque un
// Super Admin debe poder entrar a cualquier sección para soporte/depuración.
function RoleRoute({ children, allowedRoles = [], requireSuperAdmin = false, excludeDireccionBypass = false }) {
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
                    (!excludeDireccionBypass && currentUser.isDireccion) ||
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
  const location = useLocation();
  // /home ya tiene su propio selector "Tema:" inline (junto al selector de Vista) —
  // no se duplica aquí para no repetir el mismo control dos veces en esa página.
  const showFloatingThemeToggle = !location.pathname.startsWith('/home');

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
      {currentUser && <BirthdayAlert />}
      {currentUser && <ApdaycPaymentAlert />}
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
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'qt', 'superadmin', 'consolidado', 'director_maestria']} requireSuperAdmin={false}>
              <ManualGuia />
            </RoleRoute>
          } />

          {/* Narrowed 08/09/2026 to match MANUAL_NODUS_ROLES en Home.jsx y la fila
              "Manual Nodus" de la Matriz Oficial (Directivos, Gerentes, Coordinadores
              C1Y2 y Coordinadores de MJ). Antes incluía literalmente todos los roles
              del sistema (qt, capitan, entrenador, entrenador_llamadas, manager,
              aliado, oficina), permitiendo acceso directo por URL a cualquiera aunque
              el botón/menú ya lo ocultara. */}
          <Route path="/manual-nodus" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'director_maestria', 'superadmin', 'consolidado']} requireSuperAdmin={false}>
              <ManualNodus />
            </RoleRoute>
          } />

          <Route path="/masterclass-distinciones" element={
            <PrivateRoute>
              <MasterclassDistinciones />
            </PrivateRoute>
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



          <Route path="/excelencia" element={
            <PrivateRoute>
              <ExcellenceDashboard />
            </PrivateRoute>
          } />
          
          <Route path="/gerente" element={
            <RoleRoute allowedRoles={['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'superadmin', 'consolidado', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'director_maestria', 'entrenador', 'entrenador_llamadas', 'qt', 'capitan']}>
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
            <RoleRoute allowedRoles={['gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'capitan', 'qt', 'direccion', 'director_maestria', 'aliado', 'manager', 'consolidado', 'superadmin', 'cfo', 'ceo', 'cco']}>
              <ReportesBoard />
            </RoleRoute>
          } />
          <Route path="/micro-pulso" element={
            <PrivateRoute>
              <ReportesBoard />
            </PrivateRoute>
          } />
          <Route path="/reporte-relampago" element={
            <PrivateRoute>
              <ReportesBoard />
            </PrivateRoute>
          } />

          <Route path="/mis-kpis" element={
            <RoleRoute allowedRoles={['coord_c1', 'coord_maestria', 'qt', 'capitan']} requireSuperAdmin={false}>
              <MisKPIs />
            </RoleRoute>
          } />

          {/* Narrowed 08/09/2026: la fila "Auditoría de KPIs" de la Matriz Oficial es
              Directivos + Gerentes únicamente. Antes incluía también coordinadores
              C1Y2 y de MJ, que no figuran en esa fila. /diagnostico-cmj comparte el
              mismo componente (AuditoriaKPIs) y se alinea al mismo criterio. */}
          <Route path="/auditoria-kpis" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'director_maestria']} requireSuperAdmin={false}>
              <AuditoriaKPIs />
            </RoleRoute>
          } />

          <Route path="/diagnostico-cmj" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'director_maestria']} requireSuperAdmin={false}>
              <AuditoriaKPIs defaultTab="cmj" />
            </RoleRoute>
          } />

          <Route path="/superadmin" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'director_maestria']} requireSuperAdmin={false}>
              <SuperAdminPanel />
            </RoleRoute>
          } />
          
          <Route path="/guias/managers" element={
            <PrivateRoute>
              <ManagerGuide />
            </PrivateRoute>
          } />

          <Route path="/centro-managers" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'coordinador_mj', 'coord_maestria', 'entrenador', 'entrenador_llamadas', 'director_maestria']} requireSuperAdmin={false}>
              <CentroManagers />
            </RoleRoute>
          } />

          <Route path="/directorio-qt" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'qt', 'director_maestria']} requireSuperAdmin={false}>
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
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'director_maestria']} requireSuperAdmin={false}>
              <PortfolioBoard />
            </RoleRoute>
          } />

          <Route path="/estrategia" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'director_maestria']} requireSuperAdmin={false}>
              <StrategyBoard />
            </RoleRoute>
          } />

          <Route path="/embudo-conversion" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'entrenador', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coordinador_mj']} requireSuperAdmin={false}>
              <EmbudoConversionBoard />
            </RoleRoute>
          } />

          <Route path="/brandscript" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'entrenador', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coordinador_mj', 'qt', 'capitan']} requireSuperAdmin={false}>
              <BrandScriptBoard />
            </RoleRoute>
          } />

          <Route path="/acuerdos" element={
            <PrivateRoute>
              <OfficialAgreements />
            </PrivateRoute>
          } />

          <Route path="/calendario-equipo" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'director_maestria']} requireSuperAdmin={false}>
              <TeamCalendar />
            </RoleRoute>
          } />

          {/* Nodus Data Map (28/08/2026): mismo criterio de acceso que el Copiloto SO-AR
              y que ROLES_GERENCIA en cloudflare-worker/src/index.js — solo gerencia/dirección,
              decidido así explícitamente con José. */}
          <Route path="/nodus-data-map" element={
            <RoleRoute allowedRoles={['gerente', 'direccion', 'cfo', 'cco', 'ceo', 'director_maestria', 'superadmin', 'consolidado']} requireSuperAdmin={false}>
              <NodusDataMap />
            </RoleRoute>
          } />

          {/* Calendario de Maestría del Juego (29/08/2026): generador/editor del
              calendario oficial por equipo (formato CREAR), pedido por José a
              partir de 3 PDF de ejemplo reales. Ver notas en CalendarioMJ.jsx.
              Narrowed 08/09/2026: José confirmó explícitamente ("sí, así es
              correcto") que SOLO Coordinadores de MJ tienen acceso — se removieron
              direccion/cfo/ceo/cco/gerente/superadmin/consolidado/director_maestria.
              excludeDireccionBypass=true agregado 08/09/2026 (confirmado por José):
              cierra el bypass general de RoleRoute para Directivos en ESTA ruta
              específicamente, así que ahora si un Directivo entra por URL directa
              también es rechazado — antes solo se ocultaba el botón. isSuperAdmin
              sigue teniendo acceso (soporte/depuración). */}
          <Route path="/calendario-mj" element={
            <RoleRoute allowedRoles={['coord_maestria', 'coordinador_mj']} requireSuperAdmin={false} excludeDireccionBypass={true}>
              <CalendarioMJ />
            </RoleRoute>
          } />

          {/* Generador de Flyers Oficiales (02/09/2026): Generador HD 1080x1920 con fechas por sede.
              Narrowed 08/09/2026: José confirmó explícitamente que Directivos NO
              tienen acceso (y director_maestria se trata como Directivos). Se
              removieron direccion/cfo/ceo/cco/superadmin/consolidado/director_maestria
              y se agregaron coord_maestria/coordinador_mj (presentes en la Matriz
              Oficial pero ausentes antes). excludeDireccionBypass=true agregado
              08/09/2026 (confirmado por José), misma razón que en /calendario-mj. */}
          <Route path="/generador-flyer" element={
            <RoleRoute allowedRoles={['gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj']} requireSuperAdmin={false} excludeDireccionBypass={true}>
              <GeneradorFlyer />
            </RoleRoute>
          } />

          {/* Monitor de Vuelos y Cartas Oficiales */}
          {/* Contiene AMBAS: "Monitor de Vuelos" (Directivos+Gerentes) y "Sistema de
              Cartas" (solo Gerentes) como pestañas separadas dentro de
              MonitorVuelosCartas.jsx (08/09/2026) — el guard de ruta debe cubrir la
              UNIÓN de ambas audiencias; el gate fino por pestaña vive dentro del
              componente (canAccessMonitorVuelos / canAccessSistemaCartas). */}
          <Route path="/monitor-vuelos" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'director_maestria']} requireSuperAdmin={false}>
              <MonitorVuelosCartas />
            </RoleRoute>
          } />
          <Route path="/vuelos" element={<Navigate to="/monitor-vuelos" replace />} />
          <Route path="/cartas" element={<Navigate to="/monitor-vuelos" replace />} />
          
          {/* Ampliado 08/09/2026: la fila "Monitor de IMOs" de la Matriz Oficial
              también autoriza a Coordinadores C1Y2 y de MJ (alcance "SOLO LIMA" —
              el enforcement real de sede queda pendiente para Fase 2, no
              implementado aquí). Antes solo dejaba pasar a Directivos/Gerentes,
              igual que Monitor de Vuelos, con el que compartía gate por error. */}
          <Route path="/monitor-imos" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'director_maestria', 'coord_c1', 'coord_maestria']} requireSuperAdmin={false}>
              <MonitorImos />
            </RoleRoute>
          } />
          <Route path="/kpis-lima" element={
            <PrivateRoute>
              <DashboardKpisLima />
            </PrivateRoute>
          } />

          <Route path="/crm-maestro" element={
            <PrivateRoute>
              <CRMBaseMaster />
            </PrivateRoute>
          } />

          {/* Best-Seller Causa OS: Vende Sin Vender */}
          <Route path="/vende-sin-vender" element={
            <PrivateRoute>
              <VendeSinVender />
            </PrivateRoute>
          } />
          <Route path="/causa-vende" element={<Navigate to="/vende-sin-vender" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      
      {/* Botón flotante de ayuda */}
      {currentUser && (
        <>
          {/* Selector Día/Noche/Auto: disponible en toda la plataforma (27/08/2026),
              flotante para no interferir con el layout de cada página. Reutiliza
              ThemeToggle tal cual (mismo componente que ya funcionaba en Home) —
              no se tocó ThemeContext.jsx ni su lógica. */}
          {showFloatingThemeToggle && (
            <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 8500 }}>
              <ThemeToggle />
            </div>
          )}
          {/* Copiloto SO-AR: restringido a Gerentes y Directivos por decisión explícita (26/08/2026) */}
          {(currentUser.isSuperAdmin || currentUser.isGerente || currentUser.isDireccion) && (
            <AICopilot />
          )}
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
