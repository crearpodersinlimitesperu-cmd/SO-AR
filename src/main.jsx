import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UIProvider } from './context/UIContext'
import { ThemeProvider } from './context/ThemeContext'

// Manejar recarga transparente ante nuevas versiones de la app o desincronización de chunks de Vite
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Causa OS] Nueva versión detectada o fallo de módulo dinámico. Actualizando...', event);
    event.preventDefault();
    const reloadKey = 'causa:vite-preload-reload';
    const lastReload = Number(sessionStorage.getItem(reloadKey) || 0);
    const now = Date.now();
    if (now - lastReload > 6000) {
      sessionStorage.setItem(reloadKey, String(now));
      const targetUrl = new URL(window.location.href);
      targetUrl.searchParams.set('_v', String(now));
      window.location.replace(targetUrl.toString());
    }
  });
}

// Link público de firma legal: se monta una versión ligera (sin los contextos
// y módulos pesados del resto de la plataforma) para que cargue rápido.
const path = window.location.pathname.replace(/\/+$/, '')
const isPublicSigning = path === '/dna' || path === '/onboarding-legal'

const root = ReactDOM.createRoot(document.getElementById('root'))

if (path === '/mision-imo') {
  import('./features/imo/MissionPortal.jsx').then(({ default: MissionPortal }) => {
    root.render(<React.StrictMode><ErrorBoundary><MissionPortal /></ErrorBoundary></React.StrictMode>)
  })
} else if (isPublicSigning) {
  import('./PublicSigningApp.jsx').then(({ default: PublicSigningApp }) => {
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <ThemeProvider>
              <UIProvider>
                <AuthProvider>
                  <PublicSigningApp />
                </AuthProvider>
              </UIProvider>
            </ThemeProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </React.StrictMode>,
    )
  })
} else {
  import('./FullApp.jsx').then(({ default: FullApp }) => {
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <FullApp />
        </ErrorBoundary>
      </React.StrictMode>,
    )
  })
}
