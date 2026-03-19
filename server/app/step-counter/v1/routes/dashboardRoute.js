const express = require("express");
const router = express.Router();
const DashboardController = require("../controllers/dashboardController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// Dashboard
router.get("/", auth, DashboardController.getDashboard);

// todays summary
router.get("/today-summary", auth, DashboardController.getTodaySummary);

// weekly progress
router.get("/weekly-progress", auth, DashboardController.getWeeklyProgress);


module.exports = router;
