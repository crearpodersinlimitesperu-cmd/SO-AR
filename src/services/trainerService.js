import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// ============================================================================
// SERVICIO PARA ENTRENADORES DE SALÓN (C1, C2, MJ)
// ============================================================================

/**
 * Obtiene el Feedback "Zero-Ego" Direccional.
 * Este feedback es estrictamente entre Dirección y el Entrenador.
 */
export async function getZeroEgoFeedback(trainerEmail) {
  // En producción, consulta a 'directional_feedback' where trainerEmail == email
  // Mockeamos la data según el PRD
  
  const mockData = [
    {
      id: 'fbk_001',
      trainer: 'alonso',
      title: 'Estructura Conversacional',
      content: 'Alonso, recuerda anclar el cierre de la dinámica de los botes salvavidas con la teoría NEC antes del break. La energía bajó en Lima la semana pasada. Aplica el ajuste.',
      date: '2026-09-30T10:00:00Z',
      acknowledged: false,
      from: 'Dirección General'
    },
    {
      id: 'fbk_002',
      trainer: 'mike',
      title: 'Postura y Pulcritud',
      content: 'Mike, necesitamos mayor rigurosidad en la vestimenta del domingo de C2. Eres la máxima autoridad de la sala. Código de vestimenta oficial estricto, sin excepciones.',
      date: '2026-10-01T08:30:00Z',
      acknowledged: false,
      from: 'Dirección General'
    },
    {
      id: 'fbk_003',
      trainer: 'cirilo',
      title: 'Ortografía en Proyecciones',
      content: 'Cirilo, se reportaron errores ortográficos en los slides de las 4 Fases en Ecuador. El léxico debe ser impecable. Revisa la presentación antes de conectarla.',
      date: '2026-09-28T14:15:00Z',
      acknowledged: true, // Ya lo reconoció
      from: 'Dirección General'
    }
  ];

  if (!trainerEmail) return [];

  // Filtrado simulado para el usuario activo (en MVP mostramos si coincide el nombre en el email)
  const relevantMock = mockData.filter(m => trainerEmail.toLowerCase().includes(m.trainer));
  
  // Si no hay específicos (porque es Fer Aragón, Andrés o Marcos), devolvemos uno genérico de prueba
  if (relevantMock.length === 0) {
    return [{
      id: `fbk_gen_${Date.now()}`,
      title: 'Calibración NEC Global',
      content: 'Recuerda que la "Transformación" ya no es el concepto oficial. Toda narrativa en salón debe girar en torno a la "Creación de Poder sin Límites" (Tecnología NEC). Adapta tu discurso en la apertura.',
      date: new Date().toISOString(),
      acknowledged: false,
      from: 'Dirección Académica'
    }];
  }

  return relevantMock;
}

export async function acknowledgeFeedback(feedbackId) {
  try {
    // Si estuviéramos en producción real:
    // await updateDoc(doc(db, 'directional_feedback', feedbackId), {
    //   acknowledged: true,
    //   acknowledgedAt: serverTimestamp()
    // });
    
    return true; // Mock success
  } catch (error) {
    console.error("Error reconociendo feedback:", error);
    return false;
  }
}

/**
 * Obtiene el Briefing de Sesión del Coordinador
 */
export async function getTrainerBriefing(sede) {
  return null;
}

/**
 * Catálogo de Entrenamientos Complementarios
 */
export async function getComplementaryModules() {
  return [
    { id: 'm1', title: 'Módulo de Liderazgo Cuántico', duration: '4h', level: 'Avanzado', focus: 'Identidad y Postura' },
    { id: 'm2', title: 'Neuroventas y Cierre (Vende sin Vender)', duration: '8h', level: 'Intermedio', focus: 'Enrolamiento' },
    { id: 'm3', title: 'Inteligencia Financiera NEC', duration: '6h', level: 'Básico', focus: 'Finanzas Personales' },
    { id: 'm4', title: 'Sanación de Relaciones Causa-Efecto', duration: '5h', level: 'Profundo', focus: 'Vulnerabilidad y Perdón' },
    { id: 'm5', title: 'Mastermind: Arquitectura de Metas', duration: '4h', level: 'Avanzado', focus: 'Planificación' },
  ];
}
