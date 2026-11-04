import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { privateViewKey } from '../utils/sessionPrivacy.js';
import { readPrivateNodusSnapshot, readPrivateNodusReportSources, readPrivatePulseSummary } from '../services/privateNodusSnapshot.js';

function usePrivateNodusProjection(read, { enabled = true, revision = 0 } = {}) {
  const { currentUser } = useAuth();
  const key = privateViewKey(currentUser);
  const scope = useRef(key);
  scope.current = key;
  const [state, setState] = useState({ ownerKey: key, snapshot: null, loading: true, error: '' });
  const unavailable = !currentUser?.uid || currentUser.isSimulated || currentUser.isRoleSimulationActive;
  useEffect(() => {
    let active = true;
    let timer;
    const isCurrent = () => active && scope.current === key;
    if (!enabled || unavailable) {
      setState({ ownerKey: key, snapshot: null, loading: false,
        error: enabled ? 'Las métricas privadas requieren tu cuenta real, sin simulación.' : '' });
      return () => { active = false; };
    }
    setState({ ownerKey: key, snapshot: null, loading: true, error: '' });
    const refresh = async () => {
      try {
        const snapshot = await read({ expectedUid: currentUser.uid, isCurrent });
        if (isCurrent()) setState({ ownerKey: key, snapshot, loading: false, error: '' });
      } catch (error) {
        console.error('No se pudo verificar la proyección privada Nodus:', error);
        if (isCurrent()) setState({ ownerKey: key, snapshot: null, loading: false,
          error: error.message || 'No se pudo verificar el alcance de las métricas.' });
      } finally {
        if (isCurrent()) timer = setTimeout(refresh, 60000);
      }
    };
    refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [enabled, unavailable, key, revision, currentUser?.uid, read]);
  return state.ownerKey === key && enabled && !unavailable ? state
    : { snapshot: null, loading: enabled && !unavailable,
      error: enabled && unavailable ? 'Las métricas privadas requieren tu cuenta real, sin simulación.' : '' };
}

export default function usePrivateNodusSnapshot(options) {
  return usePrivateNodusProjection(readPrivateNodusSnapshot, options);
}

export function usePrivateNodusReportSources(options) {
  return usePrivateNodusProjection(readPrivateNodusReportSources, options);
}

export function usePrivatePulseSummary(options) {
  return usePrivateNodusProjection(readPrivatePulseSummary, options);
}
