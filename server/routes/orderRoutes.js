const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const orderController = require("../controllers/orderController");

// Get all orders
router.get(
  "/order-list",
//   authenticateToken,
//   authorizeRoles("vendor_manager", "admin"),
  orderController.getOrderList,
);

module.exports = router;
