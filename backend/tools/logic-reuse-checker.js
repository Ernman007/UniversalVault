#!/usr/bin/env node
/**
 * logic-reuse-checker.js
 *
 * Utility to detect potentially duplicated logic across services/controllers.
 * Produces a simple report listing functions with identical names across files.
 */

const fs = require('fs');
const path = require('path');
const { logInfo, logWarn } = require('./utils/logger');

function walk(dir, predicate) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, predicate);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      predicate(fullPath);
    }
  });
}

function extractFunctions(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const regex = /function\s+(\w+)\s*\(/g;
  const matches = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function analyze(srcDir) {
  const occurrences = new Map();
  walk(srcDir, (file) => {
    const funcs = extractFunctions(file);
    funcs.forEach((fn) => {
      if (!occurrences.has(fn)) {
        occurrences.set(fn, []);
      }
      occurrences.get(fn).push(file);
    });
  });

  const duplicates = [];
  occurrences.forEach((files, fn) => {
    if (files.length > 1) {
      duplicates.push({ function: fn, files });
    }
  });

  return duplicates;
}

(function main() {
  const srcDir = process.argv[2] || path.join(__dirname, '..');
  logInfo(`Checking for duplicate logic under ${srcDir}`);
  const result = analyze(srcDir);
  if (!result.length) {
    logInfo('No duplicate function names detected.');
    return;
  }
  logWarn('Potential duplicate logic detected:');
  result.forEach((dup) => {
    logWarn(`Function ${dup.function} found in:`);
    dup.files.forEach((file) => logWarn(`  - ${file}`));
  });
})();
