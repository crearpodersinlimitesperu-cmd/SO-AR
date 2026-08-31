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

