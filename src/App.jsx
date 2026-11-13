import { Children, lazy, Suspense, useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useUI } from './context/UIContext'
import { PORTFOLIO_FI_REVIEW_EMAILS, DATA_ADMIN_EMAILS, isElizabethEscobar } from './config/permissions'
import './index.css'
import PromptModal from './components/PromptModal'
import BirthdayAlert from './components/BirthdayAlert'
import ApdaycPaymentAlert from './components/ApdaycPaymentAlert'
import HelpModal from './components/HelpModal'
import ThemeToggle from './components/ThemeToggle'
import MagicalLoadingScreen from './components/MagicalLoadingScreen'
import { HelpCircle, RefreshCw } from 'lucide-react'
import { ModuleUsageProvider, ModuleVisit } from './context/ModuleUsageContext'
import { canEnterRoleRoute } from './utils/routeAccess'
import { ErrorBoundary } from './components/ErrorBoundary';


import Home from './pages/Home';
import CentroManagers from './pages/CentroManagers';
import SuperAdminPanel from './pages/SuperAdminPanel';
import GuiaAliadosC1 from './pages/GuiaAliadosC1';

const ContratoCaminataFuego = lazy(() => import('./pages/ContratoCaminataFuego'));
const MonitorAcreditacionFuegoLima = lazy(() => import('./pages/MonitorAcreditacionFuegoLima'));
const ContratoMaestriaLima = lazy(() => import('./pages/ContratoMaestriaLima'));
const MonitorMaestriaLima = lazy(() => import('./pages/MonitorMaestriaLima'));
const CfoDashboard = lazy(() => import('./pages/CfoDashboard'));
const AICopilot = lazy(() => import('./components/AICopilot'));
const FinanceWorkspace = lazy(() => import('./pages/FinanceWorkspace'));
const AndresCommandCenter = lazy(() => import('./pages/AndresCommandCenter'));
const DatosSedesCartas = lazy(() => import('./pages/DatosSedesCartas'));
const LegalStatusPanel = lazy(() => import('./pages/LegalStatusPanel'));
const Login = lazy(() => import('./pages/Login'));
const OptOutPage = lazy(() => import('./pages/OptOutPage'));
const ElizabethDashboard = lazy(() => import('./pages/ElizabethDashboard'));
const CausaOSTask = lazy(() => import('./pages/CausaOSTask'));
const RoleSelector = lazy(() => import('./pages/RoleSelector'));
const ChecklistBoard = lazy(() => import('./pages/ChecklistBoard'));
const GerenteDashboard = lazy(() => import('./pages/GerenteDashboard'));
const GoalsBoard = lazy(() => import('./pages/GoalsBoard'));
const ReportesBoard = lazy(() => import('./pages/ReportesBoard'));
const ManualGuia = lazy(() => import('./pages/ManualGuia'));
const ManualNodus = lazy(() => import('./pages/ManualNodus'));
const MisKPIs = lazy(() => import('./pages/MisKPIs'));
const AuditoriaKPIs = lazy(() => import('./pages/AuditoriaKPIs'));
const ManagerGuide = lazy(() => import('./pages/ManagerGuide'));
const DirectorioQT = lazy(() => import('./pages/DirectorioQT'));
const PortfolioBoard = lazy(() => import('./pages/PortfolioBoard'));
const OfficialAgreements = lazy(() => import('./pages/OfficialAgreements'));
const TeamCalendar = lazy(() => import('./pages/TeamCalendar'));
const EmbudoConversionBoard = lazy(() => import('./pages/EmbudoConversionBoard'));
const NodusDataMap = lazy(() => import('./pages/NodusDataMap'));
const CalendarioMJ = lazy(() => import('./pages/CalendarioMJ'));
const GeneradorFlyer = lazy(() => import('./pages/GeneradorFlyer'));
const VideoC2ImoReel = lazy(() => import('./pages/VideoC2ImoReel'));
const MonitorVuelosCartas = lazy(() => import('./pages/MonitorVuelosCartas'));
const DashboardKpisLima = lazy(() => import('./pages/DashboardKpisLima'));
const CRMBaseMaster = lazy(() => import('./pages/CRMBaseMaster'));
const MonitorImos = lazy(() => import('./pages/MonitorImos'));
const MatrizEnrolamientoSentados = lazy(() => import('./pages/MatrizEnrolamientoSentados'));
const AsignadorEntrenadores = lazy(() => import('./pages/AsignadorEntrenadores'));
const ComunicadosOperativos = lazy(() => import('./pages/ComunicadosOperativos'));

function RouteLoadingFallback() {
  return <MagicalLoadingScreen message="Abriendo el módulo…" />;
}

function HomeEntry() {
  const { currentUser } = useAuth();
  const location = useLocation();
  if (isElizabethEscobar(currentUser) && !new URLSearchParams(location.search).has('taskId')) {
    return <Navigate to="/elizabeth-dashboard" replace />;
  }
  return <Home />;
}

// Componente para proteger autenticación básica
function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <MagicalLoadingScreen message="Preparando tu espacio de creación…" />;
  }
  
  if (currentUser?.isParticipantOnly) {
    return <Navigate to="/login" replace />;
  }
  return currentUser ? <ModuleVisit>{children}</ModuleVisit> : <Navigate to={`/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`} replace />;
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
function RoleRoute({ children, allowedRoles = [], allowedEmails = [], requireSuperAdmin = false, excludeDireccionBypass = false }) {
  const { currentUser, loading } = useAuth();
  const { showToast } = useUI();

  if (loading) {
    return <MagicalLoadingScreen message="Verificando permisos…" />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.isParticipantOnly) {
    return <Navigate to="/login" replace />;
  }

  // ACCESO TOTAL INCONDICIONAL PARA SUPER ADMIN:
  // Salvo que esté simulando explícitamente a otro colaborador (currentUser.isSimulated),
  // el Super Administrador jamás es bloqueado ni redirigido de ninguna sección.
  if (currentUser.isSuperAdmin && !currentUser.isSimulated) {
    return <ModuleVisit>{children}</ModuleVisit>;
  }

  // (15/09/2026) BUG CRITICO CORREGIDO: este bloque otorgaba "return children"
  // INCONDICIONAL a cualquier usuario en Vista Consolidada, ignorando por completo
  // el array allowedRoles de CADA RoleRoute individual -- incluso rutas que
  // explicitamente excluyen el bypass de Direccion via excludeDireccionBypass=true
  // (ej. /calendario-mj, /generador-flyer) quedaban expuestas igual, porque este
  // bloque se evaluaba ANTES de llegar siquiera a esa logica. El comentario original
  // decia "el usuario ve todo lo que SUS ROLES abarcan" pero el codigo no verificaba
  // los roles reales del usuario en absoluto -- era equivalente a un bypass de
  // SuperAdmin para cualquiera con 2+ roles (ver RoleSelector.jsx: el boton "Vista
  // Consolidada" se ofrece a cualquier usuario con userRoles.length > 1, incluyendo
  // perfiles de bajo privilegio como entrenadores). Confirmado explotable contra 8
  // usuarios reales del catalogo. La proteccion de datos en Firestore SI estaba bien
  // disenada (ver effectiveRole() en firestore.rules, que ya excluye 'consolidado'
  // como rol efectivo valido), pero esta ruta del lado del cliente exponia
  // navegacion/UI a secciones restringidas sin ninguna verificacion real.
  // FIX: se elimina el bypass incondicional. Ahora un usuario en Vista Consolidada
  // sigue el flujo normal de abajo, que YA verifica (linea "roles || []).some(...)")
  // si CUALQUIERA de sus roles reales esta en allowedRoles -- que es exactamente lo
  // que el comentario original decia que debia pasar. Ver tambien el ajuste en el
  // chequeo de abajo para que 'consolidado' (no es un rol real) no cuente como match
  // literal de allowedRoles.includes(currentUser.appRole).

  // Verificación de Super Admin
  if (requireSuperAdmin) {
    if (currentUser.isSuperAdmin) {
      return <ModuleVisit>{children}</ModuleVisit>;
    }
    showToast("ACCESO DENEGADO: Esta sección requiere privilegios de Super Administrador.", "error");
    return <Navigate to="/home" replace />;
  }

  // Verificación de Roles permitidos
  if (allowedRoles.length > 0) {
    const hasRole = canEnterRoleRoute(currentUser, { allowedRoles, allowedEmails, requireSuperAdmin, excludeDireccionBypass });
    if (!hasRole) {
      showToast(`ACCESO DENEGADO: Tu rol actual (${currentUser.appRole}) no tiene acceso a esta sección.`, "error");
      return <Navigate to="/home" replace />;
    }
  }

  return <ModuleVisit>{children}</ModuleVisit>;
}

function PersonalizedRoutes({ children }) {
  // Derive policy from the actual guarded routes, not a second role matrix.
  const routePolicies = Children.toArray(children).flatMap(route => {
    const element = route.props.element;
    if (element?.type !== RoleRoute && element?.type !== PrivateRoute) return [];
    return [{ path: route.props.path, access: element.type === RoleRoute ? element.props : {} }];
  });
  return (
    <ModuleUsageProvider routePolicies={routePolicies}>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>{children}</Routes>
      </Suspense>
    </ModuleUsageProvider>
  );
}

function App() {
  const { originalAdminUser, currentUser, stopSimulation } = useAuth();
  const navigate = useNavigate();
  // Libera la caché heredada del antiguo agente global (varios MB por navegador).
  useEffect(() => {
    try { localStorage.removeItem('CAUSA_FAST_CACHE'); } catch { /* sin acceso a storage */ }
  }, []);

  const [showHelp, setShowHelp] = useState(false);
  const location = useLocation();
  // Selector Día/Noche/Zen/Auto y botón Actualizar disponibles en todos los módulos sin excepción.
  const showFloatingThemeToggle = true;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {originalAdminUser && (
        <div style={{
          background: 'linear-gradient(90deg, #d97706, #f59e0b)',
          color: '#000000',
          padding: '0.65rem 1.8rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 'bold',
          zIndex: 9999,
          boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
          position: 'sticky',
          top: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
            <span style={{ background: '#000', color: '#fbbf24', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🎭 MODO SIMULADOR (CAJA NEGRA)
            </span>
            <span>
              Viendo como: <strong>{currentUser?.name || currentUser?.displayName}</strong> ({currentUser?.email})
            </span>
            <span style={{ opacity: 0.85, fontSize: '0.82rem' }}>
              · Rol: <strong>{currentUser?.appRole || currentUser?.role}</strong> · Sede: <strong>{currentUser?.sede}</strong>
            </span>
            <span style={{ opacity: 0.78, fontSize: '0.78rem' }}>
              · Las preferencias viven en el navegador de cada usuario y no aplican al simular.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => {
                stopSimulation();
                navigate('/home', { replace: true });
              }}
              style={{
                background: '#000000',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                padding: '0.45rem 1.1rem',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              ❌ Terminar Simulación
            </button>
          </div>
        </div>
      )}
      <PromptModal />
      {currentUser && <BirthdayAlert />}
      {currentUser && <ApdaycPaymentAlert />}
      <main style={{ flex: 1 }}>
        <PersonalizedRoutes>
          <Route path="/login" element={<Login />} />
          <Route path="/opt-out" element={<OptOutPage />} />
          <Route path="/caminata-fuego" element={<ContratoCaminataFuego />} />
          <Route path="/contrato-caminata-fuego" element={<ContratoCaminataFuego />} />
          <Route path="/contrato_caminata_fuego.html" element={<Navigate to="/caminata-fuego" replace />} />
          <Route path="/firewalking" element={<Navigate to="/caminata-fuego" replace />} />
          <Route path="/monitor-fuego-lima" element={
            <RoleRoute allowedRoles={['gerente', 'coordinador_mj', 'coord_maestria', 'coordinacion', 'oficina', 'contabilidad', 'contador', 'finanzas', 'facturacion', 'legal', 'juridico', 'director_maestria', 'direccion', 'cfo', 'ceo', 'cco', 'superadmin']} requireSuperAdmin={false}>
              <MonitorAcreditacionFuegoLima />
            </RoleRoute>
          } />
          <Route path="/acreditacion-fuego-lima" element={<Navigate to="/monitor-fuego-lima" replace />} />
          <Route path="/reglas-maestria" element={<ContratoMaestriaLima />} />
          <Route path="/reglas_maestria_lima.html" element={<Navigate to="/reglas-maestria" replace />} />
          <Route path="/contrato-maestria-lima" element={<ContratoMaestriaLima />} />
          <Route path="/maestria-lima" element={<ContratoMaestriaLima />} />
          <Route path="/monitor-maestria-lima" element={
            <RoleRoute allowedRoles={['gerente', 'coordinador_mj', 'coord_maestria', 'coordinacion', 'oficina', 'contabilidad', 'contador', 'finanzas', 'facturacion', 'legal', 'juridico', 'director_maestria', 'direccion', 'cfo', 'ceo', 'cco', 'superadmin']} requireSuperAdmin={false}>
              <MonitorMaestriaLima />
            </RoleRoute>
          } />
          <Route path="/supervision-maestria-lima" element={<Navigate to="/monitor-maestria-lima" replace />} />
          <Route path="/causa-os-task" element={
            <RoleRoute allowedRoles={['gerente', 'direccion', 'director_maestria', 'cfo', 'cco', 'ceo', 'socio', 'superadmin']}>
              <CausaOSTask />
            </RoleRoute>
          } />

          
          <Route path="/" element={<Navigate to="/home" replace />} />
          
          <Route path="/legal-admin" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'legal', 'juridico']} allowedEmails={DATA_ADMIN_EMAILS} requireSuperAdmin={false}>
              <LegalStatusPanel />
            </RoleRoute>
          } />
          <Route path="/legal-audit" element={<Navigate to="/legal-admin" replace />} />
          <Route path="/cfo-dashboard" element={
            <RoleRoute allowedRoles={['cfo', 'ceo', 'superadmin', 'direccion']} requireSuperAdmin={false}>
              <CfoDashboard />
            </RoleRoute>
          } />
          <Route path="/finance-workspace" element={
            <RoleRoute allowedRoles={['finanzas', 'facturacion', 'contador', 'superadmin']} requireSuperAdmin={false}>
              <FinanceWorkspace />
            </RoleRoute>
          } />
          <Route path="/maestria-global" element={<Navigate to="/andres-command-center" replace />} />
          <Route path="/trainer-hub" element={<Navigate to="/home" replace />} />
          <Route path="/call-coach-crm" element={<Navigate to="/home" replace />} />
          <Route path="/andres-command-center" element={
            <RoleRoute allowedRoles={['coord_maestria_global', 'director_maestria', 'superadmin', 'ceo', 'direccion']} requireSuperAdmin={false}>
              <AndresCommandCenter />
            </RoleRoute>
          } />
          <Route path="/home" element={
            <PrivateRoute>
              <HomeEntry />
            </PrivateRoute>
          } />
          <Route path="/home-completo" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />
          <Route path="/elizabeth-dashboard" element={
            <RoleRoute allowedRoles={['cfo']} allowedEmails={['contabilidad.global@crearpsl.net']} requireSuperAdmin={false}>
              <ElizabethDashboard />
            </RoleRoute>
          } />

          <Route path="/manual" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_jr', 'coord_maestria', 'coordinador_mj', 'qt', 'superadmin', 'consolidado', 'director_maestria']} requireSuperAdmin={false}>
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
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_jr', 'coord_maestria', 'coordinador_mj', 'qt', 'director_maestria', 'superadmin', 'consolidado']} requireSuperAdmin={false}>
              <ManualNodus />
            </RoleRoute>
          } />

          <Route path="/roles" element={
            <PrivateRoute>
              <RoleSelector />
            </PrivateRoute>
          } />
          
          <Route path="/gerente" element={
            <RoleRoute allowedRoles={['gerente', 'direccion', 'cfo', 'ceo', 'cco', 'superadmin', 'consolidado', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'director_maestria', 'entrenador', 'entrenador_llamadas', 'qt', 'capitan']}>
              <GerenteDashboard />
            </RoleRoute>
          } />
          <Route path="/gerente-dashboard" element={<Navigate to="/gerente" replace />} />
          
          <Route path="/checklist" element={
            <PrivateRoute>
              <ChecklistBoard />
            </PrivateRoute>
          } />
          <Route path="/checklist/undefined" element={
            <PrivateRoute>
              <ChecklistBoard />
            </PrivateRoute>
          } />
          <Route path="/checklist/:roleId" element={
            <PrivateRoute>
              <ChecklistBoard />
            </PrivateRoute>
          } />

          <Route path="/metas" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_jr', 'coord_maestria', 'coordinador_mj', 'coord_maestria_global', 'director_maestria', 'coordinador', 'qt', 'capitan', 'entrenador', 'entrenador_llamadas', 'finanzas', 'facturacion', 'contador', 'talento_humano', 'rrhh', 'legal', 'juridico', 'aliado', 'manager']} requireSuperAdmin={false}>
              <GoalsBoard />
            </RoleRoute>
          } />

          <Route path="/reportes" element={
            <RoleRoute allowedRoles={['gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'capitan', 'qt', 'direccion', 'director_maestria', 'aliado', 'manager', 'consolidado', 'superadmin', 'cfo', 'ceo', 'cco']}>
              <ReportesBoard />
            </RoleRoute>
          } />
          <Route path="/micro-pulso" element={<Navigate to="/reportes?type=micro-pulso" replace />} />
          <Route path="/reporte-relampago" element={<Navigate to="/reportes?type=relampago" replace />} />

          <Route path="/mis-kpis" element={
            <PrivateRoute>
              <MisKPIs />
            </PrivateRoute>
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
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj', 'coord_jr', 'coordinador', 'coordinacion', 'coordinadora', 'coordinador_general', 'superadmin', 'consolidado', 'director_maestria', 'talento_humano', 'rrhh']} requireSuperAdmin={false}>
              <SuperAdminPanel />
            </RoleRoute>
          } />
          <Route path="/admin" element={<Navigate to="/superadmin" replace />} />
          
          <Route path="/guias/managers" element={
            <PrivateRoute>
              <ManagerGuide />
            </PrivateRoute>
          } />

          <Route path="/guia-aliados-c1" element={
            <PrivateRoute>
              <GuiaAliadosC1 />
            </PrivateRoute>
          } />
          <Route path="/guias/aliados-c1" element={<Navigate to="/guia-aliados-c1" replace />} />

          <Route path="/centro-managers" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'observador', 'consolidado', 'coordinador_mj', 'coord_maestria', 'entrenador', 'entrenador_llamadas', 'director_maestria']} requireSuperAdmin={false}>
              <CentroManagers />
            </RoleRoute>
          } />

          <Route path="/directorio-qt" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_jr', 'coord_maestria', 'coordinador_mj', 'qt', 'director_maestria']} requireSuperAdmin={false}>
              <DirectorioQT />
            </RoleRoute>
          } />

          {/* PMO Culture Integrations */}
          <Route path="/portafolio" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'director_maestria']} allowedEmails={PORTFOLIO_FI_REVIEW_EMAILS} requireSuperAdmin={false}>
              <PortfolioBoard />
            </RoleRoute>
          } />
          <Route path="/portfolio" element={<Navigate to="/portafolio" replace />} />
          <Route path="/pmo" element={<Navigate to="/portafolio" replace />} />

          {/* Acceso Directo Oficial: Auditor de Resultados Imposibles (IA) */}
          <Route path="/resultados-imposibles" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'director_maestria', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_jr', 'coord_maestria', 'coordinador_mj', 'entrenador', 'entrenador_llamadas', 'qt', 'capitan']} allowedEmails={PORTFOLIO_FI_REVIEW_EMAILS} requireSuperAdmin={false}>
              <PortfolioBoard initialTab="futuros_imposibles" />
            </RoleRoute>
          } />
          <Route path="/futuros-imposibles" element={<Navigate to="/resultados-imposibles" replace />} />

          <Route path="/embudo-conversion" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'director_maestria', 'entrenador', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj']} requireSuperAdmin={false}>
              <EmbudoConversionBoard />
            </RoleRoute>
          } />
          <Route path="/embudo" element={<Navigate to="/embudo-conversion" replace />} />

          <Route path="/acuerdos" element={
            <PrivateRoute>
              <OfficialAgreements />
            </PrivateRoute>
          } />

          <Route path="/calendario-equipo" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_jr', 'coord_maestria', 'coordinador_mj', 'coord_maestria_global', 'director_maestria', 'qt', 'capitan', 'entrenador', 'entrenador_llamadas', 'finanzas', 'facturacion', 'contador', 'talento_humano', 'rrhh', 'legal', 'juridico']} requireSuperAdmin={false}>
              <TeamCalendar />
            </RoleRoute>
          } />
          <Route path="/calendario" element={<Navigate to="/calendario-equipo" replace />} />

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
              partir de 3 PDF de ejemplo reales. Ver notas en CalendarioMJ.jsx. */}
          <Route path="/calendario-mj" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj']} requireSuperAdmin={false}>
              <CalendarioMJ />
            </RoleRoute>
          } />

          {/* Generador de Flyers Oficiales (02/09/2026): Generador HD 1080x1920 con fechas por sede. */}
          <Route path="/generador-flyer" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj']} requireSuperAdmin={false}>
              <ErrorBoundary><GeneradorFlyer /></ErrorBoundary>
            </RoleRoute>
          } />

          {/* Video Reel Dinámico Vuelos C2 para IMOs */}
          <Route path="/video-c2-imo" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'director_maestria', 'superadmin', 'consolidado', 'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj']} requireSuperAdmin={false}>
              <ErrorBoundary><VideoC2ImoReel /></ErrorBoundary>
            </RoleRoute>
          } />

          {/* Monitor de Vuelos y Cartas Oficiales */}
          {/* Contiene AMBAS: "Monitor de Vuelos" (Directivos+Gerentes) y "Sistema de
              Cartas" (Gerentes+Coordinadores) como pestañas separadas dentro de
              MonitorVuelosCartas.jsx — el guard de ruta debe cubrir la
              UNIÓN de ambas audiencias; el gate fino por pestaña vive dentro del
              componente (canAccessMonitorVuelos / canAccessSistemaCartas). */}
          <Route path="/monitor-vuelos" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'director_maestria', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj']} requireSuperAdmin={false}>
              <MonitorVuelosCartas />
            </RoleRoute>
          } />
          <Route path="/vuelos" element={<Navigate to="/monitor-vuelos" replace />} />
          <Route path="/datos-sedes-cartas" element={<PrivateRoute><DatosSedesCartas /></PrivateRoute>} />
          <Route path="/cartas" element={<Navigate to="/monitor-vuelos" replace />} />
          
          {/* Ampliado 08/09/2026: la fila "Monitor de IMOs" de la Matriz Oficial
              también autoriza a Coordinadores C1Y2 y de MJ. */}
          <Route path="/monitor-imos" element={
            <RoleRoute allowedRoles={['direccion', 'cfo', 'ceo', 'cco', 'gerente', 'superadmin', 'consolidado', 'director_maestria', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_maestria', 'coordinador_mj']} requireSuperAdmin={false}>
              <MonitorImos />
            </RoleRoute>
          } />
          <Route path="/matriz-enrolamiento-sentados" element={
            <PrivateRoute>
              <MatrizEnrolamientoSentados />
            </PrivateRoute>
          } />
          <Route path="/reporte-equipos-sentados" element={<Navigate to="/matriz-enrolamiento-sentados" replace />} />

          {/* (20/09/2026) Asignador Oficial de Entrenadores. El control de acceso
              real (solo Fer, Paul y José) vive dentro del componente vía
              canUseAsignadorEntrenadores(); PrivateRoute solo exige sesión. */}
          <Route path="/asignador-entrenadores" element={
            <PrivateRoute>
              <AsignadorEntrenadores />
            </PrivateRoute>
          } />
          <Route path="/asignador" element={<Navigate to="/asignador-entrenadores" replace />} />
          <Route path="/cronograma-maestro" element={<Navigate to="/asignador-entrenadores" replace />} />
          <Route path="/comunicados" element={<PrivateRoute><ComunicadosOperativos /></PrivateRoute>} />

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

          <Route path="/actividadcoordinadores" element={<Navigate to="/auditoria-kpis" replace />} />
          <Route path="/coordinadores-nodus" element={<Navigate to="/auditoria-kpis" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </PersonalizedRoutes>
      </main>
      
      {/* Botón flotante de ayuda */}
      {currentUser && (
        <>
          {/* Selector Día/Noche/Auto: disponible en toda la plataforma (27/08/2026),
              flotante para no interferir con el layout de cada página. Reutiliza
              ThemeToggle tal cual (mismo componente que ya funcionaba en Home) —
              no se tocó ThemeContext.jsx ni su lógica. */}
          {showFloatingThemeToggle && (
            <div className="no-print floating-theme-toggle" style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 8500 }}>
              <ThemeToggle />
            </div>
          )}
          <button
            type="button"
            className="no-print floating-refresh-btn"
            onClick={() => window.location.reload()}
            title="Actualizar Causa OS sin cerrar la sesión"
            aria-label="Actualizar Causa OS; la sesión se conserva"
            style={{
              position: 'fixed',
              top: '4.5rem',
              right: '1.25rem',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--bg-dark-alt)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--card-shadow)',
              cursor: 'pointer',
              zIndex: 8500
            }}
          >
            <RefreshCw size={19} />
          </button>
          {/* Copiloto SO-AR: restringido a Gerentes y Directivos por decisión explícita (26/08/2026) */}
          {(currentUser.isSuperAdmin || currentUser.isGerente || currentUser.isDireccion) && (
            <div className="no-print">
              <Suspense fallback={null}>
                <AICopilot />
              </Suspense>
            </div>
          )}
          <button
            className="no-print floating-help-btn"
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

      <div className="no-print">
        <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      </div>
    </div>
  )
}

export default App
