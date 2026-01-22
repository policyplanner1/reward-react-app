const express = require("express");
const router = express.Router();
const ServiceDocumentController = require("../controllers/serviceDocumentController");
const upload = require("../../../../middleware/serviceCategoryUpload");

// Add document
router.post("/create-document", ServiceDocumentController.addDocument);

// Document By Id
router.get("/find/:serviceId", ServiceDocumentController.getDocumentsByService);

// Delete
router.delete("/remove/:id", ServiceDocumentController.deleteDocument);

module.exports = router;
