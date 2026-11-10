const Message = require("../models/Message");

// Send Message
const sendMessage = async (req, res) => {
  try {
    const { receiverId, text, fileUrl, fileType, audioUrl, replyTo } = req.body;

    const message = await Message.create({
      senderId: req.user._id,
      receiverId,
      text: text || "",
      fileUrl: fileUrl || "",
      fileType: fileType || "",
      audioUrl: audioUrl || "",
      replyTo: replyTo || null,
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get Messages between two users
const getMessages = async (req, res) => {
  try {
    const userId = req.params.userId;

    const messages = await Message.find({
      $or: [
        {
          senderId: req.user._id,
          receiverId: userId,
        },
        {
          senderId: userId,
          receiverId: req.user._id,
        },
      ],
    })
      .populate("replyTo")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Mark messages as seen
const markSeen = async (req, res) => {
  try {
    const { senderId } = req.body;

    await Message.updateMany(
      { senderId, receiverId: req.user._id, seen: false },
      { seen: true }
    );

    res.json({ message: "Messages marked as seen" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add reaction to message
const addReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const messageId = req.params.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(
      (r) => r.userId.toString() !== req.user._id.toString()
    );

    // Add new reaction
    if (emoji) {
      message.reactions.push({ userId: req.user._id, emoji });
    }

    await message.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  markSeen,
  addReaction,
};