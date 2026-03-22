const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const LogisticsController = require("../controllers/logisticsController");


// NDR resolution
router.post(
  "/shipments/:shipmentId/resolve-ndr",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  LogisticsController.resolveNdr,
);

// logistics dashboard
router.get(
  "/logistics/summary",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  LogisticsController.getLogisticsSummary,
);

module.exports = router;