import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UIProvider } from './context/UIContext'
import { ThemeProvider } from './context/ThemeContext'

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
