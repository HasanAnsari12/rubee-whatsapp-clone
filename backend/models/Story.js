const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    mediaUrl: {
      type: String,
      required: true,
    },

    mediaType: {
      type: String, // image/jpeg, video/mp4
      required: true,
    },

    caption: {
      type: String,
      default: "",
    },

    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Automatically delete after 24 hours
    expiresAt: {
      type: Date,
      default: () =>
        new Date(Date.now() + 24 * 60 * 60 * 1000),
      expires: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Story", storySchema);