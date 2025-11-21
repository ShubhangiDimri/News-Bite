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

router.post("/logout", (req, res) => {
    res.clearCookie("authToken", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        path: "/"
    });
    res.status(200).json({ message: "Logged out successfully" });
});

module.exports = router;
