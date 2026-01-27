const express = require("express");
const router = express.Router();
const ServiceOrderDocumentController = require("../controllers/serviceOrderDocumentController");
const upload = require("../../../../middleware/serviceCategoryUpload");

// Save Document
router.post(
  "/upload-document",
  upload.single("file"),
  ServiceOrderDocumentController.uploadDocument,
);

module.exports = router;
