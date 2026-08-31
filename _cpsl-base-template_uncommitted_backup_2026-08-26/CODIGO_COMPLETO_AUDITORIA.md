# 📑 REPORTE INTEGRAL DE AUDITORÍA DE CÓDIGO FUENTE
### **CREAR PODER SIN LÍMITES — SISTEMA OPERATIVO SO-AR**
**Fecha y Hora de Actualización:** `2026-08-17 20:53:51`  
**Versión de Producción:** `v2.4.6 (Master Checklist V1.0, Multi-Rol, QT Verificado, Modo Día/Noche)`  
**Total de Archivos Auditados:** `65`

---

## 🏛️ Resumen de Arquitectura y Módulos Activos

1. **Autenticación y Control de Acceso RBAC (`AuthContext.jsx`, `usersData.js`):**
   - Autenticación Google OAuth2 integrada con verificación contra base de datos oficial.
   - Perfiles Multi-Rol (`roles: ['coordinador_mj', 'coordinador_c1c2', 'qt']`) con **Role Switcher dinámico**.
   - Unificación de cuentas corporativas `@crearpsl.net` y personales Gmail sin duplicación.

2. **Base de Datos y Perfiles Quantum Team (QT):**
   - 24 perfiles verificados y deduplicados con validación de código de país por sede y documentos oficiales.
   - Acceso restringido exclusivamente a las fases **PRE-C1, C1 y C2**.

3. **Estandarización de Sedes Oficiales:**
   - 7 Sedes Operativas: **Lima**, **Quito Ciclo 1**, **Quito Ciclo 2**, **Cuenca**, **Guayaquil**, **Medellín**, **México**.
   - Separación formal de **Sede Global** para personal directivo y soporte.

4. **Agendamiento Híbrido Zero-Failure a Google Calendar (`googleSync.js`, `venuesData.js`):**
   - Resolución automática de hoteles oficiales (**Hotel José Antonio Deluxe Miraflores** para Lima Sala; **Hostal Sol y Luna en Cieneguilla** para El Viaje).
   - Enlace directo interactivo a **Google Maps** y fallback directo a Google Calendar Web prellenado.

5. **Colaboración y Menciones entre Tareas (`TaskCollaborationModal.jsx`, `ChecklistContext.jsx`):**
   - Asignación de colaboradores con invitaciones interactivas, aceptación en 1 clic y sincronización en tiempo real.

6. **División Equitativa de Metas (`GoalDivisionModal.jsx`, `GoalsBoard.jsx`):**
   - Reparto proporcional entre coordinadoras con reporte de cuotas y acumulación automática en Firestore.

7. **Compatibilidad Dual Total (Modo Día / Modo Noche / Automático):**
   - Sistema de diseño con variables CSS de alto contraste (`--text-heading: #0f172a` en modo día).

8. **Master Checklist Operativo Gerente Sede V1.0 (`MASTER_CHECKLIST_OPERATIVO_GERENTE_SEDE_V1.md`):**
   - Ciclo Operativo oficializado: **MJ → C1 → C2 → MJ**.
   - Gates estrictos T-30 (Entrenador y Logística Pagada) y Gate C2→MJ (Meta de Rezagados).
   - Terminología purificada (Equipo de Apoyo en lugar de QT, hitos temporales normalizados).

---

## 📦 Índice de Archivos en el Paquete de Auditoría

- [`.env.example`](.env.example) — *0.3 KB*
- [`.oxlintrc.json`](.oxlintrc.json) — *0.2 KB*
- [`Codigo_Fuente_Revisar_IA.md`](Codigo_Fuente_Revisar_IA.md) — *107.1 KB*
- [`MASTER_CHECKLIST_OPERATIVO_GERENTE_SEDE_V1.md`](MASTER_CHECKLIST_OPERATIVO_GERENTE_SEDE_V1.md) — *8.8 KB*
- [`docs/01_Arquitectura_del_Sistema.md`](docs/01_Arquitectura_del_Sistema.md) — *0.4 KB*
- [`docs/02_Modelo_de_Datos.md`](docs/02_Modelo_de_Datos.md) — *0.4 KB*
- [`docs/03_Mapa_de_Roles.md`](docs/03_Mapa_de_Roles.md) — *0.4 KB*
- [`docs/04_Mapa_de_Permisos.md`](docs/04_Mapa_de_Permisos.md) — *0.2 KB*
- [`docs/05_Flujo_de_Ciclos.md`](docs/05_Flujo_de_Ciclos.md) — *0.4 KB*
- [`docs/06_Manual_Usuario.md`](docs/06_Manual_Usuario.md) — *0.3 KB*
- [`docs/07_Manual_Administrador.md`](docs/07_Manual_Administrador.md) — *0.3 KB*
- [`docs/08_Configuracion_Checklists.md`](docs/08_Configuracion_Checklists.md) — *0.2 KB*
- [`docs/09_Lista_Funcionalidades.md`](docs/09_Lista_Funcionalidades.md) — *0.5 KB*
- [`docs/10_Funcionalidades_Pendientes.md`](docs/10_Funcionalidades_Pendientes.md) — *0.2 KB*
- [`docs/11_Pruebas_Realizadas.md`](docs/11_Pruebas_Realizadas.md) — *0.2 KB*
- [`docs/12_Riesgos_Detectados.md`](docs/12_Riesgos_Detectados.md) — *0.5 KB*
- [`docs/13_Instrucciones_Despliegue.md`](docs/13_Instrucciones_Despliegue.md) — *0.3 KB*
- [`docs/14_Instrucciones_Mantenimiento.md`](docs/14_Instrucciones_Mantenimiento.md) — *0.3 KB*
- [`docs/MASTER_CHECKLIST_OPERATIVO_GERENTE_SEDE_V1.md`](docs/MASTER_CHECKLIST_OPERATIVO_GERENTE_SEDE_V1.md) — *16.7 KB*
- [`firestore.rules`](firestore.rules) — *3.1 KB*
- [`index.html`](index.html) — *0.9 KB*
- [`package-lock.json`](package-lock.json) — *82.7 KB*
- [`package.json`](package.json) — *0.7 KB*
- [`scripts/mailerDaemon.js`](scripts/mailerDaemon.js) — *3.8 KB*
- [`src/App.css`](src/App.css) — *0.0 KB*
- [`src/App.jsx`](src/App.jsx) — *3.7 KB*
- [`src/components/ErrorBoundary.jsx`](src/components/ErrorBoundary.jsx) — *2.6 KB*
- [`src/components/GoalDivisionModal.jsx`](src/components/GoalDivisionModal.jsx) — *15.1 KB*
- [`src/components/PromptModal.jsx`](src/components/PromptModal.jsx) — *2.1 KB*
- [`src/components/TaskAssignmentModal.jsx`](src/components/TaskAssignmentModal.jsx) — *7.2 KB*
- [`src/components/TaskCollaborationModal.jsx`](src/components/TaskCollaborationModal.jsx) — *9.4 KB*
- [`src/components/ThemeSelector.jsx`](src/components/ThemeSelector.jsx) — *3.9 KB*
- [`src/components/UserProfileModal.jsx`](src/components/UserProfileModal.jsx) — *31.5 KB*
- [`src/components/VenueConfigModal.jsx`](src/components/VenueConfigModal.jsx) — *11.9 KB*
- [`src/config/permissions.js`](src/config/permissions.js) — *3.2 KB*
- [`src/context/AuthContext.jsx`](src/context/AuthContext.jsx) — *5.9 KB*
- [`src/context/ChecklistContext.jsx`](src/context/ChecklistContext.jsx) — *15.6 KB*
- [`src/context/CyclesContext.jsx`](src/context/CyclesContext.jsx) — *2.5 KB*
- [`src/context/NotificationContext.jsx`](src/context/NotificationContext.jsx) — *3.8 KB*
- [`src/context/ThemeContext.jsx`](src/context/ThemeContext.jsx) — *2.1 KB*
- [`src/context/UIContext.jsx`](src/context/UIContext.jsx) — *1.7 KB*
- [`src/data/checklistData.js`](src/data/checklistData.js) — *6.8 KB*
- [`src/data/cyclesData.js`](src/data/cyclesData.js) — *0.3 KB*
- [`src/data/usersData.js`](src/data/usersData.js) — *3.0 KB*
- [`src/data/venuesData.js`](src/data/venuesData.js) — *6.7 KB*
- [`src/index.css`](src/index.css) — *6.6 KB*
- [`src/main.jsx`](src/main.jsx) — *1.1 KB*
- [`src/pages/ChecklistBoard.jsx`](src/pages/ChecklistBoard.jsx) — *20.2 KB*
- [`src/pages/GerenteDashboard.jsx`](src/pages/GerenteDashboard.jsx) — *23.3 KB*
- [`src/pages/GoalsBoard.jsx`](src/pages/GoalsBoard.jsx) — *27.2 KB*
- [`src/pages/Home.jsx`](src/pages/Home.jsx) — *42.1 KB*
- [`src/pages/Login.jsx`](src/pages/Login.jsx) — *2.1 KB*
- [`src/pages/ReportesBoard.jsx`](src/pages/ReportesBoard.jsx) — *13.6 KB*
- [`src/pages/RoleSelector.jsx`](src/pages/RoleSelector.jsx) — *1.6 KB*
- [`src/pages/SuperAdminPanel.jsx`](src/pages/SuperAdminPanel.jsx) — *25.6 KB*
- [`src/pages/home-views/HomeCampo.jsx`](src/pages/home-views/HomeCampo.jsx) — *6.1 KB*
- [`src/pages/home-views/HomeEjecutivo.jsx`](src/pages/home-views/HomeEjecutivo.jsx) — *3.8 KB*
- [`src/pages/home-views/HomeOficina.jsx`](src/pages/home-views/HomeOficina.jsx) — *8.0 KB*
- [`src/services/firebase.js`](src/services/firebase.js) — *1.2 KB*
- [`src/services/googleSync.js`](src/services/googleSync.js) — *6.0 KB*
- [`src/services/userService.js`](src/services/userService.js) — *1.2 KB*
- [`src/utils/flags.js`](src/utils/flags.js) — *0.0 KB*
- [`src/utils/flags.jsx`](src/utils/flags.jsx) — *0.8 KB*
- [`src/utils/soarDates.js`](src/utils/soarDates.js) — *5.0 KB*
- [`vite.config.js`](vite.config.js) — *0.2 KB*

---

## 💻 CÓDIGO FUENTE COMPLETO

### 📄 Archivo: `.env.example`

```text
VITE_FIREBASE_API_KEY=tu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
VITE_FIREBASE_MEASUREMENT_ID=tu_measurement_id

```

---

### 📄 Archivo: `.oxlintrc.json`

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}

```

---

### 📄 Archivo: `Codigo_Fuente_Revisar_IA.md`

```text
# Cdigo Fuente de Plataforma Operativa CPSL

## Archivo: src\App.css
`css
/* App Specific Styles - Migrated to index.css */

`

## Archivo: src\App.jsx
`javascript
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import './index.css'

import Login from './pages/Login'
import Home from './pages/Home'
import RoleSelector from './pages/RoleSelector'
import ChecklistBoard from './pages/ChecklistBoard'
import GerenteDashboard from './pages/GerenteDashboard'
import GoalsBoard from './pages/GoalsBoard'
import ReportesBoard from './pages/ReportesBoard'

// Componente para proteger rutas
function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p className="text-gold">Cargando...</p></div>;
  }
  
  return currentUser ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<Navigate to="/home" replace />} />
          
          <Route path="/home" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />

          <Route path="/roles" element={
            <PrivateRoute>
              <RoleSelector />
            </PrivateRoute>
          } />
          
          <Route path="/gerente" element={
            <PrivateRoute>
              <GerenteDashboard />
            </PrivateRoute>
          } />
          
          <Route path="/checklist/:roleId" element={
            <PrivateRoute>
              <ChecklistBoard />
            </PrivateRoute>
          } />

          <Route path="/metas" element={
            <PrivateRoute>
              <GoalsBoard />
            </PrivateRoute>
          } />

          <Route path="/reportes" element={
            <PrivateRoute>
              <ReportesBoard />
            </PrivateRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App

`

## Archivo: src\index.css
`css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Montserrat:wght@400;600;700;800;900&display=swap');

:root {
  --crear-gold: #ffb703;
  --crear-gold-hover: #ffc933;
  --crear-gold-light: rgba(255, 183, 3, 0.15);
  
  --crear-blue: #00d4ff;
  --crear-blue-dark: #0088aa;
  
  --bg-dark: #070d1f;
  --bg-card: rgba(255, 255, 255, 0.02);
  --bg-card-hover: rgba(255, 255, 255, 0.04);
  
  --text-main: #f8f9fa;
  --text-muted: #9ca3af;
  
  --color-success: #34A853;
  --color-error: #ff5252;
  --color-warning: #FBBC05;
  
  --font-heading: 'Montserrat', sans-serif;
  --font-body: 'Inter', 'Roboto', sans-serif;
  
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 32px;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--bg-dark);
  color: var(--text-main);
  font-family: var(--font-body);
  line-height: 1.6;
  min-height: 100vh;
  overflow-x: hidden;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  margin-top: 0;
  color: #ffffff;
  letter-spacing: -0.02em;
  font-weight: 700;
}

.glass-panel {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.glass-panel:hover {
  background: var(--bg-card-hover);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 15px 50px -10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 212, 255, 0.05), inset 0 1px 0 rgba(255,255,255,0.1);
  transform: translateY(-2px);
}

.btn-primary {
  background: linear-gradient(135deg, var(--crear-gold) 0%, var(--crear-gold-hover) 100%);
  color: #000000;
  border: none;
  border-radius: var(--radius-xl);
  padding: 14px 32px;
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 15px rgba(255, 183, 3, 0.3);
}

.btn-primary:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 10px 25px rgba(255, 183, 3, 0.5), 0 0 20px rgba(255, 183, 3, 0.3);
}

.text-gold { color: var(--crear-gold); }
.text-blue { color: var(--crear-blue); }
.text-muted { color: var(--text-muted); }
.uppercase { text-transform: uppercase; letter-spacing: 2px; font-weight: 700; }

`

## Archivo: src\main.jsx
`javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { ChecklistProvider } from './context/ChecklistContext'
import { AuthProvider } from './context/AuthContext'
import { CyclesProvider } from './context/CyclesContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CyclesProvider>
          <ChecklistProvider>
            <App />
          </ChecklistProvider>
        </CyclesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

`

## Archivo: src\context\AuthContext.jsx
`javascript
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { usersData } from '../data/usersData';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const normalizedEmail = user.email.trim().toLowerCase();
      
      const foundUser = usersData.find(u => u.email.toLowerCase() === normalizedEmail);
      if (!foundUser) {
        await auth.signOut();
        alert('ACCESO DENEGADO: Tu correo no se encuentra en el Directorio Global. Contacta a Gerencia.');
        throw new Error('Unauthorized');
      }

      // Merge role info into the currentUser object
      setCurrentUser({
        ...user,
        appRole: foundUser.role,
        sede: foundUser.sede
      });
      return user;
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        const normalizedEmail = user.email.trim().toLowerCase();
        const foundUser = usersData.find(u => u.email.toLowerCase() === normalizedEmail);
        
        if (foundUser) {
          setCurrentUser({
            ...user,
            appRole: foundUser.role,
            sede: foundUser.sede
          });
        } else {
          auth.signOut();
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loginWithGoogle, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

`

## Archivo: src\context\ChecklistContext.jsx
`javascript
import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { checklistData } from '../data/checklistData';

const ChecklistContext = createContext();

export function ChecklistProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar cambios en la colección "tasks" en tiempo real
    const tasksRef = collection(db, 'tasks');
    const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
      if (snapshot.empty) {
        // Si está vacía, podríamos inicializarla, pero por ahora solo seteamos vacío
        setTasks([]);
      } else {
        const loadedTasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTasks(loadedTasks);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tasks from Firestore:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleTask = async (taskId, currentStatus) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        completed: !currentStatus,
        status: !currentStatus ? 'Completada' : 'En progreso'
      });
    } catch (error) {
      console.error("Error updating task:", error);
      alert("No se pudo actualizar la tarea. Revisa los permisos de Firestore.");
    }
  };

  const submitEvidence = async (taskId, evidenceUrl) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: 'Pendiente de validación',
        evidence_url: evidenceUrl,
        date: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error submitting evidence:", error);
      alert("No se pudo enviar la evidencia.");
    }
  };

  const getProgressByRole = (roleId) => {
    const roleTasks = tasks.filter(t => t.role === roleId);
    if (roleTasks.length === 0) return 0;
    const completed = roleTasks.filter(t => t.completed).length;
    return Math.round((completed / roleTasks.length) * 100);
  };

  // Función de utilidad para cargar las tareas iniciales a Firestore (Solo la usa el Gerente una vez)
  const initializeFirestore = async () => {
    try {
      const batch = writeBatch(db);
      checklistData.forEach(task => {
        const taskRef = doc(db, 'tasks', task.id);
        batch.set(taskRef, { ...task, completed: false });
      });
      await batch.commit();
      alert("¡Base de datos inicializada correctamente!");
    } catch (error) {
      console.error("Error initializing DB:", error);
      alert("Error al inicializar. ¿Cambiaste las reglas de Firestore a true?");
    }
  };

  return (
    <ChecklistContext.Provider value={{ tasks, toggleTask, submitEvidence, getProgressByRole, loading, initializeFirestore }}>
      {children}
    </ChecklistContext.Provider>
  );
}

export function useChecklist() {
  return useContext(ChecklistContext);
}

`

## Archivo: src\context\CyclesContext.jsx
`javascript
import { createContext, useContext, useState, useEffect } from 'react';
import { cyclesData } from '../data/cyclesData';

const CyclesContext = createContext();

export function CyclesProvider({ children }) {
  const [currentCycle, setCurrentCycle] = useState(null);
  const [currentStage, setCurrentStage] = useState('PRE-C1');

  useEffect(() => {
    // Para el MVP, tomamos el primer ciclo (o el que corresponda por fecha actual)
    if (cyclesData && cyclesData.length > 0) {
      const cycle = cyclesData[0];
      setCurrentCycle(cycle);

      // Lógica simple para determinar la etapa basada en la fecha de hoy
      const today = new Date();
      const c1Start = new Date(cycle.c1_start);
      const c2Start = new Date(cycle.c2_start);
      const maestriaStart = new Date(cycle.maestria_start);

      if (today < c1Start) {
        setCurrentStage('PRE-C1');
      } else if (today >= c1Start && today < c2Start) {
        setCurrentStage('C1');
      } else if (today >= c2Start && today < maestriaStart) {
        setCurrentStage('C2');
      } else {
        setCurrentStage('MAESTRIA');
      }
    }
  }, []);

  return (
    <CyclesContext.Provider value={{ currentCycle, currentStage }}>
      {children}
    </CyclesContext.Provider>
  );
}

export function useCycles() {
  return useContext(CyclesContext);
}

`

## Archivo: src\data\checklistData.js
`javascript
export const roles = [
  { id: 'gerente', name: 'Gerente' },
  { id: 'coord_maestria', name: 'Coordinador/a Maestría' },
  { id: 'coord_c1', name: 'Coordinador/a C1' },
  { id: 'capitan', name: 'Capitán' },
  { id: 'qt', name: 'Quantum Team' }
];

export const checklistData = [
  // LUNES
  { id: 't1', role: 'gerente', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar tablero general de operación.' },
  { id: 't2', role: 'gerente', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar resultados del entrenamiento anterior.' },
  { id: 't3', role: 'gerente', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar asistencia.' },
  { id: 't4', role: 'gerente', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar conversiones.' },
  { id: 't5', role: 'gerente', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar pendientes críticos.' },
  { id: 't6', role: 'gerente', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar incidencias.' },
  { id: 't7', role: 'gerente', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar necesidades de cada coordinación.' },
  { id: 't8', role: 'gerente', phase: 'Lunes — Auditoría y Seguimiento', task: 'Identificar quiebres que requieren intervención.' },
  { id: 't9', role: 'gerente', phase: 'Lunes — Auditoría y Seguimiento', task: 'Definir prioridades de la semana.' },
  { id: 't10', role: 'gerente', phase: 'Lunes — Auditoría y Seguimiento', task: 'Confirmar responsables y fechas de cumplimiento.' },
  
  { id: 't11', role: 'coord_maestria', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar estado de Maestría.' },
  { id: 't12', role: 'coord_maestria', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar compromisos pendientes.' },
  { id: 't13', role: 'coord_maestria', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar participantes que requieren seguimiento.' },
  { id: 't14', role: 'coord_maestria', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar necesidades del entrenador.' },
  { id: 't15', role: 'coord_maestria', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar avances de formación de equipo.' },
  { id: 't16', role: 'coord_maestria', phase: 'Lunes — Auditoría y Seguimiento', task: 'Actualizar pendientes.' },
  { id: 't17', role: 'coord_maestria', phase: 'Lunes — Auditoría y Seguimiento', task: 'Escalar quiebres al Gerente.' },

  { id: 't18', role: 'coord_c1', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar base de participantes.' },
  { id: 't19', role: 'coord_c1', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar estados de confirmación.' },
  { id: 't20', role: 'coord_c1', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar casos pendientes.' },
  { id: 't21', role: 'coord_c1', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar llamadas realizadas.' },
  { id: 't22', role: 'coord_c1', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar participantes sin contacto.' },
  { id: 't23', role: 'coord_c1', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar devoluciones.' },
  { id: 't24', role: 'coord_c1', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar próximos pasos.' },
  { id: 't25', role: 'coord_c1', phase: 'Lunes — Auditoría y Seguimiento', task: 'Actualizar CRM.' },
  { id: 't26', role: 'coord_c1', phase: 'Lunes — Auditoría y Seguimiento', task: 'Asignar casos pendientes.' },

  { id: 't27', role: 'capitan', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar estado de su equipo.' },
  { id: 't28', role: 'capitan', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar comunicación con aliados.' },
  { id: 't29', role: 'capitan', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar participantes asignados.' },
  { id: 't30', role: 'capitan', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar compromisos.' },
  { id: 't31', role: 'capitan', phase: 'Lunes — Auditoría y Seguimiento', task: 'Detectar quiebres.' },
  { id: 't32', role: 'capitan', phase: 'Lunes — Auditoría y Seguimiento', task: 'Contactar a los aliados que requieran intervención.' },
  { id: 't33', role: 'capitan', phase: 'Lunes — Auditoría y Seguimiento', task: 'Confirmar actividad del equipo.' },

  { id: 't34', role: 'qt', phase: 'Lunes — Auditoría y Seguimiento', task: 'Auditar estado de los equipos.' },
  { id: 't35', role: 'qt', phase: 'Lunes — Auditoría y Seguimiento', task: 'Revisar productividad y seguimiento.' },
  { id: 't36', role: 'qt', phase: 'Lunes — Auditoría y Seguimiento', task: 'Identificar aliados desconectados y participantes críticos.' },
  { id: 't37', role: 'qt', phase: 'Lunes — Auditoría y Seguimiento', task: 'Informar quiebres al Capitán.' },
  { id: 't38', role: 'qt', phase: 'Lunes — Auditoría y Seguimiento', task: 'Escalar al nivel correspondiente.' },

  // MARTES
  { id: 't39', role: 'gerente', phase: 'Martes — Ejecución', task: 'Revisar cumplimiento de prioridades.' },
  { id: 't40', role: 'gerente', phase: 'Martes — Ejecución', task: 'Resolver bloqueos.' },
  { id: 't41', role: 'gerente', phase: 'Martes — Ejecución', task: 'Verificar coordinación entre áreas.' },
  { id: 't42', role: 'gerente', phase: 'Martes — Ejecución', task: 'Revisar indicadores.' },
  { id: 't43', role: 'gerente', phase: 'Martes — Ejecución', task: 'Confirmar que no existan pendientes críticos sin responsable.' },

  { id: 't44', role: 'coord_c1', phase: 'Martes — Ejecución', task: 'Continuar seguimiento de participantes.' },
  { id: 't45', role: 'coord_c1', phase: 'Martes — Ejecución', task: 'Actualizar estados y ejecutar derivaciones.' },
  { id: 't46', role: 'coord_c1', phase: 'Martes — Ejecución', task: 'Cerrar casos resueltos y registrar conversaciones.' },
  { id: 't47', role: 'coord_c1', phase: 'Martes — Ejecución', task: 'Identificar casos que necesitan intervención del Capitán/QT.' },

  { id: 't48', role: 'capitan', phase: 'Martes — Ejecución', task: 'Mantener contacto con aliados y revisar compromisos.' },
  { id: 't49', role: 'capitan', phase: 'Martes — Ejecución', task: 'Acompañar quiebres.' },
  { id: 't50', role: 'capitan', phase: 'Martes — Ejecución', task: 'Verificar que cada aliado conozca sus responsabilidades.' },
  { id: 't51', role: 'capitan', phase: 'Martes — Ejecución', task: 'Mantener actualizado el estado de su equipo.' },

  { id: 't52', role: 'qt', phase: 'Martes — Ejecución', task: 'Acompañar a Capitanes y auditar ejecución.' },
  { id: 't53', role: 'qt', phase: 'Martes — Ejecución', task: 'Corregir desviaciones y entrenar al equipo.' },
  { id: 't54', role: 'qt', phase: 'Martes — Ejecución', task: 'Verificar cumplimiento de estándares.' },

  // MIERCOLES
  { id: 't55', role: 'gerente', phase: 'Miércoles — Sostenimiento', task: 'Revisar compromisos y resolver quiebres antes del fin de semana.' },
  { id: 't56', role: 'coord_maestria', phase: 'Miércoles — Sostenimiento', task: 'Revisar compromisos, resolver antes de fin de semana, registrar intervención.' },
  { id: 't57', role: 'coord_c1', phase: 'Miércoles — Sostenimiento', task: 'Revisar compromisos, resolver antes de fin de semana, registrar intervención.' },
  { id: 't58', role: 'capitan', phase: 'Miércoles — Sostenimiento', task: 'Revisar personalmente los grupos y contactar aliados que no ejecuten.' },
  { id: 't59', role: 'capitan', phase: 'Miércoles — Sostenimiento', task: 'Revisar participantes críticos e informar al QT cualquier quiebre.' },
  { id: 't60', role: 'qt', phase: 'Miércoles — Sostenimiento', task: 'Auditar Capitanes y revisar consistencia de ejecución.' },
  { id: 't61', role: 'qt', phase: 'Miércoles — Sostenimiento', task: 'Identificar patrones repetitivos, entrenar y corregir.' },

  // JUEVES
  { id: 't62', role: 'gerente', phase: 'Jueves — Mesa de Trabajo', task: 'Recibir indicadores relevantes y revisar desviaciones.' },
  { id: 't63', role: 'gerente', phase: 'Jueves — Mesa de Trabajo', task: 'Intervenir cuando el quiebre supere el nivel operativo. Confirmar plan de acción.' },
  
  { id: 't64', role: 'capitan', phase: 'Jueves — Mesa de Trabajo', task: 'Revisar estado completo del equipo y productividad.' },
  { id: 't65', role: 'capitan', phase: 'Jueves — Mesa de Trabajo', task: 'Revisar llamadas, participantes sin respuesta e indecisos, y PP%.' },
  { id: 't66', role: 'capitan', phase: 'Jueves — Mesa de Trabajo', task: 'Definir intervención individual y registrar acuerdos con el QT.' },

  { id: 't67', role: 'qt', phase: 'Jueves — Mesa de Trabajo', task: 'Mesa con Capitán: Revisar estado del equipo, productividad, llamadas.' },
  { id: 't68', role: 'qt', phase: 'Jueves — Mesa de Trabajo', task: 'Mesa con Capitán: Definir intervención individual y registrar acuerdos.' },

  // VIERNES (PRE)
  { id: 't69', role: 'coord_c1', phase: 'Viernes — Antes de Abrir', task: 'Confirmar participantes, equipo y logística.' },
  { id: 't70', role: 'coord_c1', phase: 'Viernes — Antes de Abrir', task: 'Confirmar materiales, sala, presentaciones, audio, iluminación, música.' },
  
  { id: 't71', role: 'capitan', phase: 'Viernes — Antes de Abrir', task: 'Reunión de alineación completada y roles asignados.' },
  { id: 't72', role: 'capitan', phase: 'Viernes — Antes de Abrir', task: 'Drills practicados y aliados alineados.' },
  { id: 't73', role: 'capitan', phase: 'Viernes — Antes de Abrir', task: 'Directorios y gafetes revisados. Grupos de WhatsApp preparados.' },

  { id: 't74', role: 'qt', phase: 'Viernes — Antes de Abrir', task: 'Ensayar drills con aliados, confirmar postura y conocimiento del flujo.' },
  { id: 't75', role: 'qt', phase: 'Viernes — Antes de Abrir', task: 'Confirmar música, luces, puertas, materiales, baúl de celulares y ambiente.' },

  // DURANTE C1
  { id: 't76', role: 'gerente', phase: 'Durante Capítulo 1', task: 'Mantener supervisión ejecutiva y resolver escalaciones sin interferir.' },
  { id: 't77', role: 'gerente', phase: 'Durante Capítulo 1', task: 'Revisar cumplimiento de estándares y registrar incidencias.' },

  { id: 't78', role: 'coord_c1', phase: 'Durante Capítulo 1', task: 'Mantener control de participantes y resolver incidencias administrativas.' },
  { id: 't79', role: 'coord_c1', phase: 'Durante Capítulo 1', task: 'Coordinar con oficina, atender derivaciones y registrar novedades.' },

  { id: 't80', role: 'capitan', phase: 'Durante Capítulo 1', task: 'Liderar equipo, mantener alineación y cuidar ejecución.' },
  { id: 't81', role: 'capitan', phase: 'Durante Capítulo 1', task: 'Supervisar aliados, detectar quiebres y resolver desviaciones.' },
  { id: 't82', role: 'capitan', phase: 'Viernes — Grupos de Creación', task: 'Verificar: Presentación, nombre, propósito, grito, reglas, WhatsApp, directorio.' },

  { id: 't83', role: 'qt', phase: 'Durante Capítulo 1', task: 'Ser soporte del entrenador y Capitán. Observar contexto y detectar quiebres.' },
  { id: 't84', role: 'qt', phase: 'Durante Capítulo 1', task: 'Proteger experiencia del participante, mantener presencia y no abandonar posiciones.' },

  // SABADO
  { id: 't85', role: 'coord_c1', phase: 'Sábado — Sostener', task: 'Resolver incidencias y mantener control de asistencia.' },
  { id: 't86', role: 'coord_c1', phase: 'Sábado — Sostener', task: 'Coordinar requerimientos y preparar operación del domingo.' },

  { id: 't87', role: 'capitan', phase: 'Sábado — Sostener', task: 'Llegar antes. Grounding del equipo.' },
  { id: 't88', role: 'capitan', phase: 'Sábado — Sostener', task: 'Revisar energía. Detectar quiebres y coordinar con QT.' },

  { id: 't89', role: 'qt', phase: 'Sábado — Sostener', task: 'Grounding. Revisar posiciones, aliados y observar participantes con atención.' },
  { id: 't90', role: 'qt', phase: 'Sábado — Sostener', task: 'Mantener contexto, coordinar intervenciones y revisar operación de sala.' },

  // DOMINGO
  { id: 't91', role: 'coord_c1', phase: 'Domingo — Cierre', task: 'Confirmar asistencia, consolidar información y registrar resultados.' },
  { id: 't92', role: 'coord_c1', phase: 'Domingo — Cierre', task: 'Identificar pendientes, preparar seguimiento y coordinar proceso de C2.' },

  { id: 't93', role: 'capitan', phase: 'Domingo — Cierre', task: 'Preparar equipo para cierre. Identificar liderazgo emergente.' },
  { id: 't94', role: 'capitan', phase: 'Domingo — Cierre', task: 'Acompañar conversaciones, coordinar cierre y entregar info al QT.' },

  { id: 't95', role: 'qt', phase: 'Domingo — Cierre', task: 'Identificar líderes potenciales y observar conversaciones.' },
  { id: 't96', role: 'qt', phase: 'Domingo — Cierre', task: 'Revisar compromiso, avance hacia C2 y registrar oportunidades.' },

  // POST-C1 Y PRE-C2
  { id: 't97', role: 'capitan', phase: 'L-M-V Post-C1', task: 'Verificar contacto de aliados (Lunes, Miércoles, Viernes).' },
  { id: 't98', role: 'capitan', phase: 'L-M-V Post-C1', task: 'Revisar participantes sin contacto, compromisos y escalar riesgos de pérdida.' },
  
  { id: 't99', role: 'qt', phase: 'L-M-V Post-C1', task: 'Auditar seguimiento, revisar productividad/conversión.' },
  { id: 't100', role: 'qt', phase: 'L-M-V Post-C1', task: 'Entrenar al Capitán e intervenir en casos críticos.' },

  { id: 't101', role: 'coord_c1', phase: 'Pre-C2', task: 'Confirmar participantes, pagos y asistencia. Actualizar base.' },
  { id: 't102', role: 'capitan', phase: 'Pre-C2', task: 'Confirmar participantes de su equipo, acompañar decisiones y mantener comunicación.' },
  { id: 't103', role: 'qt', phase: 'Pre-C2', task: 'Auditar conversión, revisar indecisos, llamadas y confirmar asientos de C2.' },

  // CAPITULO 2
  { id: 't104', role: 'gerente', phase: 'Capítulo 2', task: 'Supervisión ejecutiva, indicadores, incidencias y coordinación general.' },
  { id: 't105', role: 'coord_c1', phase: 'Capítulo 2', task: 'Asistencia, registro, información y cierre administrativo.' },
  { id: 't106', role: 'capitan', phase: 'Capítulo 2', task: 'Liderar equipo, sostener aliados, acompañar participantes y mantener estándares.' },
  { id: 't107', role: 'qt', phase: 'Capítulo 2', task: 'Auditar, observar, entrenar, corregir. Identificar liderazgo.' },

  // POST-C2 & PRE-MAESTRIA
  { id: 't108', role: 'gerente', phase: 'Post-C2 & Pre-Maestría', task: 'Revisar resultados, aprendizajes y preparar reunión de cierre.' },
  { id: 't109', role: 'coord_c1', phase: 'Post-C2', task: 'Actualizar base, cerrar casos y preparar reporte.' },
  { id: 't110', role: 'capitan', phase: 'Post-C2', task: 'Cerrar seguimiento, evaluar aliados y entregar info al QT.' },
  { id: 't111', role: 'qt', phase: 'Post-C2', task: 'Evaluar Capitanes/aliados. Preparar desarrollo del siguiente ciclo.' },

  { id: 't112', role: 'coord_maestria', phase: 'Pre-Maestría & Cierre', task: 'Preparar operación, confirmar equipo, logística y consolidar resultados.' },
  { id: 't113', role: 'qt', phase: 'Pre-Maestría', task: 'Preparar equipo, revisar evolución y preparar observaciones/recomendaciones.' },
  
  { id: 't114', role: 'gerente', phase: 'Cierre de Ciclo', task: 'Auditoría Final: Resultados consolidados, aprendizajes y nuevo ciclo abierto.' }
];

`

## Archivo: src\data\cyclesData.js
`javascript
export const cyclesData = [
  {
    "id": "2026-LIM-01",
    "name": "Ciclo Lima 01 (2026)",
    "c1_start": "2026-07-10",
    "c1_end": "2026-07-12",
    "c2_start": "2026-07-23",
    "c2_end": "2026-07-26",
    "maestria_start": "2026-10-09",
    "maestria_end": "2026-10-11"
  }
];

`

## Archivo: src\data\usersData.js
`javascript
export const usersData = [
  {
    "id": "evelyn.cedillo",
    "name": "Pauly Cedillo",
    "email": "evelyn.cedillo@crearpsl.net",
    "role": "coordinador_c1c2",
    "sede": "Cuenca"
  },
  {
    "id": "viviana.catota",
    "name": "Mabe Catota",
    "email": "viviana.catota@crearpsl.net",
    "role": "coordinador_c1c2",
    "sede": "Cuenca"
  },
  {
    "id": "alfonso.trujillo",
    "name": "Joao Trujillo",
    "email": "alfonso.trujillo@crearpsl.net",
    "role": "coordinador_c1c2",
    "sede": "Cuenca"
  },
  {
    "id": "kerly.carrillo",
    "name": "Kerlie Carrillo",
    "email": "kerly.carrillo@crearpsl.net",
    "role": "coordinador_mj",
    "sede": "Cuenca"
  },
  {
    "id": "juan.reinoso",
    "name": "Juanfer Reinoso",
    "email": "juan.reinoso@crearpsl.net",
    "role": "coordinador_mj",
    "sede": "Cuenca"
  },
  {
    "id": "emely.leon",
    "name": "July Le\u00f3n ",
    "email": "emely.leon@crearpsl.net",
    "role": "gerente",
    "sede": "Cuenca"
  },
  {
    "id": "asistente.facturacion",
    "name": "Alexis Ter\u00e1n",
    "email": "asistente.facturacion@crearpsl.net",
    "role": "finanzas",
    "sede": "Global"
  },
  {
    "id": "diego.flores",
    "name": "Diego Flores",
    "email": "diego.flores@crearpsl.net",
    "role": "finanzas",
    "sede": "Global"
  },
  {
    "id": "asistente.contable",
    "name": "Fernanda Sangoquiza",
    "email": "asistente.contable@crearpsl.net",
    "role": "asistente_impuestos_quito",
    "sede": "Global"
  },
  {
    "id": "paul.sosa",
    "name": "Paul Sosa",
    "email": "paul.sosa@crearpsl.net",
    "role": "direccion",
    "sede": "Global"
  },
  {
    "id": "fer.aragon",
    "name": "Fer Aragon",
    "email": "fer.aragon@crearpsl.net",
    "role": "direccion",
    "sede": "Global"
  },
  {
    "id": "contabilidad.lima",
    "name": "Gabriela  Rivadeneyra",
    "email": "contabilidad.lima@crearpsl.net",
    "role": "finanzas",
    "sede": "Global"
  },
  {
    "id": "contabilidad.medellin",
    "name": "Hector Gonzalez ",
    "email": "contabilidad.medellin@crearpsl.net",
    "role": "finanzas",
    "sede": "Global"
  },
  {
    "id": "andres.gomez",
    "name": "Andres Gomez",
    "email": "andres.gomez@crearpsl.net",
    "role": "coordinador",
    "sede": "Global"
  },
  {
    "id": "coodinacion.administrativa",
    "name": "Karol Villarruel ",
    "email": "coodinacion.administrativa@crearpsl.net",
    "role": "coordinador",
    "sede": "Global"
  },
  {
    "id": "facturacion.cartera",
    "name": "Sebasti\u00e1n J\u00e1come",
    "email": "facturacion.cartera@crearpsl.net",
    "role": "finanzas",
    "sede": "Global"
  },
  {
    "id": "contabilidad.global",
    "name": "Elizabeth Escobar",
    "email": "contabilidad.global@crearpsl.net",
    "role": "finanzas",
    "sede": "Global"
  },
  {
    "id": "leandro.brunis",
    "name": "Leandro Brunis",
    "email": "leandro.brunis@crearpsl.net",
    "role": "direccion",
    "sede": "Global"
  },
  {
    "id": "talento.humano",
    "name": "Lennin Chasi ",
    "email": "talento.humano@crearpsl.net",
    "role": "talento_humano",
    "sede": "Global"
  },
  {
    "id": "legal",
    "name": "Pablo Mendieta",
    "email": "legal@crearpsl.net",
    "role": "legal",
    "sede": "Global"
  },
  {
    "id": "Jonathan.larosa",
    "name": "Jonathan La Rosa",
    "email": "jonathan.larosa@crearpsl.net",
    "role": "coordinador_mj",
    "sede": "Guayaquil"
  },
  {
    "id": "brenda.rodriguez",
    "name": "Brenda Rodr\u00edguez ",
    "email": "brenda.rodriguez@crearpsl.net",
    "role": "coordinador_c1c2",
    "sede": "Guayaquil"
  },
  {
    "id": "diana.macas",
    "name": "Diana Macas",
    "email": "diana.macas@crearpsl.net",
    "role": "coordinador_c1c2",
    "sede": "Guayaquil"
  },
  {
    "id": "josue.vera",
    "name": "Josu\u00e9 Vera",
    "email": "josue.vera@crearpsl.net",
    "role": "gerente",
    "sede": "Guayaquil"
  },
  {
    "id": "diana.moscoso",
    "name": "Diana Moscoso Robles",
    "email": "diana.moscoso@crearpsl.net",
    "role": "coordinador_c1c2",
    "sede": "Lima"
  },
  {
    "id": "joyce.marin",
    "name": "Joyce Mar\u00edn Su\u00e1rez",
    "email": "joyce.marin@crearpsl.net",
    "role": "coordinador_c1c2",
    "sede": "Lima"
  },
  {
    "id": "linid.valencia",
    "name": "Linid Valencia",
    "email": "linid.valencia@crearpsl.net",
    "role": "coordinador_mj",
    "sede": "Lima"
  },
  {
    "id": "leyla.pasquel",
    "name": "Leyla Pasquel",
    "email": "leyla.pasquel@crearpsl.net",
    "role": "coordinador_mj",
    "sede": "Lima"
  },
  {
    "id": "jose.sanchez",
    "name": "Jos\u00e9 S\u00e1nchez",
    "email": "jose.sanchez@crearpsl.net",
    "role": "gerente",
    "sede": "Lima"
  },
  {
    "id": "valentina.r",
    "name": "Valentina Rodriguez",
    "email": "valentina.r@crearpsl.net",
    "role": "coordinador_c1c2",
    "sede": "MED"
  },
  {
    "id": "yurany.gonzalez",
    "name": "Yurany G Franco",
    "email": "yurany.gonzalez@crearpsl.net",
    "role": "gerente",
    "sede": "MED"
  },
  {
    "id": "mauricio.ramirez",
    "name": "Mauricio Ramirez",
    "email": "mauricio.ramirez@crearpsl.net",
    "role": "coordinador_mj",
    "sede": "MED"
  },
  {
    "id": "david.gonzalez",
    "name": "David Gonzalez Franco",
    "email": "david.gonzalez@crearpsl.net",
    "role": "coordinador_c1c2",
    "sede": "MED"
  },
  {
    "id": "naomi.campos",
    "name": "Nao Campos",
    "email": "naomi.campos@crearpsl.net",
    "role": "coordinador_c1c2",
    "sede": "M\u00e9xico"
  },
  {
    "id": "daniela.monroy",
    "name": "Daniela Monroy ",
    "email": "daniela.monroy@crearpsl.net",
    "role": "coordinador_mj",
    "sede": "M\u00e9xico"
  },
  {
    "id": "nora.zamora",
    "name": "Nora Zamora ",
    "email": "nora.zamora@crearpsl.net",
    "role": "gerente",
    "sede": "M\u00e9xico"
  },
  {
    "id": "adrianna.guarochico",
    "name": "Adrianna Guarochico",
    "email": "adrianna.guarochico@crearpsl.net",
    "role": "coordinador_c1c2",
    "sede": "UIO"
  },
  {
    "id": "daniela.esposito",
    "name": "Daniela Esposito",
    "email": "daniela.esposito@crearpsl.net",
    "role": "coordinador_c1c2",
    "sede": "UIO "
  },
  {
    "id": "danna.guaman",
    "name": "Danna Guaman",
    "email": "danna.guaman@crearpsl.net",
    "role": "coordinador_c1c2",
    "sede": "UIO"
  },
  {
    "id": "emily.campuzano",
    "name": "Emily Campuzano",
    "email": "emily.campuzano@crearpsl.net",
    "role": "gerente",
    "sede": "UIO"
  },
  {
    "id": "erika.gavilanez",
    "name": "Erika Gavil\u00e1nez",
    "email": "erika.gavilanez@crearpsl.net",
    "role": "coordinador_mj",
    "sede": "UIO"
  },
  {
    "id": "freddy.sosa",
    "name": "David Sosa",
    "email": "freddy.sosa@crearpsl.net",
    "role": "gerente",
    "sede": "UIO"
  },
  {
    "id": "ibetancourth",
    "name": "Isaac Betancourth",
    "email": "ibetancourth@crearpsl.net",
    "role": "coordinador_mj",
    "sede": "UIO"
  },
  {
    "id": "judith.romero",
    "name": "Regina Romero",
    "email": "judith.romero@crearpsl.net",
    "role": "coordinador_mj",
    "sede": "UIO"
  },
  {
    "id": "karla.pastrano",
    "name": "Karla Pastrano",
    "email": "karla.pastrano@crearpsl.net",
    "role": "coordinador_c1c2",
    "sede": "UIO"
  },
  {
    "id": "liliana.cubillo",
    "name": "Lili Cubillo",
    "email": "liliana.cubillo@crearpsl.net",
    "role": "coordinador_mj",
    "sede": "UIO"
  },
  {
    "id": "marco.gonzalez",
    "name": "Adams Gonzalez",
    "email": "marco.gonzalez@crearpsl.net",
    "role": "coordinador_c1c2",
    "sede": "UIO"
  },
  {
    "id": "ketherine.aguirre",
    "name": "Marce Aguirre",
    "email": "ketherine.aguirre@crearpsl.com",
    "role": "coordinador_c1c2",
    "sede": "UIO"
  },
  {
    "id": "sso",
    "name": "Santiago Proa\u00f1o",
    "email": "sso@crearpsl.net",
    "role": "t\u00e9cnico_sst",
    "sede": "UIO"
  }
];

`

## Archivo: src\pages\ChecklistBoard.jsx
`javascript
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useChecklist } from '../context/ChecklistContext';
import { roles } from '../data/checklistData';
import { CheckCircle2, Circle, ArrowLeft, Clock, Filter as FilterIcon } from 'lucide-react';

export default function ChecklistBoard() {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tasks, toggleTask, submitEvidence, getProgressByRole } = useChecklist();

  const filter = searchParams.get('filter');

  const role = roles.find(r => r.id === roleId);
  let myTasks = tasks.filter(t => t.role === roleId);

  // Apply filters if any
  if (filter === 'completed') {
    myTasks = myTasks.filter(t => t.completed || t.status === 'Completada');
  } else if (filter === 'criticas') {
    myTasks = myTasks.filter(t => !t.completed && t.riskLevel === 'critico');
  } else if (filter === 'importantes') {
    myTasks = myTasks.filter(t => !t.completed && t.status !== 'Completada' && t.riskLevel !== 'critico');
  }

  // Agrupar tareas por fase
  const tasksByPhase = myTasks.reduce((acc, task) => {
    if (!acc[task.phase]) acc[task.phase] = [];
    acc[task.phase].push(task);
    return acc;
  }, {});

  if (!role) {
    return <div className="text-gold" style={{ padding: '2rem', textAlign: 'center' }}>Rol no encontrado</div>;
  }

  const progress = getProgressByRole(roleId);

  const handleTaskClick = (task) => {
    if (task.completed || task.status === 'Completada') {
      // Si está completada, permitir desmarcar (opcional)
      toggleTask(task.id, true);
      return;
    }

    if (task.status === 'Pendiente de validación') {
      alert("Esta tarea está siendo revisada por gerencia.");
      return;
    }

    // Para la fase 2, asumimos que todas las tareas críticas o simplemente al hacer clic, pedimos evidencia.
    // Lo haremos con un simple confirm y prompt.
    const url = prompt("Introduce la URL de tu evidencia (Google Drive, Docs, etc.) para completar esta tarea:");
    if (url) {
      submitEvidence(task.id, url);
    } else if (url === "") {
      // Si el usuario deja vacío, marcamos sin evidencia (o puedes forzarla).
      toggleTask(task.id, false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h1 className="text-gold uppercase" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{role.name}</h1>
        <p className="text-muted" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Tu checklist operativo por ciclo</span>
          {filter && (
            <span style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.8rem', 
              background: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '0.9rem', color: 'white' 
            }}>
              <FilterIcon size={14} /> Filtro Activo: {filter.toUpperCase()}
              <button onClick={() => setSearchParams({})} style={{ background: 'none', border: 'none', color: '#ffb347', cursor: 'pointer', marginLeft: '0.5rem', fontSize: '0.8rem' }}>✖ Limpiar</button>
            </span>
          )}
        </p>
        
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--crear-gold)', transition: 'width 0.4s ease' }} />
        </div>
        <p className="text-gold" style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>{progress}% Completado</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {Object.entries(tasksByPhase).map(([phase, phaseTasks]) => (
          <div key={phase} className="glass-panel" style={{ padding: '2rem' }}>
            <h2 className="text-blue" style={{ fontSize: '1.4rem', borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
              {phase}
            </h2>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {phaseTasks.map(task => {
                const isCompleted = task.completed || task.status === 'Completada';
                const isPending = task.status === 'Pendiente de validación';

                return (
                  <li 
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      padding: '1rem',
                      background: isCompleted ? 'rgba(52, 168, 83, 0.1)' : isPending ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isCompleted ? 'rgba(52, 168, 83, 0.3)' : isPending ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      transform: isCompleted ? 'scale(0.99)' : 'scale(1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ color: isCompleted ? 'var(--color-success)' : isPending ? '#f59e0b' : 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }}>
                        {isCompleted ? <CheckCircle2 size={24} /> : isPending ? <Clock size={24} /> : <Circle size={24} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ 
                          color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)', 
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          fontSize: '1.05rem',
                          lineHeight: '1.4',
                          display: 'block'
                        }}>
                          {task.task}
                        </span>
                        {isPending && (
                          <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 'bold' }}>Enviado para validación</span>
                        )}
                        {task.feedback && !isCompleted && !isPending && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '2px solid #ef4444', fontSize: '0.85rem', color: '#fca5a5' }}>
                            <strong>Comentario del supervisor:</strong> {task.feedback}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

`

## Archivo: src\pages\GerenteDashboard.jsx
`javascript
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { CheckCircle, XCircle, Clock, AlertCircle, Filter, Activity, Users, Target, FileText } from 'lucide-react';
import { usersData } from '../data/usersData';

export default function GerenteDashboard() {
  const { currentUser } = useAuth();
  const { currentCycle, currentStage } = useCycles();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtro "Solo lo que requiere mi intervención"
  const [interventionMode, setInterventionMode] = useState(false);

  useEffect(() => {
    if (currentUser?.appRole !== 'gerente') {
      navigate('/');
      return;
    }

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubGoals = onSnapshot(collection(db, 'goals'), (snapshot) => {
      setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const q = query(collection(db, 'reports')); // orderBy('created_at', 'desc') needs composite index, skipping for MVP
    const unsubReports = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
    });

    setTimeout(() => setLoading(false), 500);

    return () => {
      unsubTasks();
      unsubGoals();
      unsubReports();
    };
  }, [currentUser, navigate]);

  const handleValidation = async (taskId, isApproved) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      if (isApproved) {
        await updateDoc(taskRef, { status: 'Completada', completed: true });
      } else {
        const feedback = prompt("Razón del rechazo:");
        if (feedback === null) return;
        await updateDoc(taskRef, { 
          status: 'En progreso',
          feedback: feedback || 'Evidencia insuficiente, por favor revisar.'
        });
      }
    } catch (error) {
      console.error("Error al validar", error);
      alert("Error al guardar la validación.");
    }
  };

  // --- DERIVED DATA ---
  
  // Evidencias pendientes
  const pendingEvidences = tasks.filter(t => t.status === 'Pendiente de validación');

  // Metas agrupadas
  const cicloGoals = goals.filter(g => g.scope === 'CICLO');
  const entGoals = goals.filter(g => g.scope === 'ENTRENAMIENTO');
  const diariasGoals = goals.filter(g => g.scope === 'DIARIA');

  // Matriz de Riesgo por persona
  // Agrupamos tareas por responsible_role (o assigned_to si existiera, pero usamos el ID de rol por ahora como proxy de la persona/equipo en este MVP)
  const riskMatrix = [];
  const rolesWithTasks = [...new Set(tasks.map(t => t.role))];
  
  rolesWithTasks.forEach(roleId => {
    if (!roleId) return;
    const roleTasks = tasks.filter(t => t.role === roleId);
    const completed = roleTasks.filter(t => t.completed || t.status === 'Completada').length;
    const pendingReview = roleTasks.filter(t => t.status === 'Pendiente de validación').length;
    
    // Simplificación: Tareas vencidas serían las que no están completadas y su fecha ya pasó.
    // Como no tenemos deadline estricta aún, asumiremos riesgo si avance < 50% y hay muchas en progreso.
    const progress = roleTasks.length > 0 ? Math.round((completed / roleTasks.length) * 100) : 0;
    
    let riskLevel = 'BAJO';
    let riskColor = 'var(--color-success)';
    if (progress < 50) {
      riskLevel = 'ALTO';
      riskColor = 'var(--color-error)';
    } else if (progress < 80) {
      riskLevel = 'MEDIO';
      riskColor = '#f59e0b';
    }

    riskMatrix.push({
      roleId,
      total: roleTasks.length,
      completed,
      pendingReview,
      progress,
      riskLevel,
      riskColor
    });
  });

  if (loading) {
    return <div className="text-gold text-center" style={{ padding: '3rem' }}>Sincronizando Centro de Mando...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gold" style={{ margin: 0, fontSize: '2rem' }}>Centro de Mando Gerencial</h1>
          <p className="text-muted" style={{ margin: '0.5rem 0 0', textTransform: 'uppercase' }}>
            {currentCycle ? `${currentCycle.name} • ETAPA ACTUAL: ${currentStage}` : 'CARGANDO CICLO...'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn-primary" 
            onClick={() => setInterventionMode(!interventionMode)} 
            style={{ 
              padding: '0.8rem 1.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              background: interventionMode ? 'var(--color-error)' : 'var(--crear-blue)',
              borderColor: interventionMode ? 'var(--color-error)' : 'var(--crear-blue)'
            }}
          >
            <Filter size={18} /> {interventionMode ? "Mostrando Solo Críticos" : "Modo Intervención (Off)"}
          </button>
          <button className="btn-secondary" onClick={() => navigate('/')}>Volver al Inicio</button>
        </div>
      </div>

      {/* METAS LADO A LADO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Metas Ciclo */}
        <div className="glass-panel" style={{ padding: '1.5rem', opacity: interventionMode ? 0.4 : 1 }}>
          <h3 className="text-gold" style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={18} /> Metas de Ciclo (Top)
          </h3>
          {cicloGoals.map(g => (
            <div key={g.id} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                <span className="text-white">{g.title}</span>
                <span className="text-gold font-bold">{g.progress}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                <div style={{ height: '100%', width: `${Math.min(g.progress, 100)}%`, background: 'var(--crear-gold)' }} />
              </div>
            </div>
          ))}
          {cicloGoals.length === 0 && <p className="text-muted text-sm">Sin metas registradas</p>}
        </div>

        {/* Metas Entrenamiento */}
        <div className="glass-panel" style={{ padding: '1.5rem', opacity: interventionMode ? 0.4 : 1 }}>
          <h3 className="text-blue" style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} /> Metas Entrenamiento
          </h3>
          {entGoals.map(g => (
            <div key={g.id} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                <span className="text-white">{g.title}</span>
                <span className="text-blue font-bold">{g.progress}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                <div style={{ height: '100%', width: `${Math.min(g.progress, 100)}%`, background: 'var(--crear-blue)' }} />
              </div>
            </div>
          ))}
          {entGoals.length === 0 && <p className="text-muted text-sm">Sin metas registradas</p>}
        </div>

        {/* Metas Diarias */}
        <div className="glass-panel" style={{ padding: '1.5rem', opacity: interventionMode ? 0.4 : 1 }}>
          <h3 className="text-main" style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} /> Metas Diarias
          </h3>
          {diariasGoals.map(g => (
            <div key={g.id} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                <span className="text-white">{g.title}</span>
                <span className="text-main font-bold">{g.progress}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                <div style={{ height: '100%', width: `${Math.min(g.progress, 100)}%`, background: 'var(--text-main)' }} />
              </div>
            </div>
          ))}
          {diariasGoals.length === 0 && <p className="text-muted text-sm">Sin metas registradas</p>}
        </div>
      </div>

      {/* MATRIZ DE RIESGO */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 className="text-blue" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.8rem' }}>
          <Users size={18} /> Matriz de Riesgo Operativo
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid var(--crear-border)' }}>
                <th style={{ padding: '0.8rem' }}>Rol / Equipo</th>
                <th style={{ padding: '0.8rem' }}>Progreso</th>
                <th style={{ padding: '0.8rem' }}>Evidencias Pdtes</th>
                <th style={{ padding: '0.8rem' }}>Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {riskMatrix
                .filter(row => interventionMode ? row.riskLevel === 'ALTO' || row.pendingReview > 0 : true)
                .sort((a, b) => b.pendingReview - a.pendingReview || a.progress - b.progress)
                .map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: interventionMode && row.riskLevel === 'ALTO' ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                  <td style={{ padding: '1rem 0.8rem', color: 'white', fontWeight: 'bold', textTransform: 'uppercase' }}>{row.roleId}</td>
                  <td style={{ padding: '1rem 0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                         <div style={{ height: '100%', width: `${row.progress}%`, background: row.riskColor }} />
                      </div>
                      <span style={{ fontSize: '0.9rem', color: row.riskColor, fontWeight: 'bold' }}>{row.progress}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 0.8rem' }}>
                    {row.pendingReview > 0 ? (
                      <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '0.3rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {row.pendingReview} esperando
                      </span>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '0.9rem' }}>0</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem 0.8rem' }}>
                    <span style={{ color: row.riskColor, fontWeight: 'bold', fontSize: '0.85rem' }}>{row.riskLevel}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {interventionMode && riskMatrix.filter(r => r.riskLevel === 'ALTO' || r.pendingReview > 0).length === 0 && (
             <p className="text-muted text-center" style={{ margin: '2rem 0' }}>✅ No hay equipos en riesgo alto ni evidencias pendientes.</p>
          )}
        </div>
      </div>

      {/* PANEL DE VALIDACIÓN DE EVIDENCIAS */}
      {(!interventionMode || pendingEvidences.length > 0) && (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: pendingEvidences.length > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : 'none' }}>
          <h2 className="text-blue" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} /> Validar Evidencias ({pendingEvidences.length})
          </h2>
          
          {pendingEvidences.length === 0 ? (
            <p className="text-muted">No hay evidencias pendientes de validación en este momento.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              {pendingEvidences.map(task => (
                <div key={task.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--crear-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h4 className="text-white" style={{ margin: '0 0 0.2rem 0' }}>{task.task || task.title}</h4>
                    <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem', textTransform: 'uppercase' }}>Rol: {task.role || task.responsible_role}</p>
                    {task.evidence_url && (
                      <a href={task.evidence_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '0.5rem', color: 'var(--crear-blue)', fontSize: '0.9rem', textDecoration: 'none' }}>
                        🔗 Abrir Evidencia
                      </a>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleValidation(task.id, true)} style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', color: '#22c55e', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle size={16} /> Validar
                    </button>
                    <button onClick={() => handleValidation(task.id, false)} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <XCircle size={16} /> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FEED DE REPORTES RECIENTES */}
      {(!interventionMode) && (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 className="text-gold" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,215,0,0.2)', paddingBottom: '0.8rem' }}>
            <FileText size={20} /> Reportes Operativos Recientes ({reports.length})
          </h2>
          
          {reports.length === 0 ? (
            <p className="text-muted">No se han recibido reportes operativos en este ciclo.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
              {reports.map(rep => (
                <div key={rep.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--crear-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className="text-blue font-bold" style={{ textTransform: 'uppercase', fontSize: '0.9rem' }}>{rep.type}</span>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(rep.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-white" style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Enviado por: <strong>{rep.submitted_by}</strong></p>
                  
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '4px', fontSize: '0.85rem', color: '#ccc', maxHeight: '100px', overflowY: 'auto' }}>
                    {Object.entries(rep.data).map(([key, value]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.2rem 0' }}>
                        <span>{key.replace(/_/g, ' ')}:</span>
                        <strong className="text-white">{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

`

## Archivo: src\pages\GoalsBoard.jsx
`javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { ArrowLeft, Target, Settings, GitMerge } from 'lucide-react';

export default function GoalsBoard() {
  const { currentUser } = useAuth();
  const { currentCycle } = useCycles();
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  
  const stages = [
    { id: 'C1', name: 'Capítulo 1' },
    { id: 'C2', name: 'Capítulo 2' },
    { id: 'MJ_CREACION', name: 'MJ - Creación' },
    { id: 'MJ_RELACION', name: 'MJ - Relación' },
    { id: 'MJ_GRATITUD', name: 'MJ - Gratitud' },
    { id: 'MJ_VIAJE', name: 'MJ - El Viaje' }
  ];

  // Estructura para guardar las metas del wizard
  const [wizardData, setWizardData] = useState(
    stages.reduce((acc, stage) => {
      acc[stage.id] = { px: '', aliados: '', managers: '' };
      return acc;
    }, {})
  );

  useEffect(() => {
    const goalsRef = collection(db, 'goals');
    const q = query(goalsRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedGoals = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setGoals(loadedGoals);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleWizardChange = (stageId, field, value) => {
    setWizardData(prev => ({
      ...prev,
      [stageId]: { ...prev[stageId], [field]: value }
    }));
  };

  const handleGenerateGoals = async () => {
    try {
      const batch = writeBatch(db);
      const cycleGoalRef = doc(collection(db, 'goals'));
      
      // 1. Crear Meta Maestra del Ciclo
      batch.set(cycleGoalRef, {
        title: `Meta Global del Ciclo ${currentCycle?.name || ''}`,
        kpi: 'Cumplimiento General (%)',
        progress: 0,
        targetValue: 100, // Meta abstracta de ciclo se mide en % general
        currentValue: 0,
        scope: 'CICLO',
        parentId: null,
        ownerId: currentUser.uid,
        ownerName: currentUser.displayName,
        createdAt: new Date().toISOString()
      });

      // 2. Crear las metas de ENTRENAMIENTO basadas en el Wizard
      for (const stage of stages) {
        const data = wizardData[stage.id];
        
        if (data.px && Number(data.px) > 0) {
          batch.set(doc(collection(db, 'goals')), {
             title: `Sentados (Px) - ${stage.name}`,
             kpi: 'Cantidad de Px',
             targetValue: Number(data.px),
             currentValue: 0,
             progress: 0,
             scope: 'ENTRENAMIENTO',
             parentId: cycleGoalRef.id,
             stage: stage.id,
             ownerId: currentUser.uid,
             createdAt: new Date().toISOString()
          });
        }
        if (data.aliados && Number(data.aliados) > 0) {
          batch.set(doc(collection(db, 'goals')), {
             title: `Aliados - ${stage.name}`,
             kpi: 'Cantidad de Aliados',
             targetValue: Number(data.aliados),
             currentValue: 0,
             progress: 0,
             scope: 'ENTRENAMIENTO',
             parentId: cycleGoalRef.id,
             stage: stage.id,
             ownerId: currentUser.uid,
             createdAt: new Date().toISOString()
          });
        }
        if (data.managers && Number(data.managers) > 0) {
          batch.set(doc(collection(db, 'goals')), {
             title: `Managers - ${stage.name}`,
             kpi: 'Cantidad de Managers',
             targetValue: Number(data.managers),
             currentValue: 0,
             progress: 0,
             scope: 'ENTRENAMIENTO',
             parentId: cycleGoalRef.id,
             stage: stage.id,
             ownerId: currentUser.uid,
             createdAt: new Date().toISOString()
          });
        }
      }

      await batch.commit();
      alert('Metas de Ciclo generadas correctamente.');
      setShowWizard(false);
    } catch (e) {
      console.error(e);
      alert('Error generando metas.');
    }
  };

  const updateProgress = async (id, currentVal, targetVal) => {
    const newVal = prompt(`Ingresa nuevo valor acumulado (Meta: ${targetVal}):`, currentVal);
    if (newVal !== null && !isNaN(newVal)) {
      try {
        const numericVal = Number(newVal);
        const newProgress = Math.round((numericVal / targetVal) * 100);
        
        await updateDoc(doc(db, 'goals', id), { 
          currentValue: numericVal,
          progress: Math.min(newProgress, 100)
        });
        
        // Roll-up logic (Promedio a metas padre)
        const currentGoal = goals.find(g => g.id === id);
        if (currentGoal && currentGoal.parentId) {
          const siblings = goals.filter(g => g.parentId === currentGoal.parentId && g.id !== id);
          
          let totalProgress = newProgress;
          siblings.forEach(s => totalProgress += (s.progress || 0));
          const avgProgress = Math.round(totalProgress / (siblings.length + 1));
          
          await updateDoc(doc(db, 'goals', currentGoal.parentId), { progress: avgProgress });
          
          // Doble Roll-up
          const parentGoal = goals.find(g => g.id === currentGoal.parentId);
          if (parentGoal && parentGoal.parentId) {
             const parentSiblings = goals.filter(g => g.parentId === parentGoal.parentId && g.id !== parentGoal.id);
             let parentTotal = avgProgress;
             parentSiblings.forEach(s => parentTotal += (s.progress || 0));
             const parentAvg = Math.round(parentTotal / (parentSiblings.length + 1));
             await updateDoc(doc(db, 'goals', parentGoal.parentId), { progress: parentAvg });
          }
        }
      } catch (e) {
        console.error("Error actualizando meta:", e);
        alert('Error actualizando meta');
      }
    }
  };

  const renderGoal = (goal) => {
    const parentGoal = goals.find(g => g.id === goal.parentId);
    
    return (
      <div key={goal.id} className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ 
                fontSize: '0.7rem', fontWeight: 'bold', padding: '0.2rem 0.5rem', borderRadius: '4px',
                background: goal.scope === 'CICLO' ? 'var(--crear-gold)' : goal.scope === 'ENTRENAMIENTO' ? 'var(--crear-blue)' : 'var(--color-success)',
                color: '#000', letterSpacing: '1px'
              }}>
                {goal.scope}
              </span>
              {parentGoal && (
                <span className="text-muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <GitMerge size={12} /> Aporta a: {parentGoal.title}
                </span>
              )}
            </div>
            <h3 className="text-main" style={{ margin: '0 0 0.5rem 0' }}>{goal.title}</h3>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              {goal.targetValue ? `Avance: ${goal.currentValue || 0} de ${goal.targetValue}` : `KPI: ${goal.kpi}`}
            </p>
          </div>
          {goal.targetValue && (
            <button className="btn-secondary" onClick={() => updateProgress(goal.id, goal.currentValue, goal.targetValue)} style={{ padding: '0.5rem 1rem', height: 'fit-content' }}>
              Actualizar Valor
            </button>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(goal.progress, 100)}%`, background: goal.progress >= 100 ? 'var(--color-success)' : 'var(--crear-blue)', transition: 'width 0.3s ease' }} />
          </div>
          <span className="text-gold" style={{ fontWeight: 'bold', minWidth: '40px' }}>{goal.progress}%</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Target size={32} className="text-gold" />
          <div>
            <h1 className="text-gold uppercase" style={{ margin: 0 }}>Gestión de Metas</h1>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Seguimiento y acumulación operativa</p>
          </div>
        </div>
        {currentUser?.appRole === 'gerente' && (
          <button className="btn-primary" onClick={() => setShowWizard(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem' }}>
            <Settings size={18} /> Setup de Ciclo
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {loading ? <p className="text-muted text-center">Cargando metas...</p> : (
          goals.length > 0 ? goals.map(renderGoal) : <p className="text-muted" style={{ textAlign: 'center' }}>No hay metas configuradas. Inicia el Setup de Ciclo.</p>
        )}
      </div>

      {showWizard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 100, overflowY: 'auto', padding: '2rem 0' }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '90%', maxWidth: '600px', margin: 'auto' }}>
            <h2 className="text-gold" style={{ marginTop: 0, borderBottom: '1px solid rgba(255,215,0,0.2)', paddingBottom: '1rem' }}>
              Configuración Maestra: {stages[wizardStep].name}
            </h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>Define los números objetivo (Sentados) para este entrenamiento.</p>
            
            <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <label className="text-white" style={{ display: 'block', marginBottom: '0.5rem' }}>Meta de Participantes (Px):</label>
                <input 
                  type="number" 
                  value={wizardData[stages[wizardStep].id].px}
                  onChange={e => handleWizardChange(stages[wizardStep].id, 'px', e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }}
                  placeholder="Ej. 100"
                />
              </div>
              <div>
                <label className="text-white" style={{ display: 'block', marginBottom: '0.5rem' }}>Meta de Aliados requeridos:</label>
                <input 
                  type="number" 
                  value={wizardData[stages[wizardStep].id].aliados}
                  onChange={e => handleWizardChange(stages[wizardStep].id, 'aliados', e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }}
                  placeholder="Ej. 20"
                />
              </div>
              <div>
                <label className="text-white" style={{ display: 'block', marginBottom: '0.5rem' }}>Meta de Managers requeridos:</label>
                <input 
                  type="number" 
                  value={wizardData[stages[wizardStep].id].managers}
                  onChange={e => handleWizardChange(stages[wizardStep].id, 'managers', e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }}
                  placeholder="Ej. 5"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
              <button className="btn-secondary" onClick={() => setShowWizard(false)}>Cancelar</button>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {wizardStep > 0 && (
                  <button className="btn-secondary" onClick={() => setWizardStep(prev => prev - 1)}>Atrás</button>
                )}
                {wizardStep < stages.length - 1 ? (
                  <button className="btn-primary" onClick={() => setWizardStep(prev => prev + 1)}>Siguiente</button>
                ) : (
                  <button className="btn-primary" onClick={handleGenerateGoals} style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}>Finalizar y Crear</button>
                )}
              </div>
            </div>
            
            {/* Indicador de pasos */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
              {stages.map((_, i) => (
                <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: i === wizardStep ? 'var(--crear-gold)' : 'rgba(255,255,255,0.2)' }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

`

## Archivo: src\pages\Home.jsx
`javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useChecklist } from '../context/ChecklistContext';
import { LogOut, Clock, Calendar as CalendarIcon, MapPin, CheckCircle2, AlertCircle, Circle } from 'lucide-react';

export default function Home() {
  const { currentUser, logout } = useAuth();
  const { currentCycle, currentStage } = useCycles();
  const { tasks: allTasks, loading: loadingTasks } = useChecklist();
  const navigate = useNavigate();

  // Reloj local
  const [time, setTime] = useState(new Date());
  
  // Eventos locales
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const API_URL = 'https://script.google.com/macros/s/AKfycbxSZFhddMYyspZpkW-qPHEi8hycLGfnhFeCPSYc4VbckWIeiiZAbxyJY71XRb2-Ya4U/exec?action=getEventos';
        const res = await fetch(API_URL);
        const data = await res.json();
        
        // Filtrar y ordenar los eventos para mostrar solo los próximos 3
        if (Array.isArray(data)) {
           const now = new Date();
           // Removemos la parte de la hora para comparar solo fechas si queremos eventos de hoy en adelante
           now.setHours(0,0,0,0);
           
           const upcoming = data.filter(ev => {
             if (!ev.fecha_inicio) return false;
             const evDate = new Date(ev.fecha_inicio);
             return evDate >= now;
           }).sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
           
           setEvents(upcoming.slice(0, 3));
        }
      } catch (e) {
        console.error("Error fetching calendar", e);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchEvents();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gold" style={{ margin: 0, fontSize: '2rem' }}>Buenos días, {currentUser?.displayName || 'Equipo'}</h1>
          <p className="text-muted" style={{ margin: '0.5rem 0 0', textTransform: 'uppercase' }}>
            {currentCycle ? `${currentCycle.name} • ETAPA ACTUAL: ${currentStage}` : 'CARGANDO CICLO...'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <Clock size={16} className="text-blue" />
            <span className="text-white" style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-muted" style={{ marginLeft: '0.5rem' }}>
              {time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {currentUser?.photoURL && <img src={currentUser.photoURL} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />}
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 className="text-main" style={{ marginTop: 0, marginBottom: '1rem' }}>Mi Progreso General</h2>
        <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `82%`, background: 'var(--crear-gold)' }} />
        </div>
        <p className="text-gold" style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>82% completado</p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 className="text-blue" style={{ marginTop: 0, borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarIcon size={18} /> ¿QUÉ ESTÁ OCURRIENDO EN LA COMPAÑÍA? (Eventos Globales)
        </h3>
        {loadingEvents ? (
          <p className="text-muted">Cargando inteligencia global...</p>
        ) : events.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {events.map((ev, i) => (
              <li key={i} style={{ padding: '0.8rem 0', borderBottom: i !== events.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span className="text-white" style={{ fontWeight: 'bold' }}>{ev.nombre || ev.name || 'Entrenamiento'}</span>
                  <span className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    Trainer: {ev.trainer || ev.equipo || 'TBA'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="text-gold" style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}>
                    <MapPin size={12} /> {ev.sede || ev.sedeTag || 'GLOBAL'}
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {ev.fecha_inicio ? ev.fecha_inicio.substring(0, 10) : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No hay eventos próximos registrados hoy.</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {/* PANEL: HOY (Tus Pendientes) */}
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
          <h3 className="text-blue" style={{ marginTop: 0, borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem' }}>HOY (Tus Pendientes)</h3>
          {loadingTasks ? (
            <p className="text-muted">Calculando prioridades...</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(() => {
                const myTasks = allTasks.filter(t => t.role === currentUser?.appRole);
                const completed = myTasks.filter(t => t.completed || t.status === 'Completada').length;
                const criticas = myTasks.filter(t => !t.completed && t.riskLevel === 'critico').length;
                const importantes = myTasks.filter(t => !t.completed && t.status !== 'Completada' && t.riskLevel !== 'critico').length;
                
                return (
                  <>
                    <li 
                      onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=criticas`)}
                      style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                      <AlertCircle size={18} /> <strong>{criticas}</strong> críticas (Requieren acción hoy)
                    </li>
                    <li 
                      onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=importantes`)}
                      style={{ padding: '0.8rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: '#ffb347', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}
                    >
                      <Circle size={18} /> <strong>{importantes}</strong> importantes
                    </li>
                    <li 
                      onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=completed`)}
                      style={{ padding: '0.8rem', background: 'rgba(52, 168, 83, 0.1)', borderRadius: '8px', color: 'var(--color-success)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', border: '1px solid rgba(52, 168, 83, 0.2)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(52, 168, 83, 0.2)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(52, 168, 83, 0.1)'}
                    >
                      <CheckCircle2 size={18} /> <strong>{completed}</strong> completadas
                    </li>
                  </>
                );
              })()}
            </ul>
          )}
        </div>

        {/* PANEL: TU PRIORIDAD (Top 3) */}
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
          <h3 className="text-blue" style={{ marginTop: 0, borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem' }}>TU PRIORIDAD (Top 3)</h3>
          {loadingTasks ? (
            <p className="text-muted">Buscando tareas urgentes...</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(() => {
                const myTasks = allTasks.filter(t => t.role === currentUser?.appRole && !t.completed && t.status !== 'Completada' && t.status !== 'Pendiente de validación');
                // Ordenar: críticas primero, luego importantes, luego normales
                myTasks.sort((a, b) => {
                  const valA = a.riskLevel === 'critico' ? 3 : (a.riskLevel === 'normal' || !a.riskLevel ? 1 : 2);
                  const valB = b.riskLevel === 'critico' ? 3 : (b.riskLevel === 'normal' || !b.riskLevel ? 1 : 2);
                  return valB - valA;
                });
                
                const top3 = myTasks.slice(0, 3);
                
                if (top3.length === 0) {
                  return <li className="text-muted" style={{ padding: '1rem 0' }}>No tienes tareas urgentes pendientes. ¡Buen trabajo!</li>;
                }

                return top3.map(task => {
                  const color = task.riskLevel === 'critico' ? 'var(--color-error)' : (task.riskLevel === 'importante' ? '#ffb347' : 'var(--crear-blue)');
                  const bg = task.riskLevel === 'critico' ? 'rgba(239, 68, 68, 0.1)' : (task.riskLevel === 'importante' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0, 212, 255, 0.1)');
                  
                  return (
                    <li 
                      key={task.id}
                      onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=${task.riskLevel === 'critico' ? 'criticas' : 'importantes'}`)}
                      style={{ 
                        padding: '0.8rem', 
                        background: bg, 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.8rem', 
                        transition: 'all 0.2s', 
                        border: `1px solid ${color}33` 
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }}></span>
                      <span className="text-white" style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.task || task.title}
                      </span>
                    </li>
                  );
                });
              })()}
            </ul>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => navigate(currentUser?.appRole === 'gerente' ? '/gerente' : `/checklist/${currentUser?.appRole || 'capitan'}`)} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          IR A MI CHECKLIST OPERATIVO
        </button>
        <button className="btn-secondary" onClick={() => navigate('/metas')} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          VER MIS METAS
        </button>
        <button className="btn-secondary" onClick={() => navigate('/reportes')} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          ENVIAR REPORTES
        </button>
      </div>

    </div>
  );
}

`

## Archivo: src\pages\Login.jsx
`javascript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard } from 'lucide-react';

export default function Login() {
  const { currentUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/home');
    }
  }, [currentUser, navigate]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/home');
    } catch (error) {
      console.error("Error al iniciar sesión", error);
      alert("Hubo un error al iniciar sesión. Intenta nuevamente.");
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-dark)' }}>
      <div className="glass-panel" style={{ padding: '4rem', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <img src="/interrupcion_logo.jpg" alt="Logo" className="logo-holographic" style={{ width: '120px', margin: '0 auto 2rem', display: 'block' }} onError={(e) => e.target.style.display = 'none'} />
        
        <h1 className="text-gold uppercase" style={{ fontSize: '2rem', marginBottom: '0.5rem', letterSpacing: '2px' }}>CENTRO OPERATIVO</h1>
        <p className="text-muted" style={{ marginBottom: '3rem', fontSize: '1.1rem' }}>Plataforma de Gestión por Ciclos</p>
        
        <button 
          onClick={handleLogin}
          className="btn-primary" 
          style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '24px', height: '24px', background: 'white', borderRadius: '50%', padding: '2px' }} />
          Continuar con Google
        </button>
        
        <p className="text-muted" style={{ marginTop: '2rem', fontSize: '0.8rem' }}>Acceso exclusivo para equipo CREAR</p>
      </div>
    </div>
  );
}

`

## Archivo: src\pages\ReportesBoard.jsx
`javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { ArrowLeft, FileText, Send } from 'lucide-react';

export default function ReportesBoard() {
  const { currentUser } = useAuth();
  const { currentCycle, currentStage } = useCycles();
  const navigate = useNavigate();

  const [reportType, setReportType] = useState('');
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  // Limpiar form al cambiar tipo
  useEffect(() => {
    setFormData({});
  }, [reportType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Intentar parsear a número si aplica
    const val = isNaN(value) || value === '' ? value : Number(value);
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const calculateTotalLlamadas = (seccion) => {
    const keys = ['OK', 'XC', 'NC', 'NI', 'SIG', 'OS', 'PENDIENTES'];
    let total = 0;
    keys.forEach(k => {
      total += (formData[`${seccion}_${k}`] || 0);
    });
    return total;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reportType) return;
    setLoading(true);

    try {
      // 1. Guardar el reporte
      await addDoc(collection(db, 'reports'), {
        type: reportType,
        cycle_id: currentCycle?.id || 'unknown',
        stage: currentStage,
        submitted_by: currentUser.displayName || currentUser.email,
        created_at: new Date().toISOString(),
        data: formData
      });

      // 2. Regla de Negocio Crítica: Acumulación de Metas para "Llamadas"
      if (reportType === 'Llamadas') {
        const totalOkNuevos = formData['nuevos_OK'] || 0;
        const totalOkRezagados = formData['rezagados_OK'] || 0;
        const totalOk = totalOkNuevos + totalOkRezagados;

        if (totalOk > 0) {
          // Buscar metas activas de tipo ENTRENAMIENTO (simplificado para MVP: sumamos a la de C1 por ser llamadas, o a todas aplicables)
          const goalsQ = query(collection(db, 'goals'), where('scope', '==', 'ENTRENAMIENTO'));
          const snapshot = await getDocs(goalsQ);
          
          if (!snapshot.empty) {
            // Buscamos preferentemente la meta de Px de C1
            const entGoalDoc = snapshot.docs.find(d => d.data().stage === 'C1' && d.data().title.includes('Px')) || snapshot.docs[0];
            const data = entGoalDoc.data();
            const currentVal = data.currentValue || 0;
            const targetVal = data.targetValue || 1;
            const newVal = currentVal + totalOk;
            const newProgress = Math.min(Math.round((newVal / targetVal) * 100), 100);
            
            await updateDoc(doc(db, 'goals', entGoalDoc.id), { 
              currentValue: newVal,
              progress: newProgress
            });
            
            // Roll-up hacia CICLO (Opcional en MVP, el Gerente lo verá reflejado en la propia meta)
            const parentId = data.parentId;
            if (parentId) {
               // En una app completa, aquí iteraríamos los hermanos para promediar, similar a GoalsBoard
            }
          }
        }
      }

      alert('¡Reporte enviado exitosamente!');
      setReportType('');
      setFormData({});
    } catch (err) {
      console.error(err);
      alert('Hubo un error al enviar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    if (reportType === 'FDS') {
      return (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <h4 className="text-blue">Reporte FDS (Sede)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input type="number" name="px_llegaron_viernes" placeholder="Px que llegaron el viernes" onChange={handleChange} className="form-input" />
            <input type="number" name="px_bajaron" placeholder="Px que se bajaron durante fds" onChange={handleChange} className="form-input" />
            <input type="number" name="declaracion_px" placeholder="Declaración Px" onChange={handleChange} className="form-input" />
            <input type="number" name="enrolamiento" placeholder="Enrolamiento" onChange={handleChange} className="form-input" />
            <input type="number" name="px_en_0" placeholder="Px en 0" onChange={handleChange} className="form-input" />
            <input type="text" name="capitan" placeholder="Nombre Capitán" onChange={handleChange} className="form-input" />
            <input type="number" name="managers_llegaron" placeholder="Managers que llegaron" onChange={handleChange} className="form-input" />
            <input type="number" name="capitan_quedo" placeholder="Capitanes que quedaron" onChange={handleChange} className="form-input" />
            <input type="number" name="managers_quedaron" placeholder="Managers que quedaron" onChange={handleChange} className="form-input" />
            <input type="text" name="declaracion" placeholder="Declaración" onChange={handleChange} className="form-input" />
            <input type="number" name="total" placeholder="Total" onChange={handleChange} className="form-input" />
            <input type="number" name="promedio" placeholder="Promedio fin de semana" onChange={handleChange} className="form-input" step="0.01" />
          </div>
          <textarea name="comentarios" placeholder="Comentarios adicionales" onChange={handleChange} className="form-input" rows="3"></textarea>
        </div>
      );
    }

    if (reportType === 'Llamadas') {
      const metrics = ['OK', 'XC', 'NC', 'NI', 'SIG', 'OS', 'PENDIENTES'];
      return (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <div>
            <h4 className="text-blue" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(0,212,255,0.2)' }}>Nuevos</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {metrics.map(m => (
                <div key={`nuevos_${m}`}>
                  <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>{m}</label>
                  <input type="number" name={`nuevos_${m}`} onChange={handleChange} className="form-input" placeholder="0" />
                </div>
              ))}
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                 <label className="text-gold" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>TOTAL NUEVOS</label>
                 <span className="text-white font-bold">{calculateTotalLlamadas('nuevos')}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-blue" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(0,212,255,0.2)' }}>Rezagados</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {metrics.filter(m => m !== 'OS').map(m => (
                <div key={`rezagados_${m}`}>
                  <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>{m}</label>
                  <input type="number" name={`rezagados_${m}`} onChange={handleChange} className="form-input" placeholder="0" />
                </div>
              ))}
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                 <label className="text-gold" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>TOTAL REZAGADOS</label>
                 <span className="text-white font-bold">{calculateTotalLlamadas('rezagados')}</span>
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(52, 168, 83, 0.1)', border: '1px solid #34a853', padding: '1rem', borderRadius: '8px' }}>
            <p style={{ margin: 0, color: '#34a853', fontSize: '0.9rem' }}>
              💡 Al enviar este reporte, los "OK" se sumarán automáticamente a la Meta de Entrenamiento activa para evitar doble digitación.
            </p>
          </div>
        </div>
      );
    }

    if (reportType === 'C2') {
      return (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <h4 className="text-blue">Reporte Capítulo Dos</h4>
          <textarea name="detalle" placeholder="Detalle: (Px, Aliados, Capitán, Entrenador, Desertores)" onChange={handleChange} className="form-input" rows="4"></textarea>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <input type="number" name="pagos_c2_mj" placeholder="C2 + MJ" onChange={handleChange} className="form-input" />
             <input type="number" name="pagos_rotos" placeholder="Pagos Rotos / Desertores" onChange={handleChange} className="form-input" />
             <input type="number" name="total" placeholder="TOTAL PAGOS" onChange={handleChange} className="form-input" />
          </div>
        </div>
      );
    }

    if (reportType === 'MJ') {
      return (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <h4 className="text-blue">Reporte Maestría del Juego</h4>
          <select name="subtipo" onChange={handleChange} className="form-input">
            <option value="">Selecciona sección...</option>
            <option value="Asistencia">Asistencia</option>
            <option value="Declaracion">Declaración</option>
            <option value="Enrolamiento">Enrolamiento</option>
          </select>
          {formData.subtipo && (
             <textarea name="contenido" placeholder={`Contenido para ${formData.subtipo}...`} onChange={handleChange} className="form-input" rows="5"></textarea>
          )}
        </div>
      );
    }

    return <p className="text-muted">Selecciona un tipo de reporte para ver el formato.</p>;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <style>{`
        .form-input {
          width: 100%; padding: 0.8rem; background: rgba(0,0,0,0.5); 
          border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px;
        }
      `}</style>
      
      <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <FileText size={32} className="text-gold" />
          <div>
            <h1 className="text-gold uppercase" style={{ margin: 0 }}>Reportes Operativos</h1>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Digitalización de Formatos de Comunicación</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '2rem' }}>
            <label className="text-white" style={{ display: 'block', marginBottom: '0.5rem' }}>Tipo de Reporte a Enviar:</label>
            <select 
              value={reportType} 
              onChange={e => setReportType(e.target.value)} 
              className="form-input"
            >
              <option value="">-- Selecciona Formato Oficial --</option>
              <option value="Llamadas">1. Reporte de Llamadas (C1)</option>
              <option value="FDS">2. Reporte FDS (Sede)</option>
              <option value="C2">3. Reporte Capítulo Dos</option>
              <option value="MJ">4. Reporte Maestría del Juego</option>
            </select>
          </div>

          {reportType && (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '2rem' }}>
              {renderFormFields()}
            </div>
          )}

          {reportType && (
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Send size={20} /> {loading ? 'Enviando...' : 'Enviar Reporte y Acumular Datos'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

`

## Archivo: src\pages\RoleSelector.jsx
`javascript
import { useNavigate } from 'react-router-dom';
import { roles } from '../data/checklistData';

export default function RoleSelector() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <img src="/interrupcion_logo.jpg" alt="Logo" className="logo-holographic" style={{ width: '100px', margin: '0 auto 1.5rem', display: 'block' }} onError={(e) => e.target.style.display = 'none'} />
        <h1 className="text-gold" style={{ marginBottom: '1rem', letterSpacing: '2px' }}>SELECCIONA TU ROL</h1>
        <p className="text-muted" style={{ marginBottom: '2.5rem' }}>
          Para ingresar al checklist operativo, por favor selecciona tu rol en el equipo.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {roles.map(role => (
            <button
              key={role.id}
              className={role.id === 'gerente' ? "btn-primary" : "btn-secondary"}
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
              onClick={() => {
                if (role.id === 'gerente') {
                  navigate('/gerente');
                } else {
                  navigate(`/checklist/${role.id}`);
                }
              }}
            >
              {role.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

`

## Archivo: src\services\firebase.js
`javascript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCTMrA6A64s1ppDBBsol-fqam5Vch_Q5B0",
  authDomain: "centro-operativo-cpsl.firebaseapp.com",
  projectId: "centro-operativo-cpsl",
  storageBucket: "centro-operativo-cpsl.firebasestorage.app",
  messagingSenderId: "122588918051",
  appId: "1:122588918051:web:c85d6835b1b1f920fb1c96",
  measurementId: "G-XN2BX9CQYH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
// const analytics = getAnalytics(app); // Opcional, lo dejamos comentado por ahora si no está configurado

export { db, auth, googleProvider };

`


```

---

### 📄 Archivo: `MASTER_CHECKLIST_OPERATIVO_GERENTE_SEDE_V1.md`

```text
# MASTER CHECKLIST DEL GERENTE DE SEDE

## 1. Propósito del rol
El Gerente de Sede es el **Responsable Ejecutivo del Ciclo Operativo**. Su propósito es asegurar que cada ciclo operativo de la sede se ejecute de manera ordenada, rentable, segura y trazable, garantizando que cada área tenga responsables claros, recursos disponibles, metas definidas y resultados medibles.

## 2. Definición de ciclo operativo
Para CREAR PODER SIN LÍMITES, un ciclo operativo completo comprende:
**MJ → C1 → C2 → MJ**

Un ciclo comienza después del cierre de una Maestría del Juego y termina con el cierre de la siguiente Maestría del Juego.

## 3. Responsabilidades del Gerente
El Gerente NO es el ejecutor de todas las tareas. Sus 5 funciones principales son:
1. **Planificar** el ciclo.
2. **Asegurar recursos** financieros, humanos y logísticos.
3. **Asignar responsabilidades** claramente a los Coordinadores y Equipo de Apoyo.
4. **Supervisar resultados** y verificar evidencias.
5. **Resolver excepciones** que escalan los equipos.

*Ejemplo de Operación:* El Gerente no divide las listas de asistencia; el Gerente **verifica que el Coordinador responsable haya distribuido el listado, asignado responsables y establecido fechas de cumplimiento.**

## 4. Reglas de accountability
**Ninguna tarea crítica puede quedar sin responsable, fecha límite y evidencia de cumplimiento.**

Para garantizar esto, toda acción en este manual debe tener:
* **TAREA:** Acción específica.
* **RESPONSABLE:** Dueño absoluto de la tarea.
* **FECHA (Deadline):** Basado en notación T-.
* **PRIORIDAD:** Crítica, Alta, Media, Baja.
* **ESTADO:** Pendiente, En proceso, Completada, Bloqueada.
* **EVIDENCIA:** Documento, foto o confirmación oficial.
* **ESCALAMIENTO:** A quién contactar en caso de bloqueo.

## 5. Calendario maestro del ciclo
El sistema funciona independientemente de la fecha del entrenamiento utilizando fechas relativas al evento (DÍA 0):
* **T-30:** 30 días antes.
* **T-21:** 21 días antes.
* **T-14:** 14 días antes.
* **T-7:** 7 días antes.
* **T-1:** Día anterior.
* **DÍA 0:** Día del entrenamiento.
* **T+1:** Primer día posterior.
* **T+7:** Cierre posterior.

---

## 6. Gate T-30
**ENTRENADOR 100% CONFIRMADO.** *30 días antes de cada entrenamiento.*

* [ ] Gerente confirmado
* [ ] Presupuesto aprobado
* [ ] Salón definido
* [ ] Salón separado
* [ ] Salón pagado según corresponda
* [ ] Entrenador confirmado
* [ ] Hotel del entrenador confirmado
* [ ] Hotel pagado según corresponda
* [ ] Vuelo confirmado
* [ ] Vuelo pagado según corresponda
* [ ] Transporte confirmado
* [ ] Toda la logística del entrenador definida
* [ ] Responsable de cada traslado definido
* [ ] Contactos de emergencia/logística disponibles
* [ ] Documentación almacenada
* [ ] Evidencias cargadas en el sistema

**Resultados del Gate:**
* **VERDE:** Todo completo.
* **AMARILLO:** Existe una excepción documentada con responsable y deadline.
* **ROJO:** Existe un elemento crítico sin resolver.

## 7. Gate T-21
* [ ] Presupuesto operativo preliminar consolidado.
* [ ] Censo de pre-inscritos verificado.
* [ ] Equipo de Apoyo asignado preliminarmente.
* [ ] Materiales y manuales inventariados (con requerimiento de compras si es necesario).

## 8. Gate T-14
* [ ] Convocatoria de Equipo de Apoyo cerrada.
* [ ] Asignación de roles del Equipo de Apoyo confirmada.
* [ ] Lista de llamadas operativas distribuida a responsables.

## 9. Gate T-7
* [ ] Freeze de listas de asistencia iniciales.
* [ ] Armado de baúles y materiales confirmados.
* [ ] Uniformes del Equipo de Apoyo verificados.
* [ ] Confirmación de sala, acústica, micrófonos e iluminación.

## 10. Operación C1
* [ ] Registro puntual y resguardo de pertenencias operando.
* [ ] Tolerancia Cero en ingreso y puertas cerradas.
* [ ] Supervisión de métricas de asistencia y conciliación de caja sin microgestión.
* [ ] Cada incidencia/quiebre tiene un responsable asignado para resolverlo.

## 11. Cierre C1
* [ ] Domingo 20:30: Devolución del salón impecable.
* [ ] Cierre comercial exhaustivo.
* [ ] Reporte de ingresos, asistencia final y rezagados emitido a gerencia.

## 12. Operación C2
* [ ] Jueves: Arranque y grounding de equipo de oficina, Capitán y Entrenador.
* [ ] Control estricto de Palabras Rotas e inasistencias.
* [ ] Operación de mesas de enrolamiento a MJ.

## 13. Gate viernes C2
**El Gerente debe verificar obligatoriamente dos controles estratégicos:**

### A. Maestría del Juego (Groundings FDS)
El Coordinador de Maestría debe confirmar los groundings de los tres FDS.
| FDS MJ | Managers | Entrenador correspondiente | Grounding confirmado |
| ------ | -------- | -------------------------- | -------------------- |
| FDS 1  | ___      | ___                        | ☐                    |
| FDS 2  | ___      | ___                        | ☐                    |
| FDS 3  | ___      | ___                        | ☐                    |

### B. Meta de Rezagados de C1
El Gerente debe recibir y compartir la meta de rezagados del último C1 que deberán sentarse en el próximo C1.
* [ ] Número de rezagados identificado
* [ ] Meta definida y comunicada al equipo
* [ ] Lista nominal disponible
* [ ] Responsable de seguimiento asignado
* [ ] Fecha límite de contacto definida

## 14. Cierre C2
* [ ] Consolidar enrolamientos a MJ.
* [ ] Emitir reportes financieros a Dirección.
* [ ] Cerrar operación presencial del salón.

## 15. Preparación MJ
* [ ] Firmas de declaración de caja por Managers completadas.
* [ ] Relación estricta 1 Manager por cada 6 Participantes configurada en sistema.
* [ ] Grounding virtual de contexto ejecutado.
* [ ] Agenda del Entrenador bloqueada.

## 16. Operación MJ
* [ ] Jueves Pre-FDS: Entrenadores instalados en la ciudad.
* [ ] Viernes 17:00: Mesa de registro estricta (Sin firmas de reglas no hay ingreso).
* [ ] Lunes post-FDS: Seguimiento de Futuros Imposibles.
* [ ] Ejecución continua FDS 1, 2 y 3.

## 17. Cierre MJ
* [ ] Auditoría final de graduados.
* [ ] Entrega de aprendizajes por el Equipo de Apoyo.
* [ ] Certificación de Cierre de Oro (según métricas corporativas).

## 18. Post-ciclo
**JUEVES POST-C1/C2/MJ — Recuperación Operativa**
* Gerente no programa actividades operativas innecesarias.
* Se prioriza la recuperación del personal.
* Se atienden únicamente asuntos críticos de fuerza mayor.

## 19. KPIs
Los KPIs deben tener definición estricta: *Numerador / denominador / fuente / frecuencia / responsable*.
* **Retención MJ:** (Participantes que completan MJ / Participantes elegibles para MJ) × 100.
* **Conversión C1 a C2 (PP%):** (Inscritos en C2 / Graduados C1) × 100.
* **Margen Operativo:** Según fórmula y política oficial del departamento financiero corporativo.

## 20. Matriz de escalamiento
Ante excepciones o riesgos (Nivel Rojo), la línea oficial es:
1. Equipo de Apoyo escala a **Capitán**.
2. Capitán / Managers escalan a **Coordinador** (C1/C2 o MJ).
3. Coordinador escala a **Gerente de Sede**.
4. Gerente de Sede escala a **Dirección General**.

## 21. Evidencias obligatorias
Toda tarea finalizada requiere respaldo trazable:
* Transferencias bancarias (PDF/Captura).
* Reportes de asistencia (Lista firmada/exportada).
* Confirmaciones logísticas (Captura de chat con proveedor o email).
* Acuerdos de managers (Declaración firmada).

## 22. Dashboard del Gerente
Herramienta tecnológica que muestra en 30 segundos:
* **HOY:** Tareas pendientes (🔴 Críticas, 🟡 Próximas, 🟢 Completadas).
* **PRÓXIMO GATE:** Estado visual de los requisitos para avanzar a la siguiente fase operativa.
* **ACCOUNTABILITY:** Porcentaje de cumplimiento delegado a Coordinadores y Equipos.

## 23. Checklist diario
* Revisar el Radar de Riesgos en el Dashboard.
* Validar tareas Críticas (🔴) con fecha T- vencida.
* Coordinar la ejecución del Top 5 acciones directas.

## 24. Checklist semanal
* Auditoría de flujo de caja y presupuesto.
* Reuniones de alineación rápida con Coordinadores (Estado de Gates).
* Revisar metas heredadas (Rezagados C1).

## 25. Checklist de ciclo
* Asegurar que el Cierre de MJ conecte inmediatamente con la apertura de metas del siguiente C1.
* Evaluación integral de desempeño de la sede.

## 26. Matriz RACI
| Proceso/Gate | Responsible (Ejecuta) | Accountable (Aprueba) | Consulted (Asesora) | Informed (Notificado) |
| :--- | :--- | :--- | :--- | :--- |
| **Gate T-30 Logística** | Coord. Administrativo | Gerente Sede | Dirección | Entrenador |
| **Operación C1/C2** | Coord. C1/C2 | Gerente Sede | Capitán / Entrenador | Dirección |
| **Operación MJ** | Coord. Maestría | Gerente Sede | Entrenador | Dirección / Managers |
| **Meta Rezagados C1** | Coord. C1/C2 | Gerente Sede | - | Dirección / Equipo Apoyo |

```

---

### 📄 Archivo: `docs/01_Arquitectura_del_Sistema.md`

```text
# 1. Arquitectura del Sistema

**Frontend:** React (Vite)
**Backend/Base de Datos:** Firebase (Firestore)
**Autenticación:** Firebase Auth (Google)
**Hosting:** Firebase Hosting

*La plataforma está diseñada con una arquitectura orientada a eventos en tiempo real, lo que permite que gerentes y coordinadores vean el progreso sincronizado al instante.*
```

---

### 📄 Archivo: `docs/02_Modelo_de_Datos.md`

```text
# 2. Modelo de Datos

Estructura de Firestore:

- `users`: { id, name, email, role, team, supervisor, status }
- `cycles`: { id, name, startDate, endDate, stages (C1, C2, Maestria) }
- `tasks`: { id, cycleId, title, roleId, status, isCritical, hasEvidence }
- `goals`: { id, cycleId, ownerId, kpi, progress, evidenceRequired }
- `evidences`: { id, taskId, fileUrl, comments, status }

```

---

### 📄 Archivo: `docs/03_Mapa_de_Roles.md`

```text
# 3. Mapa de Roles (RBAC)

1. **Gerente:** Visión total, asignación de metas, creación de ciclos.
2. **Coordinador Maestría:** Checklist de maestría, gestión de metas propias.
3. **Coordinador C1 / C2:** Checklist específico de capítulo.
4. **Capitán:** Seguimiento de aliados, checklist de piso.
5. **Quantum Team (QT):** Auditoría operativa en sala, checklist de soporte.

```

---

### 📄 Archivo: `docs/04_Mapa_de_Permisos.md`

```text
# 4. Mapa de Permisos

- **Crear Ciclos:** Gerente.
- **Asignar Metas:** Gerente.
- **Actualizar Progreso de Tareas:** Propietario de la tarea.
- **Validar Evidencias:** Supervisor / Gerente / QT.
- **Modificar Usuarios:** Administrador / Gerente.

```

---

### 📄 Archivo: `docs/05_Flujo_de_Ciclos.md`

```text
# 5. Flujo de Ciclos

El ciclo es la unidad de tiempo central.

1. **Inicio:** Se define la fecha del C1.
2. **Preparación (Pre-C1):** Tareas de confirmación, pagos y logística.
3. **Ejecución (C1):** Operación de fin de semana.
4. **Seguimiento (Post-C1/Pre-C2):** Seguimiento a indecisos y confirmación para C2.
5. **Ejecución (C2):** Fin de semana del C2.
6. **Cierre:** Consolidación, maestría y apertura del nuevo ciclo.

```

---

### 📄 Archivo: `docs/06_Manual_Usuario.md`

```text
# 6. Manual de Usuario

1. **Ingresar:** Pulsa en 'Continuar con Google'.
2. **Pantalla Principal (Mi Día):** Revisa tus prioridades urgentes.
3. **Mi Checklist:** Marca tus tareas a medida que las completes. Si requieren evidencia, sube el archivo.
4. **Mis Metas:** Actualiza el % de avance de tus indicadores.

```

---

### 📄 Archivo: `docs/07_Manual_Administrador.md`

```text
# 7. Manual del Administrador (Gerente)

1. **Crear Ciclo:** Ve a Configuración > Ciclos > Nuevo.
2. **Panel Gerencial:** Revisa los semáforos de cumplimiento (Verde, Naranja, Rojo).
3. **Auditar Evidencias:** Entra al perfil de un coordinador y revisa los archivos adjuntos en sus tareas marcadas.

```

---

### 📄 Archivo: `docs/08_Configuracion_Checklists.md`

```text
# 8. Configuración de Checklists

Las plantillas base están en `src/data/checklistData.js`.
Próximamente se migrarán a Firebase para que el Gerente pueda agregar, editar o eliminar tareas desde la interfaz sin tocar código.

```

---

### 📄 Archivo: `docs/09_Lista_Funcionalidades.md`

```text
# 9. Lista de Funcionalidades (Implementadas)

- [x] Autenticación segura vía Google Auth (restringida a dominio y superadmins).
- [x] Sincronización en tiempo real con Firestore para Metas, Tareas y Correos.
- [x] Reglas de seguridad robustas implementadas a nivel de base de datos (`firestore.rules`).
- [x] Dashboard "30 Segundos" para Gerentes con priorización Top 5 de tareas críticas.
- [x] Wizard interactivo para Metas de Ciclo (Capítulos y MJ) y Metas Diarias.
- [x] Demonio de correo seguro con Node.js y Nodemailer.

```

---

### 📄 Archivo: `docs/10_Funcionalidades_Pendientes.md`

```text
# 10. Funcionalidades Pendientes (Roadmap)

- [ ] Integración con WhatsApp API para alertas automatizadas.
- [ ] Dashboards analíticos avanzados de productividad a largo plazo.
- [ ] Refinamiento del módulo de Evidencias (validaciones automatizadas).

```

---

### 📄 Archivo: `docs/11_Pruebas_Realizadas.md`

```text
# 11. Pruebas Realizadas

- Pruebas UI/UX: Interfaz Glassmorphism validada.
- Pruebas Estado: Cambio de estados de tareas y recálculo de progreso % funcionales en entorno local.

```

---

### 📄 Archivo: `docs/12_Riesgos_Detectados.md`

```text
# 12. Riesgos Detectados (Mitigados)

- **Contraseñas en código:** Mitigado implementando variables de entorno en `mailerDaemon.js`.
- **Fuga de autenticación:** Mitigado cerrando la brecha de `.*@gmail\.com$` en las Reglas de Firebase.
- **Acceso horizontal de colecciones:** Mitigado asociando la verificación de privilegios a la consulta de Roles (Custom Claims en base de datos) en `firestore.rules`.
- **Fuga de datos públicos:** Mitigado moviendo el directorio en duro de `usersData.js` hacia Firestore directamente.

```

---

### 📄 Archivo: `docs/13_Instrucciones_Despliegue.md`

```text
# 13. Instrucciones de Despliegue

Para poner esta aplicación en vivo y accesible desde cualquier navegador:

1. Instalar Firebase CLI: `npm install -g firebase-tools`.
2. Iniciar sesión: `firebase login`.
3. Inicializar: `firebase init hosting`.
4. Construir app: `npm run build`.
5. Desplegar: `firebase deploy`.

```

---

### 📄 Archivo: `docs/14_Instrucciones_Mantenimiento.md`

```text
# 14. Instrucciones de Mantenimiento

- Revisar la consola de Firebase (`console.firebase.google.com`) mensualmente para monitorear uso y costos (el plan gratuito Spark suele ser más que suficiente).
- Actualizar dependencias `npm update` al menos cada 6 meses por temas de seguridad.

```

---

### 📄 Archivo: `docs/MASTER_CHECKLIST_OPERATIVO_GERENTE_SEDE_V1.md`

```text
# 📋 MASTER CHECKLIST OPERATIVO DEL GERENTE DE SEDE
## SISTEMA DE GESTIÓN DEL CICLO OPERATIVO — CREAR PODER SIN LÍMITES (SO-AR)
**Versión:** `1.0 Oficial Corporativa`  
**Código del Documento:** `CPSL-OPS-MCH-01`  
**Aprobación:** Dirección Ejecutiva & Gerencia Global  
**Ámbito de Aplicación:** Todas las Sedes Operativas (Lima, Quito Ciclo 1, Quito Ciclo 2, Cuenca, Guayaquil, Medellín, México)

---

## 01. PROPÓSITO
Establecer el estándar operativo corporativo oficial, sin ambigüedades, que rige la planificación, ejecución, control financiero, supervisión logística y cierre de cada ciclo operativo en cada sede de CREAR PODER SIN LÍMITES. 

El presente manual y checklist maestro transforma la gestión de sede en un sistema de **alto rendimiento, trazabilidad total y accountability estricto**, garantizando que cada resultado crítico cuente con un responsable único, una fecha límite relativa al ciclo, evidencias obligatorias verificables y reglas claras de escalamiento.

---

## 02. ALCANCE
Aplica obligatoriamente a:
1. **Gerentes de Sede:** Como responsables ejecutivos integrales del ciclo operativo.
2. **Coordinadores de Capítulo 1 y Capítulo 2 (C1 / C2):** En sus fases de convocatoria, enrolamiento, logística de sala y seguimiento.
3. **Coordinadores de Maestría del Juego (MJ):** En la estructura de los 3 FDS, retiro "El Viaje", managers y graduaciones.
4. **Equipo de Apoyo y Facilitación (Staff de Entrenamiento):** En el montaje, sala, acústica, acreditación y soporte de participantes.
5. **Dirección Global y Finanzas:** En la auditoría de presupuestos, metas heredadas y cumplimiento de estándares.

---

## 03. DEFINICIÓN OFICIAL DEL CICLO OPERATIVO

> **CICLO OPERATIVO:** Período comprendido entre una Maestría del Juego y la siguiente Maestría del Juego, dentro del cual la sede ejecuta secuencialmente Capítulo 1, Capítulo 2 y Maestría del Juego.

### Flujo Continuo del Ciclo
```
┌────────────────────────────────────────────────────────────────────────┐
│                        CICLO OPERATIVO MAESTRO                         │
│                                                                        │
│   [ MAESTRÍA (MJ) ]  ──►  [ CAPÍTULO 1 (C1) ]  ──►  [ CAPÍTULO 2 (C2) ]│
│           │                                                │           │
│           └───────────◄── [ NUEVO CICLO: MJ ] ◄────────────┘           │
└────────────────────────────────────────────────────────────────────────┘
```

Cada entrenamiento dentro del ciclo se descompone en 3 fases:
* **Pre-Entrenamiento:** Planificación y preparación desde T-30 días hasta T-1 día.
* **Ejecución:** Operación presencial en sala durante el fin de semana (Viernes, Sábado y Domingo).
* **Post-Entrenamiento:** Balance financiero, auditoría de participantes, autopsia operativa y traspaso de metas (T+1 a T+7 días).

---

## 04. ROL Y RESPONSABILIDADES DEL GERENTE DE SEDE

### Definición Oficial del Cargo:
**Responsable Ejecutivo del Ciclo Operativo**

### Propósito del Cargo:
> Asegurar que cada ciclo operativo de la sede se ejecute de manera ordenada, rentable, segura, trazable y conforme a los estándares corporativos, garantizando que cada área tenga responsables claros, recursos disponibles, metas definidas y resultados medibles.

### La Regla de Oro del Gerente:
> **El Gerente de Sede no es el ejecutor de todas las tareas de la sede. Es el responsable de asegurar que cada resultado crítico tenga un dueño, una fecha, recursos suficientes, evidencia y seguimiento hasta su cierre.**

---

## 05. PRINCIPIOS DE ACCOUNTABILITY CORPORATIVO

Para erradicar la ambigüedad donde dos personas asumen que la otra ejecutará una labor, **toda tarea en el sistema debe contener obligatoriamente 8 atributos:**

| Atributo | Definición |
| :--- | :--- |
| **1. Resultado Esperado** | Qué entregable tangible o condición verificada se debe alcanzar (no una actividad vaga). |
| **2. Responsable Único** | Una sola persona con nombre, apellido y rol asignado. |
| **3. Fecha Límite (Deadline)** | Momento temporal exacto calculado a partir de la lógica T- (relativo al entrenamiento). |
| **4. Frecuencia** | Única por ciclo, diaria, semanal o por hito. |
| **5. Dependencia** | Qué condición previa debe estar cumplida antes de iniciar. |
| **6. Evidencia Obligatoria** | Documento, factura, itinerario, foto o acta que valida el cumplimiento. |
| **7. Estado Operativo** | Pendiente, En proceso, Completado, Vencido, Bloqueado o Requiere Escalamiento. |
| **8. Canal de Escalamiento** | A quién se notifica de inmediato si se detecta un desvío o retraso. |

---

## 06. ESTADOS OPERATIVOS ESTÁNDAR

La plataforma digital y el panel de control clasifican cada tarea en 6 estados oficiales:

* 🔵 **Pendiente:** Tarea programada cuya fecha límite aún no se alcanza y no ha iniciado.
* 🟡 **En Proceso:** Cuenta con responsable asignado y se encuentra en ejecución activa.
* 🟢 **Completado:** Resultado final alcanzado y evidencia verificada por supervisión.
* 🔴 **Vencido:** La fecha límite expiró sin haberse obtenido el resultado o la evidencia.
* ⚫ **Bloqueado:** Existe una dependencia externa no resuelta que impide avanzar.
* 🟠 **Requiere Escalamiento:** El responsable no puede resolver la traba y requiere intervención gerencial inmediata.

---

## 07. LÓGICA DE TIEMPO RELATIVO AL CICLO (NOTACIÓN T-)

El sistema automatiza todas las fechas del calendario a partir de los hitos del entrenamiento:

| Notación | Momento Temporal | Enfoque Principal |
| :--- | :--- | :--- |
| **T-30** | 30 días antes del inicio | Gate de Entrenador, Salón y Logística Crítica. |
| **T-21** | 21 días antes del inicio | Presupuesto preliminar, revisión de convocatoria y primer corte. |
| **T-14** | 14 días antes del inicio | Confirmación de materiales, equipo de apoyo y balance de llamadas. |
| **T-7** | 7 días antes del inicio | Gate Logístico: salones, listas de enrolados, gafetes y viáticos. |
| **T-3** | 3 días antes del inicio | Cierre de pagos de participantes, confirmación de vuelo/hotel de entrenador. |
| **T-1** | 1 día antes del inicio | Montaje de sala, prueba técnica de audio, micrófonos y acreditación. |
| **Día 1, 2, 3** | Durante el entrenamiento | Operación de sala, control de asistencia, dinámicas y soporte. |
| **T+1** | Día siguiente al cierre | Traspaso de indecisos, balances de egresos preliminares. |
| **T+3** | 3 días después del cierre | Liquidación financiera completa y conciliación de caja. |
| **T+7** | 7 días después del cierre | Reunión de Autopsia Operativa y balance de Metas Heredadas. |

---

## 08. GATES DE CONTROL CORPORATIVO

Un **Gate de Control** es un punto de validación obligatorio y no negociable. Si no se cumplen el 100% de los requisitos del Gate, el evento cambia automáticamente a estado de alerta.

---

### 🛑 GATE T-30 — ENTRENADOR Y LOGÍSTICA CRÍTICA
**Plazo Límite:** Exactamente 30 días antes del inicio del entrenamiento.  
**Responsable:** Gerente de Sede.  
**Regla:** *Si este Gate no está al 100%, el entrenamiento pasa a estado AMARILLO y se emite alerta a Dirección Global.*

**Checklist del Gate T-30:**
* [ ] **Entrenador Titular:** Confirmado formalmente con carta/contrato de asignación.
* [ ] **Honorarios Profesionales:** Monto acordado y calendario de desembolso aprobado por Finanzas.
* [ ] **Salón Principal de Entrenamiento:** Contrato firmado y reserva garantizada según política de sede.
* [ ] **Hotel del Entrenador:** Reserva confirmada en hotel oficial (ej. Hotel José Antonio Deluxe en Miraflores para Lima).
* [ ] **Itinerario de Vuelos:** Boletos aéreos comprados y emitidos con equipaje correspondiente.
* [ ] **Transporte Terrestre:** Chofer / traslado aeropuerto-hotel-salón programado con nombre y contacto.
* [ ] **Presupuesto Base:** Hoja de costos del fin de semana cargada y validada.
* [ ] **Evidencias en Sistema:** Reservas, boletos y contratos adjuntos en la plataforma.

---

### 🛑 GATE DE TRANSICIÓN C2 → MJ (VIERNES DE C2)
**Plazo Límite:** Viernes de Capítulo 2 a las 18:00 horas.  
**Responsable Conjunto:** Coordinador de Maestría (CMJ) & Gerente de Sede.  
**Regla:** *Asegura la continuidad operativa entre el cierre de C2 y la estructura de los 3 FDS de Maestría.*

**Checklist del Gate C2 → MJ:**
* [ ] **Managers Asignados:** Lista oficial de los managers para los 3 FDS de Maestría completada.
* [ ] **Managers por FDS:** Manager líder y co-manager asignados por cada fin de semana.
* [ ] **Entrenador de Maestría:** Asignación confirmada y coordinada para cada módulo.
* [ ] **Groundings Confirmados:** Fechas y salas de preparación de managers agendadas.
* [ ] **Retiro "El Viaje":** Sede de campo confirmada y reservada (ej. Hostal Sol y Luna en Cieneguilla para Lima).
* [ ] **Comunicación de Meta de Rezagados C1:** El Gerente publica en el sistema la meta oficial de rezagados de C1 a sentar en el siguiente ciclo.
* [ ] **Asignación de Dueño de Meta:** Registro del coordinador o capitán responsable de la meta de rezagados con fecha de seguimiento semanal.

---

## 09. MATRIZ DE RESPONSABILIDADES Y CHECKLIST OPERATIVO MAESTRO

### FASE 1: PRE-ENTRENAMIENTO (T-30 A T-1)

| Hito | Tarea / Resultado Esperado | Responsable | Deadline | Evidencia Obligatoria | Escalamiento |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T-30** | Confirmar y asegurar Entrenador, Salón, Vuelos y Hotel | Gerente | T-30 días | Contratos, Itinerarios y Reservas | Dirección Global |
| **T-21** | Validación de presupuesto de operación y punto de equilibrio | Gerente | T-21 días | Hoja de Presupuesto aprobada | Finanzas Global |
| **T-14** | Convocatoria y conformación del Equipo de Apoyo en Sala | Coordinador C1/MJ | T-14 días | Lista de Staff confirmada | Gerente de Sede |
| **T-14** | Inventario físico de insumos, papelería y botiquín | Equipo de Apoyo | T-14 días | Acta de Inventario de Sede | Gerente de Sede |
| **T-7** | Corte formal de participantes inscritos y balance de llamadas | Coordinador C1/C2 | T-7 días | Reporte oficial de inscritos | Gerente de Sede |
| **T-7** | Envío de orden de gafetes, manuales y materiales de impresión | Gerente | T-7 días | Orden de producción y muestras | Finanzas Global |
| **T-3** | Verificación de depósito final / viáticos y check-in del entrenador | Gerente | T-3 días | Pases de abordar y voucher de hotel | Dirección Global |
| **T-3** | Cierre de confirmaciones telefónicas y logística especial | Coordinador C1/C2 | T-3 días | Base de datos con estado 100% OK | Gerente de Sede |
| **T-1** | Montaje de salón, alineación de sillas, acústica y pruebas de audio | Equipo de Apoyo | T-1 (18:00h) | Check visual y prueba de sonido OK | Gerente de Sede |
| **T-1** | Recepción del entrenador en aeropuerto y traslado a hotel | Gerente / Chofer | T-1 (Llegada) | Reporte de llegada a hotel OK | Dirección Global |

---

### FASE 2: EJECUCIÓN DEL ENTRENAMIENTO (DÍAS 1, 2 Y 3)

| Momento | Tarea / Resultado Esperado | Responsable | Deadline | Evidencia Obligatoria | Escalamiento |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Viernes AM** | Apertura de acreditaciones y entrega de gafetes | Equipo de Apoyo | 08:00h | Lista de asistencia firmada | Gerente de Sede |
| **Viernes PM** | Reporte de sentados reales vs meta del ciclo | Gerente | 14:00h | Reporte FDS enviado al sistema | Dirección Global |
| **Sábado** | Supervisión de refrigerios, hidratación y tiempos de sesión | Equipo de Apoyo | Continuo | Bitácora de tiempos de sala | Gerente de Sede |
| **Sábado Noche** | Balance de cobranza de saldos y confirmación para C2 | Coordinador C1/C2 | 21:00h | Cuadre de caja de inscripciones | Gerente de Sede |
| **Domingo** | Coordinación de ceremonia de cierre y graduación | Equipo de Apoyo | 17:00h | Salón de invitados listo | Gerente de Sede |
| **Domingo Cierre**| Registro formal de desertores, graduados y enrolados al siguiente nivel | Coordinador C1/MJ | 21:00h | Acta de Cierre de Entrenamiento | Gerente de Sede |

---

### FASE 3: POST-ENTRENAMIENTO Y CIERRE DE CICLO (T+1 A T+7)

| Hito | Tarea / Resultado Esperado | Responsable | Deadline | Evidencia Obligatoria | Escalamiento |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T+1** | Traspaso inmediato de lista de participantes indecisos al equipo | Coordinador C1/C2 | Lunes 12:00h | Lista asignada en CRM / Sistema | Gerente de Sede |
| **T+3** | Conciliación total de ingresos, egresos y depósitos bancarios | Gerente | Miércoles 18:00h | Balance Financiero de Sede firmado | Finanzas Global |
| **T+3** | Pago y finiquito de servicios de hotel, salón y proveedores | Gerente | Miércoles 18:00h | Comprobantes de pago cargados | Finanzas Global |
| **T+7** | Reunión de Autopsia Operativa (Lecciones Aprendidas) | Gerente | Viernes 17:00h | Minuta de Autopsia con acuerdos | Dirección Global |
| **T+7** | Alta de Metas Heredadas en el nuevo ciclo operativo | Gerente | Viernes 19:00h | Metas registradas en SO-AR | Dirección Global |

---

## 10. EL SISTEMA DE HERENCIA DE METAS

Una de las innovaciones fundamentales del SO-AR es que **ninguna meta se pierde entre ciclos**.

### Ciclo de Vida de una Meta Heredada:
```
[ FIN DE CICLO ANTERIOR: C2 / MJ ]
                  │
                  ▼
  Gerente define: "Meta de Rezagados C1 = 35 personas"
                  │
                  ▼
        [ SISTEMA SO-AR ]
  Crea automáticamente el registro de Meta Heredada
                  │
                  ▼
  Asigna a: Coordinador de Capítulo 1
                  │
                  ▼
  Seguimiento Semanal: Reportes de Llamadas (OK, XC, NC, NI)
                  │
                  ▼
  [ DÍA 1 DEL PRÓXIMO C1 ]
  Conteo de Sentados Reales
                  │
                  ▼
  Cálculo de % Cumplimiento y Cierre formal en Balance Gerencial
```

---

## 11. MATRIZ RACI GENERAL DE LA SEDE

* **R (Responsible):** Quien realiza la labor.
* **A (Accountable):** Quien responde por el resultado final (único).
* **C (Consulted):** A quien se le consulta información previa.
* **I (Informed):** A quien se le notifica el resultado.

| Proceso Crítico | Gerente de Sede | Coordinador C1 / C2 | Coordinador Maestría | Equipo de Apoyo | Finanzas Global | Dirección Global |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Contratación de Entrenador (Gate T-30)** | **A / R** | I | I | I | C | I |
| **Reserva de Hoteles y Salones** | **A / R** | I | I | I | C | I |
| **Convocatoria y Enrolamiento C1** | A | **R** | I | C | I | I |
| **Estructura y Managers de Maestría** | A | I | **R** | C | I | I |
| **Montaje de Sala y Logística Presencial** | A | C | C | **R** | I | I |
| **Control de Presupuesto y Gastos** | **A / R** | I | I | I | C | I |
| **Definición de Metas Heredadas** | **A / R** | C | C | I | I | I |
| **Envío de Reportes Operativos** | A | **R** | **R** | **R** | I | I |

---

## 12. ESPECIFICACIÓN PARA LA PLATAFORMA DIGITAL (SO-AR)

La aplicación web debe implementar esta arquitectura bajo las siguientes directivas:

1. **Dashboard Gerencial "30 Segundos":**
   - **¿Dónde estamos?:** Indicador del Ciclo activo (MJ → C1 → C2 → MJ) y días faltantes para el próximo hito.
   - **¿Qué está en riesgo?:** Conteo de tareas vencidas (🔴), próximas a vencer (🟠) o bloqueadas (⚫).
   - **¿Qué debo hacer hoy?:** Top 5 de acciones prioritarias del día con botón de ejecución directa.
   - **¿Qué está delegado?:** Resumen de tareas asignadas a coordinadores y equipo de apoyo con sus % de avance.

2. **Lógica de Bloqueo por Gates:**
   - La plataforma no permitirá marcar como "Listo para Inicio" un entrenamiento si el **Gate T-30** o el **Gate C2 → MJ** presentan elementos pendientes o sin evidencia cargada.

3. **Multi-Rol Transparente:**
   - El personal con múltiples funciones (ej. Coordinación de Maestría + Coordinación C1 + Equipo de Apoyo) alternará su perfil mediante el **Role Switcher** superior sin duplicar cuentas ni perder trazabilidad.

4. **Persistencia Híbrida y Modo Zero-Failure:**
   - Sincronización en tiempo real con Firestore y respaldo local ante cortes de conectividad.
   - Enlace directo de hoteles oficiales con Google Maps y agendamiento en Google Calendar.

---

**FIN DEL DOCUMENTO MAESTRO**

```

---

### 📄 Archivo: `firestore.rules`

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Funciones de verificación de identidad y roles corporativos
    function isAuthenticated() {
      return request.auth != null && (
        request.auth.token.email == 'jose.sanchez@crearpsl.net' ||
        exists(/databases/$(database)/documents/users/$(request.auth.uid))
      );
    }
    
    function isSuperAdmin() {
      return isAuthenticated() && (
        request.auth.token.email == 'jose.sanchez@crearpsl.net' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'direccion'
      );
    }
    
    function isGerente() {
      return isAuthenticated() && (
        isSuperAdmin() || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'gerente'
      );
    }

    // Colección de Tareas SO-AR (tasks)
    match /tasks/{taskId} {
      allow read: if isAuthenticated();
      allow update: if isAuthenticated();
      allow create, delete: if isGerente();
    }
    
    // Colección de Metas y Cuotas (goals)
    match /goals/{goalId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isSuperAdmin();
    }
    
    // Colección de Reportes Operativos (reports)
    match /reports/{reportId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isGerente();
    }

    // Colección de Perfiles y Notas Privadas (user_profiles)
    match /user_profiles/{userDocId} {
      allow read: if isAuthenticated();
      allow write: if isGerente() || isSuperAdmin();
    }

    // Colección de Notificaciones (notifications)
    match /notifications/{notifId} {
      allow read: if isAuthenticated() && (
        resource.data.targetEmail == request.auth.token.email || 
        resource.data.targetRole == request.auth.token.role ||
        isSuperAdmin()
      );
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && (
        resource.data.targetEmail == request.auth.token.email || 
        isSuperAdmin()
      );
      allow delete: if isSuperAdmin();
    }

    // Colección de Hoteles y Salones (venues)
    match /venues/{venueId} {
      allow read: if isAuthenticated();
      allow write: if isGerente();
    }

    // Colección de Ciclos Operativos (cycles)
    match /cycles/{cycleId} {
      allow read: if isAuthenticated();
      allow write: if isGerente();
    }

    // Colección de Cola de Correo Electrónico (mail)
    match /mail/{mailId} {
      allow read: if isSuperAdmin();
      allow create: if isGerente() && 
                    request.resource.data.to is list &&
                    request.resource.data.message.subject is string;
      allow update, delete: if isSuperAdmin();
    }

    // Colección de Usuarios y Directorio (users)
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isSuperAdmin();
    }
  }
}

```

---

### 📄 Archivo: `index.html`

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="CREAR PODER SIN LÍMITES — Sistema Operativo de Alto Rendimiento SO-AR" />
    <meta http-equiv="X-Content-Type-Options" content="nosniff" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <title>CREAR PODER SIN LÍMITES — SO-AR</title>
    <!-- Fuentes de Google -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```

---

### 📄 Archivo: `package-lock.json`

```json
{
  "name": "cpsl-base-template",
  "version": "0.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "cpsl-base-template",
      "version": "0.0.0",
      "dependencies": {
        "firebase": "^12.17.1",
        "lucide-react": "^1.31.0",
        "react": "^19.2.8",
        "react-dom": "^19.2.8",
        "react-hot-toast": "^2.6.0",
        "react-router-dom": "^7.18.2"
      },
      "devDependencies": {
        "@types/react": "^19.2.17",
        "@types/react-dom": "^19.2.3",
        "@vitejs/plugin-react": "^6.0.4",
        "oxlint": "^1.75.0",
        "vite": "^8.2.0"
      }
    },
    "node_modules/@firebase/ai": {
      "version": "2.14.0",
      "resolved": "https://registry.npmjs.org/@firebase/ai/-/ai-2.14.0.tgz",
      "integrity": "sha512-TYEQqCQUTyVHuG/HVi9vau6F9kvEaS49o/hmdn/yUuN6ZXQkwIml2nNJTIBfjNl/r9LOxwUNILgcOY16nxObug==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/app-check-interop-types": "0.3.4",
        "@firebase/component": "0.7.4",
        "@firebase/logger": "0.5.1",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@firebase/app-types": "0.x"
      }
    },
    "node_modules/@firebase/analytics": {
      "version": "0.10.23",
      "resolved": "https://registry.npmjs.org/@firebase/analytics/-/analytics-0.10.23.tgz",
      "integrity": "sha512-34ALWXzWA6PTRUA5hipZmsm1RKzeecw5J1+qTCXsiMzwLqONC+GuTIQSdmm91MmTAEA+wG1Q5t0IFahcYQOqAA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/installations": "0.6.23",
        "@firebase/logger": "0.5.1",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/analytics-compat": {
      "version": "0.2.29",
      "resolved": "https://registry.npmjs.org/@firebase/analytics-compat/-/analytics-compat-0.2.29.tgz",
      "integrity": "sha512-allztvCvCUlItZzD97TiRAtGoFJzR1FQFmLxbaLc6PvgscqD9cl5NdKPTtka6keShVYXvCZJpzWcRoH4TME8rw==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/analytics": "0.10.23",
        "@firebase/analytics-types": "0.8.4",
        "@firebase/component": "0.7.4",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/analytics-types": {
      "version": "0.8.4",
      "resolved": "https://registry.npmjs.org/@firebase/analytics-types/-/analytics-types-0.8.4.tgz",
      "integrity": "sha512-zQ+XTgkwH6CY/eUSHJRP7e4LxM30RCxlCmob5sy2axs25GE3Ny0XdgpDscMTHHQIGqWkxPXad4w2Mw9sCgT8zQ==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/app": {
      "version": "0.16.0",
      "resolved": "https://registry.npmjs.org/@firebase/app/-/app-0.16.0.tgz",
      "integrity": "sha512-G+ZGEyVP8YTb3ay6A+XpcYgFH3sTESHcnHU/EyTktodqhz2BHkLq+QEP7IVwjiMX0cxYwpVKip0/wC0KZcn9vQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/logger": "0.5.1",
        "@firebase/util": "1.15.2",
        "idb": "7.1.1",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@firebase/app-check": {
      "version": "0.13.0",
      "resolved": "https://registry.npmjs.org/@firebase/app-check/-/app-check-0.13.0.tgz",
      "integrity": "sha512-AbMttBKazQvGVXBZhQdVAdPzRhwHyJAY3Ghu5y2C7IZKIDIppzNYz0shTZ1mP4FBJa+28BuC4t+5h1Q6pT3Asg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/logger": "0.5.1",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/app-check-compat": {
      "version": "0.4.6",
      "resolved": "https://registry.npmjs.org/@firebase/app-check-compat/-/app-check-compat-0.4.6.tgz",
      "integrity": "sha512-2pzNEZEkX84jSqy6TH6FI1HSLA1lc7kakRUybBbKjg9YhIttPlW/XX3N9CDtChji2PTTPWVPZiWhB10exHfA+A==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/app-check": "0.13.0",
        "@firebase/app-check-types": "0.5.4",
        "@firebase/component": "0.7.4",
        "@firebase/logger": "0.5.1",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/app-check-interop-types": {
      "version": "0.3.4",
      "resolved": "https://registry.npmjs.org/@firebase/app-check-interop-types/-/app-check-interop-types-0.3.4.tgz",
      "integrity": "sha512-zz3i6e13B8BfWiLy8MABtTh8aGIACgKbf9UVnyHcWs+yQzJXgQcl8A46b0zfaiJHdQ+niF0ouAfcpuf+3LMPQg==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/app-check-types": {
      "version": "0.5.4",
      "resolved": "https://registry.npmjs.org/@firebase/app-check-types/-/app-check-types-0.5.4.tgz",
      "integrity": "sha512-xV7JsIyzVr15aA7f3Pi0rB9gdBuVubs89FGA8VkRYA4g0l78poADgdfrScgf7NndSg9mm7cR7PJyY0+t22KaGw==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/app-compat": {
      "version": "0.5.16",
      "resolved": "https://registry.npmjs.org/@firebase/app-compat/-/app-compat-0.5.16.tgz",
      "integrity": "sha512-shQq37O8qELDzvsVwYPlDXwD1zlcrZ0m2bpBF5ov2HSbY8x+AHsnL5TtJ2e1JAfkQN05qHao1AfabS69PN6GiA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/app": "0.16.0",
        "@firebase/component": "0.7.4",
        "@firebase/logger": "0.5.1",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@firebase/app-types": {
      "version": "0.9.5",
      "resolved": "https://registry.npmjs.org/@firebase/app-types/-/app-types-0.9.5.tgz",
      "integrity": "sha512-YevqTjvo7Iujsa9Dwowmd6dSoElhzmD63ZSrq6bzjvQ6POjYgNjOFHLmNIgJs48eNO093NCERibuFnxbfOvU7A==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/logger": "0.5.1"
      }
    },
    "node_modules/@firebase/auth": {
      "version": "1.13.4",
      "resolved": "https://registry.npmjs.org/@firebase/auth/-/auth-1.13.4.tgz",
      "integrity": "sha512-s+NS1aV0DDyyfoIMeSz53HXnVTv7ufJjJfrP63XyaWHweJ5vOoxKWrTm5tO7S7PDqvyOa/Wi3oP0dgAo6JTMMA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/logger": "0.5.1",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@react-native-async-storage/async-storage": "^2.2.0 || ^3.0.0"
      },
      "peerDependenciesMeta": {
        "@react-native-async-storage/async-storage": {
          "optional": true
        }
      }
    },
    "node_modules/@firebase/auth-compat": {
      "version": "0.6.9",
      "resolved": "https://registry.npmjs.org/@firebase/auth-compat/-/auth-compat-0.6.9.tgz",
      "integrity": "sha512-/hHeTBmQ61+N5J1RECls+WfskZTY78JXr7aO5EMOfUpqJvDqvoS+568k0rp6Ss/4UWwBjadILs+H+SGy1zCS3A==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/auth": "1.13.4",
        "@firebase/auth-types": "0.13.1",
        "@firebase/component": "0.7.4",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/auth-interop-types": {
      "version": "0.2.5",
      "resolved": "https://registry.npmjs.org/@firebase/auth-interop-types/-/auth-interop-types-0.2.5.tgz",
      "integrity": "sha512-1Li/YuBDBAXcKv7BzY4U28gontUmAaw53sYiqbaVOMCFb2lFKK/c3CGMUWqtwe7+TXrl3poWnTCL5umYBg85Eg==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/auth-types": {
      "version": "0.13.1",
      "resolved": "https://registry.npmjs.org/@firebase/auth-types/-/auth-types-0.13.1.tgz",
      "integrity": "sha512-0c1Mnid0uMDfGJHeUS4zfvBa4/CedJXotGy/n/NZJnBjwiJawt0ZYU+wH2VAVLiRCEfG2ncCkAX3yd1/2nrB7g==",
      "license": "Apache-2.0",
      "peerDependencies": {
        "@firebase/app-types": "0.x",
        "@firebase/util": "1.x"
      }
    },
    "node_modules/@firebase/component": {
      "version": "0.7.4",
      "resolved": "https://registry.npmjs.org/@firebase/component/-/component-0.7.4.tgz",
      "integrity": "sha512-tLpOaaCol9ugUIYp2R3CbWPPA8Ajg/papX/XHEy8U52b/QXH3BbX8tTJX9aShDCjp+9sMAxMLD94i7lresdugQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@firebase/data-connect": {
      "version": "0.7.3",
      "resolved": "https://registry.npmjs.org/@firebase/data-connect/-/data-connect-0.7.3.tgz",
      "integrity": "sha512-nHBFk3Ntl+NZCRIUG2d5j7I69P0otjyQ/duhVKLbw4+5cNke/F6RK1pdE5Jnf831/QOTs2Bd00LlxlZ+jNsb9w==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/auth-interop-types": "0.2.5",
        "@firebase/component": "0.7.4",
        "@firebase/logger": "0.5.1",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/database": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/@firebase/database/-/database-1.1.4.tgz",
      "integrity": "sha512-D+j4+8uhGtNd1tVD+X+c8JrC4ppStGJKyujSQt2NPwdN26QcCk0BeIxue+UqspHkHiFHyQOimwlzjLewGq6S+A==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/app-check-interop-types": "0.3.4",
        "@firebase/auth-interop-types": "0.2.5",
        "@firebase/component": "0.7.4",
        "@firebase/logger": "0.5.1",
        "@firebase/util": "1.15.2",
        "faye-websocket": "0.11.4",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@firebase/database-compat": {
      "version": "2.1.6",
      "resolved": "https://registry.npmjs.org/@firebase/database-compat/-/database-compat-2.1.6.tgz",
      "integrity": "sha512-mu7S/75UIajB1A5M9Vfojk69LttW55uABp9nHEtWrV/mIaSEwvoaIe9GySsEzS2EKFK5/3f5okcAuUbihhYeJg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/database": "1.1.4",
        "@firebase/database-types": "1.0.21",
        "@firebase/logger": "0.5.1",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@firebase/app-compat": "0.x"
      },
      "peerDependenciesMeta": {
        "@firebase/app": {
          "optional": true
        },
        "@firebase/app-compat": {
          "optional": true
        }
      }
    },
    "node_modules/@firebase/database-types": {
      "version": "1.0.21",
      "resolved": "https://registry.npmjs.org/@firebase/database-types/-/database-types-1.0.21.tgz",
      "integrity": "sha512-SX1jUqhttKgg/m9dYRTvqU9QvucBooziWfA986r4cpsbi4zlsvewe424j3Vpduwd6DG1MSAMfBVT2VqA61FnkA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/app-types": "0.9.5",
        "@firebase/util": "1.15.2"
      }
    },
    "node_modules/@firebase/firestore": {
      "version": "4.17.0",
      "resolved": "https://registry.npmjs.org/@firebase/firestore/-/firestore-4.17.0.tgz",
      "integrity": "sha512-P9tof6pyO1bnLlMWbux+5O7WFJqlb7OTPMKxxOiXKYiQl7mxykAvxr1BFCgWeEXUU7DZxQncyJ040B0IhFVZCg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/logger": "0.5.1",
        "@firebase/util": "1.15.2",
        "@firebase/webchannel-wrapper": "1.0.6",
        "@grpc/grpc-js": "~1.9.0",
        "@grpc/proto-loader": "^0.7.8",
        "re2js": "^2.8.3",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/firestore-compat": {
      "version": "0.4.12",
      "resolved": "https://registry.npmjs.org/@firebase/firestore-compat/-/firestore-compat-0.4.12.tgz",
      "integrity": "sha512-k2uX81Ao/S0jnFcWGPOQpKK1cPlJHvD9WIqh/RE1XBDP2yg5zhE4rHhSg1rtB11k39q3nKon9XLNDDrPjGclag==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/firestore": "4.17.0",
        "@firebase/firestore-types": "3.0.4",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/firestore-types": {
      "version": "3.0.4",
      "resolved": "https://registry.npmjs.org/@firebase/firestore-types/-/firestore-types-3.0.4.tgz",
      "integrity": "sha512-jGn+JSS4X9zZsrfu7Yw66v5YRdOLD1oyQh4USR0xWl4CUqV/DA6bNIXRPpxH/cUl3iVTNiP6MN7g+EL42A4qfA==",
      "license": "Apache-2.0",
      "peerDependencies": {
        "@firebase/app-types": "0.x",
        "@firebase/util": "1.x"
      }
    },
    "node_modules/@firebase/functions": {
      "version": "0.13.6",
      "resolved": "https://registry.npmjs.org/@firebase/functions/-/functions-0.13.6.tgz",
      "integrity": "sha512-9obLnzeQUivK5lmtGFOU2ucQ38BjTp+jpPtbfFp/mDsdVCvEpRqdWNvMMQ6aQwR4vcVc/utsvngm5BRkXbc7ZA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/app-check-interop-types": "0.3.4",
        "@firebase/auth-interop-types": "0.2.5",
        "@firebase/component": "0.7.4",
        "@firebase/messaging-interop-types": "0.2.5",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/functions-compat": {
      "version": "0.4.6",
      "resolved": "https://registry.npmjs.org/@firebase/functions-compat/-/functions-compat-0.4.6.tgz",
      "integrity": "sha512-dj9sOet+FIU91jeU4A3vGJoXHty7NqkSfjRLCwLgJXPDk1m72KFuxD3nlFgw/yXx/Fr7UjqzbxZ0LrIOdpx7+w==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/functions": "0.13.6",
        "@firebase/functions-types": "0.6.4",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/functions-types": {
      "version": "0.6.4",
      "resolved": "https://registry.npmjs.org/@firebase/functions-types/-/functions-types-0.6.4.tgz",
      "integrity": "sha512-zV6kgqtduR4rUAdC/ilS7kmb93XD7bEZoJDlVBZqlOw2uGGGCNBQBuleww2rr0Ulr3L9o2TDjumEt68/l1f9DQ==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/installations": {
      "version": "0.6.23",
      "resolved": "https://registry.npmjs.org/@firebase/installations/-/installations-0.6.23.tgz",
      "integrity": "sha512-MBkbcQfd+3qHjW+slsH4s7jH5qTdGlYpwqmxEZ7QcIpgDxu1SKyU0f+mCZhCt1BCacLNiOWF5L0R06N0LtlfMg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/util": "1.15.2",
        "idb": "7.1.1",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/installations-compat": {
      "version": "0.2.23",
      "resolved": "https://registry.npmjs.org/@firebase/installations-compat/-/installations-compat-0.2.23.tgz",
      "integrity": "sha512-isaXmjb9roM83eVeXAe+ZRNKYNsSo2s0aNM+cy04AAGEyVL/d8Aa11GwEXovRFeYjl9+1yRAOxRDTOukZRwTxA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/installations": "0.6.23",
        "@firebase/installations-types": "0.5.4",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/installations-types": {
      "version": "0.5.4",
      "resolved": "https://registry.npmjs.org/@firebase/installations-types/-/installations-types-0.5.4.tgz",
      "integrity": "sha512-U2eFapdHwjb43Vx9o+Pmj4dFfvcHEK1IirEFLqMtWrTHvmdrS3gBpBD1kmJk/9HjsOtoHZxJ2Paoe79e+L1ZPg==",
      "license": "Apache-2.0",
      "peerDependencies": {
        "@firebase/app-types": "0.x"
      }
    },
    "node_modules/@firebase/logger": {
      "version": "0.5.1",
      "resolved": "https://registry.npmjs.org/@firebase/logger/-/logger-0.5.1.tgz",
      "integrity": "sha512-vZKLsqE1ABOy8OjQiE7cUTFn4gvaqlk88yp8N94Pk/sDpq61YqZGqmVFZTvOyflTwuYFcWirBdYGoJgbDaXKYQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@firebase/messaging": {
      "version": "0.13.1",
      "resolved": "https://registry.npmjs.org/@firebase/messaging/-/messaging-0.13.1.tgz",
      "integrity": "sha512-kL8fdjbNBI7hprlXJrUjktDWosrpT4JtfwXtVVevImPF/rBRAsC+LS/jIs+kgQVuotnvMhaBCgAFipBoY9YU9g==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/installations": "0.6.23",
        "@firebase/messaging-interop-types": "0.2.5",
        "@firebase/util": "1.15.2",
        "idb": "7.1.1",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/messaging-compat": {
      "version": "0.2.28",
      "resolved": "https://registry.npmjs.org/@firebase/messaging-compat/-/messaging-compat-0.2.28.tgz",
      "integrity": "sha512-/AmMqHRnSQhPsdeED3ocs+s30/tpFvZDiiwIYY2uXFRvLujo1fnbPOeCFoe4Y+dRy1LCSjpvJf+dy5ZTsxi1yg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/messaging": "0.13.1",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/messaging-interop-types": {
      "version": "0.2.5",
      "resolved": "https://registry.npmjs.org/@firebase/messaging-interop-types/-/messaging-interop-types-0.2.5.tgz",
      "integrity": "sha512-tUEKnaAP2Y/MNIqgnriPpV6e5l13Vs/+p2yrd6NGlncPJT9O3a8muYZtdnWe+IJ4fgKLHJVC79n/asxk/N5Msw==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/performance": {
      "version": "0.7.13",
      "resolved": "https://registry.npmjs.org/@firebase/performance/-/performance-0.7.13.tgz",
      "integrity": "sha512-1u6fuXP9cj0s+lkTFAspr/ttfPebPbEdpx+5Wdr4mPZbp8qH2KCMxOddEAR1ZMRa5GI0E7hDYSnolEmbqOFOAg==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/installations": "0.6.23",
        "@firebase/logger": "0.5.1",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0",
        "web-vitals": "^4.2.4"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/performance-compat": {
      "version": "0.2.26",
      "resolved": "https://registry.npmjs.org/@firebase/performance-compat/-/performance-compat-0.2.26.tgz",
      "integrity": "sha512-jgoocXLN6ao26xWQ8pzosmzQ33uLzGBJQPNK0NTbVy1XvIHr5pfgBf9hWLOxsWe+R7sJq5bjD+8ybXprmt61mA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/logger": "0.5.1",
        "@firebase/performance": "0.7.13",
        "@firebase/performance-types": "0.2.4",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/performance-types": {
      "version": "0.2.4",
      "resolved": "https://registry.npmjs.org/@firebase/performance-types/-/performance-types-0.2.4.tgz",
      "integrity": "sha512-kJSEk7b0uhpcPRyL4SQ/GPujLqk52XNKcXlnsKDbWGAb9vugcLvOU3u6zfEdwd+d8hWJb5S5ZizV1JFFI0nkKg==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/remote-config": {
      "version": "0.9.1",
      "resolved": "https://registry.npmjs.org/@firebase/remote-config/-/remote-config-0.9.1.tgz",
      "integrity": "sha512-nzQUSJnk1zAZEl2Q5O3I7Z61cYLK5JI4H6wyyOiHkVZ+bmgy1YXNNMptNbVjixMQ/eCzgA6nZRaC+1eBcJGUFA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/installations": "0.6.23",
        "@firebase/logger": "0.5.1",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/remote-config-compat": {
      "version": "0.2.28",
      "resolved": "https://registry.npmjs.org/@firebase/remote-config-compat/-/remote-config-compat-0.2.28.tgz",
      "integrity": "sha512-kEO9Gn6fbmVj7eNUtZ6d59mLgUDUD0qo7aCicGOWNfuRWTaUv3CF9DMYychO61zaEQ3cfA+CEny4V1E8A1gRGA==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/logger": "0.5.1",
        "@firebase/remote-config": "0.9.1",
        "@firebase/remote-config-types": "0.5.1",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/remote-config-types": {
      "version": "0.5.1",
      "resolved": "https://registry.npmjs.org/@firebase/remote-config-types/-/remote-config-types-0.5.1.tgz",
      "integrity": "sha512-cX/1LT6KQwkXzck2eSzeKnuvXZCyr8qaPpDcikoJs7jmI+oBOXixpDLeDtWj1U6GNMkIoXrEDNoyT2Ypcyp5/A==",
      "license": "Apache-2.0"
    },
    "node_modules/@firebase/storage": {
      "version": "0.14.4",
      "resolved": "https://registry.npmjs.org/@firebase/storage/-/storage-0.14.4.tgz",
      "integrity": "sha512-jfzEWZb3Fpsq3FwAB2ifoc8mcSh935qXdDou3TpyjDWa45hhNcZUv8/w28/10njByhfK7snbakKN30nwnzQ3/w==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x"
      }
    },
    "node_modules/@firebase/storage-compat": {
      "version": "0.4.4",
      "resolved": "https://registry.npmjs.org/@firebase/storage-compat/-/storage-compat-0.4.4.tgz",
      "integrity": "sha512-qSRgCB9f2R/nCp8t/8OC101cIFBFeUazlRInOMdzbnLzvrQBzEfx19SrR4pvdj/0+M+P/y8AK/a2s+3EB+B1Pw==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/component": "0.7.4",
        "@firebase/storage": "0.14.4",
        "@firebase/storage-types": "0.8.4",
        "@firebase/util": "1.15.2",
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "@firebase/app": "0.x",
        "@firebase/app-compat": "0.x"
      }
    },
    "node_modules/@firebase/storage-types": {
      "version": "0.8.4",
      "resolved": "https://registry.npmjs.org/@firebase/storage-types/-/storage-types-0.8.4.tgz",
      "integrity": "sha512-BT7cwxJOx8SWwlQfrlC+bD/Sk3Cw+1odCi8UZNFNWTVZoPsBnA5W+mqtZzVnvsdJpXCFGSGQ7R7vOR6dtM/BRA==",
      "license": "Apache-2.0",
      "peerDependencies": {
        "@firebase/app-types": "0.x",
        "@firebase/util": "1.x"
      }
    },
    "node_modules/@firebase/util": {
      "version": "1.15.2",
      "resolved": "https://registry.npmjs.org/@firebase/util/-/util-1.15.2.tgz",
      "integrity": "sha512-974pWIZVLDMc5GW5YAsj8y0XxULxIy/sPUy7tsxmWbF93KRIyh9xpuHlh0zDL+shUcf5nHDjFOg9YLiQ763eiA==",
      "hasInstallScript": true,
      "license": "Apache-2.0",
      "dependencies": {
        "tslib": "^2.1.0"
      },
      "engines": {
        "node": ">=20.0.0"
      }
    },
    "node_modules/@firebase/webchannel-wrapper": {
      "version": "1.0.6",
      "resolved": "https://registry.npmjs.org/@firebase/webchannel-wrapper/-/webchannel-wrapper-1.0.6.tgz",
      "integrity": "sha512-Vr/Mqu79dMwGRAyGbJ4uN4+BtXB3/mRTdzetD1daWNeG8QaWuzhhbG77GltO5c0yYmYls8i250iX73624GJd7Q==",
      "license": "Apache-2.0"
    },
    "node_modules/@grpc/grpc-js": {
      "version": "1.9.16",
      "resolved": "https://registry.npmjs.org/@grpc/grpc-js/-/grpc-js-1.9.16.tgz",
      "integrity": "sha512-wE4Ut/olIzfKqp631XrG+wbF0v1vWFN4YL9FyXC2LJiG33DsV7PLzURjrCvY/6je2ntdRkeLpPDluzSRGaVltQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "@grpc/proto-loader": "^0.7.8",
        "@types/node": ">=12.12.47"
      },
      "engines": {
        "node": "^8.13.0 || >=10.10.0"
      }
    },
    "node_modules/@grpc/proto-loader": {
      "version": "0.7.15",
      "resolved": "https://registry.npmjs.org/@grpc/proto-loader/-/proto-loader-0.7.15.tgz",
      "integrity": "sha512-tMXdRCfYVixjuFK+Hk0Q1s38gV9zDiDJfWL3h1rv4Qc39oILCu1TRTDt7+fGUI8K4G1Fj125Hx/ru3azECWTyQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "lodash.camelcase": "^4.3.0",
        "long": "^5.0.0",
        "protobufjs": "^7.2.5",
        "yargs": "^17.7.2"
      },
      "bin": {
        "proto-loader-gen-types": "build/bin/proto-loader-gen-types.js"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/@oxc-project/types": {
      "version": "0.144.0",
      "resolved": "https://registry.npmjs.org/@oxc-project/types/-/types-0.144.0.tgz",
      "integrity": "sha512-nuhZIOLuI6TFQ32I/WnUx+SCPY7SdSKwgnFHydAuoS1+Z4BRcaP+RRJmGzl9lw+0OFF7UmaESf7KQRXaNLHypg==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/Boshen"
      }
    },
    "node_modules/@oxlint/binding-android-arm-eabi": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-android-arm-eabi/-/binding-android-arm-eabi-1.78.0.tgz",
      "integrity": "sha512-Bu819lmAfZMUHErrpe0cEWj3iaefuUODHSU8+UbXy67V/r7/7f4K3FL0NmbD85E+wiFLDYuhP8Zlv0XnVeXshw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-android-arm64": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-android-arm64/-/binding-android-arm64-1.78.0.tgz",
      "integrity": "sha512-CDfxZgB61B7buRdY2FJoAYYPPXCZ1EoC1LKscnC5dg3kjobdxiconvAvvN1BmHyW4PyFT3jRLDag/BY/roSNBQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-darwin-arm64": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-darwin-arm64/-/binding-darwin-arm64-1.78.0.tgz",
      "integrity": "sha512-2Y2U9Ahrz+OO0Ej88f9SJYq51/jUBp1Mc7iZu0ukrbeeZ3gpRGfzIFnoqfHDY96xr0GEfNrPUBFEy0nN5aD7HA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-darwin-x64": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-darwin-x64/-/binding-darwin-x64-1.78.0.tgz",
      "integrity": "sha512-rpych6eJq6m9jDRypTEaPD1xysaEW5h9+xuxhGK/QhOg+/xaqPZrCrTNoIl/f3nEjuJeCEmstNDlrE9rJi/3/g==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-freebsd-x64": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-freebsd-x64/-/binding-freebsd-x64-1.78.0.tgz",
      "integrity": "sha512-IcMGrQT3QizkOESUJd5et+rOhVqSkNDfNik1cvrKDqIbzqx9KMtRswpFgkCuNTSwylCFLKhGUu8KmqY1ZnC0Dg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-arm-gnueabihf": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-arm-gnueabihf/-/binding-linux-arm-gnueabihf-1.78.0.tgz",
      "integrity": "sha512-/uLdoJ0IXE6vo/0f0LKjinQAp+re+VMaCWaNT8ENIv2EOCkSsc8SGaflXAuW0Jua2dq5+GLVWm1NQK7P3UFSNQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-arm-musleabihf": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-arm-musleabihf/-/binding-linux-arm-musleabihf-1.78.0.tgz",
      "integrity": "sha512-7xi4Wb/O8NRJhLoUXmDJMUVpNYvB5kefdhFU1Jb8rtae4QoXlTiLwI14X4YvAXVZLNZChP8m5qO9SQAlWQTbkQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-arm64-gnu": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-arm64-gnu/-/binding-linux-arm64-gnu-1.78.0.tgz",
      "integrity": "sha512-4hFW0+fVXa3OIh1Y4A5SPkmvI4wuuBSrCVKzOyE7PTjhc7yEqZ1pmvEEeS5Lj/MaqvegFxXyF33N+6jkehxdyg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-arm64-musl": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-arm64-musl/-/binding-linux-arm64-musl-1.78.0.tgz",
      "integrity": "sha512-oC0mvsgBJjlMijSDEhx9KuvR9zYeHXceA9MjbuXB1F8NSR78Yj2unOBrstEvTVaq+pko+kuue6DajC00eqvTdg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-ppc64-gnu": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-ppc64-gnu/-/binding-linux-ppc64-gnu-1.78.0.tgz",
      "integrity": "sha512-XAllT5SUZS+ohjuZ3/5S0cwe0r7eboiuigeStCZ5DXRYx/2KVM2UvQXvAfyzXEimtQjAB7cDQ2YxDe2Zl2WNQQ==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-riscv64-gnu": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-riscv64-gnu/-/binding-linux-riscv64-gnu-1.78.0.tgz",
      "integrity": "sha512-trucMER/0QtecoXvc1y/UVqE3kwJipDwrx4oHfj+nNm3dq2zjP44WT0CfHNDPM3G1DXIkx/gY6lAD21NSCZVhA==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-riscv64-musl": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-riscv64-musl/-/binding-linux-riscv64-musl-1.78.0.tgz",
      "integrity": "sha512-cm3O4F/HQbdzOUX5mKHqG5KDL6E5w0pnlZ+fbBy2rmLryPOowkuLagFHTopQsEIpjcaZoPOrL+BmmAytAG9HFg==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-s390x-gnu": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-s390x-gnu/-/binding-linux-s390x-gnu-1.78.0.tgz",
      "integrity": "sha512-33wRf6HqGNsybJ3qX4cGaQN2ODPxNmc1rMa0mrTmx3eFq1VzOnvQooi9bIGVYakW8a/wmqVx1mgsUm8R2xfTiw==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-x64-gnu": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-x64-gnu/-/binding-linux-x64-gnu-1.78.0.tgz",
      "integrity": "sha512-rRdISSYegj6VganMZ9tjRjijowfHJ09IZU01i0toBAqr6n5LEtwHq2IeS4FjW2RoskOHlb6efB26H5izYb3GEQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-x64-musl": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-x64-musl/-/binding-linux-x64-musl-1.78.0.tgz",
      "integrity": "sha512-GmsP4rW0xTL6u5CVdcDsaN5Fbc7hBc382Wmar1kttbnwSEviM+rSINKOMQ+UQ6iH+AGwC+8gaAiwu134Tgh6Lg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-openharmony-arm64": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-openharmony-arm64/-/binding-openharmony-arm64-1.78.0.tgz",
      "integrity": "sha512-sy9yeYuADc8a+n4TLBayzMCZiHPW78DcIFVpOXTmdKHWQeM9xe5uzkqIIZmi326D5hY9XVwacipEB1p7tQjPAg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-win32-arm64-msvc": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-win32-arm64-msvc/-/binding-win32-arm64-msvc-1.78.0.tgz",
      "integrity": "sha512-rjc2hF1KfMi8fZj1X/m3AmnHbdsF3rL0v6KQg0Uc880Yb2khjz+3U14sfdZ7jWTpRnN1m1NQa/TT7uU9lJWPrA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-win32-ia32-msvc": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-win32-ia32-msvc/-/binding-win32-ia32-msvc-1.78.0.tgz",
      "integrity": "sha512-zcuXFVrEFHIafRfkCQT8w/Xe41o07ozl/vwHq7p94vB29xVzsB0sZGYORU1jhcYKv3Lr0J3HbJ2T4fHH5rWmvA==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-win32-x64-msvc": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-win32-x64-msvc/-/binding-win32-x64-msvc-1.78.0.tgz",
      "integrity": "sha512-Sb5ocmLSuYeOuXd+CFOToGKp/gjXUEWDnvIGwhnh8aq8wY4TMmEnKnvbogSW7RdMZv77JSARduS7/gv+khYEjA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@protobufjs/aspromise": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/aspromise/-/aspromise-1.1.2.tgz",
      "integrity": "sha512-j+gKExEuLmKwvz3OgROXtrJ2UG2x8Ch2YZUxahh+s1F2HZ+wAceUNLkvy6zKCPVRkU++ZWQrdxsUeQXmcg4uoQ==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/base64": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/base64/-/base64-1.1.2.tgz",
      "integrity": "sha512-AZkcAA5vnN/v4PDqKyMR5lx7hZttPDgClv83E//FMNhR2TMcLUhfRUBHCmSl0oi9zMgDDqRUJkSxO3wm85+XLg==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/codegen": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/@protobufjs/codegen/-/codegen-2.0.5.tgz",
      "integrity": "sha512-zgXFLzW3Ap33e6d0Wlj4MGIm6Ce8O89n/apUaGNB/jx+hw+ruWEp7EwGUshdLKVRCxZW12fp9r40E1mQrf/34g==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/eventemitter": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@protobufjs/eventemitter/-/eventemitter-1.1.1.tgz",
      "integrity": "sha512-vW1GmwMZNnL+gMRaovlh9yZX74kc+TTU3FObkkurpMaRtBfLP3ldjS9KQWlwZgraRE0+dheEEoAxdzcJQ8eXZg==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/fetch": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@protobufjs/fetch/-/fetch-1.1.1.tgz",
      "integrity": "sha512-GpptLrs57adMSuHi3VNj0mAF8dwh36LMaYF6XyJ6JMWlVsc+t42tm1HSEDmOs3A8fC9yyeisgLhsTVQokOZ0zw==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "@protobufjs/aspromise": "^1.1.1"
      }
    },
    "node_modules/@protobufjs/float": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/float/-/float-1.0.2.tgz",
      "integrity": "sha512-Ddb+kVXlXst9d+R9PfTIxh1EdNkgoRe5tOX6t01f1lYWOvJnSPDBlG241QLzcyPdoNTsblLUdujGSE4RzrTZGQ==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/path": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/path/-/path-1.1.2.tgz",
      "integrity": "sha512-6JOcJ5Tm08dOHAbdR3GrvP+yUUfkjG5ePsHYczMFLq3ZmMkAD98cDgcT2iA1lJ9NVwFd4tH/iSSoe44YWkltEA==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/pool": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@protobufjs/pool/-/pool-1.1.0.tgz",
      "integrity": "sha512-0kELaGSIDBKvcgS4zkjz1PeddatrjYcmMWOlAuAPwAeccUrPHdUqo/J6LiymHHEiJT5NrF1UVwxY14f+fy4WQw==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@protobufjs/utf8": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@protobufjs/utf8/-/utf8-1.1.2.tgz",
      "integrity": "sha512-b1UQwcEZ4yCnMCD8DAL1VlbvBJE9/IX4FTIp7BG1xYpf29SLazLSrqUkj4w7Y5y7cCVP6E5tcqqcI0xemPkHug==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@rolldown/binding-android-arm64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-android-arm64/-/binding-android-arm64-1.2.4.tgz",
      "integrity": "sha512-jHC2cnyKz5xU2fhECtFl8OZ83cYNt13GZQD+0uMJ/X3o+ijmd56okHhTUwxVSHPx1IRVIJEZ1/1pPzeLCU6XKA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-darwin-arm64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-darwin-arm64/-/binding-darwin-arm64-1.2.4.tgz",
      "integrity": "sha512-Dc5mPD8F5F/FS8i01syd7FTF6yB2fVthH/TRkjwJkzUK6EpoxHtqvZQP5Zwq80/5z19TWYHIg1KOHboCgVx/aQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-darwin-x64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-darwin-x64/-/binding-darwin-x64-1.2.4.tgz",
      "integrity": "sha512-fpDm4oBo6SqLvWUYCmFhdde3U9KH2fRNNMeAnAPAIwxRL345xutL0EtEUcuoxsoazdJGv/MuDBQHlCDrtbvqOg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-freebsd-x64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-freebsd-x64/-/binding-freebsd-x64-1.2.4.tgz",
      "integrity": "sha512-rSJoreDE/HoIzoaib6MTp5jQtCTdMHKIvItAKT/ImS6Y6Ww76oUaeMyp4Vc/fAgd/ehji068IxetHXAnqUwN9A==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-arm-gnueabihf": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-arm-gnueabihf/-/binding-linux-arm-gnueabihf-1.2.4.tgz",
      "integrity": "sha512-/jm8OGHgn7oGaJu3i/qZI9spUGcJ+y/lk43ttQ/iO1tOd9NissG6o97bighBCiL+BKRngmcDuR6ikfwYdJmVuQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-arm64-gnu": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-arm64-gnu/-/binding-linux-arm64-gnu-1.2.4.tgz",
      "integrity": "sha512-tIP06BeD9EqvECBrPZ+sqdPlYrT+aYaAiu1wYziVx5elRK/ftm33JxVDy2bXGbr6J0CrtirCkR87/X5a2euEng==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-arm64-musl": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-arm64-musl/-/binding-linux-arm64-musl-1.2.4.tgz",
      "integrity": "sha512-Ql1Q0EQqVThvn9VAVlwNzsUvbSFtCMGjLpRRi4pk5i7NZZ4n5ISiLMjHYtus4VQ2PvkSw24zyaCVsiS+sXPj1w==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-ppc64-gnu": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-ppc64-gnu/-/binding-linux-ppc64-gnu-1.2.4.tgz",
      "integrity": "sha512-GjbjXD4XXfN19D0LZNbmiCBUoDiRACsYHr0yaIbbn8aFsXjHZifcYqu/W5Er5X2X990WjHXFrxarn5chzItorQ==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-s390x-gnu": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-s390x-gnu/-/binding-linux-s390x-gnu-1.2.4.tgz",
      "integrity": "sha512-p5WR0NOwaRmJ/B1b6IjEFLLivwEsf3PrdBIhRbhTCQisbo2SvHHpG4ELB/+FgQNnB88LTOF86upmJmbvZdQ2lw==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-x64-gnu": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-x64-gnu/-/binding-linux-x64-gnu-1.2.4.tgz",
      "integrity": "sha512-4/GyVjmhR+Tc6HLJvwc1sOhPqAZtySiSMesOZyX6JQ5XBxoTDEMKQzvo07NIK6nTon/SivlZqvhzvuVBNQhObQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-x64-musl": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-x64-musl/-/binding-linux-x64-musl-1.2.4.tgz",
      "integrity": "sha512-l9eeLsCNvPpmSXUej0etw/J1eqV0Jj1D5G/xG6YTijmE6dkv6E2QezgWbTfQk63v952DPqrjOCoiqxq7Bw0YUQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-openharmony-arm64": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-openharmony-arm64/-/binding-openharmony-arm64-1.2.4.tgz",
      "integrity": "sha512-e0F355MSTMm3+UOqtV3L24gFUp2N5m1f8L/7d56deik6va+AXdrt9F8LbzGpeWGWRbZEDq4m8NVnJDeBtf9DZg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-win32-arm64-msvc": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-win32-arm64-msvc/-/binding-win32-arm64-msvc-1.2.4.tgz",
      "integrity": "sha512-AWLi0uBRYh6QlE7OKhiz+phZC0qwtij2QZmhmOdsLdFn64m7oMpooE9ICE3lhm9xMb4SpDo2WbHcxX1iFLFtqw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-win32-x64-msvc": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-win32-x64-msvc/-/binding-win32-x64-msvc-1.2.4.tgz",
      "integrity": "sha512-UwSDJOg3dqCAejWdxclJjCsh3Qq4vLYMDxmyHqo1btz3stK2VqgwNd3mm5tuIwzSlGIQ/1H9Hr+Zn09mrezNqQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/pluginutils": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@rolldown/pluginutils/-/pluginutils-1.0.1.tgz",
      "integrity": "sha512-2j9bGt5Jh8hj+vPtgzPtl72j0yRxHAyumoo6TNfAjsLB04UtpSvPbPcDcBMxz7n+9CYB0c1GxQFxYRg2jimqGw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/node": {
      "version": "26.2.0",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-26.2.0.tgz",
      "integrity": "sha512-5IviulTZeRNp2vAJ514cc/HUlY5nZ9fCbq9DMyC52BrhFZACo3nI0R7qBxhQmo/d27NFe96ur/b7Wwxklda+kg==",
      "license": "MIT",
      "dependencies": {
        "undici-types": "~8.3.0"
      }
    },
    "node_modules/@types/react": {
      "version": "19.2.18",
      "resolved": "https://registry.npmjs.org/@types/react/-/react-19.2.18.tgz",
      "integrity": "sha512-AnzbBERsrLKtk2XSfTbYRLjQPdy116Sty4q+T+Bp3IC4l6jNBvreVPAHmpq9qhXQM7CXZPjLVmGMw9sy+hxQ3w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "csstype": "^3.2.2"
      }
    },
    "node_modules/@types/react-dom": {
      "version": "19.2.4",
      "resolved": "https://registry.npmjs.org/@types/react-dom/-/react-dom-19.2.4.tgz",
      "integrity": "sha512-Bsc+QHgp+P/F02XDzNCY9jnZNCUuLki36KT7VKrTXXLdHf+vHMNZnW1rVu5DNW/rCK+fya3DATySbLM4yhtKUw==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "^19.2.0"
      }
    },
    "node_modules/@vitejs/plugin-react": {
      "version": "6.0.5",
      "resolved": "https://registry.npmjs.org/@vitejs/plugin-react/-/plugin-react-6.0.5.tgz",
      "integrity": "sha512-BOVzne/NL162sMdResB25mUv+vWMF5NoAjNf09TeGlE7ZpszZWSD3winycicLJw72yeVsoCn/2kOhEuCvEShMA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@rolldown/pluginutils": "^1.0.1"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "peerDependencies": {
        "@rolldown/plugin-babel": "^0.1.7 || ^0.2.0",
        "babel-plugin-react-compiler": "^1.0.0",
        "vite": "^8.0.0"
      },
      "peerDependenciesMeta": {
        "@rolldown/plugin-babel": {
          "optional": true
        },
        "babel-plugin-react-compiler": {
          "optional": true
        }
      }
    },
    "node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "license": "MIT",
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/cliui": {
      "version": "8.0.1",
      "resolved": "https://registry.npmjs.org/cliui/-/cliui-8.0.1.tgz",
      "integrity": "sha512-BSeNnyus75C4//NQ9gQt1/csTXyo/8Sb+afLAkzAptFuMsod9HFokGNudZpi/oQV73hnVK+sR+5PVRMd+Dr7YQ==",
      "license": "ISC",
      "dependencies": {
        "string-width": "^4.2.0",
        "strip-ansi": "^6.0.1",
        "wrap-ansi": "^7.0.0"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "license": "MIT",
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==",
      "license": "MIT"
    },
    "node_modules/cookie": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/cookie/-/cookie-1.1.1.tgz",
      "integrity": "sha512-ei8Aos7ja0weRpFzJnEA9UHJ/7XQmqglbRwnf2ATjcB9Wq874VKH9kfjjirM6UhU2/E5fFYadylyhFldcqSidQ==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/csstype": {
      "version": "3.2.3",
      "resolved": "https://registry.npmjs.org/csstype/-/csstype-3.2.3.tgz",
      "integrity": "sha512-z1HGKcYy2xA8AGQfwrn0PAy+PB7X/GSj3UVJW9qKyn43xWa+gl5nXmU4qqLMRzWVLFC8KusUX8T/0kCiOYpAIQ==",
      "license": "MIT"
    },
    "node_modules/detect-libc": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz",
      "integrity": "sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==",
      "license": "MIT"
    },
    "node_modules/escalade": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
      "integrity": "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/faye-websocket": {
      "version": "0.11.4",
      "resolved": "https://registry.npmjs.org/faye-websocket/-/faye-websocket-0.11.4.tgz",
      "integrity": "sha512-CzbClwlXAuiRQAlUyfqPgvPoNKTckTPGfwZV4ZdAhVcP2lh9KUxJg2b5GkE7XbjKQ3YJnQ9z6D9ntLAlB+tP8g==",
      "license": "Apache-2.0",
      "dependencies": {
        "websocket-driver": ">=0.5.1"
      },
      "engines": {
        "node": ">=0.8.0"
      }
    },
    "node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/firebase": {
      "version": "12.17.1",
      "resolved": "https://registry.npmjs.org/firebase/-/firebase-12.17.1.tgz",
      "integrity": "sha512-dhp41ye9jMQvhx5FwjMkf/hjDHJApl7gXmvzOZGvP0M7c/GZGUnQ4qvsvlOBkF0Pa7wAwHMdcpL0ON2pXCQ4Sw==",
      "license": "Apache-2.0",
      "dependencies": {
        "@firebase/ai": "2.14.0",
        "@firebase/analytics": "0.10.23",
        "@firebase/analytics-compat": "0.2.29",
        "@firebase/app": "0.16.0",
        "@firebase/app-check": "0.13.0",
        "@firebase/app-check-compat": "0.4.6",
        "@firebase/app-compat": "0.5.16",
        "@firebase/app-types": "0.9.5",
        "@firebase/auth": "1.13.4",
        "@firebase/auth-compat": "0.6.9",
        "@firebase/data-connect": "0.7.3",
        "@firebase/database": "1.1.4",
        "@firebase/database-compat": "2.1.6",
        "@firebase/firestore": "4.17.0",
        "@firebase/firestore-compat": "0.4.12",
        "@firebase/functions": "0.13.6",
        "@firebase/functions-compat": "0.4.6",
        "@firebase/installations": "0.6.23",
        "@firebase/installations-compat": "0.2.23",
        "@firebase/messaging": "0.13.1",
        "@firebase/messaging-compat": "0.2.28",
        "@firebase/performance": "0.7.13",
        "@firebase/performance-compat": "0.2.26",
        "@firebase/remote-config": "0.9.1",
        "@firebase/remote-config-compat": "0.2.28",
        "@firebase/storage": "0.14.4",
        "@firebase/storage-compat": "0.4.4",
        "@firebase/util": "1.15.2"
      }
    },
    "node_modules/fsevents": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz",
      "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/get-caller-file": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/get-caller-file/-/get-caller-file-2.0.5.tgz",
      "integrity": "sha512-DyFP3BM/3YHTQOCUL/w0OZHR0lpKeGrxotcHWcqNEdnltqFwXVfhEBQ94eIo34AfQpo0rGki4cyIiftY06h2Fg==",
      "license": "ISC",
      "engines": {
        "node": "6.* || 8.* || >= 10.*"
      }
    },
    "node_modules/goober": {
      "version": "2.1.19",
      "resolved": "https://registry.npmjs.org/goober/-/goober-2.1.19.tgz",
      "integrity": "sha512-U7veizMqxyKlM58+Z5j2ngJBH/r9siDmxpvNxSw0PylF6WQvrASJEZrxh1hidRBJc2jqoBVSyOban5u8m+6Rxg==",
      "license": "MIT",
      "peerDependencies": {
        "csstype": "^3.0.10"
      }
    },
    "node_modules/http-parser-js": {
      "version": "0.5.10",
      "resolved": "https://registry.npmjs.org/http-parser-js/-/http-parser-js-0.5.10.tgz",
      "integrity": "sha512-Pysuw9XpUq5dVc/2SMHpuTY01RFl8fttgcyunjL7eEMhGM3cI4eOmiCycJDVCo/7O7ClfQD3SaI6ftDzqOXYMA==",
      "license": "MIT"
    },
    "node_modules/idb": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/idb/-/idb-7.1.1.tgz",
      "integrity": "sha512-gchesWBzyvGHRO9W8tzUWFDycow5gwjvFKfyV9FF32Y7F50yZMp7mP+T2mJIWFx49zicqyC4uefHM17o6xKIVQ==",
      "license": "ISC"
    },
    "node_modules/is-fullwidth-code-point": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/is-fullwidth-code-point/-/is-fullwidth-code-point-3.0.0.tgz",
      "integrity": "sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/lightningcss": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss/-/lightningcss-1.33.0.tgz",
      "integrity": "sha512-WkUDrojuJs0xkgGf2udWxa3yGBRxPtxUkB79i6aCZLRgc7PM8fZe9TosfPDcvEpQZbuFASnHYmRLBLUbmLOIIA==",
      "dev": true,
      "license": "MPL-2.0",
      "dependencies": {
        "detect-libc": "^2.0.3"
      },
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      },
      "optionalDependencies": {
        "lightningcss-android-arm64": "1.33.0",
        "lightningcss-darwin-arm64": "1.33.0",
        "lightningcss-darwin-x64": "1.33.0",
        "lightningcss-freebsd-x64": "1.33.0",
        "lightningcss-linux-arm-gnueabihf": "1.33.0",
        "lightningcss-linux-arm64-gnu": "1.33.0",
        "lightningcss-linux-arm64-musl": "1.33.0",
        "lightningcss-linux-x64-gnu": "1.33.0",
        "lightningcss-linux-x64-musl": "1.33.0",
        "lightningcss-win32-arm64-msvc": "1.33.0",
        "lightningcss-win32-x64-msvc": "1.33.0"
      }
    },
    "node_modules/lightningcss-android-arm64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-android-arm64/-/lightningcss-android-arm64-1.33.0.tgz",
      "integrity": "sha512-gEpRTalKdosp4Bb8qWtc2iOgE5SeIHlpS1up9bFq2wAyYhl1UdTObYiHe98zEM9SQvSoqQZ1IQD0JNpg3Ml5pg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-darwin-arm64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-arm64/-/lightningcss-darwin-arm64-1.33.0.tgz",
      "integrity": "sha512-Sciaz8eenNTKn9b3t7+xr0ipTp9YxKQY4npwQ3mrRuL0BAVHBLyZxofhaKBAVtzmtRZ/zTyo0/to4B1uWG/Djg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-darwin-x64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-x64/-/lightningcss-darwin-x64-1.33.0.tgz",
      "integrity": "sha512-Z5UPAxzrjlWNNyGy6i65cJzzvgJ5D3T6wMvs+gWpY9d7qRhANrxqAp6LhxIgZhWEw18RfJTGcRxjuLIBr+m8XQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-freebsd-x64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-freebsd-x64/-/lightningcss-freebsd-x64-1.33.0.tgz",
      "integrity": "sha512-QQM/Ti/hQajJwCY+RiWuCZ9sdtI/XQk7nDK5vC8kkdwixezOlDgvDx7+RT+QjK6FcFT4MpsuoBnHIo/O3StRRg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm-gnueabihf": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm-gnueabihf/-/lightningcss-linux-arm-gnueabihf-1.33.0.tgz",
      "integrity": "sha512-N7FVBe6iS24MlM6R/4RBTxGhQheZGs7tiQ9U32UtF75NzP5Q7xWPRqLBCKxlRQRk3rY1jCIPLzx7WzOhuUIRLQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-gnu": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-gnu/-/lightningcss-linux-arm64-gnu-1.33.0.tgz",
      "integrity": "sha512-j2v/itmy4HlNxlc6voKXYgBqNi0Ng2LShg4z7GufpEgs05P+2suBVyi9I6YHq5uoVFx9ETin3eCEhLVyXGQnKg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-musl": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-musl/-/lightningcss-linux-arm64-musl-1.33.0.tgz",
      "integrity": "sha512-yiO5ROMuYQgXbC60yjZU5CYSFZGKXL0HFATXt9mHJn1+zW55oCtMI9NfcVhYLMFDL7gV7oBPon/EmMMGg2OvtQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-gnu": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-gnu/-/lightningcss-linux-x64-gnu-1.33.0.tgz",
      "integrity": "sha512-ar+Ju7LmcN0Jo4FpL4hpFybwNG9/3A/Br5KW2n2jyODg3MEZXaDYADdemoNS+BDNfMgKvylJLj4S5tyRActuAg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-musl": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-musl/-/lightningcss-linux-x64-musl-1.33.0.tgz",
      "integrity": "sha512-RYiYbkokw0trfKqqzfF55lginwEPrD3OJDfTuJzFs1MK6iFnDenaz1fqLLtX4ITG3OktJQXOeTaw1awrBAlZPw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-arm64-msvc": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-arm64-msvc/-/lightningcss-win32-arm64-msvc-1.33.0.tgz",
      "integrity": "sha512-1K+MPfLSFVpphzpdbfkhlWk6wBrTObBzS2T6db10PNOZgR9GoVsAWzwNyuhUYYbTp23j+4RrncfujZ4uAzXvwA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-x64-msvc": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-x64-msvc/-/lightningcss-win32-x64-msvc-1.33.0.tgz",
      "integrity": "sha512-OlEICDx/Xl0FqSp4bry8zFnCvGpig3Gl4gCquvYwHuqJKEC1+n9NgDniFvqHGmMv1ZkqDJrDqKKSykTDX+ehuA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lodash.camelcase": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/lodash.camelcase/-/lodash.camelcase-4.3.0.tgz",
      "integrity": "sha512-TwuEnCnxbc3rAvhf/LbG7tJUDzhqXyFnv3dtzLOPgCG/hODL7WFnsbwktkD7yUV0RrreP/l1PALq/YSg6VvjlA==",
      "license": "MIT"
    },
    "node_modules/long": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/long/-/long-5.3.2.tgz",
      "integrity": "sha512-mNAgZ1GmyNhD7AuqnTG3/VQ26o760+ZYBPKjPvugO8+nLbYfX6TVpJPseBvopbdY+qpZ/lKUnmEc1LeZYS3QAA==",
      "license": "Apache-2.0"
    },
    "node_modules/lucide-react": {
      "version": "1.31.0",
      "resolved": "https://registry.npmjs.org/lucide-react/-/lucide-react-1.31.0.tgz",
      "integrity": "sha512-G8u2eEtoHUnUa9f8lbvqDhCiORMnYLdUEo06EEG9MQvHQrInKcX3Pa2TH39MM5qyzRcWETxB0+aOwAPI1g1kEg==",
      "license": "ISC",
      "peerDependencies": {
        "react": "^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0"
      }
    },
    "node_modules/nanoid": {
      "version": "3.3.18",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.18.tgz",
      "integrity": "sha512-DTg4MJbGMWkfi6VZFdNt2/caMbQy4Ou+Op/hJQvGEWcnVfoA1QA+xzRKAzw9jD6+GVOOeYr/mIcuDSdug6F6+w==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/oxlint": {
      "version": "1.78.0",
      "resolved": "https://registry.npmjs.org/oxlint/-/oxlint-1.78.0.tgz",
      "integrity": "sha512-QgQePuxIqKOzo1KSjG2EnITEeWvWnKAm77eq8nrMtf6AGoA+zyGc4PFYtDNJSD25g/ibOwfQ851hZ4/SPkMVoA==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "oxlint": "bin/oxlint"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/Boshen"
      },
      "optionalDependencies": {
        "@oxlint/binding-android-arm-eabi": "1.78.0",
        "@oxlint/binding-android-arm64": "1.78.0",
        "@oxlint/binding-darwin-arm64": "1.78.0",
        "@oxlint/binding-darwin-x64": "1.78.0",
        "@oxlint/binding-freebsd-x64": "1.78.0",
        "@oxlint/binding-linux-arm-gnueabihf": "1.78.0",
        "@oxlint/binding-linux-arm-musleabihf": "1.78.0",
        "@oxlint/binding-linux-arm64-gnu": "1.78.0",
        "@oxlint/binding-linux-arm64-musl": "1.78.0",
        "@oxlint/binding-linux-ppc64-gnu": "1.78.0",
        "@oxlint/binding-linux-riscv64-gnu": "1.78.0",
        "@oxlint/binding-linux-riscv64-musl": "1.78.0",
        "@oxlint/binding-linux-s390x-gnu": "1.78.0",
        "@oxlint/binding-linux-x64-gnu": "1.78.0",
        "@oxlint/binding-linux-x64-musl": "1.78.0",
        "@oxlint/binding-openharmony-arm64": "1.78.0",
        "@oxlint/binding-win32-arm64-msvc": "1.78.0",
        "@oxlint/binding-win32-ia32-msvc": "1.78.0",
        "@oxlint/binding-win32-x64-msvc": "1.78.0"
      },
      "peerDependencies": {
        "oxlint-tsgolint": ">=7.0.2001",
        "vite-plus": "*"
      },
      "peerDependenciesMeta": {
        "oxlint-tsgolint": {
          "optional": true
        },
        "vite-plus": {
          "optional": true
        }
      }
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/picomatch": {
      "version": "4.0.5",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.5.tgz",
      "integrity": "sha512-RvwwcruNjI1ncT5xRakeyS9Lf8lcItv34KD+aif+VH9kduAyfYBipGh12274xtenIPZ119/R9BdTBa8gAwSh0A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/postcss": {
      "version": "8.5.26",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.5.26.tgz",
      "integrity": "sha512-u82N74LFzG8ca+dD8puPnplTXoGH4fTPpVGuIbt36G3qvNlkvfD0lEAZSxaly3KX8TS/L1A1gsCEmvKmBcVbkQ==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.17",
        "picocolors": "^1.1.1",
        "source-map-js": "^1.2.1"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/protobufjs": {
      "version": "7.6.5",
      "resolved": "https://registry.npmjs.org/protobufjs/-/protobufjs-7.6.5.tgz",
      "integrity": "sha512-/FPD0nUc9jH6rfFjji9IBqOz4pcSE3CsT1m7Ep6Mdb0LxSUMj8hgl6GomOvZzpNpAqqGaXA0P3VSrZLFzIhQrw==",
      "hasInstallScript": true,
      "license": "BSD-3-Clause",
      "dependencies": {
        "@protobufjs/aspromise": "^1.1.2",
        "@protobufjs/base64": "^1.1.2",
        "@protobufjs/codegen": "^2.0.5",
        "@protobufjs/eventemitter": "^1.1.1",
        "@protobufjs/fetch": "^1.1.1",
        "@protobufjs/float": "^1.0.2",
        "@protobufjs/path": "^1.1.2",
        "@protobufjs/pool": "^1.1.0",
        "@protobufjs/utf8": "^1.1.1",
        "@types/node": ">=13.7.0",
        "long": "^5.3.2"
      },
      "engines": {
        "node": ">=12.0.0"
      }
    },
    "node_modules/re2js": {
      "version": "2.8.6",
      "resolved": "https://registry.npmjs.org/re2js/-/re2js-2.8.6.tgz",
      "integrity": "sha512-xLgQil4kIUCrAzVk9fRSkxkFNwmygLFjVxXrLc65aE1F0+Zsb8rxumFBy4XKyvgMCTL6kilDq3EZ0piE2dP/Dg==",
      "license": "MIT",
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/react": {
      "version": "19.2.8",
      "resolved": "https://registry.npmjs.org/react/-/react-19.2.8.tgz",
      "integrity": "sha512-PWaYA1L/q9u2u7xYQi+Y3L3Yfnie7XyLeaJICV1MGD6LprsBxcAqGjYyr0eY3p+QdsA+x/Irkt4Qif8D63+Sbw==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-dom": {
      "version": "19.2.8",
      "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-19.2.8.tgz",
      "integrity": "sha512-rVprimfGBG3DR+Tq0IQG2DT5PxKth1WIGDmj5yPmlzr4YBe7uyE+Du4oVqTDXZSHGGGXRtTJEGSSePyQCMBglQ==",
      "license": "MIT",
      "dependencies": {
        "scheduler": "^0.27.0"
      },
      "peerDependencies": {
        "react": "^19.2.8"
      }
    },
    "node_modules/react-hot-toast": {
      "version": "2.6.0",
      "resolved": "https://registry.npmjs.org/react-hot-toast/-/react-hot-toast-2.6.0.tgz",
      "integrity": "sha512-bH+2EBMZ4sdyou/DPrfgIouFpcRLCJ+HoCA32UoAYHn6T3Ur5yfcDCeSr5mwldl6pFOsiocmrXMuoCJ1vV8bWg==",
      "license": "MIT",
      "dependencies": {
        "csstype": "^3.1.3",
        "goober": "^2.1.16"
      },
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "react": ">=16",
        "react-dom": ">=16"
      }
    },
    "node_modules/react-router": {
      "version": "7.18.2",
      "resolved": "https://registry.npmjs.org/react-router/-/react-router-7.18.2.tgz",
      "integrity": "sha512-aUVMjFm3GAPTTZL7oYr5E7ETiqfQCHRLH+B+5afnICvf0r7kkK4eR6SMuwbSTJw/7t+12khT/Kahij49fqOCIg==",
      "license": "MIT",
      "dependencies": {
        "cookie": "^1.0.1",
        "set-cookie-parser": "^2.6.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "react": ">=18",
        "react-dom": ">=18"
      },
      "peerDependenciesMeta": {
        "react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/react-router-dom": {
      "version": "7.18.2",
      "resolved": "https://registry.npmjs.org/react-router-dom/-/react-router-dom-7.18.2.tgz",
      "integrity": "sha512-AIKJ/jgGlFb3EbfCXk5Gzshiwt+l3mqbCrNjmEWMMjqQxNJ3svBa6bgzFyCC2Sw3RA0VWF1kg3uQf2OFhxb8hw==",
      "license": "MIT",
      "dependencies": {
        "react-router": "7.18.2"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "react": ">=18",
        "react-dom": ">=18"
      }
    },
    "node_modules/require-directory": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/require-directory/-/require-directory-2.1.1.tgz",
      "integrity": "sha512-fGxEI7+wsG9xrvdjsrlmL22OMTTiHRwAMroiEeMgq8gzoLC/PQr7RsRDSTLUg/bZAZtF+TVIkHc6/4RIKrui+Q==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/rolldown": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/rolldown/-/rolldown-1.2.4.tgz",
      "integrity": "sha512-rSr7irW0K7QRWzjdJXqZowkcRdDtjRduh43rBltnVKd0VFq839l1lJoDvGJb6gl7+4rTTCrPWu+YfujUL8Ug7w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@oxc-project/types": "=0.144.0",
        "@rolldown/pluginutils": "^1.0.0"
      },
      "bin": {
        "rolldown": "bin/cli.mjs"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "optionalDependencies": {
        "@rolldown/binding-android-arm64": "1.2.4",
        "@rolldown/binding-darwin-arm64": "1.2.4",
        "@rolldown/binding-darwin-x64": "1.2.4",
        "@rolldown/binding-freebsd-x64": "1.2.4",
        "@rolldown/binding-linux-arm-gnueabihf": "1.2.4",
        "@rolldown/binding-linux-arm64-gnu": "1.2.4",
        "@rolldown/binding-linux-arm64-musl": "1.2.4",
        "@rolldown/binding-linux-ppc64-gnu": "1.2.4",
        "@rolldown/binding-linux-s390x-gnu": "1.2.4",
        "@rolldown/binding-linux-x64-gnu": "1.2.4",
        "@rolldown/binding-linux-x64-musl": "1.2.4",
        "@rolldown/binding-openharmony-arm64": "1.2.4",
        "@rolldown/binding-win32-arm64-msvc": "1.2.4",
        "@rolldown/binding-win32-x64-msvc": "1.2.4"
      }
    },
    "node_modules/safe-buffer": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.2.1.tgz",
      "integrity": "sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/scheduler": {
      "version": "0.27.0",
      "resolved": "https://registry.npmjs.org/scheduler/-/scheduler-0.27.0.tgz",
      "integrity": "sha512-eNv+WrVbKu1f3vbYJT/xtiF5syA5HPIMtf9IgY/nKg0sWqzAUEvqY/xm7OcZc/qafLx/iO9FgOmeSAp4v5ti/Q==",
      "license": "MIT"
    },
    "node_modules/set-cookie-parser": {
      "version": "2.7.2",
      "resolved": "https://registry.npmjs.org/set-cookie-parser/-/set-cookie-parser-2.7.2.tgz",
      "integrity": "sha512-oeM1lpU/UvhTxw+g3cIfxXHyJRc/uidd3yK1P242gzHds0udQBYzs3y8j4gCCW+ZJ7ad0yctld8RYO+bdurlvw==",
      "license": "MIT"
    },
    "node_modules/source-map-js": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.1.tgz",
      "integrity": "sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==",
      "dev": true,
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/string-width": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "license": "MIT",
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/tinyglobby": {
      "version": "0.2.17",
      "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.17.tgz",
      "integrity": "sha512-wXR/dYpcqKmfWpEdZjiKJOwCNFndD0DMnrW/cYjVGttEkBfVgcLFHoNrlj47mjOVic9yyNu65alsgF4NQyTa2g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.5.0",
        "picomatch": "^4.0.4"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/tslib": {
      "version": "2.8.1",
      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz",
      "integrity": "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==",
      "license": "0BSD"
    },
    "node_modules/undici-types": {
      "version": "8.3.0",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-8.3.0.tgz",
      "integrity": "sha512-j375ScV60dom+YkPFIfTLcOiPxkN/buHz5GobjLhixFuANaNs3C9l4GmrWqejgXWJ7BbJcFYpTEUkS1Ge8bpZQ==",
      "license": "MIT"
    },
    "node_modules/vite": {
      "version": "8.2.1",
      "resolved": "https://registry.npmjs.org/vite/-/vite-8.2.1.tgz",
      "integrity": "sha512-EU/eS7BH3XROHh2YnBefjM6DBKA6ZeMZEYQbj7NLWg5wHYlhB8B/Mayd5XsgWq+NFYccDOTemRpdETWR6Ka/lw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "lightningcss": "^1.33.0",
        "picomatch": "^4.0.5",
        "postcss": "^8.5.25",
        "rolldown": "~1.2.1",
        "tinyglobby": "^0.2.17"
      },
      "bin": {
        "vite": "bin/vite.js"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "funding": {
        "url": "https://github.com/vitejs/vite?sponsor=1"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      },
      "peerDependencies": {
        "@types/node": "^20.19.0 || >=22.12.0",
        "@vitejs/devtools": "^0.4.0",
        "esbuild": "^0.27.0 || ^0.28.0",
        "jiti": ">=1.21.0",
        "less": "^4.0.0",
        "sass": "^1.70.0",
        "sass-embedded": "^1.70.0",
        "stylus": ">=0.54.8",
        "sugarss": "^5.0.0",
        "terser": "^5.16.0",
        "tsx": "^4.8.1",
        "yaml": "^2.4.2"
      },
      "peerDependenciesMeta": {
        "@types/node": {
          "optional": true
        },
        "@vitejs/devtools": {
          "optional": true
        },
        "esbuild": {
          "optional": true
        },
        "jiti": {
          "optional": true
        },
        "less": {
          "optional": true
        },
        "sass": {
          "optional": true
        },
        "sass-embedded": {
          "optional": true
        },
        "stylus": {
          "optional": true
        },
        "sugarss": {
          "optional": true
        },
        "terser": {
          "optional": true
        },
        "tsx": {
          "optional": true
        },
        "yaml": {
          "optional": true
        }
      }
    },
    "node_modules/web-vitals": {
      "version": "4.2.4",
      "resolved": "https://registry.npmjs.org/web-vitals/-/web-vitals-4.2.4.tgz",
      "integrity": "sha512-r4DIlprAGwJ7YM11VZp4R884m0Vmgr6EAKe3P+kO0PPj3Unqyvv59rczf6UiGcb9Z8QxZVcqKNwv/g0WNdWwsw==",
      "license": "Apache-2.0"
    },
    "node_modules/websocket-driver": {
      "version": "0.7.5",
      "resolved": "https://registry.npmjs.org/websocket-driver/-/websocket-driver-0.7.5.tgz",
      "integrity": "sha512-ZL2+3c7kMBdIRCMz6l8jQMHyGVxj+UL+xVk74Ombiciboca8rHa15L86B19E5oh1pL9Ii/uj54gtsIrZGMo6zA==",
      "license": "Apache-2.0",
      "dependencies": {
        "http-parser-js": ">=0.5.1",
        "safe-buffer": ">=5.1.0",
        "websocket-extensions": ">=0.1.1"
      },
      "engines": {
        "node": ">=0.8.0"
      }
    },
    "node_modules/websocket-extensions": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/websocket-extensions/-/websocket-extensions-0.1.4.tgz",
      "integrity": "sha512-OqedPIGOfsDlo31UNwYbCFMSaO9m9G/0faIHj5/dZFDMFqPTcx6UwqyOy3COEaEOg/9VsGIpdqn62W5KhoKSpg==",
      "license": "Apache-2.0",
      "engines": {
        "node": ">=0.8.0"
      }
    },
    "node_modules/wrap-ansi": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-7.0.0.tgz",
      "integrity": "sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==",
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.0.0",
        "string-width": "^4.1.0",
        "strip-ansi": "^6.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/wrap-ansi?sponsor=1"
      }
    },
    "node_modules/y18n": {
      "version": "5.0.8",
      "resolved": "https://registry.npmjs.org/y18n/-/y18n-5.0.8.tgz",
      "integrity": "sha512-0pfFzegeDWJHJIAmTLRP2DwHjdF5s7jo9tuztdQxAhINCdvS+3nGINqPd00AphqJR/0LhANUS6/+7SCb98YOfA==",
      "license": "ISC",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/yargs": {
      "version": "17.7.3",
      "resolved": "https://registry.npmjs.org/yargs/-/yargs-17.7.3.tgz",
      "integrity": "sha512-GZtjxm/J/4TSxuL3FNYjCmLktBTnIw/rVmKSIyKeYAZpmJB2ig9VauCC5xsa82GNKVKDAqpOn3KVzNt0zmrU0g==",
      "license": "MIT",
      "dependencies": {
        "cliui": "^8.0.1",
        "escalade": "^3.1.1",
        "get-caller-file": "^2.0.5",
        "require-directory": "^2.1.1",
        "string-width": "^4.2.3",
        "y18n": "^5.0.5",
        "yargs-parser": "^21.1.1"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/yargs-parser": {
      "version": "21.1.1",
      "resolved": "https://registry.npmjs.org/yargs-parser/-/yargs-parser-21.1.1.tgz",
      "integrity": "sha512-tVpsJW7DdjecAiFpbIB1e3qxIQsE6NoPc5/eTdrbbIC4h0LVsWhnoa3g+m2HclBIujHzsxZ4VJVA+GUuc2/LBw==",
      "license": "ISC",
      "engines": {
        "node": ">=12"
      }
    }
  }
}

```

---

### 📄 Archivo: `package.json`

```json
{
  "name": "cpsl-base-template",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "firebase": "^12.17.1",
    "lucide-react": "^1.31.0",
    "nodemailer": "^6.9.13",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-hot-toast": "^2.6.0",
    "react-router-dom": "^7.18.2",
    "sanitize-html": "^2.13.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.4",
    "oxlint": "^1.75.0",
    "vite": "^8.2.0"
  }
}

```

---

### 📄 Archivo: `scripts/mailerDaemon.js`

```javascript
require('dotenv').config();
const nodemailer = require('nodemailer');
const sanitizeHtml = require('sanitize-html');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, onSnapshot, doc, updateDoc, query, where, getDocs } = require('firebase/firestore');

// --- 1. CONFIGURACIÓN DE FIREBASE CLIENT ---
// NOTA: Para ejecutar esto necesitas "npm install nodemailer firebase dotenv"
// Reemplaza esto con los datos de tu src/services/firebase.js
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 2. CONFIGURACIÓN DE GMAIL (NODEMAILER) ---
if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
  console.error("❌ Faltan credenciales de Gmail (GMAIL_USER o GMAIL_PASS). El daemon no puede iniciar.");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

console.log("🚀 Mailer Daemon Iniciado. Escuchando nuevos correos en Firestore...");

// --- 3. ESCUCHAR LA COLECCIÓN 'mail' ---
onSnapshot(collection(db, 'mail'), (snapshot) => {
  snapshot.docChanges().forEach(async (change) => {
    if (change.type === 'added') {
      const data = change.doc.data();
      
      // Si el correo ya tiene estado (como SUCCESS), ignorarlo
      if (data.delivery && data.delivery.state) return;

      const isCorporate = ['@crearpsl.net', '@crearpsl.com'].some(d => data.to?.toLowerCase().endsWith(d));
      
      if (!isCorporate) {
        // Para correos externos (gmail, hotmail, etc.), verificar que existan en el directorio
        try {
          const q = query(collection(db, "users"), where("emails", "array-contains", data.to?.toLowerCase().trim()));
          const snap = await getDocs(q);
          if (snap.empty) {
            console.warn(`⚠️ Intento de envío a correo no registrado en el directorio: ${data.to}`);
            await updateDoc(doc(db, 'mail', change.doc.id), { 
              'delivery.state': 'REJECTED', 
              reason: 'Correo externo no pertenece a ningún usuario registrado' 
            });
            return;
          }
        } catch (error) {
          console.error("Error validando correo contra la base de datos:", error);
          // Si hay error validando, rechazamos por seguridad
          return;
        }
      }

      console.log(`📧 Nuevo correo detectado para: ${data.to}`);

      const rawHtml = data.message?.html || '<p>Tienes una notificación.</p>';
      const cleanHtml = sanitizeHtml(rawHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          'a': ['href', 'name', 'target'],
          'img': ['src', 'alt']
        }
      });

      const mailOptions = {
        from: '"CREAR Poder Sin Límites" <servidorcrearpsl@gmail.com>',
        to: data.to,
        subject: data.message?.subject || 'Notificación SO-AR',
        html: cleanHtml
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Correo enviado a ${data.to}`);
        
        // Marcar como enviado en Firestore
        await updateDoc(doc(db, 'mail', change.doc.id), {
          'delivery.state': 'SUCCESS',
          'delivery.endTime': new Date().toISOString()
        });
      } catch (error) {
        console.error(`❌ Error al enviar a ${data.to}:`, error);
        await updateDoc(doc(db, 'mail', change.doc.id), {
          'delivery.state': 'ERROR',
          'delivery.error': error.message
        });
      }
    }
  });
});

```

---

### 📄 Archivo: `src/App.css`

```css
/* App Specific Styles - Migrated to index.css */

```

---

### 📄 Archivo: `src/App.jsx`

```javascript
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useUI } from './context/UIContext'
import './index.css'

import Login from './pages/Login'
import Home from './pages/Home'
import RoleSelector from './pages/RoleSelector'
import ChecklistBoard from './pages/ChecklistBoard'
import GerenteDashboard from './pages/GerenteDashboard'
import GoalsBoard from './pages/GoalsBoard'
import ReportesBoard from './pages/ReportesBoard'
import SuperAdminPanel from './pages/SuperAdminPanel'
import PromptModal from './components/PromptModal'

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
    const hasRole = allowedRoles.includes(currentUser.appRole) || currentUser.isSuperAdmin;
    if (!hasRole) {
      showToast(`ACCESO DENEGADO: Tu rol actual (${currentUser.appRole}) no tiene acceso a esta sección.`, "error");
      return <Navigate to="/home" replace />;
    }
  }
  
  return children;
}

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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

          <Route path="/roles" element={
            <PrivateRoute>
              <RoleSelector />
            </PrivateRoute>
          } />
          
          <Route path="/gerente" element={
            <RoleRoute allowedRoles={['gerente', 'direccion']}>
              <GerenteDashboard />
            </RoleRoute>
          } />
          
          <Route path="/checklist/:roleId" element={
            <PrivateRoute>
              <ChecklistBoard />
            </PrivateRoute>
          } />

          <Route path="/metas" element={
            <PrivateRoute>
              <GoalsBoard />
            </PrivateRoute>
          } />

          <Route path="/reportes" element={
            <RoleRoute allowedRoles={['gerente', 'coord_c1', 'coord_maestria', 'capitan', 'qt', 'direccion']}>
              <ReportesBoard />
            </RoleRoute>
          } />

          <Route path="/superadmin" element={
            <RoleRoute requireSuperAdmin={true}>
              <SuperAdminPanel />
            </RoleRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App

```

---

### 📄 Archivo: `src/components/ErrorBoundary.jsx`

```javascript
import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0a0f1d' }}>
          <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', padding: '2.5rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', marginBottom: '1.5rem' }}>
              <AlertTriangle size={48} color="#ef4444" />
            </div>
            
            <h2 style={{ color: '#fff', margin: '0 0 0.5rem', fontSize: '1.6rem' }}>Ocurrió una interrupción inesperada</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              El sistema SO-AR detectó un error en la ejecución. Tus datos en Firestore permanecen seguros.
            </p>

            {this.state.error && (
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', textAlign: 'left', marginBottom: '2rem', overflowX: 'auto' }}>
                <code style={{ color: '#ffb347', fontSize: '0.8rem', fontFamily: 'Consolas, monospace' }}>
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={this.handleReload} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={16} /> Reintentar
              </button>
              <button onClick={this.handleGoHome} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Home size={16} /> Volver al Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

```

---

### 📄 Archivo: `src/components/GoalDivisionModal.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { usersData, normalizeRole } from '../data/usersData';
import { Users, CheckCircle2, Shield, UserCheck, Calculator, X, Sparkles } from 'lucide-react';

export default function GoalDivisionModal({ isOpen, onClose, goal, onSaveAssignment }) {
  if (!isOpen || !goal) return null;

  const [selectedSede, setSelectedSede] = useState('Lima');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL'); // 'ALL' | 'CC1Y2' | 'CMJ' | 'CUSTOM'
  const [assignedCoordinators, setAssignedCoordinators] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Lista única de sedes disponibles
  const sedesList = [...new Set(usersData.map(u => u.sede?.trim()).filter(Boolean))];

  // Obtener coordinadores disponibles
  const availableCoordinators = usersData.filter(u => {
    const roleNorm = normalizeRole(u.role);
    const isCoord = roleNorm === 'coord_c1' || roleNorm === 'coord_maestria';
    const matchSede = selectedSede === 'GLOBAL' || (u.sede && u.sede.toLowerCase() === selectedSede.toLowerCase());
    return isCoord && matchSede;
  });

  // Inicializar o sincronizar selección cuando cambia la meta o filtro
  useEffect(() => {
    // Si la meta ya tenía asignaciones previas, cargarlas
    if (goal.assignedCoordinators && Array.isArray(goal.assignedCoordinators) && goal.assignedCoordinators.length > 0) {
      setAssignedCoordinators(goal.assignedCoordinators);
      if (goal.assignedCoordinators[0]?.sede) {
        setSelectedSede(goal.assignedCoordinators[0].sede);
      }
      return;
    }

    // Si no, pre-seleccionar según el tipo de meta
    applyPreset('AUTO');
  }, [goal, selectedSede]);

  const applyPreset = (presetType) => {
    let filtered = [];
    const roleNorm = (goal.stage || '').toUpperCase();

    if (presetType === 'CC1Y2' || (presetType === 'AUTO' && (roleNorm === 'C1' || roleNorm === 'C2' || goal.title?.includes('C1') || goal.title?.includes('C2')))) {
      setSelectedRoleFilter('CC1Y2');
      filtered = availableCoordinators.filter(u => normalizeRole(u.role) === 'coord_c1');
    } else if (presetType === 'CMJ' || (presetType === 'AUTO' && (roleNorm.startsWith('MJ') || goal.title?.includes('MJ') || goal.title?.includes('Maestría')))) {
      setSelectedRoleFilter('CMJ');
      filtered = availableCoordinators.filter(u => normalizeRole(u.role) === 'coord_maestria');
    } else {
      setSelectedRoleFilter('ALL');
      filtered = availableCoordinators;
    }

    const count = filtered.length || 1;
    const targetVal = Number(goal.targetValue || 0);
    const quotaPerPerson = Math.round((targetVal / count) * 10) / 10;

    const initialAssignments = filtered.map(u => ({
      email: u.email,
      name: u.name,
      role: normalizeRole(u.role),
      sede: u.sede,
      targetQuota: quotaPerPerson,
      currentQuota: 0
    }));

    setAssignedCoordinators(initialAssignments);
  };

  const handleToggleCoordinator = (coord) => {
    setSelectedRoleFilter('CUSTOM');
    const exists = assignedCoordinators.some(a => a.email === coord.email);
    let updated = [];

    if (exists) {
      updated = assignedCoordinators.filter(a => a.email !== coord.email);
    } else {
      updated = [...assignedCoordinators, {
        email: coord.email,
        name: coord.name,
        role: normalizeRole(coord.role),
        sede: coord.sede,
        targetQuota: 0,
        currentQuota: 0
      }];
    }

    // Recalcular división equitativa
    const count = updated.length || 1;
    const targetVal = Number(goal.targetValue || 0);
    const quotaPerPerson = Math.round((targetVal / count) * 10) / 10;

    const recalced = updated.map(item => ({
      ...item,
      targetQuota: quotaPerPerson
    }));

    setAssignedCoordinators(recalced);
  };

  const handleQuotaChange = (email, newQuota) => {
    setAssignedCoordinators(prev => prev.map(item => {
      if (item.email === email) {
        return { ...item, targetQuota: Number(newQuota) || 0 };
      }
      return item;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (assignedCoordinators.length === 0) {
      alert("Por favor selecciona al menos una coordinadora para la meta.");
      return;
    }

    setIsSaving(true);
    try {
      await onSaveAssignment(goal.id, assignedCoordinators);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Hubo un error al guardar la asignación.");
    } finally {
      setIsSaving(false);
    }
  };

  const totalAssignedQuota = assignedCoordinators.reduce((sum, item) => sum + (Number(item.targetQuota) || 0), 0);
  const targetVal = Number(goal.targetValue || 0);
  const isBalanced = Math.abs(totalAssignedQuota - targetVal) < 0.1;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        border: '1px solid rgba(0, 210, 255, 0.3)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 210, 255, 0.15)',
        position: 'relative'
      }}>
        {/* BOTÓN CERRAR */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Users size={28} color="var(--crear-blue)" />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#ffffff' }}>
              Dividir y Asignar Meta a Coordinadoras
            </h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              {goal.title} — Meta Total: <strong style={{ color: 'var(--crear-gold)' }}>{targetVal} {goal.kpi || 'unidades'}</strong>
            </p>
          </div>
        </div>

        <hr style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '1.25rem 0' }} />

        {/* SELECTOR DE SEDE Y PRESETS RÁPIDOS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              Sede Operativa:
            </label>
            <select
              value={selectedSede}
              onChange={(e) => setSelectedSede(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.4)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: '0.85rem',
                fontWeight: 'bold'
              }}
            >
              {sedesList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="GLOBAL">Todas las Sedes</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              División Automática Rápida:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => applyPreset('CC1Y2')}
                className="btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.4rem 0.8rem',
                  background: selectedRoleFilter === 'CC1Y2' ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                  borderColor: selectedRoleFilter === 'CC1Y2' ? 'var(--crear-blue)' : 'rgba(255,255,255,0.1)'
                }}
              >
                Solo CC1Y2
              </button>
              <button
                type="button"
                onClick={() => applyPreset('CMJ')}
                className="btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.4rem 0.8rem',
                  background: selectedRoleFilter === 'CMJ' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                  borderColor: selectedRoleFilter === 'CMJ' ? 'var(--role-mj)' : 'rgba(255,255,255,0.1)'
                }}
              >
                Solo CMJ
              </button>
              <button
                type="button"
                onClick={() => applyPreset('ALL')}
                className="btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.4rem 0.8rem',
                  background: selectedRoleFilter === 'ALL' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                  borderColor: selectedRoleFilter === 'ALL' ? 'var(--color-success)' : 'rgba(255,255,255,0.1)'
                }}
              >
                Todas (CC1Y2 + CMJ)
              </button>
            </div>
          </div>
        </div>

        {/* RESUMEN DE LA ECUACIÓN DE DIVISIÓN */}
        <div style={{
          background: 'rgba(0, 210, 255, 0.06)',
          border: '1px solid rgba(0, 210, 255, 0.25)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Ecuación de Reparto
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
              {targetVal} {goal.kpi || 'meta'} ÷ {assignedCoordinators.length || 0} coordinadoras = <span style={{ color: 'var(--crear-gold)' }}>{assignedCoordinators.length > 0 ? (Math.round((targetVal / assignedCoordinators.length) * 10) / 10) : 0} c/u</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.25rem 0.6rem',
              borderRadius: '9999px',
              background: isBalanced ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isBalanced ? '#22c55e' : '#ef4444',
              border: `1px solid ${isBalanced ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {isBalanced ? '✅ Cuotas Balanceadas (100%)' : `⚠️ Suma: ${totalAssignedQuota} de ${targetVal}`}
            </span>
          </div>
        </div>

        {/* LISTADO DE COORDINADORAS SELECCIONABLES */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.6rem' }}>
            Coordinadoras Asignadas ({assignedCoordinators.length} seleccionadas):
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
            {availableCoordinators.map(coord => {
              const assignedItem = assignedCoordinators.find(a => a.email === coord.email);
              const isChecked = !!assignedItem;
              const isC1 = normalizeRole(coord.role) === 'coord_c1';

              return (
                <div
                  key={coord.email}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: isChecked ? 'rgba(0, 210, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isChecked ? 'rgba(0, 210, 255, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleCoordinator(coord)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: 'bold', color: isChecked ? '#ffffff' : 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {coord.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: isC1 ? 'var(--crear-blue)' : 'var(--role-mj)' }}>
                        {isC1 ? 'Coordinadora C1 / C2' : 'Coordinadora Maestría (CMJ)'} • {coord.sede}
                      </div>
                    </div>
                  </label>

                  {isChecked && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cuota:</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={assignedItem.targetQuota}
                        onChange={(e) => handleQuotaChange(coord.email, e.target.value)}
                        style={{
                          width: '75px',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(0, 0, 0, 0.6)',
                          border: '1px solid var(--crear-blue)',
                          color: 'var(--crear-gold)',
                          fontWeight: 800,
                          textAlign: 'center',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ACCIONES */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '0.6rem 1.2rem' }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || assignedCoordinators.length === 0}
            className="btn-neon-action"
            style={{ padding: '0.6rem 1.6rem' }}
          >
            {isSaving ? 'Guardando...' : '🚀 Guardar y Asignar Metas'}
          </button>
        </div>
      </div>
    </div>
  );
}

```

---

### 📄 Archivo: `src/components/PromptModal.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { useUI } from '../context/UIContext';

export default function PromptModal() {
  const { promptState, handlePromptClose } = useUI();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (promptState.isOpen) {
      setValue(promptState.defaultValue);
    }
  }, [promptState.isOpen, promptState.defaultValue]);

  if (!promptState.isOpen) return null;

  const onSubmit = (e) => {
    e.preventDefault();
    handlePromptClose(value);
  };

  const onCancel = () => {
    handlePromptClose(null);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="glass-panel" style={{
        padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px',
        backgroundColor: '#1f2937', color: '#f3f4f6', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#d4af37', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{promptState.title}</h3>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ 
              width: '100%', padding: '0.75rem', marginBottom: '1.5rem', 
              borderRadius: '6px', border: '1px solid #4b5563', 
              backgroundColor: '#374151', color: 'white', fontSize: '1rem',
              boxSizing: 'border-box'
            }}
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" onClick={onCancel} className="btn-secondary" style={{ padding: '0.5rem 1.5rem' }}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.5rem' }}>
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

```

---

### 📄 Archivo: `src/components/TaskAssignmentModal.jsx`

```javascript
import { useState, useEffect } from 'react';
import { Target, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';
import { getAssignableRoles } from '../config/permissions';
import { normalizeRole } from '../data/usersData';

export default function TaskAssignmentModal({ isOpen, onClose, prefilledUser = null }) {
  const { currentUser } = useAuth();
  const { addCustomTask } = useChecklist();

  const [newTask, setNewTask] = useState({
    title: '',
    role: currentUser?.appRole || 'capitan',
    deadlineDate: '',
    deadlineTime: '18:00',
    assignedToEmail: '',
    assignedSede: '',
    priority: '🟡 AMARILLO'
  });

  useEffect(() => {
    if (isOpen && prefilledUser) {
      setNewTask(prev => ({
        ...prev,
        role: normalizeRole(prefilledUser.role) || prefilledUser.role || prev.role,
        assignedToEmail: prefilledUser.email || '',
        assignedSede: prefilledUser.sede || '',
      }));
    }
  }, [isOpen, prefilledUser]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const assignableRoles = getAssignableRoles(currentUser);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const finalRole = newTask.role;
    const deadlineISO = new Date(`${newTask.deadlineDate}T${newTask.deadlineTime}:00`).toISOString();
    
    const taskData = {
      task: newTask.title,
      role: finalRole,
      deadline: deadlineISO,
      priority: newTask.priority,
      isCritical: newTask.priority === '🔴 ROJO',
      createdBy: currentUser.email,
      assignedToEmail: currentUser.isSuperAdmin ? newTask.assignedToEmail : '',
      assignedSede: currentUser.isSuperAdmin ? newTask.assignedSede : ''
    };

    const success = await addCustomTask(taskData);
    setIsSubmitting(false);
    
    if (success) {
      onClose();
      setNewTask({
        title: '',
        role: currentUser?.appRole || 'capitan',
        deadlineDate: '',
        deadlineTime: '18:00',
        assignedToEmail: '',
        assignedSede: '',
        priority: '🟡 AMARILLO'
      });
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div className="glass-panel" style={{ 
        width: '100%', maxWidth: '600px', padding: '2rem', 
        position: 'relative', border: '1px solid var(--crear-gold)' 
      }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        <h3 className="text-gold" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Target size={20} /> {prefilledUser ? `Asignar Tarea a ${prefilledUser.name}` : 'Crear / Asignar Tarea'}
        </h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <input 
            type="text" 
            placeholder="Título de la tarea (Ej. Revisar métricas)" 
            value={newTask.title} 
            onChange={e => setNewTask({...newTask, title: e.target.value})} 
            className="input-field" 
            required 
            disabled={isSubmitting}
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Asignar a Rol:</label>
              <select 
                value={newTask.role} 
                onChange={e => setNewTask({...newTask, role: e.target.value})} 
                className="input-field" 
                style={{ width: '100%' }}
                disabled={isSubmitting}
              >
                {assignableRoles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Prioridad:</label>
              <select 
                value={newTask.priority} 
                onChange={e => setNewTask({...newTask, priority: e.target.value})} 
                className="input-field" 
                style={{ width: '100%' }}
                disabled={isSubmitting}
              >
                <option value="🟡 AMARILLO">Normal (Amarillo)</option>
                <option value="🔴 ROJO">Urgente/Crítica (Rojo)</option>
              </select>
            </div>

            {currentUser?.isSuperAdmin && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--crear-cyan)', marginBottom: '0.3rem' }}>[SuperAdmin] Email Específico:</label>
                  <input type="email" placeholder="email@crearpsl.net" value={newTask.assignedToEmail || ''} onChange={e => setNewTask({...newTask, assignedToEmail: e.target.value})} className="input-field" style={{ width: '100%', borderColor: 'var(--crear-cyan)' }} disabled={isSubmitting} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--crear-cyan)', marginBottom: '0.3rem' }}>[SuperAdmin] Sede:</label>
                  <input type="text" placeholder="Ej. Lima, Cuenca" value={newTask.assignedSede || ''} onChange={e => setNewTask({...newTask, assignedSede: e.target.value})} className="input-field" style={{ width: '100%', borderColor: 'var(--crear-cyan)' }} disabled={isSubmitting} />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--crear-gold)', marginBottom: '0.3rem', fontWeight: 'bold' }}>📅 Fecha Límite:</label>
              <input type="date" value={newTask.deadlineDate} onChange={e => setNewTask({...newTask, deadlineDate: e.target.value})} className="input-field" style={{ width: '100%' }} required disabled={isSubmitting} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--crear-gold)', marginBottom: '0.3rem', fontWeight: 'bold' }}>⏰ Hora Límite:</label>
              <input type="time" value={newTask.deadlineTime} onChange={e => setNewTask({...newTask, deadlineTime: e.target.value})} className="input-field" style={{ width: '100%' }} required disabled={isSubmitting} />
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Asignar Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

```

---

### 📄 Archivo: `src/components/TaskCollaborationModal.jsx`

```javascript
import React, { useState } from 'react';
import { usersData, normalizeRole } from '../data/usersData';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Users, Send, X, AtSign, CheckCircle2, Shield } from 'lucide-react';

export default function TaskCollaborationModal({ isOpen, onClose, task, onSendInvitation }) {
  if (!isOpen || !task) return null;

  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const userRole = normalizeRole(currentUser?.appRole);
  const isGerenteOrAdmin = currentUser?.isGerente || currentUser?.isSuperAdmin || userRole === 'gerente';
  const isCMJ = userRole === 'coord_maestria';
  const isCC1 = userRole === 'coord_c1';

  // Filtrado de usuarios según permisos de mención
  // Gerentes: pueden mencionar a cualquier persona de su sede o global
  // CMJ y CC1Y2: pueden mencionar a cualquier persona de la oficina/sede
  const eligibleUsers = usersData.filter(u => {
    if (u.email === currentUser?.email) return false;
    
    // Si ya está colaborando en esta tarea, excluir
    if (task.collaborators && task.collaborators.includes(u.email)) return false;

    if (isGerenteOrAdmin) {
      // Gerente puede invitar a cualquiera de su sede o global
      return true;
    }

    if (isCMJ || isCC1) {
      // CMJ / CC1Y2 pueden invitar a cualquier persona de la oficina/sede
      const sameSede = !u.sede || !currentUser?.sede || u.sede.toLowerCase() === currentUser.sede.toLowerCase();
      return sameSede;
    }

    // Otros roles: misma sede
    return !u.sede || !currentUser?.sede || u.sede.toLowerCase() === currentUser.sede.toLowerCase();
  }).filter(u => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term)) ||
      (u.sede && u.sede.toLowerCase().includes(term))
    );
  });

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      showToast("Por favor selecciona a un compañero para invitarlo.", "error");
      return;
    }

    setIsSending(true);
    try {
      await onSendInvitation(task, selectedUser, message);
      onClose();
    } catch (err) {
      console.error(err);
      showToast("Error al enviar la invitación.", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        border: '1px solid rgba(0, 210, 255, 0.3)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 210, 255, 0.15)',
        position: 'relative'
      }}>
        {/* BOTÓN CERRAR */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <AtSign size={28} color="var(--crear-blue)" />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#ffffff' }}>
              Mencionar e Invitar a Colaborar
            </h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              {isGerenteOrAdmin ? '👑 Vista Gerencial: Invita a cualquier miembro a tu cargo' : '🤝 Invita a un compañero de oficina para compartir esta tarea'}
            </p>
          </div>
        </div>

        {/* DETALLE DE LA TAREA */}
        <div style={{
          background: 'rgba(0, 210, 255, 0.05)',
          border: '1px solid rgba(0, 210, 255, 0.2)',
          borderRadius: '8px',
          padding: '0.8rem',
          margin: '1rem 0'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--crear-blue)', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Tarea a Compartir:
          </span>
          <div style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            {task.task || task.title}
          </div>
        </div>

        {/* BUSCADOR DE COMPAÑEROS */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            Buscar persona por nombre, rol o sede:
          </label>
          <input
            type="text"
            placeholder="Ej: Pauly, Juanfer, Coordinador, Lima..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* LISTADO DE USUARIOS ELIGIBLES */}
        <div style={{
          maxHeight: '180px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          marginBottom: '1rem',
          paddingRight: '4px'
        }}>
          {eligibleUsers.length === 0 ? (
            <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', margin: '1rem 0' }}>
              No se encontraron personas con ese criterio.
            </p>
          ) : (
            eligibleUsers.map(u => {
              const isSelected = selectedUser?.email === u.email;
              const roleNorm = normalizeRole(u.role);
              const isCoord = roleNorm === 'coord_c1' || roleNorm === 'coord_maestria';

              return (
                <div
                  key={u.email}
                  onClick={() => setSelectedUser(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isSelected ? 'var(--crear-blue)' : 'rgba(255, 255, 255, 0.06)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: isSelected ? 'var(--crear-blue)' : '#ffffff', fontSize: '0.85rem' }}>
                      @{u.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isCoord ? 'var(--crear-gold)' : 'var(--text-muted)' }}>
                      {u.role?.replace(/_/g, ' ')} • {u.sede || 'Global'} ({u.email})
                    </div>
                  </div>

                  {isSelected && <CheckCircle2 size={16} color="var(--crear-blue)" />}
                </div>
              );
            })
          )}
        </div>

        {/* MENSAJE PERSONALIZADO */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            Mensaje o Instrucción (Opcional):
          </label>
          <textarea
            rows="2"
            placeholder="Ej: Te invito a colaborar en el montaje de la sala y checklist de luces."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '0.85rem',
              resize: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* ACCIONES */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem' }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !selectedUser}
            className="btn-neon-action"
            style={{ padding: '0.5rem 1.4rem' }}
          >
            <Send size={14} />
            <span>{isSending ? 'Enviando...' : 'Invitar a Colaborar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

```

---

### 📄 Archivo: `src/components/ThemeSelector.jsx`

```javascript
import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Sparkles } from 'lucide-react';

export default function ThemeSelector({ compact = false }) {
  const { themeMode, setThemeMode, activeTheme } = useTheme();

  return (
    <div 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: activeTheme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(12px)',
        border: activeTheme === 'light' ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '9999px',
        padding: '3px',
        gap: '2px',
        boxShadow: activeTheme === 'light' ? '0 2px 8px rgba(0, 0, 0, 0.05)' : '0 4px 15px rgba(0, 0, 0, 0.4)',
        transition: 'all 0.3s ease'
      }}
      title={`Modo actual: ${themeMode === 'auto' ? `Automático (${activeTheme === 'light' ? '☀️ Día' : '🌙 Noche'})` : themeMode === 'light' ? '☀️ Día' : '🌙 Noche'}`}
    >
      {/* BOTÓN DÍA */}
      <button
        type="button"
        onClick={() => setThemeMode('light')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: compact ? '4px 8px' : '5px 11px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.5px',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          background: themeMode === 'light' 
            ? 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' 
            : 'transparent',
          color: themeMode === 'light' 
            ? '#ffffff' 
            : (activeTheme === 'light' ? '#64748b' : '#94a3b8'),
          boxShadow: themeMode === 'light' ? '0 2px 10px rgba(245, 158, 11, 0.4)' : 'none'
        }}
      >
        <Sun size={13} strokeWidth={2.5} />
        {!compact && <span>DÍA</span>}
      </button>

      {/* BOTÓN NOCHE */}
      <button
        type="button"
        onClick={() => setThemeMode('dark')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: compact ? '4px 8px' : '5px 11px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.5px',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          background: themeMode === 'dark' 
            ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
            : 'transparent',
          color: themeMode === 'dark' 
            ? '#ffffff' 
            : (activeTheme === 'light' ? '#64748b' : '#94a3b8'),
          boxShadow: themeMode === 'dark' ? '0 2px 10px rgba(59, 130, 246, 0.4)' : 'none'
        }}
      >
        <Moon size={13} strokeWidth={2.5} />
        {!compact && <span>NOCHE</span>}
      </button>

      {/* BOTÓN AUTOMÁTICO */}
      <button
        type="button"
        onClick={() => setThemeMode('auto')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: compact ? '4px 8px' : '5px 11px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.5px',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          background: themeMode === 'auto' 
            ? 'linear-gradient(135deg, #00d2ff 0%, #8b5cf6 100%)' 
            : 'transparent',
          color: themeMode === 'auto' 
            ? '#030712' 
            : (activeTheme === 'light' ? '#64748b' : '#94a3b8'),
          boxShadow: themeMode === 'auto' ? '0 2px 10px rgba(0, 210, 255, 0.4)' : 'none'
        }}
      >
        <Sparkles size={13} strokeWidth={2.5} />
        {!compact && <span>AUTO</span>}
      </button>
    </div>
  );
}

```

---

### 📄 Archivo: `src/components/UserProfileModal.jsx`

```javascript
import { useState, useEffect } from 'react';
import { 
  X, User, CheckCircle2, Clock, AlertTriangle, 
  FileText, Link2, Plus, Trash2, ExternalLink, Calendar, 
  Building2, Mail, Shield, PlusCircle, CheckSquare
} from 'lucide-react';
import { db } from '../services/firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';
import { normalizeRole } from '../data/usersData';
import { useUI } from '../context/UIContext';
import TaskAssignmentModal from './TaskAssignmentModal';

const ROLE_LABELS = {
  gerente: 'Gerente de Sede',
  coordinador_c1c2: 'Coordinador C1/C2',
  coord_c1: 'Coordinador C1/C2',
  coordinador_mj: 'Coordinador Maestría',
  coord_maestria: 'Coordinador Maestría',
  director_maestria: 'Director de Maestría',
  capitan: 'Capitán',
  manager: 'Manager',
  qt: 'Quantum Team',
  direccion: 'Dirección Global',
  cfo: 'CFO (Chief Financial Officer)',
  finanzas: 'Finanzas',
  coordinador: 'Coordinación Adm.',
  talento_humano: 'Talento Humano',
  legal: 'Legal',
};

const ROLE_COLORS = {
  gerente: '#f59e0b',
  coordinador_c1c2: '#29abe2',
  coord_c1: '#29abe2',
  coordinador_mj: '#8b5cf6',
  coord_maestria: '#8b5cf6',
  director_maestria: '#ec4899',
  capitan: '#22c55e',
  manager: '#10b981',
  qt: '#ec4899',
  direccion: '#ef4444',
  cfo: '#eab308',
  finanzas: '#6b7280',
  talento_humano: '#06b6d4'
};

export default function UserProfileModal({ isOpen, onClose, user, allTasks = [] }) {
  const { currentUser } = useAuth();
  const { toggleTask } = useChecklist();
  const { showToast } = useUI();

  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'notes' | 'documents'
  const [profileData, setProfileData] = useState({ notes: [], documents: [] });
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Form states for Notes & Documents
  const [newNoteText, setNewNoteText] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  // Task assignment submodal
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Firestore sync for user meta
  useEffect(() => {
    if (!isOpen || !user?.email) return;

    const userDocId = user.email.toLowerCase().trim();
    const userDocRef = doc(db, 'user_profiles', userDocId);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData({
          notes: data.notes || [],
          documents: data.documents || []
        });
      } else {
        setProfileData({ notes: [], documents: [] });
      }
      setLoadingMeta(false);
    }, (err) => {
      console.error("Error fetching user profile meta:", err);
      setLoadingMeta(false);
    });

    return () => unsubscribe();
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const canonicalRole = normalizeRole(user.role);
  const roleColor = ROLE_COLORS[canonicalRole] || ROLE_COLORS[user.role] || '#29abe2';
  const roleLabel = ROLE_LABELS[canonicalRole] || ROLE_LABELS[user.role] || user.role;

  // Filter tasks belonging to this user:
  // 1. Base tasks of this user's role and sede
  // 2. Direct assigned custom tasks (assignedToEmail)
  const userTasks = allTasks.filter(t => {
    if (t.assignedToEmail && t.assignedToEmail.toLowerCase() === user.email.toLowerCase()) {
      return true;
    }
    const tRoleNorm = normalizeRole(t.role);
    const roleMatches = tRoleNorm === canonicalRole || t.role === user.role;
    if (!roleMatches) return false;

    // Check sede match
    if (t.sede) {
      return t.sede === user.sede || t.sede === 'Global' || user.sede === 'Global';
    }
    return true;
  });

  const completedTasks = userTasks.filter(t => {
    if (t.completions && user.sede && t.completions[user.sede]) {
      return t.completions[user.sede].completed;
    }
    return t.completed || t.status === 'Completada';
  });

  const criticalPending = userTasks.filter(t => {
    const isComp = t.completions && user.sede && t.completions[user.sede]
      ? t.completions[user.sede].completed
      : (t.completed || t.status === 'Completada');
    return !isComp && (t.isCritical || t.priority?.includes('ROJO'));
  });

  const pct = userTasks.length > 0 ? Math.round((completedTasks.length / userTasks.length) * 100) : 0;

  // Handler: Add Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setIsSavingNote(true);
    try {
      const userDocId = user.email.toLowerCase().trim();
      const userDocRef = doc(db, 'user_profiles', userDocId);

      const noteItem = {
        id: 'note_' + Date.now(),
        text: newNoteText.trim(),
        authorName: currentUser?.name || currentUser?.email || 'SuperAdmin',
        authorEmail: currentUser?.email || '',
        createdAt: new Date().toISOString()
      };

      await setDoc(userDocRef, {
        notes: arrayUnion(noteItem),
        userId: user.id || user.email,
        name: user.name,
        email: user.email,
        role: user.role,
        sede: user.sede,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setNewNoteText('');
      showToast("Nota guardada con éxito", "success");
    } catch (err) {
      console.error("Error saving note:", err);
      showToast("Error al guardar la nota", "error");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Handler: Delete Note
  const handleDeleteNote = async (noteItem) => {
    try {
      const userDocId = user.email.toLowerCase().trim();
      const userDocRef = doc(db, 'user_profiles', userDocId);
      await updateDoc(userDocRef, {
        notes: arrayRemove(noteItem)
      });
      showToast("Nota eliminada", "info");
    } catch (err) {
      console.error("Error deleting note:", err);
      showToast("Error al eliminar la nota", "error");
    }
  };

  // Handler: Add Document Link
  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocUrl.trim()) return;

    let formattedUrl = newDocUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    setIsSavingDoc(true);
    try {
      const userDocId = user.email.toLowerCase().trim();
      const userDocRef = doc(db, 'user_profiles', userDocId);

      const docItem = {
        id: 'doc_' + Date.now(),
        title: newDocTitle.trim(),
        url: formattedUrl,
        addedBy: currentUser?.name || currentUser?.email || 'SuperAdmin',
        createdAt: new Date().toISOString()
      };

      await setDoc(userDocRef, {
        documents: arrayUnion(docItem),
        userId: user.id || user.email,
        name: user.name,
        email: user.email,
        role: user.role,
        sede: user.sede,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setNewDocTitle('');
      setNewDocUrl('');
      showToast("Documento enlazado con éxito", "success");
    } catch (err) {
      console.error("Error saving document:", err);
      showToast("Error al guardar el enlace del documento", "error");
    } finally {
      setIsSavingDoc(false);
    }
  };

  // Handler: Delete Document
  const handleDeleteDocument = async (docItem) => {
    try {
      const userDocId = user.email.toLowerCase().trim();
      const userDocRef = doc(db, 'user_profiles', userDocId);
      await updateDoc(userDocRef, {
        documents: arrayRemove(docItem)
      });
      showToast("Enlace de documento eliminado", "info");
    } catch (err) {
      console.error("Error deleting document:", err);
      showToast("Error al eliminar documento", "error");
    }
  };

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(5, 10, 25, 0.85)', backdropFilter: 'blur(8px)',
        zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
      }}>
        <div className="glass-panel" style={{
          width: '100%', maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          position: 'relative', border: `1px solid ${roleColor}40`, boxShadow: `0 10px 40px rgba(0,0,0,0.8), 0 0 20px ${roleColor}20`,
          borderRadius: '16px', overflow: 'hidden'
        }}>
          {/* Close button */}
          <button 
            onClick={onClose}
            style={{
              position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'rgba(255,255,255,0.08)',
              border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10,
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            <X size={20} />
          </button>

          {/* User Header Profile Card */}
          <div style={{
            padding: '1.8rem 2rem 1.2rem 2rem',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${roleColor}40, ${roleColor}10)`,
                border: `2px solid ${roleColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', boxShadow: `0 0 15px ${roleColor}40`
              }}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, color: 'var(--text-heading)', fontSize: '1.5rem', fontWeight: 'bold' }}>{user.name}</h2>
                  {(user.roles && user.roles.length > 0 ? user.roles : [user.role]).map(r => {
                    const rNorm = normalizeRole(r);
                    const rCol = ROLE_COLORS[rNorm] || roleColor;
                    const rLab = ROLE_LABELS[rNorm] || ROLE_LABELS[r] || r;
                    return (
                      <span key={r} style={{
                        padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                        background: `${rCol}20`, color: rCol, border: `1px solid ${rCol}60`
                      }}>
                        {rLab}
                      </span>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '1.2rem', marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Building2 size={14} color="var(--crear-gold)" /> Sede: <strong style={{ color: 'var(--text-heading)' }}>{user.sede || 'Global'}</strong>
                  </span>
                  {user.corporateEmail && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Correo Corporativo Oficial">
                      <Mail size={14} color="var(--crear-gold)" /> Corp: {user.corporateEmail}
                    </span>
                  )}
                  {user.personalEmail && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Gmail Personal">
                      <Mail size={14} color="var(--crear-cyan)" /> Personal: {user.personalEmail}
                    </span>
                  )}
                  {!user.corporateEmail && !user.personalEmail && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Mail size={14} color="var(--crear-cyan)" /> {user.email}
                    </span>
                  )}
                  {user.phone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      📱 {user.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* KPI metrics */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: pct === 100 ? '#22c55e' : 'var(--crear-gold)' }}>{pct}%</span>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Progreso</p>
                </div>
                <div style={{ height: '28px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>{completedTasks.length}/{userTasks.length}</span>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tareas</p>
                </div>
                {criticalPending.length > 0 && (
                  <>
                    <div style={{ height: '28px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ef4444' }}>{criticalPending.length}</span>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#ef4444' }}>Críticas</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
              <button 
                onClick={() => setActiveTab('tasks')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: activeTab === 'tasks' ? 'var(--crear-gold)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'tasks' ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                <CheckSquare size={16} /> Tareas ({userTasks.length})
              </button>

              <button 
                onClick={() => setActiveTab('notes')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: activeTab === 'notes' ? 'var(--crear-gold)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'notes' ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                <FileText size={16} /> Notas y Bitácora ({profileData.notes.length})
              </button>

              <button 
                onClick={() => setActiveTab('documents')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: activeTab === 'documents' ? 'var(--crear-gold)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'documents' ? '#000' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                <Link2 size={16} /> Documentos y Enlaces ({profileData.documents.length})
              </button>
            </div>
          </div>

          {/* Modal Body with scroll */}
          <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}>

            {/* TAB 1: TASKS */}
            {activeTab === 'tasks' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={18} color="var(--crear-cyan)" /> Matriz Operativa de {user.name}
                  </h4>
                  <button 
                    onClick={() => setShowAssignModal(true)}
                    className="btn-primary"
                    style={{
                      padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                      background: 'var(--crear-cyan)', color: '#000', border: 'none', fontWeight: 'bold', borderRadius: '8px'
                    }}
                  >
                    <PlusCircle size={16} /> Asignar Nueva Tarea
                  </button>
                </div>

                {userTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>No hay tareas asignadas para este usuario o rol en la sede {user.sede}.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {userTasks.map(task => {
                      const isCompleted = task.completions && user.sede && task.completions[user.sede]
                        ? task.completions[user.sede].completed
                        : (task.completed || task.status === 'Completada');
                      const isCrit = task.isCritical || task.priority?.includes('ROJO');

                      return (
                        <div 
                          key={task.id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.8rem 1rem', borderRadius: '10px',
                            background: isCompleted ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isCompleted ? 'rgba(34, 197, 94, 0.3)' : isCrit ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                            gap: '0.8rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1 }}>
                            <input 
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => toggleTask(task.id, isCompleted)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--crear-gold)' }}
                            />
                            <div style={{ flex: 1 }}>
                              <p style={{
                                margin: 0, fontSize: '0.9rem', color: isCompleted ? 'var(--text-muted)' : '#fff',
                                textDecoration: isCompleted ? 'line-through' : 'none', fontWeight: isCrit ? '600' : 'normal'
                              }}>
                                {task.task || task.title}
                              </p>
                              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.2rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {task.cyclePhase && <span>Fase: <strong style={{ color: '#29abe2' }}>{task.cyclePhase}</strong></span>}
                                {task.deadline && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--crear-gold)' }}>
                                    <Clock size={11} /> Límite: {new Date(task.deadline).toLocaleDateString()} {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                                {task.assignedToEmail && (
                                  <span style={{ color: 'var(--crear-cyan)' }}>Personalizada (Directa)</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold',
                              background: isCompleted ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: isCompleted ? '#22c55e' : '#f59e0b',
                              border: `1px solid ${isCompleted ? '#22c55e40' : '#f59e0b40'}`
                            }}>
                              {isCompleted ? 'Completada' : 'Pendiente'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: NOTES & BITÁCORA */}
            {activeTab === 'notes' && (
              <div>
                <form onSubmit={handleAddNote} style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--crear-gold)', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                    📝 Añadir Nota / Feedback para {user.name}:
                  </label>
                  <textarea 
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    placeholder="Escribe observaciones de desempeño, compromisos de reunión, acuerdos o puntos a auditar..."
                    rows={3}
                    className="input-field"
                    style={{ width: '100%', marginBottom: '0.6rem', resize: 'vertical' }}
                    disabled={isSavingNote}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={isSavingNote || !newNoteText.trim()}
                      style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Plus size={16} /> {isSavingNote ? 'Guardando...' : 'Guardar Nota'}
                    </button>
                  </div>
                </form>

                <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.8rem' }}>Historial de Notas ({profileData.notes.length})</h4>

                {profileData.notes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    <FileText size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>Aún no hay notas registradas para este usuario.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {profileData.notes.slice().reverse().map((note) => (
                      <div 
                        key={note.id || note.createdAt}
                        style={{
                          padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)', position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--crear-cyan)' }}>
                            <Shield size={13} />
                            <strong>{note.authorName || 'SuperAdmin'}</strong>
                            <span style={{ color: 'var(--text-muted)' }}>• {new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                          <button 
                            onClick={() => handleDeleteNote(note)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7, padding: '2px' }}
                            title="Eliminar nota"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.88rem', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                          {note.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DOCUMENTS & LINKS */}
            {activeTab === 'documents' && (
              <div>
                <form onSubmit={handleAddDocument} style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--crear-cyan)', fontWeight: 'bold', marginBottom: '0.6rem' }}>
                    🔗 Enlazar Documento / Enlace Externo (Google Drive, Docs, Reportes):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '0.6rem', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Título del Documento:</label>
                      <input 
                        type="text"
                        placeholder="Ej. Plan Operativo Q3"
                        value={newDocTitle}
                        onChange={e => setNewDocTitle(e.target.value)}
                        className="input-field"
                        style={{ width: '100%' }}
                        disabled={isSavingDoc}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Enlace URL (Drive, Dropbox, Notion, Web):</label>
                      <input 
                        type="url"
                        placeholder="https://drive.google.com/..."
                        value={newDocUrl}
                        onChange={e => setNewDocUrl(e.target.value)}
                        className="input-field"
                        style={{ width: '100%' }}
                        disabled={isSavingDoc}
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={isSavingDoc || !newDocTitle.trim() || !newDocUrl.trim()}
                      style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', height: '40px' }}
                    >
                      <Plus size={16} /> {isSavingDoc ? '...' : 'Enlazar'}
                    </button>
                  </div>
                </form>

                <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.8rem' }}>Documentos y Enlaces Guardados ({profileData.documents.length})</h4>

                {profileData.documents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    <Link2 size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>No hay documentos ni enlaces guardados para este usuario.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem' }}>
                    {profileData.documents.map((docItem) => (
                      <div 
                        key={docItem.id || docItem.createdAt}
                        style={{
                          padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column',
                          justifyContent: 'space-between', gap: '0.8rem'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h5 style={{ margin: 0, color: '#fff', fontSize: '0.95rem', fontWeight: 'bold' }}>{docItem.title}</h5>
                            <button 
                              onClick={() => handleDeleteDocument(docItem)}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}
                              title="Eliminar documento"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Subido por: {docItem.addedBy || 'Admin'} • {new Date(docItem.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <a 
                          href={docItem.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--crear-cyan)', textDecoration: 'none',
                            borderRadius: '6px', border: '1px solid var(--crear-cyan)40'
                          }}
                        >
                          <ExternalLink size={14} /> Abrir Documento
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Embedded Task Assignment Modal for this specific user */}
      {showAssignModal && (
        <TaskAssignmentModal 
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          prefilledUser={user}
        />
      )}
    </>
  );
}

```

---

### 📄 Archivo: `src/components/VenueConfigModal.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { defaultVenues, getVenueForTraining } from '../data/venuesData';
import { MapPin, Building, Edit, Save, X, CheckCircle2, RotateCcw, Compass } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function VenueConfigModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const [selectedSede, setSelectedSede] = useState(() => {
    return currentUser?.sede?.trim() || 'Lima';
  });

  const [venues, setVenues] = useState(defaultVenues);

  const currentSedeVenue = venues[selectedSede] || defaultVenues[selectedSede] || defaultVenues.Lima;

  const [c1Venue, setC1Venue] = useState(currentSedeVenue.c1_venue || '');
  const [c2Venue, setC2Venue] = useState(currentSedeVenue.c2_venue || '');
  const [mjVenue, setMjVenue] = useState(currentSedeVenue.mj_venue || '');
  const [viajeVenue, setViajeVenue] = useState(currentSedeVenue.viaje_venue || '');
  const [address, setAddress] = useState(currentSedeVenue.address || '');

  useEffect(() => {
    const fetchSedeVenue = async () => {
      try {
        const venueDocRef = doc(db, 'venues', selectedSede);
        const snap = await getDoc(venueDocRef);
        if (snap.exists()) {
          const firestoreVenue = snap.data();
          setC1Venue(firestoreVenue.c1_venue || '');
          setC2Venue(firestoreVenue.c2_venue || '');
          setMjVenue(firestoreVenue.mj_venue || '');
          setViajeVenue(firestoreVenue.viaje_venue || '');
          setAddress(firestoreVenue.address || '');
          return;
        }
      } catch (e) {
        // Fallback to local
      }

      const sVenue = venues[selectedSede] || defaultVenues[selectedSede] || defaultVenues.Lima;
      setC1Venue(sVenue.c1_venue || '');
      setC2Venue(sVenue.c2_venue || '');
      setMjVenue(sVenue.mj_venue || '');
      setViajeVenue(sVenue.viaje_venue || '');
      setAddress(sVenue.address || '');
    };

    fetchSedeVenue();
  }, [selectedSede, venues]);

  const handleSave = async () => {
    const venueData = {
      ...currentSedeVenue,
      sede: selectedSede,
      c1_venue: c1Venue,
      c2_venue: c2Venue,
      mj_venue: mjVenue,
      viaje_venue: viajeVenue,
      address: address,
      updatedBy: currentUser?.email || 'gerente',
      updatedAt: new Date().toISOString()
    };

    const updated = {
      ...venues,
      [selectedSede]: venueData
    };

    setVenues(updated);

    try {
      await setDoc(doc(db, 'venues', selectedSede), venueData, { merge: true });
      showToast(`¡Lugares y Hoteles de entrenamiento para ${selectedSede} actualizados!`, 'success');
      onClose();
    } catch (err) {
      console.error("Could not write venue to Firestore:", err);
      showToast('Error al guardar la configuración del venue.', 'error');
    }
  };

  const handleResetDefault = () => {
    const dVenue = defaultVenues[selectedSede] || defaultVenues.Lima;
    setC1Venue(dVenue.c1_venue);
    setC2Venue(dVenue.c2_venue);
    setMjVenue(dVenue.mj_venue);
    setViajeVenue(dVenue.viaje_venue || '');
    setAddress(dVenue.address);
    showToast(`Valores restaurados a los hoteles oficiales por defecto.`, 'info');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '640px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        border: '1px solid rgba(0, 210, 255, 0.3)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 210, 255, 0.15)',
        position: 'relative'
      }}>
        {/* BOTÓN CERRAR */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Building size={28} color="var(--crear-gold)" />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#ffffff' }}>
              Configuración de Hoteles, Salones & El Viaje
            </h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Establece el lugar oficial por defecto o modifícalo según la necesidad
            </p>
          </div>
        </div>

        <hr style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '1.25rem 0' }} />

        {/* SELECTOR DE SEDE */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            Seleccionar Sede a Configurar:
          </label>
          <select
            value={selectedSede}
            onChange={(e) => setSelectedSede(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.4)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '0.95rem',
              fontWeight: 'bold'
            }}
          >
            {Object.keys(defaultVenues).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* LUGAR PARA C1 */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.35rem' }}>
            <span>🏨 Hotel / Salón para Capítulo 1 (C1):</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--crear-blue)' }}>Por Defecto</span>
          </label>
          <input
            type="text"
            value={c1Venue}
            onChange={(e) => setC1Venue(e.target.value)}
            placeholder="Ej: Hotel José Antonio Deluxe Miraflores"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(0, 210, 255, 0.25)',
              color: '#ffffff',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* LUGAR PARA C2 */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.35rem' }}>
            <span>🏨 Hotel / Salón para Capítulo 2 (C2):</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--crear-blue)' }}>Por Defecto</span>
          </label>
          <input
            type="text"
            value={c2Venue}
            onChange={(e) => setC2Venue(e.target.value)}
            placeholder="Ej: Hotel José Antonio Deluxe Miraflores"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(0, 210, 255, 0.25)',
              color: '#ffffff',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* LUGAR PARA MJ */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.35rem' }}>
            <span>🏨 Hotel / Salón para Maestría del Juego (MJ):</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--role-mj)' }}>Por Defecto</span>
          </label>
          <input
            type="text"
            value={mjVenue}
            onChange={(e) => setMjVenue(e.target.value)}
            placeholder="Ej: Hotel José Antonio Deluxe Miraflores"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              color: '#ffffff',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* LUGAR PARA EL VIAJE */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '0.35rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
              <Compass size={14} /> 🏕️ Lugar / Hostal para "El Viaje" (MJ Viaje):
            </span>
            <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>Especial Retiro</span>
          </label>
          <input
            type="text"
            value={viajeVenue}
            onChange={(e) => setViajeVenue(e.target.value)}
            placeholder="Ej: Hostal Sol y Luna (Cieneguilla, Lima, Perú)"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(251, 191, 36, 0.35)',
              color: '#ffffff',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* DIRECCIÓN OFICIAL */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            📍 Dirección General de la Sede para Mapas:
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej: Calle Bellavista 133, Miraflores, Lima, Perú"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* ACCIONES */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <button
            type="button"
            onClick={handleResetDefault}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RotateCcw size={13} /> Restaurar Oficiales
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-neon-action"
              style={{ padding: '0.5rem 1.4rem' }}
            >
              <Save size={14} />
              <span>Guardar Configuración</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

```

---

### 📄 Archivo: `src/config/permissions.js`

```javascript
// Configuración centralizada de permisos y roles administrativos
// Este archivo es la ÚNICA fuente de verdad para emails con privilegios elevados.
// Cualquier cambio de SuperAdmin se hace AQUÍ, no disperso en el código.

/**
 * Emails con privilegios de Super Administrador.
 * Estos usuarios tienen acceso total: Centro de Mando, reinicio de ciclos,
 * gestión de metas, y visibilidad global multi-sede.
 */
export const SUPER_ADMIN_EMAILS = [
  'jose.sanchez@crearpsl.net',
];

/**
 * Roles que otorgan privilegios de Dirección (equivalente a SuperAdmin por rol)
 */
export const DIRECCION_ROLES = ['direccion', 'cfo'];

/**
 * Roles que otorgan privilegios de Gerencia
 */
export const GERENCIA_ROLES = ['gerente', ...DIRECCION_ROLES];

/**
 * Verifica si un email tiene privilegios de SuperAdmin
 * @param {string} email 
 * @returns {boolean}
 */
export const isSuperAdminEmail = (email) => {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
};

/**
 * Verifica si un rol normalizado tiene privilegios de Dirección
 * @param {string} role - Rol normalizado
 * @returns {boolean}
 */
export const isDireccionRole = (role) => {
  return DIRECCION_ROLES.includes(role);
};

/**
 * Verifica si un rol normalizado tiene privilegios de Gerencia
 * @param {string} role - Rol normalizado  
 * @returns {boolean}
 */
export const isGerenciaRole = (role) => {
  return GERENCIA_ROLES.includes(role);
};

/**
 * Devuelve la lista de roles a los que el usuario actual puede asignar tareas,
 * basado en la jerarquía del organigrama de CREAR PSL.
 * @param {Object} currentUser - Objeto del usuario logueado
 * @returns {Array<{id: string, name: string}>}
 */
export const getAssignableRoles = (currentUser) => {
  const normRole = currentUser?.appRole;
  
  if (!normRole) return [];

  if (currentUser.isSuperAdmin) {
    return [
      { id: 'gerente', name: 'Gerente de Sede' },
      { id: 'director_maestria', name: 'Director de Maestría' },
      { id: 'coord_maestria', name: 'Coordinador Maestría' },
      { id: 'coord_c1', name: 'Coordinador C1/C2' },
      { id: 'capitan', name: 'Capitán' },
      { id: 'manager', name: 'Manager' },
      { id: 'qt', name: 'Quantum Team (QT)' },
      { id: 'admin', name: 'Equipo Administrativo' }
    ];
  }

  if (normRole === 'director_maestria') {
    return [
      { id: 'director_maestria', name: 'Director de Maestría (A mí mismo)' },
      { id: 'coord_maestria', name: 'Coordinador Maestría' },
      { id: 'manager', name: 'Manager' }
    ];
  }

  if (normRole === 'gerente') {
    return [
      { id: 'gerente', name: 'Gerente (A mí mismo)' },
      { id: 'coord_c1', name: 'Coordinador C1/C2' },
      { id: 'admin', name: 'Equipo Administrativo' },
      { id: 'capitan', name: 'Capitán' }
    ];
  }

  if (normRole === 'coord_c1') {
    return [
      { id: 'coord_c1', name: 'Coordinador C1/C2 (A mí mismo)' },
      { id: 'capitan', name: 'Capitán' },
      { id: 'qt', name: 'Quantum Team (QT)' }
    ];
  }

  if (normRole === 'coord_maestria') {
    return [
      { id: 'coord_maestria', name: 'Coordinador Maestría (A mí mismo)' },
      { id: 'manager', name: 'Manager' }
    ];
  }

  // Base roles: Capitán, Manager, QT, etc.
  return [
    { id: normRole, name: 'A mí mismo' }
  ];
};

```

---

### 📄 Archivo: `src/context/AuthContext.jsx`

```javascript
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { normalizeRole, ROLE_DISPLAY_NAMES } from '../data/usersData';
import { isSuperAdminEmail, isDireccionRole } from '../config/permissions';
import { useUI } from './UIContext';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useUI();

  const switchRole = (newRole) => {
    const canonicalNewRole = normalizeRole(newRole);
    sessionStorage.setItem('cpsl_active_role', canonicalNewRole);
    setCurrentUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        activeRole: canonicalNewRole,
        appRole: canonicalNewRole
      };
    });
    showToast(`Rol activo cambiado a: ${ROLE_DISPLAY_NAMES[canonicalNewRole] || canonicalNewRole}`, 'info');
  };

  const buildUserObject = (user, foundUser, normalizedEmail) => {
    const canonicalRole = normalizeRole(foundUser.role);
    const isDireccion = isDireccionRole(canonicalRole);
    const isSuperAdmin = isSuperAdminEmail(normalizedEmail);
    const isGerente = isSuperAdmin || isDireccion || canonicalRole === 'gerente';

    // Obtener todos los roles asignados a esta persona
    const assignedRoles = (foundUser.roles && foundUser.roles.length > 0)
      ? Array.from(new Set(foundUser.roles.map(r => normalizeRole(r))))
      : [canonicalRole];

    // Verificar si el usuario tenía un rol activo previamente guardado
    const savedActiveRole = sessionStorage.getItem('cpsl_active_role');
    const activeRole = (savedActiveRole && assignedRoles.includes(savedActiveRole))
      ? savedActiveRole
      : canonicalRole;

    return {
      ...user,
      name: foundUser.name || user.displayName || 'Colaborador CREAR',
      appRole: activeRole,
      activeRole: activeRole,
      roles: assignedRoles,
      rawRole: foundUser.role,
      sede: foundUser.sede,
      sedeTag: foundUser.sedeTag,
      corporateEmail: foundUser.corporateEmail || (foundUser.email?.endsWith('@crearpsl.net') ? foundUser.email : null),
      personalEmail: foundUser.personalEmail || (!foundUser.email?.endsWith('@crearpsl.net') ? foundUser.email : null),
      emails: foundUser.emails || [foundUser.email],
      docType: foundUser.docType,
      docNum: foundUser.docNum,
      phone: foundUser.phone,
      isSuperAdmin,
      isDireccion,
      isGerente,
      switchRole,
      canAccessRole: (targetRole) => {
        const tNorm = normalizeRole(targetRole);
        return isSuperAdmin || isGerente || assignedRoles.includes(tNorm) || activeRole === tNorm;
      }
    };
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.addScope('https://www.googleapis.com/auth/tasks');
    
    try {
      const result = await signInWithPopup(auth, provider);
      
      // Extract Google Access Token for API calls
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken) {
        sessionStorage.setItem('googleAccessToken', credential.accessToken);
      }
      
      const user = result.user;
      const normalizedEmail = user.email.trim().toLowerCase();
      
      // Buscar en Firestore
      let foundUser = null;
      try {
        const q = query(collection(db, "users"), where("emails", "array-contains", normalizedEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          foundUser = snap.docs[0].data();
        }
      } catch (err) {
        console.error("Error consultando Firestore:", err);
      }

      if (!foundUser) {
        await auth.signOut();
        showToast('ACCESO DENEGADO: Tu correo no se encuentra en el Directorio Oficial de CREAR. Contacta a Gerencia.', 'error');
        throw new Error('Unauthorized');
      }

      const userObj = buildUserObject(user, foundUser, normalizedEmail);
      setCurrentUser(userObj);
      return user;
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('googleAccessToken');
    sessionStorage.removeItem('cpsl_active_role');
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const normalizedEmail = user.email.trim().toLowerCase();
        
        let foundUser = null;
        try {
          const q = query(collection(db, "users"), where("emails", "array-contains", normalizedEmail));
          const snap = await getDocs(q);
          if (!snap.empty) foundUser = snap.docs[0].data();
        } catch(e) {
          console.error("Error de auth con Firestore:", e);
        }
        
        if (foundUser) {
          const userObj = buildUserObject(user, foundUser, normalizedEmail);
          setCurrentUser(userObj);
        } else {
          sessionStorage.removeItem('googleAccessToken');
          sessionStorage.removeItem('cpsl_active_role');
          auth.signOut();
          setCurrentUser(null);
        }
      } else {
        sessionStorage.removeItem('googleAccessToken');
        sessionStorage.removeItem('cpsl_active_role');
        setCurrentUser(null);
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loginWithGoogle, logout, loading, switchRole }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

```

---

### 📄 Archivo: `src/context/ChecklistContext.jsx`

```javascript
import { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { checklistData } from '../data/checklistData';
import { usersData, normalizeRole } from '../data/usersData';
import { isSuperAdminEmail, isGerenciaRole } from '../config/permissions';
import { calculateAutomaticDeadline } from '../utils/soarDates';
import { createGoogleTask } from '../services/googleSync';
import { useUI } from './UIContext';
import { useAuth } from './AuthContext';

const ChecklistContext = createContext();

export function ChecklistProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast, showPrompt } = useUI();
  const { currentUser } = useAuth();

  useEffect(() => {
    // Escuchar cambios en la colección "tasks" en tiempo real
    const tasksRef = collection(db, 'tasks');
    const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
      const userSede = currentUser?.sede?.trim() || 'Global';
      let loadedTasks = [];

      if (!snapshot.empty) {
        loadedTasks = snapshot.docs.map(doc => {
          const data = doc.data();
          let sedeCompleted = data.completed;
          let sedeStatus = data.status;
          
          if (data.completions) {
            const mySedeData = data.completions[userSede] || { completed: false, status: 'Pendiente' };
            sedeCompleted = mySedeData.completed;
            sedeStatus = mySedeData.status;
          }

          return {
            id: doc.id,
            ...data,
            completed: sedeCompleted,
            status: sedeStatus
          };
        });
      }

      // Merge de seguridad: Asegurar que todas las tareas del catálogo base (incluidas las nuevas de QT) existan
      const existingIds = new Set(loadedTasks.map(t => t.id));
      const missingBaseTasks = checklistData.filter(t => !existingIds.has(t.id)).map(task => {
        const autoDeadline = calculateAutomaticDeadline(task);
        return {
          ...task,
          id: task.id,
          completed: false,
          status: 'Pendiente',
          priority: task.isCritical ? '🔴 ROJO' : '🟡 AMARILLO',
          progressPercentage: 0,
          deadline: autoDeadline,
          created_at: new Date().toISOString()
        };
      });

      const allTasks = [...loadedTasks, ...missingBaseTasks];
      setTasks(allTasks);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tasks from Firestore:", error);
      // Fallback a checklistData local si Firestore falla
      const localTasks = checklistData.map(task => ({
        ...task,
        completed: false,
        status: 'Pendiente',
        priority: task.isCritical ? '🔴 ROJO' : '🟡 AMARILLO',
        progressPercentage: 0,
        deadline: calculateAutomaticDeadline(task)
      }));
      setTasks(localTasks);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleTask = async (taskId, currentStatus) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const userSede = currentUser?.sede?.trim() || 'Global';
      
      // Update both legacy and map formats just in case it's a custom task
      await updateDoc(taskRef, {
        completed: !currentStatus,
        status: !currentStatus ? 'Completada' : 'Pendiente',
        [`completions.${userSede}.completed`]: !currentStatus,
        [`completions.${userSede}.status`]: !currentStatus ? 'Completada' : 'Pendiente'
      });
    } catch (error) {
      console.error("Error updating task:", error);
      showToast("No se pudo actualizar la tarea. Revisa los permisos de Firestore.", "error");
    }
  };

  const updateTaskDetails = async (taskId, updates) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, updates);
    } catch (error) {
      console.error("Error updating task details:", error);
      showToast("No se pudo actualizar la tarea.", "error");
    }
  };

  const addCustomTask = async (taskData) => {
    try {
      const batch = writeBatch(db);
      // Creamos un ID único usando timestamp
      const customId = `custom_${Date.now()}`;
      const taskRef = doc(db, 'tasks', customId);
      
      batch.set(taskRef, {
        id: customId,
        ...taskData,
        completed: false,
        status: 'Pendiente',
        created_at: new Date().toISOString()
      });

      // Si la tarea tiene una asignación directa a un usuario, crear notificación e email
      if (taskData.assignedToEmail) {
        // 1. Notificación In-App
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: taskData.assignedToEmail,
          title: taskData.task || taskData.title,
          message: `Se te ha asignado una nueva tarea urgente en la sede ${taskData.assignedSede || 'Global'}.`,
          read: false,
          taskId: customId,
          created_at: new Date().toISOString()
        });

        // 2. Notificación por Correo (Vía Firebase Trigger Email Extension)
        const mailRef = doc(collection(db, 'mail'));
        batch.set(mailRef, {
          to: taskData.assignedToEmail,
          message: {
            subject: `NUEVA TAREA ASIGNADA SO-AR: ${taskData.task || taskData.title}`,
            html: `
              <h2>Hola, se te ha asignado una nueva tarea en el SO-AR</h2>
              <p><strong>Tarea:</strong> ${taskData.task || taskData.title}</p>
              <p><strong>Sede:</strong> ${taskData.assignedSede || 'Global'}</p>
              <p><strong>Prioridad:</strong> ${taskData.priority || 'Normal'}</p>
              <p>Por favor, ingresa a la plataforma para revisarla y marcarla como completada cuando esté lista.</p>
              <br/>
              <p><em>Equipo CREAR Poder Sin Límites</em></p>
            `
          }
        });
      }

      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error creating custom task:", error);
      showToast("No se pudo crear la tarea. Revisa los permisos de Firestore.", "error");
      return false;
    }
  };

  const submitEvidence = async (taskId, evidenceUrl) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: 'Pendiente de validación',
        evidence_url: evidenceUrl,
        date: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error submitting evidence:", error);
      showToast("No se pudo enviar la evidencia.", "error");
    }
  };

  const getProgressByRole = (roleId, forceSede = null) => {
    if (!roleId) return 0;
    const targetNorm = normalizeRole(roleId);
    const targetSede = forceSede || currentUser?.sede?.trim() || 'Global';

    const roleTasks = tasks.filter(t => {
      const taskNorm = normalizeRole(t.role);
      return taskNorm === targetNorm || t.role === roleId;
    });
    if (roleTasks.length === 0) return 0;

    const completed = roleTasks.filter(t => {
      // Si usamos forceSede, revisamos el mapa de completions. Si no, usamos el completed mapeado.
      if (forceSede && t.completions) {
        return t.completions[forceSede]?.completed === true;
      }
      return t.completed || t.status === 'Completada';
    }).length;
    return Math.round((completed / roleTasks.length) * 100);
  };

  // Función de utilidad para cargar las tareas iniciales a Firestore (Protegido estrictamente)
  const initializeFirestore = async (user = null) => {
    const activeAuthUser = user || auth.currentUser;
    if (!activeAuthUser) {
      showToast("ACCESO DENEGADO: Debes estar autenticado con permisos de Gerencia.", "error");
      return false;
    }

    const norm = normalizeRole(user?.appRole || user?.role);
    const isAuthorized = user?.isSuperAdmin || isGerenciaRole(norm) || isSuperAdminEmail(activeAuthUser.email);
    
    if (!isAuthorized) {
      showToast("ACCESO DENEGADO: Solo la Gerencia o Dirección pueden reiniciar el ciclo operativo.", "error");
      return false;
    }

    const confirmText = await showPrompt("🚨 ¡ADVERTENCIA CRÍTICA!\n\nEsto reiniciará y sobreescribirá la matriz operativa del SO-AR en Firestore para un nuevo ciclo en blanco.\n\nEscribe CONFIRMAR para continuar:");
    if (!confirmText || confirmText.toUpperCase() !== 'CONFIRMAR') {
      showToast("Operación cancelada.", "info");
      return false;
    }
    
    try {
      const allSedes = [...new Set(usersData.map(u => u.sede?.trim()).filter(Boolean)), 'Global'];
      const batch = writeBatch(db);
      
      checklistData.forEach(task => {
        const taskRef = doc(db, 'tasks', task.id);
        const autoDeadline = calculateAutomaticDeadline(task);
        
        // Inicializar el mapa de completitud en falso para todas las sedes
        const initialCompletions = {};
        allSedes.forEach(s => {
          initialCompletions[s] = { completed: false, status: 'Pendiente' };
        });

        batch.set(taskRef, { 
          ...task, 
          completed: false, // Legacy fallback
          status: 'Pendiente', // Legacy fallback
          completions: initialCompletions,
          priority: task.isCritical ? '🔴 ROJO' : '🟡 AMARILLO',
          progressPercentage: 0,
          deadline: autoDeadline,
          created_at: new Date().toISOString()
        });
      });
      await batch.commit();
      showToast("¡Base de datos SO-AR inicializada y sincronizada con éxito!", "success");
      return true;
    } catch (error) {
      console.error("Error initializing DB:", error);
      showToast("Error al inicializar la base de datos de Firestore. Revisa las reglas de seguridad.", "error");
      return false;
    }
  };

  const syncTasksToGoogle = async (roleId) => {
    const token = sessionStorage.getItem('googleAccessToken');
    if (!token) {
      showToast("No se encontró sesión con permisos de Google. Por favor, cierra sesión y vuelve a entrar.", "error");
      return;
    }

    // Buscamos tareas para este rol que NO estén completadas ni sincronizadas
    const myUnsyncedTasks = tasks.filter(t => t.role === roleId && !t.completed && !t.googleSynced);
    if (myUnsyncedTasks.length === 0) {
      showToast("No tienes tareas pendientes por sincronizar a Google.", "error");
      return;
    }

    let successCount = 0;
    for (let task of myUnsyncedTasks) {
      const result = await createGoogleTask({
        title: task.title,
        description: task.description || '',
        dueDate: task.dueDate || undefined
      }, token);

      if (result.success) {
        // Actualizamos en Firestore para no volverla a sincronizar
        try {
          const taskRef = doc(db, 'tasks', task.id);
          await updateDoc(taskRef, { googleSynced: true });
          successCount++;
        } catch (e) {
          console.error("Error marcando tarea como sincronizada:", e);
        }
      }
    }

    showToast(`¡Se sincronizaron ${successCount} tareas a tu cuenta de Google Tasks exitosamente!`, "success");
  };

  // 1. Enviar invitación de colaboración / mención
  const inviteCollaborator = async (task, targetUser, message) => {
    try {
      const batch = writeBatch(db);
      const taskRef = doc(db, 'tasks', task.id);
      
      const newPending = {
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        sede: targetUser.sede || 'Global',
        invitedBy: currentUser.email,
        inviterName: currentUser.displayName || currentUser.email,
        message: message || '',
        status: 'PENDIENTE',
        createdAt: new Date().toISOString()
      };

      const currentPending = task.pendingCollaborations || [];
      batch.update(taskRef, {
        pendingCollaborations: [...currentPending.filter(p => p.email !== targetUser.email), newPending]
      });

      // Notificación interactiva al invitado
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        userId: targetUser.email,
        type: 'COLLABORATION_INVITE',
        title: `🤝 @${currentUser.displayName || 'Compañero'} te invitó a colaborar`,
        message: message ? `"${message}" en la tarea: ${task.task || task.title}` : `Te ha invitado a colaborar en la tarea: ${task.task || task.title}`,
        taskId: task.id,
        taskTitle: task.task || task.title,
        inviterEmail: currentUser.email,
        inviterName: currentUser.displayName || 'Compañero',
        read: false,
        created_at: new Date().toISOString()
      });

      await batch.commit();
      showToast(`¡Invitación enviada con éxito a @${targetUser.name}!`, 'success');
      return true;
    } catch (err) {
      console.error("Error al invitar colaborador:", err);
      showToast("Error al enviar la invitación.", "error");
      return false;
    }
  };

  // 2. Aceptar invitación de colaboración
  const acceptCollaboration = async (notification) => {
    try {
      const batch = writeBatch(db);
      const taskRef = doc(db, 'tasks', notification.taskId);

      const task = tasks.find(t => t.id === notification.taskId);
      const currentCollabs = task?.collaborators ? [...task.collaborators] : [];
      const currentCollabDetails = task?.collaboratorDetails ? [...task.collaboratorDetails] : [];

      if (!currentCollabs.includes(currentUser.email)) {
        currentCollabs.push(currentUser.email);
        currentCollabDetails.push({
          email: currentUser.email,
          name: currentUser.displayName || currentUser.email,
          role: currentUser.appRole || 'colaborador',
          sede: currentUser.sede || 'Global',
          acceptedAt: new Date().toISOString()
        });
      }

      batch.update(taskRef, {
        collaborators: currentCollabs,
        collaboratorDetails: currentCollabDetails,
        updatedAt: new Date().toISOString()
      });

      // Marcar notificación como leída
      const notifRef = doc(db, 'notifications', notification.id);
      batch.update(notifRef, { read: true, status: 'ACEPTADA' });

      // Notificar al invitador de vuelta
      if (notification.inviterEmail) {
        const replyNotifRef = doc(collection(db, 'notifications'));
        batch.set(replyNotifRef, {
          userId: notification.inviterEmail,
          title: `🎉 @${currentUser.displayName} aceptó colaborar contigo`,
          message: `Ahora comparten y dan seguimiento conjunto a la tarea: "${notification.taskTitle || 'Tarea Compartida'}"`,
          read: false,
          created_at: new Date().toISOString()
        });
      }

      await batch.commit();
      showToast(`¡Colaboración aceptada! La tarea ahora está en tu panel compartido.`, 'success');
      return true;
    } catch (err) {
      console.error("Error al aceptar colaboración:", err);
      showToast("No se pudo aceptar la colaboración.", "error");
      return false;
    }
  };

  // 3. Rechazar invitación
  const rejectCollaboration = async (notification) => {
    try {
      const docRef = doc(db, 'notifications', notification.id);
      await updateDoc(docRef, { read: true, status: 'RECHAZADA' });
      showToast("Invitación declinada.", "info");
      return true;
    } catch (err) {
      console.error("Error al declinar:", err);
      return false;
    }
  };

  return (
    <ChecklistContext.Provider value={{ 
      tasks, 
      toggleTask, 
      updateTaskDetails, 
      submitEvidence, 
      getProgressByRole, 
      loading, 
      initializeFirestore, 
      addCustomTask, 
      syncTasksToGoogle,
      inviteCollaborator,
      acceptCollaboration,
      rejectCollaboration
    }}>
      {children}
    </ChecklistContext.Provider>
  );
}

export function useChecklist() {
  return useContext(ChecklistContext);
}

```

---

### 📄 Archivo: `src/context/CyclesContext.jsx`

```javascript
import { createContext, useContext, useState, useEffect } from 'react';
import { cyclesData } from '../data/cyclesData';

const CyclesContext = createContext();

export function CyclesProvider({ children }) {
  const [currentCycle, setCurrentCycle] = useState(null);
  const [currentStage, setCurrentStage] = useState('PRE-C1');

  useEffect(() => {
    if (cyclesData && cyclesData.length > 0) {
      const today = new Date();
      
      // Buscar el ciclo activo correspondiente a la fecha de hoy (N9)
      let active = cyclesData.find(c => {
        const startWindow = new Date(c.c1_start);
        startWindow.setDate(startWindow.getDate() - 40); // Incluye GATE 1
        const endWindow = new Date(c.maestria_end || c.maestria_start);
        endWindow.setDate(endWindow.getDate() + 20); // Incluye POST-MJ
        return today >= startWindow && today <= endWindow;
      });

      if (!active) {
        // Fallback al ciclo más próximo
        active = cyclesData[0];
      }

      setCurrentCycle(active);

      // Determinación precisa de la etapa operativa SO-AR
      const c1Start = new Date(active.c1_start);
      const c1End = new Date(active.c1_end || active.c1_start);
      c1End.setHours(23, 59, 59);

      const c2Start = new Date(active.c2_start);
      const c2End = new Date(active.c2_end || active.c2_start);
      c2End.setHours(23, 59, 59);

      const maestriaStart = new Date(active.maestria_start);
      const maestriaEnd = new Date(active.maestria_end || active.maestria_start);
      maestriaEnd.setHours(23, 59, 59);

      const gate1Date = new Date(active.c1_start);
      gate1Date.setDate(gate1Date.getDate() - 21);

      if (today < gate1Date) {
        setCurrentStage('GATE 1');
      } else if (today < c1Start) {
        setCurrentStage('PRE-C1');
      } else if (today >= c1Start && today <= c1End) {
        setCurrentStage('C1');
      } else if (today > c1End && today < c2Start) {
        setCurrentStage('POST-C1');
      } else if (today >= c2Start && today <= c2End) {
        setCurrentStage('C2');
      } else if (today > c2End && today < maestriaStart) {
        setCurrentStage('PRE-MJ');
      } else if (today >= maestriaStart && today <= maestriaEnd) {
        setCurrentStage('MJ');
      } else {
        setCurrentStage('POST-MJ');
      }
    }
  }, []);

  return (
    <CyclesContext.Provider value={{ currentCycle, currentStage }}>
      {children}
    </CyclesContext.Provider>
  );
}

export function useCycles() {
  return useContext(CyclesContext);
}

```

---

### 📄 Archivo: `src/context/NotificationContext.jsx`

```javascript
import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentUser } = useAuth();
  const { showToast } = useUI();

  // Create an audio context for the notification sound
  const playNotificationSound = () => {
    try {
      // Basic browser beep using AudioContext
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1); // A4
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  useEffect(() => {
    if (!currentUser?.email) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = [];
      let newUnreadCount = 0;
      let hasNew = false;

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (!data.read && data.created_at) {
             // Only alert if it was created in the last 10 seconds to avoid spam on initial load
             const isRecent = (new Date() - new Date(data.created_at)) < 10000;
             if (isRecent) {
                 hasNew = true;
                 showToast(`Nueva tarea asignada: ${data.title}`, "info");
             }
          }
        }
      });

      snapshot.forEach((doc) => {
        const data = doc.data();
        notifs.push({ id: doc.id, ...data });
        if (!data.read) newUnreadCount++;
      });

      // Sort descending by date
      notifs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      setNotifications(notifs);
      setUnreadCount(newUnreadCount);

      if (hasNew) {
        playNotificationSound();
      }
    }, (error) => {
      console.error("Error fetching notifications:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const markAsRead = async (notificationId) => {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        if (!n.read) {
          batch.update(doc(db, 'notifications', n.id), { read: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

```

---

### 📄 Archivo: `src/context/ThemeContext.jsx`

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // 'auto' | 'light' | 'dark'
  const [themeMode, setThemeModeState] = useState(() => {
    return localStorage.getItem('cpsl_theme_mode') || 'auto';
  });

  const [activeTheme, setActiveTheme] = useState('dark');

  const setThemeMode = (mode) => {
    setThemeModeState(mode);
    localStorage.setItem('cpsl_theme_mode', mode);
  };

  useEffect(() => {
    const calculateTheme = () => {
      if (themeMode === 'light') {
        return 'light';
      }
      if (themeMode === 'dark') {
        return 'dark';
      }
      
      // MODO AUTOMÁTICO: Basado en el momento del día y reloj solar
      // Horario Día: 06:00 AM a 18:30 PM (6.0 a 18.5)
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      const isDayTime = currentHour >= 6.0 && currentHour < 18.5;

      return isDayTime ? 'light' : 'dark';
    };

    const applyTheme = () => {
      const resolved = calculateTheme();
      setActiveTheme(resolved);
      document.documentElement.setAttribute('data-theme', resolved);
      document.body.setAttribute('data-theme', resolved);
      if (resolved === 'light') {
        document.documentElement.classList.add('theme-light');
        document.documentElement.classList.remove('theme-dark');
      } else {
        document.documentElement.classList.add('theme-dark');
        document.documentElement.classList.remove('theme-light');
      }
    };

    applyTheme();

    // Actualizar automáticamente cada minuto si está en modo auto
    const interval = setInterval(() => {
      if (themeMode === 'auto') {
        applyTheme();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, activeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

```

---

### 📄 Archivo: `src/context/UIContext.jsx`

```javascript
import React, { createContext, useContext, useState, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const UIContext = createContext();

export const useUI = () => useContext(UIContext);

export const UIProvider = ({ children }) => {
  const [promptState, setPromptState] = useState({
    isOpen: false,
    title: '',
    defaultValue: '',
    resolve: null
  });

  const showToast = useCallback((message, type = 'success') => {
    if (type === 'success') {
      toast.success(message, {
        style: { background: '#22c55e', color: '#fff', borderRadius: '8px' },
        iconTheme: { primary: '#fff', secondary: '#22c55e' }
      });
    } else if (type === 'error') {
      toast.error(message, {
        style: { background: '#ef4444', color: '#fff', borderRadius: '8px' },
        iconTheme: { primary: '#fff', secondary: '#ef4444' }
      });
    } else {
      toast(message, {
        style: { background: '#3b82f6', color: '#fff', borderRadius: '8px' },
        iconTheme: { primary: '#fff', secondary: '#3b82f6' }
      });
    }
  }, []);

  const showPrompt = useCallback((title, defaultValue = '') => {
    return new Promise((resolve) => {
      setPromptState({
        isOpen: true,
        title,
        defaultValue,
        resolve
      });
    });
  }, []);

  const handlePromptClose = useCallback((value) => {
    if (promptState.resolve) {
      promptState.resolve(value);
    }
    setPromptState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [promptState]);

  return (
    <UIContext.Provider value={{ showToast, showPrompt, promptState, handlePromptClose }}>
      {children}
      <Toaster position="top-center" />
    </UIContext.Provider>
  );
};

```

---

### 📄 Archivo: `src/data/checklistData.js`

```javascript
export const roles = [
  { id: 'gerente', name: 'Gerente de Sede' },
  { id: 'coord_maestria', name: 'Coordinador/a Maestría (CMJ)' },
  { id: 'coord_c1', name: 'Coordinador/a C1/C2' },
  { id: 'capitan', name: 'Capitán' },
  { id: 'qt', name: 'Equipo de Apoyo' } // Replaced QT
];

// Fases oficiales del SO-AR (Niveles Temporales y Gates)
export const checklistData = [
  // --- GATE T-30 ---
  { 
    id: 't30_presupuesto', role: 'gerente', cyclePhase: 'T-30', task: 'Presupuesto aprobado y fondos separados',
    priority: 'Crítica', deadline: 'T-30', evidence: 'Reporte Financiero', dependency: 'Ninguna', escalation: 'Dirección General', isCritical: true
  },
  { 
    id: 't30_salon', role: 'gerente', cyclePhase: 'T-30', task: 'Salón definido, separado y pagado',
    priority: 'Crítica', deadline: 'T-30', evidence: 'Contrato y Comprobante de Pago', dependency: 'Presupuesto aprobado', escalation: 'Dirección General', isCritical: true
  },
  { 
    id: 't30_entrenador', role: 'gerente', cyclePhase: 'T-30', task: 'Entrenador confirmado',
    priority: 'Crítica', deadline: 'T-30', evidence: 'Correo/Mensaje de confirmación', dependency: 'Ninguna', escalation: 'Dirección General', isCritical: true
  },
  { 
    id: 't30_hotel', role: 'gerente', cyclePhase: 'T-30', task: 'Hotel del entrenador confirmado y pagado',
    priority: 'Crítica', deadline: 'T-30', evidence: 'Comprobante de Reserva/Pago', dependency: 'Entrenador confirmado', escalation: 'Dirección General', isCritical: true
  },
  { 
    id: 't30_vuelo', role: 'gerente', cyclePhase: 'T-30', task: 'Vuelo del entrenador confirmado y pagado',
    priority: 'Crítica', deadline: 'T-30', evidence: 'Boleto Electrónico', dependency: 'Entrenador confirmado', escalation: 'Dirección General', isCritical: true
  },

  // --- GATE T-21 ---
  {
    id: 't21_censo', role: 'coord_c1', cyclePhase: 'T-21', task: 'Censo preliminar de inscritos',
    priority: 'Media', deadline: 'T-21', evidence: 'Listado en CRM', dependency: 'Ninguna', escalation: 'Gerente', isCritical: false
  },

  // --- GATE T-14 ---
  {
    id: 't14_apoyo', role: 'capitan', cyclePhase: 'T-14', task: 'Convocatoria y roles de Equipo de Apoyo confirmados',
    priority: 'Alta', deadline: 'T-14', evidence: 'Lista de Equipo de Apoyo', dependency: 'Ninguna', escalation: 'Gerente', isCritical: true
  },

  // --- GATE T-7 ---
  {
    id: 't7_freeze', role: 'coord_c1', cyclePhase: 'T-7', task: 'Freeze de listas de asistencia iniciales',
    priority: 'Alta', deadline: 'T-7', evidence: 'Lista Exportada', dependency: 'Censo preliminar', escalation: 'Gerente', isCritical: true
  },
  {
    id: 't7_uniformes', role: 'qt', cyclePhase: 'T-7', task: 'Auditoría de uniformes de Equipo de Apoyo',
    priority: 'Media', deadline: 'T-7', evidence: 'Checklist Fotográfico', dependency: 'Asignación Equipo de Apoyo', escalation: 'Capitán', isCritical: false
  },

  // --- OPERACIÓN C1 ---
  {
    id: 'c1_registro', role: 'coord_c1', cyclePhase: 'C1', task: 'Apertura de registro y resguardo de pertenencias',
    priority: 'Crítica', deadline: 'DÍA 0 (Viernes)', evidence: 'Planillas de Ingreso', dependency: 'Listas Freeze', escalation: 'Gerente', isCritical: true
  },
  {
    id: 'c1_contencion', role: 'qt', cyclePhase: 'C1', task: 'Mantenimiento hermético de sala y contención silenciosa',
    priority: 'Alta', deadline: 'DÍA 0', evidence: 'Ninguna', dependency: 'Sala instalada', escalation: 'Capitán', isCritical: true
  },

  // --- CIERRE C1 ---
  {
    id: 'postc1_devolucion', role: 'qt', cyclePhase: 'POST-C1', task: 'Devolución del salón en estado impecable',
    priority: 'Media', deadline: 'T+1 (Domingo)', evidence: 'Acta de entrega / Fotos', dependency: 'Ninguna', escalation: 'Capitán', isCritical: false
  },
  {
    id: 'postc1_rezagados', role: 'coord_c1', cyclePhase: 'POST-C1', task: 'Reporte final de asistencia y Rezagados',
    priority: 'Crítica', deadline: 'T+1 (Domingo Noche)', evidence: 'Reporte Financiero', dependency: 'Cierre de C1', escalation: 'Gerente', isCritical: true
  },

  // --- OPERACIÓN C2 ---
  {
    id: 'c2_grounding', role: 'coord_c1', cyclePhase: 'C2', task: 'Arranque y grounding del equipo',
    priority: 'Alta', deadline: 'DÍA 0 (Jueves)', evidence: 'Foto de Grounding', dependency: 'Ninguna', escalation: 'Gerente', isCritical: true
  },
  {
    id: 'c2_mesas', role: 'coord_c1', cyclePhase: 'C2', task: 'Operación de mesas de enrolamiento a MJ',
    priority: 'Crítica', deadline: 'DÍA 0 (Sábado/Domingo)', evidence: 'Vouchers/Registros', dependency: 'Ninguna', escalation: 'Gerente', isCritical: true
  },

  // --- GATE VIERNES C2 ---
  {
    id: 'gatec2_grounding', role: 'coord_maestria', cyclePhase: 'C2', task: 'Groundings de los tres FDS de MJ confirmados',
    priority: 'Crítica', deadline: 'Viernes C2', evidence: 'Documento Firmado', dependency: 'Managers Confirmados', escalation: 'Gerente', isCritical: true
  },
  {
    id: 'gatec2_rezagados', role: 'coord_c1', cyclePhase: 'C2', task: 'Meta de Rezagados de C1 comunicada y responsable asignado',
    priority: 'Crítica', deadline: 'Viernes C2', evidence: 'Meta en CRM/Sistema', dependency: 'Reporte Rezagados C1', escalation: 'Gerente', isCritical: true
  },

  // --- PREPARACIÓN MJ ---
  {
    id: 'premj_managers', role: 'coord_maestria', cyclePhase: 'PRE-MJ', task: 'Relación 1 Manager por cada 6 Participantes configurada',
    priority: 'Crítica', deadline: 'Semana 1', evidence: 'Lista de Asignación', dependency: 'Graduados C2', escalation: 'Gerente', isCritical: true
  },
  {
    id: 'premj_entrenador', role: 'coord_maestria', cyclePhase: 'PRE-MJ', task: 'Agenda de Entrenador MJ bloqueada',
    priority: 'Alta', deadline: 'Jueves Pre-FDS', evidence: 'Captura Google Calendar', dependency: 'Ninguna', escalation: 'Gerente', isCritical: true
  },

  // --- OPERACIÓN MJ ---
  {
    id: 'mj_registro', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Registro estricto (Sin firmas de reglas no hay ingreso)',
    priority: 'Crítica', deadline: 'Viernes FDS 1', evidence: 'Actas Firmadas', dependency: 'Ninguna', escalation: 'Gerente', isCritical: true
  },
  {
    id: 'mj_imposibles', role: 'coord_maestria', cyclePhase: 'MJ', task: 'Seguimiento de Futuros Imposibles',
    priority: 'Media', deadline: 'Lunes post-FDS', evidence: 'Reporte a Entrenador', dependency: 'Ejecución FDS', escalation: 'Ninguno', isCritical: false
  },

  // --- CIERRE MJ ---
  {
    id: 'cierre_mj_oro', role: 'coord_maestria', cyclePhase: 'POST-MJ', task: 'Certificación de Cierre de Oro',
    priority: 'Crítica', deadline: 'T+7', evidence: 'Acta de Dirección', dependency: 'Graduación', escalation: 'Gerente', isCritical: true
  }
];

export const getTasksByRole = (roleId) => checklistData.filter(t => t.role === roleId);

```

---

### 📄 Archivo: `src/data/cyclesData.js`

```javascript
export const cyclesData = [
  {
    "id": "2026-EQ-30",
    "name": "Equipo 30",
    "c1_start": "2026-08-10",
    "c1_end": "2026-08-12",
    "c2_start": "2026-08-30",
    "c2_end": "2026-09-02",
    "maestria_start": "2026-10-09",
    "maestria_end": "2026-10-11"
  }
];

```

---

### 📄 Archivo: `src/data/usersData.js`

```javascript
export const normalizeRole = (role) => {
  if (!role) return 'miembro';
  const r = role.toLowerCase().trim();
  if (r === 'coordinador_c1c2' || r === 'coord_c1' || r === 'coordinador_c1') return 'coord_c1';
  if (r === 'coordinador_mj' || r === 'coord_maestria' || r === 'coordinador_maestria') return 'coord_maestria';
  if (r === 'gerente' || r === 'gerente_sede') return 'gerente';
  if (r === 'capitan' || r === 'capitán') return 'capitan';
  if (r === 'qt' || r === 'quantum_team' || r === 'quantum team' || r === 'quantum') return 'qt';
  if (r === 'director_maestria' || r === 'director_mj') return 'director_maestria';
  if (r === 'manager' || r === 'managers') return 'manager';
  if (r === 'cfo') return 'cfo';
  return r;
};

export const normalizeSede = (sede) => {
  if (!sede) return 'Sede Global';
  const s = sede.trim();
  if (s === 'MED' || s.toLowerCase().includes('medell')) return 'Medellín';
  if (s === 'LIM' || s.toLowerCase().includes('lima')) return 'Lima';
  if (s === 'CUE' || s.toLowerCase().includes('cuenca')) return 'Cuenca';
  if (s === 'GYE' || s.toLowerCase().includes('guayaquil')) return 'Guayaquil';
  if (s === 'MEX' || s.toLowerCase().includes('mex')) return 'México';
  if (s === 'UIO-C1' || s.toLowerCase().includes('ciclo 1') || s.toLowerCase().includes('ciclo1')) return 'Quito Ciclo 1';
  if (s === 'UIO-C2' || s.toLowerCase().includes('ciclo 2') || s.toLowerCase().includes('ciclo2')) return 'Quito Ciclo 2';
  if (s === 'UIO' || s.toLowerCase().includes('quito')) return 'Quito Ciclo 1';
  if (s.toLowerCase().includes('global')) return 'Sede Global';
  return s;
};

export const OPERATIONAL_SEDES = [
  'Lima',
  'Quito Ciclo 1',
  'Quito Ciclo 2',
  'Cuenca',
  'Guayaquil',
  'Medellín',
  'México'
];

export const ROLE_DISPLAY_NAMES = {
  coord_c1: 'Coordinador C1 / C2',
  coordinador_c1c2: 'Coordinador C1 / C2',
  coord_maestria: 'Coordinador Maestría (MJ)',
  coordinador_mj: 'Coordinador Maestría (MJ)',
  gerente: 'Gerente de Sede',
  capitan: 'Capitán de Sede',
  qt: 'Quantum Team (QT)',
  director_maestria: 'Director de Maestría',
  manager: 'Manager',
  cfo: 'CFO (Chief Financial Officer)',
  direccion: 'Dirección Global',
  finanzas: 'Finanzas',
  coordinador: 'Coordinación Administrativa',
  talento_humano: 'Talento Humano',
  legal: 'Legal / Jurídico'
};

/**
 * Busca un usuario por cualquiera de sus correos (corporativo @crearpsl.net o personal Gmail)
 */
export const findUserByAnyEmail = (searchEmail) => {
  if (!searchEmail) return null;
  const emailLower = searchEmail.toLowerCase().trim();
  return usersData.find(u => {
    if (u.email?.toLowerCase().trim() === emailLower) return true;
    if (u.corporateEmail?.toLowerCase().trim() === emailLower) return true;
    if (u.personalEmail?.toLowerCase().trim() === emailLower) return true;
    if (u.emails && u.emails.some(e => e.toLowerCase().trim() === emailLower)) return true;
    return false;
  }) || null;
};

export const usersData = [];

```

---

### 📄 Archivo: `src/data/venuesData.js`

```javascript
// src/data/venuesData.js
// Configuración de Sedes, Hoteles y Salones Oficiales por Defecto

export const defaultVenues = {
  Lima: {
    sede: 'Lima',
    c1_venue: 'Hotel José Antonio Deluxe Miraflores (Calle Bellavista 133, Miraflores)',
    c2_venue: 'Hotel José Antonio Deluxe Miraflores (Calle Bellavista 133, Miraflores)',
    mj_venue: 'Hotel José Antonio Deluxe Miraflores (Calle Bellavista 133, Miraflores)',
    viaje_venue: 'Hostal Sol y Luna (Cieneguilla, Lima, Perú)',
    address: 'Calle Bellavista 133, Miraflores, Lima, Perú',
    city: 'Lima',
    country: 'Perú'
  },
  Quito: {
    sede: 'Quito',
    c1_venue: 'Hotel Dann Carlton Quito (Av. República de El Salvador N34-377)',
    c2_venue: 'Hotel Dann Carlton Quito (Av. República de El Salvador N34-377)',
    mj_venue: 'Hotel Dann Carlton Quito (Av. República de El Salvador N34-377)',
    viaje_venue: 'Hostería Papagayo (Cotopaxi / Machachi, Ecuador)',
    address: 'Av. República de El Salvador N34-377, Quito, Ecuador',
    city: 'Quito',
    country: 'Ecuador'
  },
  Cuenca: {
    sede: 'Cuenca',
    c1_venue: 'Hotel Oro Verde Cuenca (Av. Ordóñez Lasso s/n)',
    c2_venue: 'Hotel Oro Verde Cuenca (Av. Ordóñez Lasso s/n)',
    mj_venue: 'Hotel Oro Verde Cuenca (Av. Ordóñez Lasso s/n)',
    viaje_venue: 'Hostería Dos Chorreras (Cajas, Cuenca, Ecuador)',
    address: 'Av. Ordóñez Lasso s/n, Cuenca, Ecuador',
    city: 'Cuenca',
    country: 'Ecuador'
  },
  Guayaquil: {
    sede: 'Guayaquil',
    c1_venue: 'Hotel Wyndham Guayaquil (Puerto Santa Ana)',
    c2_venue: 'Hotel Wyndham Guayaquil (Puerto Santa Ana)',
    mj_venue: 'Hotel Wyndham Guayaquil (Puerto Santa Ana)',
    viaje_venue: 'Hostería D’Franco (Bucay / Guayas, Ecuador)',
    address: 'Calle Numa Pompilio Llona, Puerto Santa Ana, Guayaquil, Ecuador',
    city: 'Guayaquil',
    country: 'Ecuador'
  },
  Medellin: {
    sede: 'Medellín',
    c1_venue: 'Hotel Diez Category El Poblado (Calle 10A #34-11)',
    c2_venue: 'Hotel Diez Category El Poblado (Calle 10A #34-11)',
    mj_venue: 'Hotel Diez Category El Poblado (Calle 10A #34-11)',
    viaje_venue: 'Hostería Llanogrande (Rionegro / Antioquia, Colombia)',
    address: 'Calle 10A #34-11, El Poblado, Medellín, Colombia',
    city: 'Medellín',
    country: 'Colombia'
  },
  Mexico: {
    sede: 'México',
    c1_venue: 'Hotel Galería Plaza Reforma (Hamburgo 195, Juárez)',
    c2_venue: 'Hotel Galería Plaza Reforma (Hamburgo 195, Juárez)',
    mj_venue: 'Hotel Galería Plaza Reforma (Hamburgo 195, Juárez)',
    viaje_venue: 'Hotel Misión Grand Valle de Bravo (Edo. de México)',
    address: 'Hamburgo 195, Juárez, Cuauhtémoc, CDMX, México',
    city: 'Ciudad de México',
    country: 'México'
  }
};

/**
 * Obtiene el lugar/hotel oficial para una sede y nivel de entrenamiento
 */
export function getVenueForTraining(sede, trainingLevel = 'C1', rawPlace = '', rawAddress = '') {
  const normSede = (sede || '').trim().toLowerCase();
  const level = (trainingLevel || '').toUpperCase();
  
  let matchKey = 'Lima';
  if (normSede.includes('lima') || normSede === 'lim' || normSede.includes('pe lim') || normSede === 'pe') matchKey = 'Lima';
  else if (normSede.includes('quito') || normSede === 'uio' || normSede.includes('ec uio')) matchKey = 'Quito';
  else if (normSede.includes('cuenca') || normSede === 'cue' || normSede.includes('ec cue')) matchKey = 'Cuenca';
  else if (normSede.includes('guayaquil') || normSede === 'gye' || normSede.includes('ec gye')) matchKey = 'Guayaquil';
  else if (normSede.includes('medell') || normSede === 'med' || normSede.includes('co med')) matchKey = 'Medellin';
  else if (normSede.includes('mex') || normSede.includes('méx') || normSede.includes('mx')) matchKey = 'Mexico';

  const venueObj = defaultVenues[matchKey] || defaultVenues.Lima;

  // Si el evento es "El Viaje", SIEMPRE devolver por defecto el hostal/lugar de retiro asignado
  if (level.includes('VIAJE') || level.includes('RETIRO') || level.includes('CIE') || level.includes('SOL Y LUNA')) {
    try {
      const customVenues = JSON.parse(localStorage.getItem('cpsl_custom_venues') || '{}');
      if (customVenues[matchKey] && customVenues[matchKey].viaje_venue) {
        return customVenues[matchKey].viaje_venue;
      }
    } catch (e) {}
    return venueObj.viaje_venue || (matchKey === 'Lima' ? 'Hostal Sol y Luna (Cieneguilla, Lima, Perú)' : venueObj.mj_venue);
  }

  // Si viene un nombre específico de hotel con más de 20 caracteres y contiene 'hotel', 'hostal', 'hostería' o 'salón', usarlo
  const cleanPlace = (rawPlace || '').trim();
  const isGeneric = !cleanPlace || 
                    cleanPlace.toLowerCase() === 'lima, perú' || 
                    cleanPlace.toLowerCase() === 'lima, peru' ||
                    cleanPlace.toLowerCase() === 'lima' ||
                    cleanPlace.toLowerCase() === 'quito, ecuador' ||
                    cleanPlace.toLowerCase() === 'quito' ||
                    cleanPlace.toLowerCase() === 'cuenca, ecuador' ||
                    cleanPlace.toLowerCase() === 'cuenca' ||
                    cleanPlace.toLowerCase() === 'guayaquil' ||
                    cleanPlace.toLowerCase() === 'medellín' ||
                    cleanPlace.toLowerCase() === 'medellin' ||
                    cleanPlace.toLowerCase() === 'méxico' ||
                    cleanPlace.toLowerCase() === 'mexico' ||
                    cleanPlace.toLowerCase().includes('pe lim') ||
                    cleanPlace.toLowerCase().includes('por confirmar');

  if (!isGeneric && (cleanPlace.toLowerCase().includes('hotel') || cleanPlace.toLowerCase().includes('hostal') || cleanPlace.toLowerCase().includes('hoster') || cleanPlace.toLowerCase().includes('salon') || cleanPlace.toLowerCase().includes('salón') || cleanPlace.length > 25)) {
    return cleanPlace;
  }

  // Leer overrides personalizados en localStorage si existen
  try {
    const customVenues = JSON.parse(localStorage.getItem('cpsl_custom_venues') || '{}');
    if (customVenues[matchKey]) {
      if ((level.includes('C1') || level.includes('UNO')) && customVenues[matchKey].c1_venue) return customVenues[matchKey].c1_venue;
      if ((level.includes('C2') || level.includes('DOS')) && customVenues[matchKey].c2_venue) return customVenues[matchKey].c2_venue;
      if ((level.includes('MJ') || level.includes('MAESTR') || level.includes('JUEGO')) && customVenues[matchKey].mj_venue) return customVenues[matchKey].mj_venue;
      if (customVenues[matchKey].c1_venue) return customVenues[matchKey].c1_venue;
    }
  } catch (e) {}

  if (level.includes('C2') || level.includes('DOS')) return venueObj.c2_venue;
  if (level.includes('MJ') || level.includes('MAESTR') || level.includes('JUEGO')) return venueObj.mj_venue;
  return venueObj.c1_venue;
}

```

---

### 📄 Archivo: `src/index.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@400;600;700;800;900&display=swap');

:root {
  --crear-gold: #ffb703;
  --crear-gold-hover: #ffc933;
  --crear-gold-light: rgba(255, 183, 3, 0.15);
  
  --crear-blue: #00d4ff;
  --crear-blue-dark: #0088aa;
  
  --role-gerente: #ffb703;
  --role-c1c2: #00d4ff;
  --role-mj: #a855f7;
  --role-equipo: #34A853;
  --role-capitan: #f97316;

  --color-success: #22c55e;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
  
  --font-heading: 'Montserrat', sans-serif;
  --font-body: 'Inter', 'Roboto', sans-serif;
  
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 32px;
}

/* =========================================================================
   TEMA OSCURO (DARK MODE - POR DEFECTO)
   ========================================================================= */
:root, [data-theme="dark"] {
  --bg-dark: #070d1f;
  --bg-dark-alt: #0d152d;
  --bg-card: rgba(255, 255, 255, 0.03);
  --bg-card-hover: rgba(255, 255, 255, 0.06);
  --bg-glass-heavy: rgba(13, 21, 45, 0.75);
  
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.2);
  
  --text-main: #f8f9fa;
  --text-muted: #94a3b8;
  --text-heading: #ffffff;
  --text-inverted: #030712;
  
  --card-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.6);
  --card-shadow-hover: 0 15px 50px -10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 212, 255, 0.08);
}

/* =========================================================================
   TEMA CLARO (LIGHT MODE - LUMINOSO, ELEGANTE & LIMPIO)
   ========================================================================= */
[data-theme="light"] {
  --bg-dark: #f1f5f9;
  --bg-dark-alt: #ffffff;
  --bg-card: #ffffff;
  --bg-card-hover: #f8fafc;
  --bg-glass-heavy: rgba(255, 255, 255, 0.98);
  
  --border-subtle: rgba(0, 0, 0, 0.12);
  --border-strong: rgba(0, 0, 0, 0.25);
  
  --text-main: #0f172a;
  --text-muted: #475569;
  --text-heading: #0f172a;
  --text-inverted: #ffffff;
  
  --card-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
  --card-shadow-hover: 0 12px 30px -4px rgba(0, 0, 0, 0.12), 0 0 15px rgba(0, 180, 216, 0.2);
}

[data-theme="light"] input,
[data-theme="light"] select,
[data-theme="light"] textarea {
  background-color: #ffffff !important;
  color: #0f172a !important;
  border-color: rgba(0, 0, 0, 0.2) !important;
}

[data-theme="light"] input::placeholder,
[data-theme="light"] textarea::placeholder {
  color: #64748b !important;
}

[data-theme="light"] select option {
  background-color: #ffffff !important;
  color: #0f172a !important;
}

[data-theme="light"] .glass-panel {
  background: #ffffff !important;
  border: 1px solid rgba(0, 0, 0, 0.12) !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06) !important;
  color: #0f172a;
}

[data-theme="light"] .text-white {
  color: #0f172a !important;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--bg-dark);
  color: var(--text-main);
  font-family: var(--font-body);
  line-height: 1.6;
  min-height: 100vh;
  overflow-x: hidden;
  transition: background-color 0.3s ease, color 0.3s ease;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  margin-top: 0;
  color: var(--text-heading);
  letter-spacing: -0.02em;
  font-weight: 700;
  transition: color 0.3s ease;
}

.text-white {
  color: var(--text-heading) !important;
}

.glass-panel {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--card-shadow);
  transition: all 0.3s ease;
}

.glass-panel.hover-glow:hover,
.glass-panel-interactive:hover {
  background: var(--bg-card-hover);
  border: 1px solid var(--border-strong);
  box-shadow: var(--card-shadow-hover);
  transform: translateY(-2px);
}

.btn-primary {
  background: linear-gradient(135deg, var(--crear-gold) 0%, var(--crear-gold-hover) 100%);
  color: #000000;
  border: none;
  border-radius: var(--radius-xl);
  padding: 12px 28px;
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 15px rgba(255, 183, 3, 0.3);
}

.btn-primary:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 10px 25px rgba(255, 183, 3, 0.5), 0 0 20px rgba(255, 183, 3, 0.3);
}

/* BOTÓN DE ACCIÓN NEÓN RADIANTE DE MÁXIMO CONTRASTE (100% VISIBLE EN CUALQUIER MODO) */
.btn-neon-action {
  background: linear-gradient(135deg, #00d2ff 0%, #0284c7 100%) !important;
  color: #030712 !important;
  border: 2px solid #ffffff !important;
  box-shadow: 0 0 20px rgba(0, 210, 255, 0.85), 0 4px 14px rgba(0, 0, 0, 0.5) !important;
  padding: 8px 22px !important;
  border-radius: 9999px !important;
  font-family: var(--font-heading) !important;
  font-weight: 900 !important;
  font-size: 0.85rem !important;
  letter-spacing: 1.5px !important;
  text-transform: uppercase !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  text-decoration: none !important;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.btn-neon-action:hover {
  transform: translateY(-2px) scale(1.05) !important;
  box-shadow: 0 0 32px rgba(0, 210, 255, 1), 0 6px 22px rgba(0, 0, 0, 0.6) !important;
  background: linear-gradient(135deg, #38bdf8 0%, #0369a1 100%) !important;
  color: #000000 !important;
}

.btn-neon-action span, .btn-neon-action svg {
  color: #030712 !important;
  font-weight: 900 !important;
  stroke: #030712 !important;
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-main);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 8px 16px;
  font-family: var(--font-body);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.btn-secondary:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-strong);
  color: var(--text-heading);
}

.text-gold { color: var(--crear-gold) !important; }
.text-blue { color: var(--crear-blue) !important; }
.text-muted { color: var(--text-muted) !important; }
.text-role-gerente { color: var(--role-gerente) !important; }
.text-role-c1c2 { color: var(--role-c1c2) !important; }
.text-role-mj { color: var(--role-mj) !important; }
.text-role-equipo { color: var(--role-equipo) !important; }
.text-role-capitan { color: var(--role-capitan) !important; }
.uppercase { text-transform: uppercase; letter-spacing: 2px; font-weight: 700; }

```

---

### 📄 Archivo: `src/main.jsx`

```javascript
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

```

---

### 📄 Archivo: `src/pages/ChecklistBoard.jsx`

```javascript
import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChecklist } from '../context/ChecklistContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import { roles } from '../data/checklistData';
import { calculateAutomaticDeadline } from '../utils/soarDates';
import { ArrowLeft, Target, Link as LinkIcon, Edit3, Filter, Clock, Calendar, ShieldAlert, Users, AtSign } from 'lucide-react';
import TaskAssignmentModal from '../components/TaskAssignmentModal';
import TaskCollaborationModal from '../components/TaskCollaborationModal';

export default function ChecklistBoard() {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [selectedTaskForCollab, setSelectedTaskForCollab] = useState(null);
  const [qtPhaseFilter, setQtPhaseFilter] = useState('all'); // 'all', 'PRE-C1', 'C1', 'POST-C1'

  const { currentUser } = useAuth();
  const { tasks, toggleTask, updateTaskDetails, inviteCollaborator } = useChecklist();
  const { currentCycle, currentStage } = useCycles();
  const { showPrompt } = useUI();

  const role = roles.find(r => r.id === roleId);

  // Verificación de Autorización por Rol (N7)
  const isAuthorized = currentUser?.canAccessRole ? currentUser.canAccessRole(roleId) : true;
  if (!isAuthorized) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }} className="glass-panel">
        <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
        <h2 style={{ color: '#fff', margin: '0 0 0.5rem' }}>Acceso Restringido</h2>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
          Tu rol asignado ({currentUser?.appRole}) no tiene autorización para acceder al checklist de <strong>{role?.name || roleId}</strong>.
        </p>
        <button className="btn-secondary" onClick={() => navigate('/home')}>Volver a Mi Inicio</button>
      </div>
    );
  }

  // Las tareas mías incluyen: rol directo, asignadas a mi correo O donde soy colaborador aceptado
  const myTasks = tasks.filter(t => 
    t.role === roleId || 
    t.assignedToEmail === currentUser?.email ||
    (t.collaborators && t.collaborators.includes(currentUser?.email))
  );

  const filterParam = searchParams.get('filter');

  let activeTasks = myTasks;
  let viewTitle = `Checklist SO-AR Activo: ${currentStage}`;

  if (filterParam === 'completed') {
    activeTasks = myTasks.filter(t => t.completed || t.status === 'Completada');
    viewTitle = "Mostrando: Tareas Completadas";
  } else if (filterParam === 'criticas') {
    activeTasks = myTasks.filter(t => !t.completed && (t.isCritical || t.priority === 'Crítica'));
    viewTitle = "Mostrando: Tareas Críticas (Urgentes)";
  } else if (filterParam === 'importantes') {
    activeTasks = myTasks.filter(t => !t.completed && !t.isCritical && t.priority !== 'Crítica');
    viewTitle = "Mostrando: Tareas Importantes";
  } else if (roleId === 'qt') {
    // Para QT: visualización prolija de sus fases autorizadas (PRE-C1, C1, POST-C1 / C2)
    if (qtPhaseFilter === 'PRE-C1') {
      activeTasks = myTasks.filter(t => t.cyclePhase === 'PRE-C1');
      viewTitle = "Quantum Team: Fase PRE-C1 (Logística & Armado)";
    } else if (qtPhaseFilter === 'C1') {
      activeTasks = myTasks.filter(t => t.cyclePhase === 'C1');
      viewTitle = "Quantum Team: Fase C1 (Sala & Operaciones en Vivo)";
    } else if (qtPhaseFilter === 'POST-C1') {
      activeTasks = myTasks.filter(t => t.cyclePhase === 'POST-C1' || t.cyclePhase === 'C2');
      viewTitle = "Quantum Team: Fase POST-C1 / C2 (Cierre & Conversión)";
    } else {
      activeTasks = myTasks;
      viewTitle = "Quantum Team: Catálogo Completo de Tareas (PRE-C1, C1 y C2)";
    }
  } else {
    // Vista Normal del Checklist Activo para otros roles
    activeTasks = myTasks.filter(t => 
      (t.cyclePhase === currentStage) || (t.associatedGoal && !t.completed) || (t.isCritical && !t.completed)
    );
  }

  if (!role) {
    return <div className="text-gold" style={{ padding: '2rem', textAlign: 'center' }}>Rol no encontrado</div>;
  }

  // El progreso siempre es de mis tareas totales de la fase, no de la vista filtrada
  const stageTasks = myTasks.filter(t => t.cyclePhase === currentStage || t.associatedGoal);
  const completedActive = stageTasks.filter(t => t.completed || t.status === 'Completada').length;
  const progress = stageTasks.length > 0 ? Math.round((completedActive / stageTasks.length) * 100) : 100;

  const handleStatusChange = (task) => {
    toggleTask(task.id, task.completed);
  };

  const handleAddEvidence = async (task) => {
    const url = await showPrompt("Introduce el link de la evidencia (Google Drive, Docs, etc):", task.evidenceUrl || "");
    if (url !== null) {
      updateTaskDetails(task.id, { evidenceUrl: url });
    }
  };

  const handleAddComment = async (task) => {
    const comment = await showPrompt("Añadir comentario u observación:", task.comments || "");
    if (comment !== null) {
      updateTaskDetails(task.id, { comments: comment });
    }
  };

  const handleProgressChange = async (task) => {
    const p = await showPrompt("Actualizar porcentaje de avance (0-100):", task.progressPercentage || 0);
    if (p !== null && !isNaN(p)) {
      updateTaskDetails(task.id, { progressPercentage: Math.min(100, Math.max(0, parseInt(p))) });
    }
  };

  const handleSetDeadline = async (task) => {
    const current = task.deadline || "";
    const newDeadline = await showPrompt("⏰ Establecer Fecha y Hora Límite obligatoria:\n(Ejemplo: 2026-08-22 18:00 o Lunes 09:00)", current);
    if (newDeadline !== null && newDeadline.trim() !== "") {
      updateTaskDetails(task.id, { deadline: newDeadline.trim() });
    }
  };

  const getPriorityColor = (priorityStr) => {
    if (!priorityStr) return 'var(--text-muted)';
    if (priorityStr === 'Crítica') return '#ef4444';
    if (priorityStr === 'Alta') return '#f59e0b';
    if (priorityStr === 'Media') return '#29abe2';
    if (priorityStr === 'Baja') return '#22c55e';
    return 'var(--text-muted)';
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h1 className="text-gold uppercase" style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0' }}>{role.name}</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <p className={filterParam ? "text-blue" : "text-muted"} style={{ margin: 0, fontWeight: filterParam ? 'bold' : 'normal' }}>
            {viewTitle}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {filterParam && (
              <button onClick={() => setSearchParams({})} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>
                Limpiar Filtro
              </button>
            )}
            <button 
              type="button"
              onClick={() => setShowTaskModal(true)} 
              className="btn-neon-action"
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
              <span>TAREA</span>
            </button>
          </div>
        </div>
        
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--color-success)' : 'var(--crear-gold)', transition: 'width 0.4s ease' }} />
        </div>
        <p className="text-gold" style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>{progress}% Completado en esta Fase</p>

        {/* NAVEGACIÓN PROLIJA DE FASES PARA QUANTUM TEAM */}
        {roleId === 'qt' && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
            <button
              onClick={() => setQtPhaseFilter('all')}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                background: qtPhaseFilter === 'all' ? 'var(--crear-blue)' : 'rgba(255,255,255,0.05)',
                color: qtPhaseFilter === 'all' ? '#000000' : 'var(--text-muted)',
                border: `1px solid ${qtPhaseFilter === 'all' ? 'var(--crear-blue)' : 'rgba(255,255,255,0.1)'}`
              }}
            >
              📋 Todas las Tareas QT ({myTasks.length})
            </button>
            <button
              onClick={() => setQtPhaseFilter('PRE-C1')}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                background: qtPhaseFilter === 'PRE-C1' ? 'var(--crear-gold)' : 'rgba(255,255,255,0.05)',
                color: qtPhaseFilter === 'PRE-C1' ? '#000000' : 'var(--text-muted)',
                border: `1px solid ${qtPhaseFilter === 'PRE-C1' ? 'var(--crear-gold)' : 'rgba(255,255,255,0.1)'}`
              }}
            >
              📦 PRE-C1 ({myTasks.filter(t => t.cyclePhase === 'PRE-C1').length})
            </button>
            <button
              onClick={() => setQtPhaseFilter('C1')}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                background: qtPhaseFilter === 'C1' ? 'var(--color-success)' : 'rgba(255,255,255,0.05)',
                color: qtPhaseFilter === 'C1' ? '#000000' : 'var(--text-muted)',
                border: `1px solid ${qtPhaseFilter === 'C1' ? 'var(--color-success)' : 'rgba(255,255,255,0.1)'}`
              }}
            >
              🏢 C1 Sala ({myTasks.filter(t => t.cyclePhase === 'C1').length})
            </button>
            <button
              onClick={() => setQtPhaseFilter('POST-C1')}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                background: qtPhaseFilter === 'POST-C1' ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
                color: qtPhaseFilter === 'POST-C1' ? '#ffffff' : 'var(--text-muted)',
                border: `1px solid ${qtPhaseFilter === 'POST-C1' ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`
              }}
            >
              🚀 POST-C1 / C2 ({myTasks.filter(t => t.cyclePhase === 'POST-C1' || t.cyclePhase === 'C2').length})
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {activeTasks.length === 0 ? (
          <p className="text-muted text-center" style={{ margin: '2rem 0' }}>No hay tareas para esta fase del ciclo operativo.</p>
        ) : (
          activeTasks.map(task => (
            <div key={task.id} className="glass-panel hover-glow" style={{ padding: '1.5rem', borderLeft: `4px solid ${getPriorityColor(task.priority)}`, opacity: task.completed ? 0.6 : 1, transition: 'all 0.3s' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', gap: '1rem' }}>
                  <input 
                    type="checkbox" 
                    checked={task.completed || task.status === 'Completada'}
                    onChange={() => handleStatusChange(task)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '3px' }}
                  />
                  <div>
                    <h3 className={task.completed ? 'text-muted' : 'text-white'} style={{ margin: '0 0 0.4rem 0', textDecoration: task.completed ? 'line-through' : 'none', fontSize: '1.05rem' }}>
                      {task.task || task.title}
                    </h3>

                    {/* FECHA Y HORA LÍMITE AUTOMÁTICA SO-AR */}
                    {(() => {
                      const effectiveDeadline = task.deadline || calculateAutomaticDeadline(task, currentCycle);
                      return (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                          <Clock size={13} color="var(--crear-gold)" />
                          <span style={{ color: 'var(--crear-gold)', fontWeight: 'bold' }}>
                            ⏰ Límite: {effectiveDeadline}
                          </span>
                          {!task.completed && (
                            <button 
                              onClick={() => handleSetDeadline(task)}
                              style={{ background: 'none', border: 'none', color: '#29abe2', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline', padding: '0 0.2rem', marginLeft: '0.3rem' }}
                            >
                              {task.deadline ? 'Modificar' : 'Ajustar'}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                    
                    {task.associatedGoal && (
                      <div style={{ background: 'rgba(41, 171, 226, 0.1)', border: '1px solid rgba(41, 171, 226, 0.3)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <Target size={14} className="text-blue" />
                        <span className="text-blue"><strong>Meta Asociada:</strong> {task.associatedGoal}</span>
                      </div>
                    )}

                    {(task.dependency && task.dependency !== 'Ninguna') && (
                      <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.3rem' }}>
                        ⚠ Dependencia: <strong>{task.dependency}</strong>
                      </div>
                    )}
                    {task.escalation && (
                      <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.2rem' }}>
                        ⇡ Escalamiento: <strong>{task.escalation}</strong>
                      </div>
                    )}

                    {/* COLABORADORES ACTIVOS DE LA TAREA */}
                    {task.collaboratorDetails && task.collaboratorDetails.length > 0 && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🤝 Colaborando:</span>
                        {task.collaboratorDetails.map(c => (
                          <span key={c.email} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', background: 'rgba(0, 210, 255, 0.15)', color: 'var(--crear-blue)', border: '1px solid rgba(0, 210, 255, 0.3)' }}>
                            @{c.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {(task.comments || task.evidenceUrl) && (
                      <div style={{ marginTop: '0.8rem', padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.85rem' }}>
                        {task.comments && <p className="text-muted" style={{ margin: '0 0 0.5rem 0' }}>💬 {task.comments}</p>}
                        {task.evidenceUrl && <a href={task.evidenceUrl} target="_blank" rel="noreferrer" className="text-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}><LinkIcon size={12}/> Evidencia Adjunta</a>}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', minWidth: '120px' }}>
                  {task.priority && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.2rem 0.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: getPriorityColor(task.priority) }}>
                      {task.priority}
                    </span>
                  )}
                  {task.progressPercentage !== undefined && (
                    <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                      Avance: {task.progressPercentage}%
                    </span>
                  )}
                </div>
              </div>

              {/* Botones de Acción */}
              {!task.completed && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', marginLeft: '36px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => { setSelectedTaskForCollab(task); setShowCollabModal(true); }}
                    style={{ background: 'rgba(0, 210, 255, 0.08)', border: '1px solid rgba(0, 210, 255, 0.35)', color: 'var(--crear-blue)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                    title="Mencionar e invitar a un compañero para colaborar en esta tarea"
                  >
                    <Users size={14} /> @Invitar Colaborador
                  </button>
                  <button onClick={() => handleSetDeadline(task)} style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)', color: 'var(--crear-gold)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <Clock size={14} /> Fecha/Hora Límite
                  </button>
                  <button onClick={() => handleAddComment(task)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <Edit3 size={14} /> Notas
                  </button>
                  <button onClick={() => handleAddEvidence(task)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <LinkIcon size={14} /> Evidencia
                  </button>
                  <button onClick={() => handleProgressChange(task)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    % Avance
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <TaskAssignmentModal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} />
      
      {/* MODAL DE COLABORACIÓN / MENCIÓN */}
      <TaskCollaborationModal
        isOpen={showCollabModal}
        onClose={() => setShowCollabModal(false)}
        task={selectedTaskForCollab}
        onSendInvitation={inviteCollaborator}
      />
    </div>
  );
}

```

---

### 📄 Archivo: `src/pages/GerenteDashboard.jsx`

```javascript
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useChecklist } from '../context/ChecklistContext';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useUI } from '../context/UIContext';
import { useNavigate } from 'react-router-dom';
import { Target, AlertTriangle, Users, PlusCircle, Activity, CheckCircle, Building, MessageSquare, Mail, ExternalLink, ArrowUpRight, Clock, ShieldAlert, ChevronRight, CheckSquare } from 'lucide-react';
import { usersData, normalizeRole } from '../data/usersData';
import TaskAssignmentModal from '../components/TaskAssignmentModal';
import VenueConfigModal from '../components/VenueConfigModal';

export default function GerenteDashboard() {
  const { currentUser } = useAuth();
  const { currentStage } = useCycles();
  const { tasks, initializeFirestore, getProgressByRole } = useChecklist();
  const { showToast } = useUI();
  const navigate = useNavigate();

  const [dailyGoals, setDailyGoals] = useState([]);
  const [trainingGoals, setTrainingGoals] = useState([]);
  const [cycleGoals, setCycleGoals] = useState([]);

  useEffect(() => {
    if (currentUser?.appRole !== 'gerente') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const unsubscribeDaily = onSnapshot(query(collection(db, 'goals'), where('scope', '==', 'DIARIA')), (snapshot) => {
       setDailyGoals(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
    });
    const unsubscribeTraining = onSnapshot(query(collection(db, 'goals'), where('scope', '==', 'ENTRENAMIENTO')), (snapshot) => {
       setTrainingGoals(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
    });
    const unsubscribeCycle = onSnapshot(query(collection(db, 'goals'), where('scope', '==', 'CICLO')), (snapshot) => {
       setCycleGoals(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => {
      unsubscribeDaily();
      unsubscribeTraining();
      unsubscribeCycle();
    };
  }, []);

  // --- DERIVED DATA ---
  
  // 1. DÓNDE ESTAMOS
  const currentTraining = currentStage;
  const cycleFlow = ['GATE 1', 'PRE-C1', 'C1', 'POST-C1', 'C2', 'PRE-MJ', 'MJ', 'POST-MJ'];
  const currentIndex = cycleFlow.indexOf(currentStage);
  const nextTraining = currentIndex !== -1 && currentIndex < cycleFlow.length - 1 ? cycleFlow[currentIndex + 1] : 'Próximo Ciclo';

  // 2. QUÉ ESTÁ EN RIESGO (Radar)
  // Críticas / Vencidas / Rojas
  const criticalTasks = tasks.filter(t => !t.completed && (t.priority === 'Crítica' || t.isCritical));
  // Proximas (Naranjas o sin completar)
  const upcomingTasks = tasks.filter(t => !t.completed && !t.isCritical && t.priority !== 'Crítica');

  // 3. QUÉ DEBO HACER HOY (Acciones Gerente)
  const myPendingTasks = tasks.filter(t => t.role === 'gerente' && !t.completed && (t.cyclePhase === currentStage || t.isCritical));
  const topActions = myPendingTasks.slice(0, 5); // Limit to top 5 actions

  // Helper para resolver los responsables
  const getResponsiblesForTask = (task) => {
    if (task.assignedToEmail) {
      const u = usersData.find(usr => usr.email.toLowerCase() === task.assignedToEmail.toLowerCase());
      if (u) return [u];
      return [{ name: task.assignedToEmail.split('@')[0], email: task.assignedToEmail, role: task.role, sede: task.sede || currentUser?.sede }];
    }
    if (task.collaboratorDetails && task.collaboratorDetails.length > 0) return task.collaboratorDetails;
    
    const taskRoleNorm = normalizeRole(task.role);
    const targetSede = (task.sede || currentUser?.sede || '').toLowerCase().trim();

    const sedeMatches = usersData.filter(u => normalizeRole(u.role) === taskRoleNorm && (!u.sede || !targetSede || u.sede.toLowerCase().trim() === targetSede));
    if (sedeMatches.length > 0) return sedeMatches;

    const roleMatches = usersData.filter(u => normalizeRole(u.role) === taskRoleNorm);
    if (roleMatches.length > 0) return roleMatches.slice(0, 2);

    return [{ name: `Resp: ${task.role.replace(/_/g, ' ')}`, email: '', role: task.role, sede: currentUser?.sede }];
  };

  const handleOpenGoogleChat = (email) => {
    if (!email) window.open('https://chat.google.com/', '_blank');
    else window.open(`https://mail.google.com/chat/u/0/#chat/dm/${email}`, '_blank');
  };

  const handleSendEmail = (email, taskTitle, taskRole) => {
    const subject = `⚠️ URGENTE SO-AR: ${taskTitle}`;
    const body = `Hola,\n\nRequiero actualización urgente sobre:\n📌 TAREA: ${taskTitle}\n\nPor favor reportar estado.\n\nGerencia Sede`;
    window.location.href = `mailto:${email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gold" style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-0.5px' }}>
            Dashboard "30 Segundos"
          </h1>
          <p className="text-muted" style={{ margin: '0.5rem 0 0', textTransform: 'uppercase', fontWeight: '600' }}>
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => setShowVenueModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building size={16} /> Hoteles Sede
          </button>
          <button className="btn-primary" onClick={() => setShowTaskForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={16} /> Asignar Meta
          </button>
          {currentUser?.isSuperAdmin && (
            <button className="btn-primary" onClick={() => navigate('/superadmin')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6, #29abe2)', color: 'white', border: 'none' }}>
              🌐 Centro de Mando
            </button>
          )}
          <button className="btn-secondary" onClick={() => navigate('/')}>Volver</button>
        </div>
      </div>

      <TaskAssignmentModal isOpen={showTaskForm} onClose={() => setShowTaskForm(false)} />
      <VenueConfigModal isOpen={showVenueModal} onClose={() => setShowVenueModal(false)} />

      {/* CUADRANTES EJECUTIVOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* CUADRANTE 1: ¿DÓNDE ESTAMOS? */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05, transform: 'scale(1.5)' }}>
            <Target size={150} />
          </div>
          <h3 style={{ color: 'var(--crear-blue)', marginTop: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} /> 1. ¿Dónde Estamos?
          </h3>
          
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>CICLO ACTIVO / FASE ACTUAL</p>
            <h2 style={{ margin: '0.5rem 0', fontSize: '2.5rem', fontWeight: '900', color: 'var(--text-heading)' }}>
              {currentTraining}
            </h2>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Próximo Hito Operativo</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <ChevronRight size={18} color="var(--crear-gold)" />
                <span style={{ color: 'var(--text-heading)', fontWeight: 'bold', fontSize: '1.1rem' }}>{nextTraining}</span>
              </div>
            </div>
          </div>

          {(dailyGoals.length > 0 || trainingGoals.length > 0 || cycleGoals.length > 0) && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* METAS DEL CICLO */}
              {cycleGoals.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.75rem', color: 'var(--crear-gold)', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={14} /> Metas Globales de Ciclo
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {cycleGoals.map(g => (
                      <div key={g.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid var(--crear-gold)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-heading)' }}>{g.title}</span>
                          <span style={{ fontWeight: 'bold', color: g.progress >= 100 ? '#22c55e' : 'var(--crear-gold)' }}>{g.currentValue} / {g.targetValue}</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(g.progress, 100)}%`, background: g.progress >= 100 ? '#22c55e' : 'var(--crear-gold)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* METAS DE ENTRENAMIENTO */}
              {trainingGoals.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.75rem', color: 'var(--crear-cyan)', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={14} /> Metas de Entrenamiento
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {trainingGoals.filter(g => g.cyclePhase === currentStage || !g.cyclePhase || g.cyclePhase.includes('MJ')).map(g => (
                      <div key={g.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid var(--crear-cyan)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-heading)' }}>{g.title}</span>
                          <span style={{ fontWeight: 'bold', color: g.progress >= 100 ? '#22c55e' : 'var(--crear-cyan)' }}>{g.currentValue} / {g.targetValue}</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(g.progress, 100)}%`, background: g.progress >= 100 ? '#22c55e' : 'var(--crear-cyan)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* METAS DIARIAS */}
              {dailyGoals.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.75rem', color: '#10b981', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={14} /> Metas Diarias Activas
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {dailyGoals.map(g => (
                      <div key={g.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-heading)' }}>{g.title}</span>
                          <span style={{ fontWeight: 'bold', color: g.progress >= 100 ? '#22c55e' : '#10b981' }}>{g.currentValue} / {g.targetValue}</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(g.progress, 100)}%`, background: g.progress >= 100 ? '#22c55e' : '#10b981' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CUADRANTE 2: ¿QUÉ DEBO HACER HOY? (ACCIONES DEL GERENTE) */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: 'var(--crear-gold)', marginTop: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,215,0,0.2)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare size={16} /> 2. ¿Qué debo hacer hoy? (Top 5)
          </h3>
          
          {topActions.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--color-success)', gap: '0.5rem', minHeight: '150px' }}>
              <CheckCircle size={32} />
              <p style={{ margin: 0, fontWeight: 'bold' }}>Día Libre de Tareas Críticas</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', flex: 1 }}>
              {topActions.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', borderLeft: t.isCritical ? '3px solid #ef4444' : '3px solid var(--crear-gold)' }}>
                  <div style={{ marginTop: '2px' }}>
                    {t.isCritical ? <ShieldAlert size={16} color="#ef4444" /> : <Clock size={16} color="var(--crear-gold)" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, color: 'var(--text-heading)', fontSize: '0.95rem', fontWeight: '500', lineHeight: '1.3' }}>{t.task || t.title}</p>
                  </div>
                  <button onClick={() => navigate(`/checklist/gerente`)} style={{ background: 'none', border: 'none', color: 'var(--crear-blue)', cursor: 'pointer', padding: '0.2rem' }}>
                    <ExternalLink size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* CUADRANTE 3: ¿QUÉ ESTÁ EN RIESGO? */}
        <div className="glass-panel" style={{ padding: '1.5rem', border: criticalTasks.length > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ color: '#ef4444', marginTop: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(239,68,68,0.2)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} /> 3. ¿Qué está en Riesgo?
            </span>
            <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              {criticalTasks.length}
            </span>
          </h3>

          {criticalTasks.length === 0 ? (
            <p style={{ color: 'var(--color-success)', margin: '1.5rem 0 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={18} /> Ningún Gate ni Tarea Crítica en riesgo.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              {criticalTasks.map(t => {
                const responsibles = getResponsiblesForTask(t);
                const taskTitle = t.task || t.title;

                return (
                  <div key={t.id} style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-heading)', fontWeight: 'bold', fontSize: '0.95rem', lineHeight: '1.3' }}>{taskTitle}</div>
                        <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.4rem', fontWeight: '600' }}>
                          Responsabilidad: {t.role?.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        {t.dependency && t.dependency !== 'Ninguna' && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            <span style={{ color: '#f59e0b' }}>⚠ Dependencia:</span> {t.dependency}
                          </div>
                        )}
                        {t.escalation && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            <span style={{ color: '#ef4444' }}>⇡ Escalamiento:</span> {t.escalation}
                          </div>
                        )}
                      </div>
                      <button onClick={() => navigate(`/checklist/${t.role}?filter=criticas`)} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Ver <ArrowUpRight size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                      {responsibles.map((resp, idx) => (
                        <div key={resp.email || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--border-subtle)', padding: '0.5rem', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-heading)', fontWeight: '500' }}>{resp.name}</span>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleOpenGoogleChat(resp.email)} style={{ background: 'transparent', border: '1px solid rgba(0, 210, 255, 0.3)', color: 'var(--crear-blue)', padding: '0.3rem 0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MessageSquare size={14} /> Chat
                            </button>
                            <button onClick={() => handleSendEmail(resp.email, taskTitle, t.role)} style={{ background: 'transparent', border: '1px solid rgba(255, 183, 3, 0.3)', color: 'var(--crear-gold)', padding: '0.3rem 0.5rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Mail size={14} /> Correo
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CUADRANTE 4: ¿QUÉ ESTÁ DELEGADO? (ACCOUNTABILITY) */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--text-muted)', marginTop: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={16} /> 4. ¿Qué está delegado? (Progreso)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
            {[
              { id: 'coord_c1', name: 'Coordinación C1 / C2' },
              { id: 'coord_maestria', name: 'Coordinación Maestría' },
              { id: 'capitan', name: 'Capitán' },
              { id: 'qt', name: 'Equipo de Apoyo' }
            ].map(role => {
              const progress = getProgressByRole(role.id);
              let barColor = 'var(--crear-gold)';
              if (progress === 100) barColor = 'var(--color-success)';
              else if (progress < 30) barColor = '#ef4444';

              return (
                <div key={role.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                    <span style={{ color: 'var(--text-heading)', fontWeight: '600' }}>{role.name}</span>
                    <span style={{ color: barColor, fontWeight: 'bold' }}>{progress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: barColor, transition: 'width 0.5s ease-out' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botón de Reinicio Rápido */}
          <div style={{ marginTop: '2.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '1.5rem', textAlign: 'center' }}>
            <button onClick={() => initializeFirestore(currentUser)} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
              ⚠ Reiniciar Ciclo / Vaciar Tareas
            </button>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Utilizar solo al finalizar el ciclo MJ</p>
          </div>
        </div>

      </div>
    </div>
  );
}

```

---

### 📄 Archivo: `src/pages/GoalsBoard.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where, orderBy, writeBatch, runTransaction } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import { ArrowLeft, Target, Settings, GitMerge, Users, UserPlus, Award, CheckCircle2, Plus, Edit3 } from 'lucide-react';
import GoalDivisionModal from '../components/GoalDivisionModal';

export default function GoalsBoard() {
  const { currentUser } = useAuth();
  const { currentCycle } = useCycles();
  const { showToast, showPrompt } = useUI();
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de Asignación / División de Metas
  const [selectedGoalForAssignment, setSelectedGoalForAssignment] = useState(null);
  const [showDivisionModal, setShowDivisionModal] = useState(false);

  // Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyData, setDailyData] = useState({ parentId: '', title: '', kpi: '', targetValue: 1 });
  
  const stages = [
    { id: 'C1', name: 'Capítulo 1' },
    { id: 'C2', name: 'Capítulo 2' },
    { id: 'MJ_CREACION', name: 'MJ - Creación' },
    { id: 'MJ_RELACION', name: 'MJ - Relación' },
    { id: 'MJ_GRATITUD', name: 'MJ - Gratitud' },
    { id: 'MJ_VIAJE', name: 'MJ - El Viaje' }
  ];

  // Estructura para guardar las metas del wizard
  const [wizardData, setWizardData] = useState(
    stages.reduce((acc, stage) => {
      acc[stage.id] = { px: '', aliados: '', managers: '' };
      return acc;
    }, {})
  );

  useEffect(() => {
    const goalsRef = collection(db, 'goals');
    let q;
    
    // Si no es SuperAdmin ni Dirección, filtrar solo las metas de su sede
    if (!currentUser.isSuperAdmin && !currentUser.isDireccion && currentUser.sede) {
      q = query(
        goalsRef, 
        where('sede', '==', currentUser.sede.trim()),
        orderBy('createdAt', 'desc')
      );
    } else {
      // SuperAdmin o Dirección ven todas las metas
      q = query(goalsRef, orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedGoals = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setGoals(loadedGoals);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleWizardChange = (stageId, field, value) => {
    setWizardData(prev => ({
      ...prev,
      [stageId]: { ...prev[stageId], [field]: value }
    }));
  };

  const handleGenerateGoals = async () => {
    try {
      const batch = writeBatch(db);
      const cycleGoalRef = doc(collection(db, 'goals'));
      
      // 1. Crear Meta Maestra del Ciclo
      batch.set(cycleGoalRef, {
        title: `Meta Global del Ciclo ${currentCycle?.name || ''}`,
        kpi: 'Cumplimiento General (%)',
        progress: 0,
        targetValue: 100,
        currentValue: 0,
        scope: 'CICLO',
        parentId: null,
        ownerId: currentUser.uid,
        ownerName: currentUser.displayName,
        sede: currentUser.sede || '',
        createdAt: new Date().toISOString()
      });

      // 2. Crear las metas de ENTRENAMIENTO basadas en el Wizard
      for (const stage of stages) {
        const data = wizardData[stage.id];
        const phaseCode = stage.id.startsWith('MJ') ? 'MJ' : stage.id;
        
        if (data.px && Number(data.px) > 0) {
          batch.set(doc(collection(db, 'goals')), {
             title: `Sentados (Px) - ${stage.name}`,
             kpi: 'Cantidad de Px',
             targetValue: Number(data.px),
             currentValue: 0,
             progress: 0,
             scope: 'ENTRENAMIENTO',
             cyclePhase: phaseCode,
             parentId: cycleGoalRef.id,
             stage: stage.id,
             ownerId: currentUser.uid,
             sede: currentUser.sede || '',
             assignedCoordinators: [],
             createdAt: new Date().toISOString()
          });
        }
        if (data.aliados && Number(data.aliados) > 0) {
          batch.set(doc(collection(db, 'goals')), {
             title: `Aliados - ${stage.name}`,
             kpi: 'Cantidad de Aliados',
             targetValue: Number(data.aliados),
             currentValue: 0,
             progress: 0,
             scope: 'ENTRENAMIENTO',
             cyclePhase: phaseCode,
             parentId: cycleGoalRef.id,
             stage: stage.id,
             ownerId: currentUser.uid,
             sede: currentUser.sede || '',
             assignedCoordinators: [],
             createdAt: new Date().toISOString()
          });
        }
        if (data.managers && Number(data.managers) > 0) {
          batch.set(doc(collection(db, 'goals')), {
             title: `Managers - ${stage.name}`,
             kpi: 'Cantidad de Managers',
             targetValue: Number(data.managers),
             currentValue: 0,
             progress: 0,
             scope: 'ENTRENAMIENTO',
             cyclePhase: phaseCode,
             parentId: cycleGoalRef.id,
             stage: stage.id,
             ownerId: currentUser.uid,
             sede: currentUser.sede || '',
             assignedCoordinators: [],
             createdAt: new Date().toISOString()
          });
        }
      }

      await batch.commit();
      showToast('Metas de Ciclo generadas correctamente.', 'success');
      setShowWizard(false);
    } catch (e) {
      console.error(e);
      showToast('Error generando metas.', 'error');
    }
  };

  const handleCreateDailyGoal = async (e) => {
    e.preventDefault();
    if (!dailyData.parentId || !dailyData.title || dailyData.targetValue <= 0) {
      showToast('Por favor completa todos los campos correctamente.', 'error');
      return;
    }
    
    try {
      const parentGoal = goals.find(g => g.id === dailyData.parentId);
      await addDoc(collection(db, 'goals'), {
        title: dailyData.title,
        kpi: dailyData.kpi || parentGoal?.kpi || 'Unidades',
        targetValue: Number(dailyData.targetValue),
        currentValue: 0,
        progress: 0,
        scope: 'DIARIA',
        cyclePhase: parentGoal?.cyclePhase || 'DIA',
        parentId: dailyData.parentId,
        ownerId: currentUser.uid,
        sede: currentUser.sede || '',
        assignedCoordinators: [],
        createdAt: new Date().toISOString()
      });
      showToast('Meta Diaria creada exitosamente.', 'success');
      setShowDailyModal(false);
      setDailyData({ parentId: '', title: '', kpi: '', targetValue: 1 });
    } catch (error) {
      console.error(error);
      showToast('Error creando Meta Diaria', 'error');
    }
  };

  // GUARDAR ASIGNACIÓN Y DIVISIÓN DE CUOTAS A COORDINADORAS
  const handleSaveAssignment = async (goalId, assignedList) => {
    try {
      const goalRef = doc(db, 'goals', goalId);
      const totalReported = assignedList.reduce((sum, item) => sum + (Number(item.currentQuota) || 0), 0);
      const targetVal = Number(selectedGoalForAssignment?.targetValue || 1);
      const newProgress = Math.min(100, Math.round((totalReported / targetVal) * 100));

      await updateDoc(goalRef, {
        assignedCoordinators: assignedList,
        isAssigned: true,
        currentValue: totalReported,
        progress: newProgress,
        updatedAt: new Date().toISOString()
      });

      // Roll-up hacia metas superiores
      await performRollUp(goalId, newProgress);

      showToast(`¡Meta dividida y asignada con éxito a ${assignedList.length} coordinadoras!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar la asignación de meta.', 'error');
    }
  };

  // ACTUALIZAR EL AVANCE INDIVIDUAL DE UNA COORDINADORA
  const handleUpdateCoordinatorProgress = async (goal, coordEmail, currentQuota, targetQuota, coordName) => {
    const newVal = await showPrompt(
      `📊 Reportar Avance de ${coordName}:\nCuota Asignada: ${targetQuota}\nIngresa el nuevo total alcanzado:`,
      currentQuota || 0
    );

    if (newVal !== null && newVal !== '' && !isNaN(newVal)) {
      try {
        const numericVal = Math.max(0, Number(newVal));
        const updatedCoordinators = (goal.assignedCoordinators || []).map(c => {
          if (c.email === coordEmail) {
            return { ...c, currentQuota: numericVal };
          }
          return c;
        });

        // Sumar avances de todas las coordinadoras
        const totalSum = updatedCoordinators.reduce((sum, c) => sum + (Number(c.currentQuota) || 0), 0);
        const targetVal = Number(goal.targetValue || 1);
        const newProgress = Math.min(100, Math.round((totalSum / targetVal) * 100));

        const goalRef = doc(db, 'goals', goal.id);
        await updateDoc(goalRef, {
          assignedCoordinators: updatedCoordinators,
          currentValue: totalSum,
          progress: newProgress,
          updatedAt: new Date().toISOString()
        });

        await performRollUp(goal.id, newProgress);
        showToast(`Avance de ${coordName} actualizado a ${numericVal}/${targetQuota} (Total acumulado: ${totalSum}/${targetVal})`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Error al actualizar el avance.', 'error');
      }
    }
  };

  const performRollUp = async (goalId, newProgress) => {
    try {
      const currentGoal = goals.find(g => g.id === goalId);
      if (currentGoal && currentGoal.parentId) {
        const siblings = goals.filter(g => g.parentId === currentGoal.parentId && g.id !== goalId);
        let totalProgress = newProgress;
        siblings.forEach(s => totalProgress += (s.progress || 0));
        const avgProgress = Math.round(totalProgress / (siblings.length + 1));
        
        const parentRef = doc(db, 'goals', currentGoal.parentId);
        await updateDoc(parentRef, { 
          progress: avgProgress,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error("Rollup error:", e);
    }
  };

  const updateProgressManual = async (id, currentVal, targetVal) => {
    const newVal = await showPrompt(`Ingresa nuevo valor acumulado global (Meta: ${targetVal}):`, currentVal);
    if (newVal !== null && newVal !== '' && !isNaN(newVal)) {
      try {
        const numericVal = Number(newVal);
        const newProgress = Math.min(100, Math.round((numericVal / targetVal) * 100));
        
        const goalRef = doc(db, 'goals', id);
        await updateDoc(goalRef, { 
          currentValue: numericVal,
          progress: newProgress,
          updatedAt: new Date().toISOString()
        });

        await performRollUp(id, newProgress);
        showToast('Avance global actualizado', 'success');
      } catch (e) {
        console.error("Error actualizando meta:", e);
        showToast('Error actualizando meta', 'error');
      }
    }
  };

  const openAssignmentModal = (goal) => {
    setSelectedGoalForAssignment(goal);
    setShowDivisionModal(true);
  };

  const renderGoal = (goal) => {
    const parentGoal = goals.find(g => g.id === goal.parentId);
    const isAssigned = goal.assignedCoordinators && Array.isArray(goal.assignedCoordinators) && goal.assignedCoordinators.length > 0;
    
    return (
      <div key={goal.id} className="glass-panel" style={{ padding: '1.5rem', transition: 'all 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ 
                fontSize: '0.7rem', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '4px',
                background: goal.scope === 'CICLO' ? 'var(--crear-gold)' : goal.scope === 'ENTRENAMIENTO' ? 'var(--crear-blue)' : 'var(--color-success)',
                color: '#000', letterSpacing: '1px'
              }}>
                {goal.scope}
              </span>
              
              {isAssigned && (
                <span style={{
                  fontSize: '0.7rem', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '9999px',
                  background: 'rgba(0, 210, 255, 0.15)', color: 'var(--crear-blue)', border: '1px solid rgba(0, 210, 255, 0.3)',
                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                }}>
                  <Users size={12} /> Dividido en {goal.assignedCoordinators.length} Coordinadoras
                </span>
              )}

              {parentGoal && (
                <span className="text-muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <GitMerge size={12} /> Aporta a: {parentGoal.title}
                </span>
              )}
            </div>

            <h3 className="text-main" style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem' }}>{goal.title}</h3>
            
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              {goal.targetValue ? (
                <>
                  Avance Acumulado: <strong style={{ color: 'var(--crear-gold)', fontSize: '1.05rem' }}>{goal.currentValue || 0}</strong> de <strong>{goal.targetValue}</strong> {goal.kpi || ''}
                </>
              ) : `KPI: ${goal.kpi}`}
            </p>
          </div>

          {/* BOTONES DE ACCIÓN PARA GERENTES Y COORDINADORAS */}
          {goal.targetValue && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                type="button"
                onClick={() => openAssignmentModal(goal)}
                className="btn-neon-action"
                style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                title="Dividir la meta equitativamente entre las coordinadoras de la sede"
              >
                <Users size={14} />
                <span>{isAssigned ? 'Modificar Reparto' : '👥 Asignar / Dividir Meta'}</span>
              </button>

              <button 
                type="button"
                className="btn-secondary" 
                onClick={() => updateProgressManual(goal.id, goal.currentValue, goal.targetValue)} 
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
              >
                Ajuste Manual
              </button>
            </div>
          )}
        </div>
        
        {/* BARRA DE PROGRESO GLOBAL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: isAssigned ? '1.25rem' : '0' }}>
          <div style={{ flex: 1, height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: `${Math.min(goal.progress, 100)}%`, 
              background: goal.progress >= 100 
                ? 'linear-gradient(90deg, #22c55e, #16a34a)' 
                : 'linear-gradient(90deg, #00d2ff, #0284c7)', 
              transition: 'width 0.4s ease' 
            }} />
          </div>
          <span className="text-gold" style={{ fontWeight: 'bold', minWidth: '45px', fontSize: '1.05rem' }}>
            {goal.progress}%
          </span>
        </div>

        {/* DESGLOSE INDIVIDUAL DE COORDINADORAS ASIGNADAS CON REPORTE EN 1 CLIC */}
        {isAssigned && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            marginTop: '0.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📌 Cuotas Individuales & Reporte de Avance en Tiempo Real:
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--crear-blue)' }}>
                Suma total: {goal.currentValue || 0} / {goal.targetValue}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {goal.assignedCoordinators.map(coord => {
                const current = Number(coord.currentQuota || 0);
                const target = Number(coord.targetQuota || 1);
                const pct = Math.min(100, Math.round((current / target) * 100));
                const isC1 = coord.role === 'coord_c1';

                return (
                  <div
                    key={coord.email}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-heading)' }}>
                          {coord.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: isC1 ? 'var(--crear-blue)' : 'var(--role-mj)', fontWeight: 'bold' }}>
                          {isC1 ? 'Coordinadora C1/C2' : 'Coordinadora CMJ'} ({coord.sede || 'Sede'})
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpdateCoordinatorProgress(goal, coord.email, current, target, coord.name)}
                        className="btn-secondary"
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.6rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          background: 'rgba(0, 210, 255, 0.1)',
                          borderColor: 'var(--crear-blue)',
                          color: 'var(--crear-blue)'
                        }}
                      >
                        <Edit3 size={11} /> Reportar
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      <span className="text-muted">Avance:</span>
                      <span>
                        <strong style={{ color: current >= target ? '#22c55e' : 'var(--crear-gold)' }}>{current}</strong> / {target} ({pct}%)
                      </span>
                    </div>

                    {/* Barra individual */}
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: pct >= 100 ? '#22c55e' : 'var(--crear-blue)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Target size={32} className="text-gold" />
          <div>
            <h1 className="text-gold uppercase" style={{ margin: 0, fontSize: '1.8rem' }}>Gestión de Metas</h1>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              Seguimiento, asignación equitativa a coordinadoras y acumulación operativa
            </p>
          </div>
        </div>
        {currentUser?.appRole === 'gerente' && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-secondary" onClick={() => setShowDailyModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem' }}>
              <Plus size={18} /> Meta Diaria
            </button>
            <button className="btn-primary" onClick={() => setShowWizard(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem' }}>
              <Settings size={18} /> Setup de Ciclo
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {loading ? <p className="text-muted text-center">Cargando metas...</p> : (
          goals.length > 0 ? goals.map(renderGoal) : <p className="text-muted" style={{ textAlign: 'center' }}>No hay metas configuradas. Inicia el Setup de Ciclo.</p>
        )}
      </div>

      {/* MODAL PARA DIVIDIR Y ASIGNAR METAS ENTRE COORDINADORAS */}
      <GoalDivisionModal
        isOpen={showDivisionModal}
        onClose={() => setShowDivisionModal(false)}
        goal={selectedGoalForAssignment}
        onSaveAssignment={handleSaveAssignment}
      />

      {/* MODAL WIZARD SETUP DE CICLO */}
      {showWizard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className="text-gold" style={{ marginTop: 0 }}>Wizard: Setup de Ciclo</h2>
            <p className="text-muted">Define las metas de Entrenamiento para cada fase.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
              {stages.map(stage => (
                <div key={stage.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: 'var(--crear-cyan)' }}>{stage.name}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Px</label>
                      <input type="number" min="0" className="form-input" value={wizardData[stage.id].px} onChange={e => handleWizardChange(stage.id, 'px', e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aliados</label>
                      <input type="number" min="0" className="form-input" value={wizardData[stage.id].aliados} onChange={e => handleWizardChange(stage.id, 'aliados', e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Managers</label>
                      <input type="number" min="0" className="form-input" value={wizardData[stage.id].managers} onChange={e => handleWizardChange(stage.id, 'managers', e.target.value)} placeholder="0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn-secondary" onClick={() => setShowWizard(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleGenerateGoals}>Generar Metas</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL META DIARIA */}
      {showDailyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h2 className="text-gold" style={{ marginTop: 0 }}>Crear Meta Diaria</h2>
            <form onSubmit={handleCreateDailyGoal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Meta de Entrenamiento (Padre)</label>
                <select className="form-select" value={dailyData.parentId} onChange={e => setDailyData({...dailyData, parentId: e.target.value})} required style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-subtle)' }}>
                  <option value="">Selecciona una meta...</option>
                  {goals.filter(g => g.scope === 'ENTRENAMIENTO').map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Título de la Meta Diaria</label>
                <input type="text" className="form-input" value={dailyData.title} onChange={e => setDailyData({...dailyData, title: e.target.value})} placeholder="Ej. Cerrar 5 Px hoy" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Objetivo (Número)</label>
                  <input type="number" min="1" className="form-input" value={dailyData.targetValue} onChange={e => setDailyData({...dailyData, targetValue: e.target.value})} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>KPI (Opcional)</label>
                  <input type="text" className="form-input" value={dailyData.kpi} onChange={e => setDailyData({...dailyData, kpi: e.target.value})} placeholder="Ej. Px" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowDailyModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Crear Meta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

```

---

### 📄 Archivo: `src/pages/Home.jsx`

```javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useChecklist } from '../context/ChecklistContext';
import { useUI } from '../context/UIContext';
import { useNotifications } from '../context/NotificationContext';
import { LogOut, Clock, Calendar as CalendarIcon, MapPin, CheckCircle2, AlertCircle, Circle, RefreshCw, CalendarPlus, Bell, Users, AtSign } from 'lucide-react';
import { getFlagForSede } from '../utils/flags';
import { createGoogleEvent } from '../services/googleSync';
import { calculateAutomaticDeadline } from '../utils/soarDates';
import TaskAssignmentModal from '../components/TaskAssignmentModal';
import ThemeSelector from '../components/ThemeSelector';
import VenueConfigModal from '../components/VenueConfigModal';
import { getVenueForTraining } from '../data/venuesData';
import { ROLE_DISPLAY_NAMES } from '../data/usersData';

export default function Home() {
  const { currentUser, logout } = useAuth();
  const { currentCycle, currentStage } = useCycles();
  const { tasks: allTasks, loading: loadingTasks, syncTasksToGoogle, acceptCollaboration, rejectCollaboration } = useChecklist();
  const { showToast } = useUI();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  // Reloj local
  const [time, setTime] = useState(new Date());
  
  // Eventos locales
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeEventTab, setActiveEventTab] = useState('locales');
  const [timeFilter, setTimeFilter] = useState('futuros'); // 'todos', 'pasados', 'hoy', 'futuros'
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);

  const handleAddEventToGoogle = async (ev, startDate, endDate) => {
    const token = sessionStorage.getItem('googleAccessToken');
    const hotelLocation = getVenueForTraining(ev.sede || ev.sedeTag || currentUser?.sede, ev.nombre || ev.name, ev.lugar, ev.direccion);
    
    const result = await createGoogleEvent({
      summary: `CREAR: ${ev.nombre || ev.name}`,
      location: hotelLocation,
      description: `Entrenador: ${ev.trainer || ev.equipo || 'TBA'}\nLugar / Hotel Oficial: ${hotelLocation}\n${ev.detalles || ''}`,
      start: startDate,
      end: endDate
    }, token);

    if (result.success) {
      if (result.via === 'api') {
        showToast(`¡"${ev.nombre || ev.name}" añadido a tu Google Calendar exitosamente!`, "success");
      } else {
        showToast(`Abriendo Google Calendar para agendar "${ev.nombre || ev.name}"...`, "info");
      }
    } else {
      showToast(result.error || "Hubo un error al abrir el calendario.", "error");
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const API_URL = 'https://script.google.com/macros/s/AKfycbxSZFhddMYyspZpkW-qPHEi8hycLGfnhFeCPSYc4VbckWIeiiZAbxyJY71XRb2-Ya4U/exec?action=getEventos';
        const res = await fetch(API_URL);
        const json = await res.json();
        const data = json.data || json;
        
        if (Array.isArray(data)) {
           // Ordenamos todos los eventos por fecha
           const allEvents = data.filter(ev => ev.fecha_inicio || ev.start).sort((a, b) => new Date(a.fecha_inicio || a.start) - new Date(b.fecha_inicio || b.start));
           
           // Extraemos el mapeo de sedes para el usuario actual
           const sedeMap = {
             'cuenca': 'CUE',
             'lima': 'LIM',
             'med': 'MED',
             'méxico': 'MEX',
             'mexico': 'MEX',
             'uio': 'UIO',
             'uio ': 'UIO', // por si hay espacios
             'guayaquil': 'GYE'
           };
           
           const userSede = currentUser?.sede?.toLowerCase().trim();
           const eventSedeCode = userSede ? sedeMap[userSede] : null;

           // Guardamos todos los eventos
           setEvents(allEvents);
        }
      } catch (e) {
        console.error("Error fetching calendar", e);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchEvents();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gold" style={{ margin: 0, fontSize: '2rem' }}>
            {time.getHours() < 12 ? 'Buenos días' : time.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'}, {currentUser?.displayName || 'Equipo'}
          </h1>
          <p className="text-muted" style={{ margin: '0.5rem 0 0', textTransform: 'uppercase' }}>
            {currentCycle ? `${currentCycle.name} • ETAPA ACTUAL: ${currentStage}` : 'CARGANDO CICLO...'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <Clock size={16} className="text-blue" />
            <span className="text-white" style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-muted" style={{ marginLeft: '0.5rem' }}>
              {time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{currentUser?.name || currentUser?.displayName || 'Usuario'}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--crear-gold)', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {currentUser?.isSuperAdmin 
                ? `Super Admin | Gerente de Lima ${getFlagForSede('Lima')}` 
                : `${ROLE_DISPLAY_NAMES[currentUser?.appRole] || currentUser?.appRole?.replace(/_/g, ' ') || 'Miembro'} ${getFlagForSede(currentUser?.sede)}`}
            </span>
            {currentUser?.roles && currentUser.roles.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem', marginTop: '3px' }}>
                <select
                  value={currentUser.activeRole || currentUser.appRole}
                  onChange={(e) => currentUser.switchRole(e.target.value)}
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 183, 3, 0.15)',
                    border: '1px solid var(--crear-gold)',
                    color: 'var(--text-heading)',
                    fontSize: '0.72rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                  title="Cambiar tu rol activo"
                >
                  {currentUser.roles.map(r => (
                    <option key={r} value={r} style={{ background: '#0d152d', color: '#ffffff' }}>
                      🎭 {ROLE_DISPLAY_NAMES[r] || r.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {currentUser?.photoURL ? (
            <img src={currentUser.photoURL} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--crear-gold)' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--crear-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2px solid var(--crear-gold)' }}>
              {currentUser?.displayName ? currentUser.displayName.charAt(0) : 'U'}
            </div>
          )}
          
          {/* SELECTOR DE TEMA DÍA / NOCHE / AUTO */}
          <div style={{ marginLeft: '0.25rem', marginRight: '0.25rem' }}>
            <ThemeSelector />
          </div>

          <div style={{ position: 'relative', cursor: 'pointer', marginLeft: '0.25rem', marginRight: '0.25rem' }} onClick={markAllAsRead}>
            <Bell size={22} className="text-white" />
            {unreadCount > 0 && (
              <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--color-error)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                {unreadCount}
              </div>
            )}
          </div>
          
          <button 
            type="button"
            onClick={() => setShowTaskModal(true)} 
            className="btn-neon-action"
            style={{ marginLeft: '0.25rem' }}
          >
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
            <span>TAREA</span>
          </button>
          
          {currentUser?.isGerente && (
            <button onClick={() => navigate('/gerente')} className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '0.25rem', background: 'var(--crear-gold)', color: 'black' }}>
               SO-AR Gerencial
            </button>
          )}
          {currentUser?.isSuperAdmin && (
            <button onClick={() => navigate('/superadmin')} className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '0.25rem', background: 'linear-gradient(135deg, #8b5cf6, #29abe2)', color: 'white', border: 'none' }}>
              🌐 Centro de Mando
            </button>
          )}

          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '0.25rem' }}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>

      <TaskAssignmentModal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} />

      {/* BANNER INTERACTIVO DE SOLICITUDES DE COLABORACIÓN Y MENCIONES */}
      {(() => {
        const pendingInvites = (notifications || []).filter(n => n.type === 'COLLABORATION_INVITE' && !n.read && n.status !== 'ACEPTADA' && n.status !== 'RECHAZADA');
        if (pendingInvites.length === 0) return null;

        return (
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(0, 210, 255, 0.4)', background: 'rgba(0, 210, 255, 0.05)', boxShadow: '0 0 25px rgba(0, 210, 255, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Users size={22} color="var(--crear-blue)" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff' }}>
                🤝 Invitaciones de Colaboración en Tareas ({pendingInvites.length} pendientes)
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pendingInvites.map(inv => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 0, 0, 0.35)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--crear-blue)', fontSize: '0.95rem' }}>
                      {inv.title}
                    </div>
                    <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                      {inv.message}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                      Tarea: <strong style={{ color: '#ffffff' }}>{inv.taskTitle}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => acceptCollaboration(inv)}
                      className="btn-neon-action"
                      style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                    >
                      ✅ Aceptar y Colaborar
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectCollaboration(inv)}
                      className="btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      ❌ Declinar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {(() => {
        const myTasksForProgress = allTasks.filter(t => t.role === currentUser?.appRole || t.assignedToEmail === currentUser?.email);
        const completedForProgress = myTasksForProgress.filter(t => t.completed || t.status === 'Completada').length;
        const progressPercentage = myTasksForProgress.length > 0 ? Math.round((completedForProgress / myTasksForProgress.length) * 100) : 0;
        
        return (
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h2 className="text-main" style={{ marginTop: 0, marginBottom: '1rem' }}>Mi Progreso General</h2>
            <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPercentage}%`, background: 'var(--crear-gold)', transition: 'width 0.5s ease-out' }} />
            </div>
            <p className="text-gold" style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>{progressPercentage}% completado</p>
          </div>
        );
      })()}

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 className="text-blue" style={{ marginTop: 0, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarIcon size={18} /> EVENTOS
          </h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {/* Filtro de Tiempo */}
            <select 
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}
            >
              <option value="todos" style={{ color: 'black' }}>Todas las fechas</option>
              <option value="futuros" style={{ color: 'black' }}>Próximos</option>
              <option value="hoy" style={{ color: 'black' }}>Hoy</option>
              <option value="pasados" style={{ color: 'black' }}>Históricos (Pasados)</option>
            </select>

            {/* Botón Configurar Hoteles / Salones */}
            <button 
              type="button"
              onClick={() => setShowVenueModal(true)}
              className="btn-secondary"
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Configurar el hotel o salón oficial por defecto de la sede"
            >
              🏨 Hoteles / Salones
            </button>

            {/* Enlace al Calendario Global Oficial (Hermano) */}
            <a 
              href="https://crearpsl.net/calendario_global.html" 
              target="_blank" 
              rel="noreferrer" 
              className="btn-secondary"
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none', color: 'var(--crear-blue)', borderColor: 'rgba(0, 210, 255, 0.35)', background: 'rgba(0, 210, 255, 0.05)' }}
              title="Abrir el Calendario Global Maestro Oficial (crearpsl.net)"
            >
              🌐 Calendario Global ↗
            </a>

            {/* Pestañas Sede/Global */}
            <div style={{ display: 'flex', gap: '0.5rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '0.75rem' }}>
              <button 
                onClick={() => setActiveEventTab('locales')}
                style={{ background: 'none', border: 'none', color: activeEventTab === 'locales' ? 'var(--crear-gold)' : 'var(--text-muted)', fontWeight: activeEventTab === 'locales' ? 'bold' : 'normal', cursor: 'pointer', transition: 'color 0.2s' }}
              >
                MI SEDE
              </button>
              {currentUser?.appRole === 'gerente' && (
                <button 
                  onClick={() => setActiveEventTab('globales')}
                  style={{ background: 'none', border: 'none', color: activeEventTab === 'globales' ? 'var(--crear-gold)' : 'var(--text-muted)', fontWeight: activeEventTab === 'globales' ? 'bold' : 'normal', cursor: 'pointer', transition: 'color 0.2s' }}
                >
                  GLOBAL
                </button>
              )}
            </div>
          </div>
        </div>
        {loadingEvents ? (
          <p className="text-muted">Cargando inteligencia global...</p>
        ) : events.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {(() => {
              let displayEvents = events;
              
              // Filtro estricto: Si NO es gerente, siempre forzar a ver solo locales
              let isLocales = activeEventTab === 'locales' || currentUser?.appRole !== 'gerente';
              
              if (isLocales) {
                const sedeMap = { 'cuenca': 'CUE', 'lima': 'LIM', 'med': 'MED', 'méxico': 'MEX', 'mexico': 'MEX', 'uio': 'UIO', 'guayaquil': 'GYE' };
                const userSede = currentUser?.sede?.toLowerCase().trim();
                const eventSedeCode = userSede ? sedeMap[userSede] : null;
                
                if (eventSedeCode && userSede !== 'global') {
                  displayEvents = displayEvents.filter(ev => {
                    const evSede = (ev.sede || ev.sedeTag || '').toUpperCase();
                    return evSede.includes(eventSedeCode);
                  });
                }
              }

              // Filtro por tiempo (Futuros, Hoy, Pasados)
              const todayStr = time.toISOString().substring(0, 10);
              const nowMidnight = new Date();
              nowMidnight.setHours(0,0,0,0);
              const tomorrow = new Date(nowMidnight);
              tomorrow.setDate(tomorrow.getDate() + 1);

              displayEvents = displayEvents.filter(ev => {
                if (timeFilter === 'todos') return true;
                if (!ev.fecha_inicio) return false;
                
                const evDate = new Date(ev.fecha_inicio);
                evDate.setHours(0,0,0,0);
                
                let evEndDate = new Date(ev.fecha_inicio);
                if (ev.fecha_fin) {
                  evEndDate = new Date(ev.fecha_fin);
                }
                
                // Ajustar horas específicas según el tipo de evento si es posible, por defecto 9PM
                const eventName = (ev.nombre || ev.name || "").toUpperCase();
                if (eventName.includes("UNO")) {
                   evEndDate.setHours(21,0,0,0); // Domingo 9 PM
                } else if (eventName.includes("DOS")) {
                   evEndDate.setHours(20,0,0,0); // Domingo 8 PM
                } else if (eventName.includes("MAESTR") || eventName.includes("JUEGO")) {
                   evEndDate.setHours(23,0,0,0); // Domingo 11 PM
                } else if (eventName.includes("VIAJE")) {
                   evEndDate.setHours(17,0,0,0); // Domingo 5 PM
                } else if (eventName.includes("CONFIANZA") || eventName.includes("TANQUE")) {
                   evEndDate = new Date(ev.fecha_inicio); // Forzar que use la de inicio
                   if (eventName.includes("CONFIANZA")) evEndDate.setHours(14,0,0,0);
                   else evEndDate.setHours(16,0,0,0);
                } else {
                   evEndDate.setHours(21,0,0,0); 
                }

                const todayMidnight = new Date();
                todayMidnight.setHours(0,0,0,0);
                const todayEnd = new Date();
                todayEnd.setHours(23,59,59,999);

                if (timeFilter === 'hoy') {
                  // El evento abarca el día de hoy
                  return evDate <= todayEnd && evEndDate >= todayMidnight;
                } else if (timeFilter === 'pasados') {
                  return evEndDate < todayMidnight;
                } else { // futuros
                  // Incluir eventos de hoy y futuros (que no han terminado)
                  return evEndDate >= todayMidnight;
                }
              });
              
              // Si vemos históricos, invertimos el orden para ver los más recientes primero
              if (timeFilter === 'pasados') {
                displayEvents = displayEvents.reverse();
              }

              // Permitimos hacer scroll si hay muchos
              const isScrollable = displayEvents.length > 4;

              if (displayEvents.length === 0) {
                return <p className="text-muted">No hay eventos próximos registrados en esta vista.</p>;
              }

              return (
                <div style={{ maxHeight: isScrollable ? '400px' : 'auto', overflowY: isScrollable ? 'auto' : 'visible', paddingRight: isScrollable ? '0.5rem' : '0' }}>
                  {displayEvents.map((ev, i) => {
                    // TODAS las fechas se calculan FUERA del if para que el botón Agendar las tenga en su closure
                    const eventName = (ev.nombre || ev.name || "").toUpperCase();
                    const baseDate = ev.fecha_inicio || ev.start;
                    const evStartDate = new Date(baseDate || new Date());
                    let evEndDate = new Date(ev.fecha_fin || baseDate || new Date());

                    // Horarios de inicio
                    if (eventName.includes("UNO")) { evStartDate.setHours(9,0,0,0); }
                    else if (eventName.includes("DOS")) { evStartDate.setHours(13,0,0,0); }
                    else if (eventName.includes("MAESTR") || eventName.includes("JUEGO") || eventName.includes("VIAJE")) { evStartDate.setHours(17,0,0,0); }
                    else if (eventName.includes("CONFIANZA")) { evStartDate.setHours(10,0,0,0); }
                    else if (eventName.includes("TANQUE")) { evStartDate.setHours(13,0,0,0); }
                    else { evStartDate.setHours(8,0,0,0); }

                    // Horarios de fin
                    evEndDate = new Date(ev.fecha_fin || baseDate || new Date());
                    if (eventName.includes("UNO")) { evEndDate.setHours(21,0,0,0); }
                    else if (eventName.includes("DOS")) { evEndDate.setHours(20,0,0,0); }
                    else if (eventName.includes("MAESTR") || eventName.includes("JUEGO")) { evEndDate.setHours(23,0,0,0); }
                    else if (eventName.includes("VIAJE")) { evEndDate.setHours(17,0,0,0); }
                    else if (eventName.includes("CONFIANZA") || eventName.includes("TANQUE")) { 
                      evEndDate = new Date(baseDate || new Date()); 
                      if (eventName.includes("CONFIANZA")) evEndDate.setHours(14,0,0,0);
                      else evEndDate.setHours(16,0,0,0); 
                    }
                    else { evEndDate.setHours(21,0,0,0); }

                    // Countdown
                    let countdownStr = '';
                    if (baseDate) {
                      const nowTime = time.getTime();
                      const startDiff = evStartDate.getTime() - nowTime;
                      const endDiff = evEndDate.getTime() - nowTime;
                      if (startDiff > 0) {
                        const days = Math.floor(startDiff / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((startDiff / (1000 * 60 * 60)) % 24);
                        const minutes = Math.floor((startDiff / 1000 / 60) % 60);
                        const seconds = Math.floor((startDiff / 1000) % 60);
                        countdownStr = days > 30 ? `Faltan: ${Math.floor(days/30)}m ${days%30}d ${hours}h` : `Faltan: ${days}d ${hours}h ${minutes}m ${seconds}s`;
                      } else if (endDiff > 0) {
                        countdownStr = '¡EN CURSO!';
                      } else {
                        countdownStr = 'FINALIZADO';
                      }
                    }

                    // Limpiar nombre del entrenador (no puede ser número de equipo)
                    const cleanTrainer = (ev.trainer && !/^\d+$/.test(String(ev.trainer).trim()) && !/^EQ\s*\d+$/i.test(String(ev.trainer).trim()) && String(ev.trainer).toLowerCase() !== 'tba') ? String(ev.trainer).trim() : '';

                    return (
                      <li key={i} style={{ padding: '0.8rem 0', borderBottom: i !== displayEvents.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <span className="text-white" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{ev.nombre || ev.name || 'Entrenamiento'}</span>
                          {cleanTrainer && (
                            <span className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                              Trainer: <span className="text-white" style={{ fontWeight: '600' }}>{cleanTrainer}</span>
                            </span>
                          )}
                          {((ev.nombre || "").toUpperCase().includes("UNO")) && (
                             <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.3rem', color: '#ffb347' }}>
                               🗓 Horario: Vie 9am-11pm | Sáb 9am-11pm | Dom 9am-9pm
                             </span>
                          )}
                          {((ev.nombre || "").toUpperCase().includes("DOS")) && (
                             <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.3rem', color: '#ffb347' }}>
                               🗓 Horario: Jue 1pm-11pm | Vie 8am-11pm | Sáb 8am-11pm | Dom 8am-8pm
                             </span>
                          )}
                          {((ev.nombre || "").toUpperCase().includes("MAESTR") || (ev.nombre || "").toUpperCase().includes("JUEGO")) && !((ev.nombre || "").toUpperCase().includes("VIAJE")) && (
                             <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.3rem', color: '#ffb347' }}>
                               🗓 Horario: Vie 5pm-11pm | Sáb 8am-11pm | Dom 8am-11pm
                             </span>
                          )}
                          {((ev.nombre || "").toUpperCase().includes("VIAJE")) && (
                             <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.3rem', color: '#ffb347' }}>
                               🗓 Horario: Vie 5pm-11pm | Sáb 7am hasta Dom 5pm
                             </span>
                          )}
                          {((ev.nombre || "").toUpperCase().includes("CONFIANZA")) && (
                             <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.3rem', color: '#ffb347' }}>
                               🗓 Horario: Sáb 10am-2pm
                             </span>
                          )}
                          {((ev.nombre || "").toUpperCase().includes("TANQUE")) && (
                             <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.3rem', color: '#ffb347' }}>
                               🗓 Horario: Sáb 1pm-4pm
                             </span>
                          )}
                          {((ev.nombre || "").toUpperCase().includes("REVISION")) && (
                             <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.3rem', color: '#ffb347' }}>
                               🗓 Horario: Según el día que se indica
                             </span>
                          )}
                          {(ev.detalles || ev.details) && (
                            <span className="text-muted" style={{ display: 'block', fontSize: '0.8rem', marginTop: '0.2rem', fontStyle: 'italic' }}>
                              {ev.detalles || ev.details}
                            </span>
                          )}
                          {(() => {
                            const hotelVenue = getVenueForTraining(ev.sede || ev.sedeTag || currentUser?.sede, ev.nombre || ev.name, ev.lugar, ev.direccion);
                            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelVenue)}`;

                            return (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  fontSize: '0.8rem',
                                  color: 'var(--crear-blue)',
                                  marginTop: '0.35rem',
                                  fontWeight: 'bold',
                                  textDecoration: 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                                title="Hacer clic para abrir ubicación exacta en Google Maps ↗"
                              >
                                🏨 {hotelVenue} <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>↗</span>
                              </a>
                            );
                          })()}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="text-gold" style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}>
                            <MapPin size={12} /> {getFlagForSede(ev.sede || ev.sedeTag)} {ev.sede || ev.sedeTag || 'GLOBAL'}
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.85rem', display: 'block' }}>
                            {ev.fecha_inicio ? ev.fecha_inicio.substring(0, 10) : ''}
                          </span>
                          {countdownStr && (
                            <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.2rem', color: countdownStr === '¡EN CURSO!' ? 'var(--color-success)' : (countdownStr === 'FINALIZADO' ? 'var(--text-muted)' : 'var(--crear-blue)'), fontWeight: 'bold', fontFamily: 'monospace' }}>
                              {countdownStr}
                            </span>
                          )}
                          <button 
                            onClick={() => handleAddEventToGoogle(ev, evStartDate, evEndDate)}
                            style={{ background: 'transparent', border: '1px solid rgba(41, 171, 226, 0.3)', color: 'var(--crear-cyan)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.5rem', cursor: 'pointer', marginLeft: 'auto' }}
                            title="Agendar en mi Google Calendar"
                          >
                            <CalendarPlus size={12} /> Agendar
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </div>
              );
            })()}
          </ul>
        ) : (
          <p className="text-muted">No hay eventos próximos registrados hoy.</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {/* PANEL: HOY (Tus Pendientes) */}
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
          <h3 className="text-blue" style={{ marginTop: 0, borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem' }}>HOY (Tus Pendientes)</h3>
          {loadingTasks ? (
            <p className="text-muted">Calculando prioridades...</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(() => {
                const myTasks = allTasks.filter(t => t.role === currentUser?.appRole || t.assignedToEmail === currentUser?.email);
                const completed = myTasks.filter(t => t.completed || t.status === 'Completada').length;
                const criticas = myTasks.filter(t => !t.completed && (t.isCritical || t.priority === '🔴 ROJO')).length;
                const importantes = myTasks.filter(t => !t.completed && t.status !== 'Completada' && !t.isCritical && t.priority !== '🔴 ROJO').length;
                
                return (
                  <>
                    <li 
                      onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=criticas`)}
                      style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                      <AlertCircle size={18} /> <strong>{criticas}</strong> críticas (Requieren acción hoy)
                    </li>
                    <li 
                      onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=importantes`)}
                      style={{ padding: '0.8rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: '#ffb347', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}
                    >
                      <Circle size={18} /> <strong>{importantes}</strong> importantes
                    </li>
                    <li 
                      onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=completed`)}
                      style={{ padding: '0.8rem', background: 'rgba(52, 168, 83, 0.1)', borderRadius: '8px', color: 'var(--color-success)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', border: '1px solid rgba(52, 168, 83, 0.2)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(52, 168, 83, 0.2)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(52, 168, 83, 0.1)'}
                    >
                      <CheckCircle2 size={18} /> <strong>{completed}</strong> completadas
                    </li>
                  </>
                );
              })()}
            </ul>
          )}
          
          <button 
            onClick={() => syncTasksToGoogle(currentUser?.appRole)}
            className="btn-primary" 
            style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}
          >
            Sincronizar a Google Tasks
          </button>
        </div>

        {/* PANEL: TU PRIORIDAD (Top 3) */}
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
          <h3 className="text-blue" style={{ marginTop: 0, borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem' }}>TU PRIORIDAD (Top 3)</h3>
          {loadingTasks ? (
            <p className="text-muted">Buscando tareas urgentes...</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(() => {
                const myTasks = allTasks.filter(t => t.role === currentUser?.appRole && !t.completed && t.status !== 'Completada' && t.status !== 'Pendiente de validación');
                // Ordenar: críticas/rojas primero, luego importantes/amarillas
                myTasks.sort((a, b) => {
                  const valA = (a.isCritical || a.priority === '🔴 ROJO') ? 3 : (a.priority === '🟡 AMARILLO' ? 2 : 1);
                  const valB = (b.isCritical || b.priority === '🔴 ROJO') ? 3 : (b.priority === '🟡 AMARILLO' ? 2 : 1);
                  return valB - valA;
                });
                
                const top3 = myTasks.slice(0, 3);
                
                if (top3.length === 0) {
                  return <li className="text-muted" style={{ padding: '1rem 0' }}>No tienes tareas urgentes pendientes. ¡Buen trabajo!</li>;
                }

                return top3.map(task => {
                  const isCrit = task.isCritical || task.priority === '🔴 ROJO';
                  const isImp = task.priority === '🟡 AMARILLO';
                  const color = isCrit ? 'var(--color-error)' : (isImp ? '#ffb347' : 'var(--crear-blue)');
                  const bg = isCrit ? 'rgba(239, 68, 68, 0.1)' : (isImp ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0, 212, 255, 0.1)');
                  
                  return (
                    <li 
                      key={task.id}
                      onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=${isCrit ? 'criticas' : 'importantes'}`)}
                      style={{ 
                        padding: '0.8rem', 
                        background: bg, 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.8rem', 
                        transition: 'all 0.2s', 
                        border: `1px solid ${color}33` 
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }}></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="text-white" style={{ fontSize: '0.9rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.task || task.title}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--crear-gold)', fontWeight: 'bold' }}>
                          ⏰ Límite: {task.deadline || calculateAutomaticDeadline(task, currentCycle)}
                        </span>
                      </div>
                    </li>
                  );
                });
              })()}
            </ul>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => navigate(currentUser?.isGerente ? '/gerente' : `/checklist/${currentUser?.appRole || 'capitan'}`)} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          IR A MI CHECKLIST OPERATIVO
        </button>
        <button className="btn-secondary" onClick={() => navigate('/metas')} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          VER MIS METAS
        </button>
        {(currentUser?.isSuperAdmin || currentUser?.isGerente || ['coord_c1', 'coord_maestria', 'capitan', 'qt', 'direccion'].includes(currentUser?.appRole)) && (
          <button className="btn-secondary" onClick={() => navigate('/reportes')} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            ENVIAR REPORTES
          </button>
        )}
      </div>

      {/* MODAL CONFIGURACIÓN DE HOTELES Y SALONES */}
      <VenueConfigModal
        isOpen={showVenueModal}
        onClose={() => setShowVenueModal(false)}
      />
    </div>
  );
}


```

---

### 📄 Archivo: `src/pages/Login.jsx`

```javascript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

export default function Login() {
  const { currentUser, loginWithGoogle } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/home');
    }
  }, [currentUser, navigate]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/home');
    } catch (error) {
      console.error("Error al iniciar sesión", error);
      showToast("Hubo un error al iniciar sesión. Intenta nuevamente.", "error");
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-dark)' }}>
      <div className="glass-panel" style={{ padding: '4rem', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <img src="/interrupcion_logo.jpg" alt="Logo" className="logo-holographic" style={{ width: '120px', margin: '0 auto 2rem', display: 'block' }} onError={(e) => e.target.style.display = 'none'} />
        
        <h1 className="text-gold uppercase" style={{ fontSize: '2rem', marginBottom: '0.5rem', letterSpacing: '2px' }}>CENTRO OPERATIVO</h1>
        <p className="text-muted" style={{ marginBottom: '3rem', fontSize: '1.1rem' }}>Plataforma de Gestión por Ciclos</p>
        
        <button 
          onClick={handleLogin}
          className="btn-primary" 
          style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '24px', height: '24px', background: 'white', borderRadius: '50%', padding: '2px' }} />
          Continuar con Google
        </button>
        
        <p className="text-muted" style={{ marginTop: '2rem', fontSize: '0.8rem' }}>Acceso exclusivo para equipo CREAR</p>
      </div>
    </div>
  );
}

```

---

### 📄 Archivo: `src/pages/ReportesBoard.jsx`

```javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import { ArrowLeft, FileText, Send } from 'lucide-react';

export default function ReportesBoard() {
  const { currentUser } = useAuth();
  const { currentCycle, currentStage } = useCycles();
  const { showToast } = useUI();
  const navigate = useNavigate();

  const [reportType, setReportType] = useState('');
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  // Limpiar form al cambiar tipo
  useEffect(() => {
    setFormData({});
  }, [reportType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Intentar parsear a número si aplica
    const val = isNaN(value) || value === '' ? value : Number(value);
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const calculateTotalLlamadas = (seccion) => {
    const keys = ['OK', 'XC', 'NC', 'NI', 'SIG', 'OS', 'PENDIENTES'];
    let total = 0;
    keys.forEach(k => {
      total += (formData[`${seccion}_${k}`] || 0);
    });
    return total;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reportType) return;
    setLoading(true);

    try {
      // 1. Guardar el reporte
      await addDoc(collection(db, 'reports'), {
        type: reportType,
        cycle_id: currentCycle?.id || 'unknown',
        stage: currentStage,
        submitted_by: currentUser.displayName || currentUser.email,
        created_at: new Date().toISOString(),
        data: formData
      });

      // 2. Regla de Negocio Crítica: Acumulación de Metas para "Llamadas"
      if (reportType === 'Llamadas') {
        const totalOkNuevos = formData['nuevos_OK'] || 0;
        const totalOkRezagados = formData['rezagados_OK'] || 0;
        const totalOk = totalOkNuevos + totalOkRezagados;

        if (totalOk > 0) {
          // Buscar metas activas de tipo ENTRENAMIENTO (simplificado para MVP: sumamos a la de C1 por ser llamadas, o a todas aplicables)
          const goalsQ = query(collection(db, 'goals'), where('scope', '==', 'ENTRENAMIENTO'));
          const snapshot = await getDocs(goalsQ);
          
          // Buscar meta correspondiente a la etapa operativa y KPI de Sentados/Px (P11)
          const entGoalDoc = snapshot.docs.find(d => {
            const dData = d.data();
            const stageMatches = dData.stage === currentStage || (currentStage.includes('C1') && dData.stage === 'C1');
            return stageMatches && (dData.title?.includes('Px') || dData.title?.includes('Sentados') || dData.kpi?.includes('Px'));
          });
          
          if (entGoalDoc) {
            const data = entGoalDoc.data();
            const currentVal = data.currentValue || 0;
            const newVal = currentVal + totalOk;
            const target = data.targetValue || 1;
            const newProgress = Math.min(100, Math.round((newVal / target) * 100));

            await updateDoc(doc(db, 'goals', entGoalDoc.id), {
              currentValue: newVal,
              progress: newProgress,
              updatedAt: new Date().toISOString()
            });

            // Roll-up hacia CICLO (Opcional en MVP, el Gerente lo verá reflejado en la propia meta)
            const parentId = data.parentId;
            if (parentId) {
               // En una app completa, aquí iteraríamos los hermanos para promediar, similar a GoalsBoard
            }
          }
        }
      }

      showToast('¡Reporte enviado exitosamente!', 'success');
      setReportType('');
      setFormData({});
    } catch (err) {
      console.error(err);
      showToast('Hubo un error al enviar el reporte.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    if (reportType === 'FDS') {
      return (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <h4 className="text-blue">Reporte FDS (Sede)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input type="number" name="px_llegaron_viernes" placeholder="Px que llegaron el viernes" onChange={handleChange} className="form-input" />
            <input type="number" name="px_bajaron" placeholder="Px que se bajaron durante fds" onChange={handleChange} className="form-input" />
            <input type="number" name="declaracion_px" placeholder="Declaración Px" onChange={handleChange} className="form-input" />
            <input type="number" name="enrolamiento" placeholder="Enrolamiento" onChange={handleChange} className="form-input" />
            <input type="number" name="px_en_0" placeholder="Px en 0" onChange={handleChange} className="form-input" />
            <input type="text" name="capitan" placeholder="Nombre Capitán" onChange={handleChange} className="form-input" />
            <input type="number" name="managers_llegaron" placeholder="Managers que llegaron" onChange={handleChange} className="form-input" />
            <input type="number" name="capitan_quedo" placeholder="Capitanes que quedaron" onChange={handleChange} className="form-input" />
            <input type="number" name="managers_quedaron" placeholder="Managers que quedaron" onChange={handleChange} className="form-input" />
            <input type="text" name="declaracion" placeholder="Declaración" onChange={handleChange} className="form-input" />
            <input type="number" name="total" placeholder="Total" onChange={handleChange} className="form-input" />
            <input type="number" name="promedio" placeholder="Promedio fin de semana" onChange={handleChange} className="form-input" step="0.01" />
          </div>
          <textarea name="comentarios" placeholder="Comentarios adicionales" onChange={handleChange} className="form-input" rows="3"></textarea>
        </div>
      );
    }

    if (reportType === 'Llamadas') {
      const metrics = ['OK', 'XC', 'NC', 'NI', 'SIG', 'OS', 'PENDIENTES'];
      return (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <div>
            <h4 className="text-blue" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(0,212,255,0.2)' }}>Nuevos</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {metrics.map(m => (
                <div key={`nuevos_${m}`}>
                  <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>{m}</label>
                  <input type="number" name={`nuevos_${m}`} onChange={handleChange} className="form-input" placeholder="0" />
                </div>
              ))}
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                 <label className="text-gold" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>TOTAL NUEVOS</label>
                 <span className="text-white font-bold">{calculateTotalLlamadas('nuevos')}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-blue" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(0,212,255,0.2)' }}>Rezagados</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {metrics.filter(m => m !== 'OS').map(m => (
                <div key={`rezagados_${m}`}>
                  <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>{m}</label>
                  <input type="number" name={`rezagados_${m}`} onChange={handleChange} className="form-input" placeholder="0" />
                </div>
              ))}
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                 <label className="text-gold" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>TOTAL REZAGADOS</label>
                 <span className="text-white font-bold">{calculateTotalLlamadas('rezagados')}</span>
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(52, 168, 83, 0.1)', border: '1px solid #34a853', padding: '1rem', borderRadius: '8px' }}>
            <p style={{ margin: 0, color: '#34a853', fontSize: '0.9rem' }}>
              💡 Al enviar este reporte, los "OK" se sumarán automáticamente a la Meta de Entrenamiento activa para evitar doble digitación.
            </p>
          </div>
        </div>
      );
    }

    if (reportType === 'C2') {
      return (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <h4 className="text-blue">Reporte Capítulo Dos</h4>
          <textarea name="detalle" placeholder="Detalle: (Px, Aliados, Capitán, Entrenador, Desertores)" onChange={handleChange} className="form-input" rows="4"></textarea>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <input type="number" name="pagos_c2_mj" placeholder="C2 + MJ" onChange={handleChange} className="form-input" />
             <input type="number" name="pagos_rotos" placeholder="Pagos Rotos / Desertores" onChange={handleChange} className="form-input" />
             <input type="number" name="total" placeholder="TOTAL PAGOS" onChange={handleChange} className="form-input" />
          </div>
        </div>
      );
    }

    if (reportType === 'MJ') {
      return (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <h4 className="text-blue">Reporte Maestría del Juego</h4>
          <select name="subtipo" onChange={handleChange} className="form-input">
            <option value="">Selecciona sección...</option>
            <option value="Asistencia">Asistencia</option>
            <option value="Declaracion">Declaración</option>
            <option value="Enrolamiento">Enrolamiento</option>
          </select>
          {formData.subtipo && (
             <textarea name="contenido" placeholder={`Contenido para ${formData.subtipo}...`} onChange={handleChange} className="form-input" rows="5"></textarea>
          )}
        </div>
      );
    }

    return <p className="text-muted">Selecciona un tipo de reporte para ver el formato.</p>;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <style>{`
        .form-input {
          width: 100%; padding: 0.8rem; background: rgba(0,0,0,0.5); 
          border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px;
        }
      `}</style>
      
      <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
        <ArrowLeft size={18} /> Volver
      </button>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <FileText size={32} className="text-gold" />
          <div>
            <h1 className="text-gold uppercase" style={{ margin: 0 }}>Reportes Operativos</h1>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Digitalización de Formatos de Comunicación</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '2rem' }}>
            <label className="text-white" style={{ display: 'block', marginBottom: '0.5rem' }}>Tipo de Reporte a Enviar:</label>
            <select 
              value={reportType} 
              onChange={e => setReportType(e.target.value)} 
              className="form-input"
            >
              <option value="">-- Selecciona Formato Oficial Autorizado --</option>
              {(() => {
                const role = currentUser?.activeRole || currentUser?.appRole || '';
                const isSuper = currentUser?.isSuperAdmin || currentUser?.isGerente || ['direccion', 'superadmin', 'gerente'].includes(role);
                const options = [];

                if (isSuper || ['coord_c1', 'coordinador_c1c2'].includes(role)) {
                  options.push(<option key="Llamadas" value="Llamadas">1. Reporte de Llamadas (C1)</option>);
                  options.push(<option key="C2" value="C2">3. Reporte Capítulo Dos</option>);
                }
                if (isSuper || ['capitan', 'qt'].includes(role)) {
                  options.push(<option key="FDS" value="FDS">2. Reporte FDS (Sede)</option>);
                }
                if (isSuper || ['coord_maestria', 'coordinador_mj', 'director_maestria'].includes(role)) {
                  options.push(<option key="MJ" value="MJ">4. Reporte Maestría del Juego</option>);
                }

                return options.length > 0 ? options : [
                  <option key="FDS" value="FDS">2. Reporte FDS (Sede)</option>
                ];
              })()}
            </select>
          </div>

          {reportType && (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '2rem' }}>
              {renderFormFields()}
            </div>
          )}

          {reportType && (
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Send size={20} /> {loading ? 'Enviando...' : 'Enviar Reporte y Acumular Datos'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

```

---

### 📄 Archivo: `src/pages/RoleSelector.jsx`

```javascript
import { useNavigate } from 'react-router-dom';
import { roles } from '../data/checklistData';

export default function RoleSelector() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <img src="/interrupcion_logo.jpg" alt="Logo" className="logo-holographic" style={{ width: '100px', margin: '0 auto 1.5rem', display: 'block' }} onError={(e) => e.target.style.display = 'none'} />
        <h1 className="text-gold" style={{ marginBottom: '1rem', letterSpacing: '2px' }}>SELECCIONA TU ROL</h1>
        <p className="text-muted" style={{ marginBottom: '2.5rem' }}>
          Para ingresar al checklist operativo, por favor selecciona tu rol en el equipo.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {roles.map(role => (
            <button
              key={role.id}
              className={role.id === 'gerente' ? "btn-primary" : "btn-secondary"}
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
              onClick={() => {
                if (role.id === 'gerente') {
                  navigate('/gerente');
                } else {
                  navigate(`/checklist/${role.id}`);
                }
              }}
            >
              {role.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

```

---

### 📄 Archivo: `src/pages/SuperAdminPanel.jsx`

```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChecklist } from '../context/ChecklistContext';
import { useCycles } from '../context/CyclesContext';
import { useUI } from '../context/UIContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { usersData, normalizeRole, normalizeSede, OPERATIONAL_SEDES } from '../data/usersData';
import { Globe, Building2, Users, ArrowLeft, ChevronDown, ChevronRight, Eye, CheckCircle2, Clock, AlertTriangle, TrendingUp, UserCheck, FileText, Search, X } from 'lucide-react';
import { getFlagForSede } from '../utils/flags';
import UserProfileModal from '../components/UserProfileModal';

const ROLE_LABELS = {
  direccion: 'Dirección Global',
  cfo: 'CFO (Chief Financial Officer)',
  gerente: 'Gerente de Sede',
  director_maestria: 'Director de Maestría',
  coordinador_c1c2: 'Coordinador C1/C2',
  coordinador_mj: 'Coordinador Maestría',
  coord_c1: 'Coordinador C1/C2',
  coord_maestria: 'Coordinador Maestría',
  capitan: 'Capitán',
  manager: 'Manager',
  qt: 'Quantum Team',
  coordinador: 'Coordinación Administrativa',
  finanzas: 'Finanzas',
  asistente_impuestos_quito: 'Impuestos / Tributaria',
  talento_humano: 'Talento Humano',
  legal: 'Legal / Jurídico',
  técnico_sst: 'Seguridad y Salud (SST)',
};

const ROLE_COLORS = {
  direccion: '#ef4444',
  cfo: '#eab308',
  gerente: '#f59e0b',
  director_maestria: '#ec4899',
  coordinador_c1c2: '#29abe2',
  coord_c1: '#29abe2',
  coordinador_mj: '#8b5cf6',
  coord_maestria: '#8b5cf6',
  capitan: '#22c55e',
  manager: '#10b981',
  qt: '#ec4899',
  coordinador: '#0ea5e9',
  finanzas: '#6b7280',
  asistente_impuestos_quito: '#64748b',
  talento_humano: '#06b6d4',
  legal: '#a855f7',
  técnico_sst: '#14b8a6'
};

const ALL_SEDES = [...OPERATIONAL_SEDES, 'Sede Global'];

function ProgressBar({ value, color = 'var(--crear-gold)', height = '8px' }) {
  const pct = Math.min(100, Math.max(0, value));
  const barColor = pct === 100 ? '#22c55e' : (pct >= 50 ? color : pct > 0 ? '#f59e0b' : '#ef4444');
  return (
    <div style={{ width: '100%', height, background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: barColor, transition: 'width 0.5s ease-out' }} />
    </div>
  );
}

function PersonCard({ person, tasks, navigate, onSelectUser }) {
  const canonicalRole = normalizeRole(person.role);
  const myTasks = tasks.filter(t => {
    if (t.assignedToEmail && t.assignedToEmail.toLowerCase() === person.email?.toLowerCase()) return true;
    const tNorm = normalizeRole(t.role);
    const matchesRole = tNorm === canonicalRole || t.role === person.role;
    if (!matchesRole) return false;
    if (t.sede) {
      return t.sede === person.sede || t.sede === 'Global' || person.sede === 'Global';
    }
    return true;
  });

  const completed = myTasks.filter(t => {
    if (t.completions && person.sede && t.completions[person.sede]) {
      return t.completions[person.sede].completed;
    }
    return t.completed || t.status === 'Completada';
  }).length;

  const critical = myTasks.filter(t => {
    const isComp = t.completions && person.sede && t.completions[person.sede]
      ? t.completions[person.sede].completed
      : (t.completed || t.status === 'Completada');
    return !isComp && (t.isCritical || t.priority === '🔴 ROJO' || t.priority?.includes('ROJO'));
  }).length;

  const pct = myTasks.length > 0 ? Math.round((completed / myTasks.length) * 100) : 0;
  const roleColor = ROLE_COLORS[canonicalRole] || ROLE_COLORS[person.role] || '#6b7280';

  return (
    <div 
      className="glass-panel hover-glow" 
      onClick={() => onSelectUser && onSelectUser(person)}
      style={{ 
        padding: '1rem 1.2rem', borderLeft: `4px solid ${roleColor}`, 
        display: 'flex', flexDirection: 'column', gap: '0.6rem',
        cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-heading)', fontSize: '0.95rem' }}>{person.name}</p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '3px' }}>
            <span style={{ fontSize: '0.75rem', color: roleColor, fontWeight: 'bold' }}>{ROLE_LABELS[person.role] || person.role}</span>
            {person.sede && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--border-subtle)', border: '1px solid var(--border-subtle)', padding: '1px 6px', borderRadius: '4px' }}>
                {person.sede}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: pct === 100 ? '#22c55e' : 'var(--crear-gold)' }}>{pct}%</span>
          {critical > 0 && (
            <div style={{ fontSize: '0.7rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end', marginTop: '2px' }}>
              <AlertTriangle size={10} /> {critical} crítica{critical > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      <ProgressBar value={pct} color={roleColor} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.2rem' }}>
        <span>✅ {completed}/{myTasks.length} tareas</span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onSelectUser && onSelectUser(person);
          }} 
          style={{ 
            background: `${roleColor}18`, border: `1px solid ${roleColor}50`, color: roleColor, 
            cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', 
            padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', transition: 'all 0.2s'
          }}
        >
          <UserCheck size={12} color={roleColor} /> Ver Perfil
        </button>
      </div>
    </div>
  );
}

function SedeBlock({ sede, tasks, navigate, onSelectUser }) {
  const [expanded, setExpanded] = useState(false);
  const members = usersData.filter(u => u.sede?.trim() === sede);
  const sedeRoles = [...new Set(members.map(m => m.role))];
  const sedeTasks = tasks.filter(t => sedeRoles.includes(t.role));
  const sedeCompleted = sedeTasks.filter(t => {
    if (t.completions && t.completions[sede]) {
      return t.completions[sede].completed;
    }
    return t.completed || t.status === 'Completada';
  }).length;
  const sedePct = sedeTasks.length > 0 ? Math.round((sedeCompleted / sedeTasks.length) * 100) : 0;
  const groupedMembers = members.reduce((acc, m) => { const k = m.role || 'otro'; if (!acc[k]) acc[k] = []; acc[k].push(m); return acc; }, {});
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <Building2 size={20} color="var(--crear-gold)" />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-heading)', fontWeight: 'bold' }}>{sede}</h3>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>👥 {members.length} personas</span>
              <span>✅ {sedeCompleted}/{sedeTasks.length} tareas</span>
            </div>
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: sedePct === 100 ? '#22c55e' : 'var(--crear-gold)', marginRight: '1rem' }}>{sedePct}%</span>
        </div>
        {expanded ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
      </div>
      <div style={{ marginTop: '0.8rem' }}><ProgressBar value={sedePct} height="6px" /></div>
      {expanded && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {Object.entries(groupedMembers).map(([roleKey, roleMembers]) => (
            <div key={roleKey}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: ROLE_COLORS[roleKey] || 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {ROLE_LABELS[roleKey] || roleKey}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {roleMembers.map(person => <PersonCard key={person.id} person={person} tasks={tasks} navigate={navigate} onSelectUser={onSelectUser} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GlobalView({ tasks, navigate }) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed || t.status === 'Completada').length;
  const criticalTasks = tasks.filter(t => !t.completed && (t.isCritical || t.priority === '🔴 ROJO')).length;
  const globalPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const roleGroups = [
    { id: 'gerente', label: 'Gerentes de Sede' },
    { id: 'coordinador_c1c2', label: 'Coordinadores C1/C2', alias: 'coord_c1' },
    { id: 'coordinador_mj', label: 'Coordinadores Maestría', alias: 'coord_maestria' },
    { id: 'capitan', label: 'Capitanes' },
    { id: 'qt', label: 'Quantum Team' },
  ];
  const sedesRanking = OPERATIONAL_SEDES.map(sede => {
    const sedeRoles = [...new Set(usersData.filter(u => u.sede?.trim() === sede).map(m => m.role))];
    const sedeTasks = tasks.filter(t => sedeRoles.includes(t.role));
    const sedeCompleted = sedeTasks.filter(t => {
      if (t.completions && t.completions[sede]) {
        return t.completions[sede].completed;
      }
      return t.completed || t.status === 'Completada';
    }).length;
    const sedePct = sedeTasks.length > 0 ? Math.round((sedeCompleted / sedeTasks.length) * 100) : 0;
    return { sede, sedePct, sedeCompleted, total: sedeTasks.length };
  }).sort((a, b) => b.sedePct - a.sedePct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { icon: <CheckCircle2 size={22} color="#22c55e" />, label: 'Tareas Completadas', value: completedTasks, sub: `de ${totalTasks} totales`, color: '#22c55e', path: '/reportes' },
          { icon: <Clock size={22} color="var(--crear-gold)" />, label: 'Avance Global', value: `${globalPct}%`, sub: 'SO-AR del ciclo', color: 'var(--crear-gold)', path: '/reportes' },
          { icon: <AlertTriangle size={22} color="#ef4444" />, label: 'Alertas Críticas', value: criticalTasks, sub: 'requieren acción HOY', color: '#ef4444', path: '/reportes' },
          { icon: <Building2 size={22} color="#29abe2" />, label: 'Sedes Operativas', value: OPERATIONAL_SEDES.length, sub: 'sedes activas', color: '#29abe2', onClick: () => window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'}) },
        ].map((kpi, i) => (
          <div 
            key={i} 
            className="glass-panel hover-glow" 
            style={{ padding: '1.2rem', textAlign: 'center', border: `1px solid ${kpi.color}33`, cursor: 'pointer', transition: 'all 0.3s' }}
            onClick={() => kpi.path ? navigate(kpi.path) : kpi.onClick?.()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>{kpi.icon}</div>
            <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', color: kpi.color }}>{kpi.value}</p>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-heading)' }}>{kpi.label}</p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{kpi.sub}</p>
          </div>
        ))}
      </div>
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0, color: 'var(--crear-gold)' }}>Avance por Rol — Global</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}><ProgressBar value={globalPct} height="12px" /></div>
          <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--crear-gold)', minWidth: '48px' }}>{globalPct}% total</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {roleGroups.map(role => {
            const roleTasks = tasks.filter(t => t.role === role.id || t.role === role.alias);
            const roleCompleted = roleTasks.filter(t => t.completed || t.status === 'Completada').length;
            const rolePct = roleTasks.length > 0 ? Math.round((roleCompleted / roleTasks.length) * 100) : 0;
            const roleColor = ROLE_COLORS[role.id] || '#6b7280';
            return (
              <div 
                key={role.id} 
                onClick={() => navigate(`/checklist/${role.id}`)}
                className="hover-glow"
                style={{ cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.3s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--text-heading)', fontWeight: '500' }}>{role.label}</span>
                  <span style={{ color: roleColor, fontWeight: 'bold' }}>{rolePct}% ({roleCompleted}/{roleTasks.length})</span>
                </div>
                <ProgressBar value={rolePct} color={roleColor} height="6px" />
              </div>
            );
          })}
        </div>
      </div>
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0, color: 'var(--crear-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={20} /> Ranking Oficial de Sedes Operativas
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {sedesRanking.map(({ sede, sedePct, sedeCompleted, total }, idx) => (
            <div key={sede} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: idx === 0 ? '#f59e0b' : idx === 1 ? '#9ca3af' : idx === 2 ? '#cd7f32' : 'var(--text-muted)', fontWeight: 'bold', minWidth: '24px', fontSize: '0.85rem' }}>#{idx+1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--text-heading)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {getFlagForSede(sede)} {sede}
                  </span>
                  <span style={{ color: sedePct >= 70 ? '#22c55e' : sedePct >= 40 ? 'var(--crear-gold)' : '#ef4444', fontWeight: 'bold' }}>{sedePct}%</span>
                </div>
                <ProgressBar value={sedePct} color={sedePct >= 70 ? '#22c55e' : sedePct >= 40 ? 'var(--crear-gold)' : '#ef4444'} height="6px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoleView({ tasks, navigate, onSelectUser }) {
  const roles = [
    { id: 'direccion', label: 'Dirección Global' },
    { id: 'cfo', label: 'CFO (Chief Financial Officer)' },
    { id: 'gerente', label: 'Gerentes de Sede' },
    { id: 'director_maestria', label: 'Directores de Maestría' },
    { id: 'coordinador_c1c2', label: 'Coordinadores C1/C2' },
    { id: 'coordinador_mj', label: 'Coordinadores de Maestría' },
    { id: 'capitan', label: 'Capitanes' },
    { id: 'manager', label: 'Managers' },
    { id: 'qt', label: 'Quantum Team' },
    { id: 'coordinador', label: 'Coordinación Administrativa' },
    { id: 'finanzas', label: 'Finanzas' },
    { id: 'asistente_impuestos_quito', label: 'Impuestos / Tributaria' },
    { id: 'talento_humano', label: 'Talento Humano' },
    { id: 'legal', label: 'Legal / Jurídico' },
    { id: 'técnico_sst', label: 'Seguridad y Salud (SST)' },
  ];

  const listedRoleIds = new Set(roles.map(r => r.id));
  const unlistedRoles = [...new Set(usersData.map(u => u.role).filter(r => !listedRoleIds.has(r)))];
  const allDisplayRoles = [
    ...roles,
    ...unlistedRoles.map(r => ({ id: r, label: ROLE_LABELS[r] || r }))
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {allDisplayRoles.map(role => {
        const members = usersData.filter(u => u.role === role.id || normalizeRole(u.role) === role.id);
        if (members.length === 0) return null;
        const roleColor = ROLE_COLORS[role.id] || '#6b7280';
        return (
          <div key={role.id}>
            <h3 style={{ color: roleColor, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} /> {role.label} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'normal' }}>({members.length} persona{members.length > 1 ? 's' : ''})</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem' }}>
              {members.map(person => (
                <PersonCard 
                  key={person.id || person.email} 
                  person={person} 
                  tasks={tasks} 
                  navigate={navigate} 
                  onSelectUser={onSelectUser}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SuperAdminPanel() {
  const navigate = useNavigate();
  const { tasks } = useChecklist();
  const { currentStage } = useCycles();
  const [activeView, setActiveView] = useState('global');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useUI();

  const handleMigrateUsers = async () => {
    if (!window.confirm("¿Estás seguro de migrar el directorio completo de usersData.js a Firestore? Esto sobrescribirá los datos actuales en Firestore.")) return;
    try {
      showToast('Iniciando migración...', 'info');
      let count = 0;
      for (const u of usersData) {
        // Usar un ID único, ej el email normalizado, o el u.id si existe
        const docId = u.id || u.email.split('@')[0];
        await setDoc(doc(db, 'users', docId), u);
        count++;
      }
      showToast(`✅ Migración exitosa: ${count} usuarios en Firestore.`, 'success');
    } catch(err) {
      console.error(err);
      showToast('Error migrando usuarios: ' + err.message, 'error');
    }
  };

  const handleOpenUserModal = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const tabStyle = (view) => ({
    padding: '0.6rem 1.2rem',
    borderRadius: '8px',
    border: 'none',
    background: activeView === view ? 'var(--crear-gold)' : 'var(--bg-card)',
    color: activeView === view ? '#000' : 'var(--text-muted)',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
  });

  const searchFilteredUsers = searchTerm.trim() ? usersData.filter(u => {
    const term = searchTerm.toLowerCase().trim();
    const nameMatch = u.name?.toLowerCase().includes(term);
    const emailMatch = u.email?.toLowerCase().includes(term);
    const roleMatch = (ROLE_LABELS[u.role] || u.role)?.toLowerCase().includes(term);
    const sedeMatch = u.sede?.toLowerCase().includes(term);
    return nameMatch || emailMatch || roleMatch || sedeMatch;
  }) : [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate('/home')} className="btn-secondary" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
        <ArrowLeft size={16} /> Volver al Inicio
      </button>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gold uppercase" style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>Panel Super Admin — Monitoreo Global</h1>
          <p className="text-muted" style={{ margin: 0 }}>Visibilidad total del sistema SO-AR en todas las sedes y roles.</p>
        </div>
        <button onClick={handleMigrateUsers} className="btn-primary" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
          ☁️ Migrar Directorio a Firestore
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '0.8rem 1.2rem', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'rgba(0, 0, 0, 0.05)',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)'
        }}>
          <Search size={20} color={searchTerm ? "var(--crear-gold)" : "var(--text-muted)"} />
          <input 
            type="text"
            placeholder="🔍 Buscar persona por nombre, email, rol o sede (ej. Leyla, Darkwin, Quito, Quantum Team, Gerente)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', color: 'var(--text-heading)',
              fontSize: '0.95rem', outline: 'none'
            }}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              style={{
                background: 'var(--border-subtle)', border: 'none', color: 'var(--text-muted)',
                borderRadius: '50%', width: '24px', height: '24px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
              title="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {searchTerm.trim() ? (
        <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--crear-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Users size={20} /> Resultados de Búsqueda ({searchFilteredUsers.length})
            </h3>
            <button 
              onClick={() => setSearchTerm('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--crear-cyan)', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Cerrar búsqueda
            </button>
          </div>

          {searchFilteredUsers.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Search size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0 }}>No se encontraron colaboradores que coincidan con "<strong>{searchTerm}</strong>".</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.8rem' }}>
              {searchFilteredUsers.map(person => (
                <PersonCard 
                  key={person.id || person.email} 
                  person={person} 
                  tasks={tasks} 
                  navigate={navigate} 
                  onSelectUser={handleOpenUserModal} 
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Vistas normales por pestañas */
        <>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <button style={tabStyle('global')} onClick={() => setActiveView('global')}>🌐 Global</button>
            <button style={tabStyle('sede')} onClick={() => setActiveView('sede')}>🏢 Por Sede</button>
            <button style={tabStyle('rol')} onClick={() => setActiveView('rol')}>👥 Por Rol</button>
          </div>
          {activeView === 'global' && <GlobalView tasks={tasks} navigate={navigate} />}
          {activeView === 'sede' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p className="text-muted text-sm" style={{ marginBottom: '0.5rem' }}>Clic en una sede para expandir y ver el detalle de cada persona y su avance operativo.</p>
              {ALL_SEDES.map(sede => (
                <SedeBlock 
                  key={sede} 
                  sede={sede} 
                  tasks={tasks} 
                  navigate={navigate} 
                  onSelectUser={handleOpenUserModal} 
                />
              ))}
            </div>
          )}
          {activeView === 'rol' && (
            <RoleView 
              tasks={tasks} 
              navigate={navigate} 
              onSelectUser={handleOpenUserModal} 
            />
          )}
        </>
      )}

      {/* Modal de Perfil de Usuario Completo */}
      {showUserModal && selectedUser && (
        <UserProfileModal 
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          user={selectedUser}
          allTasks={tasks}
        />
      )}
    </div>
  );
}

```

---

### 📄 Archivo: `src/pages/home-views/HomeCampo.jsx`

```javascript
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCycles } from '../../context/CyclesContext';
import { useChecklist } from '../../context/ChecklistContext';
import { AlertCircle, Circle, CheckCircle2, MapPin, Activity, ListTodo } from 'lucide-react';
import { calculateAutomaticDeadline } from '../../utils/soarDates';

export default function HomeCampo() {
  const { currentUser } = useAuth();
  const { currentCycle, currentStage } = useCycles();
  const { tasks: allTasks, loading: loadingTasks } = useChecklist();
  const navigate = useNavigate();

  const myTasks = allTasks.filter(t => t.role === currentUser?.appRole);
  const pendingTasks = myTasks.filter(t => !t.completed && t.status !== 'Completada' && t.status !== 'Pendiente de validación');
  
  // Ordenar por prioridad (rojos primero)
  pendingTasks.sort((a, b) => {
    const valA = (a.isCritical || a.priority === '🔴 ROJO') ? 3 : (a.priority === '🟡 AMARILLO' ? 2 : 1);
    const valB = (b.isCritical || b.priority === '🔴 ROJO') ? 3 : (b.priority === '🟡 AMARILLO' ? 2 : 1);
    return valB - valA;
  });

  const topTasks = pendingTasks.slice(0, 3);
  const completed = myTasks.filter(t => t.completed || t.status === 'Completada').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
      {/* Saludo y Contexto */}
      <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--crear-gold)' }}>
        <h2 className="text-white" style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
          👋 Hola, {currentUser?.displayName?.split(' ')[0] || 'Equipo'}
        </h2>
        <p className="text-gold" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} /> MODO CAMPO ACTIVO
        </p>
        <p className="text-muted" style={{ margin: '0.5rem 0 0 0' }}>
          Fase Actual: <strong>{currentStage}</strong> | Sede: <strong>{currentUser?.sede}</strong>
        </p>
      </div>

      {/* LO QUE TOCA HOY */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 className="text-blue" style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem' }}>
          <ListTodo size={20} /> QUÉ TOCA AHORA (Top 3)
        </h3>
        
        {loadingTasks ? (
          <p className="text-muted text-center" style={{ margin: '2rem 0' }}>Sincronizando tareas...</p>
        ) : topTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle2 size={48} color="var(--color-success)" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
            <p className="text-white" style={{ margin: '0 0 0.5rem', fontWeight: 'bold' }}>¡Estás al día!</p>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>No hay tareas urgentes pendientes para esta fase.</p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topTasks.map(task => {
              const isCrit = task.isCritical || task.priority === '🔴 ROJO';
              const color = isCrit ? 'var(--color-error)' : 'var(--crear-blue)';
              const bg = isCrit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 212, 255, 0.1)';
              
              return (
                <li 
                  key={task.id}
                  onClick={() => navigate(`/checklist/${currentUser?.appRole}`)}
                  style={{ 
                    padding: '1.2rem', 
                    background: bg, 
                    borderRadius: '12px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    border: `1px solid ${color}33`,
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {isCrit ? <AlertCircle size={24} color={color} style={{ flexShrink: 0 }} /> : <Circle size={24} color={color} style={{ flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <span className="text-white" style={{ fontSize: '1.05rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>
                      {task.task || task.title}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--crear-gold)' }}>
                      ⏰ Límite: {task.deadline || calculateAutomaticDeadline(task, currentCycle)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* BOTÓN PRINCIPAL */}
      <button 
        className="btn-primary" 
        onClick={() => navigate(`/checklist/${currentUser?.appRole}`)} 
        style={{ padding: '1.2rem', fontSize: '1.2rem', borderRadius: '12px', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }}
      >
        IR A MI CHECKLIST OPERATIVO
      </button>

      {/* ESTADÍSTICA RÁPIDA */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, textAlign: 'center' }}>
          <p className="text-muted" style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Tareas Pendientes</p>
          <p className="text-white" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{pendingTasks.length}</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, textAlign: 'center' }}>
          <p className="text-muted" style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Tareas Completadas</p>
          <p className="text-success" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{completed}</p>
        </div>
      </div>
    </div>
  );
}

```

---

### 📄 Archivo: `src/pages/home-views/HomeEjecutivo.jsx`

```javascript
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCycles } from '../../context/CyclesContext';
import { Target, Users, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

export default function HomeEjecutivo() {
  const { currentUser } = useAuth();
  const { currentStage } = useCycles();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Saludo y Contexto */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-white" style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>
            Hola, {currentUser?.displayName?.split(' ')[0] || 'Gerente'}
          </h2>
          <p className="text-muted" style={{ margin: 0 }}>
            Visión Global - Sede: <strong className="text-white">{currentUser?.sede || 'TODAS'}</strong>
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 'bold', border: '1px solid rgba(239,68,68,0.2)' }}>
            <ShieldCheck size={18} /> MODO EJECUTIVO
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        
        {/* DASHBOARD PRINCIPAL */}
        <div className="glass-panel hover-glow" onClick={() => navigate('/gerente')} style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,215,0,0) 100%)', border: '1px solid rgba(255,215,0,0.3)' }}>
          <Activity size={48} color="var(--crear-gold)" style={{ margin: '0 auto 1rem' }} />
          <h3 className="text-white" style={{ margin: '0 0 0.5rem' }}>Panel de Control</h3>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>Vista 360° de la operación, bloqueos y avance de cada rol en tiempo real.</p>
          <button className="btn-primary" style={{ marginTop: '1.5rem', width: '100%' }}>Entrar al Panel</button>
        </div>

        {/* METAS Y REPORTES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel hover-glow" onClick={() => navigate('/metas')} style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
            <div style={{ background: 'rgba(0, 212, 255, 0.1)', padding: '1rem', borderRadius: '50%' }}>
              <Target size={24} color="var(--crear-blue)" />
            </div>
            <div>
              <h4 className="text-white" style={{ margin: '0 0 0.3rem' }}>Metas del Ciclo</h4>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Revisar y definir objetivos Px y Aliados</p>
            </div>
          </div>

          <div className="glass-panel hover-glow" onClick={() => navigate('/reportes')} style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '50%' }}>
              <Users size={24} color="var(--text-main)" />
            </div>
            <div>
              <h4 className="text-white" style={{ margin: '0 0 0.3rem' }}>Reportes de Campo</h4>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Leer actualizaciones del equipo operativo</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

```

---

### 📄 Archivo: `src/pages/home-views/HomeOficina.jsx`

```javascript
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCycles } from '../../context/CyclesContext';
import { useChecklist } from '../../context/ChecklistContext';
import { AlertCircle, Circle, CheckCircle2, Target, Send, Users, Activity } from 'lucide-react';
import { calculateAutomaticDeadline } from '../../utils/soarDates';

export default function HomeOficina() {
  const { currentUser } = useAuth();
  const { currentCycle, currentStage } = useCycles();
  const { tasks: allTasks, loading: loadingTasks } = useChecklist();
  const navigate = useNavigate();

  const myTasks = allTasks.filter(t => t.role === currentUser?.appRole);
  
  // Contadores
  const completed = myTasks.filter(t => t.completed || t.status === 'Completada').length;
  const criticas = myTasks.filter(t => !t.completed && (t.isCritical || t.priority === '🔴 ROJO')).length;
  const importantes = myTasks.filter(t => !t.completed && t.status !== 'Completada' && !t.isCritical && t.priority !== '🔴 ROJO').length;

  // Tareas top
  const pendingTasks = myTasks.filter(t => !t.completed && t.status !== 'Completada' && t.status !== 'Pendiente de validación');
  pendingTasks.sort((a, b) => {
    const valA = (a.isCritical || a.priority === '🔴 ROJO') ? 3 : (a.priority === '🟡 AMARILLO' ? 2 : 1);
    const valB = (b.isCritical || b.priority === '🔴 ROJO') ? 3 : (b.priority === '🟡 AMARILLO' ? 2 : 1);
    return valB - valA;
  });
  const topTasks = pendingTasks.slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Saludo y Contexto */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-white" style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>
            Hola, {currentUser?.displayName?.split(' ')[0] || 'Coordinador'}
          </h2>
          <p className="text-muted" style={{ margin: 0 }}>
            Fase Actual: <strong className="text-white">{currentStage}</strong> | Sede: <strong className="text-white">{currentUser?.sede}</strong>
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,215,0,0.1)', color: 'var(--crear-gold)', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 'bold' }}>
            <Activity size={18} /> MODO OFICINA
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* RESUMEN DE CHECKLIST */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-blue" style={{ marginTop: 0, borderBottom: '1px solid rgba(0,212,255,0.2)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} /> Resumen de Checklist
          </h3>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li 
              onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=criticas`)}
              style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}
            >
              <AlertCircle size={18} /> <strong>{criticas}</strong> críticas (Requieren acción hoy)
            </li>
            <li 
              onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=importantes`)}
              style={{ padding: '0.8rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: '#ffb347', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}
            >
              <Circle size={18} /> <strong>{importantes}</strong> importantes
            </li>
            <li 
              onClick={() => navigate(`/checklist/${currentUser?.appRole}?filter=completed`)}
              style={{ padding: '0.8rem', background: 'rgba(52, 168, 83, 0.1)', borderRadius: '8px', color: 'var(--color-success)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(52, 168, 83, 0.2)' }}
            >
              <CheckCircle2 size={18} /> <strong>{completed}</strong> completadas
            </li>
          </ul>

          <button onClick={() => navigate(`/checklist/${currentUser?.appRole}`)} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            IR A MI CHECKLIST OPERATIVO
          </button>
        </div>

        {/* TU PRIORIDAD */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-gold" style={{ marginTop: 0, borderBottom: '1px solid rgba(255,215,0,0.2)', paddingBottom: '0.5rem' }}>
            Tu Prioridad (Top 3)
          </h3>
          
          {loadingTasks ? (
            <p className="text-muted">Buscando tareas urgentes...</p>
          ) : topTasks.length === 0 ? (
             <p className="text-muted" style={{ padding: '1rem 0' }}>No tienes tareas urgentes pendientes. ¡Buen trabajo!</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {topTasks.map(task => {
                const isCrit = task.isCritical || task.priority === '🔴 ROJO';
                const color = isCrit ? 'var(--color-error)' : 'var(--crear-blue)';
                
                return (
                  <li 
                    key={task.id}
                    onClick={() => navigate(`/checklist/${currentUser?.appRole}`)}
                    style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.8rem', border: `1px solid ${color}33` }}
                  >
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }}></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="text-white" style={{ fontSize: '0.9rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.task || task.title}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--crear-gold)', fontWeight: 'bold' }}>
                        ⏰ Límite: {task.deadline || calculateAutomaticDeadline(task, currentCycle)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </div>

      {/* ACCESOS DIRECTOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel hover-glow" onClick={() => navigate('/metas')} style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer' }}>
          <Target size={32} color="var(--crear-gold)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 className="text-white" style={{ margin: '0 0 0.5rem' }}>Mis Metas</h4>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Revisa avance Px y Aliados</p>
        </div>
        <div className="glass-panel hover-glow" onClick={() => navigate('/reportes')} style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer' }}>
          <Send size={32} color="var(--crear-blue)" style={{ margin: '0 auto 0.5rem' }} />
          <h4 className="text-white" style={{ margin: '0 0 0.5rem' }}>Reportes</h4>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Evidencias y estado general</p>
        </div>
      </div>
    </div>
  );
}

```

---

### 📄 Archivo: `src/services/firebase.js`

```javascript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

if (!apiKey || !projectId) {
  console.warn("⚠️ [Seguridad] Variables de entorno de Firebase no detectadas. Asegúrate de configurar el archivo .env");
}

const firebaseConfig = {
  apiKey: apiKey || "",
  authDomain: authDomain || "",
  projectId: projectId || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
// const analytics = getAnalytics(app); // Opcional, lo dejamos comentado por ahora si no está configurado

export { db, auth, googleProvider };

```

---

### 📄 Archivo: `src/services/googleSync.js`

```javascript
// src/services/googleSync.js

/**
 * Formatea una fecha a la estructura requerida por Google Calendar Web URL (YYYYMMDDTHHmmssZ)
 */
function formatGoogleCalendarDate(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace(/-|:|\.\d+/g, '');
}

/**
 * Genera una URL de plantilla directa para Google Calendar (100% Funcional sin depender de tokens)
 */
export const generateGoogleCalendarUrl = (eventDetails) => {
  const text = encodeURIComponent(eventDetails.summary || eventDetails.nombre || eventDetails.name || 'Evento CREAR PSL');
  const details = encodeURIComponent(
    `Entrenador: ${eventDetails.trainer || eventDetails.equipo || 'Por Confirmar'}\n${eventDetails.description || eventDetails.detalles || ''}\n\nOrganizado por CREAR Poder Sin Límites`
  );
  const location = encodeURIComponent(eventDetails.location || eventDetails.direccion || eventDetails.lugar || eventDetails.sede || '');
  
  const startFormatted = formatGoogleCalendarDate(eventDetails.start || eventDetails.fecha_inicio);
  let endFormatted = formatGoogleCalendarDate(eventDetails.end || eventDetails.fecha_fin);
  
  if (!endFormatted && startFormatted) {
    // Si no hay fecha fin, asignar 2 horas después
    const endDate = new Date(new Date(eventDetails.start || eventDetails.fecha_inicio).getTime() + 2 * 60 * 60 * 1000);
    endFormatted = formatGoogleCalendarDate(endDate);
  }

  const dates = `${startFormatted}/${endFormatted}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
};

/**
 * Genera y descarga un archivo .ICS para agregar a cualquier calendario (Google, Outlook, Apple)
 */
export const downloadIcsFile = (eventDetails) => {
  const title = eventDetails.summary || eventDetails.nombre || eventDetails.name || 'Evento CREAR PSL';
  const description = (eventDetails.description || eventDetails.detalles || '').replace(/\n/g, '\\n');
  const location = eventDetails.location || eventDetails.direccion || eventDetails.sede || '';
  const start = formatGoogleCalendarDate(eventDetails.start || eventDetails.fecha_inicio);
  const end = formatGoogleCalendarDate(eventDetails.end || eventDetails.fecha_fin || new Date(new Date(eventDetails.start).getTime() + 2 * 3600000));

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CREAR Poder Sin Limites//Calendar//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const createGoogleTask = async (taskDetails, token) => {
  if (!token) return { success: false, error: 'No token' };
  
  try {
    const task = {
      title: taskDetails.title,
      notes: taskDetails.description || '',
      due: taskDetails.dueDate ? new Date(taskDetails.dueDate).toISOString() : undefined,
    };

    const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(task)
    });

    if (!res.ok) {
      let errorMsg = res.statusText;
      try {
        const errData = await res.json();
        if (errData.error?.message) errorMsg = errData.error.message;
      } catch (e) {}
      throw new Error(`Google Tasks API Error: ${errorMsg}`);
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error creando tarea en Google Tasks:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Agendador Híbrido Inteligente (Zero-Failure):
 * 1. Intenta vía API si hay token activo y válido.
 * 2. Si el token expiró o falta, abre directamente Google Calendar con el evento prellenado sin fallar.
 */
export const createGoogleEvent = async (eventDetails, token) => {
  // Si hay token, intentamos sincronizar directamente vía REST API
  if (token) {
    try {
      const event = {
        summary: eventDetails.summary || eventDetails.nombre || 'Evento CREAR PSL',
        location: eventDetails.location || eventDetails.direccion || eventDetails.sede || '',
        description: eventDetails.description || `Entrenador: ${eventDetails.trainer || 'TBA'}\n${eventDetails.detalles || ''}`,
        start: {
          dateTime: new Date(eventDetails.start).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(eventDetails.end || new Date(new Date(eventDetails.start).getTime() + 2 * 3600000)).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, via: 'api', data };
      }
    } catch (apiErr) {
      console.warn("Fallo de API Calendar, usando redirección directa Web:", apiErr);
    }
  }

  // FALLBACK SEGURO 100%: Abrir directamente la plantilla de Google Calendar
  try {
    const calendarUrl = generateGoogleCalendarUrl(eventDetails);
    window.open(calendarUrl, '_blank', 'noopener,noreferrer');
    return { success: true, via: 'web', openedUrl: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

```

---

### 📄 Archivo: `src/services/userService.js`

```javascript
// Servicio de Directorio y Gestión de Usuarios para Producción
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { usersData, normalizeRole } from '../data/usersData';

/**
 * Busca y verifica un usuario en Firestore por email.
 * Si no existe en Firestore, consulta el seed inicial de usersData.
 */
export async function getVerifiedUser(email) {
  if (!email) return null;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0].data();
      return {
        ...userDoc,
        appRole: normalizeRole(userDoc.role)
      };
    }
  } catch (error) {
    console.warn("Firestore directory query fallback to local registry:", error.message);
  }

  // Fallback seguro al registro predefinido
  const localMatch = usersData.find(u => u.email.toLowerCase() === normalizedEmail);
  if (localMatch) {
    return {
      ...localMatch,
      appRole: normalizeRole(localMatch.role)
    };
  }

  return null;
}

```

---

### 📄 Archivo: `src/utils/flags.js`

```javascript
export { getFlagForSede } from './flags.jsx';

```

---

### 📄 Archivo: `src/utils/flags.jsx`

```javascript
export const getFlagForSede = (sede) => {
  if (!sede) return '🌎';
  const s = sede.toLowerCase();

  if (s.includes('ecuador') || s.includes('uio') || s.includes('quito') || s.includes('guayaquil') || s.includes('gye') || s.includes('cuenca') || s.includes('cue')) {
    return '🇪🇨';
  }
  if (s.includes('lima') || s.includes('lim') || s.includes('peru') || s.includes('perú')) {
    return '🇵🇪';
  }
  if (s.includes('colombia') || s.includes('med') || s.includes('medellin') || s.includes('medellín') || s.includes('bogota') || s.includes('bogotá')) {
    return '🇨🇴';
  }
  if (s.includes('mexico') || s.includes('mex') || s.includes('mx') || s.includes('méxico')) {
    return '🇲🇽';
  }
  
  return '🌎'; // Global / Multinacional
};

```

---

### 📄 Archivo: `src/utils/soarDates.js`

```javascript
// Sistema de Cálculo Automático de Fechas y Horas Límite SO-AR
// Conecta la información de los manuales operativos con las fechas del ciclo activo

import { cyclesData } from '../data/cyclesData';

const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// Reglas relativas extraídas de los manuales del SO-AR
const TASK_DEADLINE_RULES = {
  // --- GATE T-30 ---
  't30_presupuesto': { base: 'c1_start', offsetDays: -30, time: '18:00', label: 'T-30' },
  't30_salon': { base: 'c1_start', offsetDays: -30, time: '18:00', label: 'T-30' },
  't30_entrenador': { base: 'c1_start', offsetDays: -30, time: '18:00', label: 'T-30' },
  't30_hotel': { base: 'c1_start', offsetDays: -30, time: '18:00', label: 'T-30' },
  't30_vuelo': { base: 'c1_start', offsetDays: -30, time: '18:00', label: 'T-30' },

  // --- GATE T-21 a T-7 ---
  't21_censo': { base: 'c1_start', offsetDays: -21, time: '18:00', label: 'T-21' },
  't14_apoyo': { base: 'c1_start', offsetDays: -14, time: '18:00', label: 'T-14' },
  't7_freeze': { base: 'c1_start', offsetDays: -7, time: '18:00', label: 'T-7' },
  't7_uniformes': { base: 'c1_start', offsetDays: -7, time: '18:00', label: 'T-7' },

  // --- C1 ---
  'c1_registro': { base: 'c1_start', offsetDays: 0, time: '08:00', label: 'C1 Viernes 08:00' },
  'c1_contencion': { base: 'c1_start', offsetDays: 0, time: '19:00', label: 'C1 Viernes 19:00' },

  // --- POST C1 ---
  'postc1_devolucion': { base: 'c1_start', offsetDays: 3, time: '12:00', label: 'Lunes POST-C1' },
  'postc1_rezagados': { base: 'c1_start', offsetDays: 4, time: '18:00', label: 'Martes POST-C1' },

  // --- C2 ---
  'c2_grounding': { base: 'c2_start', offsetDays: 0, time: '07:30', label: 'C2 Viernes 07:30' },
  'c2_mesas': { base: 'c2_start', offsetDays: 0, time: '16:00', label: 'C2 Viernes 16:00' },
  'gatec2_grounding': { base: 'c2_start', offsetDays: -1, time: '18:00', label: 'Jueves Pre-C2' },
  'gatec2_rezagados': { base: 'c2_start', offsetDays: -1, time: '19:00', label: 'Jueves Pre-C2' },

  // --- PRE-MJ ---
  'premj_managers': { base: 'maestria_start', offsetDays: -7, time: '18:00', label: 'T-7 MJ' },
  'premj_entrenador': { base: 'maestria_start', offsetDays: -7, time: '18:00', label: 'T-7 MJ' },

  // --- MAESTRÍA (MJ) ---
  'mj_registro': { base: 'maestria_start', offsetDays: 0, time: '08:00', label: 'MJ Viernes 08:00' },
  'mj_imposibles': { base: 'maestria_start', offsetDays: 1, time: '15:00', label: 'MJ Sábado 15:00' },

  // --- POST-MAESTRÍA ---
  'cmj_post_1': { base: 'maestria_start', offsetDays: 4, time: '18:00', label: 'Lunes Post-MJ 18:00' },
  'cmj_post_2': { base: 'maestria_start', offsetDays: 5, time: '18:00', label: 'Martes Cierre de Oro 18:00' },
  'cierre_mj_oro': { base: 'maestria_end', offsetDays: 0, time: '20:00', label: 'Domingo MJ' }
};

/**
 * Calcula la fecha y hora límite automática de una tarea según el ciclo SO-AR
 * @param {Object} task - La tarea del checklist
 * @param {Object} cycle - El ciclo activo (o default a cyclesData[0])
 * @returns {String} Fecha y hora límite calculada automáticamente (ej. '2026-08-07 09:00')
 */
export const calculateAutomaticDeadline = (task, cycle = null) => {
  if (!task) return '';
  
  // Si la tarea ya tiene una fecha manual personalizada asignada por el Gerente, respetarla
  if (task.deadline && task.deadline.includes('-') && task.deadline.includes(':')) {
    return task.deadline;
  }

  const activeCycle = cycle || (cyclesData && cyclesData.length > 0 ? cyclesData[0] : null);
  if (!activeCycle) {
    return task.deadline || 'Pendiente de ciclo';
  }

  const rule = TASK_DEADLINE_RULES[task.id];
  if (rule) {
    const baseDate = activeCycle[rule.base] || activeCycle.c1_start;
    if (baseDate) {
      const calculatedDate = addDays(baseDate, rule.offsetDays);
      return `${calculatedDate} ${rule.time}`;
    }
  }

  // Fallback inteligente basado en la fase del ciclo
  const phase = task.cyclePhase || 'PRE-C1';
  let fallbackBase = activeCycle.c1_start;
  let fallbackOffset = 0;

  if (phase === 'GATE 1') {
    fallbackBase = activeCycle.c1_start;
    fallbackOffset = -28;
  } else if (phase === 'PRE-C1') {
    fallbackBase = activeCycle.c1_start;
    fallbackOffset = -3;
  } else if (phase === 'C1') {
    fallbackBase = activeCycle.c1_start;
    fallbackOffset = 0;
  } else if (phase === 'POST-C1') {
    fallbackBase = activeCycle.c1_start;
    fallbackOffset = 3;
  } else if (phase === 'C2') {
    fallbackBase = activeCycle.c2_start || activeCycle.c1_start;
    fallbackOffset = 0;
  } else if (phase === 'PRE-MJ' || phase === 'MJ') {
    fallbackBase = activeCycle.maestria_start || activeCycle.c2_start || activeCycle.c1_start;
    fallbackOffset = 0;
  } else if (phase === 'POST-MJ') {
    fallbackBase = activeCycle.maestria_start || activeCycle.c1_start;
    fallbackOffset = 4;
  }

  if (fallbackBase) {
    const calculatedDate = addDays(fallbackBase, fallbackOffset);
    return `${calculatedDate} 18:00`;
  }

  return task.deadline || 'Fecha según ciclo';
};

```

---

### 📄 Archivo: `vite.config.js`

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})

```

---

