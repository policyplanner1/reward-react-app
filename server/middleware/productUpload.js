const multer = require("multer");
const fs = require("fs");
const path = require("path");

const tempFolder = path.join(__dirname, "../uploads/temp");
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempFolder);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, Date.now() + "-" + safe);
  },
});

const productUpload = multer({ storage });

module.exports = { productUpload };
