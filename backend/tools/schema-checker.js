#!/usr/bin/env node
/**
 * schema-checker.js
 *
 * Thin wrapper around schema-validator.js to satisfy api-creator-wizard workflow.
 * Accepts --models <dir> and --schemas <dir> arguments, defaulting to backend models config.
 */

const path = require('path');
const { runSchemaValidation } = require('./schema-validator');
const { logInfo, logError } = require('./utils/logger');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!value) continue;
    switch (key) {
      case '--models':
        options.modelsDir = value;
        break;
      case '--schemas':
        options.schemasDir = value;
        break;
      case '--db':
        options.connection = value;
        break;
      default:
        break;
    }
  }

  if (!options.modelsDir) {
    options.modelsDir = path.join(__dirname, '..', 'models');
  }

  return options;
}

(async function main() {
  const options = parseArgs();
  try {
    await runSchemaValidation(options);
    logInfo('Schema validation complete.');
  } catch (error) {
    logError('Schema validation failed', error);
    process.exitCode = 1;
  }
})();
