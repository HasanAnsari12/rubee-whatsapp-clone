const multer = require("multer");

// Memory storage for buffer processing
const storage = multer.memoryStorage();

// Allowed MIME types for images, audio, video, and documents
const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/webm",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/mp3",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not permitted for upload`), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max file size
  },
  fileFilter,
});

module.exports = upload;
