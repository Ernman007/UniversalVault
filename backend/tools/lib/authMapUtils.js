const fs = require('fs');
const path = require('path');

const normalizeFileName = (file) => (file.endsWith('.js') ? file : `${file}.js`);

const extractRouteImports = (indexContent) => {
  const importMatches = [...indexContent.matchAll(/const\s+(\w+)\s*=\s*require\(['"]\.\/routes\/([^'"]+)['"]\);/g)];
  return Object.fromEntries(importMatches.map(([, alias, file]) => [alias, normalizeFileName(file)]));
};

const buildMountMap = (indexContent) => {
  const aliasToFile = extractRouteImports(indexContent);
  const mountMap = {};
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

const loadAllowlist = (allowlistPath) => {
  if (!fs.existsSync(allowlistPath)) {
    return [];
  }
  try {
    const content = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
    return Array.isArray(content) ? content : [];
  } catch (error) {
    throw new Error(`Failed to parse ${allowlistPath}: ${error.message}`);
  }
};

const isAllowlisted = (allowlist, mountPath, routePath, method) => {
  return allowlist.some((entry) => {
    if (!entry || !entry.route) {
      return false;
    }
    if (entry.method && entry.method.toLowerCase() !== method) {
      return false;
    }
    const fullRoute = `${mountPath || ''}${routePath}`;
    return new RegExp(entry.route).test(fullRoute);
  });
};

const analyzeRouter = (filePath, mountPath, allowlist) => {
  let routerModule;
  try {
    delete require.cache[require.resolve(filePath)];
    routerModule = require(filePath);
  } catch (error) {
    return {
      file: path.basename(filePath),
      mountPath,
      error: `Unable to load router: ${error.message}`,
      endpoints: []
    };
  }

  if (!routerModule || !routerModule.stack) {
    return {
      file: path.basename(filePath),
      mountPath,
      error: 'Router export not found',
      endpoints: []
    };
  }

  const globalMiddlewares = routerModule.stack
    .filter((layer) => !layer.route && layer.handle && layer.handle.name && layer.handle.name !== 'router')
    .map((layer) => layer.handle.name);

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
      const middlewares = [...globalMiddlewares, ...middlewareChain];
      endpoints.push({
        method: normalized,
        path: layer.route.path,
        middlewares,
        handler,
        security: {
          requiresAuth: middlewares.includes('protect'),
          requiresAdmin: middlewares.includes('admin'),
          allowlisted: isAllowlisted(allowlist, mountPath, layer.route.path, normalized)
        }
      });
    });
  });

  return {
    file: path.basename(filePath),
    mountPath,
    globalMiddlewares,
    endpoints
  };
};

module.exports = {
  buildMountMap,
  loadAllowlist,
  analyzeRouter
};
