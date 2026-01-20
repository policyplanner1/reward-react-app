const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/orderController");
const auth = require("../middlewares/auth");

// Get all orders
router.get("/orders-history", auth, OrderController.getOrderHistory);

// get order Details
router.get("/order-details/:orderId", auth, OrderController.getOrderDetails);

// Get cancellation Reason
router.get("/cancellation-reasons", OrderController.getCancellationReasons);

// Submit cancel Request
// router.post("/cancel/:orderId",auth, OrderController.requestOrderCancellation);
router.post("/cancel/:orderId", OrderController.requestOrderCancellation);

// Get cancellation Details
// router.get("/cancellation-details/:orderId",auth, OrderController.cancellation-details);
router.get(
  "/cancellation-details/:orderId",
  OrderController.cancellationDetails,
);

module.exports = router;
