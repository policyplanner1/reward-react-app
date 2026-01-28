const express = require("express");
const router = express.Router();
const ServiceEnquiryController = require("../controllers/serviceEnquiryController");

// create Enquiry
router.post("/", ServiceEnquiryController.createEnquiry);

// Get all the Enquires
router.get("/", ServiceEnquiryController.getAllEnquiries);

// Get Enquiry By Id
router.get("/:id", ServiceEnquiryController.getEnquiryById);

module.exports = router;
