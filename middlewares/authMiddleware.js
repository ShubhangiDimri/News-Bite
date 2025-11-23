const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logging');

module.exports = async (req, res, next) => {
    try {
        // Try to get token from cookie first, then Authorization header
        let token = req.cookies.authToken;
        
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            // Check if it's a Bearer token
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            logger.warn('Auth failed - No token provided');
            return res.status(401).json({ 
                message: 'Access denied. Please provide authentication token via cookie or Bearer header.'
            });
        }

        // Verify the token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            logger.warn('Auth failed - Invalid JWT', { error: jwtError.message });
            return res.status(401).json({ 
                message: 'Invalid or expired token. Please login again.'
            });
        }

        if (!decoded.userId) {
            logger.warn('Auth failed - Token missing userId');
            return res.status(401).json({ 
                message: 'Invalid token format. Please login again.'
            });
        }

        // Fetch user to verify existence and get username and role
        const user = await User.findById(decoded.userId).select('username role');
        if (!user) {
            logger.warn('Auth failed - User not found', { userId: decoded.userId });
            return res.status(401).json({ 
                message: 'User no longer exists. Please register again.'
            });
        }

        // Attach verified user info to request
        req.user = {
            userId: decoded.userId,
            username: user.username,
            role: user.role
        };

        logger.debug('Auth successful', { userId: user._id, username: user.username });
        next();
    } catch (error) {
        logger.error('Auth error', { 
            error: error.message,
            stack: error.stack
        });
        return res.status(401).json({ 
            message: 'Authentication failed. Please try logging in again.'
        });
    }
}
