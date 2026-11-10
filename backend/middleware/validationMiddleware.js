// ==========================================================
// backend/middleware/validationMiddleware.js
// Input validation for authentication & user operations
// ==========================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateRegister = (req, res, next) => {
  let { name, email, password } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }

  name = name.trim();
  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({ message: "Name must be between 2 and 50 characters" });
  }

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ message: "Email is required" });
  }

  email = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: "Please provide a valid email address" });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({ message: "Password is required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  req.body.name = name;
  req.body.email = email;
  req.body.password = password;

  next();
};

const validateLogin = (req, res, next) => {
  let { email, password } = req.body;

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ message: "Email is required" });
  }

  email = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: "Please provide a valid email address" });
  }

  if (!password || typeof password !== "string" || !password.trim()) {
    return res.status(400).json({ message: "Password is required" });
  }

  req.body.email = email;
  req.body.password = password;

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
};

