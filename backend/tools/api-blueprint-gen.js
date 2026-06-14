#!/usr/bin/env node
/**
 * api-blueprint-gen.js
 *
 * Generates a simple endpoint blueprint report by scanning the routes/ directory.
 * This is not a full OpenAPI generator; it provides a quick overview of routes,
 * HTTP methods, and attached controller handlers to unblock the api-creator-wizard workflow.
 */

const fs = require('fs');
const path = require('path');
const { logInfo, logError } = require('./utils/logger');

const ROUTES_DIR = path.join(__dirname, '..', 'routes');
const OUTPUT_PATH = path.join(__dirname, 'reports', 'api-blueprint.json');

function listRouteFiles(dir) {
  if (!fs.existsSync(dir)) {
    logError(`Routes directory not found: ${dir}`);
    return [];
  }

  return fs.readdirSync(dir)
    .filter((file) => file.endsWith('Routes.js'))
    .map((file) => path.join(dir, file));
}

function parseRouteFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const routes = [];

  const routeRegex = /router\.(get|post|put|delete|patch)\(['\"]([^'\"]+)['\"],\s*([\w.]+)/i;

  lines.forEach((line, index) => {
    const match = line.match(routeRegex);
    if (match) {
      const [, method, route, handler] = match;
      routes.push({
        method: method.toUpperCase(),
        route,
        handler,
        file: path.relative(process.cwd(), filePath),
        line: index + 1,
      });
    }
  });

  return routes;
}

function generateBlueprint() {
  const routeFiles = listRouteFiles(ROUTES_DIR);
  const blueprint = [];

  routeFiles.forEach((file) => {
    const routes = parseRouteFile(file);
    blueprint.push(...routes);
  });

  return blueprint;
}

function writeReport(data) {
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), routes: data }, null, 2));
  logInfo(`API blueprint written to ${OUTPUT_PATH}`);
}

(function main() {
  try {
    const blueprint = generateBlueprint();
    writeReport(blueprint);
  } catch (error) {
    logError(`Failed to generate API blueprint: ${error.message}`);
    process.exitCode = 1;
  }
})();
