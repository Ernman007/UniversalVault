const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  return `${timestamp} [${level.toUpperCase()}] ${message}`;
};

const logDebug = (message) => {
  if (process.env.LOG_LEVEL && process.env.LOG_LEVEL !== 'debug') {
    return;
  }
  console.log(formatMessage('debug', message));
};

const logInfo = (message) => {
  console.log(formatMessage('info', message));
};

const logWarn = (message) => {
  console.log(formatMessage('warn', message));
};

const logError = (message, error) => {
  const detail = error ? `${message} -> ${error.message}` : message;
  console.error(formatMessage('error', detail));
  if (error && process.env.LOG_LEVEL === 'debug') {
    console.error(error.stack);
  }
};

module.exports = {
  logDebug,
  logInfo,
  logWarn,
  logError
};
