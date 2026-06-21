const getTimestamp = () => new Date().toISOString();

const logger = {
  info: (message, meta = '') => {
    console.log(`[INFO] [${getTimestamp()}] ${message}`, meta || '');
  },
  warn: (message, meta = '') => {
    console.warn(`[WARN] [${getTimestamp()}] ${message}`, meta || '');
  },
  error: (message, meta = '') => {
    console.error(`[ERROR] [${getTimestamp()}] ${message}`, meta || '');
  },
  debug: (message, meta = '') => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] [${getTimestamp()}] ${message}`, meta || '');
    }
  },
};

module.exports = logger;
