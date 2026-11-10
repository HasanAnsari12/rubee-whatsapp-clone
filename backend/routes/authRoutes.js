const express = require("express");
const router = express.Router();
const { registerUser, loginUser } = require("../controllers/authController");
const { validateRegister, validateLogin } = require("../middleware/validationMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");

// POST /api/auth/register
router.post("/register", authLimiter, validateRegister, registerUser);

// POST /api/auth/login
router.post("/login", authLimiter, validateLogin, loginUser);

module.exports = router;
