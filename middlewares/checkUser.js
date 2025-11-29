const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        let token = req.cookies.authToken;

        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            res.locals.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('username bio_data role'); // Added role

        if (!user) {
            res.locals.user = null;
            return next();
        }

        req.user = {
            userId: decoded.userId,
            username: user.username,
            bio_data: user.bio_data,
            role: user.role || 'user'
        };
        res.locals.user = req.user;
        next();
    } catch (error) {
        res.locals.user = null;
        next();
    }
};
