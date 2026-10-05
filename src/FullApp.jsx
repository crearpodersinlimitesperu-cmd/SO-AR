import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ChecklistProvider } from './context/ChecklistContext'
import { AuthProvider } from './context/AuthContext'
import { CyclesProvider } from './context/CyclesContext'
import { UIProvider } from './context/UIContext'
import { NotificationProvider } from './context/NotificationContext'
import { ThemeProvider } from './context/ThemeContext'

export default function FullApp() {
  return (
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
  )
}
