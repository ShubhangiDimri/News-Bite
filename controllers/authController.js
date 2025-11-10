const User = require('../models/User');
const logger = require('../utils/logging');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const { setAuthCookie } = require('../utils/cookie');

// registering a user
exports.register = async (req, res) => {
    try {
        const { password, username } = req.body;
        
        logger.info(`Registration attempt for username: ${username}`);

        // Validate input
        if (!username || !password) {
            logger.error(`Registration failed - Missing credentials`, { username, hasPassword: !!password });
            return res.status(400).json({ message: "Username and password are required" });
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
        
        logger.info(`User registered successfully`, { userId: user._id, username });
        res.status(201).json({ message: 'Registration successful' });
    }
    catch(error) {
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
            logger.error(`Login failed - Missing credentials`, { username });
            return res.status(400).json({ message: "username or password required" })
        }

        const user = await User.findOne({ username });
        if (!user) {
            logger.warn(`Login failed - User not found`, { username });
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
            logger.warn(`Login failed - Invalid password`, { username });
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = generateToken(user._id);
        setAuthCookie(res, token);
        
        logger.info(`User logged in successfully`, { userId: user._id, username });
        res.json({ message: "Login successful" });
    }
    catch(error) {
        logger.error(`Login error for user: ${req.body.username}`, { 
            error: error.message, 
            stack: error.stack 
        });
        res.status(500).json({ message: error.message });
    }
}
