const express = require("express");
const router = express.Router();
const AchievementController = require("../controllers/achievementController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// achievements
router.get("/", auth, AchievementController.getAchievements);

module.exports = router;
