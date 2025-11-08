const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const logger = require('../utils/logging')

// registering a user
exports.register = async (req, res) => {
    try {
        const { password, username } = req.body;
        
        logger.info(`Registration attempt for username: ${username}`);

        let user = await User.findOne({ username });
        if (user) {
            logger.warn(`Registration failed - User already exists: ${username}`);
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        user = new User({username, password: hashedPassword})
        await user.save()

        const payload = { userId: user._id }
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '7d'
        })

        res.cookie("authToken", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
        logger.info(`User registered successfully: ${username}`);
        res.status(201).json({ message: 'Registration successful' })
    }
    catch(error) {
        logger.error(`Registration error: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: error.message })
    }
}

// login handling
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body
        
        logger.info(`Login attempt for username: ${username}`);

        if (!username || !password) {
            logger.error(`Login failed - Missing credentials`);
            return res.status(400).json({ message: "username or password required" })
        }

        const user = await User.findOne({ username })
        if (!user) {
            logger.warn(`Login failed - User not found: ${username}`);
            return res.status(401).json({ message: "Invalid credentials" })
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.error(`Login failed - Invalid password for: ${username}`);
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const payload = { userId: user._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        res.cookie("authToken", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
        logger.info(`User logged in successfully: ${username}`);
        res.json({ message: "Login successful" });
    }
    catch(error) {
        logger.error(`Login error: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: error.message })
    }
}