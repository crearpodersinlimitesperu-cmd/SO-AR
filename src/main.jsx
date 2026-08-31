import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { ChecklistProvider } from './context/ChecklistContext'
import { AuthProvider } from './context/AuthContext'
import { CyclesProvider } from './context/CyclesContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UIProvider } from './context/UIContext'
import { NotificationProvider } from './context/NotificationContext'
import { ThemeProvider } from './context/ThemeContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <UIProvider>
            <AuthProvider>
              <NotificationProvider>
                <CyclesProvider>
                  <ChecklistProvider>
                    <App />
                  </ChecklistProvider>
                </CyclesProvider>
              </NotificationProvider>
            </AuthProvider>
          </UIProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
