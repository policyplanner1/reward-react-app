const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const logisticsController = require("../controllers/logisticsController");

// check service Availability
router.post(
  "/check-serviceability",
  logisticsController.checkServiceAbility,
);

module.exports = router;