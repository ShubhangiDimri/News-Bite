const logger = require('../utils/logging');

module.exports = (req, res, next) => {
    try {
        // Check if user is authenticated (authMiddleware already executed)
        if (!req.user) {
            logger.warn('Admin access denied - No authenticated user');
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Check if user has admin role
        if (req.user.role !== 'admin') {
            logger.warn('Admin access denied - User not admin', { 
                username: req.user.username,
                userRole: req.user.role 
            });
            return res.status(403).json({ message: "Admin only" });
        }

        // User is admin, proceed
        logger.debug('Admin access granted', { username: req.user.username });
        next();
    } catch (error) {
        logger.error('Admin middleware error', { 
            error: error.message,
            stack: error.stack
        });
        return res.status(500).json({ message: "Server error" });
    }
};
