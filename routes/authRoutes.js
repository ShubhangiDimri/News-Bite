const express = require("express");
const { register, login } = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// @accepts application/x-www-form-urlencoded
// @body {username: string, password: string}
router.post("/register", register);

// @accepts application/x-www-form-urlencoded
// @body {username: string, password: string}
router.post("/login", login);

router.get("/verify", authMiddleware, (req, res) => {
  res.json({ loggedIn: true, user: req.user });
});

router.post("/logout", authMiddleware, async (req, res) => {
    try {
        // Update lastLogout field for the user
        const User = require('../models/User');
        const Activity = require('../models/Activity');
        
        await User.findByIdAndUpdate(req.user.userId, {
            lastLogout: new Date()
        });

        // Log logout activity
        const user = await User.findById(req.user.userId);
        await Activity.create({
            userId: user._id,
            username: user.username,
            action: 'auth.logout',
            meta: { ip: req.ip }
        });

        res.clearCookie("authToken", {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            path: "/"
        });
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error('Logout error:', error);
        res.clearCookie("authToken", {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            path: "/"
        });
        res.status(200).json({ message: "Logged out successfully" });
    }
});

module.exports = router;
