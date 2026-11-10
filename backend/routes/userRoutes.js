const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");

// GET /api/users - Get all users except current user
router.get("/", protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select(
      "-password"
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/users/me - Get current user profile
router.get("/me", protect, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/users/profile - Update profile picture
router.put("/profile", protect, async (req, res) => {
  try {
    const { profilePic } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePic },
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
