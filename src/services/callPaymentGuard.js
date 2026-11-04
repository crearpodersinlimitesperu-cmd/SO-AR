import { doc } from 'firebase/firestore';
import { callHistorySignature } from '../utils/callHistory.js';

export async function assertPaymentCallsUnchanged(db, transaction, item) {
  const stale = () => { throw new Error('Las llamadas cambiaron después de calcular este pago. Actualiza la liquidación y vuelve a revisarla.'); };
  if (item.tipo === 'individual') {
    const snapshot = await transaction.get(doc(db, 'managers_directory', item.managerId));
    if (!snapshot.exists() || callHistorySignature(snapshot.data().llamadasHistorial || []) !== item.callSignature) stale();
  } else {
    if (!item.callSnapshot?.length) stale();
    const snapshots = await Promise.all(item.callSnapshot.map(call =>
      transaction.get(doc(db, 'llamadas_grupales_historial', call.id))));
    snapshots.forEach((snapshot, index) => {
      if (!snapshot.exists() ||
          callHistorySignature([{ ...snapshot.data(), id: snapshot.id }]) !== item.callSnapshot[index].signature) stale();
    });
  }
}
