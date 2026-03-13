const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const orderController = require("../controllers/orderController");

// Get all orders
router.get(
  "/order-list",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  orderController.getOrderList,
);

// Get order details by order ID
router.get(
  "/order-details/:orderId",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  orderController.getAdminOrderDetails,
);


// ===================================Order details for vendor======================================================
router.get(
  "/order-summary",
  authenticateToken,
  authorizeRoles("vendor"),
  orderController.getOrderSummary
);

router.get(
  "/order-view/:vendorOrderId",
  authenticateToken,
  authorizeRoles("vendor"),
  orderController.viewVendorOrderDetails
);


module.exports = router;
