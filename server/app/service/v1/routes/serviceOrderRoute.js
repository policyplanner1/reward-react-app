const express = require("express");
const router = express.Router();
const ServiceOrderController = require("../controllers/serviceOrderController");

// Direct Order
router.post("/direct", ServiceOrderController.createDirectOrder);

// Enquiry Order
router.post("/from-enquiry/:enquiryId", ServiceOrderController.createEnquiryOrder)

module.exports = router;
