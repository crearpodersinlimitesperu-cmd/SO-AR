import { db } from './firebase';
import { 
  collection, addDoc, getDocs, updateDoc, doc, getDoc,
  query, where, orderBy, arrayUnion, writeBatch, increment
} from 'firebase/firestore';

export const ExcellenceService = {
  
  // 1. REGISTRAR NUEVO ESTÁNDAR DE EXCELENCIA
  async captureNewStandard(task, standardData, currentUser) {
    try {
      const standardEntry = {
        taskId: task.id,
        taskTitle: task.task || task.title || 'Sin Título',
        discoveredBy: {
          userId: currentUser.uid || currentUser.email,
          name: currentUser.name || currentUser.displayName || 'Líder',
          role: currentUser.appRole || 'miembro',
          sede: currentUser.sede || 'Global'
        },
        
        // LA NUEVA VERDAD OPERATIVA
        newStandard: {
          title: standardData.title,
          description: standardData.description,
          replaces: standardData.replaces,
          newReality: standardData.newReality || '',
          corePrinciple: standardData.corePrinciple
        },
        
        // EVIDENCIA DE TRANSFORMACIÓN
        evidence: {
          appliedIn: standardData.appliedIn || [currentUser.sede || 'Global'],
          transformationImpact: {
            timeReduction: standardData.timeReduction || null,
            errorElimination: standardData.errorElimination || null,
            participantSatisfaction: standardData.participantSatisfaction || null,
            teamAdoptionRate: standardData.teamAdoptionRate || null
          }
        },
        
        // NUEVA REALIDAD OPERATIVA
        newReality: {
          whatChanges: standardData.whatChanges || [],
          newSkills: standardData.newSkills || [],
          obsoletePractices: standardData.obsoletePractices || []
        },
        
        // EXPANSIÓN AUTOMÁTICA
        expansion: {
          roles: standardData.roles || [currentUser.appRole],
          sedes: standardData.sedes || ['Todas'],
          phases: standardData.phases || [task.cyclePhase || 'GLOBAL'],
          autoApply: standardData.autoApply !== false
        },
        
        status: 'DESCUBIERTO',
        validationVotes: 0,
        validatedBy: null,
        validatedAt: null,
        
        // IMPACTO EN EL SISTEMA
        systemImpact: {
          checklistsUpdated: [],
          newChecklistCreated: [],
          trainingsUpdated: [],
          deprecatedTasks: []
        },
        
        tags: standardData.tags || [],
        createdAt: new Date().toISOString()
      };
      
      // Guardar en Firestore
      const docRef = await addDoc(collection(db, 'excellence_standards'), standardEntry);
      standardEntry.id = docRef.id;
      
      // 2. Notificar a toda la cadena de liderazgo
      await this.notifyLeadershipChain(standardEntry);
      
      // 3. Si es auto-aplicable, iniciar validación
      if (standardEntry.expansion.autoApply) {
        await this.initiateValidation(standardEntry);
      }
      
      return { success: true, id: docRef.id, data: standardEntry };
      
    } catch (error) {
      console.error('Error capturing new standard:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 2. NOTIFICAR CADENA DE LIDERAZGO
  async notifyLeadershipChain(standard) {
    try {
      // Buscar líderes de alto rendimiento
      const leadersQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['gerente', 'direccion', 'director_maestria', 'superadmin'])
      );
      const leadersSnap = await getDocs(leadersQuery);
      
      const batch = writeBatch(db);
      
      leadersSnap.forEach((docSnapshot) => {
        const leader = docSnapshot.data();
        if (!leader.email) return;
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: leader.email,
          type: 'NEW_EXCELLENCE_STANDARD',
          title: `🌟 Nueva Excelencia: ${standard.newStandard.title}`,
          message: `${standard.discoveredBy.name} (${standard.discoveredBy.role}) ha descubierto una nueva verdad operativa en "${standard.taskTitle}"`,
          standardId: standard.id,
          priority: 'HIGH',
          requiresAction: true,
          read: false,
          created_at: new Date().toISOString()
        });
      });
      
      await batch.commit();
      
    } catch (error) {
      console.error('Error notifying leadership:', error);
    }
  },
  
  // 3. INICIAR VALIDACIÓN
  async initiateValidation(standard) {
    try {
      // Crear tarea de validación para liderazgo
      await addDoc(collection(db, 'tasks'), {
        task: `[VALIDACIÓN EXCELENCIA] ${standard.newStandard.title}`,
        description: `Validar nuevo estándar de excelencia descubierto por ${standard.discoveredBy.name}: ${standard.newStandard.corePrinciple}`,
        role: 'gerente',
        cyclePhase: standard.expansion.phases[0] || 'GLOBAL',
        isCritical: true,
        isValidation: true,
        standardId: standard.id,
        created_by: 'system',
        created_at: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error initiating validation:', error);
    }
  },
  
  // 4. CODIFICAR COMO NUEVO ESTÁNDAR (TRANSFORMACIÓN)
  async codifyAsNewStandard(standardId, validatorUser) {
    try {
      const standardRef = doc(db, 'excellence_standards', standardId);
      const standardSnap = await getDoc(standardRef);
      
      if (!standardSnap.exists()) {
        return { success: false, error: 'Standard not found' };
      }
      
      const standard = standardSnap.data();
      const batch = writeBatch(db);
      
      // 1. Actualizar estado del estándar
      batch.update(standardRef, {
        status: 'NUEVO_ESTANDAR',
        validatedBy: validatorUser.email || validatorUser.uid,
        validatedAt: new Date().toISOString(),
        validationVotes: increment(1)
      });
      
      // 2. CREAR NUEVO CHECKLIST (No actualizar, CREAR)
      const newTaskId = `excellence_${Date.now()}`;
      const taskRef = doc(db, 'tasks', newTaskId);
      batch.set(taskRef, {
        id: newTaskId,
        task: `[NUEVO ESTÁNDAR] ${standard.newStandard.title}`,
        role: standard.expansion.roles[0] || 'qt',
        cyclePhase: standard.expansion.phases[0] || 'PRE-C1',
        isCritical: true,
        isExcellenceStandard: true,
        standardId: standardId,
        originalTaskId: standard.taskId,
        replaces: standard.newStandard.replaces,
        newReality: standard.newStandard.newReality,
        description: standard.newStandard.description,
        corePrinciple: standard.newStandard.corePrinciple,
        created_by: 'system',
        created_at: new Date().toISOString()
      });
      
      // 3. DEPRECAR TAREAS ANTIGUAS (si aplica en el futuro)
      // 4. REGISTRAR IMPACTO
      batch.update(standardRef, {
        'systemImpact.newChecklistCreated': arrayUnion(newTaskId),
        'systemImpact.trainingsUpdated': arrayUnion(`${standard.discoveredBy.role} Training v2.0`)
      });
      
      await batch.commit();
      
      // 5. NOTIFICAR A TODA LA MANADA
      await this.notifyManada({id: standardId, ...standard});
      
      return { success: true, newTaskId };
      
    } catch (error) {
      console.error('Error codifying standard:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 5. NOTIFICAR A TODA LA MANADA
  async notifyManada(standard) {
    try {
      if (!standard.expansion || !standard.expansion.roles || standard.expansion.roles.length === 0) return;
      
      // Notificar a todos los roles aplicables
      const usersQuery = query(
        collection(db, 'users'),
        where('role', 'in', standard.expansion.roles)
      );
      const usersSnap = await getDocs(usersQuery);
      
      const batch = writeBatch(db);
      
      usersSnap.forEach((docSnapshot) => {
        const user = docSnapshot.data();
        if (!user.email) return;
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: user.email,
          type: 'NEW_STANDARD_ANNOUNCEMENT',
          title: `🔥 Nueva Excelencia: ${standard.newStandard.title}`,
          message: `La manada ha descubierto una nueva verdad: ${standard.newStandard.corePrinciple}`,
          standardId: standard.id,
          requiresAction: false,
          read: false,
          created_at: new Date().toISOString()
        });
      });
      
      await batch.commit();
      
    } catch (error) {
      console.error('Error notifying manada:', error);
    }
  }
};
