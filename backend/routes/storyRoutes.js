const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const Story = require("../models/Story");

// POST /api/stories - Upload a story
router.post("/", protect, upload.single("media"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No media uploaded" });
    }

    const streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "auto", folder: "whatsapp-clone/stories" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    const result = await streamUpload(req.file.buffer);

    const story = await Story.create({
      userId: req.user._id,
      mediaUrl: result.secure_url,
      mediaType: req.file.mimetype,
      caption: req.body.caption || "",
    });

    res.status(201).json(story);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/stories - Get all active stories
router.get("/", protect, async (req, res) => {
  try {
    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("userId", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(stories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/stories/:id/seen - Mark story as seen
router.put("/:id/seen", protect, async (req, res) => {
  try {
    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { seenBy: req.user._id } },
      { new: true }
    );
    res.json(story);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
