const express = require("express");
const router = express.Router();
const ServiceEnquiryController = require("../controllers/serviceEnquiryController");

// create Enquiry
router.post("/", ServiceEnquiryController.createEnquiry);

// Get all the Enquires
router.get("/", ServiceEnquiryController.getAllEnquiries);

module.exports = router;
