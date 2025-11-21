const logger = require('../utils/logging');
const generateRequestId = async () => {
  const { v4: uuidv4 } = await import('uuid'); // Dynamic import
  return uuidv4();
};

const requestLogger = async (req, res, next) => {
    const start = Date.now();
    req.id = await generateRequestId();

    // Log incoming request
    logger.info(`--> ${req.method} ${req.path}`, {
        requestId: req.id,
        userId: req.user?.id || 'anonymous'
    });

    // Log response on finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        const logMessage = `<-- ${req.method} ${req.path} ${res.statusCode} ${duration}ms`;

        if (duration > 1000) {
            logger.warn(logMessage, {
                requestId: req.id,
                duration,
                status: res.statusCode,
                slow: true
            });
        } else {
            logger.info(logMessage, {
                requestId: req.id,
                duration,
                status: res.statusCode
            });
        }
    });

    next();
};

module.exports = requestLogger;