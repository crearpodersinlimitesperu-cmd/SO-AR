import { onIdTokenChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { nextRecord } from '../recordModel.js';
import { validateGuide } from './guideContract.js';

const empty = () => ({
  status: 'signed-out', email: '', uid: '', guide: null, record: null,
  events: [], phase: 'todo', reference: null, busy: false, message: '',
});
const explain = error => {
  if (error.code === 'permission-denied') return 'Permiso denegado. La aprobación pudo cambiar; vuelve a comprobar el acceso.';
  if (error.code?.startsWith('auth/')) return `No se pudo autenticar (${error.code}). Revisa la cuenta sintética y los emuladores.`;
  return error.message || 'Error de conexión. No se confirmó la operación; comprueba los emuladores.';
};

export function createSession({ auth, db }) {
  let state = empty();
  let generation = 0;
  let identity = 0;
  let stops = [];
  let memberStop = null;
  let disposed = false;
  let authBusy = false;
  let authority = null;
  const subscribers = new Set();
  const emit = patch => {
    state = { ...state, ...patch };
    subscribers.forEach(callback => callback());
  };
  const clearPrivate = patch => {
    generation++;
    authority = null;
    stops.forEach(stop => stop());
    stops = [];
    emit({ ...empty(), email: state.email, uid: state.uid, ...patch });
  };
  const clearAll = patch => {
    identity++;
    memberStop?.();
    memberStop = null;
    clearPrivate({ email: '', uid: '', ...patch });
  };
  const current = (epoch, uid) => !disposed && epoch === generation && auth.currentUser?.uid === uid;

  const watchPrivate = uid => {
    const epoch = generation;
    const ready = new Set();
    const receive = (name, patch) => {
      if (!current(epoch, uid)) return;
      ready.add(name);
      emit({ ...patch, status: ready.size === 3 ? 'ready' : 'loading' });
    };
    const fail = error => {
      if (current(epoch, uid)) clearPrivate({ status: 'error', message: explain(error) });
    };
    stops.push(onSnapshot(doc(db, 'content', 'c2-v1'), { includeMetadataChanges: true }, snapshot => {
      if (!current(epoch, uid) || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      try {
        receive('guide', { guide: validateGuide(snapshot.data()) });
      } catch (error) { fail(error); }
    }, fail));
    stops.push(onSnapshot(doc(db, 'records', uid), { includeMetadataChanges: true }, snapshot => {
      if (!current(epoch, uid) || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      try {
        const record = snapshot.exists() ? snapshot.data() : null;
        nextRecord(record, { kind: 'phase', target: 'todo' });
        if (record && record.uid !== uid) throw new Error('El UID del registro es inválido.');
        receive('record', { record });
      } catch (error) { fail(error); }
    }, fail));
    stops.push(onSnapshot(query(collection(db, 'records', uid, 'events'), orderBy('revision', 'desc')),
      { includeMetadataChanges: true }, snapshot => {
        if (!current(epoch, uid) || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
        receive('events', { events: snapshot.docs.map(event => ({ id: event.id, ...event.data() })) });
      }, fail));
  };

  const acceptUser = async user => {
    if (disposed || user !== auth.currentUser || (!user && authBusy)) return;
    clearAll({ status: user ? 'checking' : 'signed-out', email: user?.email ?? '', uid: user?.uid ?? '' });
    if (!user || disposed) return;
    const epoch = generation;
    const userIdentity = identity;
    try {
      const token = await user.getIdTokenResult();
      if (!current(epoch, user.uid)) return;
      const email = token.claims.email;
      if (token.claims.email_verified !== true || typeof email !== 'string') {
        emit({ status: 'unverified', message: 'Correo no verificado. No se consulta la guía ni el registro.' });
        return;
      }
      memberStop = onSnapshot(doc(db, 'members', user.uid), { includeMetadataChanges: true }, snapshot => {
        if (disposed || identity !== userIdentity || auth.currentUser?.uid !== user.uid || state.uid !== user.uid) return;
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
          clearPrivate({ status: 'checking', message: 'Esperando autoridad confirmada por el servidor local.' });
          return;
        }
        const member = snapshot.data();
        if (!member || member.enabled !== true || member.email !== email) {
          clearPrivate({
            status: 'denied',
            message: 'Sin aprobación exacta o acceso revocado. La vista y las suscripciones privadas se han limpiado.',
          });
          return;
        }
        if (authority === user.uid) return;
        clearPrivate({ status: 'loading' });
        authority = user.uid;
        watchPrivate(user.uid);
      }, error => {
        if (!disposed && identity === userIdentity && auth.currentUser?.uid === user.uid && state.uid === user.uid) {
          clearPrivate({ status: 'error', message: explain(error) });
        }
      });
    } catch (error) {
      if (current(epoch, user.uid)) clearPrivate({ status: 'error', message: explain(error) });
    }
  };
  const authStop = onIdTokenChanged(auth, acceptUser, error => clearAll({ status: 'error', message: explain(error) }));

  const refresh = async () => {
    const user = auth.currentUser;
    if (!user || authBusy || disposed) return;
    try {
      await user.reload();
      if (auth.currentUser === user) await user.getIdToken(true);
    } catch (error) {
      if (auth.currentUser === user) {
        clearAll({ status: 'error', message: explain(error) });
        await signOut(auth).catch(() => {});
      }
    }
  };
  const timer = setInterval(refresh, 30000);
  window.addEventListener('focus', refresh);

  return {
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); },
    snapshot: () => state,
    async login(email, password) {
      if (authBusy || disposed) return;
      authBusy = true;
      clearAll({ status: 'signing-in' });
      try {
        await signOut(auth);
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } catch (error) {
        clearAll({ status: 'error', message: explain(error) });
      } finally { authBusy = false; }
    },
    async logout() {
      if (authBusy || disposed) return;
      authBusy = true;
      clearAll({ status: 'signing-out' });
      try {
        await signOut(auth);
        if (!disposed) emit({ status: 'signed-out' });
      } catch (error) {
        emit({ status: 'error', message: explain(error) });
      } finally { authBusy = false; }
    },
    async perform(action) {
      if (state.status !== 'ready' || state.busy || disposed) return;
      const uid = state.uid;
      const epoch = generation;
      const eventId = doc(collection(db, 'records', uid, 'events')).id;
      emit({ busy: true, message: 'Enviando al servidor local; aún no está confirmado.' });
      try {
        await runTransaction(db, async transaction => {
          if (!current(epoch, uid) || authority !== uid) throw new Error('La cuenta o su autoridad cambió. Operación cancelada.');
          const member = await transaction.get(doc(db, 'members', uid));
          const previous = await transaction.get(doc(db, 'records', uid));
          if (!current(epoch, uid) || member.data()?.enabled !== true
            || member.data()?.email !== auth.currentUser.email) {
            throw new Error('La aprobación cambió. Operación cancelada.');
          }
          const next = nextRecord(previous.exists() ? previous.data() : null, action);
          transaction.set(doc(db, 'records', uid), {
            uid, completed: next.completed, revision: next.revision, lastEventId: eventId, updatedAt: serverTimestamp(),
          });
          transaction.set(doc(db, 'records', uid, 'events', eventId), {
            uid, ...next, kind: action.kind, target: action.target, createdAt: serverTimestamp(),
          });
        });
        if (!current(epoch, uid) || authority !== uid) return;
        emit({
          busy: false, message: 'Guardado confirmado por el emulador. Estado e historial escritos juntos.',
          ...(action.kind === 'phase' ? { phase: action.target } : {}),
          ...(action.kind === 'reference' ? { reference: action.target } : {}),
        });
      } catch (error) {
        if (current(epoch, uid)) {
          clearPrivate({ status: 'error', message: `${explain(error)} No se confirmó el guardado. Cierra sesión y vuelve a entrar.` });
        }
      }
    },
    dispose() {
      disposed = true;
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      authStop();
      clearAll({});
      subscribers.clear();
    },
  };
}
