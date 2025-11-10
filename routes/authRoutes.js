const express = require("express");
const { register, login } = require("../controllers/authController");

const router = express.Router();

// @accepts application/x-www-form-urlencoded
// @body {username: string, password: string}
router.post("/register", register);

// @accepts application/x-www-form-urlencoded
// @body {username: string, password: string}
router.post("/login", login);

module.exports = router;
