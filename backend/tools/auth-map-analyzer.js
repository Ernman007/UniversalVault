const fs = require('fs');
const path = require('path');
const express = require('express');
const { logInfo, logError, logDebug } = require('./utils/logger');

const reportDir = path.join(__dirname, 'reports');
const routesDir = path.join(__dirname, '..', 'routes');
const indexPath = path.join(__dirname, '..', 'index.js');
const allowlistPath = path.join(__dirname, '..', 'config', 'auth-guard-allowlist.json');
const reportPath = path.join(reportDir, 'auth-map.json');

const normalizeFileName = (file) => (file.endsWith('.js') ? file : `${file}.js`);

const buildMountMap = () => {
  const mountMap = {};
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const importMatches = [...indexContent.matchAll(/const\s+(\w+)\s*=\s*require\(['"]\.\/routes\/([^'"]+)['"]\);/g)];
  const aliasToFile = Object.fromEntries(importMatches.map(([, alias, file]) => [alias, normalizeFileName(file)]));
  const useRegex = /app\.use\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/g;
  let match;
  while ((match = useRegex.exec(indexContent))) {
    const [, basePath, alias] = match;
    const file = aliasToFile[alias];
    if (file) {
      mountMap[file] = basePath;
    }
  }
  return mountMap;
};

const loadAllowlist = () => {
  if (!fs.existsSync(allowlistPath)) {
    logDebug('Auth guard allowlist not found; proceeding without it');
    return [];
  }
  try {
    const content = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
    return Array.isArray(content) ? content : [];
  } catch (error) {
    logError('Failed to parse auth guard allowlist', error);
    return [];
  }
};

const formatLayerPath = (layer) => {
  if (layer.regexp && layer.regexp.fast_slash) {
    return '/';
  }
  return layer.regexp ? layer.regexp.toString() : '/';
};

const collectGlobalMiddlewares = (router) => {
  const globals = [];
  router.stack.forEach((layer) => {
    if (!layer.route && layer.handle && layer.handle.name && layer.handle.name !== 'router') {
      globals.push({ name: layer.handle.name, target: formatLayerPath(layer) });
    }
  });
  return globals;
};

const isAllowlisted = (allowlist, mountPath, routePath, method) => {
  return allowlist.some((entry) => {
    if (!entry || !entry.route) {
      return false;
    }
    const fullRoute = `${mountPath || ''}${routePath}`;
    if (entry.method && entry.method.toLowerCase() !== method) {
      return false;
    }
    return new RegExp(entry.route).test(fullRoute);
  });
};

const analyzeRouter = (file, mountPath, allowlist) => {
  const routerModule = require(path.join(routesDir, file));
  if (!routerModule || !routerModule.stack) {
    return { file, mountPath, error: 'Router export not found', endpoints: [] };
  }

  const globalMiddlewares = collectGlobalMiddlewares(routerModule);
  const globalNames = globalMiddlewares.map((m) => m.name);
  const endpoints = [];

  routerModule.stack.forEach((layer) => {
    if (!layer.route || !layer.route.stack) {
      return;
    }
    const methods = Object.keys(layer.route.methods).filter((key) => layer.route.methods[key]);
    const handlers = layer.route.stack.map((subLayer) => subLayer.handle?.name || subLayer.name || 'anonymous');
    const handler = handlers[handlers.length - 1] || 'anonymous';
    const middlewareChain = handlers.slice(0, Math.max(handlers.length - 1, 0));
    methods.forEach((method) => {
      const normalized = method.toLowerCase();
      const combined = [...globalNames, ...middlewareChain];
      const requiresAuth = combined.includes('protect');
      const requiresAdmin = combined.includes('admin');
      endpoints.push({
        method: normalized,
        path: layer.route.path,
        middlewares: combined,
        handler,
        security: {
          requiresAuth,
          requiresAdmin,
          allowlisted: isAllowlisted(allowlist, mountPath, layer.route.path, normalized)
        }
      });
    });
  });

  return {
    file,
    mountPath,
    globalMiddlewares,
    endpoints
  };
};

const run = () => {
  logInfo('Running auth-map-analyzer');
  try {
    fs.mkdirSync(reportDir, { recursive: true });
    const allowlist = loadAllowlist();
    const mountMap = buildMountMap();
    const routeFiles = fs.readdirSync(routesDir).filter((file) => file.endsWith('Routes.js'));

    const report = {
      generatedAt: new Date().toISOString(),
      routes: [],
      summary: {
        routers: 0,
        endpoints: 0,
        unsecuredEndpoints: 0,
        adminProtected: 0
      }
    };

    routeFiles.forEach((file) => {
      const mountPath = mountMap[file] || null;
      logDebug(`Analyzing ${file} mounted at ${mountPath || 'unknown path'}`);
      const result = analyzeRouter(file, mountPath, allowlist);
      report.routes.push(result);
      report.summary.routers += 1;
      result.endpoints.forEach((endpoint) => {
        report.summary.endpoints += 1;
        if (!endpoint.security.requiresAuth && !endpoint.security.allowlisted) {
          report.summary.unsecuredEndpoints += 1;
        }
        if (endpoint.security.requiresAdmin) {
          report.summary.adminProtected += 1;
        }
      });
    });

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logInfo(`Auth map report written to ${reportPath}`);
  } catch (error) {
    logError('auth-map-analyzer failed', error);
    process.exitCode = 1;
  }
};

run();
