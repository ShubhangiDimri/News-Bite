const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

// registering a user
exports.register = async (req, res) => 
{
    try {

        const { password, username } = req.body;

        // Check if user already exists
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }

        // hash the passowrd
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        user = new User({username,password:hashedPassword})
        await user.save()

        // create jwt token
        const payload = { userId: user._id }
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '7d'
        })

        // setting the cookie
        res.cookie("authToken", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
        res.status(201).json({ message: 'Registration successful' })
    }
    catch(error) {
        res.status(500).json({ message: error.message })
    }
}

    // loign handling
    exports.login = async (req, res) => 
    {
        try {
            const { username, password } = req.body

            // validate the input
            if (!username || !password) {
                return res.status(400).json({ message: "email or password required" })
            }

            // check if the user exists
            const user = await User.findOne({ username })
            if (!user) {
              return   res.status(401).json({ message: "user not found" })
            }

            // Compare passwords
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: "Invalid credentials" });
            }

            // Create JWT token
            const payload = { userId: user._id };
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: "7d",
            });

            // setting the cookie
            res.cookie("authToken", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })

            res.json({  message: "Login successful" });
        }
        catch(error)
        {
            res.status(500).json({message:error.message})
        }   
    }