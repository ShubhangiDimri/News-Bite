const User = require('../models/User');
const Activity = require('../models/Activity');
const logger = require('../utils/logging');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const { setAuthCookie } = require('../utils/cookie');
const { validateUsername, validatePassword } = require('../utils/validation');

// registering a user
exports.register = async (req, res) => {
    try {
        let { password, username } = req.body;

        logger.info(`Registration attempt for username: ${username}`);

        // Validate username
        const usernameValidation = validateUsername(username);
        if (!usernameValidation.isValid) {
            logger.warn(`Registration failed - Username validation failed`, {
                username,
                errors: usernameValidation.errors
            });
            return res.status(400).json({
                message: "Validation failed",
                errors: {
                    username: usernameValidation.errors
                }
            });
        }

        // Use trimmed username
        username = usernameValidation.value;

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            logger.warn(`Registration failed - Password validation failed`, {
                username,
                errors: passwordValidation.errors
            });
            return res.status(400).json({
                message: "Validation failed",
                errors: {
                    password: passwordValidation.errors
                }
            });
        }

        // Check if user already exists
        let user = await User.findOne({ username });
        if (user) {
            logger.warn(`Registration failed - User already exists: ${username}`);
            return res.status(400).json({ message: "User already exists" });
        }

        // Create user with hashed password
        const hashedPassword = await hashPassword(password);
        user = new User({ username, password: hashedPassword });
        await user.save();

        // Generate token and set cookie
        const token = generateToken(user._id);
        setAuthCookie(res, token);

        // Log registration activity
        await Activity.create({
            userId: user._id,
            username: user.username,
            action: 'auth.register',
            meta: { ip: req.ip }
        });

        logger.info(`User registered successfully`, { userId: user._id, username });
        res.status(201).json({ message: 'Registration successful' });
    }
    catch (error) {
        logger.error(`Registration error for username: ${req.body.username}`, {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ message: error.message });
    }
}

// login handling
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        logger.info(`Login attempt for user: ${username}`);

        if (!username || !password) {
            logger.warn(`Login failed - Missing credentials`, { username });
            return res.status(400).json({ message: "Username and password are required" });
        }

        const user = await User.findOne({ username });
        if (!user) {
            logger.warn(`Login failed - User not found`, { username });
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Check if user is suspended
        if (user.status === 'suspended') {
            logger.warn(`Login failed - User suspended`, { username });
            return res.status(403).json({ message: "You are suspended. Please wait for the admin to unsuspend your account." });
        }

        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
            logger.warn(`Login failed - Invalid password`, { username });
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 🛡️ STRICT GATEKEEPER: Enforce role-based login separation
        const loginType = req.body.role; // Must be explicitly 'user' or 'admin'
        logger.info(`GATEKEEPER: Trying to log in as '${user.role}' via '${loginType}' portal. User: ${username}`);
        
        // 1. If trying to use Admin Portal but not an Admin
        if (loginType === 'admin' && user.role !== 'admin') {
            logger.warn(`SECURITY: Non-admin '${username}' tried to access Admin Portal.`);
            return res.status(403).json({ 
                message: "Access Denied: This portal is for Administrators only." 
            });
        }
        
        // 2. If an Admin is trying to use the Standard User login (common mistake)
        if (loginType === 'user' && user.role === 'admin') {
            logger.warn(`SECURITY: Admin '${username}' tried to log in through standard form.`);
            return res.status(403).json({ 
                message: "Security Protocol: Administrators must use the dedicated Admin Portal (floating icon)." 
            });
        }
        
        // 3. Fallback for any missing/malformed role in request
        if (!loginType || (loginType !== 'user' && loginType !== 'admin')) {
             return res.status(400).json({ message: "Invalid login context." });
        }

        const token = generateToken(user._id);
        setAuthCookie(res, token);

        // Update lastLogin and log activity
        user.lastLogin = new Date();
        await user.save();

        await Activity.create({
            userId: user._id,
            username: user.username,
            action: 'auth.login',
            meta: { ip: req.ip, userAgent: req.headers['user-agent'] }
        });

        logger.info(`User logged in successfully`, { userId: user._id, username });
        res.json({
            message: "Login successful",
            role: user.role,
            username: user.username
        });
    }
    catch (error) {
        logger.error(`Login error for user: ${req.body.username}`, {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ message: error.message });
    }
}

// logout handling
exports.logout = async (req, res) => {
    try {
        if (!req.user) {
            res.clearCookie('authToken');
            return res.redirect('/');
        }

        const userId = req.user.userId;
        const username = req.user.username;

        logger.info(`Logout attempt for user: ${username}`);

        // Update lastLogout field
        await User.findByIdAndUpdate(userId, {
            lastLogout: new Date()
        });

        // Log logout activity
        await Activity.create({
            userId,
            username,
            action: 'auth.logout',
            meta: { ip: req.ip, userAgent: req.headers['user-agent'] }
        });

        res.clearCookie('authToken');
        logger.info(`User logged out successfully`, { userId, username });
        
        // Handle both API and View requests
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ message: "Logout successful" });
        } else {
            return res.redirect('/');
        }
    } catch (error) {
        logger.error(`Logout error`, {
            error: error.message,
            stack: error.stack
        });
        res.clearCookie('authToken');
        res.redirect('/');
    }
}
