const express = require("express");
const router = express.Router();
const logisticsController = require("../controllers/logisticsController");


// check service Availability
router.post(
  "/check-serviceability",
  auth,
  logisticsController.checkServiceAbility,
);

module.exports = router;
