import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as perms from '../src/config/permissions.js';
import { MODULE_REGISTRY, isModuleVisible } from '../src/config/moduleRegistry.js';
import { canEnterRoleRoute } from '../src/utils/routeAccess.js';

function parseAppRoutes(appJsx) {
  const lines = appJsx.split('\n');
  const routeBlocks = [];
  for (let i = 0; i < lines.length; i++) {
    const pm = lines[i].match(/<Route\s+path="([^"]+)"/);
    if (pm) {
      let block = lines[i];
      let j = i;
      let braceCount = (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
      while (j < lines.length - 1 && braceCount > 0) {
        j++;
        block += '\n' + lines[j];
        braceCount += (lines[j].match(/\{/g) || []).length - (lines[j].match(/\}/g) || []).length;
      }
      const navMatch = block.match(/<Navigate\s+to="([^"]+)"/);
      const roleMatch = block.match(/allowedRoles=\{(\[[^\]]+\])\}/);
      const emailMatch = block.match(/allowedEmails=\{([^}]+)\}/);
      const exclMatch = block.match(/excludeDireccionBypass=\{true\}/);
      const privMatch = block.includes('<PrivateRoute>');
      routeBlocks.push({
        path: pm[1],
        line: i + 1,
        redirectTarget: navMatch ? navMatch[1] : null,
        allowedRoles: roleMatch ? JSON.parse(roleMatch[1].replace(/'/g, '"')) : [],
        allowedEmails: emailMatch && emailMatch[1].includes('DATA_ADMIN_EMAILS') ? perms.DATA_ADMIN_EMAILS : [],
        excludeDireccionBypass: Boolean(exclMatch),
        isPrivateRoute: privMatch,
      });
    }
  }
  return routeBlocks;
}

function matchRoute(routeBlocks, routeMap, targetPath) {
  const clean = targetPath.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  if (routeMap.has(clean)) return routeMap.get(clean);
  for (const r of routeBlocks) {
    if (r.path === '*') continue;
    const pattern = '^' + r.path.replace(/:[^/]+/g, '[^/]+') + '$';
    if (new RegExp(pattern).test(clean)) return r;
  }
  return null;
}

function walkFiles(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      results = results.concat(walkFiles(full));
    } else if (/\.(jsx?|tsx?|mjs)$/.test(f) && !f.endsWith('.test.js')) {
      results.push(full);
    }
  }
  return results;
}

test('Todas las páginas de src/pages/*.jsx están montadas en src/App.jsx', () => {
  const appJsx = fs.readFileSync('src/App.jsx', 'utf8');
  const pageFiles = fs.readdirSync('src/pages').filter(f => f.endsWith('.jsx'));
  const unmounted = [];
  for (const pf of pageFiles) {
    const base = pf.replace('.jsx', '');
    if (!appJsx.includes(`./pages/${base}`) && !appJsx.includes(`./pages/${pf}`)) {
      unmounted.push(pf);
    }
  }
  assert.deepEqual(unmounted, [], `Páginas huérfanas sin montar en App.jsx: ${unmounted.join(', ')}`);
});

test('Todos los botones y llamadas navigate() en src/ apuntan a rutas reales y nunca rebotan a /home', () => {
  const appJsx = fs.readFileSync('src/App.jsx', 'utf8');
  const routeBlocks = parseAppRoutes(appJsx);
  const routeMap = new Map(routeBlocks.map(r => [r.path, r]));
  const files = walkFiles('src');
  const brokenTargets = [];

  for (const file of files) {
    if (file === 'src/App.jsx') continue;
    const content = fs.readFileSync(file, 'utf8');
    const flines = content.split('\n');
    flines.forEach((l, idx) => {
      if (file.includes('NodusLiveModulesDashboard.jsx') && l.includes('section:')) return;
      const patterns = [
        /navigate\(\s*[`"'](\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_${}:-]+)*)/g,
        /\broute\s*:\s*[`"'](\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)/g,
      ];
      for (const rgx of patterns) {
        for (const m of l.matchAll(rgx)) {
          const rawTarget = m[1];
          const normalizedTarget = rawTarget.replace(/\$\{[^}]+\}/g, 'param');
          if (
            normalizedTarget.startsWith('/assets') ||
            normalizedTarget.startsWith('/docs') ||
            normalizedTarget.startsWith('/documents') ||
            normalizedTarget.startsWith('/api') ||
            normalizedTarget.startsWith('/plantillas') ||
            normalizedTarget.startsWith('/data')
          ) continue;

          const matched = matchRoute(routeBlocks, routeMap, normalizedTarget);
          if (!matched) {
            brokenTargets.push(`${file}:${idx + 1} -> ruta inexistente "${rawTarget}"`);
          } else if (matched.redirectTarget === '/home' && normalizedTarget !== '/home' && normalizedTarget !== '/') {
            brokenTargets.push(`${file}:${idx + 1} -> "${rawTarget}" redirige silenciosamente a /home (App.jsx:${matched.line})`);
          }
        }
      }
    });
  }

  assert.deepEqual(brokenTargets, [], `Botones/rutas rotas detectadas:\n${brokenTargets.join('\n')}`);
});

test('Paridad total entre permisos de botones (permissions.js / MODULE_REGISTRY) y RoleRoute en App.jsx', () => {
  const appJsx = fs.readFileSync('src/App.jsx', 'utf8');
  const routeBlocks = parseAppRoutes(appJsx);
  const routeMap = new Map(routeBlocks.map(r => [r.path, r]));

  const ROLES = [
    'direccion', 'cfo', 'ceo', 'cco', 'director_maestria',
    'gerente', 'coord_c1', 'coord_c2', 'coordinador_c1c2', 'coord_jr',
    'coord_maestria', 'coordinador_mj', 'coord_maestria_global',
    'qt', 'capitan', 'entrenador', 'entrenador_llamadas',
    'finanzas', 'facturacion', 'contador', 'talento_humano', 'rrhh',
    'legal', 'juridico', 'consolidado'
  ];

  const checks = [
    { name: 'canAccessAgendaTimeBoxing -> /calendario-equipo', fn: perms.canAccessAgendaTimeBoxing, route: '/calendario-equipo' },
    { name: 'canAccessFlyersC1 -> /generador-flyer', fn: perms.canAccessFlyersC1, route: '/generador-flyer' },
    { name: 'canAccessCalendarioMJ -> /calendario-mj', fn: perms.canAccessCalendarioMJ, route: '/calendario-mj' },
    { name: 'canAccessMonitorVuelos -> /monitor-vuelos', fn: perms.canAccessMonitorVuelos, route: '/monitor-vuelos' },
    { name: 'canAccessSistemaCartas -> /monitor-vuelos', fn: perms.canAccessSistemaCartas, route: '/monitor-vuelos' },
    { name: 'canAccessMonitorIMOs -> /monitor-imos', fn: perms.canAccessMonitorIMOs, route: '/monitor-imos' },
    { name: 'canAccessManualQT -> /manual', fn: perms.canAccessManualQT, route: '/manual' },
    { name: 'canAccessManualNodus -> /manual-nodus', fn: perms.canAccessManualNodus, route: '/manual-nodus' },
    { name: 'canAccessDirectorioQT -> /directorio-qt', fn: perms.canAccessDirectorioQT, route: '/directorio-qt' },
    { name: 'canAccessCentroManagers -> /centro-managers', fn: perms.canAccessCentroManagers, route: '/centro-managers' },
  ];

  const mismatches = [];

  for (const c of checks) {
    const r = routeMap.get(c.route);
    assert.ok(r, `Ruta ${c.route} no existe en App.jsx`);
    assert.notEqual(r.redirectTarget, '/home', `Ruta ${c.route} no puede redirigir a /home`);
    for (const role of ROLES) {
      const mockUser = {
        uid: 'u1',
        email: `${role}@crearpsl.net`,
        appRole: role,
        role,
        roles: role === 'consolidado' ? ['gerente', 'coord_c1'] : [role],
        isDireccion: ['direccion', 'cfo', 'ceo', 'cco'].includes(role),
        isGerente: role === 'gerente',
        isConsolidatedView: role === 'consolidado',
      };
      if (c.fn(mockUser) && !r.isPrivateRoute && !canEnterRoleRoute(mockUser, r)) {
        mismatches.push(`${c.name} bloqueado en App.jsx para rol "${role}"`);
      }
    }
  }

  for (const mod of MODULE_REGISTRY) {
    if (mod.external) continue;
    for (const role of ROLES) {
      const mockUser = {
        uid: 'u1',
        email: `${role}@crearpsl.net`,
        appRole: role,
        role,
        roles: role === 'consolidado' ? ['gerente', 'coord_c1'] : [role],
        isDireccion: ['direccion', 'cfo', 'ceo', 'cco'].includes(role),
        isGerente: role === 'gerente',
        isConsolidatedView: role === 'consolidado',
      };
      const targetRoute = typeof mod.route === 'function' ? '/checklist/capitan' : mod.route;
      const r = matchRoute(routeBlocks, routeMap, targetRoute);
      if (!r || r.redirectTarget === '/home') {
        mismatches.push(`Módulo "${mod.id}" apunta a ruta rota "${targetRoute}"`);
        continue;
      }
      if (isModuleVisible(mod, mockUser) && !r.isPrivateRoute && !canEnterRoleRoute(mockUser, r)) {
        mismatches.push(`Módulo "${mod.id}" (${targetRoute}) visible pero bloqueado en App.jsx para rol "${role}"`);
      }
    }
  }

  assert.deepEqual(mismatches, [], `Desalineaciones de permisos botón vs ruta:\n${mismatches.join('\n')}`);
});
