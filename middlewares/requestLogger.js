const logger = require('../utils/logging');
const { v4: uuidv4 } = require('uuid');

const requestLogger = (req, res, next) => {
    const start = Date.now();
    req.id = uuidv4();

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