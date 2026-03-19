const express = require("express");
const router = express.Router();
const DashboardController = require("../controllers/dashboardController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// Dashboard
router.get("/", auth, DashboardController.getDashboard);

router.get("/today-summary", auth, DashboardController.getTodaySummary);

module.exports = router;
