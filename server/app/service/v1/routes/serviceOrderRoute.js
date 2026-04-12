const express = require("express");
const router = express.Router();
const ServiceOrderController = require("../controllers/serviceOrderController");

// Direct Order
router.post("/direct", ServiceOrderController.createDirectOrder);

// Enquiry Order
router.post("/from-enquiry/:enquiryId", ServiceOrderController.createEnquiryOrder)

// Get all orders
router.get("/my-orders", ServiceOrderController.getMyOrders);

// get order details
router.get("/order-details/:id", ServiceOrderController.getOrderDetails);

module.exports = router;
