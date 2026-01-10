const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/reviews");
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "video/mp4",
    "video/webm",
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("INVALID_FILE_TYPE"));
  }

  cb(null, true);
};

const uploadReviewMedia = multer({
  storage,
  fileFilter,
  limits: {
    files: 5,
    fileSize: 10 * 1024 * 1024, 
  },
});

module.exports = uploadReviewMedia;
