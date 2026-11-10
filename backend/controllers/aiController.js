// ==========================================================
// backend/controllers/aiController.js
// Controller for Gemini AI conversations, history & messaging
// ==========================================================

const mongoose = require("mongoose");
const AIConversation = require("../models/AIConversation");
const AIMessage = require("../models/AIMessage");
const { generateAIResponse } = require("../services/geminiService");

/**
 * POST /api/ai/chat
 * Create a new AI conversation
 */
const createConversation = async (req, res) => {
  try {
    const { title } = req.body;

    const conversation = await AIConversation.create({
      userId: req.user._id,
      title: (title || "").trim() || "New Chat",
      lastMessage: "",
    });

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create AI conversation" });
  }
};

/**
 * POST /api/ai/message
 * Send a message to Gemini AI and return the model's response
 */
const sendMessage = async (req, res) => {
  try {
    const { conversationId, message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 4000) {
      return res.status(400).json({ message: "Message exceeds maximum length of 4000 characters" });
    }

    let conversation;

    // Check or create conversation
    if (conversationId) {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      conversation = await AIConversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Ownership check
      if (conversation.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to access this conversation" });
      }
    } else {
      // Auto-create new conversation if none provided
      const initialTitle =
        trimmedMessage.length > 35
          ? `${trimmedMessage.slice(0, 35)}...`
          : trimmedMessage;

      conversation = await AIConversation.create({
        userId: req.user._id,
        title: initialTitle,
        lastMessage: "",
      });
    }

    // Save user's message
    const userMessage = await AIMessage.create({
      userId: req.user._id,
      conversationId: conversation._id,
      role: "user",
      content: trimmedMessage,
    });

    // Fetch prior messages for context (up to last 20 messages)
    const priorMessages = await AIMessage.find({
      conversationId: conversation._id,
      _id: { $ne: userMessage._id },
    })
      .sort({ createdAt: 1 })
      .limit(20);

    const history = priorMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Call Gemini Service
    let aiResponseText;
    try {
      aiResponseText = await generateAIResponse({
        history,
        prompt: trimmedMessage,
      });
    } catch (aiErr) {
      // Return proper status code and error message from geminiService
      const statusCode = aiErr.statusCode || 500;
      return res.status(statusCode).json({
        message: aiErr.message || "Failed to generate AI response",
        userMessage,
        conversationId: conversation._id,
      });
    }

    // Save AI response message
    const aiMessage = await AIMessage.create({
      userId: req.user._id,
      conversationId: conversation._id,
      role: "model",
      content: aiResponseText,
    });

    // Update conversation metadata
    conversation.lastMessage = aiResponseText.slice(0, 100);
    if (conversation.title === "New Chat") {
      conversation.title =
        trimmedMessage.length > 35
          ? `${trimmedMessage.slice(0, 35)}...`
          : trimmedMessage;
    }
    await conversation.save();

    res.status(200).json({
      conversationId: conversation._id,
      userMessage,
      aiMessage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server error while processing message" });
  }
};

/**
 * GET /api/ai/history
 * Fetch all AI conversations belonging to authenticated user
 */
const getConversations = async (req, res) => {
  try {
    const conversations = await AIConversation.find({
      userId: req.user._id,
    }).sort({ updatedAt: -1 });

    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch conversations" });
  }
};

/**
 * GET /api/ai/history/:conversationId
 * Fetch single AI conversation with its messages
 */
const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    const conversation = await AIConversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Ownership check
    if (conversation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to access this conversation" });
    }

    const messages = await AIMessage.find({
      conversationId: conversation._id,
    }).sort({ createdAt: 1 });

    res.status(200).json({
      conversation,
      messages,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch conversation history" });
  }
};

/**
 * DELETE /api/ai/history/:conversationId
 * Delete an owned AI conversation and its messages
 */
const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    const conversation = await AIConversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Ownership check
    if (conversation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this conversation" });
    }

    await AIMessage.deleteMany({ conversationId: conversation._id });
    await AIConversation.findByIdAndDelete(conversation._id);

    res.status(200).json({ message: "Conversation deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete conversation" });
  }
};

module.exports = {
  createConversation,
  sendMessage,
  getConversations,
  getConversation,
  deleteConversation,
};

