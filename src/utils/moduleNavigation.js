import { matchPath } from 'react-router-dom';
import { MODULE_REGISTRY, isModuleVisible } from '../config/moduleRegistry.js';
import { canEnterRoleRoute } from './routeAccess.js';

export function allowedUsageModules(user, routePolicies) {
  if (!user || user.isParticipantOnly) return [];
  return MODULE_REGISTRY.filter(mod => {
    if (!mod.route || !isModuleVisible(mod, user)) return false;
    if (mod.id === 'checklist' && user.canAccessRole && !user.canAccessRole(user.appRole || 'capitan')) return false;
    const route = typeof mod.route === 'function' ? mod.route(user) : mod.route;
    const policy = routePolicies.find(policy => matchPath(policy.path, route));
    return Boolean(policy && canEnterRoleRoute(user, policy.access));
  });
}

export function moduleForVisit(modules, user, pathname) {
  return modules.find(mod => (typeof mod.route === 'function' ? mod.route(user) : mod.route) === pathname);
}
