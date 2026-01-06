const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/orderController");
const auth = require("../middlewares/auth");

// Get all orders
router.get("/orders-details", auth, OrderController.getOrderHistory);

// get order Details
router.get("/order-details/:orderId", auth, OrderController.getOrderDetails);

module.exports = router;
