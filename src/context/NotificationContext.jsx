import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import { getNotificationToast, normalizeEmail } from '../utils/notificationMessages';

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
    // 🔒 AISLAMIENTO ESTRICTO DE PRIVACIDAD ENTRE USUARIOS Y SIMULACIONES:
    // Limpiar inmediatamente notificaciones previas en memoria para evitar cualquier
    // cruce visual de alertas entre José Sánchez, Josué Vera o cualquier otro perfil.
    setNotifications([]);
    setUnreadCount(0);

    const targetEmail = normalizeEmail(currentUser?.email);
    if (!targetEmail) {
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', targetEmail)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = [];
      let newUnreadCount = 0;
      let hasNew = false;

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Solo notificar si pertenece exactamente al usuario activo
          if (normalizeEmail(data.userId) === targetEmail && !data.read && data.created_at) {
             const isRecent = (new Date() - new Date(data.created_at)) < 10000;
             if (isRecent) {
                 hasNew = true;
                 showToast(getNotificationToast(data), "info");
             }
          }
        }
      });

      snapshot.forEach((doc) => {
        const data = doc.data();
        // FILTRADO DETERMINISTA DE SEGURIDAD:
        // Asegurar que bajo ninguna circunstancia se incorpore una notificación que no sea del targetEmail
        if (normalizeEmail(data.userId) === targetEmail) {
          notifs.push({ id: doc.id, ...data });
          if (!data.read) newUnreadCount++;
        }
      });

      // Orden descendente por fecha
      notifs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      setNotifications(notifs);
      setUnreadCount(newUnreadCount);

      if (hasNew) {
        playNotificationSound();
      }
    }, (error) => {
      console.error("Error fetching notifications for", targetEmail, error);
      // En caso de error o permiso denegado (ej. durante simulación), garantizar aislamiento total
      setNotifications([]);
      setUnreadCount(0);
    });

    return () => {
      unsubscribe();
      setNotifications([]);
      setUnreadCount(0);
    };
  }, [currentUser?.email, currentUser?.isSimulated]);

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
