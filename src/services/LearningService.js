import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';

export const LearningService = {
  
  // REGISTRAR APRENDIZAJE AL COMPLETAR TAREA
  async captureLearning(task, completionData, currentUser) {
    try {
      const learningEntry = {
        taskId: task.id,
        taskTitle: task.task || task.title || 'Tarea sin título',
        userId: currentUser.uid || currentUser.email,
        userEmail: currentUser.email,
        userName: currentUser.name || currentUser.displayName || 'Usuario',
        role: currentUser.appRole || 'miembro',
        sede: currentUser.sede || 'Global',
        
        // Datos de ejecución
        completedAt: new Date().toISOString(),
        timeSpent: completionData.timeSpent || null,
        difficulty: completionData.difficulty || null,
        
        // Reflexión del usuario
        whatWorked: completionData.whatWorked || '',
        whatFailed: completionData.whatFailed || '',
        insights: completionData.insights || '',
        recommendation: completionData.recommendation || '',
        
        // Tags automáticos
        tags: this.generateTags(task, currentUser),
        
        // Métricas de impacto
        impact: completionData.impact || {},
        
        createdAt: new Date().toISOString(),
        schemaVersion: 1
      };
      
      // 1. Guardar en Firestore
      const docRef = await addDoc(collection(db, 'learning_logs'), learningEntry);
      
      // 2. Procesar aprendizaje (actualizar modelos, patrones, etc.)
      await this.processLearning(learningEntry);
      
      // 3. Notificar si es un patrón de éxito
      await this.checkForPatterns(learningEntry);
      
      return { success: true, id: docRef.id, data: learningEntry };
      
    } catch (error) {
      console.error('Error capturing learning:', error);
      return { success: false, error: error.message };
    }
  },
  
  // GENERAR TAGS AUTOMÁTICAMENTE
  generateTags(task, user) {
    const tags = [];
    
    // Tags por fase del ciclo
    if (task.cyclePhase) tags.push(task.cyclePhase.toLowerCase());
    
    // Tags por rol
    if (user.appRole) tags.push(user.appRole);
    
    // Tags por tipo de tarea
    if (task.isCritical) tags.push('critico');
    if (task.priority?.includes('ROJO')) tags.push('urgente');
    
    // Tags por área funcional
    const areaKeywords = ['logística', 'comunicación', 'finanzas', 'participantes', 'entrenamiento'];
    areaKeywords.forEach(keyword => {
      if ((task.task || task.title || '').toLowerCase().includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    return [...new Set(tags)];
  },
  
  // PROCESAR APRENDIZAJE (Actualizar estadísticas, patrones, etc.)
  async processLearning(learningEntry) {
    try {
      // Actualizar estadísticas de usuario
      await this.updateUserStats(learningEntry.userId, learningEntry);
      
      // En el futuro: Detectar si hay una mejora de proceso, etc.
      
    } catch (error) {
      console.error('Error processing learning:', error);
    }
  },
  
  // ACTUALIZAR ESTADÍSTICAS DE USUARIO
  async updateUserStats(userId, learning) {
    if (!userId) return;
    const userStatsRef = doc(db, 'user_stats', userId);
    const userStats = await getDoc(userStatsRef);
    
    const current = userStats.exists() ? userStats.data() : {
      totalTasks: 0,
      avgTime: 0,
      successRate: 0,
      expertise: {},
      learningContributions: 0,
      name: learning.userName
    };
    
    const newTotal = (current.totalTasks || 0) + 1;
    const currentAvgTime = current.avgTime || 0;
    const learningTime = learning.timeSpent || 0;
    const newAvgTime = ((currentAvgTime * (current.totalTasks || 0)) + learningTime) / newTotal;
    
    // Actualizar expertise por tags
    const expertise = { ...current.expertise };
    learning.tags.forEach(tag => {
      expertise[tag] = (expertise[tag] || 0) + 1;
    });
    
    await setDoc(userStatsRef, {
      ...current,
      name: current.name || learning.userName, // Asegurar que tengamos el nombre para el dashboard
      totalTasks: newTotal,
      avgTime: newAvgTime,
      expertise,
      learningContributions: (current.learningContributions || 0) + 1,
      lastLearningAt: new Date().toISOString()
    }, { merge: true });
  },
  
  // DETECTAR PATRONES DE ÉXITO
  async checkForPatterns(learning) {
    if (!learning.taskId) return;
    // Buscar tareas similares completadas exitosamente
    const similarTasks = await this.findSimilarTasks(learning.taskId);
    
    if (similarTasks.length >= 3) {
      // Si 3 o más personas hicieron lo mismo con éxito, es un patrón
      const pattern = {
        taskId: learning.taskId,
        taskTitle: learning.taskTitle,
        tags: learning.tags,
        successCount: similarTasks.length + 1,
        avgTime: this.calculateAverageTime(similarTasks, learning),
        commonInsights: this.extractCommonInsights(similarTasks, learning),
        bestPractices: this.extractBestPractices(similarTasks, learning),
        createdAt: new Date().toISOString()
      };
      
      // Guardar patrón en Firestore
      // Podríamos optimizar para no crear un doc nuevo por cada vez, sino actualizar el patrón si ya existe
      const patternsQuery = query(collection(db, 'success_patterns'), where('taskId', '==', learning.taskId));
      const patternsSnap = await getDocs(patternsQuery);
      
      if (patternsSnap.empty) {
        await addDoc(collection(db, 'success_patterns'), pattern);
      } else {
        const patternDoc = patternsSnap.docs[0];
        await setDoc(doc(db, 'success_patterns', patternDoc.id), pattern, { merge: true });
      }
    }
  },

  async findSimilarTasks(taskId) {
    const q = query(
      collection(db, 'learning_logs'),
      where('taskId', '==', taskId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },

  calculateAverageTime(similarTasks, newLearning) {
    const all = [...similarTasks, newLearning].filter(l => l.timeSpent && l.timeSpent > 0);
    if (all.length === 0) return 0;
    const sum = all.reduce((acc, curr) => acc + curr.timeSpent, 0);
    return Math.round(sum / all.length);
  },

  extractCommonInsights(similarTasks, newLearning) {
    // Implementación básica, en un sistema real esto usaría NLP
    const insights = [...similarTasks, newLearning].map(l => l.insights).filter(i => i && i.length > 5);
    return insights.slice(0, 3);
  },
  
  // EXTRAER MEJORES PRÁCTICAS
  extractBestPractices(similarTasks, newLearning) {
    const allPractices = [...similarTasks, newLearning]
      .map(l => l.whatWorked)
      .filter(Boolean);
    
    return allPractices.slice(0, 3);
  }
};
