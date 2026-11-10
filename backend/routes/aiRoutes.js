// ==========================================================
// backend/routes/aiRoutes.js
// Routes for Gemini AI Assistant
// ==========================================================

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { aiLimiter } = require("../middleware/rateLimiter");
const {
  createConversation,
  sendMessage,
  getConversations,
  getConversation,
  deleteConversation,
} = require("../controllers/aiController");

// All AI endpoints require authentication
router.use(protect);

// Apply AI rate limiter to AI message endpoint
router.post("/chat", createConversation);
router.post("/message", aiLimiter, sendMessage);
router.get("/history", getConversations);
router.get("/history/:conversationId", getConversation);
router.delete("/history/:conversationId", deleteConversation);

module.exports = router;

