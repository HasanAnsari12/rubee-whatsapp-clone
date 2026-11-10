const mongoose = require("mongoose");

// Purana cached model delete karo agar exist kare
if (mongoose.models.Chat) {
  delete mongoose.models.Chat;
}

const chatSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },

    groupPic: {
      type: String,
      default: "",
    },

    isGroup: {
      type: Boolean,
      default: true,
    },

    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Chat", chatSchema);

