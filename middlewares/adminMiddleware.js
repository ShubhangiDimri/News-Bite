const logger = require('../utils/logging');

module.exports = (req, res, next) => {
    if (!req.user) {
        logger.warn('Admin access denied - No user authenticated');
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
        logger.warn('Admin access denied', {
            userId: req.user.userId,
            role: req.user.role
        });
        return res.status(403).json({ message: 'Admin access required' });
    }

    logger.debug('Admin access granted', { userId: req.user.userId });
    next();
};
