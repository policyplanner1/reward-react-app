const express = require("express");
const router = express.Router();
const RewardController = require("../controllers/rewardController");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// RULES
router.post(
  "/create-rule",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  RewardController.createRule,
);


router.get(
  "/get-rule",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  RewardController.getRules,
);

// PRODUCT MAPPING
router.post(
  "/map",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  RewardController.mapProductReward,
);

// APPLY (test / debug / can be internal)
router.post(
  "/apply",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  RewardController.applyReward,
);

module.exports = router;
