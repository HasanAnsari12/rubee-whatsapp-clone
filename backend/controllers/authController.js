const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );
};

// REGISTER
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: (name || "").trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic || "",
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Server error during registration",
    });
  }
};

// LOGIN
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic || "",
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Server error during login",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
