import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UIProvider } from './context/UIContext'
import { ThemeProvider } from './context/ThemeContext'

// Asegurar que la pestaña del navegador siempre cargue el favicon oficial dual (CREAR + Causa OS)
if (typeof document !== 'undefined') {
  const ensureOfficialFavicon = () => {
    try {
      const v = '20261111d';
      const head = document.head || document.getElementsByTagName('head')[0];
      if (!head) return;
      const links = document.querySelectorAll("link[rel*='icon'], link[rel='apple-touch-icon']");
      links.forEach(l => l.remove());
      
      const p = document.createElement('link');
      p.rel = 'icon'; p.type = 'image/png'; p.sizes = '32x32'; p.href = `/favicon.png?v=${v}`;
      head.appendChild(p);

      const s = document.createElement('link');
      s.rel = 'icon'; s.type = 'image/svg+xml'; s.href = `/favicon.svg?v=${v}`;
      head.appendChild(s);

      const i = document.createElement('link');
      i.rel = 'shortcut icon'; i.href = `/favicon.ico?v=${v}`;
      head.appendChild(i);

      const a = document.createElement('link');
      a.rel = 'apple-touch-icon'; a.href = `/apple-touch-icon.png?v=${v}`;
      head.appendChild(a);
    } catch (e) {
      console.warn('[Branding] No se pudo reinyectar favicon:', e);
    }
  };
  ensureOfficialFavicon();
}

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
