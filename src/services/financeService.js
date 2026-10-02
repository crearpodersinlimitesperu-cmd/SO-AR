import { collection, doc, getDocs, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function getHQOperationalStatus() {
  const hqStatuses = [];
  try {
    const snap = await getDocs(collection(db, 'hq_operational_status'));
    snap.forEach(doc => {
      hqStatuses.push({ id: doc.id, ...doc.data() });
    });
    return hqStatuses;
  } catch (error) {
    console.error("Error fetching HQ status:", error);
    return [];
  }
}

export async function toggleHQBlock(sedeId, isBlocked, blockedBy, reason = '') {
  try {
    const hqRef = doc(db, 'hq_operational_status', sedeId);
    await setDoc(hqRef, {
      sede: sedeId,
      isBlocked,
      blockedBy,
      blockedAt: isBlocked ? serverTimestamp() : null,
      reason: isBlocked ? reason : ''
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error toggling HQ block:", error);
    return false;
  }
}

// Mock Data para el Dashboard Financiero MVP (mientras se integra la API bancaria)
export const mockFinancialData = [
  { sede: 'Lima', contadores: ['Karol Villarruel'], nodusIncome: 125000, bankConciliated: 125000, pendingExpenses: 15000, slaStatus: 'COMPLETED', isBlocked: false },
  { sede: 'México', contadores: ['Carlos Slim Jr'], nodusIncome: 85000, bankConciliated: 83500, pendingExpenses: 8000, slaStatus: 'WARNING', isBlocked: false },
  { sede: 'Colombia', contadores: ['Ana María'], nodusIncome: 45000, bankConciliated: 30000, pendingExpenses: 5000, slaStatus: 'VIOLATION', isBlocked: true },
  { sede: 'Ecuador', contadores: ['Luis Pérez'], nodusIncome: 65000, bankConciliated: 65000, pendingExpenses: 12000, slaStatus: 'COMPLETED', isBlocked: false }
];
