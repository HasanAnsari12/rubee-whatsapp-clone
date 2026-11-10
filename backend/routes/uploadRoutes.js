const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

// POST /api/upload - Upload a file to Cloudinary
router.post("/", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "auto", folder: "whatsapp-clone" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    const result = await streamUpload(req.file.buffer);

    res.json({
      url: result.secure_url,
      fileType: req.file.mimetype,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
