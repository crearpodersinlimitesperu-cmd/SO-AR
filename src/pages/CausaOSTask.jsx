import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';

const CausaOSTask = () => {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState('Esperando para crear tarea...');

  const handleCreateTask = async () => {
    if (!currentUser) {
      setStatus('Error: Debes iniciar sesión primero.');
      return;
    }
    
    setStatus('Buscando coordinadores, managers y entrenadores...');
    
    try {
      // Obtener usuarios
      const usersSnap = await getDocs(collection(db, 'users'));
      const targetRoles = ["coord_maestria", "coordinador_mj", "director_maestria", "gerente", "direccion", "entrenador"];
      const targetEmails = [];
      
      usersSnap.forEach(userDoc => {
        const u = userDoc.data();
        let userHasTargetRole = false;

        if (targetRoles.includes(u.role) || targetRoles.includes(u.appRole)) {
            userHasTargetRole = true;
        }

        // Revisar array de multiples roles si existe
        if (Array.isArray(u.roles)) {
            if (u.roles.some(r => targetRoles.includes(r))) {
                userHasTargetRole = true;
            }
        }

        if (userHasTargetRole && u.email) {
            targetEmails.push(u.email.toLowerCase().trim());
        }
      });
      
      // Eliminar duplicados
      const uniqueEmails = [...new Set(targetEmails)];
      setStatus(`Encontrados ${uniqueEmails.length} usuarios. Creando tarea...`);
      
      // 6 hours from now
      const deadline = new Date(Date.now() + 6 * 60 * 60 * 1000);
      const yyyy = deadline.getFullYear();
      const mm = String(deadline.getMonth() + 1).padStart(2, '0');
      const dd = String(deadline.getDate()).padStart(2, '0');
      const hh = String(deadline.getHours()).padStart(2, '0');
      const min = String(deadline.getMinutes()).padStart(2, '0');
      const deadlineStr = `${yyyy}-${mm}-${dd}T${hh}:${min}`;

      const taskData = {
        title: "Cerrar la liquidación de pago de los que terminaron sus llamadas",
        task: "Cerrar la liquidación de pago de los que terminaron sus llamadas",
        description: "Actualización urgente generada por Causa OS para seguimiento coordinado. Managers y Entrenadores, dar seguimiento urgente para el cierre de liquidación de todos los graduados que terminaron sus llamadas.",
        priority: "🔴 ROJO",
        isCritical: true,
        assignedRoles: targetRoles,
        assignedToEmails: uniqueEmails,
        isCustom: true,
        createdBy: "Causa OS",
        createdByEmail: currentUser.email,
        assignedByName: "Causa OS (Colaborativo)",
        assignedByEmail: "causa.os@crearpsl.com",
        deadline: deadlineStr,
        deadlineTime: deadline.getTime(),
        created_at: new Date().toISOString(),
        collaborative: true,
        status: "Pendiente",
        completed: false,
        __direction: "asignada_por_mi"
      };

      const customId = `custom_causaos_${Date.now()}`;
      await setDoc(doc(db, 'tasks', customId), taskData);
      
      setStatus(`¡Éxito! Tarea creada y asignada a ${uniqueEmails.length} personas.`);
    } catch (error) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h2>Panel de Causa OS</h2>
      <p>Creación de Tarea Urgente (Colaborativa)</p>
      
      <button 
        onClick={handleCreateTask}
        style={{
          background: 'var(--crear-red)',
          color: 'white',
          padding: '1rem 2rem',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1.2rem',
          cursor: 'pointer',
          marginTop: '2rem',
          fontWeight: 'bold'
        }}
      >
        Crear Tarea Ahora
      </button>

      <p style={{ marginTop: '2rem', fontSize: '1.1rem', color: status.includes('Éxito') ? '#10b981' : 'var(--text-muted)' }}>
        {status}
      </p>
    </div>
  );
};

export default CausaOSTask;
