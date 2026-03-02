const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Base uploads directory
const BASE_UPLOAD_DIR = path.join(__dirname, "../uploads/reviews");

// Ensure base directory exists
if (!fs.existsSync(BASE_UPLOAD_DIR)) {
  fs.mkdirSync(BASE_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const userId = req.user?.user_id;
      const reviewId = req.params.reviewId;

      if (!userId || !reviewId) {
        return cb(new Error("Invalid upload path"), null);
      }

      const uploadPath = path.join(
        BASE_UPLOAD_DIR,
        `user_${userId}`,
        `review_${reviewId}`
      );

      fs.mkdirSync(uploadPath, { recursive: true });

      cb(null, uploadPath);
    } catch (err) {
      cb(err, null);
    }
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    cb(null, `${Date.now()}-${safeName}`);
  }
});

// Allow only review media types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime"
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images and videos are allowed"), false);
  }
};

const reviewUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, 
    files: 5 
  }
});

module.exports = reviewUpload;