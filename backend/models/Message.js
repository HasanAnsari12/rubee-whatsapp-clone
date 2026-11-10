const mongoose = require("mongoose");

// Purana cached model delete karo
if (mongoose.models.Message) {
  delete mongoose.models.Message;
}

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return !this.groupId;
      },
      default: null,
      index: true,
    },

    // Group message link (null for direct one-on-one messages)
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      default: null,
      index: true,
    },

    // Text optional hai
    text: {
      type: String,
      required: false,
      default: "",
    },

    // File URL
    fileUrl: {
      type: String,
      default: "",
    },

    fileType: {
      type: String,
      default: "",
    },

    audioUrl: {
      type: String,
      default: "",
    },

    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        emoji: {
          type: String,
          required: true,
        },
      },
    ],

    // Seen for one-on-one direct messages
    seen: {
      type: Boolean,
      default: false,
    },

    // SeenBy tracking for group messages
    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", messageSchema);
