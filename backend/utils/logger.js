const levelOrder = ['debug', 'info', 'warn', 'error'];
const levelMethod = {
  debug: 'log',
  info: 'log',
  warn: 'warn',
  error: 'error'
};

const resolveLevelIndex = (level) => {
  const index = levelOrder.indexOf(level);
  return index === -1 ? levelOrder.indexOf('info') : index;
};

const currentLevelIndex = resolveLevelIndex((process.env.LOG_LEVEL || 'info').toLowerCase());

const shouldLog = (level) => resolveLevelIndex(level) >= currentLevelIndex;

const formatMessage = (level, message) => `${new Date().toISOString()} [${level.toUpperCase()}] ${message}`;

const log = (level, message, meta) => {
  if (!shouldLog(level)) {
    return;
  }
  const method = levelMethod[level] || 'log';
  if (meta) {
    console[method](formatMessage(level, message), meta);
  } else {
    console[method](formatMessage(level, message));
  }
};

const debug = (message, meta) => log('debug', message, meta);
const info = (message, meta) => log('info', message, meta);
const warn = (message, meta) => log('warn', message, meta);
const error = (message, meta) => log('error', message, meta);

module.exports = {
  debug,
  info,
  warn,
  error,
  logDebug: debug,
  logInfo: info,
  logWarn: warn,
  logError: error
};
