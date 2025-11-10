const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logging');

// registering a user
exports.register = async (req, res) => 
{
    try {
        const { password, username } = req.body;
        
        logger.info(`Registration attempt for username: ${username}`);

        // Validate input
        if (!username || !password) {
            logger.warn(`Registration failed - Missing credentials`, { username, hasPassword: !!password });
            return res.status(400).json({ message: "Username and password are required" });
        }

        // Check if user already exists
        let user = await User.findOne({ username });
        if (user) {
            logger.warn(`Registration failed - User already exists: ${username}`);
            return res.status(400).json({ message: "User already exists" });
        }

        // hash the password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        user = new User({username, password: hashedPassword})
        await user.save()

        // create jwt token
        const payload = { userId: user._id }
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '7d'
        })

        // setting the cookie
        res.cookie("authToken", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
        
        logger.info(`User registered successfully`, { userId: user._id, username });
        
        res.status(201).json({ message: 'Registration successful' })
    }
    catch(error) {
        logger.error(`Registration error for username: ${req.body.username}`, { 
            error: error.message, 
            stack: error.stack 
        });
        res.status(500).json({ message: error.message })
    }
}

// login handling
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body
        
        logger.info(`Login attempt for user: ${username}`);

        if (!username || !password) {
            logger.warn(`Login failed - Missing credentials`, { username });
            return res.status(400).json({ message: "username or password required" })
        }

        const user = await User.findOne({ username })
        if (!user) {
            logger.warn(`Login failed - User not found`, { username });
            return res.status(401).json({ message: "Invalid credentials" })
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn(`Login failed - Invalid password`, { username });
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const payload = { userId: user._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        res.cookie("authToken", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
        
        // This was the line causing the [object Object] log. It's now fixed.
        logger.info(`User logged in successfully`, { userId: user._id, username });
        
        res.json({ message: "Login successful" });
    }
    catch(error) {
        logger.error(`Login error for user: ${req.body.username}`, { 
            error: error.message, 
            stack: error.stack 
        });
        res.status(500).json({ message: error.message })
    }
}
