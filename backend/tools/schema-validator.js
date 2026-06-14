const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { logInfo, logError, logDebug } = require('./utils/logger');

const reportDir = path.join(__dirname, 'reports');
const modelsDir = path.join(__dirname, '..', 'models');
const controllersDir = path.join(__dirname, '..', 'controllers');
const reportPath = path.join(reportDir, 'schema-validator.json');

const validationIndicators = [/joi/i, /validationResult/, /express-validator/, /validateBody/, /yup/i, /zod/i, /schema\.validate/];

const initReport = () => ({
  generatedAt: new Date().toISOString(),
  models: [],
  controllers: [],
  summary: {
    modelsChecked: 0,
    controllersChecked: 0,
    warnings: 0,
    errors: 0
  }
});

const addFinding = (report, section, finding) => {
  report[section].push(finding);
  if (finding.severity === 'warning') {
    report.summary.warnings += 1;
  }
  if (finding.severity === 'error') {
    report.summary.errors += 1;
  }
};

const loadModelModule = (filePath) => {
  delete require.cache[require.resolve(filePath)];
  try {
    return require(filePath);
  } catch (error) {
    const overwriteMatch = /Cannot overwrite `([^`]+)` model once compiled/.exec(error.message || '');
    if (overwriteMatch && typeof mongoose.deleteModel === 'function') {
      try {
        mongoose.deleteModel(overwriteMatch[1]);
      } catch (cleanupError) {
        logDebug(`Failed to delete model ${overwriteMatch[1]} during reload: ${cleanupError.message}`);
      }
      delete require.cache[require.resolve(filePath)];
      return require(filePath);
    }
    throw error;
  }
};

const analyzeModel = (filePath) => {
  const model = loadModelModule(filePath);
  if (!model || !model.schema) {
    return {
      file: path.basename(filePath),
      severity: 'error',
      message: 'Schema definition not found'
    };
  }
  const schema = model.schema;
  const findings = [];

  if (!schema.options || !schema.options.timestamps) {
    findings.push({
      severity: 'warning',
      message: 'Schema timestamps option disabled',
      path: null
    });
  }

  Object.entries(schema.paths).forEach(([key, schemaPath]) => {
    if (key.startsWith('_')) {
      return;
    }
    if (!schemaPath.options || !schemaPath.options.type) {
      findings.push({
        severity: 'warning',
        message: 'Field missing explicit type',
        path: key
      });
    }
    if (schemaPath.instance === 'Mixed') {
      findings.push({
        severity: 'warning',
        message: 'Mixed type detected; ensure sanitization',
        path: key
      });
    }
  });

  const result = {
    file: path.basename(filePath),
    modelName: model.modelName,
    severity: findings.length ? 'warning' : 'pass',
    findings
  };

  if (typeof mongoose.deleteModel === 'function' && model.modelName) {
    try {
      mongoose.deleteModel(model.modelName);
    } catch (err) {
      logDebug(`Failed to delete model ${model.modelName}: ${err.message}`);
    }
  }

  return result;
};

const analyzeController = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const usesBody = content.includes('req.body');
  const usesQuery = content.includes('req.query');
  const usesParams = content.includes('req.params');
  const hasValidation = validationIndicators.some((pattern) => pattern.test(content));
  const findings = [];

  if ((usesBody || usesQuery || usesParams) && !hasValidation) {
    findings.push({
      severity: 'warning',
      message: 'Input usage detected without accompanying validation middleware',
      indicators: { usesBody, usesQuery, usesParams }
    });
  }

  if (/\$where/.test(content) || /new\s+RegExp\(\s*req\./.test(content)) {
    findings.push({
      severity: 'warning',
      message: 'Potential unsafe query construction detected'
    });
  }

  return {
    file: path.basename(filePath),
    severity: findings.length ? 'warning' : 'pass',
    findings
  };
};

const cleanupMongoose = () => {
  if (mongoose.models) {
    Object.keys(mongoose.models).forEach((modelName) => {
      delete mongoose.models[modelName];
    });
  }
  if (mongoose.modelSchemas) {
    Object.keys(mongoose.modelSchemas).forEach((modelName) => {
      delete mongoose.modelSchemas[modelName];
    });
  }
};

const run = () => {
  logInfo('Running schema-validator');
  const report = initReport();

  try {
    fs.mkdirSync(reportDir, { recursive: true });

    const modelFiles = fs.readdirSync(modelsDir).filter((file) => file.endsWith('.js'));
    modelFiles.forEach((file) => {
      const result = analyzeModel(path.join(modelsDir, file));
      report.summary.modelsChecked += 1;
      addFinding(report, 'models', result);
    });

    const controllerFiles = fs.readdirSync(controllersDir).filter((file) => file.endsWith('.js'));
    controllerFiles.forEach((file) => {
      const result = analyzeController(path.join(controllersDir, file));
      report.summary.controllersChecked += 1;
      addFinding(report, 'controllers', result);
    });

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logInfo(`Schema validator report written to ${reportPath}`);
  } catch (error) {
    logError('schema-validator failed', error);
    process.exitCode = 1;
  } finally {
    cleanupMongoose();
    logDebug('Schema validator cleanup complete');
  }
};

if (require.main === module) {
  run();
}

module.exports = { runSchemaValidation: run };
