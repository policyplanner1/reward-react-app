const express = require("express");
const router = express.Router();
const ServiceOrderDocumentController = require("../controllers/serviceOrderDocumentController");

// Get Required documents for a service order
router.get(
  "/required-documents/:orderId",
  ServiceOrderDocumentController.getRequiredDocuments
);


module.exports = router;
