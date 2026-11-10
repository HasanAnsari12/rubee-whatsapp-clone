const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { sendMessage, getMessages, markSeen, addReaction } = require("../controllers/messageController");

// POST /api/messages - Send a message
router.post("/", protect, sendMessage);

// GET /api/messages/:userId - Get messages with a user
router.get("/:userId", protect, getMessages);

// PUT /api/messages/seen - Mark messages as seen
router.put("/seen", protect, markSeen);

// PUT /api/messages/:id/reaction - Add reaction to a message
router.put("/:id/reaction", protect, addReaction);

module.exports = router;
