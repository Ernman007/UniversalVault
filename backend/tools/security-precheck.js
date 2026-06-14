const fs = require('fs');
const path = require('path');
const { logInfo, logError, logDebug } = require('./utils/logger');

const reportDir = path.join(__dirname, 'reports');
const indexPath = path.join(__dirname, '..', 'index.js');
const packagePath = path.join(__dirname, '..', 'package.json');
const envExamplePath = path.join(__dirname, '..', '.env.example');
const reportPath = path.join(reportDir, 'security-precheck.json');

const requiredMiddlewares = [
  { key: 'helmet', pattern: /app\.use\(helmet/ },
  { key: 'cors', pattern: /app\.use\(cors/ },
  { key: 'rateLimit', pattern: /app\.use\(limiter/ },
  { key: 'mongoSanitize', pattern: /app\.use\(mongoSanitize/ },
  { key: 'xss', pattern: /app\.use\(xss/ },
  { key: 'compression', pattern: /app\.use\(compression/ }
];

const envKeys = ['JWT_SECRET', 'MONGO_URI', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];

const report = {
  generatedAt: new Date().toISOString(),
  findings: [],
  summary: {
    passes: 0,
    warnings: 0,
    errors: 0
  }
};

const addFinding = (severity, message, meta = {}) => {
  report.findings.push({ severity, message, ...meta });
  const key = severity === 'pass' ? 'passes' : `${severity}s`;
  if (report.summary[key] !== undefined) {
    report.summary[key] += 1;
  }
};

const fileContains = (content, pattern) => pattern.test(content);

const run = () => {
  logInfo('Running security-precheck');
  try {
    fs.mkdirSync(reportDir, { recursive: true });
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    logDebug('Loaded backend/index.js');

    requiredMiddlewares.forEach(({ key, pattern }) => {
      if (fileContains(indexContent, pattern)) {
        addFinding('pass', `${key} middleware found`);
      } else {
        addFinding('warning', `${key} middleware not detected`, { file: 'index.js' });
      }
    });

    if (/app\.set\(['"]trust proxy['"],\s*1\)/.test(indexContent)) {
      addFinding('pass', 'trust proxy enabled');
    } else {
      addFinding('warning', 'trust proxy not configured');
    }

    if (/app\.use\(bodyParser\.json/.test(indexContent)) {
      addFinding('pass', 'bodyParser.json configured with limits');
    } else {
      addFinding('warning', 'bodyParser.json configuration missing');
    }

    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const deps = Object.keys(packageContent.dependencies || {});
    ['helmet', 'cors', 'express-rate-limit', 'express-mongo-sanitize', 'xss-clean'].forEach((dependency) => {
      if (deps.includes(dependency)) {
        addFinding('pass', `Dependency ${dependency} declared`);
      } else {
        addFinding('error', `Dependency ${dependency} missing from package.json`);
      }
    });

    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    envKeys.forEach((key) => {
      if (envContent.includes(`${key}=`)) {
        addFinding('pass', `.env.example contains ${key}`);
      } else {
        addFinding('warning', `.env.example missing ${key}`);
      }
    });

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logInfo(`Security precheck report written to ${reportPath}`);
  } catch (error) {
    logError('security-precheck failed', error);
    process.exitCode = 1;
  }
};

run();
