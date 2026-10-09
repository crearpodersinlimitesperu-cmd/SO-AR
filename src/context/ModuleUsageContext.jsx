import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { MODULE_REGISTRY } from '../config/moduleRegistry';
import { allowedUsageModules, moduleForVisit } from '../utils/moduleNavigation';
import {
  canUseLocalUsage, emptyUsage, readUsage, recordUsage, resetUsage, frequentModules
} from '../utils/moduleUsage';

const ModuleUsageContext = createContext(null);
const knownIds = MODULE_REGISTRY.filter(mod => mod.route).map(mod => mod.id);

export function ModuleUsageProvider({ children, routePolicies }) {
  const { currentUser, originalAdminUser, loading } = useAuth();
  const enabled = !loading && canUseLocalUsage(currentUser, originalAdminUser);
  const owner = enabled ? currentUser.uid : null;
  const [state, setState] = useState({ owner: null, usage: emptyUsage(), error: null });
  const lastVisit = useRef(null);
  const allowedModules = loading ? [] : allowedUsageModules(currentUser, routePolicies);

  const fail = useCallback(error => {
    console.error('No se pudo acceder al historial local de módulos:', error);
    setState({ owner, usage: emptyUsage(), error: 'No se pudo leer o guardar tu espacio en este navegador. Restablécelo o habilita el almacenamiento local.' });
  }, [owner]);

  useEffect(() => {
    if (!enabled) {
      setState({ owner: null, usage: emptyUsage(), error: null });
      return;
    }
    try {
      setState({ owner, usage: readUsage(window.localStorage, currentUser, originalAdminUser, knownIds), error: null });
    } catch (error) {
      fail(error);
    }
  }, [owner, enabled, currentUser, originalAdminUser, fail]);

  const recordVisit = location => {
    if (!enabled) return;
    const module = moduleForVisit(allowedModules, currentUser, location.pathname);
    if (!module) return;
    // Retained across reset and StrictMode effect replay; a reset is not a new visit.
    const token = `${owner}:${location.key}:${module.id}`;
    if (lastVisit.current === token) return;
    lastVisit.current = token;
    try {
      const usage = recordUsage(window.localStorage, currentUser, originalAdminUser, module.id,
        allowedModules.map(mod => mod.id), knownIds);
      setState({ owner, usage, error: null });
    } catch (error) {
      fail(error);
    }
  };

  const reset = () => {
    if (!enabled) return;
    try {
      resetUsage(window.localStorage, currentUser, originalAdminUser);
      setState({ owner, usage: emptyUsage(), error: null });
    } catch (error) {
      fail(error);
    }
  };
  const usage = enabled && state.owner === owner ? state.usage : emptyUsage();
  const frequent = frequentModules(usage, allowedModules);
  const error = enabled && state.owner === owner ? state.error : null;
  return (
    <ModuleUsageContext.Provider value={{
      recordVisit, reset, frequent: frequent.map(mod => ({
        ...mod, route: typeof mod.route === 'function' ? mod.route(currentUser) : mod.route
      })), allowedModules,
      hasHistory: Object.keys(usage.modules).length > 0,
      error
    }}>
      {error && (
        <div role="alert" style={{ padding: '1rem', background: 'var(--bg-dark-alt)', color: 'var(--text-main)' }}>
          {error} <button type="button" className="btn-secondary" onClick={reset}>Restablecer mi espacio</button>
        </div>
      )}
      {children}
    </ModuleUsageContext.Provider>
  );
}

export const useModuleUsage = () => useContext(ModuleUsageContext);

// Mounted only inside an authorized guard and after Suspense has resolved.
export function ModuleVisit({ children }) {
  const location = useLocation();
  const { recordVisit } = useModuleUsage();
  useEffect(() => { recordVisit(location); }, [location, recordVisit]);
  return children;
}
