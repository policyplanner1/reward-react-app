const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const logisticsController = require("../controllers/logisticsController");


// create shipment
router.post(
  "/create-shipment/:orderId",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  logisticsController.createShipment,
);

// check service Availability
router.post(
  "/check-serviceability",
  logisticsController.checkServiceAbility,
);

module.exports = router;