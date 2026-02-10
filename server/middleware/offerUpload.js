const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: "./uploads/offer-posters",
  filename: (req, file, cb) => {
    cb(null, `poster_${Date.now()}${path.extname(file.originalname)}`);
  },
});

exports.uploadPoster = multer({ storage });
